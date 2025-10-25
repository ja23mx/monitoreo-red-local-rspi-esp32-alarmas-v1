/**
 * MessageRouter - Enrutador de mensajes WebSocket
 * 
 * Recibe mensajes de WebSocketService y los delega a handlers específicos.
 * Emite eventos en EventBus para que los handlers puedan procesarlos.
 * Patrón Singleton.
 * 
 * @example
 * import MessageRouter from './services/websocket/MessageRouter.js';
 * 
 * // WebSocketService llama:
 * MessageRouter.route(message);
 */

import EventBus from '../../core/EventBus.js';

class MessageRouter {
    constructor() {
        /**
         * Mapa de handlers por tipo de mensaje
         * @type {Map<string, Function>}
         */
        this.handlers = new Map();

        // Registrar handlers por defecto (emiten eventos en EventBus)
        this.registerDefaultHandlers();
    }

    /**
     * Registrar handlers por defecto
     * (Emiten eventos en EventBus para que otros módulos escuchen)
     * @private
     */
    registerDefaultHandlers() {
        // Handshake response
        this.register('handshake_response', (message) => {
            console.log('[MessageRouter] 🤝 Handshake response recibido');
            EventBus.emit('message:handshake_response', message);
        });

        // Device update
        this.register('device_update', (message) => {
            console.log('[MessageRouter] 📡 Device update recibido:', message.deviceId);
            EventBus.emit('message:device_update', message);
        });

        // Device alarm
        this.register('device_alarm', (message) => {
            console.log('[MessageRouter] 🚨 Device alarm recibido:', message.deviceId);
            EventBus.emit('message:device_alarm', message);
        });

        // Pong response
        this.register('pong', (message) => {
            console.log('[MessageRouter] 🏓 Pong recibido');
            EventBus.emit('message:pong', message);
        });

        // Error
        this.register('error', (message) => {
            console.error('[MessageRouter] ❌ Error recibido:', message.message);
            EventBus.emit('message:error', message);
        });

        // Command response
        this.register('command_response', (message) => {
            console.log('[MessageRouter] ✅ Command response:', message.command);
            EventBus.emit('message:command_response', message);
        });
    }

    /**
     * Registrar handler para tipo de mensaje
     * 
     * @param {string} messageType - Tipo de mensaje
     * @param {Function} handler - Función manejadora
     * 
     * @example
     * MessageRouter.register('custom_type', (message) => {
     *   console.log('Custom message:', message);
     * });
     */
    register(messageType, handler) {
        if (!messageType || typeof messageType !== 'string') {
            console.warn('MessageRouter.register: messageType debe ser un string');
            return;
        }

        if (typeof handler !== 'function') {
            console.warn('MessageRouter.register: handler debe ser una función');
            return;
        }

        this.handlers.set(messageType, handler);
    }

    /**
     * Desregistrar handler
     * 
     * @param {string} messageType - Tipo de mensaje
     */
    unregister(messageType) {
        this.handlers.delete(messageType);
    }

    /**
     * Enrutar mensaje al handler correspondiente
     * 
     * @param {Object} message - Mensaje recibido del WebSocket
     * 
     * @example
     * MessageRouter.route({
     *   type: 'device_update',
     *   deviceId: 'ESP32_001',
     *   status: 'online'
     * });
     */
    route(message) {
        // Validar mensaje
        if (!message || typeof message !== 'object') {
            console.warn('[MessageRouter] Mensaje inválido (no es objeto):', message);
            return;
        }

        if (!message.type) {
            console.warn('[MessageRouter] Mensaje sin tipo:', message);
            return;
        }

        const messageType = message.type;
        const handler = this.handlers.get(messageType);

        if (handler) {
            try {
                handler(message);
            } catch (error) {
                console.error(`[MessageRouter] Error en handler de "${messageType}":`, error);
            }
        } else {
            console.warn(`[MessageRouter] No hay handler para tipo "${messageType}"`);
            console.log('[MessageRouter] Mensaje:', message);
        }
    }

    /**
     * Obtener lista de tipos registrados
     * 
     * @returns {string[]} Array con tipos de mensaje registrados
     */
    getRegisteredTypes() {
        return Array.from(this.handlers.keys());
    }

    /**
     * Verificar si un tipo está registrado
     * 
     * @param {string} messageType - Tipo de mensaje
     * @returns {boolean} true si está registrado
     */
    isRegistered(messageType) {
        return this.handlers.has(messageType);
    }
}

// Exportar como Singleton
export default new MessageRouter();