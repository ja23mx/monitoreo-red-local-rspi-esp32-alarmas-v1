/**
 * System Handler - Handshake y Estado del Sistema
 * @brief Maneja handshake, estado inicial de dispositivos e información del sistema
 */

const WEBSOCKET_CONFIG = require('../config/websocket-config');
const ResponseBuilder = require('../utils/response-builder');
const clientManager = require('../services/client-manager');
const dbRepository = require('../../../data/db-repository');

class SystemHandler {
    constructor() {
        this.systemInfo = {
            startTime: new Date(),
            version: '1.0.0'
        };
    }

    /**
     * Maneja el handshake completo del cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} messageData - Datos del mensaje de handshake
     */
    async handleHandshake(ws, messageData) {
        try {
            console.log(`[SystemHandler] Procesando handshake para cliente: ${messageData.clientId}`);

            // Obtener cliente del manager
            const client = clientManager.getClientByWS(ws);
            if (!client) {
                throw new Error('Cliente no registrado');
            }

            // Actualizar información del cliente con datos del handshake
            await this.updateClientInfo(client, messageData);

            // Obtener estado actual del sistema
            const systemState = await this.getSystemState();

            // Construir respuesta de handshake
            const handshakeResponse = ResponseBuilder.buildHandshakeResponse(
                systemState.devices,
                {
                    connectedClients: clientManager.getStats().currentConnections,
                    serverUptime: process.uptime(),
                    serverVersion: this.systemInfo.version,
                    mqttStatus: systemState.mqttStatus,
                    lastUpdate: systemState.lastUpdate
                }
            );

            // Enviar respuesta
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(handshakeResponse));

                /* console.log(`[SystemHandler] Respuesta de handshake enviada a cliente: ${client.id}`);
                console.log(`handshakeResponse: ${JSON.stringify(handshakeResponse)}`); */

                // Actualizar estado del cliente a READY
                clientManager.updateClientState(client.id, WEBSOCKET_CONFIG.CONNECTION_STATES.READY);

                console.log(`[SystemHandler] ✅ Handshake completado para cliente: ${client.id}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('[SystemHandler] Error en handshake:', error);

            // Enviar respuesta de error
            const errorResponse = ResponseBuilder.buildErrorResponse(
                WEBSOCKET_CONFIG.ERROR_CODES.INTERNAL_ERROR,
                `Error en handshake: ${error.message}`
            );

            if (ws.readyState === 1) {
                ws.send(JSON.stringify(errorResponse));
            }

            return false;
        }
    }

    /**
     * Actualiza información del cliente con datos del handshake
     * @param {Object} client - Cliente del manager
     * @param {Object} handshakeData - Datos del handshake
     */
    async updateClientInfo(client, handshakeData) {
        try {
            // Actualizar datos del cliente
            client.userAgent = handshakeData.userAgent || client.userAgent;
            client.metadata = {
                ...client.metadata,
                version: handshakeData.data?.version || '1.0',
                clientId: handshakeData.clientId,
                handshakeTime: new Date(),
                authenticated: true
            };

            console.log(`[SystemHandler] Cliente actualizado: ${client.id}`);

        } catch (error) {
            console.error('[SystemHandler] Error actualizando cliente:', error);
            throw error;
        }
    }

    /**
     * Obtiene el estado actual completo del sistema
     * @returns {Object} Estado del sistema con dispositivos y información
     */
    async getSystemState() {
        try {
            // ✅ Usar SOLO db-repository para obtener dispositivos
            const devices = dbRepository.getAllDevicesForWS(5); // 5 min threshold

            console.log(`[SystemHandler] ✅ Cargados ${devices.length} dispositivos desde db-repository`);

            return {
                devices: devices,
                mqttStatus: 'connected', // TODO: obtener estado real del MQTT
                lastUpdate: new Date().toISOString(),
                totalDevices: devices.length,
                onlineDevices: devices.filter(d => d.status === 'online').length
            };

        } catch (error) {
            console.error('[SystemHandler] Error obteniendo estado del sistema:', error);
            return {
                devices: [],
                mqttStatus: 'unknown',
                lastUpdate: new Date().toISOString(),
                totalDevices: 0,
                onlineDevices: 0,
                error: error.message
            };
        }
    }

    /**
     * Maneja solicitudes de información del sistema
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} messageData - Datos del mensaje
     */
    async handleSystemInfo(ws, messageData) {
        try {
            console.log('[SystemHandler] Solicitud de información del sistema');

            // ✅ Usar db-repository para contar dispositivos
            const devices = dbRepository.getAllDevicesForWS(5);

            const systemData = {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                connectedDevices: devices.length,
                connectedClients: clientManager.getStats().currentConnections,
                mqttStatus: 'connected', // TODO: obtener estado real
                version: this.systemInfo.version,
                startTime: this.systemInfo.startTime,
                currentTime: new Date().toISOString()
            };

            const response = ResponseBuilder.buildSystemInfoResponse(systemData);

            if (ws.readyState === 1) {
                ws.send(JSON.stringify(response));
                return true;
            }

            return false;

        } catch (error) {
            console.error('[SystemHandler] Error obteniendo info del sistema:', error);

            const errorResponse = ResponseBuilder.buildErrorResponse(
                WEBSOCKET_CONFIG.ERROR_CODES.INTERNAL_ERROR,
                `Error obteniendo información: ${error.message}`
            );

            if (ws.readyState === 1) {
                ws.send(JSON.stringify(errorResponse));
            }

            return false;
        }
    }

    /**
     * Obtiene estadísticas del handler
     * @returns {Object} Estadísticas del sistema
     */
    getStats() {
        return {
            handlerType: 'system',
            uptime: process.uptime(),
            startTime: this.systemInfo.startTime,
            version: this.systemInfo.version
        };
    }
}

module.exports = SystemHandler;