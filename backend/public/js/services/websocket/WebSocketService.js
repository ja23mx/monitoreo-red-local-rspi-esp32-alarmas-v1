/**
 * WebSocketService - Cliente WebSocket
 * 
 * Gestiona la conexión WebSocket con el servidor.
 * Delega mensajes a MessageRouter y manejo de conexión a ConnectionManager.
 * Patrón Singleton.
 * 
 * @example
 * import WebSocketService from './services/websocket/WebSocketService.js';
 * 
 * // Conectar
 * await WebSocketService.connect();
 * 
 * // Enviar mensaje
 * WebSocketService.send({ type: 'ping' });
 * 
 * // Verificar estado
 * const connected = WebSocketService.isConnected();
 */

import EventBus from '../../core/EventBus.js';
import StateManager from '../../core/StateManager.js';
import config from '../../config/app-config.js';

class WebSocketService {
    constructor() {
        /**
         * Instancia de WebSocket
         * @type {WebSocket|null}
         */
        this.ws = null;

        /**
         * Estado de conexión
         * @type {boolean}
         */
        this.connected = false;

        /**
         * URL del servidor WebSocket
         * @type {string}
         */
        this.url = config.websocket.url;

        /**
         * MessageRouter (se inyectará después)
         * @type {Object|null}
         */
        this.messageRouter = null;

        /**
         * ConnectionManager (se inyectará después)
         * @type {Object|null}
         */
        this.connectionManager = null;
    }

    /**
     * Inyectar MessageRouter
     * (Se hace después para evitar dependencia circular)
     * 
     * @param {Object} router - Instancia de MessageRouter
     */
    setMessageRouter(router) {
        this.messageRouter = router;
    }

    /**
     * Inyectar ConnectionManager
     * (Se hace después para evitar dependencia circular)
     * 
     * @param {Object} manager - Instancia de ConnectionManager
     */
    setConnectionManager(manager) {
        this.connectionManager = manager;
    }

    /**
     * Conectar al servidor WebSocket
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * await WebSocketService.connect();
     */
    async connect() {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.warn('[WebSocketService] Ya existe una conexión activa');
            return;
        }

        try {
            console.log(`[WebSocketService] Conectando a ${this.url}...`);

            // Crear instancia WebSocket
            this.ws = new WebSocket(this.url);

            // Configurar event listeners
            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onerror = this.handleError.bind(this);
            this.ws.onclose = this.handleClose.bind(this);

        } catch (error) {
            console.error('[WebSocketService] Error al crear WebSocket:', error);
            this.handleError({ error });
        }
    }

    /**
     * Manejar evento onopen (conexión establecida)
     * @private
     */
    handleOpen(event) {
        console.log('[WebSocketService] ✅ Conectado al servidor');

        this.connected = true;

        // Actualizar StateManager
        StateManager.setWebSocketConnected(true);

        // Emitir evento
        EventBus.emit('websocket:connected');

        // Delegar a ConnectionManager si existe
        if (this.connectionManager) {
            this.connectionManager.handleOpen(event);
        }
    }

    /**
     * Manejar evento onmessage (mensaje recibido)
     * @private
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);

            if (config.debug.showWebSocketMessages) {
                console.log('[WebSocketService] ⬇️ Mensaje recibido:', message);
            }

            // Delegar a MessageRouter
            if (this.messageRouter) {
                this.messageRouter.route(message);
            } else {
                console.warn('[WebSocketService] MessageRouter no configurado, mensaje ignorado:', message);
            }

        } catch (error) {
            console.error('[WebSocketService] Error al parsear mensaje:', error);
            console.error('[WebSocketService] Mensaje raw:', event.data);
        }
    }

    /**
     * Manejar evento onerror (error de WebSocket)
     * @private
     */
    handleError(event) {
        console.error('[WebSocketService] ❌ Error de WebSocket:', event);

        // Emitir evento
        EventBus.emit('websocket:error', event);
    }

    /**
     * Manejar evento onclose (conexión cerrada)
     * @private
     */
    handleClose(event) {
        console.log(`[WebSocketService] ⚠️ Conexión cerrada (code: ${event.code}, reason: ${event.reason || 'N/A'})`);

        this.connected = false;

        // Actualizar StateManager
        StateManager.setWebSocketConnected(false);

        // Emitir evento
        EventBus.emit('websocket:disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });

        // Delegar a ConnectionManager para reconexión
        if (this.connectionManager) {
            this.connectionManager.handleClose(event);
        }
    }

    /**
     * Enviar mensaje al servidor
     * 
     * @param {Object} message - Mensaje a enviar
     * @returns {boolean} true si se envió, false si no está conectado
     * 
     * @example
     * WebSocketService.send({
     *   type: 'device_command',
     *   deviceId: 'ESP32_001',
     *   command: 'ping'
     * });
     */
    send(message) {
        if (!this.isConnected()) {
            console.warn('[WebSocketService] No se puede enviar mensaje: WebSocket desconectado');
            return false;
        }

        try {
            const messageStr = JSON.stringify(message);

            if (config.debug.showWebSocketMessages) {
                console.log('[WebSocketService] ⬆️ Enviando mensaje:', message);
            }

            this.ws.send(messageStr);
            return true;

        } catch (error) {
            console.error('[WebSocketService] Error al enviar mensaje:', error);
            return false;
        }
    }

    /**
     * Verificar si WebSocket está conectado
     * 
     * @returns {boolean} true si conectado
     */
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Desconectar WebSocket manualmente
     * 
     * @param {number} code - Código de cierre (opcional, default: 1000)
     * @param {string} reason - Razón de cierre (opcional)
     * 
     * @example
     * WebSocketService.disconnect(1000, 'Usuario cerró aplicación');
     */
    disconnect(code = 1000, reason = 'Cliente desconectado') {
        if (this.ws) {
            console.log('[WebSocketService] Desconectando...');

            // Prevenir reconexión automática
            if (this.connectionManager) {
                this.connectionManager.stopReconnecting();
            }

            this.ws.close(code, reason);
            this.ws = null;
            this.connected = false;

            // Actualizar StateManager
            StateManager.setWebSocketConnected(false);
        }
    }

    /**
     * Obtener estado de readyState del WebSocket
     * 
     * @returns {number|null} ReadyState o null si no existe
     * 
     * Estados posibles:
     * - 0: CONNECTING
     * - 1: OPEN
     * - 2: CLOSING
     * - 3: CLOSED
     */
    getReadyState() {
        return this.ws ? this.ws.readyState : null;
    }

    /**
     * Obtener estado de readyState como string
     * 
     * @returns {string} Estado legible
     */
    getReadyStateString() {
        if (!this.ws) return 'NO_SOCKET';

        const states = {
            0: 'CONNECTING',
            1: 'OPEN',
            2: 'CLOSING',
            3: 'CLOSED'
        };

        return states[this.ws.readyState] || 'UNKNOWN';
    }
}

// Inyectar MessageRouter
import MessageRouter from './MessageRouter.js';
// Importar ConnectionManager
import ConnectionManager from './ConnectionManager.js'; 

const instance = new WebSocketService();
instance.setMessageRouter(MessageRouter);          // inyección unidireccional
instance.setConnectionManager(ConnectionManager);  // inyección unidireccional
ConnectionManager.setWebSocketService(instance);   // inyección unidireccional

export default instance;
