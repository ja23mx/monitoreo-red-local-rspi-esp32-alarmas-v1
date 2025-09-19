/**
 * Validador de Mensajes WebSocket
 * @brief Valida estructura, formato y contenido de mensajes entrantes
 */

const WEBSOCKET_CONFIG = require('../config/websocket-config');

class MessageValidator {
    
    /**
     * Valida si el mensaje es JSON válido
     * @param {String} message - Mensaje raw recibido
     * @returns {Object} { isValid: boolean, data: object|null, error: string|null }
     */
    static validateJSON(message) {
        try {
            const data = JSON.parse(message);
            return { isValid: true, data, error: null };
        } catch (error) {
            return { 
                isValid: false, 
                data: null, 
                error: WEBSOCKET_CONFIG.ERROR_MESSAGES[WEBSOCKET_CONFIG.ERROR_CODES.INVALID_JSON]
            };
        }
    }

    /**
     * Valida estructura básica del mensaje
     * @param {Object} data - Objeto JSON parseado
     * @returns {Object} { isValid: boolean, error: string|null }
     */
    static validateMessageStructure(data) {
        // Campos obligatorios en todo mensaje
        const requiredFields = ['type', 'timestamp'];
        
        for (const field of requiredFields) {
            if (!data.hasOwnProperty(field)) {
                return {
                    isValid: false,
                    error: `Campo obligatorio faltante: ${field}`
                };
            }
        }

        // Validar tipo de mensaje
        const validTypes = Object.values(WEBSOCKET_CONFIG.MESSAGE_TYPES);
        if (!validTypes.includes(data.type)) {
            return {
                isValid: false,
                error: WEBSOCKET_CONFIG.ERROR_MESSAGES[WEBSOCKET_CONFIG.ERROR_CODES.INVALID_MESSAGE_TYPE]
            };
        }

        return { isValid: true, error: null };
    }

    /**
     * Valida tamaño del mensaje
     * @param {String} message - Mensaje raw
     * @returns {Object} { isValid: boolean, error: string|null }
     */
    static validateMessageSize(message) {
        if (message.length > WEBSOCKET_CONFIG.MAX_MESSAGE_SIZE) {
            return {
                isValid: false,
                error: WEBSOCKET_CONFIG.ERROR_MESSAGES[WEBSOCKET_CONFIG.ERROR_CODES.MESSAGE_TOO_LARGE]
            };
        }
        return { isValid: true, error: null };
    }

    /**
     * Validación específica para mensaje de handshake
     * @param {Object} data - Datos del mensaje
     * @returns {Object} { isValid: boolean, error: string|null }
     */
    static validateHandshakeMessage(data) {
        const requiredFields = ['clientId', 'userAgent'];
        
        for (const field of requiredFields) {
            if (!data.hasOwnProperty(field) || !data[field]) {
                return {
                    isValid: false,
                    error: `Campo de handshake faltante: ${field}`
                };
            }
        }

        return { isValid: true, error: null };
    }

    /**
     * Validación específica para comandos de dispositivo
     * @param {Object} data - Datos del mensaje
     * @returns {Object} { isValid: boolean, error: string|null }
     */
    static validateDeviceCommand(data) {
        const requiredFields = ['deviceId', 'command'];
        
        for (const field of requiredFields) {
            if (!data.hasOwnProperty(field) || !data[field]) {
                return {
                    isValid: false,
                    error: `Campo de comando faltante: ${field}`
                };
            }
        }

        // Validar que el comando sea válido
        const validCommands = Object.values(WEBSOCKET_CONFIG.DEVICE_COMMANDS);
        if (!validCommands.includes(data.command)) {
            return {
                isValid: false,
                error: `Comando no válido: ${data.command}`
            };
        }

        return { isValid: true, error: null };
    }

    /**
     * Validación completa de mensaje
     * @param {String} message - Mensaje raw recibido
     * @returns {Object} { isValid: boolean, data: object|null, error: string|null, errorCode: number|null }
     */
    static validateMessage(message) {
        // 1. Validar tamaño
        const sizeValidation = this.validateMessageSize(message);
        if (!sizeValidation.isValid) {
            return {
                isValid: false,
                data: null,
                error: sizeValidation.error,
                errorCode: WEBSOCKET_CONFIG.ERROR_CODES.MESSAGE_TOO_LARGE
            };
        }

        // 2. Validar JSON
        const jsonValidation = this.validateJSON(message);
        if (!jsonValidation.isValid) {
            return {
                isValid: false,
                data: null,
                error: jsonValidation.error,
                errorCode: WEBSOCKET_CONFIG.ERROR_CODES.INVALID_JSON
            };
        }

        // 3. Validar estructura
        const structureValidation = this.validateMessageStructure(jsonValidation.data);
        if (!structureValidation.isValid) {
            return {
                isValid: false,
                data: jsonValidation.data,
                error: structureValidation.error,
                errorCode: WEBSOCKET_CONFIG.ERROR_CODES.MISSING_FIELDS
            };
        }

        // 4. Validación específica por tipo
        let specificValidation = { isValid: true, error: null };
        
        switch (jsonValidation.data.type) {
            case WEBSOCKET_CONFIG.MESSAGE_TYPES.HANDSHAKE:
                specificValidation = this.validateHandshakeMessage(jsonValidation.data);
                break;
            case WEBSOCKET_CONFIG.MESSAGE_TYPES.DEVICE_COMMAND:
                specificValidation = this.validateDeviceCommand(jsonValidation.data);
                break;
            // Otros tipos no requieren validación específica por ahora
        }

        if (!specificValidation.isValid) {
            return {
                isValid: false,
                data: jsonValidation.data,
                error: specificValidation.error,
                errorCode: WEBSOCKET_CONFIG.ERROR_CODES.MISSING_FIELDS
            };
        }

        return {
            isValid: true,
            data: jsonValidation.data,
            error: null,
            errorCode: null
        };
    }
}

module.exports = MessageValidator;