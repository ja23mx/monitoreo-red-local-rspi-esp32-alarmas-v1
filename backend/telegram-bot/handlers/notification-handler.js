/**
 * Notification Handler - Gestor de Notificaciones al Grupo
 * 
 * Envía alertas de eventos (botón de pánico) al grupo de notificaciones
 * configurado en telegram-config.json.
 * 
 * @module telegram-bot/handlers/notification-handler
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const db = require('../../../data/db-repository');

/**
 * Envía alerta de botón presionado al grupo de notificaciones
 * 
 * @param {Object} bot - Instancia del bot de Telegram
 * @param {Object} groupConfig - Configuración del grupo
 * @param {Object} eventData - Datos del evento
 * @param {string} eventData.deviceId - ID del dispositivo (MAC)
 * @param {string} eventData.mac - Dirección MAC
 * @param {string} eventData.timestamp - Timestamp ISO 8601
 * @param {string} eventData.topic - Topic MQTT
 */
async function sendButtonAlert(bot, groupConfig, eventData) {
    try {
        // Validar que el grupo esté habilitado
        if (!groupConfig.enabled) {
            logger.warn('Grupo de notificaciones deshabilitado, alerta no enviada');
            return;
        }

        logger.info(`Enviando alerta de botón al grupo: ${groupConfig.name}`);

        // Obtener información detallada del dispositivo usando db-repository
        const deviceInfo = db.getDeviceByMac(eventData.mac);

        // Construir mensaje de alerta
        const message = buildButtonAlertMessage(eventData, deviceInfo);

        // Enviar mensaje al grupo
        await bot.sendMessage(groupConfig.chat_id, message, {
            parse_mode: 'Markdown',
            disable_notification: false // Asegurar que notifique con sonido
        });

        logger.info('✅ Alerta de botón enviada exitosamente');

    } catch (error) {
        logger.error('Error enviando alerta de botón:', error);
        // No lanzar error para evitar detener el flujo MQTT
    }
}

/**
 * Construye el mensaje de alerta de botón presionado
 * 
 * @param {Object} eventData - Datos del evento
 * @param {Object} deviceInfo - Información del dispositivo desde db-repository
 * @param {string} deviceInfo.name - Nombre del dispositivo (nickname)
 * @param {string} deviceInfo.location - Ubicación del dispositivo
 * @param {string} deviceInfo.mac - MAC del dispositivo
 * @param {string} deviceInfo.id - ID formateado (ESP32_XXX)
 * @param {string} deviceInfo.status - Estado del dispositivo
 * @returns {string} Mensaje formateado en Markdown
 */
function buildButtonAlertMessage(eventData, deviceInfo) {
    const timestamp = formatTimestamp(eventData.timestamp);
    const deviceName = deviceInfo?.name || 'Desconocido';
    const location = deviceInfo?.location || 'Sin ubicación';
    const mac = eventData.mac || eventData.deviceId;

    return `*ALERTA - Botón Activo*

📍 *Dispositivo:* ${deviceName}
📌 *Ubicación:* ${location}
🔗 *MAC:* \`${mac}\`
🕐 *Hora:* ${timestamp}

⚠️ Se requiere atención inmediata`;
}

/**
 * Formatea timestamp ISO 8601 a formato legible
 * 
 * @param {string} timestamp - Timestamp en formato ISO 8601
 * @returns {string} Fecha y hora formateadas
 */
function formatTimestamp(timestamp) {
    try {
        const date = new Date(timestamp);

        // Formato: 25/10/2025 14:30:15
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        logger.error('Error formateando timestamp:', error);
        return timestamp; // Retornar original si falla
    }
}

/**
 * Envía notificación de error crítico del sistema
 * (Para uso futuro)
 * 
 * @param {Object} bot - Instancia del bot
 * @param {Object} groupConfig - Configuración del grupo
 * @param {string} errorMessage - Mensaje de error
 */
async function sendSystemError(bot, groupConfig, errorMessage) {
    try {
        if (!groupConfig.enabled) {
            return;
        }

        const message = `⚠️ *Error del Sistema*

${errorMessage}

_Timestamp: ${new Date().toISOString()}_`;

        await bot.sendMessage(groupConfig.chat_id, message, {
            parse_mode: 'Markdown'
        });

        logger.info('Notificación de error del sistema enviada');

    } catch (error) {
        logger.error('Error enviando notificación de sistema:', error);
    }
}

/**
 * Envía notificación de dispositivo offline
 * (Para uso futuro - integración con device-monitor)
 * 
 * @param {Object} bot - Instancia del bot
 * @param {Object} groupConfig - Configuración del grupo
 * @param {string} mac - MAC del dispositivo
 */
async function sendDeviceOfflineAlert(bot, groupConfig, mac) {
    try {
        if (!groupConfig.enabled) {
            return;
        }

        // Usar db-repository para obtener info del dispositivo
        const deviceInfo = db.getDeviceByMac(mac);
        const deviceName = deviceInfo?.name || mac;
        const location = deviceInfo?.location || 'Sin ubicación';

        const message = `⚠️ *Dispositivo Offline*

📍 *Dispositivo:* ${deviceName}
📌 *Ubicación:* ${location}
🔗 *MAC:* \`${mac}\`
🕐 *Hora:* ${formatTimestamp(new Date().toISOString())}

El dispositivo no responde desde hace más de 2 minutos.`;

        await bot.sendMessage(groupConfig.chat_id, message, {
            parse_mode: 'Markdown'
        });

        logger.info(`Alerta de dispositivo offline enviada: ${mac}`);

    } catch (error) {
        logger.error('Error enviando alerta de dispositivo offline:', error);
    }
}

module.exports = {
    sendButtonAlert,
    sendSystemError,
    sendDeviceOfflineAlert
};