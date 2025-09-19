/**
 * Device Handler - Comandos WebSocket → MQTT
 * @brief Maneja comandos desde clientes WebSocket y los envía a dispositivos ESP32 via MQTT
 */

const fs = require('fs').promises;
const path = require('path');
const WEBSOCKET_CONFIG = require('../config/websocket-config');
const ResponseBuilder = require('../utils/response-builder');
const clientManager = require('../services/client-manager');

class DeviceHandler {
    constructor(mqttClient = null) {
        this.mqttClient = mqttClient;
        this.dataPath = path.join(__dirname, '../../data');
        this.idToMacCache = null; // Cache inverso: ID → MAC
        this.pendingCommands = new Map(); // Tracking de comandos pendientes
        this.commandStats = {
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            timeoutCommands: 0,
            commandsByType: {}
        };
        
        // Comandos válidos soportados
        this.validCommands = {
            'ping': { mqttCmd: 'ping', requiresData: false },
            'play_track': { mqttCmd: 'play_track', requiresData: true },
            'stop_audio': { mqttCmd: 'stop_audio', requiresData: false },
            'set_volume': { mqttCmd: 'set_volume', requiresData: true },
            'get_status': { mqttCmd: 'getinfo', requiresData: false },
            'reboot': { mqttCmd: 'reinicio_srv', requiresData: false }
        };
    }

    /**
     * Configura el cliente MQTT para envío de comandos
     * @param {Object} mqttClient - Cliente MQTT
     */
    setMqttClient(mqttClient) {
        this.mqttClient = mqttClient;
        console.log('[DeviceHandler] Cliente MQTT configurado');
    }

    /**
     * Maneja comandos de dispositivos desde WebSocket
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} messageData - Datos del mensaje
     */
    async handleCommand(ws, messageData) {
        try {
            this.commandStats.totalCommands++;
            
            console.log(`[DeviceHandler] Comando recibido: ${messageData.command} para ${messageData.deviceId}`);

            // Validar estructura del comando
            const validation = this.validateCommand(messageData);
            if (!validation.isValid) {
                this.sendErrorResponse(ws, validation.error);
                return false;
            }

            // Traducir ID a MAC
            const deviceMac = await this.translateIdToMac(messageData.deviceId);
            if (!deviceMac) {
                this.sendErrorResponse(ws, `Dispositivo no encontrado: ${messageData.deviceId}`);
                return false;
            }

            // Verificar conexión MQTT
            if (!this.mqttClient || !this.mqttClient.connected) {
                this.sendErrorResponse(ws, 'MQTT no conectado');
                return false;
            }

            // Enviar comando MQTT
            const success = await this.sendMqttCommand(deviceMac, messageData);
            
            if (success) {
                // Enviar confirmación inmediata al cliente
                const response = ResponseBuilder.buildSuccessResponse(
                    'device_command',
                    {
                        deviceId: messageData.deviceId,
                        command: messageData.command,
                        status: 'sent',
                        message: 'Comando enviado al dispositivo'
                    }
                );
                
                ws.send(JSON.stringify(response));
                this.commandStats.successfulCommands++;
                this.updateCommandStats(messageData.command);
                
                return true;
            } else {
                this.sendErrorResponse(ws, 'Error enviando comando MQTT');
                return false;
            }

        } catch (error) {
            console.error('[DeviceHandler] Error manejando comando:', error);
            this.sendErrorResponse(ws, `Error interno: ${error.message}`);
            this.commandStats.failedCommands++;
            return false;
        }
    }

    /**
     * Valida la estructura del comando
     * @param {Object} messageData - Datos del mensaje
     * @returns {Object} Resultado de validación
     */
    validateCommand(messageData) {
        // Verificar campos obligatorios
        if (!messageData.deviceId) {
            return { isValid: false, error: 'deviceId es obligatorio' };
        }

        if (!messageData.command) {
            return { isValid: false, error: 'command es obligatorio' };
        }

        // Verificar comando válido
        const commandConfig = this.validCommands[messageData.command];
        if (!commandConfig) {
            return { 
                isValid: false, 
                error: `Comando no válido: ${messageData.command}. Válidos: ${Object.keys(this.validCommands).join(', ')}` 
            };
        }

        // Verificar datos requeridos
        if (commandConfig.requiresData && !messageData.data) {
            return { 
                isValid: false, 
                error: `Comando ${messageData.command} requiere campo 'data'` 
            };
        }

        return { isValid: true };
    }

    /**
     * Traduce ID limpio a MAC usando mac_to_id.json (inverso)
     * @param {String} deviceId - ID limpio del dispositivo
     * @returns {String|null} MAC del dispositivo o null
     */
    async translateIdToMac(deviceId) {
        try {
            // Cargar cache si no existe
            if (!this.idToMacCache) {
                await this.loadIdToMacCache();
            }

            // Buscar traducción
            const deviceMac = this.idToMacCache[deviceId];
            
            if (deviceMac) {
                return deviceMac;
            }

            console.warn(`[DeviceHandler] No se encontró MAC para ID ${deviceId}`);
            return null;

        } catch (error) {
            console.error(`[DeviceHandler] Error traduciendo ID ${deviceId}:`, error);
            return null;
        }
    }

    /**
     * Carga el cache inverso de ID to MAC
     */
    async loadIdToMacCache() {
        try {
            const macToIdPath = path.join(this.dataPath, 'mac_to_id.json');
            const macToIdContent = await fs.readFile(macToIdPath, 'utf8');
            const macToIdMap = JSON.parse(macToIdContent);
            
            // Crear mapeo inverso: ID → MAC
            this.idToMacCache = {};
            for (const [mac, id] of Object.entries(macToIdMap)) {
                this.idToMacCache[id] = mac;
            }
            
            console.log('[DeviceHandler] Cache ID to MAC cargado');
            
        } catch (error) {
            console.warn('[DeviceHandler] No se pudo cargar mac_to_id.json:', error.message);
            this.idToMacCache = {}; // Cache vacío
        }
    }

    /**
     * Envía comando MQTT al dispositivo
     * @param {String} deviceMac - MAC del dispositivo
     * @param {Object} commandData - Datos del comando
     * @returns {Boolean} True si se envió exitosamente
     */
    async sendMqttCommand(deviceMac, commandData) {
        try {
            const commandConfig = this.validCommands[commandData.command];
            
            // Construir payload MQTT
            const mqttPayload = {
                cmd: commandConfig.mqttCmd,
                timestamp: new Date().toISOString()
            };

            // Agregar datos específicos del comando
            if (commandData.data) {
                Object.assign(mqttPayload, commandData.data);
            }

            // Topic MQTT: NODO/{MAC}/CMD
            const topic = `NODO/${deviceMac}/CMD`;
            
            console.log(`[DeviceHandler] Enviando comando MQTT: ${topic} →`, mqttPayload);

            // Publicar en MQTT
            this.mqttClient.publish(topic, JSON.stringify(mqttPayload));
            
            // Registrar comando pendiente para tracking
            const commandId = this.generateCommandId();
            this.pendingCommands.set(commandId, {
                deviceId: commandData.deviceId,
                deviceMac: deviceMac,
                command: commandData.command,
                sentAt: new Date(),
                timeout: setTimeout(() => {
                    this.handleCommandTimeout(commandId);
                }, WEBSOCKET_CONFIG.COMMAND_TIMEOUT || 10000)
            });

            return true;

        } catch (error) {
            console.error(`[DeviceHandler] Error enviando comando MQTT:`, error);
            return false;
        }
    }

    /**
     * Maneja ACK de comandos desde dispositivos (llamado por MQTT module)
     * @param {String} deviceMac - MAC del dispositivo
     * @param {Object} ackMessage - Mensaje de ACK
     */
    async handleCommandAck(deviceMac, ackMessage) {
        try {
            console.log(`[DeviceHandler] ACK recibido de ${deviceMac}:`, ackMessage);

            // Buscar comando pendiente
            const commandId = this.findPendingCommandByMac(deviceMac);
            if (!commandId) {
                console.warn(`[DeviceHandler] ACK recibido pero no hay comando pendiente para ${deviceMac}`);
                return;
            }

            const pendingCommand = this.pendingCommands.get(commandId);
            if (!pendingCommand) return;

            // Limpiar timeout
            clearTimeout(pendingCommand.timeout);
            this.pendingCommands.delete(commandId);

            // Traducir MAC a ID para notificación
            const deviceId = pendingCommand.deviceId;

            // Crear notificación de respuesta para clientes WebSocket
            const notification = ResponseBuilder.buildDeviceResponseNotification(
                { id: deviceId, mac: deviceMac },
                pendingCommand.command,
                ackMessage
            );

            // Broadcasting a todos los clientes
            const NotificationBroadcaster = require('../services/notification-broadcaster');
            const broadcaster = new NotificationBroadcaster();
            await broadcaster.broadcastToAllClients(notification);

            console.log(`[DeviceHandler] Comando completado: ${pendingCommand.command} para ${deviceId}`);

        } catch (error) {
            console.error('[DeviceHandler] Error manejando ACK:', error);
        }
    }

    /**
     * Encuentra comando pendiente por MAC del dispositivo
     * @param {String} deviceMac - MAC del dispositivo
     * @returns {String|null} ID del comando o null
     */
    findPendingCommandByMac(deviceMac) {
        for (const [commandId, command] of this.pendingCommands.entries()) {
            if (command.deviceMac === deviceMac) {
                return commandId;
            }
        }
        return null;
    }

    /**
     * Maneja timeout de comandos
     * @param {String} commandId - ID del comando
     */
    handleCommandTimeout(commandId) {
        const command = this.pendingCommands.get(commandId);
        if (!command) return;

        console.warn(`[DeviceHandler] Timeout para comando: ${command.command} a ${command.deviceId}`);
        
        this.pendingCommands.delete(commandId);
        this.commandStats.timeoutCommands++;

        // Notificar timeout a clientes WebSocket
        const notification = ResponseBuilder.buildErrorResponse(
            WEBSOCKET_CONFIG.ERROR_CODES.COMMAND_TIMEOUT || 408,
            `Timeout ejecutando comando ${command.command} en ${command.deviceId}`
        );

        // Broadcasting del error
        clientManager.broadcastToAll(notification);
    }

    /**
     * Genera ID único para comando
     * @returns {String} ID único
     */
    generateCommandId() {
        return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Envía respuesta de error al cliente WebSocket
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {String} errorMessage - Mensaje de error
     */
    sendErrorResponse(ws, errorMessage) {
        const errorResponse = ResponseBuilder.buildErrorResponse(
            WEBSOCKET_CONFIG.ERROR_CODES.INVALID_COMMAND || 400,
            errorMessage
        );
        
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(errorResponse));
        }
    }

    /**
     * Actualiza estadísticas por tipo de comando
     * @param {String} command - Tipo de comando
     */
    updateCommandStats(command) {
        if (!this.commandStats.commandsByType[command]) {
            this.commandStats.commandsByType[command] = 0;
        }
        this.commandStats.commandsByType[command]++;
    }

    /**
     * Obtiene estadísticas del handler
     * @returns {Object} Estadísticas actuales
     */
    getStats() {
        return {
            ...this.commandStats,
            pendingCommands: this.pendingCommands.size,
            mqttConnected: this.mqttClient ? this.mqttClient.connected : false,
            validCommands: Object.keys(this.validCommands),
            successRate: this.commandStats.successfulCommands / (this.commandStats.totalCommands || 1)
        };
    }

    /**
     * Limpia comandos pendientes (cleanup)
     */
    cleanup() {
        // Limpiar todos los timeouts
        for (const command of this.pendingCommands.values()) {
            clearTimeout(command.timeout);
        }
        this.pendingCommands.clear();
        
        console.log('[DeviceHandler] Cleanup completado');
    }
}

module.exports = DeviceHandler;