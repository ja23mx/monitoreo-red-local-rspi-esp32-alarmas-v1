/**
 * Command Handler - Procesador de Comandos del Bot
 * 
 * Procesa todos los comandos (/) del bot de Telegram.
 * Valida permisos y delega operaciones a task-handler.
 * 
 * @module telegram-bot/handlers/command-handler
 * @version 1.0.0
 */

const authService = require('../services/auth-service');
const taskHandler = require('./task-handler');
const responseBuilder = require('../services/response-builder');
const logger = require('../utils/logger');

/**
 * Maneja todos los comandos del bot
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @param {Object} bot - Instancia del bot
 * @param {Object} taskSystem - Instancia del TaskSystem
 */
async function handleCommand(msg, bot, taskSystem) {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const command = extractCommand(msg.text);

        logger.info(`Comando recibido: ${command} de usuario ${userId}`);

        // Validar permisos del comando
        if (!authService.hasPermission(userId, command)) {
            await sendUnauthorizedMessage(bot, chatId, command);
            return;
        }

        // Routear comando
        switch (command) {
            case '/creartarea':
                await handleCreateTask(bot, chatId);
                break;

            case '/listartareas':
                await handleListTasks(bot, chatId, taskSystem);
                break;

            case '/testmanual':
                await handleManualTest(bot, chatId);
                break;

            case '/status':
                await handleStatus(bot, chatId, taskSystem);
                break;

            case '/ayuda':
            case '/help':
                await handleHelp(bot, chatId);
                break;

            case '/start':
                await handleStart(bot, chatId, msg.from);
                break;

            default:
                await sendUnknownCommand(bot, chatId, command);
        }

    } catch (error) {
        logger.error('Error en handleCommand:', error);
        await bot.sendMessage(msg.chat.id, '❌ Error procesando el comando. Intenta nuevamente.');
    }
}

/**
 * Maneja callback queries (botones inline)
 * 
 * @param {Object} query - Objeto callback query de Telegram
 * @param {Object} bot - Instancia del bot
 * @param {Object} taskSystem - Instancia del TaskSystem
 */
async function handleCallbackQuery(query, bot, taskSystem) {
    try {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const data = query.data;

        logger.info(`Callback query recibido: ${data} de usuario ${userId}`);

        // Validar autorización
        if (!authService.isAuthorized(userId)) {
            await bot.answerCallbackQuery(query.id, {
                text: '⛔ No autorizado',
                show_alert: true
            });
            return;
        }

        // Parsear callback data: action:taskId
        const [action, taskId] = data.split(':');

        switch (action) {
            case 'edit_task':
                await handleEditTask(bot, chatId, query.message.message_id, taskId, taskSystem);
                break;

            case 'toggle_task':
                await handleToggleTask(bot, chatId, query.message.message_id, taskId, taskSystem);
                break;

            case 'delete_task':
                await handleDeleteTask(bot, chatId, query.message.message_id, taskId, taskSystem);
                break;

            case 'confirm_delete':
                await handleConfirmDelete(bot, chatId, query.message.message_id, taskId, taskSystem);
                break;

            case 'cancel_delete':
                await handleCancelDelete(bot, chatId, query.message.message_id);
                break;

            case 'execute_task':
                await handleExecuteTask(bot, chatId, taskId, taskSystem);
                break;

            default:
                logger.warn(`Callback query desconocido: ${action}`);
        }

        // Confirmar callback query
        await bot.answerCallbackQuery(query.id);

    } catch (error) {
        logger.error('Error en handleCallbackQuery:', error);
        await bot.answerCallbackQuery(query.id, {
            text: '❌ Error procesando acción',
            show_alert: true
        });
    }
}

/**
 * Comando: /creartarea
 * Muestra instrucciones para crear una tarea
 */
async function handleCreateTask(bot, chatId) {
    const message = responseBuilder.buildCreateTaskInstructions();
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Comando: /listartareas
 * Lista todas las tareas con botones de acción
 */
async function handleListTasks(bot, chatId, taskSystem) {
    const tasks = taskSystem.listTasks();
    const message = responseBuilder.buildTaskList(tasks);
    const keyboard = responseBuilder.buildTaskListKeyboard(tasks);

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}

/**
 * Comando: /testmanual
 * Muestra opciones para ejecutar test manual
 */
async function handleManualTest(bot, chatId) {
    const message = responseBuilder.buildManualTestInstructions();
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Comando: /status
 * Muestra estado del sistema
 */
async function handleStatus(bot, chatId, taskSystem) {
    const taskSystemStatus = taskSystem.getStatus();
    const message = responseBuilder.buildStatusMessage(taskSystemStatus);

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Comando: /ayuda
 * Muestra ayuda de comandos disponibles
 */
async function handleHelp(bot, chatId) {
    const message = responseBuilder.buildHelpMessage();
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Comando: /start
 * Mensaje de bienvenida
 */
async function handleStart(bot, chatId, user) {
    const message = responseBuilder.buildWelcomeMessage(user);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Callback: Editar tarea
 */
async function handleEditTask(bot, chatId, messageId, taskId, taskSystem) {
    const task = taskSystem.getTaskById(taskId);

    if (!task) {
        await bot.editMessageText('❌ Tarea no encontrada', {
            chat_id: chatId,
            message_id: messageId
        });
        return;
    }

    const message = responseBuilder.buildEditTaskInstructions(task);
    await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
    });
}

/**
 * Callback: Habilitar/Deshabilitar tarea
 */
async function handleToggleTask(bot, chatId, messageId, taskId, taskSystem) {
    const task = taskSystem.getTaskById(taskId);

    if (!task) {
        await bot.editMessageText('❌ Tarea no encontrada', {
            chat_id: chatId,
            message_id: messageId
        });
        return;
    }

    const newState = !task.enabled;
    const result = await taskSystem.updateTask(taskId, { enabled: newState });

    if (result.success) {
        const message = `✅ Tarea ${newState ? 'habilitada' : 'deshabilitada'}\n\n${task.name}`;
        await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId
        });

        // Actualizar lista de tareas
        setTimeout(() => handleListTasks(bot, chatId, taskSystem), 1500);
    } else {
        await bot.editMessageText(`❌ ${result.message}`, {
            chat_id: chatId,
            message_id: messageId
        });
    }
}

/**
 * Callback: Solicitar confirmación para eliminar tarea
 */
async function handleDeleteTask(bot, chatId, messageId, taskId, taskSystem) {
    const task = taskSystem.getTaskById(taskId);

    if (!task) {
        await bot.editMessageText('❌ Tarea no encontrada', {
            chat_id: chatId,
            message_id: messageId
        });
        return;
    }

    const message = responseBuilder.buildDeleteConfirmation(task);
    const keyboard = responseBuilder.buildDeleteConfirmationKeyboard(taskId);

    await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}

/**
 * Callback: Confirmar eliminación de tarea
 */
async function handleConfirmDelete(bot, chatId, messageId, taskId, taskSystem) {
    const result = await taskSystem.deleteTask(taskId);

    if (result.success) {
        await bot.editMessageText(`🗑️ Tarea eliminada exitosamente\n\n${result.message}`, {
            chat_id: chatId,
            message_id: messageId
        });

        // Actualizar lista de tareas
        setTimeout(() => handleListTasks(bot, chatId, taskSystem), 1500);
    } else {
        await bot.editMessageText(`❌ ${result.message}`, {
            chat_id: chatId,
            message_id: messageId
        });
    }
}

/**
 * Callback: Cancelar eliminación
 */
async function handleCancelDelete(bot, chatId, messageId) {
    await bot.editMessageText('❌ Eliminación cancelada', {
        chat_id: chatId,
        message_id: messageId
    });

    // Volver a mostrar lista después de 1 segundo
    setTimeout(() => {
        bot.sendMessage(chatId, 'Usa /listartareas para ver las tareas nuevamente.');
    }, 1000);
}

/**
 * Callback: Ejecutar tarea manualmente
 */
async function handleExecuteTask(bot, chatId, taskId, taskSystem) {
    const result = await taskSystem.executeTaskManually(taskId);

    if (result.success) {
        await bot.sendMessage(chatId, `✅ ${result.message}`, {
            parse_mode: 'Markdown'
        });
    } else {
        await bot.sendMessage(chatId, `❌ ${result.message}`);
    }
}

/**
 * Extrae el comando del texto (sin @botname)
 */
function extractCommand(text) {
    if (!text) return '';

    // Remover @botname si existe: /comando@botname → /comando
    const parts = text.split('@');
    return parts[0].toLowerCase().trim();
}

/**
 * Envía mensaje de comando no autorizado
 */
async function sendUnauthorizedMessage(bot, chatId, command) {
    const message = `⛔ No tienes permisos para usar el comando ${command}`;
    await bot.sendMessage(chatId, message);
}

/**
 * Envía mensaje de comando desconocido
 */
async function sendUnknownCommand(bot, chatId, command) {
    const message = `❓ Comando desconocido: ${command}\n\nUsa /ayuda para ver los comandos disponibles.`;
    await bot.sendMessage(chatId, message);
}

module.exports = {
    handleCommand,
    handleCallbackQuery
};