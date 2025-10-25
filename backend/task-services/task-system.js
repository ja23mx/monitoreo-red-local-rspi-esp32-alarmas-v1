/**
 * TaskSystem - Sistema de Tareas Programadas (Singleton)
 * @brief Orquestador principal del sistema de tareas automatizadas con CRUD completo
 * 
 * Funcionalidades:
 * - Gestión completa de tareas (CREATE, READ, UPDATE, DELETE)
 * - Máximo 10 tareas configurables
 * - Integración con MQTT para broadcast de comandos
 * - Configuración dinámica vía JSON
 * - Ejecución manual y automática
 * - API para bot de Telegram
 * 
 * @author Sistema de Monitoreo Local
 * @version 2.0.0
 */

const TaskScheduler = require('./task-scheduler');
const TaskExecutor = require('./task-executor');
const TaskConfigManager = require('../../data/task-config-manager');

class TaskSystem {
    constructor() {
        this.mqttClient = null;
        this.config = null;
        this.scheduler = null;
        this.executor = null;
        this.isRunning = false;
        this.isInitialized = false;

        console.log('[TaskSystem] Instancia creada');
    }

    /**
     * Configura el cliente MQTT para publicación de comandos
     * @param {Object} mqttClient - Cliente MQTT conectado
     */
    setMqttClient(mqttClient) {
        if (!mqttClient) {
            console.error('[TaskSystem] Cliente MQTT inválido');
            return false;
        }

        this.mqttClient = mqttClient;
        this.isInitialized = true;
        console.log('[TaskSystem] Cliente MQTT configurado');
        return true;
    }

    /**
     * Inicia el sistema de tareas
     * - Carga configuración desde JSON
     * - Inicializa TaskExecutor
     * - Inicia TaskScheduler
     * @returns {Boolean} True si inició correctamente
     */
    async start() {
        try {
            if (!this.isInitialized) {
                console.error('[TaskSystem] No se puede iniciar: MQTT client no configurado');
                return false;
            }

            if (this.isRunning) {
                console.warn('[TaskSystem] Sistema ya está en ejecución');
                return true;
            }

            console.log('[TaskSystem] Iniciando sistema de tareas...');

            // Cargar configuración
            this.config = await TaskConfigManager.loadConfig();
            if (!this.config) {
                console.error('[TaskSystem] Error al cargar configuración');
                return false;
            }

            // Validar configuración
            const validation = this._validateConfig(this.config);
            if (!validation.valid) {
                console.error('[TaskSystem] Configuración inválida:', validation.errors);
                return false;
            }

            // Inicializar TaskExecutor
            this.executor = new TaskExecutor(this.mqttClient);

            // Inicializar y arrancar TaskScheduler
            this.scheduler = new TaskScheduler(this.config, this.executor);
            this.scheduler.start();

            this.isRunning = true;

            const taskCount = this.getTaskCount();
            console.log('[TaskSystem] ✓ Sistema iniciado correctamente');
            console.log(`[TaskSystem] Tareas cargadas: ${taskCount}`);
            
            // Mostrar próximas ejecuciones
            const nextExecutions = this.getNextExecutions();
            if (nextExecutions.length > 0) {
                console.log('[TaskSystem] Próximas ejecuciones:');
                nextExecutions.forEach(exec => {
                    console.log(`  - ${exec.name} (${exec.id}): ${exec.nextExecution}`);
                });
            }

            return true;

        } catch (error) {
            console.error('[TaskSystem] Error al iniciar:', error);
            return false;
        }
    }

    /**
     * Detiene el sistema de tareas
     */
    stop() {
        if (!this.isRunning) {
            console.warn('[TaskSystem] Sistema no está en ejecución');
            return;
        }

        console.log('[TaskSystem] Deteniendo sistema de tareas...');

        if (this.scheduler) {
            this.scheduler.stop();
        }

        this.isRunning = false;
        console.log('[TaskSystem] ✓ Sistema detenido');
    }

    /**
     * Recarga la configuración desde el archivo JSON
     * Útil cuando se modifica externamente (ej: bot de Telegram)
     * @returns {Boolean} True si recargó exitosamente
     */
    async reloadConfig() {
        try {
            console.log('[TaskSystem] Recargando configuración...');

            const newConfig = await TaskConfigManager.loadConfig();
            if (!newConfig) {
                console.error('[TaskSystem] Error al recargar configuración');
                return false;
            }

            // Validar nueva configuración
            const validation = this._validateConfig(newConfig);
            if (!validation.valid) {
                console.error('[TaskSystem] Nueva configuración inválida:', validation.errors);
                return false;
            }

            this.config = newConfig;

            // Actualizar scheduler con nueva config
            if (this.scheduler) {
                this.scheduler.updateConfig(this.config);
            }

            console.log('[TaskSystem] ✓ Configuración recargada');
            console.log(`[TaskSystem] Tareas activas: ${this.getTaskCount()}`);

            return true;

        } catch (error) {
            console.error('[TaskSystem] Error al recargar configuración:', error);
            return false;
        }
    }

    // ==================== CREATE ====================

    /**
     * Crea una nueva tarea programada
     * @param {String} name - Nombre de la tarea (3-50 caracteres)
     * @param {Number} hour - Hora (0-23)
     * @param {Number} minute - Minuto (0-59)
     * @param {Number} track - Track de audio (0-999)
     * @param {Boolean} enabled - Habilitar tarea (default: true)
     * @returns {Object} Resultado { success, taskId, task, message, error }
     */
    async createTask(name, hour, minute, track = 11, enabled = true) {
        try {
            if (!this.isRunning) {
                return { success: false, error: 'SYSTEM_NOT_RUNNING', message: 'Sistema no iniciado' };
            }

            // Validar parámetros
            const validation = this._validateTaskParams(name, hour, minute, track);
            if (!validation.valid) {
                return { success: false, error: 'INVALID_PARAMS', message: validation.error };
            }

            // Usar TaskConfigManager para crear
            const result = await TaskConfigManager.createTask(name, hour, minute, track, enabled);
            
            if (!result.success) {
                return result;
            }

            // Recargar configuración
            await this.reloadConfig();

            console.log(`[TaskSystem] ✓ Tarea creada: ${result.taskId} - "${name}"`);

            return {
                success: true,
                taskId: result.taskId,
                task: result.task,
                message: `Tarea "${name}" creada exitosamente`,
                nextExecution: this.getNextExecution(result.taskId)
            };

        } catch (error) {
            console.error('[TaskSystem] Error creando tarea:', error);
            return { success: false, error: 'CREATE_ERROR', message: error.message };
        }
    }

    // ==================== READ ====================

    /**
     * Lista todas las tareas configuradas
     * @returns {Array} Array de tareas con info completa
     */
    listTasks() {
        if (!this.config || !this.config.tasks) {
            return [];
        }

        const tasks = [];
        
        for (const [taskId, task] of Object.entries(this.config.tasks)) {
            tasks.push({
                id: task.id,
                name: task.name,
                enabled: task.enabled,
                schedule: {
                    hour: task.schedule.hour,
                    minute: task.schedule.minute,
                    formatted: `${task.schedule.hour.toString().padStart(2, '0')}:${task.schedule.minute.toString().padStart(2, '0')}`
                },
                track: task.action.payload.track,
                lastExecution: task.lastExecution,
                nextExecution: this.getNextExecution(taskId),
                createdAt: task.createdAt
            });
        }

        // Ordenar por hora programada
        tasks.sort((a, b) => {
            const timeA = a.schedule.hour * 60 + a.schedule.minute;
            const timeB = b.schedule.hour * 60 + b.schedule.minute;
            return timeA - timeB;
        });

        return tasks;
    }

    /**
     * Obtiene una tarea específica
     * @param {String} taskId - ID de la tarea
     * @returns {Object|null} Objeto de tarea o null
     */
    getTask(taskId) {
        if (!this.config || !this.config.tasks || !this.config.tasks[taskId]) {
            return null;
        }

        const task = this.config.tasks[taskId];

        return {
            id: task.id,
            name: task.name,
            enabled: task.enabled,
            schedule: {
                hour: task.schedule.hour,
                minute: task.schedule.minute,
                timezone: task.schedule.timezone
            },
            track: task.action.payload.track,
            tolerance_minutes: task.tolerance_minutes,
            lastExecution: task.lastExecution,
            nextExecution: this.getNextExecution(taskId),
            createdAt: task.createdAt
        };
    }

    /**
     * Obtiene el número de tareas configuradas
     * @returns {Number} Cantidad de tareas
     */
    getTaskCount() {
        if (!this.config || !this.config.tasks) {
            return 0;
        }
        return Object.keys(this.config.tasks).length;
    }

    // ==================== UPDATE ====================

    /**
     * Actualiza una tarea existente
     * @param {String} taskId - ID de la tarea
     * @param {Object} updates - Campos a actualizar { name?, hour?, minute?, track?, enabled? }
     * @returns {Object} Resultado { success, message, error }
     */
    async updateTask(taskId, updates) {
        try {
            if (!this.isRunning) {
                return { success: false, error: 'SYSTEM_NOT_RUNNING', message: 'Sistema no iniciado' };
            }

            if (!taskId) {
                return { success: false, error: 'MISSING_TASK_ID', message: 'ID de tarea requerido' };
            }

            // Verificar que la tarea existe
            if (!this.config.tasks[taskId]) {
                return { success: false, error: 'TASK_NOT_FOUND', message: `Tarea ${taskId} no encontrada` };
            }

            // Validar updates
            const validation = this._validateUpdates(updates);
            if (!validation.valid) {
                return { success: false, error: 'INVALID_UPDATES', message: validation.error };
            }

            // Usar TaskConfigManager para actualizar
            const result = await TaskConfigManager.updateTask(taskId, updates);
            
            if (!result.success) {
                return result;
            }

            // Recargar configuración
            await this.reloadConfig();

            console.log(`[TaskSystem] ✓ Tarea actualizada: ${taskId}`);

            return {
                success: true,
                taskId,
                message: `Tarea ${taskId} actualizada exitosamente`,
                task: this.getTask(taskId)
            };

        } catch (error) {
            console.error('[TaskSystem] Error actualizando tarea:', error);
            return { success: false, error: 'UPDATE_ERROR', message: error.message };
        }
    }

    // ==================== DELETE ====================

    /**
     * Elimina una tarea
     * @param {String} taskId - ID de la tarea
     * @returns {Object} Resultado { success, message, error }
     */
    async deleteTask(taskId) {
        try {
            if (!this.isRunning) {
                return { success: false, error: 'SYSTEM_NOT_RUNNING', message: 'Sistema no iniciado' };
            }

            if (!taskId) {
                return { success: false, error: 'MISSING_TASK_ID', message: 'ID de tarea requerido' };
            }

            // Verificar que la tarea existe
            if (!this.config.tasks[taskId]) {
                return { success: false, error: 'TASK_NOT_FOUND', message: `Tarea ${taskId} no encontrada` };
            }

            const taskName = this.config.tasks[taskId].name;

            // Usar TaskConfigManager para eliminar
            const result = await TaskConfigManager.deleteTask(taskId);
            
            if (!result.success) {
                return result;
            }

            // Recargar configuración
            await this.reloadConfig();

            console.log(`[TaskSystem] ✓ Tarea eliminada: ${taskId} - "${taskName}"`);

            return {
                success: true,
                taskId,
                message: `Tarea "${taskName}" eliminada exitosamente`,
                remainingTasks: this.getTaskCount()
            };

        } catch (error) {
            console.error('[TaskSystem] Error eliminando tarea:', error);
            return { success: false, error: 'DELETE_ERROR', message: error.message };
        }
    }

    // ==================== EXECUTE ====================

    /**
     * Ejecuta una tarea específica manualmente
     * @param {String} taskId - ID de la tarea
     * @returns {Object} Resultado de la ejecución
     */
    async executeTask(taskId) {
        try {
            if (!this.isRunning) {
                return { success: false, error: 'Sistema no iniciado' };
            }

            if (!this.config.tasks[taskId]) {
                return { success: false, error: `Tarea ${taskId} no encontrada` };
            }

            console.log(`[TaskSystem] Ejecutando tarea ${taskId} manualmente...`);

            const task = this.config.tasks[taskId];
            const result = await this.executor.execute(task, true); // true = manual

            if (result.success) {
                console.log(`[TaskSystem] ✓ Tarea ${taskId} ejecutada exitosamente`);
            } else {
                console.error(`[TaskSystem] ✗ Error ejecutando tarea ${taskId}:`, result.error);
            }

            return result;

        } catch (error) {
            console.error(`[TaskSystem] Error ejecutando tarea ${taskId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ejecuta un test con track personalizado
     * @param {Number} track - Track de audio (0-999)
     * @returns {Object} Resultado de la ejecución
     */
    async executeTestByTrack(track) {
        try {
            if (!this.isRunning) {
                return { success: false, error: 'Sistema no iniciado' };
            }

            if (typeof track !== 'number' || track < 0 || track >= 1000) {
                return { success: false, error: 'Track inválido (debe ser 0-999)' };
            }

            console.log(`[TaskSystem] Ejecutando test manual con track ${track}...`);

            // Crear tarea temporal
            const tempTask = {
                action: {
                    topic: 'SYSTEM/TEST',
                    payload: {
                        event: 'play_track',
                        track
                    }
                }
            };

            const result = await this.executor.execute(tempTask, true);

            if (result.success) {
                console.log(`[TaskSystem] ✓ Test ejecutado exitosamente con track ${track}`);
            }

            return result;

        } catch (error) {
            console.error('[TaskSystem] Error ejecutando test:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== STATUS & INFO ====================

    /**
     * Obtiene el estado actual del sistema
     * @returns {Object} Estado completo del sistema
     */
    getStatus() {
        if (!this.config) {
            return {
                isRunning: false,
                isInitialized: this.isInitialized,
                message: 'Configuración no cargada'
            };
        }

        return {
            isRunning: this.isRunning,
            isInitialized: this.isInitialized,
            globalEnabled: this.config.global_settings.enabled,
            taskCount: this.getTaskCount(),
            maxTasks: this.config.global_settings.max_tasks,
            availableSlots: this.config.global_settings.max_tasks - this.getTaskCount(),
            checkInterval: this.config.global_settings.check_interval_ms,
            tasks: this.listTasks()
        };
    }

    /**
     * Obtiene las próximas ejecuciones ordenadas cronológicamente
     * @returns {Array} Array de próximas ejecuciones
     */
    getNextExecutions() {
        const executions = [];

        if (!this.config || !this.config.tasks) {
            return executions;
        }

        for (const [taskId, task] of Object.entries(this.config.tasks)) {
            if (task.enabled) {
                const nextExec = this.getNextExecution(taskId);
                if (nextExec) {
                    executions.push({
                        id: taskId,
                        name: task.name,
                        nextExecution: nextExec,
                        hour: task.schedule.hour,
                        minute: task.schedule.minute
                    });
                }
            }
        }

        // Ordenar por hora programada
        executions.sort((a, b) => {
            const timeA = a.hour * 60 + a.minute;
            const timeB = b.hour * 60 + b.minute;
            return timeA - timeB;
        });

        return executions;
    }

    /**
     * Obtiene la próxima ejecución programada de una tarea
     * @param {String} taskId - ID de la tarea
     * @returns {String|null} Fecha/hora de próxima ejecución o null
     */
    getNextExecution(taskId) {
        if (!this.scheduler || !this.config) {
            return null;
        }

        const task = this.config.tasks[taskId];
        if (!task || !task.enabled) {
            return null;
        }

        return this.scheduler.calculateNextExecution(task);
    }

    // ==================== VALIDACIONES PRIVADAS ====================

    /**
     * Valida parámetros para crear tarea
     * @private
     */
    _validateTaskParams(name, hour, minute, track) {
        if (!name || typeof name !== 'string') {
            return { valid: false, error: 'Nombre es requerido' };
        }

        if (name.length < 3 || name.length > 50) {
            return { valid: false, error: 'Nombre debe tener entre 3 y 50 caracteres' };
        }

        if (typeof hour !== 'number' || hour < 0 || hour > 23) {
            return { valid: false, error: 'Hora inválida (debe ser 0-23)' };
        }

        if (typeof minute !== 'number' || minute < 0 || minute > 59) {
            return { valid: false, error: 'Minuto inválido (debe ser 0-59)' };
        }

        if (typeof track !== 'number' || track < 0 || track >= 1000) {
            return { valid: false, error: 'Track inválido (debe ser 0-999)' };
        }

        return { valid: true };
    }

    /**
     * Valida objeto de updates
     * @private
     */
    _validateUpdates(updates) {
        if (!updates || typeof updates !== 'object') {
            return { valid: false, error: 'Updates debe ser un objeto' };
        }

        if (updates.name !== undefined) {
            if (typeof updates.name !== 'string' || updates.name.length < 3 || updates.name.length > 50) {
                return { valid: false, error: 'Nombre debe tener entre 3 y 50 caracteres' };
            }
        }

        if (updates.hour !== undefined) {
            if (typeof updates.hour !== 'number' || updates.hour < 0 || updates.hour > 23) {
                return { valid: false, error: 'Hora inválida (debe ser 0-23)' };
            }
        }

        if (updates.minute !== undefined) {
            if (typeof updates.minute !== 'number' || updates.minute < 0 || updates.minute > 59) {
                return { valid: false, error: 'Minuto inválido (debe ser 0-59)' };
            }
        }

        if (updates.track !== undefined) {
            if (typeof updates.track !== 'number' || updates.track < 0 || updates.track >= 1000) {
                return { valid: false, error: 'Track inválido (debe ser 0-999)' };
            }
        }

        if (updates.enabled !== undefined) {
            if (typeof updates.enabled !== 'boolean') {
                return { valid: false, error: 'Enabled debe ser booleano' };
            }
        }

        return { valid: true };
    }

    /**
     * Valida la estructura de configuración
     * @private
     */
    _validateConfig(config) {
        const errors = [];

        if (!config.tasks || typeof config.tasks !== 'object') {
            errors.push('Estructura de tareas inválida');
        }

        if (!config.global_settings) {
            errors.push('Falta global_settings');
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        // Validar cada tarea
        for (const [taskId, task] of Object.entries(config.tasks)) {
            if (!task.schedule || !task.action) {
                errors.push(`Tarea ${taskId}: estructura incompleta`);
                continue;
            }

            const hour = task.schedule.hour;
            const minute = task.schedule.minute;

            if (typeof hour !== 'number' || hour < 0 || hour > 23) {
                errors.push(`Tarea ${taskId}: hora inválida`);
            }

            if (typeof minute !== 'number' || minute < 0 || minute > 59) {
                errors.push(`Tarea ${taskId}: minuto inválido`);
            }

            const track = task.action.payload?.track;
            if (typeof track !== 'number' || track < 0 || track >= 1000) {
                errors.push(`Tarea ${taskId}: track inválido`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Exportar instancia singleton
const taskSystem = new TaskSystem();
module.exports = { taskSystem };