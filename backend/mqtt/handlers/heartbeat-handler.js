// handlers/heartbeat-handler.js
// Maneja eventos de heartbeat (monitoreo de vida de los dispositivos)

const deviceRepository = require('../database/device-repository');

/**
 * Procesa un evento de heartbeat recibido.
 * @param {string} topic - Topic MQTT del mensaje.
 * @param {string} message - Mensaje recibido (string).
 */
function handle(topic, message) {
    try {
        const parsedMsg = JSON.parse(message);
        // Actualiza el estado de vida del dispositivo en el archivo JSON
        deviceRepository.updateHeartbeat({
            deviceId: parsedMsg.deviceId,
            timestamp: parsedMsg.timestamp
        });

        console.log('Heartbeat procesado:', parsedMsg);
    } catch (err) {
        console.error('Error procesando heartbeat:', err);
    }
}

module.exports = {
    handle
};