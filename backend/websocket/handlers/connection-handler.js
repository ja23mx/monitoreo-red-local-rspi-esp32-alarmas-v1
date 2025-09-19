/**
 * Gestor de Conexiones WebSocket
 * @brief Maneja eventos de conexión, desconexión y errores de conexión
 */

const WEBSOCKET_CONFIG = require('../config/websocket-config');
const ResponseBuilder = require('../utils/response-builder');

class ConnectionHandler {
    constructor(clientManager) {
        this.clientManager = clientManager;
        this.connectionStats = {
            totalConnections: 0,
            totalDisconnections: 0,
            totalErrors: 0
        };
    }

    /**
     * Maneja el establecimiento inicial de una conexión
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} connectionData - Datos de la conexión
     */
    handleConnection(ws, connectionData = {}) {
        try {
            const client = this.clientManager.getClientByWS(ws);
            if (!client) {
                console.error('[ConnectionHandler] Cliente no encontrado para nueva conexión');
                ws.close(1011, 'Error de registro');
                return;
            }

            // Actualizar estado del cliente
            this.clientManager.updateClientState(client.id, WEBSOCKET_CONFIG.CONNECTION_STATES.CONNECTING);

            // Actualizar estadísticas
            this.connectionStats.totalConnections++;

            console.log(`[ConnectionHandler] Conexión establecida para cliente: ${client.id}`);

            // Enviar mensaje de bienvenida si está configurado
            this.sendWelcomeMessage(ws, client);

        } catch (error) {
            console.error('[ConnectionHandler] Error manejando conexión:', error);
            ws.close(1011, 'Error interno');
        }
    }

    /**
     * Maneja la desconexión de un cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Number} code - Código de cierre
     * @param {String} reason - Razón del cierre
     */
    handleDisconnection(ws, code, reason) {
        try {
            const client = this.clientManager.getClientByWS(ws);
            if (!client) {
                console.warn('[ConnectionHandler] Intento de desconectar cliente no registrado');
                return;
            }

            const clientId = client.id;
            const wasAuthenticated = client.state === WEBSOCKET_CONFIG.CONNECTION_STATES.READY;

            // Desregistrar cliente
            const unregistered = this.clientManager.unregisterClient(ws);
            
            if (unregistered) {
                this.connectionStats.totalDisconnections++;
                
                console.log(`[ConnectionHandler] Cliente desconectado: ${clientId} (Código: ${code}, Razón: ${reason || 'N/A'})`);
                
                // Log adicional para clientes autenticados
                if (wasAuthenticated) {
                    console.log(`[ConnectionHandler] Cliente autenticado desconectado: ${clientId}`);
                }
            }

            // Limpiar recursos específicos del cliente si es necesario
            this.cleanupClientResources(clientId);

        } catch (error) {
            console.error('[ConnectionHandler] Error manejando desconexión:', error);
        }
    }

    /**
     * Maneja errores de conexión
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Error} error - Error ocurrido
     */
    handleConnectionError(ws, error) {
        try {
            const client = this.clientManager.getClientByWS(ws);
            const clientId = client ? client.id : 'unknown';

            this.connectionStats.totalErrors++;

            console.error(`[ConnectionHandler] Error de conexión para cliente ${clientId}:`, error.message);

            // Actualizar estado del cliente si existe
            if (client) {
                this.clientManager.updateClientState(client.id, WEBSOCKET_CONFIG.CONNECTION_STATES.ERROR);
            }

            // Intentar cerrar la conexión de forma limpia
            if (ws.readyState === 1) { // OPEN
                const errorResponse = ResponseBuilder.buildErrorResponse(
                    WEBSOCKET_CONFIG.ERROR_CODES.INTERNAL_ERROR,
                    'Error de conexión'
                );
                
                try {
                    ws.send(JSON.stringify(errorResponse));
                } catch (sendError) {
                    console.error('[ConnectionHandler] Error enviando mensaje de error:', sendError.message);
                }
                
                ws.close(1011, 'Error interno');
            }

        } catch (handlerError) {
            console.error('[ConnectionHandler] Error en handleConnectionError:', handlerError);
        }
    }

    /**
     * Maneja la autenticación exitosa de un cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} authData - Datos de autenticación
     */
    handleAuthentication(ws, authData) {
        try {
            const client = this.clientManager.getClientByWS(ws);
            if (!client) {
                console.error('[ConnectionHandler] Intento de autenticar cliente no registrado');
                return false;
            }

            // Actualizar datos del cliente con información de autenticación
            client.userAgent = authData.userAgent || client.userAgent;
            client.metadata = {
                ...client.metadata,
                version: authData.version || '1.0',
                authenticated: true,
                authTime: new Date()
            };

            // Cambiar estado a autenticado
            this.clientManager.updateClientState(client.id, WEBSOCKET_CONFIG.CONNECTION_STATES.READY);

            console.log(`[ConnectionHandler] Cliente autenticado exitosamente: ${client.id}`);
            
            return true;

        } catch (error) {
            console.error('[ConnectionHandler] Error en autenticación:', error);
            return false;
        }
    }

    /**
     * Envía mensaje de bienvenida al cliente recién conectado
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} client - Datos del cliente
     */
    sendWelcomeMessage(ws, client) {
        try {
            // Solo enviar si la conexión está abierta
            if (ws.readyState !== 1) return;

            const welcomeMessage = {
                type: 'welcome',
                timestamp: new Date().toISOString(),
                data: {
                    clientId: client.id,
                    serverTime: new Date().toISOString(),
                    message: 'Conexión establecida. Envíe handshake para completar la inicialización.'
                }
            };

            ws.send(JSON.stringify(welcomeMessage));

        } catch (error) {
            console.error('[ConnectionHandler] Error enviando mensaje de bienvenida:', error);
        }
    }

    /**
     * Limpia recursos específicos de un cliente
     * @param {String} clientId - ID del cliente
     */
    cleanupClientResources(clientId) {
        try {
            // Aquí se pueden limpiar recursos específicos del cliente
            // Por ejemplo: timers, subscripciones, archivos temporales, etc.
            
            console.log(`[ConnectionHandler] Recursos limpiados para cliente: ${clientId}`);

        } catch (error) {
            console.error(`[ConnectionHandler] Error limpiando recursos para ${clientId}:`, error);
        }
    }

    /**
     * Obtiene estadísticas del manejador de conexiones
     * @returns {Object} Estadísticas actuales
     */
    getStats() {
        return {
            ...this.connectionStats,
            currentConnections: this.clientManager.getStats().currentConnections,
            clientStates: this.clientManager.getClientStateStats()
        };
    }

    /**
     * Verifica y reporta el estado de las conexiones
     */
    healthCheck() {
        try {
            const stats = this.clientManager.getStats();
            const readyClients = this.clientManager.getClientsByState(WEBSOCKET_CONFIG.CONNECTION_STATES.READY);
            
            console.log(`[ConnectionHandler] Health Check - Conexiones activas: ${stats.currentConnections}, Listas: ${readyClients.length}`);
            
            return {
                healthy: true,
                activeConnections: stats.currentConnections,
                readyClients: readyClients.length,
                errorRate: this.connectionStats.totalErrors / (this.connectionStats.totalConnections || 1)
            };

        } catch (error) {
            console.error('[ConnectionHandler] Error en health check:', error);
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * Fuerza la desconexión de un cliente específico
     * @param {String} clientId - ID del cliente
     * @param {String} reason - Razón de la desconexión
     * @returns {Boolean} True si se desconectó exitosamente
     */
    forceDisconnect(clientId, reason = 'Desconexión forzada') {
        try {
            const client = this.clientManager.getClientById(clientId);
            if (!client) {
                console.warn(`[ConnectionHandler] Intento de desconectar cliente inexistente: ${clientId}`);
                return false;
            }

            if (client.ws.readyState === 1) { // OPEN
                client.ws.close(1000, reason);
                console.log(`[ConnectionHandler] Cliente desconectado forzadamente: ${clientId} - ${reason}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error(`[ConnectionHandler] Error forzando desconexión de ${clientId}:`, error);
            return false;
        }
    }
}

module.exports = ConnectionHandler;