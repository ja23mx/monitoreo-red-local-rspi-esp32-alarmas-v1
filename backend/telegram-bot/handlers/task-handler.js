/**
 * Task Handler - Procesador de Datos de Tareas
 * 
 * Procesa datos de tareas enviados en formato *campo*##
 * Valida, parsea y delega operaciones al TaskSystem.
 * 
 * @module telegram-bot/handlers/task-handler
 * @version 1.0.0
 */

const messageParser = require('../services/message-parser');
const messageValidator = require('../utils/message-validator');
const responseBuilder = require('../services/response-builder');
const logger = require('../utils/logger');

/**
 * Estados de conversación por usuario (para flujo multi-paso)
 * Formato: { userId: { action: 'create', step: 1, data: {} } }
 */
const conversationStates = new Map();

/**
 * Maneja datos de tarea enviados por el usuario
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @param {Object} bot - Instancia del bot
 * @param {Object} taskSystem - Instancia del TaskSystem
 */
async function handleTaskData(msg, bot, taskSystem) {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text.trim();

        logger.info(`Datos de tarea recibidos de usuario ${userId}: ${text}`);

        // Validar formato general (debe terminar con ##)
        if (!messageValidator.hasValidTerminator(text)) {
            await bot.sendMessage(chatId, '❌ El mensaje debe terminar con ##');
            return;
        }

        // Determinar si es creación o edición
        const state = conversationStates.get(userId);

        if (state && state.action === 'edit') {
            await handleEditTaskData(msg, bot, taskSystem, state);
        } else {
            await handleCreateTaskData(msg, bot, taskSystem);
        }

    } catch (error) {
        logger.error('Error en handleTaskData:', error);
        await bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
}

/**
 * Procesa datos para crear una nueva tarea
 * Formato esperado: *nombre*HH:MM*track##
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @param {Object} bot - Instancia del bot
 * @param {Object} taskSystem - Instancia del TaskSystem
 */
async function handleCreateTaskData(msg, bot, taskSystem) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    try {
        // Parsear datos
        const parsedData = messageParser.parseCreateTask(text);

        // Validar datos
        const validation = messageValidator.validateTaskCreation(parsedData);
        if (!validation.valid) {
            await bot.sendMessage(chatId, `❌ ${validation.error}`);
            return;
        }

        // Crear tarea en TaskSystem
        const result = await taskSystem.createTask(
            parsedData.name,
            parsedData.hour,
            parsedData.minute,
            parsedData.track
        );

        if (result.success) {
            const message = responseBuilder.buildTaskCreatedMessage(result.task);
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            logger.info(`Tarea creada exitosamente: ${result.task.id}`);
        } else {
            await bot.sendMessage(chatId, `❌ ${result.message}`);
        }

    } catch (error) {
        logger.error('Error creando tarea:', error);
        await bot.sendMessage(chatId, `❌ Error al crear tarea: ${error.message}`);
    }
}

/**
 * Procesa datos para editar una tarea existente
 * Formato esperado: *nombre*HH:MM*pista:track*estado##
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @param {Object} bot - Instancia del bot
 * @param {Object} taskSystem - Instancia del TaskSystem
 * @param {Object} state - Estado de conversación del usuario
 */
async function handleEditTaskData(msg, bot, taskSystem, state) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.trim();
    const taskId = state.taskId;

    try {
        // Parsear datos de edición
        const parsedData = messageParser.parseEditTask(text);

        // Validar datos
        const validation = messageValidator.validateTaskEdit(parsedData);
        if (!validation.valid) {
            await bot.sendMessage(chatId, `❌ ${validation.error}`);
            return;
        }

        // Preparar objeto de actualización
        const updates = {
            name: parsedData.name,
            hour: parsedData.hour,
            minute: parsedData.minute,
            track: parsedData.track,
            enabled: parsedData.enabled
        };

        // Actualizar tarea en TaskSystem
        const result = await taskSystem.updateTask(taskId, updates);

        if (result.success) {
            const message = responseBuilder.buildTaskUpdatedMessage(result.task);
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            logger.info(`Tarea actualizada exitosamente: ${taskId}`);

            // Limpiar estado de conversación
            conversationStates.delete(userId);
        } else {
            await bot.sendMessage(chatId, `❌ ${result.message}`);
        }

    } catch (error) {
        logger.error('Error editando tarea:', error);
        await bot.sendMessage(chatId, `❌ Error al editar tarea: ${error.message}`);
        conversationStates.delete(userId);
    }
}

/**
 * Procesa test manual con track personalizado
 * Formato esperado: *track##
 * 
 * @param {Object} msg - Objeto mensaje de Telegram
 * @param {Object} bot - Instancia del bot
 * @param {Object} taskSystem - Instancia del TaskSystem
 */
async function handleManualTestData(msg, bot, taskSystem) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    try {
        // Parsear track
        const parsedData = messageParser.parseManualTest(text);

        // Validar track
        if (!messageValidator.isValidTrack(parsedData.track)) {
            await bot.sendMessage(chatId, '❌ El track debe estar entre 0 y 999');
            return;
        }

        // Ejecutar test manual
        const result = await taskSystem.executeManualTest(parsedData.track);

        if (result.success) {
            const message = responseBuilder.buildManualTestExecutedMessage(parsedData.track);
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            logger.info(`Test manual ejecutado con track ${parsedData.track}`);
        } else {
            await bot.sendMessage(chatId, `❌ ${result.message}`);
        }

    } catch (error) {
        logger.error('Error ejecutando test manual:', error);
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
}

/**
 * Inicia el flujo de edición de tarea
 * Guarda el estado de conversación para el próximo mensaje
 * 
 * @param {number} userId - ID del usuario
 * @param {string} taskId - ID de la tarea a editar
 */
function startEditFlow(userId, taskId) {
    conversationStates.set(userId, {
        action: 'edit',
        taskId: taskId,
        timestamp: Date.now()
    });

    logger.info(`Flujo de edición iniciado para usuario ${userId}, tarea ${taskId}`);
}

/**
 * Inicia el flujo de test manual
 * 
 * @param {number} userId - ID del usuario
 */
function startManualTestFlow(userId) {
    conversationStates.set(userId, {
        action: 'manual_test',
        timestamp: Date.now()
    });

    logger.info(`Flujo de test manual iniciado para usuario ${userId}`);
}

/**
 * Cancela el flujo actual del usuario
 * 
 * @param {number} userId - ID del usuario
 */
function cancelFlow(userId) {
    conversationStates.delete(userId);
    logger.info(`Flujo cancelado para usuario ${userId}`);
}

/**
 * Obtiene el estado de conversación del usuario
 * 
 * @param {number} userId - ID del usuario
 * @returns {Object|null} Estado de conversación o null
 */
function getConversationState(userId) {
    return conversationStates.get(userId) || null;
}

/**
 * Limpia estados de conversación antiguos (más de 10 minutos)
 */
function cleanupOldStates() {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

    for (const [userId, state] of conversationStates.entries()) {
        if (state.timestamp < tenMinutesAgo) {
            conversationStates.delete(userId);
            logger.info(`Estado de conversación expirado limpiado para usuario ${userId}`);
        }
    }
}

// Ejecutar limpieza cada 5 minutos
setInterval(cleanupOldStates, 5 * 60 * 1000);

module.exports = {
    handleTaskData,
    handleCreateTaskData,
    handleEditTaskData,
    handleManualTestData,
    startEditFlow,
    startManualTestFlow,
    cancelFlow,
    getConversationState
};