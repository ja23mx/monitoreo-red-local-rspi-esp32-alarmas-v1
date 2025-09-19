// services/message-processor.js
// Procesa los mensajes de MQTT recibidos en NODO/<MAC>/ACK según el campo "event" del payload

const { DateTime } = require('luxon'); // Para manejo de fechas ISO 8601
const validators = require('../utils/message-validators'); // Importa los validadores
const db = require('../../../data/db-repository'); // Agrega esta línea al inicio si no está
const { webSocketManager } = require('../../websocket/index.js');
const NotificationBroadcaster = require('../../websocket/services/notification-broadcaster'); // AGREGAR LÍNEA 5

/**
 * Procesa el mensaje recibido en NODO/<MAC>/ACK.
 */
function process(topic, payload, mqttClient) {

    if (!validators.TopicFormat(topic)) {
        console.log('[Processor] Formato de topic inválido:', topic);
        return;
    }

    // Extraer MAC del topic: NODO/<MAC>/ACK
    const match = topic.match(/^NODO\/([A-F0-9]{6})\/ACK$/);
    const mac = match ? match[1] : payload.dsp || null;

    if (!validators.macFormat(mac)) {
        console.log('[Processor] MAC inválida en payload:', payload.dsp);
        return;
    }

    if (!mac) {
        console.log('[Processor] No se pudo determinar MAC del mensaje:', topic, payload);
        return;
    }


    // Validación de formato y campos obligatorios
    // DESHABILITADO POR AHORA, PARA EVITAR QUE EVALUE TIEMPO DE PAYLOAD   
    //const errors = validators.searchErrors(payload);

    const errors = [];

    if (errors.length > 0) {
        console.error(`[Processor] Errores de validación para nodo ${mac}:`, errors);
        // Opcional: responder con error al nodo
        sendAck({
            mqttClient,
            mac,
            status: 'error',
            extra: { error_msg: errors.join('; ') }
        });
        return;
    }

    // Sanitiza el payload antes de procesar
    const cleanPayload = validators.sanitizePayload(payload);

    switch (cleanPayload.event) {
        case 'rst': // ***
            // Sincronización de tiempo en reset
            if (cleanPayload.time === 'UNSYNC') {
                sendAck({ mqttClient, mac });
                // Aquí puedes actualizar estado del nodo, log, etc.
            }
            if (webSocketManager && webSocketManager.notificationBroadcaster) {
                webSocketManager.notificationBroadcaster.processMqttEvent(topic, cleanPayload, mac);
            }
            break;

        case 'button': // *** revisado
            // Botón presionado
            sendAck({ mqttClient, mac });
            // Procesa el botón: cleanPayload.data.nmb-btn
            db.addEventoByMac(mac, {
                time: getISO8601Timestamp(),
                event: `btn${cleanPayload.data['nmb-btn']}`
            });
            if (webSocketManager && webSocketManager.notificationBroadcaster) {
                webSocketManager.notificationBroadcaster.processMqttEvent(topic, cleanPayload, mac);
            }
            break;

        case 'hb': // *** revisado
            // Heartbeat recibido
            sendAck({ mqttClient, mac });
            // Marca nodo como activo, actualiza timestamp último HB
            db.updateUltimaConexionByMac(mac, getISO8601Timestamp());
            if (webSocketManager && webSocketManager.notificationBroadcaster) {
                webSocketManager.notificationBroadcaster.processMqttEvent(topic, cleanPayload, mac);
            }
            break;

        case 'play_fin':
            // Finalización de reproducción de audio
            sendAck({ mqttClient, mac });
            // Procesa resultado: cleanPayload.data.status, cleanPayload.data.audio
            break;

        case 'ack_ans':
            // Notificar al DeviceHandler que llegó un ACK para un comando
            if (webSocketManager && webSocketManager.messageRouter && webSocketManager.messageRouter.deviceHandler) {
                webSocketManager.messageRouter.deviceHandler.handleCommandAck(mac, cleanPayload);
            }
            break;

        default:
            // Otro evento: loguear, procesar, responder si es necesario
            console.log(`[Processor] Evento desconocido (${cleanPayload.event}) de nodo ${mac}:`, cleanPayload);
            break;
    }

    // Ejemplo de tolerancia de heartbeat:
    // Aquí podrías actualizar un mapa de última actividad por MAC para monitoreo/alertas
}

/**
 * Envía una respuesta ACK estándar al ESP32 en su topic CMD.
*/
function sendAck({ mqttClient, mac, status = 'ok', extra = {} }) {
    const topic = `NODO/${mac}/CMD`;
    const payload = {
        dsp: mac,
        event: 'ack_ans',
        time: getISO8601Timestamp(),
        status: status,
        ...extra
    };
    mqttClient.publish(topic, JSON.stringify(payload));
}

/* 
 * Devuelve el timestamp ISO 8601 actual sin milisegundos y con 'Z' al final.
*/
function getISO8601Timestamp() {
    let now = DateTime.utc().startOf('second').toISO({ suppressMilliseconds: true, includeOffset: false });
    if (!now.endsWith('Z')) now += 'Z';
    return now;
}


module.exports = {
    process
};