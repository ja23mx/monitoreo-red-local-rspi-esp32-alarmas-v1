/**
 * DeviceAlarmHandler - Procesa eventos de alarma
 * 
 * Maneja activación/desactivación de alarmas (botón de pánico).
 * Actualiza StateManager y muestra notificación crítica.
 * 
 * @example
 * // Se auto-inicializa al importarse
 * import './services/websocket/handlers/DeviceAlarmHandler.js';
 */

import EventBus from '../../../core/EventBus.js';
import StateManager from '../../../core/StateManager.js';
import Toast from '../../../components/ui/Toast.js';

class DeviceAlarmHandler {
    constructor() {
        // Suscribirse al evento de device_alarm
        EventBus.on('message:device_alarm', this.handle.bind(this));
        console.log('[DeviceAlarmHandler] ✅ Handler registrado');
    }

    /**
     * Procesar mensaje device_alarm
     * 
     * @param {Object} message - Mensaje del servidor
     */
    handle(message) {
        try {
            // Validar estructura del mensaje
            if (!this.validate(message)) {
                console.error('[DeviceAlarmHandler] Mensaje inválido:', message);
                return;
            }

            const { deviceId, alarmActive } = message;

            // Verificar que el device existe
            const device = StateManager.getDevice(deviceId);
            if (!device) {
                console.warn(`[DeviceAlarmHandler] Device "${deviceId}" no encontrado en StateManager`);
                return;
            }

            // Actualizar alarmActive en StateManager
            const updated = StateManager.updateDevice(deviceId, {
                alarmActive: alarmActive,
                lastSeen: message.timestamp || new Date().toISOString()
            });

            if (!updated) {
                console.error(`[DeviceAlarmHandler] No se pudo actualizar device "${deviceId}"`);
                return;
            }

            console.log(`[DeviceAlarmHandler] 🚨 Alarma "${deviceId}": ${alarmActive ? 'ACTIVADA' : 'DESACTIVADA'}`);

            // Mostrar notificación
            const deviceName = device.name || deviceId;
            if (alarmActive) {
                Toast.show(`🚨 ALARMA ACTIVADA: ${deviceName}`, 'error', 10000); // 10 segundos
            } else {
                Toast.show(`✅ Alarma desactivada: ${deviceName}`, 'success');
            }

            // Emitir evento para otros módulos (ej: DeviceCard para animación)
            EventBus.emit('device:alarm:changed', {
                deviceId: deviceId,
                alarmActive: alarmActive,
                deviceName: deviceName,
                timestamp: message.timestamp
            });

        } catch (error) {
            console.error('[DeviceAlarmHandler] Error al procesar alarma:', error);
            Toast.show('❌ Error al procesar alarma', 'error');
        }
    }

    /**
     * Validar estructura del mensaje
     * @private
     */
    validate(message) {
        if (!message || typeof message !== 'object') {
            console.warn('[DeviceAlarmHandler] Mensaje no es un objeto');
            return false;
        }

        if (!message.deviceId || typeof message.deviceId !== 'string') {
            console.warn('[DeviceAlarmHandler] deviceId inválido');
            return false;
        }

        if (typeof message.alarmActive !== 'boolean') {
            console.warn('[DeviceAlarmHandler] alarmActive debe ser boolean');
            return false;
        }

        return true;
    }
}

// Auto-inicializar
export default new DeviceAlarmHandler();