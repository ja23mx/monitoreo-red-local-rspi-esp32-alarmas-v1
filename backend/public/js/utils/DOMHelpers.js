/**
 * DOMHelpers - Utilidades para manipulación DOM
 * 
 * Funciones helper para simplificar operaciones DOM comunes.
 * Usado por todos los componentes para crear/modificar elementos.
 * 
 * @example
 * import DOMHelpers from './utils/DOMHelpers.js';
 * 
 * // Crear elemento
 * const div = DOMHelpers.createElement('div', ['card'], {id: 'test'});
 * 
 * // Seleccionar
 * const element = DOMHelpers.select('#myElement');
 */

const DOMHelpers = {
    /**
     * Crear un elemento DOM con clases y atributos
     * 
     * @param {string} tag - Nombre del tag HTML (div, span, button, etc.)
     * @param {string|string[]} classes - Clase o array de clases CSS
     * @param {Object} attributes - Objeto con atributos (id, data-*, etc.)
     * @returns {HTMLElement} Elemento DOM creado
     * 
     * @example
     * const button = DOMHelpers.createElement('button', ['btn', 'btn-primary'], {
     *   id: 'myButton',
     *   'data-action': 'submit',
     *   type: 'button'
     * });
     */
    createElement(tag, classes = [], attributes = {}) {
        if (!tag || typeof tag !== 'string') {
            throw new Error('DOMHelpers.createElement: tag debe ser un string');
        }

        const element = document.createElement(tag);

        // Agregar clases
        if (classes) {
            const classArray = Array.isArray(classes) ? classes : [classes];
            classArray.forEach(cls => {
                if (cls && typeof cls === 'string') {
                    element.classList.add(cls);
                }
            });
        }

        // Agregar atributos
        if (attributes && typeof attributes === 'object') {
            Object.entries(attributes).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    element.setAttribute(key, value);
                }
            });
        }

        return element;
    },

    /**
     * Seleccionar un elemento del DOM
     * (Wrapper de querySelector con validación)
     * 
     * @param {string} selector - Selector CSS
     * @param {HTMLElement} parent - Elemento padre (opcional, default: document)
     * @returns {HTMLElement|null} Elemento encontrado o null
     * 
     * @example
     * const header = DOMHelpers.select('#header');
     * const button = DOMHelpers.select('.btn-submit', myContainer);
     */
    select(selector, parent = document) {
        if (!selector || typeof selector !== 'string') {
            throw new Error('DOMHelpers.select: selector debe ser un string');
        }

        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.error(`DOMHelpers.select: Error con selector "${selector}"`, error);
            return null;
        }
    },

    /**
     * Seleccionar múltiples elementos del DOM
     * (Wrapper de querySelectorAll con validación)
     * 
     * @param {string} selector - Selector CSS
     * @param {HTMLElement} parent - Elemento padre (opcional, default: document)
     * @returns {Array<HTMLElement>} Array de elementos encontrados
     * 
     * @example
     * const cards = DOMHelpers.selectAll('.device-card');
     */
    selectAll(selector, parent = document) {
        if (!selector || typeof selector !== 'string') {
            throw new Error('DOMHelpers.selectAll: selector debe ser un string');
        }

        try {
            return Array.from(parent.querySelectorAll(selector));
        } catch (error) {
            console.error(`DOMHelpers.selectAll: Error con selector "${selector}"`, error);
            return [];
        }
    },

    /**
     * Agregar clase(s) CSS a un elemento
     * 
     * @param {HTMLElement} element - Elemento DOM
     * @param {string|string[]} classes - Clase o array de clases
     * 
     * @example
     * DOMHelpers.addClass(element, 'active');
     * DOMHelpers.addClass(element, ['online', 'connected']);
     */
    addClass(element, classes) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.addClass: element no es un HTMLElement válido');
            return;
        }

        const classArray = Array.isArray(classes) ? classes : [classes];
        classArray.forEach(cls => {
            if (cls && typeof cls === 'string') {
                element.classList.add(cls);
            }
        });
    },

    /**
     * Remover clase(s) CSS de un elemento
     * 
     * @param {HTMLElement} element - Elemento DOM
     * @param {string|string[]} classes - Clase o array de clases
     * 
     * @example
     * DOMHelpers.removeClass(element, 'active');
     * DOMHelpers.removeClass(element, ['online', 'connected']);
     */
    removeClass(element, classes) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.removeClass: element no es un HTMLElement válido');
            return;
        }

        const classArray = Array.isArray(classes) ? classes : [classes];
        classArray.forEach(cls => {
            if (cls && typeof cls === 'string') {
                element.classList.remove(cls);
            }
        });
    },

    /**
     * Alternar clase CSS en un elemento
     * 
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} className - Clase a alternar
     * @returns {boolean} true si la clase fue agregada, false si fue removida
     * 
     * @example
     * DOMHelpers.toggleClass(element, 'hidden');
     */
    toggleClass(element, className) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.toggleClass: element no es un HTMLElement válido');
            return false;
        }

        if (!className || typeof className !== 'string') {
            console.warn('DOMHelpers.toggleClass: className debe ser un string');
            return false;
        }

        return element.classList.toggle(className);
    },

    /**
     * Verificar si elemento tiene una clase
     * 
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} className - Clase a verificar
     * @returns {boolean} true si tiene la clase
     * 
     * @example
     * if (DOMHelpers.hasClass(element, 'active')) { ... }
     */
    hasClass(element, className) {
        if (!element || !(element instanceof HTMLElement)) {
            return false;
        }

        if (!className || typeof className !== 'string') {
            return false;
        }

        return element.classList.contains(className);
    },

    /**
     * Sanitizar texto para prevenir XSS
     * Escapa caracteres HTML especiales
     * 
     * @param {string} text - Texto a sanitizar
     * @returns {string} Texto sanitizado
     * 
     * @example
     * const safe = DOMHelpers.sanitize('<script>alert("XSS")</script>');
     * // Retorna: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
     */
    sanitize(text) {
        if (text === null || text === undefined) {
            return '';
        }

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Setear contenido HTML de forma segura
     * (Usa textContent por defecto, innerHTML solo si se especifica)
     * 
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} content - Contenido a setear
     * @param {boolean} asHTML - Si es true, usa innerHTML (peligroso)
     * 
     * @example
     * // Seguro (usa textContent)
     * DOMHelpers.setContent(element, 'Texto simple');
     * 
     * // Peligroso (usa innerHTML, solo si confías en el contenido)
     * DOMHelpers.setContent(element, '<strong>HTML</strong>', true);
     */
    setContent(element, content, asHTML = false) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.setContent: element no es un HTMLElement válido');
            return;
        }

        if (asHTML) {
            // ADVERTENCIA: Solo usar si confías en el contenido
            element.innerHTML = content;
        } else {
            // Seguro: escapa HTML automáticamente
            element.textContent = content;
        }
    },

    /**
     * Agregar event listener con validación
     * 
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} eventType - Tipo de evento (click, change, etc.)
     * @param {Function} handler - Función manejadora
     * @param {Object} options - Opciones para addEventListener
     * 
     * @example
     * DOMHelpers.on(button, 'click', () => console.log('Clicked'));
     */
    on(element, eventType, handler, options = {}) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.on: element no es un HTMLElement válido');
            return;
        }

        if (!eventType || typeof eventType !== 'string') {
            console.warn('DOMHelpers.on: eventType debe ser un string');
            return;
        }

        if (typeof handler !== 'function') {
            console.warn('DOMHelpers.on: handler debe ser una función');
            return;
        }

        element.addEventListener(eventType, handler, options);
    },

    /**
     * Remover event listener
     * 
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} eventType - Tipo de evento
     * @param {Function} handler - Función manejadora a remover
     * 
     * @example
     * DOMHelpers.off(button, 'click', handleClick);
     */
    off(element, eventType, handler) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.off: element no es un HTMLElement válido');
            return;
        }

        if (!eventType || typeof eventType !== 'string') {
            console.warn('DOMHelpers.off: eventType debe ser un string');
            return;
        }

        if (typeof handler !== 'function') {
            console.warn('DOMHelpers.off: handler debe ser una función');
            return;
        }

        element.removeEventListener(eventType, handler);
    },

    /**
     * Vaciar contenido de un elemento (remover hijos)
     * 
     * @param {HTMLElement} element - Elemento DOM
     * 
     * @example
     * DOMHelpers.empty(containerElement);
     */
    empty(element) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.empty: element no es un HTMLElement válido');
            return;
        }

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },

    /**
     * Remover elemento del DOM
     * 
     * @param {HTMLElement} element - Elemento a remover
     * 
     * @example
     * DOMHelpers.remove(oldElement);
     */
    remove(element) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMHelpers.remove: element no es un HTMLElement válido');
            return;
        }

        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }
};

export default DOMHelpers;