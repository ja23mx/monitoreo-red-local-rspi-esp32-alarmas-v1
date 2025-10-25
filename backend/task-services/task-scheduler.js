/**
 * TaskScheduler - Motor de Programación de Tareas
 * @brief Evalúa periódicamente si debe ejecutar tareas programadas
 * 
 * Funcionalidades:
 * - Timer de evaluación cada 60 segundos
 * - Cálculo de hora en zona horaria CDMX (UTC-6)
 * - Aplicación de tolerancia de 5 minutos
 * - Prevención de ejecuciones duplicadas
 * - Cálculo de próxima ejecución
 * 
 * @author Sistema de Monitoreo Local
 * @version 1.0.0
 */

class TaskScheduler {
    constructor(config, executor) {
        this.config = config;
        this.executor = executor;
        this.interval = null;
        this.isRunning = false;

        console.log('[TaskScheduler] Instancia creada');
    }

    /**
     * Inicia el scheduler con el intervalo configurado
     */
    start() {
        if (this.isRunning) {
            console.warn('[TaskScheduler] Scheduler ya está en ejecución');
            return;
        }

        const intervalMs = this.config.global_settings.check_interval_ms;
        console.log(`[TaskScheduler] Iniciando con intervalo de ${intervalMs}ms (${intervalMs / 1000}s)`);

        this.interval = setInterval(() => {
            this.checkTasks();
        }, intervalMs);

        this.isRunning = true;
        console.log('[TaskScheduler] ✓ Scheduler iniciado');
    }

    /**
     * Detiene el scheduler
     */
    stop() {
        if (!this.isRunning) {
            console.warn('[TaskScheduler] Scheduler no está en ejecución');
            return;
        }

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.isRunning = false;
        console.log('[TaskScheduler] ✓ Scheduler detenido');
    }

    /**
     * Actualiza la configuración (llamado por reloadConfig)
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfig(newConfig) {
        console.log('[TaskScheduler] Actualizando configuración...');
        this.config = newConfig;
        console.log('[TaskScheduler] ✓ Configuración actualizada');
    }

    /**
     * Revisa todas las tareas y ejecuta las que cumplan condiciones
     * @private
     */
    checkTasks() {
        if (!this.config.global_settings.enabled) {
            return; // Sistema globalmente deshabilitado
        }

        const tasks = this.config.tasks;

        // Iterar sobre todas las tareas (actualmente solo audio_test)
        for (const [taskName, task] of Object.entries(tasks)) {
            if (!task.enabled) {
                continue; // Tarea deshabilitada
            }

            if (this.shouldExecuteTask(task)) {
                console.log(`[TaskScheduler] ⏰ Ejecutando tarea programada: ${taskName}`);
                this.executeTask(taskName, task);
            }
        }
    }

    /**
     * Determina si una tarea debe ejecutarse ahora
     * @private
     * @param {Object} task - Configuración de la tarea
     * @returns {Boolean} True si debe ejecutarse
     */
    shouldExecuteTask(task) {
        const now = this.getCurrentTimeCDMX();
        const scheduledTime = this.getScheduledTimeCDMX(task);
        
        // Calcular diferencia en milisegundos
        const timeDiff = now - scheduledTime;
        const toleranceMs = task.tolerance_minutes * 60 * 1000;

        // Condiciones para ejecutar:
        // 1. Hora actual >= hora programada (timeDiff >= 0)
        // 2. Diferencia <= tolerancia
        // 3. No se ha ejecutado hoy
        const withinTimeWindow = timeDiff >= 0 && timeDiff <= toleranceMs;
        const notExecutedToday = !this.wasExecutedToday(task.lastExecution);

        return withinTimeWindow && notExecutedToday;
    }

    /**
     * Ejecuta una tarea
     * @private
     * @param {String} taskName - Nombre de la tarea
     * @param {Object} task - Configuración de la tarea
     */
    async executeTask(taskName, task) {
        try {
            const result = await this.executor.execute(task, false); // false = automática

            if (result.success) {
                console.log(`[TaskScheduler] ✓ Tarea ${taskName} ejecutada exitosamente`);
                
                // Actualizar lastExecution en config
                task.lastExecution = new Date().toISOString();
                
                // TODO: Guardar config actualizada (opcional, depende de si quieres persistir)
                // Por ahora solo actualiza en memoria
            } else {
                console.error(`[TaskScheduler] ✗ Error ejecutando tarea ${taskName}:`, result.error);
            }

        } catch (error) {
            console.error(`[TaskScheduler] Error ejecutando tarea ${taskName}:`, error);
        }
    }

    /**
     * Obtiene la hora actual en zona horaria de Ciudad de México
     * @private
     * @returns {Date} Fecha/hora actual en CDMX
     */
    getCurrentTimeCDMX() {
        // Obtener hora UTC y convertir a CDMX (UTC-6)
        const now = new Date();
        const cdmxOffset = -6 * 60; // -6 horas en minutos
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const cdmxTime = new Date(utcTime + (cdmxOffset * 60000));
        
        return cdmxTime;
    }

    /**
     * Obtiene la hora programada de hoy en CDMX
     * @private
     * @param {Object} task - Configuración de la tarea
     * @returns {Date} Fecha/hora programada de hoy
     */
    getScheduledTimeCDMX(task) {
        const now = this.getCurrentTimeCDMX();
        
        const scheduled = new Date(now);
        scheduled.setHours(task.schedule.hour);
        scheduled.setMinutes(task.schedule.minute);
        scheduled.setSeconds(0);
        scheduled.setMilliseconds(0);
        
        return scheduled;
    }

    /**
     * Verifica si la tarea ya se ejecutó hoy
     * @private
     * @param {String|null} lastExecution - ISO timestamp de última ejecución
     * @returns {Boolean} True si ya se ejecutó hoy
     */
    wasExecutedToday(lastExecution) {
        if (!lastExecution) {
            return false; // Nunca se ha ejecutado
        }

        const lastExec = new Date(lastExecution);
        const now = this.getCurrentTimeCDMX();

        // Comparar solo fecha (año, mes, día)
        return (
            lastExec.getFullYear() === now.getFullYear() &&
            lastExec.getMonth() === now.getMonth() &&
            lastExec.getDate() === now.getDate()
        );
    }

    /**
     * Calcula la próxima ejecución programada de una tarea
     * @param {Object} task - Configuración de la tarea
     * @returns {String|null} Fecha/hora de próxima ejecución en formato legible
     */
    calculateNextExecution(task) {
        if (!task.enabled) {
            return null;
        }

        const now = this.getCurrentTimeCDMX();
        const scheduledToday = this.getScheduledTimeCDMX(task);

        let nextExecution;

        if (now < scheduledToday) {
            // Si aún no llegó la hora de hoy
            nextExecution = scheduledToday;
        } else {
            // Si ya pasó, programar para mañana
            nextExecution = new Date(scheduledToday);
            nextExecution.setDate(nextExecution.getDate() + 1);
        }

        // Verificar si ya se ejecutó hoy
        if (this.wasExecutedToday(task.lastExecution) && now < scheduledToday) {
            // Si ya se ejecutó hoy, la próxima es mañana
            nextExecution.setDate(nextExecution.getDate() + 1);
        }

        // Formatear para legibilidad
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'America/Mexico_City',
            hour12: false
        };

        return nextExecution.toLocaleString('es-MX', options);
    }
}

module.exports = TaskScheduler;