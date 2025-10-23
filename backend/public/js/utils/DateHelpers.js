/**
 * DateHelpers - Utilidades para formateo de fechas
 * 
 * Funciones puras para formatear fechas y calcular diferencias.
 * Usadas por el reloj del header y tooltips de lastSeen.
 * 
 * @example
 * import DateHelpers from './utils/DateHelpers.js';
 * 
 * // Reloj header
 * const clock = DateHelpers.formatClock();
 * // "LUN 7 OCT 04:30 PM"
 * 
 * // LastSeen relativo
 * const relative = DateHelpers.formatLastSeen(isoDate);
 * // "hace 3 horas"
 */

const DateHelpers = {
    /**
     * Nombres de días de la semana en español (formato corto)
     */
    WEEKDAYS_SHORT: ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'],

    /**
     * Nombres de meses en español (formato corto)
     */
    MONTHS_SHORT: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],

    /**
     * Formatear fecha actual para el reloj del header
     * 
     * @returns {string} Fecha formateada: "LUN 7 OCT 04:30 PM"
     * 
     * @example
     * DateHelpers.formatClock();
     * // "LUN 7 OCT 04:30 PM"
     */
    formatClock() {
        const now = new Date();

        // Día de semana
        const weekday = this.WEEKDAYS_SHORT[now.getDay()];

        // Día del mes (sin cero a la izquierda)
        const day = now.getDate();

        // Mes
        const month = this.MONTHS_SHORT[now.getMonth()];

        // Hora en formato 12h
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // 0 se convierte en 12

        // Agregar cero a la izquierda en minutos si es necesario
        const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

        return `${weekday} ${day} ${month} ${hours}:${minutesStr} ${ampm}`;
    },

    /**
     * Formatear lastSeen en formato relativo
     * 
     * @param {string} isoDate - Fecha en formato ISO8601
     * @returns {string} Fecha relativa: "hace 3 horas", "hace 2 días"
     * 
     * @example
     * DateHelpers.formatLastSeen('2025-10-09T10:30:00Z');
     * // "hace 3 horas"
     */
    formatLastSeen(isoDate) {
        if (!isoDate) {
            return 'Nunca';
        }

        try {
            const date = new Date(isoDate);
            const now = new Date();
            const diffMs = now - date;

            // Convertir a segundos
            const diffSeconds = Math.floor(diffMs / 1000);

            // Menos de 1 minuto
            if (diffSeconds < 60) {
                return 'hace unos segundos';
            }

            // Menos de 1 hora
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) {
                return diffMinutes === 1 ? 'hace 1 minuto' : `hace ${diffMinutes} minutos`;
            }

            // Menos de 24 horas
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) {
                return diffHours === 1 ? 'hace 1 hora' : `hace ${diffHours} horas`;
            }

            // Menos de 30 días
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 30) {
                return diffDays === 1 ? 'hace 1 día' : `hace ${diffDays} días`;
            }

            // Menos de 12 meses
            const diffMonths = Math.floor(diffDays / 30);
            if (diffMonths < 12) {
                return diffMonths === 1 ? 'hace 1 mes' : `hace ${diffMonths} meses`;
            }

            // Años
            const diffYears = Math.floor(diffMonths / 12);
            return diffYears === 1 ? 'hace 1 año' : `hace ${diffYears} años`;

        } catch (error) {
            console.error('DateHelpers.formatLastSeen: Error al formatear fecha', error);
            return 'Fecha inválida';
        }
    },

    /**
     * Formatear fecha en formato absoluto
     * 
     * @param {string} isoDate - Fecha en formato ISO8601
     * @returns {string} Fecha formateada: "09/10/2025 10:30 AM"
     * 
     * @example
     * DateHelpers.formatAbsolute('2025-10-09T10:30:00Z');
     * // "09/10/2025 10:30 AM"
     */
    formatAbsolute(isoDate) {
        if (!isoDate) {
            return 'N/A';
        }

        try {
            const date = new Date(isoDate);

            // Día, mes, año
            const day = date.getDate();
            const month = date.getMonth() + 1; // getMonth() retorna 0-11
            const year = date.getFullYear();

            // Hora en formato 12h
            let hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';

            hours = hours % 12;
            hours = hours ? hours : 12;

            // Agregar ceros a la izquierda
            const dayStr = day < 10 ? `0${day}` : day;
            const monthStr = month < 10 ? `0${month}` : month;
            const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

            return `${dayStr}/${monthStr}/${year} ${hours}:${minutesStr} ${ampm}`;

        } catch (error) {
            console.error('DateHelpers.formatAbsolute: Error al formatear fecha', error);
            return 'Fecha inválida';
        }
    },

    /**
     * Calcular diferencia en milisegundos entre dos fechas
     * 
     * @param {string|Date} date1 - Primera fecha
     * @param {string|Date} date2 - Segunda fecha
     * @returns {number} Diferencia en milisegundos
     */
    getDiffMs(date1, date2) {
        const d1 = date1 instanceof Date ? date1 : new Date(date1);
        const d2 = date2 instanceof Date ? date2 : new Date(date2);

        return Math.abs(d2 - d1);
    },

    /**
     * Verificar si una fecha es más antigua que X milisegundos
     * 
     * @param {string} isoDate - Fecha en formato ISO8601
     * @param {number} thresholdMs - Umbral en milisegundos
     * @returns {boolean} true si es más antigua
     * 
     * @example
     * // Verificar si lastSeen es más de 5 minutos atrás
     * DateHelpers.isOlderThan(device.lastSeen, 5 * 60 * 1000);
     */
    isOlderThan(isoDate, thresholdMs) {
        if (!isoDate) {
            return true;
        }

        try {
            const date = new Date(isoDate);
            const now = new Date();
            const diffMs = now - date;

            return diffMs > thresholdMs;

        } catch (error) {
            console.error('DateHelpers.isOlderThan: Error al comparar fechas', error);
            return true;
        }
    },

    /**
     * Convertir fecha ISO8601 a objeto Date
     * (helper para validaciones)
     * 
     * @param {string} isoDate - Fecha en formato ISO8601
     * @returns {Date|null} Objeto Date o null si inválido
     */
    parseISO(isoDate) {
        if (!isoDate || typeof isoDate !== 'string') {
            return null;
        }

        try {
            const date = new Date(isoDate);

            // Verificar si es fecha válida
            if (isNaN(date.getTime())) {
                return null;
            }

            return date;

        } catch (error) {
            console.error('DateHelpers.parseISO: Error al parsear fecha', error);
            return null;
        }
    }
};

export default DateHelpers;