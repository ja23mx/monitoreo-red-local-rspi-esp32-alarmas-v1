// handlers/command-ack-handler.js
// Maneja eventos de ACK (confirmación) de comandos enviados a los dispositivos

const deviceRepository = require('../database/device-repository');

/**
 * Procesa un evento de ACK de comando recibido.
 * @param {string} topic - Topic MQTT del mensaje.
 * @param {string} message - Mensaje recibido (string).
 */
function handle(topic, message) {
    try {
        const parsedMsg = JSON.parse(message);
        // Registrar el ACK en el archivo de dispositivos
        deviceRepository.logCommandAck({
            deviceId: parsedMsg.deviceId,
            commandId: parsedMsg.commandId,
            timestamp: parsedMsg.timestamp,
            status: parsedMsg.status || 'ack',
            details: parsedMsg.details || {}
        });

        console.log('ACK de comando procesado:', parsedMsg);
    } catch (err) {
        console.error('Error procesando ACK de comando:', err);
    }
}

module.exports = {
    handle
};