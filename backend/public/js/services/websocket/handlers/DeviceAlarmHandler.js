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
        // Suscribirse al evento de button_pressed
        EventBus.on('notification:button_pressed', this.handle.bind(this));
        console.log('[DeviceAlarmHandler] ✅ Handler registrado');
    }

    /**
     * Procesar mensaje button_pressed
     * 
     * @param {Object} message - Mensaje de notificación
     * @param {string} message.event - 'button_pressed'
     * @param {Object} message.data - Datos del evento
     * @param {string} message.data.deviceId - ID del dispositivo
     * @param {string} message.data.alarmState - 'activated' | 'deactivated'
     * @param {string} message.data.buttonName - Nombre del botón
     * @param {string} message.timestamp - Timestamp del evento
     */
    handle(message) {
        try {
            // Validar estructura del mensaje
            if (!this.validate(message)) {
                console.error('[DeviceAlarmHandler] Mensaje inválido:', message);
                return;
            }

            const { deviceId, alarmState, buttonName } = message.data;
            const alarmActive = alarmState === 'activated';

            // Verificar que el device existe
            const device = StateManager.getDevice(deviceId);
            if (!device) {
                console.warn(`[DeviceAlarmHandler] Device "${deviceId}" no encontrado en StateManager`);
                return;
            }

            // Actualizar StateManager
            const updated = StateManager.updateDevice(deviceId, {
                alarmActive: alarmActive,
                lastSeen: message.timestamp,
                lastAlarmButton: buttonName
            });

            if (!updated) {
                console.error(`[DeviceAlarmHandler] No se pudo actualizar device "${deviceId}"`);
                return;
            }

            console.log(`[DeviceAlarmHandler] 🚨 Botón "${buttonName}" presionado en "${deviceId}"`);

            // Mostrar notificación
            const deviceName = device.name || deviceId;
            if (alarmActive) {
                Toast.show(`🚨 ALARMA ACTIVADA: ${deviceName} (${buttonName})`, 'error', 10000);
            } else {
                Toast.show(`✅ Alarma desactivada: ${deviceName}`, 'success');
            }

            // Emitir evento para DeviceCard
            EventBus.emit('device:alarm:changed', {
                deviceId: deviceId,
                alarmActive: alarmActive,
                deviceName: deviceName,
                buttonName: buttonName,
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

        if (!message.event || message.event !== 'button_pressed') {
            console.warn('[DeviceAlarmHandler] event debe ser "button_pressed"');
            return false;
        }

        if (!message.data || typeof message.data !== 'object') {
            console.warn('[DeviceAlarmHandler] data inválido');
            return false;
        }

        if (!message.data.deviceId || typeof message.data.deviceId !== 'string') {
            console.warn('[DeviceAlarmHandler] deviceId inválido');
            return false;
        }

        if (!message.data.alarmState || typeof message.data.alarmState !== 'string') {
            console.warn('[DeviceAlarmHandler] alarmState inválido');
            return false;
        }

        return true;
    }
}

// Auto-inicializar
export default new DeviceAlarmHandler();