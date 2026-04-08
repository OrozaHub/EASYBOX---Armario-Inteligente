import mqtt from 'mqtt';
import prisma from './prisma';
import dotenv from 'dotenv';

dotenv.config();

// We can use a free public broker like HiveMQ or EMQX for testing
// In production, you would run your own Mosquitto broker or use AWS IoT
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';

// In-memory cache for hardware structure that hasn't been registered by a provider yet
// Map<SerialHash, number[]>
export const pendingHardwareSpecs = new Map<string, number[]>();

export const mqClient = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `easybox_backend_${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

mqClient.on('connect', () => {
  console.log(`✅ [MQTT] Connected to broker at ${MQTT_BROKER_URL}`);
  
  // Subscribe to registration topics from all hardware
  // Pattern: easybox/hardware/+/register
  mqClient.subscribe('easybox/hardware/+/register', (err) => {
    if (!err) console.log('📡 [MQTT] Subscribed to hardware registration topics');
  });
});

mqClient.on('message', async (topic, message) => {
  if (topic.endsWith('/register')) {
    try {
      const data = JSON.parse(message.toString());
      const { action, slots } = data;
      const serialHash = data.serialHash?.trim().toUpperCase();

      if (!serialHash) return;

      if (action === 'announce' || action === 'register' || action === 'boot') {
        console.log(`🔌 [Hardware Sync] Message from ${serialHash} (${action}) - Slots: ${slots?.length || 0}`);
        
        const armario = await prisma.armario.findUnique({
          where: { serialHash },
          include: { slots: true, condominio: true }
        });

        if (armario) {
          console.log(`🔎 [Hardware Sync] Cabinet found: ${armario.nome}. Checking slots...`);
          // If already registered, sync slots
          if (slots && Array.isArray(slots)) {
            let createdCount = 0;
            for (const numeroPorta of slots) {
              const exists = armario.slots.find(s => s.numeroPorta === numeroPorta.toString());
              if (!exists) {
                await prisma.slot.create({
                  data: {
                    armarioId: armario.id,
                    numeroPorta: numeroPorta.toString(),
                    status: 'LIVRE',
                    mqttTopic: `easybox/hardware/${serialHash}/control`
                  }
                });
                createdCount++;
              }
            }
            if (createdCount > 0) {
              console.log(`✅ [Hardware Sync] Created ${createdCount} missing slots for ${serialHash}`);
            } else {
              console.log(`ℹ️ [Hardware Sync] All ${slots.length} slots were already in DB for ${serialHash}`);
            }
          }
          
          // Send config back as confirmation
          const configTopic = `easybox/hardware/${serialHash}/config`;
          const allSlots = await prisma.slot.findMany({ where: { armarioId: armario.id }, orderBy: { numeroPorta: 'asc' } });
          
          mqClient.publish(configTopic, JSON.stringify({
            action: 'config',
            nome: armario.nome,
            condominio: armario.condominio?.nome || 'Não Vinculado',
            slots: allSlots.map(s => ({ id: parseInt(s.numeroPorta), status: s.status })),
            timestamp: new Date().toISOString()
          }));
          console.log(`📡 [Hardware Sync] Handshake complete for ${serialHash}. Identity: ${armario.nome} @ ${armario.condominio?.nome || 'None'}`);
        } else {
          // Store in pending cache for quando o provedor registrar
          if (slots && Array.isArray(slots)) {
            pendingHardwareSpecs.set(serialHash, slots);
            console.log(`⏳ [Hardware Sync] Cached spec for UNREGISTERED hardware [${serialHash}]. Ready for provider import.`);
          }
        }
      }
    } catch (e) {
      console.error('❌ [Hardware Sync] Error processing message:', e);
    }
  }
});

mqClient.on('error', (err) => {
  console.error('❌ [MQTT] Connection error:', err);
});

mqClient.on('reconnect', () => {
  console.log('🔄 [MQTT] Reconnecting...');
});

/**
 * Publishes an unlock command to the specific Armario's topic
 * Topic Pattern: easybox/hardware/[serialHash]/control
 * Payload: {"action": "open", "door": "[numero_porta]", "hash": "optional"}
 */
export function publishUnlockCommand(serialHash: string, doorNumber: string, optionalHash?: string) {
  const topic = `easybox/hardware/${serialHash}/control`;
  
  const payload = JSON.stringify({
    action: 'open',
    door: doorNumber,
    timestamp: new Date().toISOString(),
    eventHash: optionalHash || null
  });

  mqClient.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error(`❌ [MQTT] Failed to publish to ${topic}`, err);
    } else {
      console.log(`📡 [MQTT] Published to ${topic} -> ${payload}`);
    }
  });
}
