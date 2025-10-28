/**
 * Notification Broadcaster - Broadcasting de Eventos MQTT
 * @brief Procesa eventos MQTT y los transmite a clientes WebSocket conectados
 */

const WEBSOCKET_CONFIG = require('../config/websocket-config');
const ResponseBuilder = require('../utils/response-builder');
const clientManager = require('./client-manager');
const dbRepository = require('../../../data/db-repository');

class NotificationBroadcaster {
    constructor() {
        this.broadcastStats = {
            totalEvents: 0,
            successfulBroadcasts: 0,
            failedBroadcasts: 0,
            eventsByType: {}
        };
    }

    /**
     * Procesa evento MQTT y determina el tipo de broadcasting
     * @param {String} topic - Topic MQTT completo
     * @param {Object} message - Mensaje MQTT parseado
     * @param {String} deviceMac - MAC del dispositivo (viene del MQTT)
     */
    async processMqttEvent(topic, message, deviceMac) {
        try {
            this.broadcastStats.totalEvents++;

            console.log(`[NotificationBroadcaster] Procesando evento MQTT: ${topic} desde MAC ${deviceMac}`);

            // Extraer tipo de evento del mensaje (no del topic)
            const eventType = this.extractEventFromMessage(message);

            if (!eventType) {
                console.warn(`[NotificationBroadcaster] Tipo de evento desconocido en mensaje:`, message);
                return;
            }

            // ✅ Obtener información del dispositivo directamente desde db-repository
            const deviceInfo = dbRepository.getDeviceByMac(deviceMac, 5); // 5 min threshold

            if (!deviceInfo) {
                console.warn(`[NotificationBroadcaster] Dispositivo no encontrado para MAC ${deviceMac}`);
                return;
            }

            // Procesar según el tipo de evento
            let notification = null;

            switch (eventType) {
                case 'button':
                    notification = this.createButtonPressedNotification(deviceInfo, message);
                    break;
                case 'hb':
                    notification = this.createHeartbeatNotification(deviceInfo, message);
                    break;
                case 'rst':
                    notification = this.createDeviceResetNotification(deviceInfo, message);
                    break;
                case 'play_fin':
                    notification = this.createPlayFinishedNotification(deviceInfo, message);
                    break;
                default:
                    console.warn(`[NotificationBroadcaster] Evento no manejado: ${eventType}`);
                    return;
            }

            if (notification) {
                await this.broadcastToAllClients(notification);
                this.updateEventStats(eventType);
            }

        } catch (error) {
            console.error('[NotificationBroadcaster] Error procesando evento MQTT:', error);
            this.broadcastStats.failedBroadcasts++;
        }
    }

    /**
     * Extrae el tipo de evento del mensaje MQTT (no del topic)
     * @param {Object} message - Mensaje MQTT parseado
     * @returns {String|null} Tipo de evento o null
     */
    extractEventFromMessage(message) {
        // El evento viene en el campo "event" del mensaje
        return message.event || null;
    }

    /**
     * Crea notificación para botón presionado
     * @param {Object} deviceInfo - Información del dispositivo
     * @param {Object} message - Mensaje MQTT
     * @returns {Object} Notificación WebSocket
     */
    createButtonPressedNotification(deviceInfo, message) {
        const buttonData = {
            name: message.str || 'BOTON_PANICO',
            key: message.str || 'BOTON_PANICO',
            alarmState: 'activated',
            controlName: message.control,
            ntpStatus: message.ntp
        };

        return ResponseBuilder.buildButtonPressedNotification(deviceInfo, buttonData);
    }

    /**
     * Crea notificación para heartbeat
     * @param {Object} deviceInfo - Información del dispositivo
     * @param {Object} message - Mensaje MQTT
     * @returns {Object} Notificación WebSocket
     */
    createHeartbeatNotification(deviceInfo, message) {
        const heartbeatData = {
            uptime: message.uptime,
            freeMemory: message.freeMemory,
            rssi: message.rssi,
            ntpStatus: message.ntp
        };

        return ResponseBuilder.buildHeartbeatNotification(deviceInfo, heartbeatData);
    }

    /**
     * Crea notificación para control de alarma
     * @param {Object} deviceInfo - Información del dispositivo
     * @param {Object} message - Mensaje MQTT
     * @returns {Object} Notificación WebSocket
     */
    createAlarmControlNotification(deviceInfo, message) {
        const controlData = {
            name: message.control,
            buttonName: message.button,
            key: message.key,
            ntpStatus: message.ntp
        };

        return ResponseBuilder.buildAlarmStateNotification(deviceInfo, message.action, controlData);
    }

    /**
     * Crea notificación para cambio de estado
     * @param {Object} deviceInfo - Información del dispositivo
     * @param {Object} message - Mensaje MQTT
     * @returns {Object} Notificación WebSocket
     */
    createStatusNotification(deviceInfo, message) {
        const status = message.online ? 'online' : 'offline';
        return ResponseBuilder.buildDeviceStatusNotification(deviceInfo, status);
    }

    /**
     * Crea notificación para dispositivo reiniciado
     * @param {Object} deviceInfo - Información del dispositivo  
     * @param {Object} message - Mensaje MQTT
     * @returns {Object} Notificación WebSocket
     */
    createDeviceResetNotification(deviceInfo, message) {
        return ResponseBuilder.buildDeviceNotification(
            WEBSOCKET_CONFIG.DEVICE_EVENTS.DEVICE_RESET || 'device_reset',
            deviceInfo,
            {
                reason: 'device_restart',
                ntpStatus: message.ntp || message.time,
                timestamp: message.timestamp || new Date().toISOString()
            }
        );
    }

    /**
     * Crea notificación para reproducción finalizada
     * @param {Object} deviceInfo - Información del dispositivo
     * @param {Object} message - Mensaje MQTT
     * @returns {Object} Notificación WebSocket
     */
    createPlayFinishedNotification(deviceInfo, message) {
        const playData = {
            track: message.track,
            ntpStatus: message.ntp,
            duration: message.duration || null
        };

        return ResponseBuilder.buildDeviceNotification(
            'play_finished',
            deviceInfo,
            playData
        );
    }

    /**
     * Envía notificación a todos los clientes conectados
     * @param {Object} notification - Notificación a enviar
     * @returns {Number} Número de clientes notificados
     */
    async broadcastToAllClients(notification) {
        try {
            // Filtrar solo clientes en estado READY
            const filter = (client) => {
                return client.state === WEBSOCKET_CONFIG.CONNECTION_STATES.READY;
            };

            const clientsNotified = clientManager.broadcastToAll(notification, filter);

            console.log(`[NotificationBroadcaster] Evento enviado a ${clientsNotified} clientes: ${notification.event}`);

            this.broadcastStats.successfulBroadcasts++;
            return clientsNotified;

        } catch (error) {
            console.error('[NotificationBroadcaster] Error en broadcasting:', error);
            this.broadcastStats.failedBroadcasts++;
            return 0;
        }
    }

    /**
     * Envía notificación a un cliente específico
     * @param {String} clientId - ID del cliente
     * @param {Object} notification - Notificación a enviar
     * @returns {Boolean} True si se envió exitosamente
     */
    async notifyClient(clientId, notification) {
        try {
            const sent = clientManager.sendToClient(clientId, notification);

            if (sent) {
                console.log(`[NotificationBroadcaster] Notificación enviada a ${clientId}: ${notification.event}`);
            } else {
                console.warn(`[NotificationBroadcaster] No se pudo notificar a ${clientId}`);
            }

            return sent;

        } catch (error) {
            console.error(`[NotificationBroadcaster] Error notificando a ${clientId}:`, error);
            return false;
        }
    }

    /**
     * Actualiza estadísticas por tipo de evento
     * @param {String} eventType - Tipo de evento
     */
    updateEventStats(eventType) {
        if (!this.broadcastStats.eventsByType[eventType]) {
            this.broadcastStats.eventsByType[eventType] = 0;
        }
        this.broadcastStats.eventsByType[eventType]++;
    }

    /**
     * Obtiene estadísticas del broadcaster
     * @returns {Object} Estadísticas actuales
     */
    getStats() {
        return {
            ...this.broadcastStats,
            connectedClients: clientManager.getStats().currentConnections,
            successRate: this.broadcastStats.successfulBroadcasts / (this.broadcastStats.totalEvents || 1)
        };
    }

    /**
     * Resetea las estadísticas
     */
    resetStats() {
        this.broadcastStats = {
            totalEvents: 0,
            successfulBroadcasts: 0,
            failedBroadcasts: 0,
            eventsByType: {}
        };
        console.log('[NotificationBroadcaster] Estadísticas reseteadas');
    }

    /**
     * Verifica el estado del broadcaster
     * @returns {Object} Estado de salud
     */
    healthCheck() {
        const stats = this.getStats();

        return {
            healthy: stats.successRate > 0.9, // 90% de éxito
            totalEvents: stats.totalEvents,
            successRate: stats.successRate,
            connectedClients: stats.connectedClients,
            recentErrors: stats.failedBroadcasts
        };
    }
}

module.exports = NotificationBroadcaster;