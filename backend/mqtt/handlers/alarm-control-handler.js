// handlers/alarm-control-handler.js
// Maneja eventos relacionados con el control de alarmas (por ejemplo, botón de alarma presionado)

const deviceRepository = require('../database/device-repository');

/**
 * Procesa un evento de alarma recibido.
 * @param {string} topic - Topic MQTT del mensaje.
 * @param {string} message - Mensaje recibido (string).
 */
function handle(topic, message) {
    try {
        const parsedMsg = JSON.parse(message);
        // Ejemplo: registrar evento de alarma en el archivo de dispositivos
        deviceRepository.logAlarmEvent({
            deviceId: parsedMsg.deviceId,
            timestamp: parsedMsg.timestamp,
            event: parsedMsg.event || 'alarm_triggered',
            details: parsedMsg.details || {}
        });

        console.log('Evento de alarma procesado:', parsedMsg);
    } catch (err) {
        console.error('Error procesando evento de alarma:', err);
    }
}

module.exports = {
    handle
};