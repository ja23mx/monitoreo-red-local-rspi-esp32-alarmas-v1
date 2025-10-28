/**
 * Message Parser - Parseador de Mensajes de Telegram
 * 
 * Extrae y parsea datos de mensajes con formato especial *campo*##
 * utilizados para crear/editar tareas y ejecutar tests manuales.
 * 
 * @module telegram-bot/services/message-parser
 * @version 1.0.0
 */

const logger = require('../utils/logger');

/**
 * Parsea mensaje para crear tarea
 * Formato esperado: *nombre*HH:MM*track##
 * 
 * Ejemplo: *Prueba Tarde*15:30*20##
 * 
 * @param {string} text - Texto del mensaje
 * @returns {Object} Datos parseados { name, hour, minute, track }
 * @throws {Error} Si el formato es inválido
 */
function parseCreateTask(text) {
    try {
        // Remover espacios y terminador ##
        const cleanText = text.trim().replace(/##$/, '');

        // Extraer campos entre asteriscos
        const fields = extractFields(cleanText);

        if (fields.length !== 3) {
            throw new Error('Formato inválido. Esperado: *nombre*HH:MM*track##');
        }

        const [name, time, track] = fields;

        // Parsear hora y minuto
        const { hour, minute } = parseTime(time);

        // Parsear track
        const trackNumber = parseInt(track, 10);

        if (isNaN(trackNumber)) {
            throw new Error(`Track inválido: ${track}`);
        }

        logger.info(`Tarea parseada: ${name} a las ${hour}:${minute}, track ${trackNumber}`);

        return {
            name: name.trim(),
            hour: hour,
            minute: minute,
            track: trackNumber
        };

    } catch (error) {
        logger.error('Error parseando tarea para creación:', error.message);
        throw error;
    }
}

/**
 * Parsea mensaje para editar tarea
 * Formato esperado: *nombre*HH:MM*pista:track*estado##
 * 
 * Ejemplos:
 * - *Prueba*12:00*pista:12*habilitada##
 * - *Test*09:30*pista:5*deshabilitada##
 * 
 * @param {string} text - Texto del mensaje
 * @returns {Object} Datos parseados { name, hour, minute, track, enabled }
 * @throws {Error} Si el formato es inválido
 */
function parseEditTask(text) {
    try {
        // Remover espacios y terminador ##
        const cleanText = text.trim().replace(/##$/, '');

        // Extraer campos entre asteriscos
        const fields = extractFields(cleanText);

        if (fields.length !== 4) {
            throw new Error('Formato inválido. Esperado: *nombre*HH:MM*pista:track*estado##');
        }

        const [name, time, trackField, stateField] = fields;

        // Parsear hora y minuto
        const { hour, minute } = parseTime(time);

        // Parsear track (formato: "pista:12")
        const track = parseTrackField(trackField);

        // Parsear estado (habilitada/deshabilitada)
        const enabled = parseStateField(stateField);

        logger.info(`Edición parseada: ${name} a las ${hour}:${minute}, track ${track}, ${enabled ? 'habilitada' : 'deshabilitada'}`);

        return {
            name: name.trim(),
            hour: hour,
            minute: minute,
            track: track,
            enabled: enabled
        };

    } catch (error) {
        logger.error('Error parseando tarea para edición:', error.message);
        throw error;
    }
}

/**
 * Parsea mensaje para test manual
 * Formato esperado: *track##
 * 
 * Ejemplo: *25##
 * 
 * @param {string} text - Texto del mensaje
 * @returns {Object} Datos parseados { track }
 * @throws {Error} Si el formato es inválido
 */
function parseManualTest(text) {
    try {
        // Remover espacios y terminador ##
        const cleanText = text.trim().replace(/##$/, '');

        // Extraer campos entre asteriscos
        const fields = extractFields(cleanText);

        if (fields.length !== 1) {
            throw new Error('Formato inválido. Esperado: *track##');
        }

        const track = parseInt(fields[0], 10);

        if (isNaN(track)) {
            throw new Error(`Track inválido: ${fields[0]}`);
        }

        logger.info(`Test manual parseado: track ${track}`);

        return {
            track: track
        };

    } catch (error) {
        logger.error('Error parseando test manual:', error.message);
        throw error;
    }
}

/**
 * Extrae campos delimitados por asteriscos
 * 
 * @param {string} text - Texto a procesar
 * @returns {Array<string>} Array de campos extraídos
 * @throws {Error} Si no se encuentran asteriscos
 */
function extractFields(text) {
    // Dividir por asteriscos
    const parts = text.split('*');

    // Filtrar partes vacías (al inicio/final)
    const fields = parts.filter(part => part.trim() !== '');

    if (fields.length === 0) {
        throw new Error('No se encontraron campos delimitados por asteriscos');
    }

    return fields;
}

/**
 * Parsea campo de hora en formato HH:MM
 * 
 * @param {string} timeStr - Cadena de tiempo (ej: "15:30")
 * @returns {Object} { hour, minute }
 * @throws {Error} Si el formato es inválido
 */
function parseTime(timeStr) {
    const timeParts = timeStr.trim().split(':');

    if (timeParts.length !== 2) {
        throw new Error(`Formato de hora inválido: ${timeStr}. Esperado: HH:MM`);
    }

    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);

    if (isNaN(hour) || isNaN(minute)) {
        throw new Error(`Hora o minuto inválido: ${timeStr}`);
    }

    if (hour < 0 || hour > 23) {
        throw new Error(`Hora fuera de rango (0-23): ${hour}`);
    }

    if (minute < 0 || minute > 59) {
        throw new Error(`Minuto fuera de rango (0-59): ${minute}`);
    }

    return { hour, minute };
}

/**
 * Parsea campo de track (formato: "pista:12")
 * 
 * @param {string} trackField - Campo de track
 * @returns {number} Número de track
 * @throws {Error} Si el formato es inválido
 */
function parseTrackField(trackField) {
    const trackParts = trackField.trim().split(':');

    if (trackParts.length !== 2 || trackParts[0].toLowerCase() !== 'pista') {
        throw new Error(`Formato de pista inválido: ${trackField}. Esperado: pista:número`);
    }

    const track = parseInt(trackParts[1], 10);

    if (isNaN(track)) {
        throw new Error(`Número de pista inválido: ${trackParts[1]}`);
    }

    return track;
}

/**
 * Parsea campo de estado (habilitada/deshabilitada)
 * 
 * @param {string} stateField - Campo de estado
 * @returns {boolean} true si habilitada, false si deshabilitada
 * @throws {Error} Si el valor no es reconocido
 */
function parseStateField(stateField) {
    const state = stateField.trim().toLowerCase();

    if (state === 'habilitada') {
        return true;
    } else if (state === 'deshabilitada') {
        return false;
    } else {
        throw new Error(`Estado inválido: ${stateField}. Esperado: habilitada o deshabilitada`);
    }
}

/**
 * Valida que el texto tenga el terminador ##
 * 
 * @param {string} text - Texto a validar
 * @returns {boolean} true si termina con ##
 */
function hasTerminator(text) {
    return text.trim().endsWith('##');
}

/**
 * Sanitiza texto eliminando caracteres especiales peligrosos
 * (Para prevenir inyección de comandos)
 * 
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeText(text) {
    // Remover caracteres potencialmente peligrosos
    // Mantener: letras, números, espacios, guiones, underscores
    return text.replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/g, '');
}

module.exports = {
    parseCreateTask,
    parseEditTask,
    parseManualTest,
    extractFields,
    parseTime,
    parseTrackField,
    parseStateField,
    hasTerminator,
    sanitizeText
};