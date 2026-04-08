const mqtt = require('mqtt');

// Configuração - Use o mesmo broker do backend
const MQTT_BROKER_URL = 'mqtt://broker.hivemq.com:1883';
const SERIAL_HASH = process.argv[2] || 'HW-TEST-001';

console.log(`\n📦 EasyBox Hardware Simulator v1.0`);
console.log(`🆔 Serial Hash: ${SERIAL_HASH}`);
console.log(`🌐 Connecting to: ${MQTT_BROKER_URL}\n`);

const client = mqtt.connect(MQTT_BROKER_URL, {
    clientId: `easybox_hw_${SERIAL_HASH}_${Math.random().toString(16).slice(2, 8)}`,
    clean: true
});

const TOPIC_CONTROL = `easybox/hardware/${SERIAL_HASH}/control`;
const TOPIC_STATUS = `easybox/hardware/${SERIAL_HASH}/status`;

client.on('connect', () => {
    console.log(`✅ Connected!`);
    console.log(`📡 Listening on: ${TOPIC_CONTROL}`);
    
    // Inscreve no tópico de controle
    client.subscribe(TOPIC_CONTROL, (err) => {
        if (!err) {
            console.log(`✔️ Subscription active.`);
            // Envia batida de coração inicial
            publishStatus('READY');
        }
    });
});

client.on('message', (topic, message) => {
    if (topic === TOPIC_CONTROL) {
        try {
            const data = JSON.parse(message.toString());
            console.log(`\n📥 Command Received:`, data);

            if (data.action === 'open') {
                console.log(`🔓 [LOCK] RELEASING DOOR ${data.door}...`);
                
                // Simula processo físico
                setTimeout(() => {
                    console.log(`🚪 [DOOR] DOOR ${data.door} IS NOW OPEN.`);
                    publishStatus('OPENED', { door: data.door });
                    
                    // Simula fechamento após 5 segundos
                    setTimeout(() => {
                        console.log(`🔒 [DOOR] DOOR ${data.door} CLOSED.`);
                        publishStatus('CLOSED', { door: data.door });
                    }, 5000);
                }, 1000);
            }
        } catch (e) {
            console.error('❌ Failed to parse command:', e.message);
        }
    }
});

function publishStatus(state, extra = {}) {
    const payload = JSON.stringify({
        serialHash: SERIAL_HASH,
        state: state,
        timestamp: new Date().toISOString(),
        ...extra
    });
    client.publish(TOPIC_STATUS, payload, { qos: 1 });
    console.log(`📤 Status Published: ${state}`);
}

client.on('error', (err) => {
    console.error('❌ MQTT Error:', err);
});
