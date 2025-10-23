/**
 * Configuración WebSocket - Constantes y Configuración del Sistema
 * @brief Centraliza toda la configuración para evitar números mágicos y facilitar mantenimiento
 */

const WEBSOCKET_CONFIG = {
    // Timeouts y límites de conexión
    CONNECTION_TIMEOUT: 30000,      // 30 segundos para timeout de conexión
    HEARTBEAT_INTERVAL: 15000,      // 15 segundos entre heartbeats
    MAX_MESSAGE_SIZE: 8192,         // 8KB máximo por mensaje
    MAX_CLIENTS: 100,               // Máximo de clientes conectados simultáneos
    COMMAND_TIMEOUT: 10000,         // 10 segundos timeout para comandos

    // Estados de conexión
    CONNECTION_STATES: {
        CONNECTING: 'connecting',
        AUTHENTICATED: 'authenticated',
        READY: 'ready',
        DISCONNECTED: 'disconnected',
        ERROR: 'error'
    },

    // Tipos de mensaje válidos
    MESSAGE_TYPES: {
        HANDSHAKE: 'handshake',
        HANDSHAKE_RSP: 'handshake_response',
        DEVICE_COMMAND: 'device_command',
        SYSTEM_INFO: 'system_info',
        NOTIFICATION: 'notification',
        PING: 'ping',
        PONG: 'pong'
    },

    // Códigos de error estándar
    ERROR_CODES: {
        INVALID_JSON: 1001,
        MISSING_FIELDS: 1002,
        INVALID_MESSAGE_TYPE: 1003,
        AUTHENTICATION_FAILED: 1004,
        DEVICE_NOT_FOUND: 1005,
        INTERNAL_ERROR: 1006,
        CONNECTION_LIMIT: 1007,
        MESSAGE_TOO_LARGE: 1008,
        INVALID_COMMAND: 400,
        COMMAND_TIMEOUT: 408
    },

    // Mensajes de error
    ERROR_MESSAGES: {
        1001: 'Formato JSON inválido',
        1002: 'Campos obligatorios faltantes',
        1003: 'Tipo de mensaje no válido',
        1004: 'Falló la autenticación',
        1005: 'Dispositivo no encontrado',
        1006: 'Error interno del servidor',
        1007: 'Límite de conexiones alcanzado',
        1008: 'Mensaje demasiado grande',
        400: 'Comando inválido',
        408: 'Timeout ejecutando comando'
    },

    // Eventos de dispositivos desde MQTT
    DEVICE_EVENTS: {
        BUTTON_PRESSED: 'button_pressed',
        HEARTBEAT: 'heartbeat',
        DEVICE_RESET: 'device_reset',
        ALARM_ACTIVATED: 'alarm_activated',
        ALARM_DEACTIVATED: 'alarm_deactivated',
        DEVICE_ONLINE: 'device_online',
        DEVICE_OFFLINE: 'device_offline'
    },

    // Comandos hacia dispositivos
    DEVICE_COMMANDS: {
        PING: 'ping',
        GET_STATUS: 'get_status',
        PLAY_TRACK: 'play_track',
        STOP_AUDIO: 'stop_audio',
        SET_VOLUME: 'set_volume',
        REBOOT: 'reboot'
    },

    // Configuración de integración MQTT
    MQTT_INTEGRATION: {
        enabled: true,
        eventTimeout: 5000,                 // Timeout para eventos MQTT
        retryAttempts: 3,                   // Reintentos para comandos
        broadcastDelay: 100,                // Delay antes de broadcast
        macToIdFile: 'mac_to_id.json'       // Archivo de mapeo MAC↔ID
    }
};

module.exports = WEBSOCKET_CONFIG;