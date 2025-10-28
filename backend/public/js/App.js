/**
 * App - Aplicación Principal
 * 
 * Orquestador principal del sistema de monitoreo.
 * Inicializa todos los módulos y conecta WebSocket.
 * 
 * @example
 * // En index.html:
 * import App from './js/App.js';
 * App.init();
 */

import EventBus from './core/EventBus.js';
import StateManager from './core/StateManager.js';
import WebSocketService from './services/websocket/WebSocketService.js';
import DeviceList from './components/DeviceList.js';
import Toast from './components/ui/Toast.js';
import config from './config/app-config.js';
import DOMHelpers from './utils/DOMHelpers.js';

// Importar handlers (se auto-inicializan al importarse)
import './services/websocket/handlers/HandshakeHandler.js';
import './services/websocket/handlers/DeviceUpdateHandler.js';
import './services/websocket/handlers/DeviceAlarmHandler.js';

class App {
    constructor() {
        /**
         * Instancia de DeviceList
         * @type {DeviceList|null}
         */
        this.deviceList = null;

        /**
         * Flag de inicialización
         * @type {boolean}
         */
        this.initialized = false;
    }

    /**
     * Inicializar aplicación
     * 
     * @param {Object} options - Opciones de configuración (opcional)
     * @param {string} options.devicesContainer - Selector del contenedor de devices
     * 
     * @example
     * App.init({ devicesContainer: '#devices-container' });
     */
    async init(options = {}) {
        if (this.initialized) {
            console.warn('[App] Ya está inicializado');
            return;
        }

        console.log('[App] 🚀 Inicializando aplicación...');

        try {
            // 1. Configurar opciones
            const devicesContainer = options.devicesContainer || config.ui.devicesContainerId;

            // 2. Inicializar StateManager con estado inicial
            this.initializeState();

            // 3. Configurar listeners globales
            this.setupGlobalListeners();

            // 4. Inicializar DeviceList
            this.deviceList = new DeviceList();
            this.deviceList.mount(devicesContainer);
            console.log('[App] ✅ DeviceList montado');

            // 5. Conectar WebSocket
            await this.connectWebSocket();

            // 6. Marcar como inicializado
            this.initialized = true;

            console.log('[App] ✅ Aplicación inicializada correctamente');
            Toast.show('✅ Sistema iniciado correctamente', 'success');

        } catch (error) {
            console.error('[App] ❌ Error al inicializar:', error);
            Toast.show('❌ Error al iniciar la aplicación', 'error');
            throw error;
        }
    }

    /**
     * Inicializar estado de StateManager
     * @private
     */
    initializeState() {
        // Estado inicial vacío
        StateManager.reset();
        console.log('[App] ✅ StateManager inicializado');
    }

    /**
     * Configurar listeners globales
     * @private
     */
    setupGlobalListeners() {
        // WebSocket conectado
        EventBus.on('websocket:connected', () => {
            console.log('[App] ✅ WebSocket conectado');
            Toast.show('✅ Conectado al servidor', 'success');
            this.updateWebSocketBadge(true);
        });

        // WebSocket desconectado
        EventBus.on('websocket:disconnected', (data) => {
            console.log('[App] ⚠️ WebSocket desconectado');

            if (data.wasClean) {
                Toast.show('⚠️ Desconectado del servidor', 'warning');
            } else {
                Toast.show('❌ Conexión perdida, reconectando...', 'error');
            }
            this.updateWebSocketBadge(false);
        });

        // Reconexión en progreso
        EventBus.on('connection:reconnecting', (data) => {
            console.log(`[App] 🔄 Reconectando (${data.attempt}/${data.maxAttempts})...`);
            Toast.show(`🔄 Reconectando (${data.attempt}/${data.maxAttempts})...`, 'warning', 3000);
        });

        // Reconexión fallida
        EventBus.on('connection:failed', (data) => {
            console.error('[App] ❌ Reconexión fallida');
            Toast.show('❌ No se pudo reconectar al servidor', 'error', 10000);
        });

        // Handshake completado
        EventBus.on('handshake:completed', (data) => {
            console.log('[App] 🤝 Handshake completado:', data);
            //const mqttStatus = data.mqttConnected ? 'conectado' : 'desconectado';
            //Toast.show(`✅ ${data.devicesCount} dispositivos cargados (MQTT: ${mqttStatus})`, 'success');
            
            // Actualizar contador inicial
            this.updateDeviceCounter();
        });

        // Actualizar contador cuando cambian devices
        EventBus.on('state:devices:changed', () => {
            this.updateDeviceCounter();
        });

        // Error de WebSocket
        EventBus.on('websocket:error', (error) => {
            console.error('[App] ❌ Error de WebSocket:', error);
        });

        console.log('[App] ✅ Listeners globales configurados');
    }

    /**
     * Conectar WebSocket al servidor
     * @private
     */
    async connectWebSocket() {
        console.log('[App] 🔌 Conectando al servidor WebSocket...');

        try {
            await WebSocketService.connect();
            console.log('[App] ✅ WebSocket conectado');
        } catch (error) {
            console.error('[App] ❌ Error al conectar WebSocket:', error);
            Toast.show('⚠️ Error de conexión, reintentando...', 'warning');
            // ConnectionManager se encargará de la reconexión
        }
    }

    /**
     * Desconectar WebSocket
     */
    disconnect() {
        console.log('[App] 🔌 Desconectando...');
        WebSocketService.disconnect();
    }

    /**
     * Obtener DeviceList
     * 
     * @returns {DeviceList|null}
     */
    getDeviceList() {
        return this.deviceList;
    }

    /**
     * Obtener estado de la aplicación
     * 
     * @returns {Object}
     */
    getStatus() {
        return {
            initialized: this.initialized,
            websocketConnected: StateManager.isWebSocketConnected(),
            mqttConnected: StateManager.isMQTTConnected(),
            devicesCount: StateManager.getTotalCount(),
            onlineDevices: StateManager.getOnlineCount(),
            alarmsActive: StateManager.getDevices().filter(d => d.alarmActive).length
        };
    }

    /**
     * Limpiar y destruir aplicación
     */
    destroy() {
        console.log('[App] 🗑️ Destruyendo aplicación...');

        // Desconectar WebSocket
        this.disconnect();

        // Destruir DeviceList
        if (this.deviceList) {
            this.deviceList.destroy();
            this.deviceList = null;
        }

        // Resetear estado
        this.initialized = false;

        console.log('[App] ✅ Aplicación destruida');
    }

    /**
     * Actualizar badge de WebSocket
     * @private
     */
    updateWebSocketBadge(connected) {
        const wsBadge = DOMHelpers.select('#status-websocket');
        
        if (wsBadge) {
            wsBadge.className = `status-badge ${connected ? 'success' : 'error'}`;
            const textSpan = DOMHelpers.select('span:last-child', wsBadge);
            if (textSpan) {
                DOMHelpers.setContent(textSpan, `Servidor ${connected ? 'Online' : 'Offline'}`);
            }
        }
    }

    /**
     * Actualizar contador de dispositivos online/total
     * @private
     */
    updateDeviceCounter() {
        const statusElement = DOMHelpers.select('#status-devices span:last-child');
        
        if (statusElement) {
            const onlineCount = StateManager.getOnlineCount();
            const totalCount = StateManager.getTotalCount();
            
            DOMHelpers.setContent(statusElement, `Dispositivos: ${onlineCount}/${totalCount} online`);
            
            // Cambiar clase según proporción
            const badge = DOMHelpers.select('#status-devices');
            if (badge) {
                badge.classList.remove('success', 'warning', 'error');
                
                const percentage = totalCount > 0 ? (onlineCount / totalCount) * 100 : 0;
                
                if (percentage >= 75) {
                    badge.classList.add('success'); // Verde: 75%+ online
                } else if (percentage >= 25) {
                    badge.classList.add('warning'); // Amarillo: 25-74% online
                } else {
                    badge.classList.add('error'); // Rojo: <25% online
                }
            }
        }
    }
}

// Exportar como Singleton
export default new App();