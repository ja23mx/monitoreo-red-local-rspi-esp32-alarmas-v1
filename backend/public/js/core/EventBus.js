/**
 * EventBus - Sistema de Pub/Sub centralizado
 * 
 * Permite comunicación desacoplada entre módulos mediante eventos.
 * Patrón Observer implementado como Singleton.
 * 
 * @example
 * // Suscribirse a evento
 * EventBus.on('device:updated', (data) => console.log(data));
 * 
 * // Emitir evento
 * EventBus.emit('device:updated', { deviceId: 'ESP32_001' });
 * 
 * // Desuscribirse
 * EventBus.off('device:updated', handlerFunction);
 */

class EventBus {
    constructor() {
        /**
         * Almacena los listeners por tipo de evento
         * @type {Map<string, Set<Function>>}
         */
        this.events = new Map();

        /**
         * Modo debug: loguea todos los eventos emitidos
         * @type {boolean}
         */
        this.debugMode = false;
    }

    /**
     * Suscribirse a un evento
     * 
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar cuando se emita el evento
     * @throws {Error} Si eventName no es string o callback no es función
     * 
     * @example
     * EventBus.on('device:command', (data) => {
     *   console.log('Comando:', data.command);
     * });
     */
    on(eventName, callback) {
        // Validaciones
        if (typeof eventName !== 'string') {
            throw new Error('EventBus.on: eventName debe ser un string');
        }

        if (typeof callback !== 'function') {
            throw new Error('EventBus.on: callback debe ser una función');
        }

        // Crear Set de listeners si no existe
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        // Agregar callback al Set (evita duplicados automáticamente)
        this.events.get(eventName).add(callback);

        if (this.debugMode) {
            console.log(`[EventBus] Listener registrado: "${eventName}" (total: ${this.events.get(eventName).size})`);
        }
    }

    /**
     * Emitir un evento
     * 
     * @param {string} eventName - Nombre del evento a emitir
     * @param {*} data - Datos a pasar a los listeners (opcional)
     * @throws {Error} Si eventName no es string
     * 
     * @example
     * EventBus.emit('device:updated', { 
     *   deviceId: 'ESP32_001', 
     *   status: 'online' 
     * });
     */
    emit(eventName, data = null) {
        // Validación
        if (typeof eventName !== 'string') {
            throw new Error('EventBus.emit: eventName debe ser un string');
        }

        const listeners = this.events.get(eventName);

        // Si no hay listeners, no hacer nada
        if (!listeners || listeners.size === 0) {
            if (this.debugMode) {
                console.warn(`[EventBus] Evento "${eventName}" emitido sin listeners`);
            }
            return;
        }

        if (this.debugMode) {
            console.log(`[EventBus] Emitiendo "${eventName}":`, data);
        }

        // Ejecutar todos los callbacks
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error en listener de "${eventName}":`, error);
            }
        });
    }

    /**
     * Desuscribirse de un evento
     * 
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a remover
     * @throws {Error} Si eventName no es string o callback no es función
     * 
     * @example
     * const handler = (data) => console.log(data);
     * EventBus.on('test', handler);
     * EventBus.off('test', handler); // Remueve este handler específico
     */
    off(eventName, callback) {
        // Validaciones
        if (typeof eventName !== 'string') {
            throw new Error('EventBus.off: eventName debe ser un string');
        }

        if (typeof callback !== 'function') {
            throw new Error('EventBus.off: callback debe ser una función');
        }

        const listeners = this.events.get(eventName);

        if (!listeners) {
            if (this.debugMode) {
                console.warn(`[EventBus] Intento de remover listener de evento inexistente: "${eventName}"`);
            }
            return;
        }

        // Remover callback
        listeners.delete(callback);

        if (this.debugMode) {
            console.log(`[EventBus] Listener removido: "${eventName}" (restantes: ${listeners.size})`);
        }

        // Limpiar evento si no quedan listeners
        if (listeners.size === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Remover todos los listeners de un evento
     * 
     * @param {string} eventName - Nombre del evento
     * 
     * @example
     * EventBus.removeAllListeners('device:updated');
     */
    removeAllListeners(eventName) {
        if (typeof eventName !== 'string') {
            throw new Error('EventBus.removeAllListeners: eventName debe ser un string');
        }

        if (this.events.has(eventName)) {
            this.events.delete(eventName);

            if (this.debugMode) {
                console.log(`[EventBus] Todos los listeners removidos: "${eventName}"`);
            }
        }
    }

    /**
     * Limpiar TODOS los eventos (útil para testing)
     */
    clear() {
        this.events.clear();

        if (this.debugMode) {
            console.log('[EventBus] Todos los eventos limpiados');
        }
    }

    /**
     * Activar/desactivar modo debug
     * 
     * @param {boolean} enabled - true para activar debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[EventBus] Modo debug: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    /**
     * Obtener cantidad de listeners para un evento
     * 
     * @param {string} eventName - Nombre del evento
     * @returns {number} Cantidad de listeners
     */
    listenerCount(eventName) {
        const listeners = this.events.get(eventName);
        return listeners ? listeners.size : 0;
    }

    /**
     * Listar todos los eventos registrados
     * 
     * @returns {string[]} Array con nombres de eventos
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }
}

// Exportar como Singleton
export default new EventBus();