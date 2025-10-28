/**
 * Telegram Bot Manager - Singleton Principal
 * 
 * Orquestador central del bot de Telegram que coordina todos los handlers,
 * servicios y gestiona el ciclo de vida del bot.
 * 
 * @module telegram-bot/telegram-bot-manager
 * @version 1.0.0
 */

const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs').promises;

// Importar handlers
const messageHandler = require('./handlers/message-handler');
const commandHandler = require('./handlers/command-handler');
const notificationHandler = require('./handlers/notification-handler');

// Importar servicios
const authService = require('./services/auth-service');

// Importar utilidades
const logger = require('./utils/logger');

/**
 * Clase Singleton TelegramBotManager
 */
class TelegramBotManager {
    constructor() {
        if (TelegramBotManager.instance) {
            return TelegramBotManager.instance;
        }

        this.bot = null;
        this.taskSystem = null;
        this.isRunning = false;
        this.config = null;
        this.configPath = path.join(__dirname, '../../data/telegram-config.json');

        TelegramBotManager.instance = this;
    }

    /**
     * Configura el TaskSystem para operaciones CRUD de tareas
     * 
     * @param {Object} taskSystem - Instancia del TaskSystem
     */
    setTaskSystem(taskSystem) {
        if (!taskSystem) {
            throw new Error('TaskSystem no puede ser null');
        }
        this.taskSystem = taskSystem;
        logger.info('TaskSystem configurado en TelegramBotManager');
    }

    /**
     * Carga la configuración desde telegram-config.json
     * 
     * @returns {Promise<Object>} Configuración cargada
     */
    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
            logger.info('Configuración de Telegram cargada exitosamente');
            return this.config;
        } catch (error) {
            logger.error('Error cargando configuración de Telegram:', error);
            throw new Error(`No se pudo cargar telegram-config.json: ${error.message}`);
        }
    }

    /**
     * Valida la configuración cargada
     */
    validateConfig() {
        if (!this.config) {
            throw new Error('Configuración no cargada');
        }

        if (!this.config.bot_token) {
            throw new Error('bot_token no encontrado en telegram-config.json');
        }

        if (!this.config.authorized_users || !Array.isArray(this.config.authorized_users)) {
            throw new Error('authorized_users debe ser un array en telegram-config.json');
        }

        if (!this.config.notification_group) {
            throw new Error('notification_group no encontrado en telegram-config.json');
        }

        logger.info('Configuración validada correctamente');
    }

    /**
     * Inicializa el bot de Telegram
     * 
     * @returns {Promise<void>}
     */
    async start() {
        try {
            if (this.isRunning) {
                logger.warn('El bot ya está en ejecución');
                return;
            }

            logger.info('Iniciando TelegramBotManager...');

            // Cargar y validar configuración
            await this.loadConfig();
            this.validateConfig();

            // Inicializar servicios
            await authService.initialize(this.config);

            // Crear instancia del bot
            this.bot = new TelegramBot(this.config.bot_token, {
                polling: {
                    interval: 300,
                    autoStart: true,
                    params: {
                        timeout: 10
                    }
                }
            });

            // Configurar handlers
            this.setupHandlers();

            // Registrar comandos
            await this.registerBotCommands();

            this.isRunning = true;
            logger.info('✅ TelegramBotManager iniciado exitosamente');

        } catch (error) {
            logger.error('Error al iniciar TelegramBotManager:', error);
            throw error;
        }
    }

    /**
     * Configura todos los handlers de eventos del bot
     */
    setupHandlers() {
        logger.info('Configurando handlers del bot...');

        // Handler para todos los mensajes
        this.bot.on('message', async (msg) => {
            try {
                await messageHandler.handleMessage(msg, this.bot, this.taskSystem);
            } catch (error) {
                logger.error('Error en message handler:', error);
            }
        });

        // Handler para callback queries (botones inline)
        this.bot.on('callback_query', async (query) => {
            try {
                await commandHandler.handleCallbackQuery(query, this.bot, this.taskSystem);
            } catch (error) {
                logger.error('Error en callback query handler:', error);
            }
        });

        // Handler para errores del bot
        this.bot.on('polling_error', (error) => {
            logger.error('Error de polling:', error);
        });

        logger.info('✅ Handlers configurados');
    }

    /**
     * Registra los comandos del bot en Telegram
     */
    async registerBotCommands() {
        try {
            const commands = [
                { command: 'creartarea', description: 'Crear nueva tarea programada' },
                { command: 'listartareas', description: 'Listar todas las tareas' },
                { command: 'testmanual', description: 'Ejecutar test manual de audio' },
                { command: 'status', description: 'Ver estado del sistema' },
                { command: 'ayuda', description: 'Mostrar ayuda de comandos' }
            ];

            await this.bot.setMyCommands(commands);
            logger.info('✅ Comandos del bot registrados en Telegram');
        } catch (error) {
            logger.error('Error registrando comandos del bot:', error);
        }
    }

    /**
     * Notifica un evento de botón presionado al grupo configurado
     * 
     * @param {Object} eventData - Datos del evento
     * @param {string} eventData.deviceId - ID del dispositivo
     * @param {string} eventData.mac - Dirección MAC
     * @param {string} eventData.timestamp - Timestamp ISO 8601
     * @param {string} eventData.topic - Topic MQTT
     */
    async notifyButtonEvent(eventData) {
        try {
            if (!this.isRunning) {
                logger.warn('Bot no está en ejecución, no se puede notificar');
                return;
            }

            await notificationHandler.sendButtonAlert(
                this.bot,
                this.config.notification_group,
                eventData
            );

        } catch (error) {
            logger.error('Error notificando evento de botón:', error);
        }
    }

    /**
     * Detiene el bot de forma limpia
     * 
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            if (!this.isRunning) {
                logger.warn('El bot no está en ejecución');
                return;
            }

            logger.info('Deteniendo TelegramBotManager...');

            if (this.bot) {
                await this.bot.stopPolling();
                this.bot = null;
            }

            this.isRunning = false;
            logger.info('✅ TelegramBotManager detenido exitosamente');

        } catch (error) {
            logger.error('Error al detener TelegramBotManager:', error);
            throw error;
        }
    }

    /**
     * Obtiene el número de usuarios autorizados
     * 
     * @returns {number}
     */
    getAuthorizedUsersCount() {
        return this.config?.authorized_users?.length || 0;
    }

    /**
     * Verifica si el grupo de notificaciones está habilitado
     * 
     * @returns {boolean}
     */
    isNotificationGroupEnabled() {
        return this.config?.notification_group?.enabled || false;
    }

    /**
     * Obtiene el estado actual del bot
     * 
     * @returns {Object}
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            authorizedUsers: this.getAuthorizedUsersCount(),
            notificationGroupEnabled: this.isNotificationGroupEnabled(),
            taskSystemConnected: this.taskSystem !== null
        };
    }
}

// Crear y exportar instancia única (Singleton)
const telegramBotManager = new TelegramBotManager();

module.exports = {
    telegramBotManager
};