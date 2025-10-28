/**
 * Auth Service - Servicio de Autenticación y Autorización
 * 
 * Gestiona la validación de usuarios autorizados y permisos de comandos
 * basándose en la configuración de telegram-config.json.
 * 
 * @module telegram-bot/services/auth-service
 * @version 1.0.0
 */

const logger = require('../utils/logger');

/**
 * Lista de usuarios autorizados cargada desde configuración
 */
let authorizedUsers = [];

/**
 * Configuración de permisos por comando
 */
const commandPermissions = {
    '/creartarea': ['admin', 'operator'],
    '/listartareas': ['admin', 'operator'],
    '/testmanual': ['admin', 'operator'],
    '/status': ['admin', 'operator'],
    '/ayuda': ['admin', 'operator'],
    '/help': ['admin', 'operator'],
    '/start': ['admin', 'operator']
};

/**
 * Inicializa el servicio de autenticación con la configuración
 * 
 * @param {Object} config - Configuración del bot (telegram-config.json)
 * @returns {Promise<void>}
 */
async function initialize(config) {
    try {
        if (!config || !config.authorized_users) {
            throw new Error('Configuración de usuarios autorizados no encontrada');
        }

        authorizedUsers = config.authorized_users;

        logger.info(`Auth Service inicializado con ${authorizedUsers.length} usuarios autorizados`);

        // Log de usuarios (solo para debug, ocultar chat_id en producción)
        authorizedUsers.forEach(user => {
            logger.info(`Usuario autorizado: ${user.name} (${user.role})`);
        });

    } catch (error) {
        logger.error('Error inicializando Auth Service:', error);
        throw error;
    }
}

/**
 * Verifica si un usuario está autorizado
 * 
 * @param {number} chatId - ID del chat/usuario de Telegram
 * @returns {boolean} true si está autorizado, false si no
 */
function isAuthorized(chatId) {
    const user = authorizedUsers.find(u => u.chat_id === chatId);

    if (user) {
        logger.info(`Usuario autorizado verificado: ${user.name} (${chatId})`);
        return true;
    }

    logger.warn(`Acceso denegado para usuario no autorizado: ${chatId}`);
    return false;
}

/**
 * Obtiene el rol de un usuario autorizado
 * 
 * @param {number} chatId - ID del chat/usuario de Telegram
 * @returns {string|null} Rol del usuario ('admin', 'operator') o null si no autorizado
 */
function getUserRole(chatId) {
    const user = authorizedUsers.find(u => u.chat_id === chatId);
    return user ? user.role : null;
}

/**
 * Obtiene información completa de un usuario autorizado
 * 
 * @param {number} chatId - ID del chat/usuario de Telegram
 * @returns {Object|null} Objeto usuario o null si no encontrado
 */
function getUserInfo(chatId) {
    const user = authorizedUsers.find(u => u.chat_id === chatId);

    if (user) {
        return {
            chat_id: user.chat_id,
            name: user.name,
            role: user.role
        };
    }

    return null;
}

/**
 * Verifica si un usuario tiene permisos para ejecutar un comando
 * 
 * @param {number} chatId - ID del chat/usuario de Telegram
 * @param {string} command - Comando a verificar (ej: '/creartarea')
 * @returns {boolean} true si tiene permisos, false si no
 */
function hasPermission(chatId, command) {
    // Verificar si el usuario está autorizado
    if (!isAuthorized(chatId)) {
        return false;
    }

    // Obtener rol del usuario
    const role = getUserRole(chatId);

    // Obtener roles permitidos para el comando
    const allowedRoles = commandPermissions[command];

    // Si el comando no tiene permisos definidos, permitir a todos los autorizados
    if (!allowedRoles) {
        logger.warn(`Comando sin permisos definidos: ${command}, permitiendo acceso`);
        return true;
    }

    // Verificar si el rol del usuario está en los roles permitidos
    const hasAccess = allowedRoles.includes(role);

    if (!hasAccess) {
        logger.warn(`Permiso denegado para ${role} en comando ${command}`);
    }

    return hasAccess;
}

/**
 * Verifica si un usuario es administrador
 * 
 * @param {number} chatId - ID del chat/usuario de Telegram
 * @returns {boolean} true si es admin, false si no
 */
function isAdmin(chatId) {
    const role = getUserRole(chatId);
    return role === 'admin';
}

/**
 * Verifica si un usuario es operador
 * 
 * @param {number} chatId - ID del chat/usuario de Telegram
 * @returns {boolean} true si es operator, false si no
 */
function isOperator(chatId) {
    const role = getUserRole(chatId);
    return role === 'operator';
}

/**
 * Obtiene lista de todos los usuarios autorizados
 * (Solo para uso interno/administrativo)
 * 
 * @returns {Array} Lista de usuarios autorizados
 */
function getAllAuthorizedUsers() {
    return authorizedUsers.map(user => ({
        name: user.name,
        role: user.role,
        chat_id: user.chat_id
    }));
}

/**
 * Obtiene estadísticas de usuarios autorizados
 * 
 * @returns {Object} Estadísticas
 */
function getStats() {
    const admins = authorizedUsers.filter(u => u.role === 'admin').length;
    const operators = authorizedUsers.filter(u => u.role === 'operator').length;

    return {
        total: authorizedUsers.length,
        admins: admins,
        operators: operators
    };
}

/**
 * Recarga la lista de usuarios autorizados
 * (Para uso futuro - recargar sin reiniciar bot)
 * 
 * @param {Object} config - Nueva configuración
 * @returns {Promise<void>}
 */
async function reloadAuthorizedUsers(config) {
    try {
        if (!config || !config.authorized_users) {
            throw new Error('Configuración inválida para recarga');
        }

        authorizedUsers = config.authorized_users;
        logger.info('Lista de usuarios autorizados recargada');

    } catch (error) {
        logger.error('Error recargando usuarios autorizados:', error);
        throw error;
    }
}

module.exports = {
    initialize,
    isAuthorized,
    getUserRole,
    getUserInfo,
    hasPermission,
    isAdmin,
    isOperator,
    getAllAuthorizedUsers,
    getStats,
    reloadAuthorizedUsers
};