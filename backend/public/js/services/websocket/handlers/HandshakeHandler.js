/**
 * HandshakeHandler - Procesa respuesta de handshake
 * 
 * Inicializa el estado de la aplicación con datos del servidor.
 * Actualiza StateManager con devices, estado MQTT y tiempo del servidor.
 * 
 * @example
 * // Se auto-inicializa al importarse
 * import './services/websocket/handlers/HandshakeHandler.js';
 */

import EventBus from '../../../core/EventBus.js';
import StateManager from '../../../core/StateManager.js';
import Toast from '../../../components/ui/Toast.js';

class HandshakeHandler {
    constructor() {
        // Suscribirse al evento de handshake_response
        EventBus.on('message:handshake_response', this.handle.bind(this));
        console.log('[HandshakeHandler] ✅ Handler registrado');
    }

    /**
     * Procesar mensaje handshake_response
     * 
     * @param {Object} message - Mensaje del servidor
     */
    handle(message) {
        console.log('[HandshakeHandler] 🤝 Procesando handshake response...');
        console.log('[HandshakeHandler] Mensaje recibido:', message);

        try {
            // Validar estructura del mensaje
            if (!this.validate(message)) {
                console.error('[HandshakeHandler] Mensaje inválido:', message);
                Toast.show('❌ Error en handshake: datos inválidos', 'error');
                return;
            }

            // Verificar éxito del handshake
            if (!message.success) {
                console.error('[HandshakeHandler] Handshake falló');
                Toast.show('❌ Error en handshake del servidor', 'error');
                return;
            }

            const { data } = message;

            // Actualizar devices en StateManager
            if (data.devices && Array.isArray(data.devices)) {
                StateManager.setDevices(data.devices);
                console.log(`[HandshakeHandler] ${data.devices.length} dispositivos cargados`);
            }

            // Actualizar estado MQTT (ahora viene como mqttStatus)
            /* if (data.mqttStatus) {
                const mqttConnected = data.mqttStatus === 'connected';
                StateManager.setMQTTConnected(mqttConnected);
                console.log(`[HandshakeHandler] Estado MQTT: ${mqttConnected ? 'CONECTADO' : 'DESCONECTADO'}`);
            } */

            // Actualizar tiempo del servidor
            if (data.serverTime) {
                StateManager.setServerTime(data.serverTime);
                console.log(`[HandshakeHandler] Tiempo servidor: ${data.serverTime}`);
            }

            // Información adicional del servidor
            console.log(`[HandshakeHandler] Servidor v${data.serverVersion} | Uptime: ${Math.floor(data.serverUptime)}s | Clientes: ${data.connectedClients}`);

            // Mostrar notificación de éxito
            const onlineCount = StateManager.getOnlineCount();
            const totalCount = StateManager.getTotalCount();
            Toast.show(`✅ Conectado: ${onlineCount}/${totalCount} dispositivos online`, 'success');

            // Emitir evento de handshake completado (para otros módulos)
            EventBus.emit('handshake:completed', {
                devices: data.devices,
                devicesCount: data.devices.length,
                onlineCount: onlineCount,
                mqttConnected: data.mqttStatus === 'connected',
                serverVersion: data.serverVersion,
                serverUptime: data.serverUptime,
                connectedClients: data.connectedClients
            });

        } catch (error) {
            console.error('[HandshakeHandler] Error al procesar handshake:', error);
            Toast.show('❌ Error al inicializar aplicación', 'error');
        }
    }

    /**
     * Validar estructura del mensaje
     * @private
     */
    validate(message) {
        if (!message || typeof message !== 'object') {
            console.warn('[HandshakeHandler] Mensaje no es un objeto');
            return false;
        }

        // Validar que exista success y data
        if (typeof message.success !== 'boolean') {
            console.warn('[HandshakeHandler] Falta campo success');
            return false;
        }

        if (!message.data || typeof message.data !== 'object') {
            console.warn('[HandshakeHandler] Falta campo data');
            return false;
        }

        if (!Array.isArray(message.data.devices)) {
            console.warn('[HandshakeHandler] devices no es un array');
            return false;
        }

        // Validar estructura de cada device
        for (const device of message.data.devices) {
            if (!device.id || !device.mac) {
                console.warn('[HandshakeHandler] Device inválido (falta id o mac):', device);
                return false;
            }
        }

        return true;
    }
}

// Auto-inicializar
export default new HandshakeHandler();