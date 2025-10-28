/**
 * Telegram Bot - Punto de Entrada Principal
 * 
 * Inicializa el bot de Telegram y establece las conexiones necesarias
 * con TaskSystem y el módulo MQTT para notificaciones de eventos.
 * 
 * @module telegram-bot/index
 * @version 1.0.0
 */

const { telegramBotManager } = require('./telegram-bot-manager');
const path = require('path');


/**
 * Inicializa el bot de Telegram
 * 
 * @param {Object} dependencies - Dependencias externas
 * @param {Object} dependencies.taskSystem - Instancia del TaskSystem
 * @returns {Promise<Object>} Instancia del bot inicializado
 */
async function initializeTelegramBot({ taskSystem }) {
    try {
        console.log('[Telegram Bot] Iniciando bot de Telegram...');

        if (!taskSystem) {
            throw new Error('TaskSystem es requerido para inicializar el bot');
        }

        telegramBotManager.setTaskSystem(taskSystem);
        await telegramBotManager.start();

        console.log('[Telegram Bot] ✅ Bot iniciado exitosamente');

        return telegramBotManager;

    } catch (error) {
        console.error('[Telegram Bot] ❌ Error al inicializar bot:', error.message);
        throw error;
    }
}

/**
 * Detiene el bot de Telegram de forma limpia
 * 
 * @returns {Promise<void>}
 */
async function stopTelegramBot() {
    try {
        console.log('[Telegram Bot] Deteniendo bot...');
        await telegramBotManager.stop();
        console.log('[Telegram Bot] ✅ Bot detenido exitosamente');
    } catch (error) {
        console.error('[Telegram Bot] ❌ Error al detener bot:', error.message);
        throw error;
    }
}

/**
 * Obtiene el estado actual del bot
 * 
 * @returns {Object} Estado del bot
 */
function getBotStatus() {
    return {
        isRunning: telegramBotManager.isRunning,
        authorizedUsersCount: telegramBotManager.getAuthorizedUsersCount(),
        notificationGroupEnabled: telegramBotManager.isNotificationGroupEnabled()
    };
}

// Exportar funciones públicas
module.exports = {
    initializeTelegramBot,
    stopTelegramBot,
    getBotStatus,
    telegramBotManager // Exportar instancia para casos especiales
};