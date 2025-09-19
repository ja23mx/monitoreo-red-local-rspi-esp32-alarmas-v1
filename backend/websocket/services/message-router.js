/**
 * Router de Mensajes WebSocket
 * @brief Valida, parsea y dirige mensajes entrantes a los handlers apropiados
 */

const MessageValidator = require('../utils/message-validator');
const ResponseBuilder = require('../utils/response-builder');
const WEBSOCKET_CONFIG = require('../config/websocket-config');
const clientManager = require('./client-manager');
const SystemHandler = require('../handlers/system-handler');
const DeviceHandler = require('../handlers/device-handler'); 

class MessageRouter {
    constructor() {
        this.handlers = new Map();
        this.systemHandler = new SystemHandler();
        this.deviceHandler = new DeviceHandler();
        this.messageStats = {
            totalMessages: 0,
            validMessages: 0,
            invalidMessages: 0,
            messagesByType: {}
        };

        // Registrar handlers por defecto
        this.registerDefaultHandlers();
    }

    /**
     * Registra handlers por defecto para tipos de mensaje básicos
     */
    registerDefaultHandlers() {
        // Handler para handshake 
        this.registerHandler(WEBSOCKET_CONFIG.MESSAGE_TYPES.HANDSHAKE, this.systemHandler.handleHandshake.bind(this.systemHandler));

        // Handler para system info
        this.registerHandler(WEBSOCKET_CONFIG.MESSAGE_TYPES.SYSTEM_INFO, this.systemHandler.handleSystemInfo.bind(this.systemHandler));

        // Handler para device commands 
        this.registerHandler(WEBSOCKET_CONFIG.MESSAGE_TYPES.DEVICE_COMMAND, this.deviceHandler.handleCommand.bind(this.deviceHandler));

        // Handler para ping/pong
        this.registerHandler(WEBSOCKET_CONFIG.MESSAGE_TYPES.PING, this.handlePing.bind(this));
        this.registerHandler(WEBSOCKET_CONFIG.MESSAGE_TYPES.PONG, this.handlePong.bind(this));
    }

    /**
     * Registra un handler para un tipo de mensaje específico
     * @param {String} messageType - Tipo de mensaje
     * @param {Function} handler - Función handler
     */
    registerHandler(messageType, handler) {
        if (typeof handler !== 'function') {
            throw new Error(`Handler para ${messageType} debe ser una función`);
        }

        this.handlers.set(messageType, handler);
        console.log(`[MessageRouter] Handler registrado para tipo: ${messageType}`);
    }

    /**
     * Desregistra un handler
     * @param {String} messageType - Tipo de mensaje
     */
    unregisterHandler(messageType) {
        const removed = this.handlers.delete(messageType);
        if (removed) {
            console.log(`[MessageRouter] Handler desregistrado para tipo: ${messageType}`);
        }
        return removed;
    }

    /**
     * Procesa un mensaje entrante y lo dirige al handler apropiado
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Buffer} rawMessage - Mensaje raw recibido
     */
    async routeMessage(ws, rawMessage) {
        const startTime = Date.now();
        this.messageStats.totalMessages++;

        try {
            // Convertir Buffer a string
            const messageString = rawMessage.toString('utf8');

            // Validar mensaje
            const validation = MessageValidator.validateMessage(messageString);

            if (!validation.isValid) {
                this.handleInvalidMessage(ws, validation);
                return;
            }

            // Mensaje válido
            this.messageStats.validMessages++;
            const messageData = validation.data;

            // Actualizar estadísticas por tipo
            this.updateMessageTypeStats(messageData.type);

            // Obtener handler para el tipo de mensaje
            const handler = this.handlers.get(messageData.type);

            if (!handler) {
                this.handleUnknownMessageType(ws, messageData);
                return;
            }

            // Ejecutar handler
            await this.executeHandler(ws, messageData, handler, startTime);

        } catch (error) {
            console.error('[MessageRouter] Error procesando mensaje:', error);
            this.sendErrorResponse(ws, WEBSOCKET_CONFIG.ERROR_CODES.INTERNAL_ERROR, error.message);
        }
    }

    /**
     * Ejecuta un handler específico con manejo de errores
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} messageData - Datos del mensaje
     * @param {Function} handler - Handler a ejecutar
     * @param {Number} startTime - Tiempo de inicio del procesamiento
     */
    async executeHandler(ws, messageData, handler, startTime) {
        try {
            const result = await handler(ws, messageData);

            // Log de performance para handlers lentos
            const processingTime = Date.now() - startTime;
            if (processingTime > 1000) { // > 1 segundo
                console.warn(`[MessageRouter] Handler lento para ${messageData.type}: ${processingTime}ms`);
            }

            return result;

        } catch (handlerError) {
            console.error(`[MessageRouter] Error en handler ${messageData.type}:`, handlerError);
            this.sendErrorResponse(ws, WEBSOCKET_CONFIG.ERROR_CODES.INTERNAL_ERROR,
                `Error procesando ${messageData.type}`);
        }
    }

    /**
     * Maneja mensajes inválidos
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} validation - Resultado de la validación
     */
    handleInvalidMessage(ws, validation) {
        this.messageStats.invalidMessages++;

        console.warn(`[MessageRouter] Mensaje inválido: ${validation.error}`);

        const errorCode = validation.errorCode || WEBSOCKET_CONFIG.ERROR_CODES.INVALID_JSON;
        this.sendErrorResponse(ws, errorCode, validation.error);
    }

    /**
     * Maneja tipos de mensaje desconocidos
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} messageData - Datos del mensaje
     */
    handleUnknownMessageType(ws, messageData) {
        console.warn(`[MessageRouter] Tipo de mensaje desconocido: ${messageData.type}`);

        this.sendErrorResponse(ws, WEBSOCKET_CONFIG.ERROR_CODES.INVALID_MESSAGE_TYPE,
            `Tipo de mensaje no soportado: ${messageData.type}`);
    }

    /**
     * Handler para mensajes ping
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} messageData - Datos del mensaje
     */
    async handlePing(ws, messageData) {
        console.log('[MessageRouter] Ping recibido');

        const pongResponse = ResponseBuilder.buildPingPongResponse('pong', {
            originalTimestamp: messageData.timestamp
        });

        this.sendResponse(ws, pongResponse);
    }

    /**
     * Handler para mensajes pong
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} messageData - Datos del mensaje
     */
    async handlePong(ws, messageData) {
        console.log('[MessageRouter] Pong recibido');

        // Actualizar actividad del cliente (ya se hace en el router principal)
        clientManager.updateClientActivity(ws);
    }

    /**
     * Envía una respuesta al cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} response - Respuesta a enviar
     */
    sendResponse(ws, response) {
        try {
            if (ws.readyState === 1) { // OPEN
                ws.send(JSON.stringify(response));
                return true;
            }
            return false;
        } catch (error) {
            console.error('[MessageRouter] Error enviando respuesta:', error);
            return false;
        }
    }

    /**
     * Envía una respuesta de error al cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Number} errorCode - Código de error
     * @param {String} details - Detalles del error
     */
    sendErrorResponse(ws, errorCode, details) {
        const errorResponse = ResponseBuilder.buildErrorResponse(errorCode, details);
        this.sendResponse(ws, errorResponse);
    }

    /**
     * Actualiza estadísticas por tipo de mensaje
     * @param {String} messageType - Tipo de mensaje
     */
    updateMessageTypeStats(messageType) {
        if (!this.messageStats.messagesByType[messageType]) {
            this.messageStats.messagesByType[messageType] = 0;
        }
        this.messageStats.messagesByType[messageType]++;
    }

    /**
     * Obtiene estadísticas del router
     * @returns {Object} Estadísticas actuales
     */
    getStats() {
        return {
            ...this.messageStats,
            registeredHandlers: Array.from(this.handlers.keys()),
            errorRate: this.messageStats.invalidMessages / (this.messageStats.totalMessages || 1)
        };
    }

    /**
     * Obtiene información de handlers registrados
     * @returns {Array} Lista de handlers registrados
     */
    getRegisteredHandlers() {
        return Array.from(this.handlers.keys());
    }

    /**
     * Verifica si existe un handler para un tipo de mensaje
     * @param {String} messageType - Tipo de mensaje
     * @returns {Boolean} True si existe el handler
     */
    hasHandler(messageType) {
        return this.handlers.has(messageType);
    }

    /**
     * Resetea las estadísticas del router
     */
    resetStats() {
        this.messageStats = {
            totalMessages: 0,
            validMessages: 0,
            invalidMessages: 0,
            messagesByType: {}
        };
        console.log('[MessageRouter] Estadísticas reseteadas');
    }

    /**
     * Configura el cliente MQTT para DeviceHandler
     * @param {Object} mqttClient - Cliente MQTT
    */
    setMqttClient(mqttClient) {
        this.deviceHandler.setMqttClient(mqttClient);
        console.log('[MessageRouter] MQTT client configurado para DeviceHandler');
    }
}

module.exports = MessageRouter;