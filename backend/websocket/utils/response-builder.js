/**
 * Constructor de Respuestas WebSocket
 * @brief Construye respuestas estándar para garantizar formato consistente
 */

const WEBSOCKET_CONFIG = require('../config/websocket-config');

class ResponseBuilder {

    /**
     * Construye respuesta base con timestamp
     * @param {String} type - Tipo de mensaje
     * @param {Object} additionalData - Datos adicionales
     * @returns {Object} Objeto de respuesta base
     */
    static buildBaseResponse(type, additionalData = {}) {
        return {
            type,
            timestamp: new Date().toISOString(),
            ...additionalData
        };
    }

    /**
     * Construye respuesta de éxito
     * @param {String} type - Tipo de mensaje
     * @param {Object} data - Datos de respuesta
     * @returns {Object} Respuesta de éxito
     */
    static buildSuccessResponse(type, data = {}) {
        return this.buildBaseResponse(type, {
            success: true,
            data
        });
    }

    /**
     * Construye respuesta de error
     * @param {Number} errorCode - Código de error
     * @param {String} details - Detalles adicionales del error
     * @returns {Object} Respuesta de error
     */
    static buildErrorResponse(errorCode, details = null) {
        return this.buildBaseResponse('error', {
            success: false,
            error: {
                code: errorCode,
                message: WEBSOCKET_CONFIG.ERROR_MESSAGES[errorCode] || 'Error desconocido',
                details
            }
        });
    }

    /**
     * Construye respuesta de handshake con estado del sistema
     * @param {Array} devices - Lista de dispositivos
     * @param {Object} systemInfo - Información adicional del sistema
     * @returns {Object} Respuesta de handshake completa
     */
    static buildHandshakeResponse(devices = [], systemInfo = {}) {
        return this.buildSuccessResponse(WEBSOCKET_CONFIG.MESSAGE_TYPES.HANDSHAKE_RSP,
            {
                devices: devices.map(device => ({
                    id: device.id,
                    mac: device.mac,
                    status: device.status || 'unknown',
                    lastSeen: device.lastSeen || null,
                    alarmActive: device.alarmActive || false,
                    location: device.location || null,
                    name: device.name || device.id
                })),
                serverTime: new Date().toISOString(),
                connectedClients: systemInfo.connectedClients || 0,
                serverStatus: 'online',
                ...systemInfo
            });
    }

    /**
     * Construye notificación de evento de dispositivo
     * @param {String} event - Tipo de evento
     * @param {Object} deviceData - Datos del dispositivo
     * @param {Object} eventData - Datos específicos del evento
     * @returns {Object} Notificación de evento
     */
    static buildDeviceNotification(event, deviceData, eventData = {}) {
        return this.buildBaseResponse(WEBSOCKET_CONFIG.MESSAGE_TYPES.NOTIFICATION, {
            event,
            data: {
                deviceId: deviceData.id,
                mac: deviceData.mac,
                deviceName: deviceData.name || deviceData.id,
                ...eventData
            }
        });
    }

    /**
     * Construye notificación específica para botón presionado
     * @param {Object} deviceData - Datos del dispositivo
     * @param {Object} buttonData - Datos del botón
     * @returns {Object} Notificación de botón presionado
     */
    static buildButtonPressedNotification(deviceData, buttonData) {
        return this.buildDeviceNotification(
            WEBSOCKET_CONFIG.DEVICE_EVENTS.BUTTON_PRESSED,
            deviceData,
            {
                buttonName: buttonData.name || 'BOTON_PANICO',
                buttonKey: buttonData.key || buttonData.str,
                alarmState: buttonData.alarmState || 'activated',
                controlName: buttonData.controlName,
                ntpStatus: buttonData.ntpStatus
            }
        );
    }

    /**
     * Construye notificación de cambio de estado de alarma
     * @param {Object} deviceData - Datos del dispositivo
     * @param {String} action - ACTIVAR o DESACTIVAR
     * @param {Object} controlData - Datos del control
     * @returns {Object} Notificación de alarma
     */
    static buildAlarmStateNotification(deviceData, action, controlData = {}) {
        const event = action === 'ACTIVAR'
            ? WEBSOCKET_CONFIG.DEVICE_EVENTS.ALARM_ACTIVATED
            : WEBSOCKET_CONFIG.DEVICE_EVENTS.ALARM_DEACTIVATED;

        return this.buildDeviceNotification(event, deviceData, {
            action,
            control: controlData.name,
            button: controlData.buttonName,
            key: controlData.key,
            ntpStatus: controlData.ntpStatus
        });
    }

    /**
     * Construye notificación de heartbeat
     * @param {Object} deviceData - Datos del dispositivo
     * @param {Object} heartbeatData - Datos del heartbeat
     * @returns {Object} Notificación de heartbeat
     */
    static buildHeartbeatNotification(deviceData, heartbeatData) {
        return this.buildDeviceNotification(
            WEBSOCKET_CONFIG.DEVICE_EVENTS.HEARTBEAT,
            deviceData,
            {
                uptime: heartbeatData.uptime,
                freeMemory: heartbeatData.freeMemory,
                rssi: heartbeatData.rssi,
                ntpStatus: heartbeatData.ntpStatus
            }
        );
    }

    /**
     * Construye notificación de cambio de estado de dispositivo
     * @param {Object} deviceData - Datos del dispositivo
     * @param {String} status - online/offline
     * @returns {Object} Notificación de estado
     */
    static buildDeviceStatusNotification(deviceData, status) {
        const event = status === 'online'
            ? WEBSOCKET_CONFIG.DEVICE_EVENTS.DEVICE_ONLINE
            : WEBSOCKET_CONFIG.DEVICE_EVENTS.DEVICE_OFFLINE;

        return this.buildDeviceNotification(event, deviceData, {
            status,
            reason: status === 'offline' ? 'timeout' : 'connected'
        });
    }

    /**
     * Construye respuesta de ping/pong
     * @param {String} type - 'ping' o 'pong'
     * @param {Object} data - Datos adicionales
     * @returns {Object} Respuesta de ping/pong
     */
    static buildPingPongResponse(type, data = {}) {
        return this.buildBaseResponse(type, data);
    }

    /**
     * Construye respuesta de información del sistema
     * @param {Object} systemData - Datos del sistema
     * @returns {Object} Respuesta de información del sistema
     */
    static buildSystemInfoResponse(systemData) {
        return this.buildSuccessResponse(WEBSOCKET_CONFIG.MESSAGE_TYPES.SYSTEM_INFO, {
            uptime: systemData.uptime || process.uptime(),
            memory: systemData.memory || process.memoryUsage(),
            connectedDevices: systemData.connectedDevices || 0,
            connectedClients: systemData.connectedClients || 0,
            mqttStatus: systemData.mqttStatus || 'connected',
            serverVersion: systemData.version || '1.0.0'
        });
    }

    /**
     * Construye respuesta para comando de dispositivo
     * @param {String} command - Comando ejecutado
     * @param {Object} result - Resultado del comando
     * @param {Boolean} success - Si fue exitoso
     * @returns {Object} Respuesta de comando
     */
    static buildDeviceCommandResponse(command, result, success = true) {
        return this.buildBaseResponse('device_command_response', {
            success,
            command,
            result: success ? result : null,
            error: success ? null : result
        });
    }

    /**
     * Construye respuesta para comando de dispositivo
     * @param {String} command - Comando ejecutado
     * @param {Object} result - Resultado del comando
     * @param {Boolean} success - Si fue exitoso
     * @returns {Object} Respuesta de comando
    */
    static buildDeviceCommandResponse(command, result, success = true) {
        return this.buildBaseResponse('device_command_response', {
            success,
            command,
            result: success ? result : null,
            error: success ? null : result
        });
    }

    // AGREGAR MÉTODO DESPUÉS DE buildDeviceCommandResponse - LÍNEA 220+
    /**
     * Construye notificación de respuesta de dispositivo (ACK)
     * @param {Object} deviceData - Datos del dispositivo
     * @param {String} command - Comando que se ejecutó
     * @param {Object} ackMessage - Mensaje de ACK del dispositivo
     * @returns {Object} Notificación de respuesta
    */
    static buildDeviceResponseNotification(deviceData, command, ackMessage) {
        return this.buildBaseResponse(WEBSOCKET_CONFIG.MESSAGE_TYPES.NOTIFICATION, {
            event: 'device_response',
            data: {
                deviceId: deviceData.id,
                mac: deviceData.mac,
                deviceName: deviceData.name || deviceData.id,
                command: command,
                response: ackMessage,
                success: ackMessage.status === 'ok' || ackMessage.result === 'OK',
                timestamp: ackMessage.timestamp || new Date().toISOString()
            }
        });
    }
}

module.exports = ResponseBuilder;