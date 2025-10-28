# 🏗️ Arquitectura del Telegram Bot

> Documentación técnica de la arquitectura, patrones de diseño y flujos de datos del sistema de bot de Telegram.

---

## 📋 Tabla de Contenidos

- [Visión General](#-visión-general)
- [Diagrama de Arquitectura](#-diagrama-de-arquitectura)
- [Patrones de Diseño](#-patrones-de-diseño)
- [Estructura de Carpetas](#-estructura-de-carpetas)
- [Componentes Principales](#-componentes-principales)
- [Flujo de Datos](#-flujo-de-datos)
- [Ciclo de Vida](#-ciclo-de-vida)
- [Integración con Sistemas Externos](#-integración-con-sistemas-externos)
- [Manejo de Errores](#-manejo-de-errores)

---

## 🎯 Visión General

El Telegram Bot está diseñado como un **sistema modular y escalable** que sigue principios SOLID y patrones de diseño probados. La arquitectura se basa en:

- **Separación de responsabilidades**: Cada componente tiene una función específica
- **Inyección de dependencias**: Componentes desacoplados y testables
- **Singleton pattern**: Instancia única del bot manager
- **Event-driven**: Respuesta a eventos de Telegram y MQTT
- **Logging centralizado**: Trazabilidad completa de operaciones

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         TELEGRAM API                            │
│                    (node-telegram-bot-api)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TelegramBotManager (Singleton)                │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   loadConfig │  │  initialize  │  │    start     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────┬────────────────┬────────────────┬─────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌────────────────┐ ┌─────────────┐ ┌──────────────────┐
│  Auth Service  │ │  Handlers   │ │  Event Listeners │
└────────────────┘ └──────┬──────┘ └──────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ Message Handler │ │   Command   │ │  Notification   │
│                 │ │   Handler   │ │    Handler      │
│  - Clasifica    │ │             │ │                 │
│  - Rutea        │ │ - /start    │ │ - sendAlert()   │
│  - Valida       │ │ - /ayuda    │ │ - sendToGroup() │
│                 │ │ - /status   │ │                 │
└────────┬────────┘ │ - /creartarea│└─────────────────┘
         │          │ - /listartareas                  
         │          │ - /testmanual│                   
         │          └──────┬───────┘                   
         │                 │                            
         ▼                 ▼                            
┌─────────────────┐ ┌─────────────────┐               
│  Task Handler   │ │    Services     │               
│                 │ │                 │               
│ - createTask    │ │ ┌─────────────┐ │               
│ - editTask      │ │ │   Parser    │ │               
│ - deleteTask    │ │ │             │ │               
│ - manualTest    │ │ │ - parseCreate│               
│                 │ │ │ - parseEdit │ │               
└────────┬────────┘ │ │ - parseTest │ │               
         │          │ └─────────────┘ │               
         │          │                 │               
         │          │ ┌─────────────┐ │               
         │          │ │  Response   │ │               
         │          │ │  Builder    │ │               
         │          │ │             │ │               
         │          │ │ - buildMsg  │ │               
         │          │ │ - buildKeyb │ │               
         │          │ └─────────────┘ │               
         │          └─────────────────┘               
         │                                             
         ▼                                             
┌─────────────────────────────────────┐               
│           Utilities                 │               
│                                     │               
│  ┌──────────┐    ┌──────────────┐  │               
│  │  Logger  │    │  Validator   │  │               
│  │          │    │              │  │               
│  │ - info() │    │ - validateTask│ │               
│  │ - error()│    │ - validateTime│ │               
│  │ - warn() │    │ - validateTrack│ │              
│  └──────────┘    └──────────────┘  │               
└─────────────────────────────────────┘               
         │                                             
         ▼                                             
┌─────────────────────────────────────────────────────┐
│              External Systems                       │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  TaskSystem  │  │ MQTT Broker  │  │  Files   │ │
│  │              │  │              │  │          │ │
│  │ - createTask │  │ - subscribe  │  │ - config │ │
│  │ - listTasks  │  │ - publish    │  │ - logs   │ │
│  │ - getStatus  │  │              │  │ - data   │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Patrones de Diseño

### 1. **Singleton Pattern**

**Aplicado en:** `TelegramBotManager`

```javascript
class TelegramBotManager {
  constructor() {
    if (TelegramBotManager.instance) {
      return TelegramBotManager.instance;
    }
    TelegramBotManager.instance = this;
    // ...
  }
}

// Uso
const { telegramBotManager } = require('./telegram-bot-manager');
```

**Beneficios:**
- ✅ Una sola instancia del bot
- ✅ Estado global compartido
- ✅ Acceso consistente desde cualquier módulo

---

### 2. **Strategy Pattern**

**Aplicado en:** Handlers (clasificación de mensajes)

```javascript
// message-handler.js
async function handleMessage(bot, msg, taskSystem) {
  if (isCommand(msg.text)) {
    // Estrategia: Comando
    await commandHandler.handleCommand(bot, msg, taskSystem);
  } else if (isTaskCreationData(msg.text)) {
    // Estrategia: Crear tarea
    await taskHandler.handleCreateTaskData(bot, msg, taskSystem);
  } else if (isTaskEditData(msg.text)) {
    // Estrategia: Editar tarea
    await taskHandler.handleEditTaskData(bot, msg, taskSystem);
  }
  // ...más estrategias
}
```

**Beneficios:**
- ✅ Lógica de procesamiento intercambiable
- ✅ Fácil agregar nuevos tipos de mensajes
- ✅ Código limpio y mantenible

---

### 3. **Builder Pattern**

**Aplicado en:** `ResponseBuilder`

```javascript
// response-builder.js
function buildTaskCreatedMessage(task) {
  const time = formatTime(task.hour, task.minute);
  
  return `✅ *Tarea Creada Exitosamente*\n\n` +
         `📌 *Nombre:* ${task.name}\n` +
         `🕐 *Hora:* ${time}\n` +
         `🎵 *Pista:* ${task.track}\n` +
         // ...más construcción
}
```

**Beneficios:**
- ✅ Mensajes consistentes
- ✅ Formateo centralizado
- ✅ Fácil modificación de templates

---

### 4. **Dependency Injection**

**Aplicado en:** Todos los handlers

```javascript
// Inyección de dependencias
async function handleCommand(bot, msg, taskSystem) {
  // bot, msg, taskSystem son inyectados
  const chatId = msg.chat.id;
  // ...usar dependencias
}
```

**Beneficios:**
- ✅ Componentes desacoplados
- ✅ Fácil testing con mocks
- ✅ Flexibilidad en configuración

---

### 5. **Chain of Responsibility**

**Aplicado en:** Validación de mensajes

```javascript
// Cadena de validación
function validateTaskCreation(data) {
  const nameValidation = validateTaskName(data.name);
  if (!nameValidation.valid) return nameValidation;

  const timeValidation = validateTime(data.hour, data.minute);
  if (!timeValidation.valid) return timeValidation;

  const trackValidation = validateTrack(data.track);
  if (!trackValidation.valid) return trackValidation;

  return { valid: true };
}
```

**Beneficios:**
- ✅ Validaciones secuenciales
- ✅ Early return en errores
- ✅ Mensajes de error específicos

---

## 📁 Estructura de Carpetas

```
backend/telegram-bot/
│
├── telegram-bot-manager.js      # Orquestador principal (Singleton)
├── index.js                     # Punto de entrada
│
├── handlers/                    # Manejadores de eventos
│   ├── message-handler.js       # Clasificador de mensajes
│   ├── command-handler.js       # Procesador de comandos
│   ├── task-handler.js          # Gestión de tareas
│   └── notification-handler.js  # Envío de alertas
│
├── services/                    # Servicios de negocio
│   ├── auth-service.js          # Autenticación
│   ├── message-parser.js        # Parsing de mensajes
│   └── response-builder.js      # Constructor de respuestas
│
├── utils/                       # Utilidades
│   ├── logger.js                # Sistema de logging
│   └── message-validator.js     # Validaciones
│
└── docs/                        # Documentación
    ├── README.md
    ├── ARCHITECTURE.md
    ├── USER-GUIDE.md
    ├── API-REFERENCE.md
    └── DEPLOYMENT.md
```

---

## 🔧 Componentes Principales

### **TelegramBotManager** (Core)

**Responsabilidades:**
- ✅ Gestión del ciclo de vida del bot
- ✅ Carga de configuración
- ✅ Inicialización de servicios
- ✅ Registro de event listeners
- ✅ Coordinación de handlers

**Métodos principales:**
```javascript
async initialize()        // Inicializa bot y servicios
async start()            // Inicia polling/webhook
async stop()             // Detiene bot
async loadConfig()       // Carga telegram-config.json
setTaskSystem(ts)        // Inyecta TaskSystem
setMqttClient(client)    // Inyecta cliente MQTT
```

---

### **Message Handler** (Clasificador)

**Responsabilidades:**
- ✅ Recibir todos los mensajes
- ✅ Clasificar tipo de mensaje
- ✅ Rutear a handler correspondiente
- ✅ Logging de mensajes

**Flujo:**
```
Mensaje → Autenticar → Clasificar → Rutear → Procesar
```

---

### **Command Handler** (Comandos)

**Responsabilidades:**
- ✅ Procesar comandos (`/start`, `/ayuda`, etc.)
- ✅ Validar permisos
- ✅ Ejecutar acciones
- ✅ Enviar respuestas

**Comandos soportados:**
- `/start` - Bienvenida
- `/ayuda` - Ayuda
- `/creartarea` - Iniciar creación
- `/listartareas` - Listar tareas
- `/testmanual` - Test manual
- `/status` - Estado del sistema

---

### **Task Handler** (Tareas)

**Responsabilidades:**
- ✅ Gestionar flujos de creación/edición
- ✅ Parsear datos de mensajes
- ✅ Validar datos
- ✅ Interactuar con TaskSystem
- ✅ Manejar callbacks de botones

**Flujos principales:**
```
Crear Tarea:
1. /creartarea → Instrucciones
2. *datos*## → Parsear → Validar → Crear
3. Confirmación

Editar Tarea:
1. /listartareas → Lista con botones
2. Click ✏️ → Instrucciones
3. *datos*## → Parsear → Validar → Actualizar
4. Confirmación

Eliminar Tarea:
1. /listartareas → Lista
2. Click 🗑️ → Confirmación
3. Click ✅ → Eliminar
4. Confirmación
```

---

### **Notification Handler** (Alertas)

**Responsabilidades:**
- ✅ Enviar alertas de eventos
- ✅ Formatear mensajes de alerta
- ✅ Gestionar grupo de notificaciones
- ✅ Logging de notificaciones

**Eventos manejados:**
```javascript
// Evento MQTT de botón presionado
{
  event: 'button',
  mac: 'EA:89:14:XX:XX:XX',
  timestamp: 1730000000000
}

// Se envía alerta al grupo con datos desde alarmas.json
```

---

### **Auth Service** (Autenticación)

**Responsabilidades:**
- ✅ Cargar usuarios autorizados
- ✅ Verificar permisos
- ✅ Logging de accesos

**Métodos:**
```javascript
initialize(config)           // Cargar usuarios
isAuthorized(chatId)        // Verificar acceso
getUserInfo(chatId)         // Obtener info usuario
```

---

### **Message Parser** (Parsing)

**Responsabilidades:**
- ✅ Extraer campos de mensajes
- ✅ Parsear formatos especiales
- ✅ Validar estructura
- ✅ Retornar objetos estructurados

**Formatos parseados:**
```javascript
// Crear tarea: *nombre*HH:MM*track##
parseCreateTask(text) → { name, hour, minute, track }

// Editar tarea: *nombre*HH:MM*pista:track*estado##
parseEditTask(text) → { name, hour, minute, track, enabled }

// Test manual: *track##
parseManualTest(text) → { track }
```

---

### **Response Builder** (Respuestas)

**Responsabilidades:**
- ✅ Construir mensajes formateados
- ✅ Generar teclados inline
- ✅ Templates de respuestas
- ✅ Consistencia en formato

**Tipos de mensajes:**
- Instrucciones
- Confirmaciones
- Listas
- Estados
- Alertas

---

### **Logger** (Logging)

**Responsabilidades:**
- ✅ Logging a consola (con colores)
- ✅ Logging a archivo
- ✅ Rotación de logs
- ✅ Niveles de log (ERROR, WARN, INFO, DEBUG)

**Configuración:**
```javascript
{
  logToFile: true,
  logToConsole: true,
  logFilePath: '../../../logs/telegram-bot.log',
  maxFileSize: 5MB,
  colorize: true
}
```

---

### **Message Validator** (Validaciones)

**Responsabilidades:**
- ✅ Validar datos parseados
- ✅ Verificar rangos
- ✅ Sanitizar entrada
- ✅ Retornar mensajes de error descriptivos

**Validaciones:**
```javascript
validateTaskCreation(data)   // Validar crear tarea
validateTaskEdit(data)       // Validar editar tarea
validateTime(hour, minute)   // Validar hora
validateTrack(track)         // Validar track
isValidTaskId(id)           // Validar ID
```

---

## 🔄 Flujo de Datos

### **Flujo 1: Recepción de Mensaje**

```
┌─────────────┐
│   Usuario   │
│  (Telegram) │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Telegram API      │
│   (node-telegram)   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ TelegramBotManager  │
│  event: 'message'   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Message Handler    │
│  - isAuthorized?    │
└──────┬──────────────┘
       │
       ├─ NO → Denegar acceso
       │
       ├─ SÍ → Clasificar
       │
       ▼
┌─────────────────────┐
│  ¿Tipo de mensaje?  │
└──────┬──────────────┘
       │
       ├─ Comando ────────────┐
       │                      ▼
       │              ┌───────────────┐
       │              │ Command       │
       │              │ Handler       │
       │              └───────┬───────┘
       │                      │
       ├─ Datos tarea ────────┤
       │                      ▼
       │              ┌───────────────┐
       │              │ Task Handler  │
       │              │ - Parse       │
       │              │ - Validate    │
       │              │ - Execute     │
       │              └───────┬───────┘
       │                      │
       └──────────────────────┤
                              ▼
                      ┌───────────────┐
                      │ TaskSystem    │
                      │ - createTask  │
                      │ - updateTask  │
                      │ - deleteTask  │
                      └───────┬───────┘
                              │
                              ▼
                      ┌───────────────┐
                      │  Respuesta    │
                      │  al Usuario   │
                      └───────────────┘
```

---

### **Flujo 2: Evento MQTT (Botón Presionado)**

```
┌─────────────┐
│ Dispositivo │
│   ESP32     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   MQTT Broker       │
│ topic: events/button│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  MQTT Client (App)  │
│  - subscribe()      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ TelegramBotManager  │
│ handleButtonEvent() │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Notification Handler│
│ - Buscar en         │
│   alarmas.json      │
│ - Formatear alerta  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Telegram API       │
│  sendMessage()      │
│  to group_chat_id   │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│   Grupo     │
│  Telegram   │
└─────────────┘
```

---

### **Flujo 3: Crear Tarea (Completo)**

```
Usuario: /creartarea
    │
    ▼
CommandHandler
    │
    ├─ Guardar estado: userFlows[chatId] = 'awaiting_task_creation'
    │
    └─ Enviar instrucciones
    
Usuario: *Prueba*08:00*15##
    │
    ▼
MessageHandler
    │
    ├─ Verificar: userFlows[chatId] === 'awaiting_task_creation'
    │
    ▼
TaskHandler.handleCreateTaskData()
    │
    ├─ messageParser.parseCreateTask(text)
    │   └─ Retorna: { name: "Prueba", hour: 8, minute: 0, track: 15 }
    │
    ├─ messageValidator.validateTaskCreation(data)
    │   └─ Retorna: { valid: true }
    │
    ├─ taskSystem.createTask(name, hour, minute, track)
    │   └─ Retorna: { id: "audio_test_1", ... }
    │
    ├─ Limpiar estado: delete userFlows[chatId]
    │
    └─ responseBuilder.buildTaskCreatedMessage(task)
        └─ Enviar confirmación
```

---

## ⚡ Ciclo de Vida

### **Inicialización**

```javascript
// 1. Importar módulo
const { telegramBotManager } = require('./telegram-bot-manager');

// 2. Inyectar dependencias
telegramBotManager.setTaskSystem(taskSystemInstance);
telegramBotManager.setMqttClient(mqttClientInstance);

// 3. Inicializar
await telegramBotManager.initialize();
// - Carga telegram-config.json
// - Inicializa authService
// - Crea instancia de bot
// - Registra event listeners

// 4. Iniciar
await telegramBotManager.start();
// - Inicia polling/webhook
// - Bot operativo
```

---

### **Operación**

```javascript
// Bot en ejecución
// - Escucha mensajes de Telegram
// - Procesa comandos
// - Gestiona tareas
// - Envía notificaciones
// - Loguea operaciones
```

---

### **Detención**

```javascript
// Graceful shutdown
await telegramBotManager.stop();
// - Detiene polling
// - Cierra conexiones
// - Guarda estado si necesario
// - Log de cierre
```

---

## 🔗 Integración con Sistemas Externos

### **TaskSystem**

**Interfaz de integración:**
```javascript
// Métodos que debe proveer TaskSystem
taskSystem.createTask(name, hour, minute, track)
taskSystem.listTasks()
taskSystem.getTask(taskId)
taskSystem.updateTask(taskId, updates)
taskSystem.deleteTask(taskId)
taskSystem.executeManualTest(track)
taskSystem.getStatus()
```

**Inyección:**
```javascript
telegramBotManager.setTaskSystem(taskSystemInstance);
```

---

### **MQTT Broker**

**Tópicos suscritos:**
```javascript
// events/button - Eventos de botón presionado
{
  event: 'button',
  mac: 'EA:89:14:XX:XX:XX',
  timestamp: 1730000000000
}
```

**Handler de eventos:**
```javascript
mqttClient.on('message', (topic, message) => {
  if (topic === 'events/button') {
    const event = JSON.parse(message.toString());
    telegramBotManager.handleButtonEvent(event);
  }
});
```

---

### **Archivos de Datos**

**telegram-config.json:**
```javascript
// Carga: Al inicializar
// Uso: Configuración del bot, usuarios, grupo
// Ubicación: backend/data/telegram-config.json
```

**alarmas.json:**
```javascript
// Carga: Al enviar notificación
// Uso: Información de dispositivos
// Ubicación: backend/data/alarmas.json
```

**tareas.json:**
```javascript
// Gestión: Por TaskSystem
// Acceso: A través de métodos de TaskSystem
// Ubicación: backend/data/tareas.json
```

---

## 🛡️ Manejo de Errores

### **Niveles de Manejo**

```javascript
// 1. Validación temprana
const validation = messageValidator.validateTaskCreation(data);
if (!validation.valid) {
  await bot.sendMessage(chatId, `❌ ${validation.error}`);
  return;
}

// 2. Try-Catch en operaciones
try {
  await taskSystem.createTask(data);
} catch (error) {
  logger.error('Error creando tarea:', error);
  await bot.sendMessage(chatId, '❌ Error al crear tarea');
}

// 3. Logging de errores
logger.error('Error en handler:', error);
// - Stack trace completo
// - Guardado en archivo
// - Mostrado en consola (desarrollo)
```

---

### **Estrategias de Recuperación**

**Error de conexión MQTT:**
```javascript
// Continuar operando sin notificaciones
// Loguear error
// Reintentar conexión
```

**Error de TaskSystem:**
```javascript
// Informar al usuario
// No detener el bot
// Loguear error detallado
```

**Error de parsing:**
```javascript
// Mensaje de error descriptivo al usuario
// Ejemplo de formato correcto
// No crashear
```

---

## 📊 Métricas y Monitoreo

### **Logs Generados**

```
[25/10/2025 14:30:15] [INFO] [TelegramBot] Bot iniciado exitosamente
[25/10/2025 14:30:20] [INFO] [TelegramBot] Mensaje recibido de Jorge (123456)
[25/10/2025 14:30:25] [INFO] [TelegramBot] Comando: /creartarea
[25/10/2025 14:30:30] [INFO] [TelegramBot] Tarea creada: audio_test_1
[25/10/2025 14:30:35] [WARN] [TelegramBot] Usuario no autorizado: 999999
[25/10/2025 14:30:40] [ERROR] [TelegramBot] Error conectando a TaskSystem
```

---

### **Archivo de Logs**

```
backend/logs/telegram-bot.log
- Rotación automática a 5MB
- Mantiene últimos 5 backups
- Formato: timestamp + nivel + módulo + mensaje
```

---

## 🎯 Escalabilidad

### **Capacidad Actual**

- ✅ Múltiples usuarios autorizados
- ✅ Tareas ilimitadas (limitado por TaskSystem)
- ✅ Procesamiento asíncrono
- ✅ Sin límite de grupos de notificación (configurable)

### **Mejoras Futuras**

- 🔄 Webhook para alta disponibilidad
- 🔄 Base de datos para estado persistente
- 🔄 Cache de respuestas frecuentes
- 🔄 Métricas de uso y performance
- 🔄 Rate limiting por usuario

---

## 🔐 Seguridad

### **Medidas Implementadas**

1. **Autenticación obligatoria**
   - Verificación por `chat_id`
   - Lista blanca de usuarios

2. **Validación de entrada**
   - Sanitización de datos
   - Validación de rangos
   - Prevención de inyección

3. **Logging de accesos**
   - Todos los intentos de acceso
   - Usuarios no autorizados
   - Acciones ejecutadas

4. **Configuración segura**
   - Token en archivo externo
   - Exclusión de repositorio
   - Permisos de archivo restringidos

---

## 📝 Conclusiones

La arquitectura del Telegram Bot está diseñada para:

- ✅ **Mantenibilidad**: Código modular y bien organizado
- ✅ **Escalabilidad**: Fácil agregar funcionalidades
- ✅ **Robustez**: Manejo comprehensivo de errores
- ✅ **Seguridad**: Autenticación y validación estrictas
- ✅ **Trazabilidad**: Logging completo de operaciones

**Patrones aplicados** garantizan código limpio, testable y extensible.

**Integración con sistemas externos** es flexible y desacoplada.

**Monitoreo y logging** permiten depuración y auditoría efectivas.

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025