import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

// We can use a free public broker like HiveMQ or EMQX for testing
// In production, you would run your own Mosquitto broker or use AWS IoT
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';

export const mqClient = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `easybox_backend_${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

mqClient.on('connect', () => {
  console.log(`✅ [MQTT] Connected to broker at ${MQTT_BROKER_URL}`);
});

mqClient.on('error', (err) => {
  console.error('❌ [MQTT] Connection error:', err);
});

mqClient.on('reconnect', () => {
  console.log('🔄 [MQTT] Reconnecting...');
});

/**
 * Publishes an unlock command to the specific Condominio's topic
 * Topic Pattern: easybox/[condominio_id]/control
 * Payload: {"action": "open", "door": "[numero_porta]", "hash": "optional"}
 */
export function publishUnlockCommand(condominioId: string, doorNumber: string, optionalHash?: string) {
  const topic = `easybox/${condominioId}/control`;
  
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
