/**
 * Message Validator - Validador de Mensajes y Datos
 * 
 * Valida datos parseados de mensajes antes de procesarlos.
 * Verifica rangos, formatos y restricciones de negocio.
 * 
 * @module telegram-bot/utils/message-validator
 * @version 1.0.0
 */

const logger = require('./logger');

/**
 * Configuración de validación
 */
const validationConfig = {
    track: {
        min: 0,
        max: 999
    },
    time: {
        hourMin: 0,
        hourMax: 23,
        minuteMin: 0,
        minuteMax: 59
    },
    name: {
        minLength: 1,
        maxLength: 50
    }
};

/**
 * Valida datos para crear tarea
 * 
 * @param {Object} data - Datos parseados
 * @param {string} data.name - Nombre de la tarea
 * @param {number} data.hour - Hora (0-23)
 * @param {number} data.minute - Minuto (0-59)
 * @param {number} data.track - Número de track (0-999)
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateTaskCreation(data) {
    try {
        // Validar que existan todos los campos requeridos
        if (!data) {
            return {
                valid: false,
                error: 'Datos inválidos o vacíos'
            };
        }

        // Validar nombre
        const nameValidation = validateTaskName(data.name);
        if (!nameValidation.valid) {
            return nameValidation;
        }

        // Validar hora y minuto
        const timeValidation = validateTime(data.hour, data.minute);
        if (!timeValidation.valid) {
            return timeValidation;
        }

        // Validar track
        const trackValidation = validateTrack(data.track);
        if (!trackValidation.valid) {
            return trackValidation;
        }

        return { valid: true };

    } catch (error) {
        logger.error('Error validando datos de creación:', error);
        return {
            valid: false,
            error: `Error de validación: ${error.message}`
        };
    }
}

/**
 * Valida datos para editar tarea
 * 
 * @param {Object} data - Datos parseados
 * @param {string} data.name - Nombre de la tarea
 * @param {number} data.hour - Hora (0-23)
 * @param {number} data.minute - Minuto (0-59)
 * @param {number} data.track - Número de track (0-999)
 * @param {boolean} data.enabled - Estado de la tarea
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateTaskEdit(data) {
    try {
        // Validar que existan todos los campos requeridos
        if (!data) {
            return {
                valid: false,
                error: 'Datos inválidos o vacíos'
            };
        }

        // Validar nombre
        const nameValidation = validateTaskName(data.name);
        if (!nameValidation.valid) {
            return nameValidation;
        }

        // Validar hora y minuto
        const timeValidation = validateTime(data.hour, data.minute);
        if (!timeValidation.valid) {
            return timeValidation;
        }

        // Validar track
        const trackValidation = validateTrack(data.track);
        if (!trackValidation.valid) {
            return trackValidation;
        }

        // Validar estado (debe ser boolean)
        if (typeof data.enabled !== 'boolean') {
            return {
                valid: false,
                error: 'Estado de tarea inválido (debe ser habilitada o deshabilitada)'
            };
        }

        return { valid: true };

    } catch (error) {
        logger.error('Error validando datos de edición:', error);
        return {
            valid: false,
            error: `Error de validación: ${error.message}`
        };
    }
}

/**
 * Valida nombre de tarea
 * 
 * @param {string} name - Nombre a validar
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateTaskName(name) {
    if (!name || typeof name !== 'string') {
        return {
            valid: false,
            error: 'El nombre de la tarea es requerido'
        };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < validationConfig.name.minLength) {
        return {
            valid: false,
            error: 'El nombre de la tarea no puede estar vacío'
        };
    }

    if (trimmedName.length > validationConfig.name.maxLength) {
        return {
            valid: false,
            error: `El nombre no puede exceder ${validationConfig.name.maxLength} caracteres`
        };
    }

    return { valid: true };
}

/**
 * Valida hora y minuto
 * 
 * @param {number} hour - Hora (0-23)
 * @param {number} minute - Minuto (0-59)
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateTime(hour, minute) {
    // Validar que sean números
    if (typeof hour !== 'number' || typeof minute !== 'number') {
        return {
            valid: false,
            error: 'Hora y minuto deben ser números'
        };
    }

    // Validar que no sean NaN
    if (isNaN(hour) || isNaN(minute)) {
        return {
            valid: false,
            error: 'Hora o minuto inválido'
        };
    }

    // Validar rango de hora
    if (hour < validationConfig.time.hourMin || hour > validationConfig.time.hourMax) {
        return {
            valid: false,
            error: `La hora debe estar entre ${validationConfig.time.hourMin} y ${validationConfig.time.hourMax}`
        };
    }

    // Validar rango de minuto
    if (minute < validationConfig.time.minuteMin || minute > validationConfig.time.minuteMax) {
        return {
            valid: false,
            error: `Los minutos deben estar entre ${validationConfig.time.minuteMin} y ${validationConfig.time.minuteMax}`
        };
    }

    return { valid: true };
}

/**
 * Valida número de track
 * 
 * @param {number} track - Número de track
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateTrack(track) {
    // Validar que sea número
    if (typeof track !== 'number') {
        return {
            valid: false,
            error: 'El track debe ser un número'
        };
    }

    // Validar que no sea NaN
    if (isNaN(track)) {
        return {
            valid: false,
            error: 'Track inválido'
        };
    }

    // Validar rango
    if (track < validationConfig.track.min || track > validationConfig.track.max) {
        return {
            valid: false,
            error: `El track debe estar entre ${validationConfig.track.min} y ${validationConfig.track.max}`
        };
    }

    return { valid: true };
}

/**
 * Verifica si un track es válido (función simple para uso rápido)
 * 
 * @param {number} track - Número de track
 * @returns {boolean} true si es válido
 */
function isValidTrack(track) {
    return validateTrack(track).valid;
}

/**
 * Verifica si hora y minuto son válidos (función simple para uso rápido)
 * 
 * @param {number} hour - Hora
 * @param {number} minute - Minuto
 * @returns {boolean} true si son válidos
 */
function isValidTime(hour, minute) {
    return validateTime(hour, minute).valid;
}

/**
 * Valida que el texto tenga terminador ##
 * 
 * @param {string} text - Texto a validar
 * @returns {boolean} true si termina con ##
 */
function hasValidTerminator(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }

    return text.trim().endsWith('##');
}

/**
 * Valida ID de tarea (formato)
 * 
 * @param {string} taskId - ID de tarea
 * @returns {boolean} true si es válido
 */
function isValidTaskId(taskId) {
    if (!taskId || typeof taskId !== 'string') {
        return false;
    }

    // Validar que no esté vacío
    if (taskId.trim().length === 0) {
        return false;
    }

    // Validar formato básico (letras, números, guiones, underscores)
    const validIdPattern = /^[a-zA-Z0-9_-]+$/;
    return validIdPattern.test(taskId);
}

/**
 * Valida estructura completa de mensaje de creación
 * 
 * @param {string} text - Texto del mensaje
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateCreateTaskMessage(text) {
    // Verificar que exista texto
    if (!text || typeof text !== 'string') {
        return {
            valid: false,
            error: 'Mensaje vacío o inválido'
        };
    }

    // Verificar terminador
    if (!hasValidTerminator(text)) {
        return {
            valid: false,
            error: 'El mensaje debe terminar con ##'
        };
    }

    // Verificar que tenga asteriscos
    if (!text.includes('*')) {
        return {
            valid: false,
            error: 'Formato inválido. Debe usar asteriscos (*) para delimitar campos'
        };
    }

    // Contar asteriscos (debe tener al menos 6 para 3 campos: *campo1*campo2*campo3##)
    const asteriskCount = (text.match(/\*/g) || []).length;
    if (asteriskCount < 6) {
        return {
            valid: false,
            error: 'Formato inválido. Esperado: *nombre*HH:MM*track##'
        };
    }

    return { valid: true };
}

/**
 * Valida estructura completa de mensaje de edición
 * 
 * @param {string} text - Texto del mensaje
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateEditTaskMessage(text) {
    // Verificar que exista texto
    if (!text || typeof text !== 'string') {
        return {
            valid: false,
            error: 'Mensaje vacío o inválido'
        };
    }

    // Verificar terminador
    if (!hasValidTerminator(text)) {
        return {
            valid: false,
            error: 'El mensaje debe terminar con ##'
        };
    }

    // Verificar que tenga asteriscos
    if (!text.includes('*')) {
        return {
            valid: false,
            error: 'Formato inválido. Debe usar asteriscos (*) para delimitar campos'
        };
    }

    // Contar asteriscos (debe tener 8 para 4 campos)
    const asteriskCount = (text.match(/\*/g) || []).length;
    if (asteriskCount < 8) {
        return {
            valid: false,
            error: 'Formato inválido. Esperado: *nombre*HH:MM*pista:track*estado##'
        };
    }

    return { valid: true };
}

/**
 * Sanitiza y limpia nombre de tarea
 * 
 * @param {string} name - Nombre a sanitizar
 * @returns {string} Nombre limpio
 */
function sanitizeTaskName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    // Remover espacios múltiples
    let cleaned = name.trim().replace(/\s+/g, ' ');

    // Truncar si excede longitud máxima
    if (cleaned.length > validationConfig.name.maxLength) {
        cleaned = cleaned.substring(0, validationConfig.name.maxLength);
    }

    return cleaned;
}

/**
 * Obtiene configuración de validación actual
 * 
 * @returns {Object} Configuración de validación
 */
function getValidationConfig() {
    return { ...validationConfig };
}

module.exports = {
    validateTaskCreation,
    validateTaskEdit,
    validateTaskName,
    validateTime,
    validateTrack,
    isValidTrack,
    isValidTime,
    hasValidTerminator,
    isValidTaskId,
    validateCreateTaskMessage,
    validateEditTaskMessage,
    sanitizeTaskName,
    getValidationConfig
};