/**
 * TaskConfigManager - Gestor de Configuración de Tareas
 * @brief Maneja la lectura/escritura del archivo task-config.json con CRUD completo
 * 
 * Funcionalidades:
 * - Carga de configuración desde JSON
 * - Guardado de configuración
 * - CRUD completo de tareas (Create, Read, Update, Delete)
 * - Validación de estructura y conflictos
 * - Auto-generación de IDs
 * - Máximo 10 tareas
 * 
 * @author Sistema de Monitoreo Local
 * @version 2.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class TaskConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, 'task-config.json');
        console.log('[TaskConfigManager] Ruta de configuración:', this.configPath);
    }

    // ==================== LOAD & SAVE ====================

    /**
     * Carga la configuración desde el archivo JSON
     * Si no existe, crea uno con valores por defecto
     * @returns {Promise<Object|null>} Configuración cargada o null en caso de error
     */
    async loadConfig() {
        try {
            // Verificar si el archivo existe
            const fileExists = await this._fileExists(this.configPath);

            if (!fileExists) {
                console.log('[TaskConfigManager] Archivo no existe, creando configuración por defecto...');
                const defaultConfig = this._getDefaultConfig();
                await this.saveConfig(defaultConfig);
                return defaultConfig;
            }

            // Leer archivo
            const fileContent = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(fileContent);

            console.log('[TaskConfigManager] ✓ Configuración cargada exitosamente');
            return config;

        } catch (error) {
            console.error('[TaskConfigManager] Error cargando configuración:', error);

            // Intentar retornar configuración por defecto como fallback
            console.log('[TaskConfigManager] Usando configuración por defecto como fallback');
            return this._getDefaultConfig();
        }
    }

    /**
     * Guarda la configuración en el archivo JSON
     * @param {Object} config - Configuración a guardar
     * @returns {Promise<Boolean>} True si guardó exitosamente
     */
    async saveConfig(config) {
        try {
            if (!config) {
                console.error('[TaskConfigManager] Configuración inválida para guardar');
                return false;
            }

            // Actualizar metadata
            this._updateMetadata(config);

            // Formatear JSON con indentación para legibilidad
            const jsonContent = JSON.stringify(config, null, 4);

            // Escribir archivo
            await fs.writeFile(this.configPath, jsonContent, 'utf8');

            console.log('[TaskConfigManager] ✓ Configuración guardada exitosamente');
            return true;

        } catch (error) {
            console.error('[TaskConfigManager] Error guardando configuración:', error);
            return false;
        }
    }

    // ==================== CREATE ====================

    /**
     * Crea una nueva tarea
     * @param {String} name - Nombre de la tarea
     * @param {Number} hour - Hora (0-23)
     * @param {Number} minute - Minuto (0-59)
     * @param {Number} track - Track de audio (0-999)
     * @param {Boolean} enabled - Habilitar tarea
     * @returns {Promise<Object>} Resultado { success, taskId, task, message, error }
     */
    async createTask(name, hour, minute, track = 11, enabled = true) {
        try {
            const config = await this.loadConfig();
            if (!config) {
                return { success: false, error: 'CONFIG_LOAD_ERROR', message: 'Error al cargar configuración' };
            }

            // Validar límite de tareas
            const currentCount = Object.keys(config.tasks).length;
            const maxTasks = config.global_settings.max_tasks || 10;

            if (currentCount >= maxTasks) {
                return {
                    success: false,
                    error: 'TASK_LIMIT_REACHED',
                    message: `Máximo de ${maxTasks} tareas alcanzado`,
                    currentCount
                };
            }

            // Validar nombre único
            const nameExists = Object.values(config.tasks).some(task => task.name === name);
            if (nameExists) {
                return { success: false, error: 'DUPLICATE_NAME', message: `Ya existe una tarea con el nombre "${name}"` };
            }

            // Validar conflicto de horario
            const scheduleConflict = this._validateScheduleConflict(config.tasks, hour, minute);
            if (scheduleConflict) {
                return {
                    success: false,
                    error: 'DUPLICATE_SCHEDULE',
                    message: `Ya existe una tarea programada a las ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                    conflictingTask: scheduleConflict
                };
            }

            // Generar ID único
            const taskId = this._generateTaskId(config.tasks);
            if (!taskId) {
                return { success: false, error: 'ID_GENERATION_ERROR', message: 'No se pudo generar ID de tarea' };
            }

            // Crear nueva tarea
            const newTask = {
                id: taskId,
                name,
                enabled,
                schedule: {
                    hour,
                    minute,
                    timezone: "America/Mexico_City"
                },
                action: {
                    type: "mqtt_broadcast",
                    topic: "SYSTEM/TEST",
                    payload: {
                        event: "play_track",
                        track
                    }
                },
                tolerance_minutes: config.global_settings.default_tolerance_minutes || 5,
                createdAt: new Date().toISOString(),
                lastExecution: null,
                nextExecution: null
            };

            // Agregar a configuración
            config.tasks[taskId] = newTask;

            // Guardar
            const saved = await this.saveConfig(config);
            if (!saved) {
                return { success: false, error: 'SAVE_ERROR', message: 'Error al guardar configuración' };
            }

            console.log(`[TaskConfigManager] ✓ Tarea creada: ${taskId} - "${name}"`);

            return {
                success: true,
                taskId,
                task: newTask,
                message: `Tarea "${name}" creada exitosamente`
            };

        } catch (error) {
            console.error('[TaskConfigManager] Error creando tarea:', error);
            return { success: false, error: 'CREATE_ERROR', message: error.message };
        }
    }

    // ==================== READ ====================

    /**
     * Obtiene una tarea específica
     * @param {String} taskId - ID de la tarea
     * @returns {Promise<Object|null>} Tarea o null
     */
    async getTask(taskId) {
        try {
            const config = await this.loadConfig();
            if (!config || !config.tasks[taskId]) {
                return null;
            }

            return config.tasks[taskId];

        } catch (error) {
            console.error('[TaskConfigManager] Error obteniendo tarea:', error);
            return null;
        }
    }

    /**
     * Lista todas las tareas
     * @returns {Promise<Array>} Array de tareas
     */
    async listTasks() {
        try {
            const config = await this.loadConfig();
            if (!config || !config.tasks) {
                return [];
            }

            return Object.values(config.tasks);

        } catch (error) {
            console.error('[TaskConfigManager] Error listando tareas:', error);
            return [];
        }
    }

    /**
     * Obtiene el conteo de tareas
     * @returns {Promise<Number>} Número de tareas
     */
    async getTaskCount() {
        try {
            const config = await this.loadConfig();
            if (!config || !config.tasks) {
                return 0;
            }

            return Object.keys(config.tasks).length;

        } catch (error) {
            console.error('[TaskConfigManager] Error obteniendo conteo:', error);
            return 0;
        }
    }

    // ==================== UPDATE ====================

    /**
     * Actualiza una tarea existente
     * @param {String} taskId - ID de la tarea
     * @param {Object} updates - Campos a actualizar { name?, hour?, minute?, track?, enabled? }
     * @returns {Promise<Object>} Resultado { success, message, error }
     */
    async updateTask(taskId, updates) {
        try {
            const config = await this.loadConfig();
            if (!config) {
                return { success: false, error: 'CONFIG_LOAD_ERROR', message: 'Error al cargar configuración' };
            }

            // Verificar que la tarea existe
            if (!config.tasks[taskId]) {
                return { success: false, error: 'TASK_NOT_FOUND', message: `Tarea ${taskId} no encontrada` };
            }

            const task = config.tasks[taskId];

            // Validar nombre único (si se está actualizando)
            if (updates.name && updates.name !== task.name) {
                const nameExists = Object.values(config.tasks).some(
                    t => t.id !== taskId && t.name === updates.name
                );
                if (nameExists) {
                    return { success: false, error: 'DUPLICATE_NAME', message: `Ya existe una tarea con el nombre "${updates.name}"` };
                }
            }

            // Validar conflicto de horario (si se está actualizando hora o minuto)
            if (updates.hour !== undefined || updates.minute !== undefined) {
                const newHour = updates.hour !== undefined ? updates.hour : task.schedule.hour;
                const newMinute = updates.minute !== undefined ? updates.minute : task.schedule.minute;

                const scheduleConflict = this._validateScheduleConflict(config.tasks, newHour, newMinute, taskId);
                if (scheduleConflict) {
                    return {
                        success: false,
                        error: 'DUPLICATE_SCHEDULE',
                        message: `Ya existe una tarea programada a las ${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`,
                        conflictingTask: scheduleConflict
                    };
                }
            }

            // Actualizar campos
            if (updates.name !== undefined) {
                task.name = updates.name;
            }

            if (updates.hour !== undefined) {
                task.schedule.hour = updates.hour;
            }

            if (updates.minute !== undefined) {
                task.schedule.minute = updates.minute;
            }

            if (updates.track !== undefined) {
                task.action.payload.track = updates.track;
            }

            if (updates.enabled !== undefined) {
                task.enabled = updates.enabled;
            }

            // Guardar
            const saved = await this.saveConfig(config);
            if (!saved) {
                return { success: false, error: 'SAVE_ERROR', message: 'Error al guardar configuración' };
            }

            console.log(`[TaskConfigManager] ✓ Tarea actualizada: ${taskId}`);

            return {
                success: true,
                taskId,
                message: `Tarea ${taskId} actualizada exitosamente`,
                task
            };

        } catch (error) {
            console.error('[TaskConfigManager] Error actualizando tarea:', error);
            return { success: false, error: 'UPDATE_ERROR', message: error.message };
        }
    }

    /**
     * Actualiza el timestamp de última ejecución
     * @param {String} taskId - ID de la tarea
     * @param {String} timestamp - Timestamp ISO 8601
     * @returns {Promise<Boolean>} True si actualizó exitosamente
     */
    async updateLastExecution(taskId, timestamp) {
        try {
            const config = await this.loadConfig();
            if (!config || !config.tasks[taskId]) {
                return false;
            }

            config.tasks[taskId].lastExecution = timestamp;
            return await this.saveConfig(config);

        } catch (error) {
            console.error('[TaskConfigManager] Error actualizando lastExecution:', error);
            return false;
        }
    }

    // ==================== DELETE ====================

    /**
     * Elimina una tarea
     * @param {String} taskId - ID de la tarea
     * @returns {Promise<Object>} Resultado { success, message, error }
     */
    async deleteTask(taskId) {
        try {
            const config = await this.loadConfig();
            if (!config) {
                return { success: false, error: 'CONFIG_LOAD_ERROR', message: 'Error al cargar configuración' };
            }

            // Verificar que la tarea existe
            if (!config.tasks[taskId]) {
                return { success: false, error: 'TASK_NOT_FOUND', message: `Tarea ${taskId} no encontrada` };
            }

            const taskName = config.tasks[taskId].name;

            // Eliminar tarea
            delete config.tasks[taskId];

            // Guardar
            const saved = await this.saveConfig(config);
            if (!saved) {
                return { success: false, error: 'SAVE_ERROR', message: 'Error al guardar configuración' };
            }

            console.log(`[TaskConfigManager] ✓ Tarea eliminada: ${taskId} - "${taskName}"`);

            return {
                success: true,
                taskId,
                message: `Tarea "${taskName}" eliminada exitosamente`,
                remainingTasks: Object.keys(config.tasks).length
            };

        } catch (error) {
            console.error('[TaskConfigManager] Error eliminando tarea:', error);
            return { success: false, error: 'DELETE_ERROR', message: error.message };
        }
    }

    // ==================== HELPERS ====================

    /**
     * Genera un ID único para nueva tarea
     * @private
     * @param {Object} tasks - Tareas existentes
     * @returns {String|null} ID generado o null
     */
    _generateTaskId(tasks) {
        for (let i = 1; i <= 10; i++) {
            const id = `audio_test_${i}`;
            if (!tasks[id]) {
                return id;
            }
        }
        return null; // Máximo alcanzado
    }

    /**
     * Valida si existe conflicto de horario
     * @private
     * @param {Object} tasks - Tareas existentes
     * @param {Number} hour - Hora a validar
     * @param {Number} minute - Minuto a validar
     * @param {String} excludeTaskId - ID de tarea a excluir de validación
     * @returns {String|null} ID de tarea conflictiva o null
     */
    _validateScheduleConflict(tasks, hour, minute, excludeTaskId = null) {
        for (const [taskId, task] of Object.entries(tasks)) {
            if (excludeTaskId && taskId === excludeTaskId) {
                continue; // Excluir tarea que se está actualizando
            }

            if (task.schedule.hour === hour && task.schedule.minute === minute) {
                return taskId;
            }
        }
        return null;
    }

    /**
     * Actualiza metadata de configuración
     * @private
     * @param {Object} config - Configuración
     */
    _updateMetadata(config) {
        if (!config.metadata) {
            config.metadata = {};
        }

        config.metadata.version = '2.0.0';
        config.metadata.lastModified = new Date().toISOString();
        config.metadata.taskCount = Object.keys(config.tasks).length;
    }

    /**
     * Verifica si un archivo existe
     * @private
     * @param {String} filePath - Ruta del archivo
     * @returns {Promise<Boolean>} True si existe
     */
    async _fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Genera configuración por defecto con 2 tareas
     * @private
     * @returns {Object} Configuración por defecto
     */
    _getDefaultConfig() {
        const now = new Date().toISOString();

        return {
            tasks: {
                audio_test_1: {
                    id: "audio_test_1",
                    name: "Prueba Matutina",
                    enabled: true,
                    schedule: {
                        hour: 8,
                        minute: 0,
                        timezone: "America/Mexico_City"
                    },
                    action: {
                        type: "mqtt_broadcast",
                        topic: "SYSTEM/TEST",
                        payload: {
                            event: "play_track",
                            track: 11
                        }
                    },
                    tolerance_minutes: 5,
                    createdAt: now,
                    lastExecution: null,
                    nextExecution: null
                },
                audio_test_2: {
                    id: "audio_test_2",
                    name: "Prueba Vespertina",
                    enabled: true,
                    schedule: {
                        hour: 20,
                        minute: 0,
                        timezone: "America/Mexico_City"
                    },
                    action: {
                        type: "mqtt_broadcast",
                        topic: "SYSTEM/TEST",
                        payload: {
                            event: "play_track",
                            track: 11
                        }
                    },
                    tolerance_minutes: 5,
                    createdAt: now,
                    lastExecution: null,
                    nextExecution: null
                }
            },
            global_settings: {
                enabled: true,
                check_interval_ms: 60000,
                timezone: "America/Mexico_City",
                max_tasks: 10,
                default_track: 11,
                default_tolerance_minutes: 5
            },
            metadata: {
                version: "2.0.0",
                lastModified: now,
                taskCount: 2
            }
        };
    }

    /**
     * Valida estructura básica de configuración
     * @param {Object} config - Configuración a validar
     * @returns {Boolean} True si es válida
     */
    validateConfig(config) {
        try {
            if (!config || typeof config !== 'object') {
                return false;
            }

            if (!config.tasks || typeof config.tasks !== 'object') {
                return false;
            }

            if (!config.global_settings) {
                return false;
            }

            // Validar cada tarea
            for (const task of Object.values(config.tasks)) {
                if (!task.schedule || !task.action) {
                    return false;
                }

                if (typeof task.schedule.hour !== 'number' ||
                    typeof task.schedule.minute !== 'number') {
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('[TaskConfigManager] Error validando configuración:', error);
            return false;
        }
    }
}

// Exportar instancia singleton
const taskConfigManager = new TaskConfigManager();
module.exports = taskConfigManager;