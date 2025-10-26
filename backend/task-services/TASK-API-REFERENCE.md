# Task System - Referencia Completa de API

## 📑 Índice

- [Ciclo de Vida](#ciclo-de-vida)
- [Operaciones CRUD](#operaciones-crud)
  - [CREATE - Crear Tarea](#create---crear-tarea)
  - [READ - Consultar Tareas](#read---consultar-tareas)
  - [UPDATE - Actualizar Tarea](#update---actualizar-tarea)
  - [DELETE - Eliminar Tarea](#delete---eliminar-tarea)
- [Ejecución Manual](#ejecución-manual)
- [Información y Estado](#información-y-estado)
- [Códigos de Error](#códigos-de-error)
- [Ejemplos de Integración](#ejemplos-de-integración)

---

## Importación

```javascript
const { taskSystem } = require('./backend/task-services/task-system');
```

> ⚠️ **Nota:** `taskSystem` es un **singleton**. Usar la misma instancia en toda la aplicación.

---

## Ciclo de Vida

### `setMqttClient(mqttClient)`

Configura el cliente MQTT para publicación de comandos.

**Parámetros:**
- `mqttClient` (Object) - Cliente MQTT conectado

**Retorna:**
- `Boolean` - `true` si configuró exitosamente

**Ejemplo:**
```javascript
const mqttClient = require('./backend/mqtt/index');

const success = taskSystem.setMqttClient(mqttClient);
if (success) {
  console.log('Cliente MQTT configurado');
}
```

**Errores:**
- Retorna `false` si `mqttClient` es `null` o inválido

---

### `start()`

Inicia el sistema de tareas programadas.

**Retorna:**
- `Promise<Boolean>` - `true` si inició correctamente

**Comportamiento:**
1. Carga configuración desde `task-config.json`
2. Valida estructura de configuración
3. Inicializa `TaskExecutor` con cliente MQTT
4. Inicia `TaskScheduler` (evaluación cada 60s)
5. Muestra próximas ejecuciones en consola

**Ejemplo:**
```javascript
const started = await taskSystem.start();

if (started) {
  console.log('Sistema de tareas iniciado');
} else {
  console.error('Error al iniciar sistema');
}
```

**Precondiciones:**
- `setMqttClient()` debe haberse llamado primero
- Archivo `task-config.json` debe existir o poder crearse

**Logs Esperados:**
```
[TaskSystem] Iniciando sistema de tareas...
[TaskConfigManager] ✓ Configuración cargada exitosamente
[TaskExecutor] Instancia creada
[TaskScheduler] Instancia creada
[TaskScheduler] ✓ Scheduler iniciado
[TaskSystem] ✓ Sistema iniciado correctamente
[TaskSystem] Tareas cargadas: 2
[TaskSystem] Próximas ejecuciones:
  - Prueba Matutina (audio_test_1): 26/10/2025, 08:00:00
  - Prueba Vespertina (audio_test_2): 25/10/2025, 20:00:00
```

---

### `stop()`

Detiene el sistema de tareas.

**Retorna:**
- `void`

**Comportamiento:**
- Detiene el scheduler (deja de evaluar tareas)
- No elimina configuración

**Ejemplo:**
```javascript
taskSystem.stop();
console.log('Sistema detenido');
```

**Uso típico:**
```javascript
process.on('SIGINT', () => {
  console.log('Cerrando aplicación...');
  taskSystem.stop();
  process.exit(0);
});
```

---

### `reloadConfig()`

Recarga la configuración desde el archivo JSON.

**Retorna:**
- `Promise<Boolean>` - `true` si recargó exitosamente

**Casos de uso:**
- Configuración modificada externamente (editor de texto)
- Después de operaciones CRUD externas
- Sincronización manual

**Ejemplo:**
```javascript
const reloaded = await taskSystem.reloadConfig();

if (reloaded) {
  console.log('Configuración recargada');
  console.log('Tareas activas:', taskSystem.getTaskCount());
}
```

**Nota:** Las operaciones CRUD (`createTask`, `updateTask`, `deleteTask`) **llaman automáticamente** a `reloadConfig()`.

---

## Operaciones CRUD

### CREATE - Crear Tarea

#### `createTask(name, hour, minute, track, enabled)`

Crea una nueva tarea programada.

**Parámetros:**

| Parámetro | Tipo    | Requerido | Rango/Formato       | Descripción                     |
| --------- | ------- | --------- | ------------------- | ------------------------------- |
| `name`    | String  | ✅         | 3-50 caracteres     | Nombre descriptivo de la tarea  |
| `hour`    | Number  | ✅         | 0-23                | Hora de ejecución (formato 24h) |
| `minute`  | Number  | ✅         | 0-59                | Minuto de ejecución             |
| `track`   | Number  | ❌         | 0-999 (default: 11) | Track de audio a reproducir     |
| `enabled` | Boolean | ❌         | default: `true`     | Estado inicial de la tarea      |

**Retorna:**
```javascript
{
  success: Boolean,
  taskId?: String,           // ID generado (ej: "audio_test_3")
  task?: Object,             // Objeto de tarea completo
  message?: String,          // Mensaje de éxito
  nextExecution?: String,    // Próxima ejecución calculada
  error?: String,            // Código de error
  message?: String           // Mensaje de error
}
```

**Ejemplo - Éxito:**
```javascript
const result = await taskSystem.createTask(
  "Prueba Mediodía",  // nombre
  12,                  // hora
  30,                  // minuto
  15,                  // track (opcional)
  true                 // habilitada (opcional)
);

console.log(result);
// {
//   success: true,
//   taskId: "audio_test_3",
//   task: {
//     id: "audio_test_3",
//     name: "Prueba Mediodía",
//     enabled: true,
//     schedule: { hour: 12, minute: 30, timezone: "America/Mexico_City" },
//     action: {
//       type: "mqtt_broadcast",
//       topic: "SYSTEM/TEST",
//       payload: { event: "play_track", track: 15 }
//     },
//     tolerance_minutes: 5,
//     createdAt: "2025-10-25T21:07:58.111Z",
//     lastExecution: null,
//     nextExecution: null
//   },
//   message: "Tarea 'Prueba Mediodía' creada exitosamente",
//   nextExecution: "26/10/2025, 12:30:00"
// }
```

**Ejemplo - Error (límite alcanzado):**
```javascript
const result = await taskSystem.createTask("Tarea 11", 10, 0);

console.log(result);
// {
//   success: false,
//   error: "TASK_LIMIT_REACHED",
//   message: "Máximo de 10 tareas alcanzado",
//   currentCount: 10
// }
```

**Validaciones:**
- ✅ Nombre único (no duplicados)
- ✅ Horario único (no 2 tareas a la misma hora)
- ✅ Máximo 10 tareas
- ✅ Parámetros en rangos válidos

**Auto-generación de IDs:**
- IDs siguen el formato: `audio_test_1`, `audio_test_2`, etc.
- Reutiliza IDs de tareas eliminadas
- Busca el primer ID disponible (1-10)

---

### READ - Consultar Tareas

#### `listTasks()`

Obtiene lista de todas las tareas configuradas.

**Parámetros:**
- Ninguno

**Retorna:**
- `Array<Object>` - Array de tareas ordenadas por horario

**Estructura de cada tarea:**
```javascript
{
  id: String,                    // "audio_test_1"
  name: String,                  // "Prueba Matutina"
  enabled: Boolean,              // true
  schedule: {
    hour: Number,                // 8
    minute: Number,              // 0
    formatted: String            // "08:00"
  },
  track: Number,                 // 11
  lastExecution: String|null,    // "2025-10-25T08:00:15.234Z"
  nextExecution: String|null,    // "26/10/2025, 08:00:00"
  createdAt: String              // "2025-10-25T20:00:00.000Z"
}
```

**Ejemplo:**
```javascript
const tasks = taskSystem.listTasks();

console.log(`Total de tareas: ${tasks.length}`);

tasks.forEach(task => {
  console.log(`${task.name} (${task.id})`);
  console.log(`  Horario: ${task.schedule.formatted}`);
  console.log(`  Track: ${task.track}`);
  console.log(`  Estado: ${task.enabled ? 'Habilitada' : 'Deshabilitada'}`);
  console.log(`  Próxima ejecución: ${task.nextExecution}`);
});
```

**Salida esperada:**
```
Total de tareas: 3

Prueba Matutina (audio_test_1)
  Horario: 08:00
  Track: 11
  Estado: Habilitada
  Próxima ejecución: 26/10/2025, 08:00:00

Prueba Mediodía (audio_test_3)
  Horario: 12:30
  Track: 15
  Estado: Habilitada
  Próxima ejecución: 26/10/2025, 12:30:00

Prueba Vespertina (audio_test_2)
  Horario: 20:00
  Track: 11
  Estado: Habilitada
  Próxima ejecución: 25/10/2025, 20:00:00
```

**Ordenamiento:**
- Las tareas se retornan **ordenadas por horario** (hora más temprana primero)

---

#### `getTask(taskId)`

Obtiene información detallada de una tarea específica.

**Parámetros:**
- `taskId` (String) - ID de la tarea (ej: `"audio_test_1"`)

**Retorna:**
- `Object|null` - Objeto de tarea o `null` si no existe

**Ejemplo:**
```javascript
const task = taskSystem.getTask("audio_test_1");

if (task) {
  console.log('Tarea encontrada:', task.name);
  console.log('Próxima ejecución:', task.nextExecution);
} else {
  console.log('Tarea no encontrada');
}
```

---

#### `getTaskCount()`

Obtiene el número total de tareas configuradas.

**Parámetros:**
- Ninguno

**Retorna:**
- `Number` - Cantidad de tareas (0-10)

**Ejemplo:**
```javascript
const count = taskSystem.getTaskCount();
const available = 10 - count;

console.log(`Tareas configuradas: ${count}/10`);
console.log(`Slots disponibles: ${available}`);
```

---

### UPDATE - Actualizar Tarea

#### `updateTask(taskId, updates)`

Actualiza campos específicos de una tarea existente.

**Parámetros:**
- `taskId` (String) - ID de la tarea a actualizar
- `updates` (Object) - Campos a modificar

**Campos actualizables:**
```javascript
{
  name?: String,      // Nuevo nombre (3-50 caracteres, único)
  hour?: Number,      // Nueva hora (0-23)
  minute?: Number,    // Nuevo minuto (0-59)
  track?: Number,     // Nuevo track (0-999)
  enabled?: Boolean   // Nuevo estado (true/false)
}
```

**Retorna:**
```javascript
{
  success: Boolean,
  taskId?: String,
  message?: String,
  task?: Object,      // Tarea actualizada
  error?: String
}
```

**Ejemplo - Actualizar horario:**
```javascript
const result = await taskSystem.updateTask("audio_test_1", {
  hour: 9,
  minute: 30
});

if (result.success) {
  console.log('Tarea actualizada:', result.task.schedule);
  // { hour: 9, minute: 30, timezone: "America/Mexico_City" }
}
```

**Ejemplo - Deshabilitar tarea:**
```javascript
await taskSystem.updateTask("audio_test_2", {
  enabled: false
});

console.log('Tarea deshabilitada temporalmente');
```

**Ejemplo - Cambiar múltiples campos:**
```javascript
const result = await taskSystem.updateTask("audio_test_3", {
  name: "Prueba Tarde",
  hour: 15,
  minute: 0,
  track: 25
});
```

**Validaciones:**
- ✅ Nuevo nombre debe ser único
- ✅ Nuevo horario no debe colisionar con otras tareas
- ✅ Parámetros en rangos válidos

**Ejemplo - Error (horario duplicado):**
```javascript
const result = await taskSystem.updateTask("audio_test_1", {
  hour: 20,
  minute: 0  // Ya existe audio_test_2 a las 20:00
});

console.log(result);
// {
//   success: false,
//   error: "DUPLICATE_SCHEDULE",
//   message: "Ya existe una tarea programada a las 20:00",
//   conflictingTask: "audio_test_2"
// }
```

---

### DELETE - Eliminar Tarea

#### `deleteTask(taskId)`

Elimina una tarea permanentemente.

**Parámetros:**
- `taskId` (String) - ID de la tarea a eliminar

**Retorna:**
```javascript
{
  success: Boolean,
  taskId?: String,
  message?: String,
  remainingTasks?: Number,
  error?: String
}
```

**Ejemplo:**
```javascript
const result = await taskSystem.deleteTask("audio_test_3");

if (result.success) {
  console.log(result.message);
  // "Tarea 'Prueba Mediodía' eliminada exitosamente"
  
  console.log(`Tareas restantes: ${result.remainingTasks}`);
  // Tareas restantes: 2
}
```

**Ejemplo - Error (tarea no existe):**
```javascript
const result = await taskSystem.deleteTask("audio_test_99");

console.log(result);
// {
//   success: false,
//   error: "TASK_NOT_FOUND",
//   message: "Tarea audio_test_99 no encontrada"
// }
```

**Comportamiento:**
- ✅ El ID eliminado queda **disponible para reutilización**
- ✅ Configuración se guarda inmediatamente
- ✅ Scheduler se actualiza automáticamente

**Límites:**
- ❌ No hay restricción de eliminar todas las tareas (puede llegar a 0)

---

## Ejecución Manual

### `executeTask(taskId)`

Ejecuta una tarea específica inmediatamente (sin esperar horario programado).

**Parámetros:**
- `taskId` (String) - ID de la tarea a ejecutar

**Retorna:**
```javascript
{
  success: Boolean,
  topic?: String,          // "SYSTEM/TEST"
  payload?: Object,        // Payload MQTT publicado
  timestamp?: String,      // ISO 8601 timestamp
  isManual?: Boolean,      // true
  error?: String
}
```

**Ejemplo:**
```javascript
const result = await taskSystem.executeTask("audio_test_1");

if (result.success) {
  console.log('Tarea ejecutada manualmente');
  console.log('Topic:', result.topic);
  console.log('Payload:', result.payload);
  console.log('Timestamp:', result.timestamp);
}
```

**Uso típico (desde bot de Telegram):**
```javascript
// Usuario escribe: /test_run audio_test_1

async function handleTestRun(taskId) {
  const result = await taskSystem.executeTask(taskId);
  
  if (result.success) {
    return `✅ Tarea ${taskId} ejecutada exitosamente`;
  } else {
    return `❌ Error: ${result.error}`;
  }
}
```

**Logs generados:**
```
[TaskSystem] Ejecutando tarea audio_test_1 manualmente...
[TaskExecutor] Mensaje publicado en SYSTEM/TEST: {"dsp":"all","event":"play_track","time":"2025-10-25T21:15:30.123Z","track":11}
[TaskExecutor] ✓ Tarea ejecutada [MANUAL]: { topic: 'SYSTEM/TEST', event: 'play_track', track: 11, time: '2025-10-25T21:15:30.123Z' }
[TaskSystem] ✓ Tarea audio_test_1 ejecutada exitosamente
```

---

### `executeTestByTrack(track)`

Ejecuta un test broadcast con un track personalizado (sin usar tarea configurada).

**Parámetros:**
- `track` (Number) - Track de audio a reproducir (0-999)

**Retorna:**
- `Object` - Igual que `executeTask()`

**Ejemplo:**
```javascript
// Ejecutar test con track 25
const result = await taskSystem.executeTestByTrack(25);

if (result.success) {
  console.log('Test ejecutado con track personalizado');
}
```

**Uso típico:**
```javascript
// Usuario escribe: /test_now 25

async function handleTestNow(track) {
  if (track < 0 || track >= 1000) {
    return '❌ Track inválido (debe ser 0-999)';
  }
  
  const result = await taskSystem.executeTestByTrack(track);
  
  if (result.success) {
    return `✅ Test ejecutado con track ${track}`;
  } else {
    return `❌ Error: ${result.error}`;
  }
}
```

**Diferencia con `executeTask()`:**
- `executeTask()` → Usa configuración de tarea existente
- `executeTestByTrack()` → Usa track personalizado (no requiere tarea)

---

## Información y Estado

### `getStatus()`

Obtiene el estado completo del sistema.

**Parámetros:**
- Ninguno

**Retorna:**
```javascript
{
  isRunning: Boolean,          // Sistema activo
  isInitialized: Boolean,      // Cliente MQTT configurado
  globalEnabled: Boolean,      // Configuración global habilitada
  taskCount: Number,           // Número de tareas
  maxTasks: Number,            // Límite máximo (10)
  availableSlots: Number,      // Slots disponibles
  checkInterval: Number,       // Intervalo de evaluación (ms)
  tasks: Array<Object>         // Lista de tareas (igual que listTasks())
}
```

**Ejemplo:**
```javascript
const status = taskSystem.getStatus();

console.log('Estado del Sistema de Tareas:');
console.log(`  Activo: ${status.isRunning ? 'Sí' : 'No'}`);
console.log(`  Tareas: ${status.taskCount}/${status.maxTasks}`);
console.log(`  Slots disponibles: ${status.availableSlots}`);
console.log(`  Intervalo de chequeo: ${status.checkInterval/1000}s`);

status.tasks.forEach(task => {
  console.log(`  - ${task.name}: ${task.enabled ? 'Activa' : 'Inactiva'}`);
});
```

**Salida esperada:**
```
Estado del Sistema de Tareas:
  Activo: Sí
  Tareas: 2/10
  Slots disponibles: 8
  Intervalo de chequeo: 60s
  - Prueba Matutina: Activa
  - Prueba Vespertina: Activa
```

---

### `getNextExecutions()`

Obtiene las próximas ejecuciones programadas ordenadas cronológicamente.

**Parámetros:**
- Ninguno

**Retorna:**
```javascript
Array<{
  id: String,              // "audio_test_1"
  name: String,            // "Prueba Matutina"
  nextExecution: String,   // "26/10/2025, 08:00:00"
  hour: Number,            // 8
  minute: Number           // 0
}>
```

**Ejemplo:**
```javascript
const nextExec = taskSystem.getNextExecutions();

console.log('Próximas Ejecuciones:');
nextExec.forEach(exec => {
  console.log(`  ${exec.nextExecution} - ${exec.name} (${exec.id})`);
});
```

**Salida esperada:**
```
Próximas Ejecuciones:
  26/10/2025, 08:00:00 - Prueba Matutina (audio_test_1)
  26/10/2025, 12:30:00 - Prueba Mediodía (audio_test_3)
  25/10/2025, 20:00:00 - Prueba Vespertina (audio_test_2)
```

**Nota:** Solo incluye tareas **habilitadas** (`enabled: true`)

---

### `getNextExecution(taskId)`

Obtiene la próxima ejecución de una tarea específica.

**Parámetros:**
- `taskId` (String) - ID de la tarea

**Retorna:**
- `String|null` - Fecha/hora formateada o `null`

**Ejemplo:**
```javascript
const nextExec = taskSystem.getNextExecution("audio_test_1");

console.log(`Próxima ejecución: ${nextExec}`);
// Próxima ejecución: 26/10/2025, 08:00:00
```

---

## Códigos de Error

### Errores de Sistema

| Código               | Descripción                    | Solución                      |
| -------------------- | ------------------------------ | ----------------------------- |
| `SYSTEM_NOT_RUNNING` | Sistema no iniciado            | Llamar `start()` primero      |
| `CONFIG_LOAD_ERROR`  | Error al cargar configuración  | Verificar `task-config.json`  |
| `SAVE_ERROR`         | Error al guardar configuración | Verificar permisos de archivo |

### Errores de Validación

| Código            | Descripción                  | Solución                 |
| ----------------- | ---------------------------- | ------------------------ |
| `INVALID_PARAMS`  | Parámetros inválidos         | Verificar tipos y rangos |
| `INVALID_UPDATES` | Objeto updates inválido      | Verificar estructura     |
| `MISSING_TASK_ID` | ID de tarea no proporcionado | Enviar taskId            |

### Errores de Negocio

| Código               | Descripción                   | Solución                       |
| -------------------- | ----------------------------- | ------------------------------ |
| `TASK_LIMIT_REACHED` | Máximo de 10 tareas alcanzado | Eliminar tareas antes de crear |
| `DUPLICATE_NAME`     | Nombre de tarea ya existe     | Usar nombre diferente          |
| `DUPLICATE_SCHEDULE` | Horario ya ocupado            | Cambiar hora/minuto            |
| `TASK_NOT_FOUND`     | Tarea no existe               | Verificar ID de tarea          |

### Errores de Operación

| Código                | Descripción               | Solución               |
| --------------------- | ------------------------- | ---------------------- |
| `CREATE_ERROR`        | Error al crear tarea      | Ver logs para detalles |
| `UPDATE_ERROR`        | Error al actualizar tarea | Ver logs para detalles |
| `DELETE_ERROR`        | Error al eliminar tarea   | Ver logs para detalles |
| `ID_GENERATION_ERROR` | No se pudo generar ID     | Límite alcanzado       |

---

## Ejemplos de Integración

### Bot de Telegram - Comandos Básicos

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

// Comando: /test_list
async function handleTestList() {
  const tasks = taskSystem.listTasks();
  
  if (tasks.length === 0) {
    return '📋 No hay tareas configuradas';
  }
  
  let message = `📋 Tareas Programadas (${tasks.length}/10):\n\n`;
  
  tasks.forEach((task, index) => {
    const status = task.enabled ? '✅' : '❌';
    message += `${index + 1}. ${status} ${task.name}\n`;
    message += `   ID: ${task.id}\n`;
    message += `   ⏰ ${task.schedule.formatted}\n`;
    message += `   🎵 Track: ${task.track}\n`;
    message += `   📅 Próxima: ${task.nextExecution}\n\n`;
  });
  
  return message;
}

// Comando: /test_add Nombre Hora Minuto Track
async function handleTestAdd(name, hour, minute, track) {
  const result = await taskSystem.createTask(name, hour, minute, track);
  
  if (result.success) {
    return `✅ Tarea creada: ${result.taskId}\n` +
           `📝 Nombre: ${name}\n` +
           `⏰ Horario: ${hour}:${minute.toString().padStart(2, '0')}\n` +
           `🎵 Track: ${track}\n` +
           `📅 Próxima ejecución: ${result.nextExecution}`;
  } else {
    return `❌ Error: ${result.message}`;
  }
}

// Comando: /test_edit ID campo valor
async function handleTestEdit(taskId, field, value) {
  const updates = {};
  
  switch(field) {
    case 'hour':
      updates.hour = parseInt(value);
      break;
    case 'minute':
      updates.minute = parseInt(value);
      break;
    case 'track':
      updates.track = parseInt(value);
      break;
    case 'name':
      updates.name = value;
      break;
    case 'enabled':
      updates.enabled = value === 'true';
      break;
    default:
      return '❌ Campo inválido. Opciones: hour, minute, track, name, enabled';
  }
  
  const result = await taskSystem.updateTask(taskId, updates);
  
  if (result.success) {
    return `✅ Tarea ${taskId} actualizada exitosamente`;
  } else {
    return `❌ Error: ${result.message}`;
  }
}

// Comando: /test_delete ID
async function handleTestDelete(taskId) {
  const result = await taskSystem.deleteTask(taskId);
  
  if (result.success) {
    return `✅ ${result.message}\n` +
           `📊 Tareas restantes: ${result.remainingTasks}`;
  } else {
    return `❌ Error: ${result.message}`;
  }
}

// Comando: /test_run ID
async function handleTestRun(taskId) {
  const result = await taskSystem.executeTask(taskId);
  
  if (result.success) {
    return `✅ Tarea ${taskId} ejecutada exitosamente\n` +
           `⏰ Timestamp: ${result.timestamp}`;
  } else {
    return `❌ Error: ${result.error}`;
  }
}

// Comando: /test_status
async function handleTestStatus() {
  const status = taskSystem.getStatus();
  
  let message = `📊 Estado del Sistema de Tareas\n\n`;
  message += `🔌 Sistema: ${status.isRunning ? 'Activo ✅' : 'Inactivo ❌'}\n`;
  message += `📋 Tareas: ${status.taskCount}/${status.maxTasks}\n`;
  message += `🆓 Slots disponibles: ${status.availableSlots}\n`;
  message += `⏱️ Intervalo: ${status.checkInterval/1000}s\n\n`;
  
  const nextExec = taskSystem.getNextExecutions();
  if (nextExec.length > 0) {
    message += `📅 Próximas Ejecuciones:\n`;
    nextExec.forEach(exec => {
      message += `  • ${exec.nextExecution} - ${exec.name}\n`;
    });
  }
  
  return message;
}
```

### API REST (Express)

```javascript
const express = require('express');
const { taskSystem } = require('./backend/task-services/task-system');

const router = express.Router();

// GET /api/tasks - Listar tareas
router.get('/tasks', (req, res) => {
  const tasks = taskSystem.listTasks();
  res.json({ success: true, tasks });
});

// POST /api/tasks - Crear tarea
router.post('/tasks', async (req, res) => {
  const { name, hour, minute, track, enabled } = req.body;
  const result = await taskSystem.createTask(name, hour, minute, track, enabled);
  res.json(result);
});

// PUT /api/tasks/:id - Actualizar tarea
router.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const result = await taskSystem.updateTask(id, updates);
  res.json(result);
});

// DELETE /api/tasks/:id - Eliminar tarea
router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const result = await taskSystem.deleteTask(id);
  res.json(result);
});

// POST /api/tasks/:id/execute - Ejecutar manualmente
router.post('/tasks/:id/execute', async (req, res) => {
  const { id } = req.params;
  const result = await taskSystem.executeTask(id);
  res.json(result);
});

// GET /api/tasks/status - Estado del sistema
router.get('/tasks/status', (req, res) => {
  const status = taskSystem.getStatus();
  res.json(status);
});

module.exports = router;
```

---

## 📚 Documentación Relacionada

- **Overview del Sistema:** [TASK-SYSTEM-README.md](./TASK-SYSTEM-README.md)
- **Configuración JSON:** [/data/TASK-CONFIGURATION-GUIDE.md](../../data/TASK-CONFIGURATION-GUIDE.md)
- **Protocolo MQTT:** [TASK-MQTT-PROTOCOL.md](./TASK-MQTT-PROTOCOL.md)
- **Guía de Testing:** [TASK-TESTING-GUIDE.md](./TASK-TESTING-GUIDE.md)
- **FAQ:** [/docs/TASK-FAQ.md](../../docs/TASK-FAQ.md)

---

**Versión:** 2.0.0  
**Última actualización:** Octubre 2025  
**Sistema de Monitoreo Local - Nexus Tech**