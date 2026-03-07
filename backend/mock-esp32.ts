import mqtt from 'mqtt';

// Same broker used by the backend
const MQTT_BROKER_URL = 'mqtt://broker.hivemq.com:1883';

// Mock ID to simulate a physical Condominio
const CONDOMINIO_ID = 'TEST-CONDOMINIO-001';
const TOPIC = `easybox/${CONDOMINIO_ID}/control`;

console.log('🤖 Inicializando Simulador do Hardware (ESP32) EasyBox...');

const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `esp32_mock_${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
});

client.on('connect', () => {
  console.log(`✅ Conectado ao Broker MQTT (${MQTT_BROKER_URL})`);
  
  // Subscribe to instructions from Backend
  client.subscribe(TOPIC, (err) => {
    if (!err) {
      console.log(`🎧 Inscrito no Tópico: ${TOPIC}`);
      console.log('Aguardando comandos de destrancamento das portas na nuvem...\n');
    } else {
      console.error('❌ Erro ao se inscrever no tópico:', err);
    }
  });
});

client.on('message', (topic, message) => {
  console.log(`\n================================`);
  console.log(`📥 [Comando Recebido do Backend]`);
  console.log(`🏷️  Tópico: ${topic}`);
  
  try {
    const payload = JSON.parse(message.toString());
    console.log(`📦 Payload:`, payload);

    if (payload.action === 'open') {
      console.log(`\n🔓 >>> FÍSICO: DESTRANCANDO A PORTA ${payload.door} AGORA <<<`);
      console.log(`>> CLACK! (Buzzer Toca)`);
      
      // Simulate that the door was opened for 5 seconds then closed
      setTimeout(() => {
        console.log(`🚪 FÍSICO: Sensor informa que a porta ${payload.door} foi FECHADA.\n`);
      }, 5000);
    }
  } catch (e) {
    console.log(`📦 Dados Texto: ${message.toString()}`);
  }
  console.log(`================================`);
});
