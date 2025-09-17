const mqtt = require('mqtt');
const mqttConfig = require('./config/mqtt-config');
const messageProcessor = require('./services/message-processor');

// Inicializa el cliente MQTT
const mqttClient = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);

mqttClient.on('connect', () => {
  console.log('[MQTT] Conectado al broker:', mqttConfig.brokerUrl);

  // Suscribirse a todos los ACK de todos los nodos
  mqttClient.subscribe('NODO/+/ACK', (err) => {
    if (err) {
      console.error('[MQTT] Error al suscribirse a NODO/+/ACK:', err);
    } else {
      console.log('[MQTT] Suscrito a NODO/+/ACK');
    }
  });
});

// Procesa mensajes entrantes según el evento
mqttClient.on('message', (topic, message) => {
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (err) {
    console.error(`[MQTT] Error al parsear mensaje en ${topic}:`, err, message.toString());
    return;
  }

  // Ejecuta lógica basada en el campo "event" del payload
  messageProcessor.process(topic, payload, mqttClient);
});

// Manejo de errores MQTT
mqttClient.on('error', (err) => {
  console.error('[MQTT] Error en el cliente:', err);
});

// Exporta el singleton mqttClient si se necesita en otros módulos
module.exports = mqttClient;