/**
 * DeviceUpdateHandler - Procesa actualizaciones de devices
 * 
 * Actualiza estado de devices individuales (heartbeat, status changes).
 * Se ejecuta frecuentemente (cada 30s por device).
 * NO muestra notificaciones (sería spam).
 * 
 * @example
 * // Se auto-inicializa al importarse
 * import './services/websocket/handlers/DeviceUpdateHandler.js';
 */

import EventBus from '../../../core/EventBus.js';
import StateManager from '../../../core/StateManager.js';

class DeviceUpdateHandler {
    constructor() {
        // Suscribirse al evento de heartbeat
        EventBus.on('notification:heartbeat', this.handle.bind(this));
        console.log('[DeviceUpdateHandler] ✅ Handler registrado');
    }

    /**
     * Procesar mensaje heartbeat
     * 
     * @param {Object} message - Mensaje de notificación
     * @param {string} message.event - 'heartbeat'
     * @param {Object} message.data - Datos del evento
     * @param {string} message.data.deviceId - ID del dispositivo
     * @param {string} message.timestamp - Timestamp del evento
     */
    handle(message) {
        try {
            // Validar estructura del mensaje
            if (!this.validate(message)) {
                console.error('[DeviceUpdateHandler] Mensaje inválido:', message);
                return;
            }

            const { deviceId } = message.data;
            const timestamp = message.timestamp;

            // Verificar que el device existe
            const device = StateManager.getDevice(deviceId);
            if (!device) {
                console.warn(`[DeviceUpdateHandler] Device "${deviceId}" no encontrado en StateManager`);
                return;
            }

            // Actualizar device en StateManager
            const updated = StateManager.updateDevice(deviceId, {
                status: 'online',
                lastSeen: timestamp
            });

            if (updated) {
                console.log(`[DeviceUpdateHandler] 💓 Heartbeat de "${deviceId}" - lastSeen: ${timestamp}`);
            }

        } catch (error) {
            console.error('[DeviceUpdateHandler] Error al procesar heartbeat:', error);
        }
    }

    /**
     * Validar estructura del mensaje
     * @private
     */
    validate(message) {
        if (!message || typeof message !== 'object') {
            console.warn('[DeviceUpdateHandler] Mensaje no es un objeto');
            return false;
        }

        if (!message.event || message.event !== 'heartbeat') {
            console.warn('[DeviceUpdateHandler] event debe ser "heartbeat"');
            return false;
        }

        if (!message.data || typeof message.data !== 'object') {
            console.warn('[DeviceUpdateHandler] data inválido');
            return false;
        }

        if (!message.data.deviceId || typeof message.data.deviceId !== 'string') {
            console.warn('[DeviceUpdateHandler] deviceId inválido');
            return false;
        }

        if (!message.timestamp || typeof message.timestamp !== 'string') {
            console.warn('[DeviceUpdateHandler] timestamp inválido');
            return false;
        }

        return true;
    }
}

// Auto-inicializar
export default new DeviceUpdateHandler();