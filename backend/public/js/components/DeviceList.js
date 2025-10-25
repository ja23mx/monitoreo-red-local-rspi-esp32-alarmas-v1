/**
 * DeviceList - Contenedor de DeviceCards
 * 
 * Gestiona la lista de dispositivos.
 * Se actualiza automáticamente cuando cambian los devices en StateManager.
 * 
 * @example
 * import DeviceList from './components/DeviceList.js';
 * 
 * const deviceList = new DeviceList();
 * deviceList.mount('#devices-container');
 */

import DOMHelpers from '../utils/DOMHelpers.js';
import EventBus from '../core/EventBus.js';
import StateManager from '../core/StateManager.js';
import DeviceCard from './DeviceCard.js';

class DeviceList {
    constructor() {
        /**
         * Contenedor DOM
         * @type {HTMLElement|null}
         */
        this.container = null;

        /**
         * Mapa de DeviceCards por deviceId
         * @type {Map<string, DeviceCard>}
         */
        this.cards = new Map();

        // Suscribirse a cambios de devices
        this.subscribeToEvents();
    }

    /**
     * Suscribirse a eventos de EventBus
     * @private
     */
    subscribeToEvents() {
        // Cuando hay handshake completado, renderizar
        EventBus.on('handshake:completed', () => {
            this.render();
        });

        // Cuando cambian devices, actualizar (las cards se actualizan solas)
        EventBus.on('state:devices:changed', () => {
            this.updateDeviceList();
        });
    }

    /**
     * Montar en el DOM
     * 
     * @param {string|HTMLElement} selector - Selector CSS o elemento DOM
     * 
     * @example
     * deviceList.mount('#devices-container');
     */
    mount(selector) {
        const element = typeof selector === 'string'
            ? DOMHelpers.select(selector)
            : selector;

        if (!element) {
            console.error('[DeviceList] Elemento contenedor no encontrado:', selector);
            return;
        }

        this.container = element;
        this.render();
    }

    /**
     * Renderizar lista de devices
     */
    render() {
        if (!this.container) {
            console.warn('[DeviceList] No hay contenedor para renderizar');
            return;
        }

        // Limpiar contenedor
        this.clear();

        // Obtener devices del StateManager
        const devices = StateManager.getDevices();

        if (devices.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Crear DeviceCards
        devices.forEach(device => {
            const card = new DeviceCard(device);
            const cardElement = card.render();

            this.container.appendChild(cardElement);
            this.cards.set(device.id, card);
        });

        console.log(`[DeviceList] ${devices.length} dispositivos renderizados`);
    }

    /**
     * Actualizar lista de devices (agregar/remover según cambios)
     */
    updateDeviceList() {
        if (!this.container) return;

        const devices = StateManager.getDevices();
        const deviceIds = new Set(devices.map(d => d.id));

        // Remover cards de devices que ya no existen
        this.cards.forEach((card, deviceId) => {
            if (!deviceIds.has(deviceId)) {
                card.destroy();
                this.cards.delete(deviceId);
                console.log(`[DeviceList] Device "${deviceId}" removido`);
            }
        });

        // Agregar cards de devices nuevos
        devices.forEach(device => {
            if (!this.cards.has(device.id)) {
                const card = new DeviceCard(device);
                const cardElement = card.render();

                this.container.appendChild(cardElement);
                this.cards.set(device.id, card);
                console.log(`[DeviceList] Device "${device.id}" agregado`);
            }
        });

        // Si no hay devices, mostrar estado vacío
        if (devices.length === 0) {
            this.renderEmptyState();
        } else {
            // Remover mensaje de estado vacío si existe
            const emptyState = DOMHelpers.select('.device-list-empty', this.container);
            if (emptyState) {
                DOMHelpers.remove(emptyState);
            }
        }
    }

    /**
     * Renderizar estado vacío (no hay devices)
     * @private
     */
    renderEmptyState() {
        const emptyState = DOMHelpers.createElement('div', 'device-list-empty');

        const icon = DOMHelpers.createElement('div', 'empty-icon');
        DOMHelpers.setContent(icon, '📡');
        emptyState.appendChild(icon);

        const message = DOMHelpers.createElement('p', 'empty-message');
        DOMHelpers.setContent(message, 'No hay dispositivos conectados');
        emptyState.appendChild(message);

        const hint = DOMHelpers.createElement('p', 'empty-hint');
        DOMHelpers.setContent(hint, 'Esperando conexión con el servidor...');
        emptyState.appendChild(hint);

        this.container.appendChild(emptyState);
    }

    /**
     * Limpiar contenedor (destruir todas las cards)
     */
    clear() {
        if (!this.container) return;

        // Destruir todas las cards
        this.cards.forEach(card => card.destroy());
        this.cards.clear();

        // Limpiar contenedor
        DOMHelpers.empty(this.container);
    }

    /**
     * Obtener card por deviceId
     * 
     * @param {string} deviceId - ID del dispositivo
     * @returns {DeviceCard|undefined} Instancia de DeviceCard
     */
    getCard(deviceId) {
        return this.cards.get(deviceId);
    }

    /**
     * Obtener todas las cards
     * 
     * @returns {Map<string, DeviceCard>} Mapa de cards
     */
    getAllCards() {
        return this.cards;
    }

    /**
     * Destruir componente (cleanup)
     */
    destroy() {
        this.clear();
        this.container = null;
    }
}

export default DeviceList;