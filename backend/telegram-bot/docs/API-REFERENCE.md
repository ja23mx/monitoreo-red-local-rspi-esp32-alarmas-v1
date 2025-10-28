# 🔌 API Reference - Telegram Bot

> Referencia completa de la API interna del bot de Telegram para desarrolladores e integradores.

---

## 📋 Tabla de Contenidos

- [Introducción](#-introducción)
- [TelegramBotManager](#-telegrambotmanager)
- [Handlers](#-handlers)
- [Services](#-services)
- [Utilities](#-utilities)
- [Integración Externa](#-integración-externa)
- [Eventos y Callbacks](#-eventos-y-callbacks)
- [Ejemplos de Integración](#-ejemplos-de-integración)

---

## 📖 Introducción

Esta documentación describe la API interna del Telegram Bot para:

- **Desarrolladores** que mantienen el código
- **Integradores** que conectan sistemas externos
- **Administradores** que necesitan entender las interfaces

### Convenciones

```javascript
// Parámetros obligatorios
method(required)

// Parámetros opcionales
method(param, [optional])

// Retorno asíncrono
async method() → Promise<result>

// Retorno síncrono
method() → result
```

---

## 🎯 TelegramBotManager

**Archivo:** `telegram-bot-manager.js`

Clase principal que orquesta todo el sistema del bot. Implementa patrón Singleton.

### Constructor

```javascript
const telegramBotManager = new TelegramBotManager()
```

**Retorna:** Instancia única del manager (Singleton)

**Ejemplo:**
```javascript
const { telegramBotManager } = require('./telegram-bot-manager');
```

---

### Métodos Públicos

#### `initialize()`

Inicializa el bot y todos sus servicios.

```javascript
async initialize() → Promise<void>
```

**Proceso:**
1. Carga configuración desde `telegram-config.json`
2. Inicializa `authService`
3. Crea instancia del bot de Telegram
4. Registra event listeners
5. Loguea inicio exitoso

**Ejemplo:**
```javascript
await telegramBotManager.initialize();
```

**Errores:**
- `Error` si falla carga de configuración
- `Error` si token es inválido

**Logs:**
```
[INFO] Iniciando TelegramBotManager...
[INFO] Configuración cargada exitosamente
[INFO] Auth Service inicializado con 2 usuarios autorizados
[INFO] ✅ TelegramBotManager iniciado exitosamente
```

---

#### `start()`

Inicia el bot (polling o webhook).

```javascript
async start() → Promise<void>
```

**Proceso:**
1. Verifica que esté inicializado
2. Inicia polling (si `config.settings.polling === true`)
3. O configura webhook (si `config.settings.webhook === true`)
4. Loguea inicio

**Ejemplo:**
```javascript
await telegramBotManager.start();
```

**Errores:**
- `Error` si no está inicializado
- `Error` si falla conexión con Telegram

**Logs:**
```
[INFO] Bot de Telegram iniciado con polling
[INFO] Bot escuchando mensajes...
```

---

#### `stop()`

Detiene el bot de forma controlada.

```javascript
async stop() → Promise<void>
```

**Proceso:**
1. Detiene polling/webhook
2. Limpia recursos
3. Loguea cierre

**Ejemplo:**
```javascript
await telegramBotManager.stop();
```

**Logs:**
```
[INFO] Deteniendo TelegramBotManager...
[INFO] ✅ TelegramBotManager detenido
```

---

#### `setTaskSystem(taskSystem)`

Inyecta la instancia de TaskSystem.

```javascript
setTaskSystem(taskSystem) → void
```

**Parámetros:**
- `taskSystem` (Object) - Instancia de TaskSystem

**Interfaz requerida de TaskSystem:**
```javascript
{
  createTask(name, hour, minute, track) → Promise<Task>,
  listTasks() → Promise<Task[]>,
  getTask(taskId) → Promise<Task>,
  updateTask(taskId, updates) → Promise<Task>,
  deleteTask(taskId) → Promise<void>,
  toggleTask(taskId) → Promise<Task>,
  executeManualTest(track) → Promise<void>,
  getStatus() → Promise<Status>
}
```

**Ejemplo:**
```javascript
const taskSystem = require('../task-system');
telegramBotManager.setTaskSystem(taskSystem);
```

---

#### `setMqttClient(mqttClient)`

Inyecta el cliente MQTT para eventos.

```javascript
setMqttClient(mqttClient) → void
```

**Parámetros:**
- `mqttClient` (Object) - Cliente MQTT

**Ejemplo:**
```javascript
const mqttClient = require('../mqtt/mqtt-client');
telegramBotManager.setMqttClient(mqttClient);
```

**Uso interno:**
```javascript
mqttClient.on('message', (topic, message) => {
  if (topic === 'events/button') {
    const event = JSON.parse(message.toString());
    telegramBotManager.handleButtonEvent(event);
  }
});
```

---

#### `handleButtonEvent(event)`

Procesa evento de botón presionado desde MQTT.

```javascript
async handleButtonEvent(event) → Promise<void>
```

**Parámetros:**
```javascript
event = {
  event: 'button',              // Tipo de evento
  mac: 'EA:89:14:XX:XX:XX',    // MAC del dispositivo
  timestamp: 1730000000000      // Timestamp Unix (ms)
}
```

**Proceso:**
1. Busca dispositivo en `alarmas.json` por MAC
2. Formatea mensaje de alerta
3. Envía a grupo de notificaciones
4. Loguea evento

**Ejemplo:**
```javascript
const event = {
  event: 'button',
  mac: 'EA:89:14:12:34:56',
  timestamp: Date.now()
};

await telegramBotManager.handleButtonEvent(event);
```

**Logs:**
```
[INFO] Evento de botón recibido: EA:89:14:12:34:56
[INFO] Alerta enviada al grupo: -1001234567890
```

---

#### `loadConfig()`

Carga configuración desde archivo JSON.

```javascript
async loadConfig() → Promise<void>
```

**Archivo:** `backend/data/telegram-config.json`

**Estructura esperada:**
```json
{
  "bot_token": "string",
  "authorized_users": [
    {
      "chat_id": number,
      "name": "string",
      "role": "admin" | "operator"
    }
  ],
  "notification_group": {
    "enabled": boolean,
    "chat_id": number,
    "name": "string"
  },
  "settings": {
    "polling": boolean,
    "webhook": boolean,
    "webhook_url": "string",
    "polling_interval": number,
    "timezone": "string"
  }
}
```

**Ejemplo:**
```javascript
await telegramBotManager.loadConfig();
```

---

### Propiedades

```javascript
class TelegramBotManager {
  bot: TelegramBot              // Instancia del bot
  config: Object                // Configuración cargada
  taskSystem: Object            // Instancia de TaskSystem
  mqttClient: Object            // Cliente MQTT
  configPath: string            // Ruta a config.json
  userFlows: Map                // Estados de conversación
}
```

---

## 🎛️ Handlers

### Message Handler

**Archivo:** `handlers/message-handler.js`

Clasifica y rutea mensajes entrantes.

#### `handleMessage(bot, msg, taskSystem)`

```javascript
async handleMessage(bot, msg, taskSystem) → Promise<void>
```

**Parámetros:**
- `bot` (TelegramBot) - Instancia del bot
- `msg` (Message) - Objeto mensaje de Telegram
- `taskSystem` (Object) - Instancia de TaskSystem

**Estructura de `msg`:**
```javascript
{
  message_id: number,
  from: {
    id: number,
    first_name: string,
    username: string
  },
  chat: {
    id: number,
    type: 'private' | 'group'
  },
  date: number,
  text: string
}
```

**Clasificación:**
1. `isCommand()` → `commandHandler`
2. `isTaskCreationData()` → `taskHandler.handleCreateTaskData()`
3. `isTaskEditData()` → `taskHandler.handleEditTaskData()`
4. `isManualTestData()` → `taskHandler.handleManualTest()`
5. Otro → Mensaje de ayuda

**Ejemplo:**
```javascript
bot.on('message', async (msg) => {
  await messageHandler.handleMessage(bot, msg, taskSystem);
});
```

---

#### Funciones auxiliares

```javascript
// Verifica si es comando
isCommand(text) → boolean

// Verifica si es dato de crear tarea
isTaskCreationData(text) → boolean

// Verifica si es dato de editar tarea
isTaskEditData(text) → boolean

// Verifica si es test manual
isManualTestData(text) → boolean
```

---

### Command Handler

**Archivo:** `handlers/command-handler.js`

Procesa comandos de Telegram (`/comando`).

#### `handleCommand(bot, msg, taskSystem)`

```javascript
async handleCommand(bot, msg, taskSystem) → Promise<void>
```

**Comandos soportados:**
- `/start` → `handleStartCommand()`
- `/ayuda`, `/help` → `handleHelpCommand()`
- `/creartarea` → `handleCreateTaskCommand()`
- `/listartareas` → `handleListTasksCommand()`
- `/testmanual` → `handleManualTestCommand()`
- `/status` → `handleStatusCommand()`

**Ejemplo:**
```javascript
await commandHandler.handleCommand(bot, msg, taskSystem);
```

---

#### `handleCallbackQuery(bot, query, taskSystem)`

Procesa callbacks de botones inline.

```javascript
async handleCallbackQuery(bot, query, taskSystem) → Promise<void>
```

**Parámetros:**
- `query.data` (string) - Datos del callback

**Formato de `query.data`:**
```javascript
'edit_task:taskId'           // Editar tarea
'toggle_task:taskId'         // Habilitar/Deshabilitar
'delete_task:taskId'         // Solicitar confirmación
'confirm_delete:taskId'      // Confirmar eliminación
'cancel_delete:taskId'       // Cancelar eliminación
```

**Ejemplo:**
```javascript
bot.on('callback_query', async (query) => {
  await commandHandler.handleCallbackQuery(bot, query, taskSystem);
});
```

---

### Task Handler

**Archivo:** `handlers/task-handler.js`

Gestiona flujos de tareas programadas.

#### `handleCreateTaskData(bot, msg, taskSystem)`

Procesa datos para crear tarea.

```javascript
async handleCreateTaskData(bot, msg, taskSystem) → Promise<void>
```

**Proceso:**
1. Parsea mensaje con `messageParser.parseCreateTask()`
2. Valida con `messageValidator.validateTaskCreation()`
3. Crea tarea con `taskSystem.createTask()`
4. Envía confirmación
5. Limpia estado de conversación

**Ejemplo:**
```javascript
// Usuario envía: *Prueba*08:00*15##
await taskHandler.handleCreateTaskData(bot, msg, taskSystem);
```

---

#### `handleEditTaskData(bot, msg, taskSystem)`

Procesa datos para editar tarea.

```javascript
async handleEditTaskData(bot, msg, taskSystem) → Promise<void>
```

**Proceso:**
1. Parsea mensaje con `messageParser.parseEditTask()`
2. Valida con `messageValidator.validateTaskEdit()`
3. Actualiza tarea con `taskSystem.updateTask()`
4. Envía confirmación
5. Limpia estado de conversación

**Ejemplo:**
```javascript
// Usuario envía: *Prueba*09:00*pista:20*habilitada##
await taskHandler.handleEditTaskData(bot, msg, taskSystem);
```

---

#### `handleManualTest(bot, msg, taskSystem)`

Ejecuta test manual de audio.

```javascript
async handleManualTest(bot, msg, taskSystem) → Promise<void>
```

**Proceso:**
1. Parsea mensaje con `messageParser.parseManualTest()`
2. Valida track
3. Ejecuta con `taskSystem.executeManualTest()`
4. Envía confirmación
5. Limpia estado de conversación

**Ejemplo:**
```javascript
// Usuario envía: *25##
await taskHandler.handleManualTest(bot, msg, taskSystem);
```

---

### Notification Handler

**Archivo:** `handlers/notification-handler.js`

Envía notificaciones y alertas.

#### `sendButtonAlert(bot, config, event, deviceInfo)`

Envía alerta de botón presionado al grupo.

```javascript
async sendButtonAlert(bot, config, event, deviceInfo) → Promise<void>
```

**Parámetros:**
```javascript
config = {
  notification_group: {
    enabled: boolean,
    chat_id: number
  }
}

event = {
  mac: 'EA:89:14:XX:XX:XX',
  timestamp: 1730000000000
}

deviceInfo = {
  nombre: 'ESP32_001',
  ubicacion: 'Sala Principal',
  mac: 'EA:89:14:XX:XX:XX'
}
```

**Mensaje enviado:**
```
🚨 ALERTA - Botón Presionado

📍 Dispositivo: ESP32_001
📌 Ubicación: Sala Principal
🔗 MAC: EA:89:14:XX:XX:XX
🕐 Hora: 25/10/2025 14:30:15

⚠️ Se requiere atención inmediata
```

**Opciones:**
```javascript
{
  parse_mode: 'Markdown',
  disable_notification: false  // Con sonido
}
```

**Ejemplo:**
```javascript
await notificationHandler.sendButtonAlert(
  bot,
  config,
  event,
  deviceInfo
);
```

---

## 🔧 Services

### Auth Service

**Archivo:** `services/auth-service.js`

Gestiona autenticación de usuarios.

#### `initialize(config)`

```javascript
initialize(config) → void
```

**Parámetros:**
```javascript
config = {
  authorized_users: [
    {
      chat_id: number,
      name: string,
      role: 'admin' | 'operator'
    }
  ]
}
```

**Ejemplo:**
```javascript
authService.initialize(config);
```

---

#### `isAuthorized(chatId)`

Verifica si usuario está autorizado.

```javascript
isAuthorized(chatId) → boolean
```

**Parámetros:**
- `chatId` (number) - ID del chat de Telegram

**Retorna:** `true` si autorizado, `false` si no

**Ejemplo:**
```javascript
if (!authService.isAuthorized(msg.chat.id)) {
  await bot.sendMessage(msg.chat.id, '❌ No autorizado');
  return;
}
```

---

#### `getUserInfo(chatId)`

Obtiene información del usuario.

```javascript
getUserInfo(chatId) → User | null
```

**Retorna:**
```javascript
{
  chat_id: number,
  name: string,
  role: 'admin' | 'operator'
}
```

**Ejemplo:**
```javascript
const user = authService.getUserInfo(123456789);
console.log(user.name); // "Jorge Administrador"
```

---

### Message Parser

**Archivo:** `services/message-parser.js`

Parsea mensajes con formatos especiales.

#### `parseCreateTask(text)`

Parsea mensaje de crear tarea.

```javascript
parseCreateTask(text) → ParsedTask | null
```

**Formato esperado:** `*nombre*HH:MM*track##`

**Retorna:**
```javascript
{
  name: string,
  hour: number,
  minute: number,
  track: number
}
```

**Ejemplo:**
```javascript
const data = messageParser.parseCreateTask('*Prueba*08:00*15##');
// {
//   name: 'Prueba',
//   hour: 8,
//   minute: 0,
//   track: 15
// }
```

**Retorna `null` si:**
- Formato inválido
- Faltan campos
- No termina con `##`

---

#### `parseEditTask(text)`

Parsea mensaje de editar tarea.

```javascript
parseEditTask(text) → ParsedTaskEdit | null
```

**Formato esperado:** `*nombre*HH:MM*pista:track*estado##`

**Retorna:**
```javascript
{
  name: string,
  hour: number,
  minute: number,
  track: number,
  enabled: boolean
}
```

**Ejemplo:**
```javascript
const data = messageParser.parseEditTask('*Prueba*09:00*pista:20*habilitada##');
// {
//   name: 'Prueba',
//   hour: 9,
//   minute: 0,
//   track: 20,
//   enabled: true
// }
```

---

#### `parseManualTest(text)`

Parsea mensaje de test manual.

```javascript
parseManualTest(text) → ParsedTest | null
```

**Formato esperado:** `*track##`

**Retorna:**
```javascript
{
  track: number
}
```

**Ejemplo:**
```javascript
const data = messageParser.parseManualTest('*25##');
// { track: 25 }
```

---

### Response Builder

**Archivo:** `services/response-builder.js`

Construye mensajes formateados.

#### `buildWelcomeMessage(userName)`

```javascript
buildWelcomeMessage(userName) → string
```

**Ejemplo:**
```javascript
const msg = responseBuilder.buildWelcomeMessage('Jorge');
await bot.sendMessage(chatId, msg);
```

---

#### `buildTaskCreatedMessage(task)`

```javascript
buildTaskCreatedMessage(task) → string
```

**Parámetros:**
```javascript
task = {
  id: string,
  name: string,
  hour: number,
  minute: number,
  track: number,
  enabled: boolean
}
```

**Ejemplo:**
```javascript
const msg = responseBuilder.buildTaskCreatedMessage(task);
await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
```

---

#### `buildTaskListMessage(tasks)`

```javascript
buildTaskListMessage(tasks) → string
```

**Parámetros:**
```javascript
tasks = [
  {
    id: string,
    name: string,
    hour: number,
    minute: number,
    track: number,
    enabled: boolean
  }
]
```

**Ejemplo:**
```javascript
const msg = responseBuilder.buildTaskListMessage(tasks);
const keyboard = responseBuilder.buildTaskListKeyboard(tasks);

await bot.sendMessage(chatId, msg, {
  parse_mode: 'Markdown',
  reply_markup: keyboard
});
```

---

#### `buildTaskListKeyboard(tasks)`

Genera teclado inline para lista de tareas.

```javascript
buildTaskListKeyboard(tasks) → InlineKeyboard
```

**Retorna:**
```javascript
{
  inline_keyboard: [
    [
      { text: '✏️ 1', callback_data: 'edit_task:taskId1' },
      { text: '🔴 1', callback_data: 'toggle_task:taskId1' },
      { text: '🗑️ 1', callback_data: 'delete_task:taskId1' }
    ]
  ]
}
```

**Ejemplo:**
```javascript
const keyboard = responseBuilder.buildTaskListKeyboard(tasks);
await bot.sendMessage(chatId, 'Lista de tareas', {
  reply_markup: keyboard
});
```

---

## 🛠️ Utilities

### Logger

**Archivo:** `utils/logger.js`

Sistema de logging con niveles y colores.

#### `info(message, [data])`

```javascript
info(message, data?) → void
```

**Ejemplo:**
```javascript
logger.info('Tarea creada exitosamente');
logger.info('Usuario conectado', { id: 123, name: 'Jorge' });
```

**Salida:**
```
[25/10/2025 14:30:15] [INFO] [TelegramBot] Tarea creada exitosamente
```

---

#### `error(message, [error])`

```javascript
error(message, error?) → void
```

**Ejemplo:**
```javascript
try {
  await taskSystem.createTask();
} catch (error) {
  logger.error('Error creando tarea', error);
}
```

**Salida:**
```
[25/10/2025 14:30:15] [ERROR] [TelegramBot] Error creando tarea
Error: Invalid parameters
    at createTask (task-system.js:45:11)
    ...
```

---

#### `warn(message, [data])`

```javascript
warn(message, data?) → void
```

**Ejemplo:**
```javascript
logger.warn('Usuario no autorizado', { chatId: 999999 });
```

---

#### `debug(message, [data])`

```javascript
debug(message, data?) → void
```

**Ejemplo:**
```javascript
logger.debug('Mensaje parseado', parsedData);
```

---

### Message Validator

**Archivo:** `utils/message-validator.js`

Valida datos antes de procesarlos.

#### `validateTaskCreation(data)`

```javascript
validateTaskCreation(data) → ValidationResult
```

**Parámetros:**
```javascript
data = {
  name: string,
  hour: number,
  minute: number,
  track: number
}
```

**Retorna:**
```javascript
{
  valid: boolean,
  error?: string
}
```

**Ejemplo:**
```javascript
const validation = messageValidator.validateTaskCreation(data);
if (!validation.valid) {
  await bot.sendMessage(chatId, `❌ ${validation.error}`);
  return;
}
```

---

#### `validateTaskEdit(data)`

```javascript
validateTaskEdit(data) → ValidationResult
```

**Parámetros:**
```javascript
data = {
  name: string,
  hour: number,
  minute: number,
  track: number,
  enabled: boolean
}
```

---

#### `isValidTrack(track)`

```javascript
isValidTrack(track) → boolean
```

**Ejemplo:**
```javascript
if (!messageValidator.isValidTrack(track)) {
  await bot.sendMessage(chatId, '❌ Track inválido (0-999)');
  return;
}
```

---

#### `isValidTime(hour, minute)`

```javascript
isValidTime(hour, minute) → boolean
```

**Ejemplo:**
```javascript
if (!messageValidator.isValidTime(hour, minute)) {
  await bot.sendMessage(chatId, '❌ Hora inválida');
  return;
}
```

---

## 🔗 Integración Externa

### Interfaz de TaskSystem

Métodos que debe implementar TaskSystem:

```javascript
interface TaskSystem {
  // Crear tarea
  createTask(
    name: string,
    hour: number,
    minute: number,
    track: number
  ): Promise<Task>

  // Listar tareas
  listTasks(): Promise<Task[]>

  // Obtener tarea por ID
  getTask(taskId: string): Promise<Task>

  // Actualizar tarea
  updateTask(
    taskId: string,
    updates: Partial<Task>
  ): Promise<Task>

  // Eliminar tarea
  deleteTask(taskId: string): Promise<void>

  // Habilitar/Deshabilitar tarea
  toggleTask(taskId: string): Promise<Task>

  // Test manual
  executeManualTest(track: number): Promise<void>

  // Estado del sistema
  getStatus(): Promise<Status>
}
```

**Estructura de Task:**
```javascript
{
  id: string,
  name: string,
  hour: number,
  minute: number,
  track: number,
  enabled: boolean,
  cronExpression?: string,
  createdAt?: number,
  updatedAt?: number
}
```

**Estructura de Status:**
```javascript
{
  active: boolean,
  uptime: number,
  tasksCount: number,
  enabledCount: number,
  disabledCount: number,
  lastExecution?: number,
  nextTask?: {
    name: string,
    time: string
  }
}
```

---

### Interfaz de MQTT Client

Eventos que debe emitir el cliente MQTT:

```javascript
mqttClient.on('message', (topic, message) => {
  // topic: 'events/button'
  // message: Buffer
});
```

**Formato de mensaje:**
```javascript
{
  event: 'button',
  mac: 'EA:89:14:XX:XX:XX',
  timestamp: 1730000000000
}
```

---

## 📡 Eventos y Callbacks

### Eventos de Telegram Bot

```javascript
// Mensaje
bot.on('message', async (msg) => {
  await messageHandler.handleMessage(bot, msg, taskSystem);
});

// Callback query (botones inline)
bot.on('callback_query', async (query) => {
  await commandHandler.handleCallbackQuery(bot, query, taskSystem);
});

// Error
bot.on('polling_error', (error) => {
  logger.error('Error de polling', error);
});
```

---

### Callbacks de Botones Inline

**Formato de `callback_data`:**

```javascript
// Editar tarea
'edit_task:audio_test_1'

// Toggle (habilitar/deshabilitar)
'toggle_task:audio_test_1'

// Eliminar (solicitar confirmación)
'delete_task:audio_test_1'

// Confirmar eliminación
'confirm_delete:audio_test_1'

// Cancelar eliminación
'cancel_delete:audio_test_1'
```

**Procesamiento:**
```javascript
const [action, taskId] = query.data.split(':');

switch (action) {
  case 'edit_task':
    // Iniciar flujo de edición
    break;
  case 'toggle_task':
    // Habilitar/Deshabilitar
    break;
  case 'delete_task':
    // Mostrar confirmación
    break;
  // ...
}
```

---

## 💻 Ejemplos de Integración

### Ejemplo 1: Integrar con TaskSystem

```javascript
// backend/index.js
const { telegramBotManager } = require('./telegram-bot');
const taskSystem = require('./task-system');

async function initializeBot() {
  try {
    // Inyectar TaskSystem
    telegramBotManager.setTaskSystem(taskSystem);
    
    // Inicializar bot
    await telegramBotManager.initialize();
    
    // Iniciar bot
    await telegramBotManager.start();
    
    console.log('✅ Bot iniciado exitosamente');
    
  } catch (error) {
    console.error('❌ Error iniciando bot:', error);
    process.exit(1);
  }
}

initializeBot();
```

---

### Ejemplo 2: Integrar con MQTT

```javascript
// backend/index.js
const { telegramBotManager } = require('./telegram-bot');
const mqtt = require('mqtt');

// Conectar a MQTT
const mqttClient = mqtt.connect('mqtt://localhost:1883');

mqttClient.on('connect', () => {
  console.log('✅ Conectado a MQTT');
  
  // Suscribirse a eventos
  mqttClient.subscribe('events/button');
  
  // Inyectar cliente en bot
  telegramBotManager.setMqttClient(mqttClient);
});

mqttClient.on('message', (topic, message) => {
  if (topic === 'events/button') {
    const event = JSON.parse(message.toString());
    
    // Procesar evento
    telegramBotManager.handleButtonEvent(event);
  }
});
```

---

### Ejemplo 3: Sistema Completo

```javascript
// backend/index.js
const { telegramBotManager } = require('./telegram-bot');
const taskSystem = require('./task-system');
const mqtt = require('mqtt');

async function main() {
  try {
    // 1. Inicializar TaskSystem
    await taskSystem.initialize();
    console.log('✅ TaskSystem inicializado');
    
    // 2. Conectar MQTT
    const mqttClient = mqtt.connect('mqtt://localhost:1883');
    
    await new Promise((resolve) => {
      mqttClient.on('connect', () => {
        console.log('✅ MQTT conectado');
        mqttClient.subscribe('events/button');
        resolve();
      });
    });
    
    // 3. Configurar Telegram Bot
    telegramBotManager.setTaskSystem(taskSystem);
    telegramBotManager.setMqttClient(mqttClient);
    
    await telegramBotManager.initialize();
    await telegramBotManager.start();
    
    console.log('✅ Sistema completo iniciado');
    
    // 4. Manejar eventos MQTT
    mqttClient.on('message', (topic, message) => {
      if (topic === 'events/button') {
        const event = JSON.parse(message.toString());
        telegramBotManager.handleButtonEvent(event);
      }
    });
    
    // 5. Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Deteniendo sistema...');
      
      await telegramBotManager.stop();
      await taskSystem.stop();
      mqttClient.end();
      
      console.log('✅ Sistema detenido');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando sistema:', error);
    process.exit(1);
  }
}

main();
```

---

### Ejemplo 4: Escuchar Eventos del Bot

```javascript
const { telegramBotManager } = require('./telegram-bot');

// Evento: Tarea creada
telegramBotManager.on('task_created', (task) => {
  console.log(`Tarea creada: ${task.name}`);
  // Enviar a sistema de monitoreo, etc.
});

// Evento: Tarea eliminada
telegramBotManager.on('task_deleted', (taskId) => {
  console.log(`Tarea eliminada: ${taskId}`);
});

// Evento: Test manual ejecutado
telegramBotManager.on('manual_test', (track) => {
  console.log(`Test manual ejecutado: pista ${track}`);
});

// Evento: Alerta enviada
telegramBotManager.on('alert_sent', (event) => {
  console.log(`Alerta enviada para dispositivo: ${event.mac}`);
});
```

---

### Ejemplo 5: Crear Tarea Programáticamente

```javascript
// Desde otro módulo
const { telegramBotManager } = require('./telegram-bot');

async function createScheduledTask() {
  const taskSystem = telegramBotManager.taskSystem;
  
  try {
    const task = await taskSystem.createTask(
      'Verificación Automática',
      8,
      0,
      15
    );
    
    console.log('Tarea creada:', task);
    
  } catch (error) {
    console.error('Error creando tarea:', error);
  }
}
```

---

## 📊 Tipos de Datos

### Message (Telegram)

```typescript
interface Message {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup';
    title?: string;
  };
  date: number;
  text?: string;
}
```

---

### CallbackQuery (Telegram)

```typescript
interface CallbackQuery {
  id: string;
  from: User;
  message: Message;
  data: string;
}
```

---

### Task

```typescript
interface Task {
  id: string;
  name: string;
  hour: number;
  minute: number;
  track: number;
  enabled: boolean;
  cronExpression?: string;
  createdAt?: number;
  updatedAt?: number;
}
```

---

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

---

### ButtonEvent

```typescript
interface ButtonEvent {
  event: 'button';
  mac: string;
  timestamp: number;
}
```

---

### DeviceInfo

```typescript
interface DeviceInfo {
  nombre: string;
  ubicacion: string;
  mac: string;
}
```

---

## 🔒 Consideraciones de Seguridad

### Autenticación

```javascript
// SIEMPRE verificar autorización antes de procesar
if (!authService.isAuthorized(msg.chat.id)) {
  logger.warn(`Acceso denegado: ${msg.chat.id}`);
  return;
}
```

### Validación de Entrada

```javascript
// SIEMPRE validar datos antes de usar
const validation = messageValidator.validateTaskCreation(data);
if (!validation.valid) {
  await bot.sendMessage(chatId, `❌ ${validation.error}`);
  return;
}
```

### Sanitización

```javascript
// Sanitizar nombres de tarea
const cleanName = messageValidator.sanitizeTaskName(data.name);
```

---

## 📝 Notas Importantes

### Asincronía

- Todos los métodos de handlers son `async`
- Siempre usar `await` al llamar servicios externos
- Manejar errores con `try-catch`

### Estado de Conversación

```javascript
// Guardar estado
userFlows[chatId] = {
  flow: 'awaiting_task_creation',
  data: {}
};

// Limpiar estado
delete userFlows[chatId];
```

### Logging

```javascript
// SIEMPRE loguear operaciones importantes
logger.info('Tarea creada', { taskId, userId });
logger.error('Error en operación', error);
logger.warn('Intento no autorizado', { chatId });
```

---

## 🚀 Mejores Prácticas

### 1. Manejo de Errores

```javascript
try {
  await taskSystem.createTask(data);
} catch (error) {
  logger.error('Error creando tarea', error);
  await bot.sendMessage(chatId, '❌ Error al crear tarea');
  // NO relanzar el error (bot debe continuar)
}
```

### 2. Validación Temprana

```javascript
// Validar ANTES de procesar
if (!data || !data.name) {
  return { valid: false, error: 'Datos inválidos' };
}
```

### 3. Mensajes Descriptivos

```javascript
// Mensajes claros y accionables
await bot.sendMessage(
  chatId,
  '❌ La hora debe estar entre 0 y 23. Ejemplo: 08:00'
);
```

### 4. Cleanup de Recursos

```javascript
// Siempre limpiar estado
try {
  // ...operación
} finally {
  delete userFlows[chatId];
}
```

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025