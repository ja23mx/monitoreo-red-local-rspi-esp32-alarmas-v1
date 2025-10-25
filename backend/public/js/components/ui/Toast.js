/**
 * Toast - Sistema de notificaciones temporales
 * 
 * Muestra mensajes temporales en la esquina de la pantalla.
 * Soporta 4 tipos: success, error, warning, info.
 * Auto-dismiss configurable.
 * 
 * @example
 * import Toast from './components/ui/Toast.js';
 * 
 * Toast.show('✅ Operación exitosa', 'success');
 * Toast.show('❌ Error al conectar', 'error');
 */

import DOMHelpers from '../../utils/DOMHelpers.js';
import config from '../../config/app-config.js';

class Toast {
    constructor() {
        /**
         * Contenedor de toasts
         * @type {HTMLElement|null}
         */
        this.container = null;

        /**
         * Mapa de toasts activos
         * @type {Map<string, Object>}
         */
        this.activeToasts = new Map();

        /**
         * Contador para IDs únicos
         * @type {number}
         */
        this.idCounter = 0;

        // Inicializar contenedor
        this.init();
    }

    /**
     * Inicializar contenedor de toasts
     * @private
     */
    init() {
        // Verificar si ya existe contenedor
        this.container = DOMHelpers.select('.toast-container');

        if (!this.container) {
            // Crear contenedor
            this.container = DOMHelpers.createElement('div', 'toast-container');
            document.body.appendChild(this.container);
        }
    }

    /**
     * Mostrar toast
     * 
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de toast: 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Duración en ms (opcional, usa config si no se especifica)
     * @returns {string} ID del toast creado
     * 
     * @example
     * Toast.show('Comando enviado', 'success');
     * Toast.show('Error de conexión', 'error', 5000);
     */
    show(message, type = 'info', duration = null) {
        // Validaciones
        if (!message || typeof message !== 'string') {
            console.warn('Toast.show: message debe ser un string');
            return null;
        }

        const validTypes = ['success', 'error', 'warning', 'info'];
        if (!validTypes.includes(type)) {
            console.warn(`Toast.show: tipo "${type}" no válido, usando 'info'`);
            type = 'info';
        }

        // Obtener duración desde config si no se especifica
        if (duration === null) {
            duration = config.notifications.duration[type] || 3000;
        }

        // Generar ID único
        const toastId = `toast-${++this.idCounter}`;

        // Crear elemento toast
        const toast = this.createToastElement(toastId, message, type);

        // Verificar límite de toasts visibles
        if (this.activeToasts.size >= config.notifications.maxVisible) {
            // Remover el más antiguo
            const oldestId = this.activeToasts.keys().next().value;
            this.hide(oldestId);
        }

        // Agregar al contenedor con animación
        this.container.appendChild(toast);

        // Trigger animación (necesario para CSS transition)
        setTimeout(() => {
            DOMHelpers.addClass(toast, 'toast-show');
        }, 10);

        // Guardar en mapa de activos
        const timeoutId = setTimeout(() => {
            this.hide(toastId);
        }, duration);

        this.activeToasts.set(toastId, {
            element: toast,
            timeoutId: timeoutId,
            type: type
        });

        return toastId;
    }

    /**
     * Crear elemento HTML del toast
     * @private
     */
    createToastElement(id, message, type) {
        // Contenedor del toast
        const toast = DOMHelpers.createElement('div', ['toast', `toast-${type}`], {
            id: id,
            role: 'alert',
            'aria-live': 'polite'
        });

        // Mensaje
        const messageSpan = DOMHelpers.createElement('span', 'toast-message');
        DOMHelpers.setContent(messageSpan, message);

        // Botón cerrar
        const closeButton = DOMHelpers.createElement('button', 'toast-close', {
            type: 'button',
            'aria-label': 'Cerrar notificación'
        });
        DOMHelpers.setContent(closeButton, '×');

        // Event listener para cerrar
        DOMHelpers.on(closeButton, 'click', () => {
            this.hide(id);
        });

        // Ensamblar
        toast.appendChild(messageSpan);
        toast.appendChild(closeButton);

        return toast;
    }

    /**
     * Ocultar toast específico
     * 
     * @param {string} toastId - ID del toast a ocultar
     * 
     * @example
     * const id = Toast.show('Mensaje', 'info');
     * Toast.hide(id);
     */
    hide(toastId) {
        const toastData = this.activeToasts.get(toastId);

        if (!toastData) {
            return;
        }

        const { element, timeoutId } = toastData;

        // Cancelar timeout de auto-dismiss
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Animación de salida
        DOMHelpers.removeClass(element, 'toast-show');
        DOMHelpers.addClass(element, 'toast-hide');

        // Remover del DOM después de animación
        setTimeout(() => {
            if (element.parentNode) {
                DOMHelpers.remove(element);
            }
            this.activeToasts.delete(toastId);
        }, 300); // Duración de animación CSS
    }

    /**
     * Limpiar todos los toasts
     * 
     * @example
     * Toast.clear();
     */
    clear() {
        const toastIds = Array.from(this.activeToasts.keys());
        toastIds.forEach(id => this.hide(id));
    }

    /**
     * Obtener cantidad de toasts activos
     * 
     * @returns {number} Cantidad de toasts visibles
     */
    getActiveCount() {
        return this.activeToasts.size;
    }
}

// Exportar como Singleton
export default new Toast();