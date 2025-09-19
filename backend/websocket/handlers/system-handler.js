/**
 * System Handler - Handshake y Estado del Sistema
 * @brief Maneja handshake, estado inicial de dispositivos e información del sistema
 */

const fs = require('fs').promises;
const path = require('path');
const WEBSOCKET_CONFIG = require('../config/websocket-config');
const ResponseBuilder = require('../utils/response-builder');
const clientManager = require('../services/client-manager');

class SystemHandler {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data');
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
            const [devices, alarms, macToId] = await Promise.all([
                this.loadDevicesState(),
                this.loadAlarms(),
                this.loadMacToId()
            ]);

            // Combinar información de dispositivos con alarmas
            const enrichedDevices = this.enrichDevicesWithAlarms(devices, alarms, macToId);

            return {
                devices: enrichedDevices,
                mqttStatus: 'connected', // TODO: obtener estado real del MQTT
                lastUpdate: new Date().toISOString(),
                totalDevices: enrichedDevices.length,
                onlineDevices: enrichedDevices.filter(d => d.status === 'online').length
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
     * Carga el estado de los dispositivos desde archivos JSON
     * @returns {Array} Lista de dispositivos
     */
    async loadDevicesState() {
        try {
            // Intentar cargar desde diferentes fuentes de datos
            const deviceSources = [
                'device_status.json'
            ];

            let devices = [];

            for (const source of deviceSources) {
                try {
                    const filePath = path.join(this.dataPath, source);
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(fileContent);
                    
                    if (Array.isArray(data)) {
                        devices = devices.concat(data);
                    } else if (data.devices) {
                        devices = devices.concat(data.devices);
                    }
                    
                } catch (fileError) {
                    // Archivo no existe o error leyendo - continuar con el siguiente
                    console.warn(`[SystemHandler] No se pudo cargar ${source}:`, fileError.message);
                }
            }

            // Si no hay dispositivos en archivos, crear lista por defecto basada en mac_to_id
            if (devices.length === 0) {
                devices = await this.createDefaultDevicesList();
            }

            return devices;

        } catch (error) {
            console.error('[SystemHandler] Error cargando dispositivos:', error);
            return [];
        }
    }

    /**
     * Carga las alarmas desde alarmas.json
     * @returns {Array} Lista de alarmas
     */
    async loadAlarms() {
        try {
            const alarmsPath = path.join(this.dataPath, 'alarmas.json');
            const alarmsContent = await fs.readFile(alarmsPath, 'utf8');
            return JSON.parse(alarmsContent);
        } catch (error) {
            console.warn('[SystemHandler] No se pudieron cargar alarmas:', error.message);
            return [];
        }
    }

    /**
     * Carga el mapeo MAC to ID desde mac_to_id.json
     * @returns {Object} Mapeo de MAC a ID
     */
    async loadMacToId() {
        try {
            const macToIdPath = path.join(this.dataPath, 'mac_to_id.json');
            const macToIdContent = await fs.readFile(macToIdPath, 'utf8');
            return JSON.parse(macToIdContent);
        } catch (error) {
            console.warn('[SystemHandler] No se pudo cargar mac_to_id:', error.message);
            return {};
        }
    }

    /**
     * Enriquece la información de dispositivos con datos de alarmas
     * @param {Array} devices - Lista de dispositivos
     * @param {Array} alarms - Lista de alarmas
     * @param {Object} macToId - Mapeo MAC to ID
     * @returns {Array} Dispositivos enriquecidos
     */
    enrichDevicesWithAlarms(devices, alarms, macToId) {
        try {
            const enrichedDevices = devices.map(device => {
                // Buscar alarmas relacionadas con este dispositivo
                const deviceAlarms = alarms.filter(alarm => 
                    alarm.mac === device.mac || 
                    alarm.deviceId === device.id ||
                    alarm.id === device.id
                );

                // Obtener ID limpio desde mac_to_id si está disponible
                const cleanId = macToId[device.mac] || device.id;

                return {
                    id: device.id || cleanId,
                    mac: device.mac,
                    name: device.name || cleanId || device.id,
                    status: device.status || 'unknown',
                    lastSeen: device.lastSeen || null,
                    alarmActive: deviceAlarms.some(alarm => alarm.active === true),
                    location: device.location || null,
                    uptime: device.uptime || null,
                    freeMemory: device.freeMemory || null,
                    rssi: device.rssi || null,
                    ntpStatus: device.ntpStatus || null,
                    totalAlarms: deviceAlarms.length,
                    activeAlarms: deviceAlarms.filter(a => a.active).length
                };
            });

            return enrichedDevices;

        } catch (error) {
            console.error('[SystemHandler] Error enriqueciendo dispositivos:', error);
            return devices; // Retornar dispositivos originales si hay error
        }
    }

    /**
     * Crea lista por defecto de dispositivos basada en mac_to_id
     * @returns {Array} Lista de dispositivos por defecto
     */
    async createDefaultDevicesList() {
        try {
            const macToId = await this.loadMacToId();
            
            return Object.entries(macToId).map(([mac, id]) => ({
                id,
                mac,
                name: id,
                status: 'unknown',
                lastSeen: null,
                alarmActive: false,
                location: null
            }));

        } catch (error) {
            console.error('[SystemHandler] Error creando lista por defecto:', error);
            return [];
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

            const systemData = {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                connectedDevices: (await this.loadDevicesState()).length,
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
            version: this.systemInfo.version,
            dataPath: this.dataPath
        };
    }
}

module.exports = SystemHandler;