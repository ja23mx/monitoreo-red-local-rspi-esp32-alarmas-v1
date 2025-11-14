/**
 * DeviceCard - Componente de tarjeta de dispositivo
 * 
 * Representa visualmente un dispositivo ESP32.
 * Se actualiza en tiempo real según eventos de WebSocket.
 * Permite enviar comandos (ping, reset, play_audio).
 * 
 * @example
 * import DeviceCard from './components/DeviceCard.js';
 * 
 * const device = { id: 'ESP32_001', name: 'Poste 1', ... };
 * const card = new DeviceCard(device);
 * container.appendChild(card.render());
 */

import DOMHelpers from '../utils/DOMHelpers.js';
import DateHelpers from '../utils/DateHelpers.js';
import EventBus from '../core/EventBus.js';
import StateManager from '../core/StateManager.js';
import WebSocketService from '../services/websocket/WebSocketService.js';
import Toast from './ui/Toast.js';

class DeviceCard {
    /**
     * Constructor
     * 
     * @param {Object} device - Datos del dispositivo
     */
    constructor(device) {
        if (!device || !device.id) {
            throw new Error('DeviceCard: device debe tener un id');
        }

        /**
         * ID del dispositivo
         * @type {string}
         */
        this.deviceId = device.id;

        /**
         * Elemento DOM de la tarjeta
         * @type {HTMLElement|null}
         */
        this.element = null;

        /**
         * Timer para actualizar lastSeen
         * @type {number|null}
         */
        this.lastSeenUpdateTimer = null;

        // Suscribirse a eventos
        this.subscribeToEvents();
    }

    /**
     * Suscribirse a eventos de EventBus
     * @private
     */
    subscribeToEvents() {
        // Actualización de device
        EventBus.on('state:devices:changed', () => {
            this.update();
        });

        // Alarma específica de este device
        EventBus.on('device:alarm:changed', (data) => {
            if (data.deviceId === this.deviceId) {
                this.updateAlarmIndicator(data.alarmActive);
            }
        });
    }

    /**
     * Renderizar tarjeta
     * 
     * @returns {HTMLElement} Elemento DOM de la tarjeta
     */
    render() {
        const device = StateManager.getDevice(this.deviceId);

        if (!device) {
            console.error(`DeviceCard: Device "${this.deviceId}" no encontrado`);
            return this.renderError();
        }

        // Crear contenedor principal
        const card = DOMHelpers.createElement('div', ['device-card'], {
            'data-device-id': this.deviceId
        });

        // Agregar clase de estado
        if (device.status === 'online') {
            DOMHelpers.addClass(card, 'online');
        } else {
            DOMHelpers.addClass(card, 'offline');
        }

        // Agregar clase de alarma
        if (device.alarmActive) {
            DOMHelpers.addClass(card, 'alarm-active');
        }

        // Header
        const header = this.renderHeader(device);
        card.appendChild(header);

        // Info
        const info = this.renderInfo(device);
        card.appendChild(info);

        // Indicador de alarma
        if (device.alarmActive) {
            const alarmIndicator = this.renderAlarmIndicator();
            card.appendChild(alarmIndicator);
        }

        // Acciones
        const actions = this.renderActions(device);
        card.appendChild(actions);

        // Guardar referencia
        this.element = card;

        // Iniciar timer de actualización de lastSeen
        this.startLastSeenTimer();

        return card;
    }

    /**
     * Renderizar header (nombre + badge de estado)
     * @private
     */
    renderHeader(device) {
        const header = DOMHelpers.createElement('div', 'device-header');

        // Nombre
        const name = DOMHelpers.createElement('h3', 'device-name');
        DOMHelpers.setContent(name, device.name || device.id);
        header.appendChild(name);

        // Badge de estado
        const statusBadge = DOMHelpers.createElement('span', ['device-status-badge', device.status]);
        DOMHelpers.setContent(statusBadge, device.status === 'online' ? 'Online' : 'Offline');
        header.appendChild(statusBadge);

        return header;
    }

    /**
     * Renderizar información del device
     * @private
     */
    renderInfo(device) {
        const info = DOMHelpers.createElement('div', 'device-info');

        // Location
        if (device.location) {
            const location = DOMHelpers.createElement('p', 'device-location');
            DOMHelpers.setContent(location, `${device.location}`);
            info.appendChild(location);
        }

        // ID
        const id = DOMHelpers.createElement('p', 'device-id');
        DOMHelpers.setContent(id, `ID: ${device.id}`);
        info.appendChild(id);

        // MAC
        /* if (device.mac) {
            const mac = DOMHelpers.createElement('p', 'device-mac');
            DOMHelpers.setContent(mac, `MAC: ${device.mac}`);
            info.appendChild(mac);
        } */

        // Last Seen
        const lastSeen = DOMHelpers.createElement('p', 'device-last-seen');
        this.updateLastSeenText(lastSeen, device.lastSeen);
        info.appendChild(lastSeen);

        return info;
    }

    /**
     * Renderizar indicador de alarma
     * @private
     */
    renderAlarmIndicator() {
        const indicator = DOMHelpers.createElement('button', ['device-alarm-indicator', 'btn-alarm-dismiss'], {
            type: 'button',
            'data-device-id': this.deviceId
        });
        DOMHelpers.setContent(indicator, '🚨 ALARMA ACTIVA');

        // Evento click para desactivar alarma
        DOMHelpers.on(indicator, 'click', () => {
            this.handleDismissAlarm();
        });

        return indicator;
    }

    /**
     * Manejar desactivación de alarma
     * @private
    */
    handleDismissAlarm() {
        const device = StateManager.getDevice(this.deviceId);

        if (!device) {
            Toast.show('❌ Device no encontrado', 'error');
            return;
        }

        // Enviar comando al servidor para desactivar alarma
        const command = {
            type: 'device_command',
            deviceId: this.deviceId,
            command: 'dismiss_alarm',
            timestamp: new Date().toISOString()
        };

        const sent = WebSocketService.send(command);

        if (sent) {
            Toast.show(`✅ Desactivando alarma de ${device.name}`, 'info');
            console.log('[DeviceCard] Comando dismiss_alarm enviado:', command);

            // ✅ ACTUALIZACIÓN OPTIMISTA: Remover inmediatamente del UI
            StateManager.updateDevice(this.deviceId, { alarmActive: false });

            // Esto emitirá 'device:alarm:changed' automáticamente
            // y el botón desaparecerá via updateAlarmIndicator()
        } else {
            Toast.show('❌ Error: WebSocket desconectado', 'error');
        }
    }

    /**
     * Renderizar botones de acción
     * @private
     */
    renderActions(device) {
        const actions = DOMHelpers.createElement('div', 'device-actions');

        // Botón Ping
        ///const btnPing = this.createActionButton('ping', 'Ping', 'btn-ping');
        //actions.appendChild(btnPing);

        // Botón Reset
        //const btnReset = this.createActionButton('reset', 'Reset', 'btn-reset');
        //actions.appendChild(btnReset);

        // Botón Audio
        const btnAudio = this.createActionButton('play_track', 'Probar', 'btn-audio');
        actions.appendChild(btnAudio);

        return actions;
    }

    /**
     * Crear botón de acción
     * @private
     */
    createActionButton(action, label, className) {
        const button = DOMHelpers.createElement('button', ['btn-action', className], {
            'data-action': action,
            type: 'button'
        });
        DOMHelpers.setContent(button, label);

        DOMHelpers.on(button, 'click', () => {
            this.handleAction(action);
        });

        return button;
    }

    /**
     * Manejar acción de botón
     * @private
     */
    handleAction(action) {
        const device = StateManager.getDevice(this.deviceId);

        if (!device) {
            Toast.show('❌ Device no encontrado', 'error');
            return;
        }

        if (device.status !== 'online') {
            Toast.show('⚠️ Device está offline', 'warning');
            return;
        }

        // Enviar comando al servidor
        const command = {
            type: 'device_command',
            deviceId: this.deviceId,
            command: action,
            timestamp: new Date().toISOString()
        };

        if (action === 'play_track') {
            command.data = { track: 10 };
        }

        const sent = WebSocketService.send(command);

        if (sent) {
            Toast.show(`✅ Comando "${action}" enviado a ${device.name}`, 'success');
            console.log('[DeviceCard] Comando enviado:', command);
        } else {
            Toast.show('❌ Error: WebSocket desconectado', 'error');
        }
    }

    /**
     * Actualizar tarjeta con datos del StateManager
     */
    update() {
        if (!this.element) return;

        const device = StateManager.getDevice(this.deviceId);

        if (!device) {
            console.warn(`DeviceCard: Device "${this.deviceId}" ya no existe`);
            return;
        }

        // Actualizar clases de estado
        if (device.status === 'online') {
            DOMHelpers.addClass(this.element, 'online');
            DOMHelpers.removeClass(this.element, 'offline');
        } else {
            DOMHelpers.addClass(this.element, 'offline');
            DOMHelpers.removeClass(this.element, 'online');
        }

        // Actualizar badge de estado
        const statusBadge = DOMHelpers.select('.device-status-badge', this.element);
        if (statusBadge) {
            DOMHelpers.setContent(statusBadge, device.status === 'online' ? 'Online' : 'Offline');
            statusBadge.className = `device-status-badge ${device.status}`;
        }

        // Actualizar lastSeen
        const lastSeenElement = DOMHelpers.select('.device-last-seen', this.element);
        if (lastSeenElement) {
            this.updateLastSeenText(lastSeenElement, device.lastSeen);
        }

        // Actualizar alarma
        this.updateAlarmIndicator(device.alarmActive);
    }

    /**
     * Actualizar texto de lastSeen
     * @private
     */
    updateLastSeenText(element, lastSeenISO) {
        if (!element) return;

        if (!lastSeenISO) {
            DOMHelpers.setContent(element, 'Visto: Nunca');
            element.removeAttribute('title');
            return;
        }

        // Formato relativo
        const relativeTime = DateHelpers.formatLastSeen(lastSeenISO);
        DOMHelpers.setContent(element, `Visto: ${relativeTime}`);

        // Tooltip con fecha completa
        element.setAttribute('title', lastSeenISO);
    }

    /**
     * Actualizar indicador de alarma
     * @private
     */
    updateAlarmIndicator(alarmActive) {
        if (!this.element) return;

        if (alarmActive) {
            DOMHelpers.addClass(this.element, 'alarm-active');

            // Agregar indicador si no existe
            let indicator = DOMHelpers.select('.device-alarm-indicator', this.element);
            if (!indicator) {
                indicator = this.renderAlarmIndicator();
                const actions = DOMHelpers.select('.device-actions', this.element);
                this.element.insertBefore(indicator, actions);
            }
        } else {
            DOMHelpers.removeClass(this.element, 'alarm-active');

            // Remover indicador si existe
            const indicator = DOMHelpers.select('.device-alarm-indicator', this.element);
            if (indicator) {
                DOMHelpers.remove(indicator);
            }
        }
    }

    /**
     * Iniciar timer para actualizar lastSeen cada minuto
     * @private
     */
    startLastSeenTimer() {
        this.stopLastSeenTimer();

        this.lastSeenUpdateTimer = setInterval(() => {
            const device = StateManager.getDevice(this.deviceId);
            if (device && this.element) {
                // ✅ CORRECCIÓN: Buscar el elemento en el DOM
                const lastSeenElement = DOMHelpers.select('.device-last-seen', this.element);

                // 1. Actualizar texto "Visto: hace X"
                if (lastSeenElement) {
                    this.updateLastSeenText(lastSeenElement, device.lastSeen);
                }

                // 2. ✨ NUEVO: Verificar timeout
                const timeSinceLastSeen = Date.now() - new Date(device.lastSeen).getTime();
                const TIMEOUT_MS = 60 * 1000; // 60 segundos

                if (timeSinceLastSeen > TIMEOUT_MS && device.status === 'online') {
                    // Marcar como offline
                    StateManager.updateDevice(this.deviceId, { status: 'offline' });
                }
            }
        }, 5000); // Cada 5 segundos
    }

    /**
     * Detener timer de lastSeen
     * @private
     */
    stopLastSeenTimer() {
        if (this.lastSeenUpdateTimer) {
            clearInterval(this.lastSeenUpdateTimer);
            this.lastSeenUpdateTimer = null;
        }
    }

    /**
     * Renderizar mensaje de error
     * @private
     */
    renderError() {
        const errorCard = DOMHelpers.createElement('div', 'device-card-error');
        DOMHelpers.setContent(errorCard, `⚠️ Error al cargar device ${this.deviceId}`);
        return errorCard;
    }

    /**
     * Destruir componente (cleanup)
     */
    destroy() {
        this.stopLastSeenTimer();

        if (this.element && this.element.parentNode) {
            DOMHelpers.remove(this.element);
        }

        this.element = null;
    }
}

export default DeviceCard;