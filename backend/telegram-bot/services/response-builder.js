/**
 * Response Builder - Constructor de Respuestas Formateadas
 * 
 * Genera mensajes y teclados formateados para el bot de Telegram.
 * Centraliza toda la lógica de presentación y formato de mensajes.
 * 
 * @module telegram-bot/services/response-builder
 * @version 1.0.0
 */

/**
 * Construye mensaje de bienvenida
 * 
 * @param {Object} user - Información del usuario
 * @returns {string} Mensaje formateado en Markdown
 */
function buildWelcomeMessage(user) {
  return `👋 *Bienvenido ${user.first_name}*

Soy el bot de gestión de tareas programadas para el sistema de monitoreo.

📋 *Comandos disponibles:*
/creartarea - Crear nueva tarea
/listartareas - Ver todas las tareas
/testmanual - Ejecutar test de audio
/status - Ver estado del sistema
/ayuda - Mostrar esta ayuda

💡 _Usa /creartarea para comenzar_`;
}

/**
 * Construye mensaje de ayuda con todos los comandos
 * 
 * @returns {string} Mensaje formateado en Markdown
 */
function buildHelpMessage() {
  return `📚 *Guía de Comandos*

*Gestión de Tareas:*
/creartarea - Crear nueva tarea programada
/listartareas - Ver lista de todas las tareas

*Ejecución:*
/testmanual - Ejecutar test de audio manual

*Sistema:*
/status - Ver estado del sistema
/ayuda - Mostrar esta ayuda

📝 *Formato para crear tarea:*
\`*nombre*HH:MM*track##\`

Ejemplo:
\`*Prueba Tarde*15:30*20##\`

🔧 Las tareas se ejecutarán automáticamente en el horario configurado.`;
}

/**
 * Construye instrucciones para crear tarea
 * 
 * @returns {string} Mensaje formateado en Markdown
 */
function buildCreateTaskInstructions() {
  return `📝 *Crear Nueva Tarea*

Envía un mensaje con el siguiente formato:

\`*nombre*HH:MM*track##\`

*Campos:*
• *nombre* - Nombre descriptivo de la tarea
• *HH:MM* - Hora de ejecución (formato 24h)
• *track* - Número de pista de audio (0-999)

*Ejemplos:*
\`*Prueba Matutina*08:00*15##\`
\`*Test Vespertino*18:30*25##\`

⚠️ El mensaje debe terminar con ##`;
}

/**
 * Construye instrucciones para editar tarea
 * 
 * @param {Object} task - Tarea a editar
 * @returns {string} Mensaje formateado en Markdown
 */
function buildEditTaskInstructions(task) {
  const currentTime = `${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`;
  const currentState = task.enabled ? 'habilitada' : 'deshabilitada';

  return `✏️ *Editar Tarea*

*Tarea actual:*
📌 ${task.name}
🕐 ${currentTime}
🎵 Pista: ${task.track}
${task.enabled ? '✅' : '❌'} ${currentState}

*Envía los nuevos datos con formato:*
\`*nombre*HH:MM*pista:track*estado##\`

*Ejemplo:*
\`*${task.name}*${currentTime}*pista:${task.track}*${currentState}##\`

*Estados válidos:* habilitada | deshabilitada
⚠️ El mensaje debe terminar con ##`;
}

/**
 * Construye instrucciones para test manual
 * 
 * @returns {string} Mensaje formateado en Markdown
 */
function buildManualTestInstructions() {
  return `🔊 *Test Manual de Audio*

Envía el número de pista a reproducir:

\`*track##\`

*Ejemplos:*
\`*15##\` - Reproducir pista 15
\`*25##\` - Reproducir pista 25

*Rango válido:* 0 - 999
⚠️ El mensaje debe terminar con ##`;
}

/**
 * Construye mensaje de tarea creada exitosamente
 * 
 * @param {Object} task - Tarea creada
 * @returns {string} Mensaje formateado en Markdown
 */
function buildTaskCreatedMessage(task) {
  const time = `${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`;

  return `✅ *Tarea Creada Exitosamente*

📌 *Nombre:* ${task.name}
🕐 *Hora:* ${time}
🎵 *Pista:* ${task.track}
🆔 *ID:* \`${task.id}\`
${task.enabled ? '✅' : '❌'} Estado: ${task.enabled ? 'Habilitada' : 'Deshabilitada'}

La tarea se ejecutará automáticamente todos los días a las ${time}

_Usa /listartareas para ver todas las tareas_`;
}

/**
 * Construye mensaje de tarea actualizada
 * 
 * @param {Object} task - Tarea actualizada
 * @returns {string} Mensaje formateado en Markdown
 */
function buildTaskUpdatedMessage(task) {
  const time = `${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`;

  return `✅ *Tarea Actualizada*

📌 *Nombre:* ${task.name}
🕐 *Hora:* ${time}
🎵 *Pista:* ${task.track}
${task.enabled ? '✅' : '❌'} Estado: ${task.enabled ? 'Habilitada' : 'Deshabilitada'}

_Usa /listartareas para ver todas las tareas_`;
}

/**
 * Construye mensaje de test manual ejecutado
 * 
 * @param {number} track - Número de pista ejecutada
 * @returns {string} Mensaje formateado en Markdown
 */
function buildManualTestExecutedMessage(track) {
  return `✅ *Test Manual Ejecutado*

🎵 *Pista reproducida:* ${track}
🕐 *Hora:* ${new Date().toLocaleTimeString('es-MX', { hour12: false })}

El audio fue enviado a todos los dispositivos conectados.`;
}

/**
 * Construye lista de tareas
 * 
 * @param {Array} tasks - Array de tareas
 * @returns {string} Mensaje formateado en Markdown
 */
function buildTaskList(tasks) {
  if (!tasks || tasks.length === 0) {
    return `📋 *Lista de Tareas*

No hay tareas programadas.

_Usa /creartarea para crear una nueva tarea_`;
  }

  let message = `📋 *Lista de Tareas* (${tasks.length})\n\n`;

  tasks.forEach((task, index) => {
    const time = `${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`;
    const status = task.enabled ? '✅' : '❌';

    message += `${index + 1}. ${status} *${task.name}*\n`;
    message += `   🕐 ${time} | 🎵 Pista ${task.track}\n`;
    message += `   🆔 \`${task.id}\`\n\n`;
  });

  message += `_Selecciona una tarea para ver opciones_`;

  return message;
}

/**
 * Construye teclado inline para lista de tareas
 * 
 * @param {Array} tasks - Array de tareas
 * @returns {Object} Teclado inline de Telegram
 */
function buildTaskListKeyboard(tasks) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const keyboard = [];

  tasks.forEach(task => {
    const status = task.enabled ? '✅' : '❌';
    keyboard.push([
      {
        text: `${status} ${task.name}`,
        callback_data: `task_details:${task.id}`
      }
    ]);
  });

  // Construir botones para cada tarea (3 botones por fila)
  const actionButtons = [];
  tasks.forEach((task, index) => {
    if (index % 3 === 0) {
      actionButtons.push([]);
    }
    
    const row = actionButtons[actionButtons.length - 1];
    row.push({
      text: `✏️ ${index + 1}`,
      callback_data: `edit_task:${task.id}`
    });
    row.push({
      text: task.enabled ? `🔴 ${index + 1}` : `🟢 ${index + 1}`,
      callback_data: `toggle_task:${task.id}`
    });
    row.push({
      text: `🗑️ ${index + 1}`,
      callback_data: `delete_task:${task.id}`
    });
  });

  return {
    inline_keyboard: [...keyboard, ...actionButtons]
  };
}

/**
 * Construye mensaje de confirmación de eliminación
 * 
 * @param {Object} task - Tarea a eliminar
 * @returns {string} Mensaje formateado en Markdown
 */
function buildDeleteConfirmation(task) {
  const time = `${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`;

  return `⚠️ *Confirmar Eliminación*

¿Estás seguro de eliminar esta tarea?

📌 *Nombre:* ${task.name}
🕐 *Hora:* ${time}
🎵 *Pista:* ${task.track}

⚠️ *Esta acción no se puede deshacer*`;
}

/**
 * Construye teclado de confirmación de eliminación
 * 
 * @param {string} taskId - ID de la tarea
 * @returns {Object} Teclado inline
 */
function buildDeleteConfirmationKeyboard(taskId) {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Confirmar',
          callback_data: `confirm_delete:${taskId}`
        },
        {
          text: '❌ Cancelar',
          callback_data: `cancel_delete:${taskId}`
        }
      ]
    ]
  };
}

/**
 * Construye mensaje de estado del sistema
 * 
 * @param {Object} systemStatus - Estado del TaskSystem
 * @returns {string} Mensaje formateado en Markdown
 */
function buildStatusMessage(systemStatus) {
  const status = systemStatus.isRunning ? '✅ Activo' : '❌ Detenido';
  const uptime = formatUptime(systemStatus.uptime);

  return `📊 *Estado del Sistema*

*TaskSystem:* ${status}
⏱️ *Uptime:* ${uptime}
📋 *Tareas totales:* ${systemStatus.totalTasks}
✅ *Tareas habilitadas:* ${systemStatus.enabledTasks}
❌ *Tareas deshabilitadas:* ${systemStatus.disabledTasks}
🎯 *Última ejecución:* ${systemStatus.lastExecution || 'Ninguna'}

*Próxima tarea:*
${systemStatus.nextTask ? 
  `📌 ${systemStatus.nextTask.name}\n🕐 ${systemStatus.nextTask.time}` : 
  '_No hay tareas programadas_'}`;
}

/**
 * Formatea tiempo de uptime
 * 
 * @param {number} ms - Milisegundos
 * @returns {string} Tiempo formateado
 */
function formatUptime(ms) {
  if (!ms) return 'N/A';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

module.exports = {
  buildWelcomeMessage,
  buildHelpMessage,
  buildCreateTaskInstructions,
  buildEditTaskInstructions,
  buildManualTestInstructions,
  buildTaskCreatedMessage,
  buildTaskUpdatedMessage,
  buildManualTestExecutedMessage,
  buildTaskList,
  buildTaskListKeyboard,
  buildDeleteConfirmation,
  buildDeleteConfirmationKeyboard,
  buildStatusMessage,
  formatUptime
};