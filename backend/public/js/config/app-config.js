/**
 * app-config.js - Configuración centralizada de la aplicación
 * 
 * Contiene todas las constantes y configuraciones del sistema.
 * Facilita cambios de entorno (desarrollo/producción) y mantenimiento.
 * 
 * @example
 * import config from './config/app-config.js';
 * 
 * const wsUrl = config.websocket.url;
 * const pingInterval = config.websocket.pingInterval;
 */

const config = {
    // ==========================================
    // WEBSOCKET
    // ==========================================
    websocket: {
        /**
         * URL del servidor WebSocket
         * Cambiar según entorno:
         * - Desarrollo: ws://localhost:3001
         * - Producción: ws://IP_SERVIDOR:3001
         */
        url: `ws://${window.location.host}`,

        /**
         * Delays de reconexión en milisegundos
         * Patrón exponencial: 3s, 6s, 12s, 24s, 48s
         */
        reconnectDelays: [3000, 6000, 12000, 24000, 48000],

        /* 
            * Delays mínimo y máximo (en ms) para backoff exponencial
            * Si se define, sobreescribe reconnectDelays
            * Ej: min=3000, max=30000 => 3s, 6s, 12s, 24s, 30s (tope)
        */
        reconnectDelaysMin: 3000, // 3 segundos
        reconnectDelaysMax: 30000, // 30 segundos

        /**
         * Máximo número de intentos de reconexión
         */
        maxReconnectAttempts: 5,

        /**
         * Intervalo de ping para mantener conexión viva (ms)
         */
        pingInterval: 30000, // 30 segundos

        /**
         * Timeout para considerar conexión perdida (ms)
         */
        connectionTimeout: 5000 // 5 segundos
    },

    // ==========================================
    // ESTADOS DE DISPOSITIVOS
    // ==========================================
    deviceStates: {
        /**
         * Device online (conectado y respondiendo)
         */
        online: {
            cssClass: 'online',
            borderColor: 'green',
            label: 'En línea',
            buttonsEnabled: true
        },

        /**
         * Device offline (no responde heartbeat)
         */
        offline: {
            cssClass: 'offline',
            borderColor: 'gray',
            label: 'Desconectado',
            buttonsEnabled: false
        },

        /**
         * Alarma activada (botón presionado)
         */
        activated: {
            cssClass: 'activated',
            borderColor: 'red',
            label: 'Alarma Activada',
            buttonsEnabled: true,
            animation: 'pulse' // Animación de borde rojo pulsante
        },

        /**
         * Sin servidor (WebSocket desconectado)
         */
        noserver: {
            cssClass: 'noserver',
            borderColor: 'gray',
            label: 'Sin conexión al servidor',
            buttonsEnabled: false
        }
    },

    // ==========================================
    // COMANDOS
    // ==========================================
    commands: {
        /**
         * Comando ping (probar conexión)
         */
        ping: {
            track: null,
            label: 'Probar Conexión',
            icon: 'fa-wifi',
            confirmMessage: null, // No requiere confirmación
            successMessage: '✅ Ping enviado',
            errorMessage: '❌ Error al enviar ping'
        },

        /**
         * Comando play_track (enviar aviso)
         */
        play_track: {
            track: 25, // Track número 25 del DFPlayer
            label: 'Enviar Aviso',
            icon: 'fa-bullhorn',
            confirmMessage: null, // Opcional: '¿Enviar aviso al dispositivo?'
            successMessage: '✅ Aviso enviado',
            errorMessage: '❌ Error al enviar aviso'
        },

        /**
         * Comando stop_audio (desactivar alarma)
         */
        stop_audio: {
            track: null,
            label: 'Desactivar',
            icon: 'fa-power-off',
            confirmMessage: null,
            successMessage: '✅ Alarma desactivada',
            errorMessage: '❌ Error al desactivar'
        }
    },

    // ==========================================
    // UI - TEXTOS Y LABELS
    // ==========================================
    ui: {
        /**
         * Contador de dispositivos online
         */
        onlineCounter: {
            label: 'Dispositivos Online',
            format: '{online}/{total}' // Ej: "3/5"
        },

        /**
         * Mensajes de estado WebSocket
         */
        websocketStatus: {
            connected: 'Conectado al servidor',
            disconnected: 'Desconectado del servidor',
            reconnecting: 'Reconectando...',
            failed: 'Error de conexión'
        },

        /**
         * Tooltips
         */
        tooltips: {
            lastSeen: 'Última conexión',
            alarmStatus: 'Estado de alarma',
            deviceStatus: 'Estado del dispositivo'
        },

        /**
         * Formato de fecha para lastSeen
         * Opciones: 'relative' (hace 3 días) | 'absolute' (09/10/2025 10:30 AM)
         */
        dateFormat: 'relative'
    },

    // ==========================================
    // NOTIFICACIONES (TOASTS)
    // ==========================================
    notifications: {
        /**
         * Duración de toasts por tipo (ms)
         */
        duration: {
            success: 3000,  // 3 segundos
            error: 5000,    // 5 segundos
            warning: 4000,  // 4 segundos
            info: 3000      // 3 segundos
        },

        /**
         * Máximo número de toasts simultáneos
         */
        maxVisible: 3,

        /**
         * Posición en pantalla
         * Opciones: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
         */
        position: 'top-right'
    },

    // ==========================================
    // CLOCK (RELOJ DEL HEADER)
    // ==========================================
    clock: {
        /**
         * Intervalo de actualización del reloj (ms)
         */
        updateInterval: 1000, // 1 segundo

        /**
         * Formato de día de semana
         * Opciones: 'short' (LUN) | 'long' (Lunes)
         */
        weekdayFormat: 'short',

        /**
         * Formato de mes
         * Opciones: 'short' (OCT) | 'long' (Octubre) | 'numeric' (10)
         */
        monthFormat: 'short',

        /**
         * Formato de hora
         * Opciones: '12h' (04:30 PM) | '24h' (16:30)
         */
        hourFormat: '12h'
    },

    // ==========================================
    // DEBUG
    // ==========================================
    debug: {
        /**
         * Activar logs en consola
         */
        enableLogs: true,

        /**
         * Mostrar eventos de EventBus
         */
        showEvents: false,

        /**
         * Mostrar mensajes WebSocket completos
         */
        showWebSocketMessages: true
    }
};

export default config;