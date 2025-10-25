/**
 * StateManager - Gestor de estado global
 * 
 * Almacena el estado centralizado de la aplicación.
 * Emite eventos automáticos cuando el estado cambia.
 * Patrón Singleton.
 * 
 * @example
 * // Setear devices desde handshake
 * StateManager.setDevices(devicesArray);
 * 
 * // Actualizar device específico
 * StateManager.updateDevice('ESP32_001', { status: 'online' });
 * 
 * // Escuchar cambios
 * EventBus.on('state:devices:changed', (devices) => {
 *   console.log('Devices actualizados:', devices);
 * });
 */

import EventBus from './EventBus.js';

class StateManager {
    constructor() {
        /**
         * Estado global de la aplicación
         * @private
         */
        this.state = {
            devices: [],           // Array de dispositivos
            wsConnected: false,    // Estado WebSocket
            mqttConnected: false,  // Estado MQTT
            serverTime: null       // Timestamp servidor
        };
    }

    // ==========================================
    // DEVICES
    // ==========================================

    /**
     * Obtener todos los dispositivos
     * 
     * @returns {Array} Array de dispositivos
     */
    getDevices() {
        return this.state.devices;
    }

    /**
     * Setear array completo de dispositivos
     * (usado en handshake inicial)
     * 
     * @param {Array} devices - Array de dispositivos
     * @throws {Error} Si devices no es un array
     */
    setDevices(devices) {
        if (!Array.isArray(devices)) {
            throw new Error('StateManager.setDevices: devices debe ser un array');
        }

        this.state.devices = devices;

        // Emitir evento de cambio
        EventBus.emit('state:devices:changed', this.state.devices);
    }

    /**
     * Obtener un dispositivo por ID
     * 
     * @param {string} deviceId - ID del dispositivo
     * @returns {Object|null} Dispositivo encontrado o null
     */
    getDevice(deviceId) {
        if (typeof deviceId !== 'string') {
            throw new Error('StateManager.getDevice: deviceId debe ser un string');
        }

        return this.state.devices.find(d => d.id === deviceId) || null;
    }

    /**
     * Actualizar propiedades de un dispositivo específico
     * 
     * @param {string} deviceId - ID del dispositivo
     * @param {Object} updates - Objeto con propiedades a actualizar
     * @returns {boolean} true si se actualizó, false si no existe
     * 
     * @example
     * StateManager.updateDevice('ESP32_001', {
     *   status: 'online',
     *   lastSeen: new Date().toISOString()
     * });
     */
    updateDevice(deviceId, updates) {
        if (typeof deviceId !== 'string') {
            throw new Error('StateManager.updateDevice: deviceId debe ser un string');
        }

        if (typeof updates !== 'object' || updates === null) {
            throw new Error('StateManager.updateDevice: updates debe ser un objeto');
        }

        const device = this.getDevice(deviceId);

        if (!device) {
            console.warn(`StateManager.updateDevice: Device "${deviceId}" no encontrado`);
            return false;
        }

        // Actualizar propiedades
        Object.assign(device, updates);

        // Emitir evento de cambio
        EventBus.emit('state:devices:changed', this.state.devices);

        return true;
    }

    /**
     * Obtener cantidad de dispositivos online
     * 
     * @returns {number} Cantidad de devices con status 'online'
     */
    getOnlineCount() {
        return this.state.devices.filter(d => d.status === 'online').length;
    }

    /**
     * Obtener cantidad total de dispositivos
     * 
     * @returns {number} Total de devices
     */
    getTotalCount() {
        return this.state.devices.length;
    }

    // ==========================================
    // WEBSOCKET CONNECTION
    // ==========================================

    /**
     * Setear estado de conexión WebSocket
     * 
     * @param {boolean} connected - true si conectado
     */
    setWebSocketConnected(connected) {
        if (typeof connected !== 'boolean') {
            throw new Error('StateManager.setWebSocketConnected: connected debe ser boolean');
        }

        this.state.wsConnected = connected;

        // Emitir evento de cambio
        EventBus.emit('state:websocket:changed', connected);
    }

    /**
     * Verificar si WebSocket está conectado
     * 
     * @returns {boolean} true si conectado
     */
    isWebSocketConnected() {
        return this.state.wsConnected;
    }

    // ==========================================
    // MQTT CONNECTION
    // ==========================================

    /**
     * Setear estado de conexión MQTT
     * 
     * @param {boolean} connected - true si conectado
     */
    setMQTTConnected(connected) {
        if (typeof connected !== 'boolean') {
            throw new Error('StateManager.setMQTTConnected: connected debe ser boolean');
        }

        this.state.mqttConnected = connected;

        // Emitir evento de cambio
        EventBus.emit('state:mqtt:changed', connected);
    }

    /**
     * Verificar si MQTT está conectado
     * 
     * @returns {boolean} true si conectado
     */
    isMQTTConnected() {
        return this.state.mqttConnected;
    }

    // ==========================================
    // SERVER TIME
    // ==========================================

    /**
     * Setear timestamp del servidor
     * 
     * @param {string} timestamp - ISO8601 timestamp
     */
    setServerTime(timestamp) {
        if (typeof timestamp !== 'string') {
            throw new Error('StateManager.setServerTime: timestamp debe ser un string');
        }

        this.state.serverTime = timestamp;
    }

    /**
     * Obtener timestamp del servidor
     * 
     * @returns {string|null} Timestamp o null
     */
    getServerTime() {
        return this.state.serverTime;
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    /**
     * Resetear todo el estado (útil para testing)
     */
    reset() {
        this.state = {
            devices: [],
            wsConnected: false,
            mqttConnected: false,
            serverTime: null
        };

        console.log('[StateManager] Estado reseteado');
    }

    /**
     * Obtener snapshot completo del estado (para debugging)
     * 
     * @returns {Object} Copia del estado actual
     */
    getSnapshot() {
        return {
            devices: [...this.state.devices],
            wsConnected: this.state.wsConnected,
            mqttConnected: this.state.mqttConnected,
            serverTime: this.state.serverTime,
            onlineCount: this.getOnlineCount(),
            totalCount: this.getTotalCount()
        };
    }
}

// Exportar como Singleton
export default new StateManager();