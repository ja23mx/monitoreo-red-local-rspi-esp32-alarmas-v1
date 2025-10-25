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
        // Suscribirse al evento de device_update
        EventBus.on('message:device_update', this.handle.bind(this));
        console.log('[DeviceUpdateHandler] ✅ Handler registrado');
    }

    /**
     * Procesar mensaje device_update
     * 
     * @param {Object} message - Mensaje del servidor
     */
    handle(message) {
        try {
            // Validar estructura del mensaje
            if (!this.validate(message)) {
                console.error('[DeviceUpdateHandler] Mensaje inválido:', message);
                return;
            }

            const { deviceId, status, lastSeen } = message;

            // Verificar que el device existe
            const device = StateManager.getDevice(deviceId);
            if (!device) {
                console.warn(`[DeviceUpdateHandler] Device "${deviceId}" no encontrado en StateManager`);
                return;
            }

            // Construir objeto de actualización
            const updates = {};

            if (status !== undefined) {
                updates.status = status;
            }

            if (lastSeen !== undefined) {
                updates.lastSeen = lastSeen;
            }

            // Actualizar device en StateManager
            const updated = StateManager.updateDevice(deviceId, updates);

            if (updated) {
                console.log(`[DeviceUpdateHandler] Device "${deviceId}" actualizado:`, updates);
            }

        } catch (error) {
            console.error('[DeviceUpdateHandler] Error al procesar update:', error);
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

        if (!message.deviceId || typeof message.deviceId !== 'string') {
            console.warn('[DeviceUpdateHandler] deviceId inválido');
            return false;
        }

        // Al menos uno de estos campos debe estar presente
        if (message.status === undefined && message.lastSeen === undefined) {
            console.warn('[DeviceUpdateHandler] No hay campos para actualizar');
            return false;
        }

        return true;
    }
}

// Auto-inicializar
export default new DeviceUpdateHandler();