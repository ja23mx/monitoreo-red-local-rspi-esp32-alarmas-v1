/**
 * Logger - Sistema de Logging para Telegram Bot
 * 
 * Proporciona funciones de logging con colores y timestamps
 * para depuración y monitoreo del bot de Telegram.
 * 
 * @module telegram-bot/utils/logger
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Colores ANSI para terminal
 */
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Colores de texto
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Colores de fondo
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
};

/**
 * Niveles de log
 */
const LogLevel = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

/**
 * Configuración del logger
 */
const config = {
    logToFile: true,
    logToConsole: true,
    logFilePath: path.join(__dirname, '../../../logs/telegram-bot.log'),
    maxFileSize: 5 * 1024 * 1024, // 5MB
    includeTimestamp: true,
    colorize: true
};

/**
 * Formatea timestamp actual
 * 
 * @returns {string} Timestamp formateado
 */
function getTimestamp() {
    const now = new Date();
    const date = now.toLocaleDateString('es-MX');
    const time = now.toLocaleTimeString('es-MX', { hour12: false });
    return `${date} ${time}`;
}

/**
 * Formatea mensaje de log con nivel y timestamp
 * 
 * @param {string} level - Nivel de log
 * @param {string} message - Mensaje a loguear
 * @returns {string} Mensaje formateado
 */
function formatMessage(level, message) {
    const timestamp = config.includeTimestamp ? `[${getTimestamp()}]` : '';
    return `${timestamp} [${level}] [TelegramBot] ${message}`;
}

/**
 * Obtiene color para nivel de log
 * 
 * @param {string} level - Nivel de log
 * @returns {string} Código de color ANSI
 */
function getColorForLevel(level) {
    switch (level) {
        case LogLevel.ERROR:
            return colors.red;
        case LogLevel.WARN:
            return colors.yellow;
        case LogLevel.INFO:
            return colors.green;
        case LogLevel.DEBUG:
            return colors.cyan;
        default:
            return colors.white;
    }
}

/**
 * Escribe log en archivo
 * 
 * @param {string} message - Mensaje a escribir
 */
function writeToFile(message) {
    if (!config.logToFile) return;

    try {
        // Crear directorio de logs si no existe
        const logDir = path.dirname(config.logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Verificar tamaño del archivo
        if (fs.existsSync(config.logFilePath)) {
            const stats = fs.statSync(config.logFilePath);
            if (stats.size >= config.maxFileSize) {
                // Rotar archivo de log
                rotateLogFile();
            }
        }

        // Escribir log
        fs.appendFileSync(config.logFilePath, message + '\n', 'utf8');

    } catch (error) {
        console.error('Error escribiendo log a archivo:', error.message);
    }
}

/**
 * Rota archivo de log cuando alcanza tamaño máximo
 */
function rotateLogFile() {
    try {
        const timestamp = Date.now();
        const backupPath = config.logFilePath.replace('.log', `.${timestamp}.log`);
        fs.renameSync(config.logFilePath, backupPath);

        console.log(`Log rotado: ${backupPath}`);

        // Limpiar logs antiguos (mantener solo últimos 5)
        cleanOldLogs();

    } catch (error) {
        console.error('Error rotando archivo de log:', error.message);
    }
}

/**
 * Limpia logs antiguos, manteniendo solo los últimos 5
 */
function cleanOldLogs() {
    try {
        const logDir = path.dirname(config.logFilePath);
        const files = fs.readdirSync(logDir);

        // Filtrar archivos de log con timestamp
        const logFiles = files
            .filter(file => file.match(/telegram-bot\.\d+\.log$/))
            .map(file => ({
                name: file,
                path: path.join(logDir, file),
                time: fs.statSync(path.join(logDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        // Eliminar logs antiguos (mantener solo 5)
        if (logFiles.length > 5) {
            logFiles.slice(5).forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`Log antiguo eliminado: ${file.name}`);
            });
        }

    } catch (error) {
        console.error('Error limpiando logs antiguos:', error.message);
    }
}

/**
 * Función genérica de log
 * 
 * @param {string} level - Nivel de log
 * @param {string} message - Mensaje
 * @param {*} data - Datos adicionales (opcional)
 */
function log(level, message, data = null) {
    const formattedMessage = formatMessage(level, message);

    // Log a consola
    if (config.logToConsole) {
        const color = config.colorize ? getColorForLevel(level) : '';
        const reset = config.colorize ? colors.reset : '';

        console.log(`${color}${formattedMessage}${reset}`);

        if (data !== null) {
            console.log(data);
        }
    }

    // Log a archivo (sin colores)
    writeToFile(formattedMessage);
    if (data !== null) {
        writeToFile(JSON.stringify(data, null, 2));
    }
}

/**
 * Log nivel ERROR
 * 
 * @param {string} message - Mensaje de error
 * @param {*} error - Objeto error (opcional)
 */
function error(message, error = null) {
    log(LogLevel.ERROR, message);

    if (error) {
        if (error.stack) {
            writeToFile(error.stack);
            if (config.logToConsole) {
                console.error(colors.red + error.stack + colors.reset);
            }
        } else {
            log(LogLevel.ERROR, JSON.stringify(error));
        }
    }
}

/**
 * Log nivel WARN
 * 
 * @param {string} message - Mensaje de advertencia
 * @param {*} data - Datos adicionales (opcional)
 */
function warn(message, data = null) {
    log(LogLevel.WARN, message, data);
}

/**
 * Log nivel INFO
 * 
 * @param {string} message - Mensaje informativo
 * @param {*} data - Datos adicionales (opcional)
 */
function info(message, data = null) {
    log(LogLevel.INFO, message, data);
}

/**
 * Log nivel DEBUG
 * 
 * @param {string} message - Mensaje de debug
 * @param {*} data - Datos adicionales (opcional)
 */
function debug(message, data = null) {
    log(LogLevel.DEBUG, message, data);
}

/**
 * Configura el logger
 * 
 * @param {Object} options - Opciones de configuración
 */
function configure(options) {
    Object.assign(config, options);
}

/**
 * Obtiene configuración actual
 * 
 * @returns {Object} Configuración del logger
 */
function getConfig() {
    return { ...config };
}

module.exports = {
    error,
    warn,
    info,
    debug,
    configure,
    getConfig,
    LogLevel
};