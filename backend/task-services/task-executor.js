/**
 * TaskExecutor - Ejecutor de Tareas MQTT
 * @brief Construye y publica comandos MQTT para tareas programadas
 * 
 * Funcionalidades:
 * - Construcción de payloads MQTT
 * - Publicación en topic SYSTEM/TEST (broadcast)
 * - Generación de timestamps ISO 8601
 * - Validación antes de publicar
 * - Logging de ejecuciones
 * 
 * @author Sistema de Monitoreo Local
 * @version 1.0.0
 */

class TaskExecutor {
    constructor(mqttClient) {
        this.mqttClient = mqttClient;
        console.log('[TaskExecutor] Instancia creada');
    }

    /**
     * Ejecuta una tarea publicando comando MQTT
     * @param {Object} task - Configuración de la tarea
     * @param {Boolean} isManual - True si es ejecución manual
     * @returns {Object} Resultado de la ejecución
     */
    async execute(task, isManual = false) {
        try {
            // Validar cliente MQTT
            if (!this.mqttClient) {
                console.error('[TaskExecutor] Cliente MQTT no disponible');
                return { success: false, error: 'Cliente MQTT no configurado' };
            }

            // Validar configuración de tarea
            const validation = this._validateTask(task);
            if (!validation.valid) {
                console.error('[TaskExecutor] Tarea inválida:', validation.error);
                return { success: false, error: validation.error };
            }

            // Construir payload MQTT
            const payload = this._buildPayload(task);

            // Publicar en topic de broadcast
            const topic = task.action.topic;
            const published = await this._publishMqtt(topic, payload);

            if (published) {
                const executionType = isManual ? 'MANUAL' : 'AUTOMÁTICA';
                console.log(`[TaskExecutor] ✓ Tarea ejecutada [${executionType}]:`, {
                    topic,
                    event: payload.event,
                    track: payload.track,
                    time: payload.time
                });

                return {
                    success: true,
                    topic,
                    payload,
                    timestamp: payload.time,
                    isManual
                };
            } else {
                console.error('[TaskExecutor] Error publicando mensaje MQTT');
                return { success: false, error: 'Error en publicación MQTT' };
            }

        } catch (error) {
            console.error('[TaskExecutor] Error ejecutando tarea:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Construye el payload MQTT según especificación
     * @private
     * @param {Object} task - Configuración de la tarea
     * @returns {Object} Payload MQTT
     */
    _buildPayload(task) {
        const payload = {
            dsp: "all",  // Broadcast a todos los dispositivos
            event: task.action.payload.event,
            time: this._getCurrentISOTime(),
            track: task.action.payload.track
        };

        return payload;
    }

    /**
     * Publica mensaje en topic MQTT
     * @private
     * @param {String} topic - Topic MQTT
     * @param {Object} payload - Payload a publicar
     * @returns {Promise<Boolean>} True si publicó exitosamente
     */
    _publishMqtt(topic, payload) {
        return new Promise((resolve) => {
            try {
                const message = JSON.stringify(payload);

                this.mqttClient.publish(topic, message, { qos: 0 }, (error) => {
                    if (error) {
                        console.error('[TaskExecutor] Error en publish MQTT:', error);
                        resolve(false);
                    } else {
                        console.log(`[TaskExecutor] Mensaje publicado en ${topic}:`, message);
                        resolve(true);
                    }
                });

            } catch (error) {
                console.error('[TaskExecutor] Error preparando publicación:', error);
                resolve(false);
            }
        });
    }

    /**
     * Obtiene timestamp actual en formato ISO 8601 (UTC)
     * @private
     * @returns {String} Timestamp ISO 8601
     */
    _getCurrentISOTime() {
        return new Date().toISOString();
    }

    /**
     * Valida la configuración de una tarea antes de ejecutar
     * @private
     * @param {Object} task - Configuración de la tarea
     * @returns {Object} Resultado de validación
     */
    _validateTask(task) {
        if (!task) {
            return { valid: false, error: 'Tarea no definida' };
        }

        if (!task.action || !task.action.topic) {
            return { valid: false, error: 'Topic no definido' };
        }

        if (!task.action.payload || !task.action.payload.event) {
            return { valid: false, error: 'Evento no definido' };
        }

        if (typeof task.action.payload.track !== 'number') {
            return { valid: false, error: 'Track inválido' };
        }

        if (task.action.payload.track < 0 || task.action.payload.track >= 1000) {
            return { valid: false, error: 'Track fuera de rango (0-999)' };
        }

        return { valid: true };
    }

    /**
     * Obtiene estadísticas del executor (para futuro)
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            mqttConnected: this.mqttClient ? true : false
        };
    }
}

module.exports = TaskExecutor;