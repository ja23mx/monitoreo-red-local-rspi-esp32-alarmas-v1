/**
 * Message Handler - Procesador de Mensajes Entrantes
 * 
 * Clasifica y routea mensajes entrantes a sus respectivos handlers.
 * Valida autorizaciones y formatos antes de procesar.
 * 
 * @module telegram-bot/handlers/message-handler
 * @version 1.0.0
 */

const authService = require('../services/auth-service');
const commandHandler = require('./command-handler');
const taskHandler = require('./task-handler');
const messageParser = require('../services/message-parser');
const logger = require('../utils/logger');

/**
 * Maneja todos los mensajes entrantes del bot
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @param {Object} bot - Instancia del bot de Telegram
 * @param {Object} taskSystem - Instancia del TaskSystem
 */
async function handleMessage(msg, bot, taskSystem) {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from?.first_name || 'Desconocido';
    const text = msg.text?.trim();
    const chatType = msg.chat.type; // 'private', 'group', 'supergroup', 'channel'
    const chatTitle = msg.chat.title; // Nombre del grupo (si es grupo)

    /* // Loguear info completa del chat
    if (chatType === 'group' || chatType === 'supergroup') {
      logger.info(`📢 MENSAJE DE GRUPO DETECTADO`);
      logger.info(`🆔 Chat ID del Grupo: ${chatId}`);
      logger.info(`📝 Nombre del Grupo: ${chatTitle || 'Sin nombre'}`);
      logger.info(`👤 Usuario que envió: ${userName} (${userId})`);
      logger.info(`💬 Mensaje: ${text || '[sin texto]'}`);
      logger.info(`═══════════════════════════════════════`);
    } else {
      logger.info(`Mensaje recibido de ${userName} (${userId}): ${text || '[sin texto]'}`);
    } */

    logger.info(`Mensaje recibido de ${userName} (${userId}): ${text || '[sin texto]'}`);


    // Validar autorización
    if (!authService.isAuthorized(userId)) {
      await handleUnauthorizedUser(bot, chatId, msg.from);
      return;
    }

    // Clasificar tipo de mensaje
    if (isCommand(text)) {
      // Delegar a command-handler
      await commandHandler.handleCommand(msg, bot, taskSystem);
    } else if (isTaskData(text)) {
      // Delegar a task-handler (datos de tarea con formato *campo*##)
      await taskHandler.handleTaskData(msg, bot, taskSystem);
    } else {
      // Mensaje no reconocido
      await handleUnknownMessage(bot, chatId);
    }

  } catch (error) {
    logger.error('Error en handleMessage:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error procesando tu mensaje. Intenta nuevamente.');
  }
}

/**
 * Verifica si el texto es un comando (comienza con /)
 * 
 * @param {string} text - Texto del mensaje
 * @returns {boolean}
 */
function isCommand(text) {
  return text && text.startsWith('/');
}

/**
 * Verifica si el texto contiene datos de tarea (formato *campo*##)
 * 
 * @param {string} text - Texto del mensaje
 * @returns {boolean}
 */
function isTaskData(text) {
  if (!text) return false;

  // Verificar que contenga asteriscos y termine con ##
  return text.includes('*') && text.endsWith('##');
}

/**
 * Maneja usuarios no autorizados
 * 
 * @param {Object} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {Object} user - Información del usuario
 */
async function handleUnauthorizedUser(bot, chatId, user) {
  logger.warn(`Usuario no autorizado intentó acceder: ${user.username || user.first_name} (${user.id})`);

  const message = `⛔ Acceso Denegado\n\nNo estás autorizado para usar este bot.`;

  await bot.sendMessage(chatId, message);
}

/**
 * Maneja mensajes no reconocidos
 * 
 * @param {Object} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 */
async function handleUnknownMessage(bot, chatId) {
  const message = `❓ Mensaje no reconocido\n\n` +
    `Usa /ayuda para ver los comandos disponibles.`;

  await bot.sendMessage(chatId, message);
}

/**
 * Valida que el mensaje provenga de un chat privado
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @returns {boolean}
 */
function isPrivateChat(msg) {
  return msg.chat.type === 'private';
}

/**
 * Valida que el mensaje provenga del grupo de notificaciones
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @param {Object} config - Configuración del bot
 * @returns {boolean}
 */
function isNotificationGroup(msg, config) {
  return msg.chat.id === config.notification_group.chat_id;
}

module.exports = {
  handleMessage,
  isCommand,
  isTaskData,
  isPrivateChat,
  isNotificationGroup
};