const mqtt = require('mqtt');
const mqttConfig = require('./config/mqtt-config');
const messageProcessor = require('./services/message-processor');
const deviceMonitor = require('./services/device-monitor');

// Importar WebSocket Manager para integración
const { webSocketManager } = require('../websocket/index.js');

// Inicializa el cliente MQTT
const mqttClient = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);

// Importar TaskSystem
const { taskSystem } = require('../task-services/task-system');

mqttClient.on('connect', () => {
  console.log('[MQTT] Conectado al broker:', mqttConfig.brokerUrl);

  //deviceMonitor.startMonitor(60000, 2); // Inicia el monitor de dispositivos

  // Configurar cliente MQTT en WebSocket Manager
  if (webSocketManager.isInitialized) { // AGREGAR LÍNEAS 17-19
    webSocketManager.setMqttClient(mqttClient);
  }

  // Suscribirse a todos los ACK de todos los nodos
  mqttClient.subscribe('NODO/+/ACK', (err) => {
    if (err) {
      console.error('[MQTT] Error al suscribirse a NODO/+/ACK:', err);
    } else {
      console.log('[MQTT] Suscrito a NODO/+/ACK');
    }
  });

  // Configurar e iniciar TaskSystem
  taskSystem.setMqttClient(mqttClient);
  taskSystem.start();
});

// Manejo de cierre de conexión
mqttClient.on('close', () => {
  console.log('[MQTT] Conexión cerrada');
  if (taskSystem.isRunning) {
    taskSystem.stop();
  }
});

// Procesa mensajes entrantes según el evento
mqttClient.on('message', (topic, message) => {
  let payload;

  console.log(`[MQTT] Mensaje recibido en ${topic}:`, message.toString());

  // Intenta parsear el mensaje JSON
  try {
    payload = JSON.parse(message.toString());
  } catch (err) {
    console.error(`[MQTT] Error al parsear mensaje en ${topic}:`, err, message.toString());
    return;
  }

  // Ejecuta lógica basada en el campo "event" del payload
  messageProcessor.process(topic, payload, mqttClient);

  /* try {
    // Extraer MAC del topic: NODO/EA8914/ACK → EA8914
    const topicParts = topic.split('/');
    if (topicParts.length >= 2) {
      const deviceMac = topicParts[1];

      // Enviar evento a WebSocket si está inicializado
      if (webSocketManager.isInitialized) {
        webSocketManager.broadcastMqttEvent(topic, payload, deviceMac);
      }
    }
  } catch (wsError) {
    console.error('[MQTT] Error enviando evento a WebSocket:', wsError);
  } */
});

// Manejo de errores MQTT
mqttClient.on('error', (err) => {
  console.error('[MQTT] Error en el cliente:', err);
});

// Exporta el singleton mqttClient si se necesita en otros módulos
module.exports = mqttClient;