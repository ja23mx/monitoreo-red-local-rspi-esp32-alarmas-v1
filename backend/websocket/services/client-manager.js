/**
 * Gestor de Clientes WebSocket
 * @brief Administra el registro, estado y comunicación con clientes conectados
 */

const WEBSOCKET_CONFIG = require('../config/websocket-config');

class ClientManager {
    constructor() {
        // Map de clientes conectados: clientId -> client data
        this.clients = new Map();
        
        // Map de WebSocket connections: ws -> clientId
        this.connections = new WeakMap();
        
        // Estadísticas
        this.stats = {
            totalConnections: 0,
            currentConnections: 0,
            totalDisconnections: 0
        };
    }

    /**
     * Registra un nuevo cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @param {Object} clientData - Datos del cliente
     * @returns {Boolean} True si se registró exitosamente
     */
    registerClient(ws, clientData) {
        try {
            // Verificar límite de conexiones
            if (this.clients.size >= WEBSOCKET_CONFIG.MAX_CLIENTS) {
                console.warn(`[ClientManager] Límite de conexiones alcanzado: ${WEBSOCKET_CONFIG.MAX_CLIENTS}`);
                return false;
            }

            // Generar ID único si no se proporciona
            const clientId = clientData.clientId || this.generateClientId();
            
            // Datos del cliente
            const client = {
                id: clientId,
                ws: ws,
                userAgent: clientData.userAgent || 'Unknown',
                connectedAt: new Date(),
                lastActivity: new Date(),
                state: WEBSOCKET_CONFIG.CONNECTION_STATES.CONNECTING,
                metadata: {
                    ip: this.getClientIP(ws),
                    version: clientData.version || '1.0'
                }
            };

            // Registrar cliente
            this.clients.set(clientId, client);
            this.connections.set(ws, clientId);

            // Actualizar estadísticas
            this.stats.totalConnections++;
            this.stats.currentConnections = this.clients.size;

            console.log(`[ClientManager] Cliente registrado: ${clientId} (Total: ${this.clients.size})`);
            return true;

        } catch (error) {
            console.error(`[ClientManager] Error registrando cliente:`, error);
            return false;
        }
    }

    /**
     * Desregistra un cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @returns {Boolean} True si se desregistró exitosamente
     */
    unregisterClient(ws) {
        try {
            const clientId = this.connections.get(ws);
            if (!clientId) {
                return false;
            }

            // Remover cliente
            this.clients.delete(clientId);
            this.connections.delete(ws);

            // Actualizar estadísticas
            this.stats.totalDisconnections++;
            this.stats.currentConnections = this.clients.size;

            console.log(`[ClientManager] Cliente desregistrado: ${clientId} (Total: ${this.clients.size})`);
            return true;

        } catch (error) {
            console.error(`[ClientManager] Error desregistrando cliente:`, error);
            return false;
        }
    }

    /**
     * Obtiene datos de un cliente por WebSocket
     * @param {WebSocket} ws - Conexión WebSocket
     * @returns {Object|null} Datos del cliente o null
     */
    getClientByWS(ws) {
        const clientId = this.connections.get(ws);
        return clientId ? this.clients.get(clientId) : null;
    }

    /**
     * Obtiene datos de un cliente por ID
     * @param {String} clientId - ID del cliente
     * @returns {Object|null} Datos del cliente o null
     */
    getClientById(clientId) {
        return this.clients.get(clientId) || null;
    }

    /**
     * Obtiene todos los clientes conectados
     * @returns {Array} Lista de clientes
     */
    getAllClients() {
        return Array.from(this.clients.values());
    }

    /**
     * Obtiene clientes por estado
     * @param {String} state - Estado del cliente
     * @returns {Array} Lista de clientes en el estado especificado
     */
    getClientsByState(state) {
        return this.getAllClients().filter(client => client.state === state);
    }

    /**
     * Actualiza el estado de un cliente
     * @param {String} clientId - ID del cliente
     * @param {String} newState - Nuevo estado
     * @returns {Boolean} True si se actualizó exitosamente
     */
    updateClientState(clientId, newState) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        client.state = newState;
        client.lastActivity = new Date();
        
        console.log(`[ClientManager] Estado actualizado para ${clientId}: ${newState}`);
        return true;
    }

    /**
     * Actualiza la última actividad de un cliente
     * @param {WebSocket} ws - Conexión WebSocket
     */
    updateClientActivity(ws) {
        const client = this.getClientByWS(ws);
        if (client) {
            client.lastActivity = new Date();
        }
    }

    /**
     * Envía mensaje a un cliente específico
     * @param {String} clientId - ID del cliente
     * @param {Object} message - Mensaje a enviar
     * @returns {Boolean} True si se envió exitosamente
     */
    sendToClient(clientId, message) {
        try {
            const client = this.clients.get(clientId);
            if (!client || client.ws.readyState !== 1) { // 1 = OPEN
                return false;
            }

            client.ws.send(JSON.stringify(message));
            this.updateClientActivity(client.ws);
            return true;

        } catch (error) {
            console.error(`[ClientManager] Error enviando mensaje a ${clientId}:`, error);
            return false;
        }
    }

    /**
     * Envía mensaje a todos los clientes conectados
     * @param {Object} message - Mensaje a enviar
     * @param {Function} filter - Función de filtro opcional
     * @returns {Number} Número de clientes que recibieron el mensaje
     */
    broadcastToAll(message, filter = null) {
        let sent = 0;
        
        for (const client of this.clients.values()) {
            if (filter && !filter(client)) continue;
            
            if (this.sendToClient(client.id, message)) {
                sent++;
            }
        }

        return sent;
    }

    /**
     * Limpia conexiones inactivas
     * @param {Number} timeoutMs - Timeout en milisegundos
     * @returns {Number} Número de conexiones limpiadas
     */
    cleanupInactiveClients(timeoutMs = WEBSOCKET_CONFIG.CONNECTION_TIMEOUT) {
        const now = new Date();
        let cleaned = 0;

        for (const [clientId, client] of this.clients.entries()) {
            const inactive = now - client.lastActivity > timeoutMs;
            const disconnected = client.ws.readyState !== 1;

            if (inactive || disconnected) {
                this.unregisterClient(client.ws);
                cleaned++;
                console.log(`[ClientManager] Cliente inactivo limpiado: ${clientId}`);
            }
        }

        return cleaned;
    }

    /**
     * Obtiene estadísticas del gestor de clientes
     * @returns {Object} Estadísticas actuales
     */
    getStats() {
        return {
            ...this.stats,
            currentConnections: this.clients.size,
            clientsByState: this.getClientStateStats()
        };
    }

    /**
     * Obtiene estadísticas por estado
     * @returns {Object} Conteo de clientes por estado
     */
    getClientStateStats() {
        const stats = {};
        for (const state of Object.values(WEBSOCKET_CONFIG.CONNECTION_STATES)) {
            stats[state] = 0;
        }

        for (const client of this.clients.values()) {
            stats[client.state] = (stats[client.state] || 0) + 1;
        }

        return stats;
    }

    /**
     * Genera un ID único para el cliente
     * @returns {String} ID único
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtiene la IP del cliente
     * @param {WebSocket} ws - Conexión WebSocket
     * @returns {String} IP del cliente
     */
    getClientIP(ws) {
        try {
            return ws._socket?.remoteAddress || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }
}

// Exportar instancia singleton
const clientManager = new ClientManager();
module.exports = clientManager;