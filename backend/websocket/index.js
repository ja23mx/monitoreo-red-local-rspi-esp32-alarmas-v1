/**
 * WebSocket Manager - Orquestador Principal
 * @brief Inicializa y gestiona el servidor WebSocket con arquitectura modular
 */

const { WebSocketServer } = require('ws');
const WEBSOCKET_CONFIG = require('./config/websocket-config');
const clientManager = require('./services/client-manager');
const MessageRouter = require('./services/message-router');
const ConnectionHandler = require('./handlers/connection-handler');
const NotificationBroadcaster = require('./services/notification-broadcaster');

class WebSocketManager {
    constructor() {
        this.wss = null;
        this.messageRouter = null;
        this.connectionHandler = null;
        this.notificationBroadcaster = null;
        this.isInitialized = false;
        this.heartbeatInterval = null;
    }

    /**
     * Inicializa el servidor WebSocket
     * @param {http.Server} server - Servidor HTTP
     * @returns {WebSocketServer} Instancia del servidor WebSocket
    */
    initializeWebSocket(server) {
        try {
            console.log('[WebSocket] Inicializando servidor WebSocket...');

            // Crear servidor WebSocket
            this.wss = new WebSocketServer({
                server,
                maxPayload: WEBSOCKET_CONFIG.MAX_MESSAGE_SIZE
            });

            // Inicializar componentes
            this.connectionHandler = new ConnectionHandler(clientManager);
            this.messageRouter = new MessageRouter();
            this.notificationBroadcaster = new NotificationBroadcaster();

            // Configurar eventos del servidor
            this.setupServerEvents();

            // Iniciar heartbeat
            this.startHeartbeat();

            this.isInitialized = true;
            console.log('[WebSocket] ✅ Servidor WebSocket inicializado correctamente');

            return this.wss;

        } catch (error) {
            console.error('[WebSocket] ❌ Error inicializando WebSocket:', error);
            throw error;
        }
    }

    /**
     * Configura los eventos principales del servidor WebSocket
    */
    setupServerEvents() {
        this.wss.on('connection', (ws, request) => {
            this.handleNewConnection(ws, request);
        });

        this.wss.on('error', (error) => {
            console.error('[WebSocket] Error del servidor:', error);
        });

        this.wss.on('close', () => {
            console.log('[WebSocket] Servidor WebSocket cerrado');
            this.cleanup();
        });
    }

    /**
     * Maneja nuevas conexiones WebSocket
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {http.IncomingMessage} request - Request HTTP
    */
    handleNewConnection(ws, request) {
        try {
            console.log(`[WebSocket] Nueva conexión desde ${request.socket.remoteAddress}`);

            // Verificar límite de conexiones
            if (clientManager.getStats().currentConnections >= WEBSOCKET_CONFIG.MAX_CLIENTS) {
                console.warn('[WebSocket] Límite de conexiones alcanzado, rechazando conexión');
                ws.close(1013, 'Servidor sobrecargado');
                return;
            }

            // Registrar cliente inicial (se completará en handshake)
            const registered = clientManager.registerClient(ws, {
                userAgent: request.headers['user-agent'],
                ip: request.socket.remoteAddress
            });

            if (!registered) {
                ws.close(1011, 'Error de registro');
                return;
            }

            // Configurar eventos de la conexión
            this.setupConnectionEvents(ws);

        } catch (error) {
            console.error('[WebSocket] Error en nueva conexión:', error);
            ws.close(1011, 'Error interno');
        }
    }

    /**
     * Configura eventos específicos de cada conexión
     * @param {WebSocket} ws - Conexión WebSocket
    */
    setupConnectionEvents(ws) {
        // Mensaje recibido
        ws.on('message', (message) => {
            this.handleMessage(ws, message);
        });

        // Conexión cerrada
        ws.on('close', (code, reason) => {
            this.connectionHandler.handleDisconnection(ws, code, reason);
        });

        // Error de conexión
        ws.on('error', (error) => {
            this.connectionHandler.handleConnectionError(ws, error);
        });

        // Pong recibido (respuesta a ping)
        ws.on('pong', () => {
            clientManager.updateClientActivity(ws);
        });
    }

    /**
     * Maneja mensajes entrantes
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Buffer} message - Mensaje recibido
    */
    async handleMessage(ws, message) {
        try {
            // Actualizar actividad del cliente
            clientManager.updateClientActivity(ws);

            // Procesar mensaje a través del router
            await this.messageRouter.routeMessage(ws, message);

        } catch (error) {
            console.error('[WebSocket] Error procesando mensaje:', error);

            // Enviar error al cliente si es posible
            const client = clientManager.getClientByWS(ws);
            if (client && ws.readyState === 1) {
                const ResponseBuilder = require('./utils/response-builder');
                const errorResponse = ResponseBuilder.buildErrorResponse(
                    WEBSOCKET_CONFIG.ERROR_CODES.INTERNAL_ERROR,
                    'Error procesando mensaje'
                );
                ws.send(JSON.stringify(errorResponse));
            }
        }
    }

    /**
     * Inicia el sistema de heartbeat
    */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.performHeartbeat();
        }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);

        console.log(`[WebSocket] Heartbeat iniciado (${WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL}ms)`);
    }

    /**
     * Ejecuta el heartbeat: envía ping y limpia conexiones inactivas
    */
    performHeartbeat() {
        try {
            // Limpiar conexiones inactivas
            const cleaned = clientManager.cleanupInactiveClients();
            if (cleaned > 0) {
                console.log(`[WebSocket] Limpiadas ${cleaned} conexiones inactivas`);
            }

            // Enviar ping a clientes activos
            const activeClients = clientManager.getClientsByState(WEBSOCKET_CONFIG.CONNECTION_STATES.READY);
            let pingSent = 0;

            for (const client of activeClients) {
                if (client.ws.readyState === 1) { // OPEN
                    client.ws.ping();
                    pingSent++;
                }
            }

            /* if (pingSent > 0) {
                console.log(`[WebSocket] Ping enviado a ${pingSent} clientes`);
            } */

        } catch (error) {
            console.error('[WebSocket] Error en heartbeat:', error);
        }
    }

    /**
     * Obtiene estadísticas del WebSocket
     * @returns {Object} Estadísticas actuales
    */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            serverReady: this.wss ? this.wss.readyState === 1 : false,
            clients: clientManager.getStats(),
            uptime: process.uptime()
        };
    }

    /**
     * Envía notificación a todos los clientes
     * @param {Object} notification - Notificación a enviar
     * @param {Function} filter - Filtro opcional para clientes
     * @returns {Number} Número de clientes notificados
    */
    broadcastNotification(notification, filter = null) {
        if (!this.isInitialized) {
            console.warn('[WebSocket] Intento de broadcast sin inicializar');
            return 0;
        }

        return clientManager.broadcastToAll(notification, filter);
    }

    /**
     * Recibe eventos del módulo MQTT y los broadcast a clientes WebSocket
     * @param {String} topic - Topic MQTT 
     * @param {Object} message - Mensaje MQTT parseado  
     * @param {String} deviceMac - MAC del dispositivo
     */
    broadcastMqttEvent(topic, message, deviceMac) {
        if (!this.isInitialized || !this.notificationBroadcaster) {
            console.warn('[WebSocket] Intento de broadcast MQTT sin inicializar');
            return;
        }

        this.notificationBroadcaster.processMqttEvent(topic, message, deviceMac);
    }

    /**
     * Configura el cliente MQTT para DeviceHandler
     * @param {Object} mqttClient - Cliente MQTT
     */
    setMqttClient(mqttClient) {
        if (this.messageRouter) {
            this.messageRouter.setMqttClient(mqttClient);
            console.log('[WebSocket] Cliente MQTT configurado');
        }
    }

    /**
     * Limpieza de recursos
    */
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        console.log('[WebSocket] Recursos limpiados');
    }

    /**
     * Cierra el servidor WebSocket
    */
    close() {
        if (this.wss) {
            this.wss.close();
            this.cleanup();
            this.isInitialized = false;
            console.log('[WebSocket] Servidor cerrado');
        }
    }
}

// Crear instancia singleton
const webSocketManager = new WebSocketManager();

// Función de compatibilidad con el código existente
function initializeWebSocket(server) {
    return webSocketManager.initializeWebSocket(server);
}

module.exports = {
    initializeWebSocket,
    webSocketManager
};