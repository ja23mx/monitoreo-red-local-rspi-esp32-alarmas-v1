// services/message-processor.js
// Procesa los mensajes de MQTT recibidos en NODO/<MAC>/ACK según el campo "event" del payload

const { DateTime } = require('luxon'); // Para manejo de fechas ISO 8601

/**
 * Envía una respuesta ACK estándar al ESP32 en su topic CMD.
 */
function sendAck({ mqttClient, mac, time, status = 'ok', extra = {} }) {
  const topic = `NODO/${mac}/CMD`;
  const payload = {
    dsp: mac,
    event: 'ack_ans',
    time: time,
    status: status,
    ...extra
  };
  mqttClient.publish(topic, JSON.stringify(payload));
}

/**
 * Procesa el mensaje recibido en NODO/<MAC>/ACK.
 */
function process(topic, payload, mqttClient) {
  // Extraer MAC del topic: NODO/<MAC>/ACK
  const match = topic.match(/^NODO\/([A-F0-9]{6})\/ACK$/);
  const mac = match ? match[1] : payload.dsp || null;
  const now = DateTime.utc().toISO(); // Timestamp actual ISO 8601

  if (!mac) {
    console.error('[Processor] No se pudo determinar MAC del mensaje:', topic, payload);
    return;
  }

  switch (payload.event) {
    case 'rst':
      // Sincronización de tiempo en reset
      if (payload.time === 'UNSYNC') {
        sendAck({ mqttClient, mac, time: now });
        // Aquí puedes actualizar estado del nodo, log, etc.
      }
      break;

    case 'button':
      // Botón presionado
      sendAck({ mqttClient, mac, time: now });
      // Procesa el botón: payload.data.nmb-btn
      break;

    case 'hb':
      // Heartbeat recibido
      sendAck({ mqttClient, mac, time: now });
      // Marca nodo como activo, actualiza timestamp último HB
      break;

    case 'play_fin':
      // Finalización de reproducción de audio
      sendAck({ mqttClient, mac, time: now });
      // Procesa resultado: payload.data.status, payload.data.audio
      break;

    case 'ack_ans':
      // Respuesta a comando del servidor (usualmente loguear, actualizar estado)
      // No se responde a este evento
      break;

    default:
      // Otro evento: loguear, procesar, responder si es necesario
      console.log(`[Processor] Evento desconocido (${payload.event}) de nodo ${mac}:`, payload);
      // Puedes responder con error si lo consideras
      // sendAck({ mqttClient, mac, time: now, status: 'error', extra: { error_msg: 'Evento no soportado' } });
      break;
  }

  // Ejemplo de tolerancia de heartbeat:
  // Aquí podrías actualizar un mapa de última actividad por MAC para monitoreo/alertas
}

module.exports = {
  process
};