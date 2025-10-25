/**
 * ConnectionManager - Gestión de conexión WebSocket
 * 
 * Maneja ciclo de vida de la conexión:
 * - Handshake automático al conectar
 * - Keep-alive (ping/pong cada 30s)
 * - Reconexión automática con backoff exponencial
 * 
 * Patrón Singleton.
 * 
 * @example
 * import ConnectionManager from './services/websocket/ConnectionManager.js';
 * 
 * // WebSocketService lo usa internamente
 * ConnectionManager.handleOpen(event);
 */

import EventBus from '../../core/EventBus.js';
import StateManager from '../../core/StateManager.js';
import config from '../../config/app-config.js';

class ConnectionManager {
    constructor() {
        /**
         * WebSocketService (se inyectará después)
         * @type {Object|null}
         */
        this.webSocketService = null;

        /**
         * Timer de ping/pong
         * @type {number|null}
         */
        this.pingInterval = null;

        /**
         * Timer de reconexión
         * @type {number|null}
         */
        this.reconnectTimeout = null;

        /**
         * Contador de intentos de reconexión
         * @type {number}
         */
        this.reconnectAttempts = 0;

        /**
         * Máximo de intentos de reconexión
         * @type {number}
         */
        this.maxReconnectAttempts = config.websocket.maxReconnectAttempts;

        /**
         * Flag para evitar reconexión manual
         * @type {boolean}
         */
        this.shouldReconnect = true;
    }

    /**
     * Inyectar WebSocketService
     * (Se hace después para evitar dependencia circular)
     * 
     * @param {Object} service - Instancia de WebSocketService
     */
    setWebSocketService(service) {
        this.webSocketService = service;
    }

    /**
     * Manejar conexión establecida
     * 
     * @param {Event} event - Evento onopen del WebSocket
     */
    handleOpen(event) {
        console.log('[ConnectionManager] ✅ Conexión establecida');

        // Resetear contador de reconexión
        this.reconnectAttempts = 0;

        // Enviar handshake automático
        this.sendHandshake();

        // Iniciar keep-alive (ping/pong)
        this.startPingInterval();
    }

    /**
     * Manejar desconexión
     * 
     * @param {CloseEvent} event - Evento onclose del WebSocket
     */
    handleClose(event) {
        console.log('[ConnectionManager] ⚠️ Conexión cerrada');

        // Detener ping/pong
        this.stopPingInterval();

        // Intentar reconectar (si no fue cierre manual)
        if (this.shouldReconnect && event.code !== 1000) {
            this.scheduleReconnect();
        } else {
            console.log('[ConnectionManager] No se intentará reconectar (cierre manual)');
        }
    }

    /**
     * Enviar handshake al servidor
     * @private
     */
    sendHandshake() {
        if (!this.webSocketService) {
            console.error('[ConnectionManager] WebSocketService no configurado');
            return;
        }

        const handshake = {
            type: 'handshake',
            clientId: `web-client-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            "data": {
                "version": "1.0"
            }
        };

        const sent = this.webSocketService.send(handshake);

        if (sent) {
            console.log('[ConnectionManager] 🤝 Handshake enviado');
        } else {
            console.error('[ConnectionManager] No se pudo enviar handshake');
        }
    }

    /**
     * Iniciar intervalo de ping/pong
     * @private
     */
    startPingInterval() {
        // Limpiar intervalo existente
        this.stopPingInterval();

        const pingInterval = config.websocket.pingInterval || 30000; // 30 segundos

        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, pingInterval);

        console.log(`[ConnectionManager] 🏓 Keep-alive iniciado (cada ${pingInterval / 1000}s)`);
    }

    /**
     * Detener intervalo de ping/pong
     * @private
     */
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
            console.log('[ConnectionManager] 🏓 Keep-alive detenido');
        }
    }

    /**
     * Enviar ping al servidor
     * @private
     */
    sendPing() {
        if (!this.webSocketService) {
            return;
        }

        const ping = {
            type: 'ping',
            timestamp: new Date().toISOString()
        };

        const sent = this.webSocketService.send(ping);

        if (sent) {
            console.log('[ConnectionManager] 🏓 Ping enviado');
        }
    }

    /**
     * Programar reconexión con backoff exponencial
     * @private
     */
    scheduleReconnect() {
        // Verificar si se alcanzó el máximo de intentos
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`[ConnectionManager] ❌ Máximo de intentos alcanzado (${this.maxReconnectAttempts})`);
            EventBus.emit('connection:failed', {
                attempts: this.reconnectAttempts
            });
            return;
        }

        this.reconnectAttempts++;

        // Calcular delay con backoff exponencial
        const baseDelay = config.websocket.reconnectDelaysMin; // 1 segundo
        const maxDelay = config.websocket.reconnectDelaysMax; // 30 segundos
        const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay);

        console.log(`[ConnectionManager] 🔄 Reconectando en ${delay / 1000}s (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        // Emitir evento de reconexión
        EventBus.emit('connection:reconnecting', {
            attempt: this.reconnectAttempts,
            delay: delay,
            maxAttempts: this.maxReconnectAttempts
        });

        // Programar reconexión
        this.reconnectTimeout = setTimeout(() => {
            this.reconnect();
        }, delay);
    }

    /**
     * Ejecutar reconexión
     * @private
     */
    async reconnect() {
        if (!this.webSocketService) {
            console.error('[ConnectionManager] WebSocketService no configurado');
            return;
        }

        console.log('[ConnectionManager] 🔄 Intentando reconectar...');

        try {
            await this.webSocketService.connect();
        } catch (error) {
            console.error('[ConnectionManager] Error en reconexión:', error);
            // handleClose se encargará de programar siguiente intento
        }
    }

    /**
     * Detener reconexión automática
     * (Se usa cuando usuario desconecta manualmente)
     */
    stopReconnecting() {
        this.shouldReconnect = false;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        console.log('[ConnectionManager] 🛑 Reconexión automática deshabilitada');
    }

    /**
     * Habilitar reconexión automática
     */
    enableReconnect() {
        this.shouldReconnect = true;
        console.log('[ConnectionManager] ✅ Reconexión automática habilitada');
    }

    /**
     * Resetear estado de reconexión
     */
    reset() {
        this.stopPingInterval();
        this.stopReconnecting();
        this.reconnectAttempts = 0;
        this.shouldReconnect = true;
    }

    /**
     * Obtener estado de reconexión
     * 
     * @returns {Object} Estado actual
     */
    getReconnectStatus() {
        return {
            attempts: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            isReconnecting: this.reconnectTimeout !== null,
            shouldReconnect: this.shouldReconnect
        };
    }
}

// Exportar como Singleton
export default new ConnectionManager();