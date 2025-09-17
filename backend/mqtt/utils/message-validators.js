const { DateTime } = require('luxon');

/**
 * Valida que el MAC tenga 6 caracteres hexadecimales.
 */
function macFormat(mac) {
    const macRegex = /^[A-Fa-f0-9]{6}$/;
    return macRegex.test(mac);
}

/**
 * Valida que el campo time esté en formato ISO 8601 y no tenga más de X segundos de diferencia con el tiempo actual.
 */
function Iso8601Recent(time, toleranceSeconds = 60) {

    console.log('[Iso8601Recent] time:', time);

    if (!validateIso8601(time)) {
        console.log('[Iso8601Recent] Falla validateIso8601:', time);
        return false;
    }

    // isoRegex no está definido aquí, así que lo defino localmente
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    if (!isoRegex.test(time)) {
        console.log('[Iso8601Recent] Falla isoRegex:', time);
        return false;
    }

    try {
        const msgTime = DateTime.fromISO(time, { zone: 'utc' });
        const now = DateTime.utc();
        const diff = Math.abs(now.diff(msgTime, 'seconds').seconds);
        console.log('[Iso8601Recent] msgTime:', msgTime.toISO(), 'now:', now.toISO(), 'diff:', diff);
        return diff <= toleranceSeconds;
    } catch (e) {
        console.log('[Iso8601Recent] Error en DateTime.fromISO:', e);
        return false;
    }
}


/**
 * Valida que el campo time esté en formato ISO 8601 o sea "UNSYNC".
 */
function validateIso8601(time) {
    if (time === 'UNSYNC') return true;
    // ISO 8601 básico: YYYY-MM-DDTHH:MM:SSZ
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    return isoRegex.test(time);
}

/**
 * Valida el formato del topic MQTT.
*/
function TopicFormat(topic) {
    const topicRegex = /^[a-zA-Z0-9\/\+\-_]+$/;
    return topicRegex.test(topic);
}


/**
 * Valida que el payload incluya todos los campos obligatorios.
 */
function validateRequiredFields(payload, requiredFields) {
    const errors = [];
    for (const field of requiredFields) {
        if (!payload.hasOwnProperty(field) || payload[field] === undefined || payload[field] === null || payload[field] === '') {
            errors.push(`Campo obligatorio "${field}" ausente o vacío`);
        }
    }
    return errors;
}

/**
 * Valida que el tipo de evento sea permitido.
 */
function validateEventType(event) {
    const allowedEvents = ['rst', 'hb', 'button', 'play_fin', 'ack_ans'];
    return allowedEvents.includes(event);
}

/**
 * Valida los datos del evento button.
 */
function validateButtonData(data) {
    const numero_btn = data ? data['nmb-btn'] : null;
    if (typeof numero_btn === 'number' && Number.isInteger(numero_btn) && numero_btn >= 1 && numero_btn <= 5) {
        return [];
    }
    return ['Campo data.nmb-btn es obligatorio'];
}

/**
 * Valida los campos para evento reset.
*/
function validatePlayFinData(payload) {

    const errors = [];

    const track = payload.track ? payload.track : null;
    console.log('[validatePlayFinData] track:', track);
    if (!track || typeof track !== 'number' || track < 1 || track > 500) {
        errors.push('Campo data.track es obligatorio y debe ser un numero');
    }

    return errors;
}

/**
 * Sanitiza el payload (limpia strings peligrosos).
 */
function sanitizePayload(payload) {
    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
        if (typeof value === 'string') {
            sanitized[key] = value.replace(/[<>\"']/g, '').trim().substring(0, 255);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizePayload(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}


/**
 * Devuelve errores de validación según el tipo de evento.
 */
function searchErrors(payload) {

    const errors_fields = validateRequiredFields(payload, ['dsp', 'event', 'time']);

    if (errors_fields.length > 0) return errors_fields;

    if (payload.time !== 'UNSYNC' && !Iso8601Recent(payload.time)) {
        return ['Formato de tiempo inválido'];
    }

    const errors = [];
    if (!validateEventType(payload.event)) errors.push('Evento no permitido');
    switch (payload.event) {
        case 'button':
            if (payload.data) errors.push(...validateButtonData(payload.data));
            break;
        case 'play_fin':
            if (payload.data) errors.push(...validatePlayFinData(payload.data));
            break;
    }
    return errors;
}

module.exports = {
    macFormat,
    TopicFormat,
    sanitizePayload,
    searchErrors
};