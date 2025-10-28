# Arquitectura del Sistema - Backend MQTT + WebSocket + Task System + Telegram Bot

Este documento describe la arquitectura completa del sistema de backend MQTT, WebSocket para gestión de alarmas, el Sistema de Tareas Programadas y el Bot de Telegram.

---

## Componentes Principales

- **ESP32 (Nodo de alarma):**  
  Dispositivo IoT que envía eventos (botón, heartbeat, reset, etc.) al servidor mediante MQTT y recibe comandos (play_track, configuración, etc.).

- **Broker MQTT:**  
  Intermediario que gestiona los mensajes entre nodos ESP32 y el backend.  
  Ejemplo: Mosquitto en `mqtt://server-sra.local:1883`

- **Servidor Backend (Node.js):**  
  - **Módulo MQTT:** Se conecta al broker MQTT, suscribe eventos y procesa mensajes
  - **Módulo WebSocket:** Maneja conexiones de clientes web en tiempo real
  - **Sistema de Tareas Programadas (Task System):** Automatización de comandos MQTT en horarios específicos
  - **Bot de Telegram:** Gestión remota de tareas y notificaciones de eventos
  - **Integración MQTT ↔ WebSocket:** Broadcasting automático de eventos y traducción de comandos
  - **Capa de traducción MAC ↔ ID:** Compatibilidad entre formatos MQTT y WebSocket
  - Valida y sanitiza los mensajes recibidos
  - Responde a los nodos con comandos y ACK, incluyendo detalles de error si la validación falla
  - Actualiza la información de última conexión y almacena eventos en archivos JSON
  - Permite borrar eventos antiguos por MAC o de todos los dispositivos

- **Cliente Web:**
  - Conexión WebSocket para tiempo real
  - Envío de comandos a dispositivos ESP32
  - Recepción de notificaciones de eventos
  - Gestión de tareas programadas

- **Bot de Telegram:**
  - Gestión CRUD de tareas programadas
  - Ejecución manual de tests de audio
  - Notificaciones de eventos de botón de pánico
  - Estado del sistema en tiempo real

- **Archivos de datos (JSON):**
  - `alarmas.json`: Información principal de cada dispositivo, indexado por ID
  - `registro_evento.json`: Historial de eventos por dispositivo, agrupados por ID
  - `mac_to_id.json`: Tabla de cruce que relaciona la MAC del dispositivo con su ID interno
  - `device_status.json`: Estado actual de dispositivos
  - `task-config.json`: Configuración de tareas programadas (horarios, tracks, etc.)
  - `telegram-config.json`: Configuración del bot de Telegram (token, usuarios autorizados, grupo)

---

## Estructura Completa de Carpetas

```
/red-local-iot
  /backend
    /mqtt
      index.js                 # Lógica de conexión y suscripción MQTT + inicialización TaskSystem y Telegram Bot
      /config
        mqtt-config.js         # Configuración del broker MQTT
        topics-config.js       # Topics de suscripción
      /services
        message-processor.js   # Procesamiento y validación de eventos entrantes + notificación a Telegram
        mqtt-client.js         # Cliente MQTT (conexión y publicación)
        device-monitor.js      # Monitoreo de dispositivos
      /utils
        message-validators.js  # Validadores de formato y estructura de mensajes
      ARQUITECTURA.md          # Arquitectura del módulo MQTT
      README.md                # Documentación del módulo MQTT
      backend-mqtt-commands-guide.md # Guía de comandos MQTT
    
    /task-services            # Sistema de Tareas Programadas
      task-system.js           # Orquestador principal (Singleton)
      task-scheduler.js        # Motor de evaluación temporal (cada 3s)
      task-executor.js         # Publicador MQTT de comandos programados
      task-test.js             # Script de pruebas CRUD
      TASK-SYSTEM-README.md    # Documentación: Overview y arquitectura
      TASK-API-REFERENCE.md    # Documentación: API completa
      TASK-MQTT-PROTOCOL.md    # Documentación: Protocolo MQTT
      TASK-TESTING-GUIDE.md    # Documentación: Guía de testing
    
    /telegram-bot             # ← NUEVO: Bot de Telegram
      telegram-bot-manager.js  # Orquestador principal (Singleton)
      index.js                 # Punto de entrada e inicialización
      /handlers
        message-handler.js     # Clasificador y ruteo de mensajes
        command-handler.js     # Procesador de comandos (/start, /ayuda, etc.)
        task-handler.js        # Gestión de tareas (crear, editar, eliminar)
        notification-handler.js # Envío de alertas al grupo
      /services
        auth-service.js        # Autenticación de usuarios
        message-parser.js      # Parsing de mensajes con formatos especiales
        response-builder.js    # Constructor de respuestas formateadas
      /utils
        logger.js              # Sistema de logging
        message-validator.js   # Validaciones de datos
      /docs
        README.md              # Guía de inicio rápido
        ARCHITECTURE.md        # Arquitectura del bot
        USER-GUIDE.md          # Guía de usuario
        API-REFERENCE.md       # Referencia de API
        DEPLOYMENT.md          # Guía de despliegue
    
    /websocket
      index.js                 # WebSocket Manager principal
      /config
        websocket-config.js    # Configuración WebSocket
      /handlers
        connection-handler.js  # Manejo de conexiones WebSocket
        device-handler.js      # Manejo de comandos de dispositivos
        system-handler.js      # Manejo de comandos del sistema
      /services
        client-manager.js      # Gestión de clientes WebSocket conectados
        message-router.js      # Enrutamiento de mensajes WebSocket
        notification-broadcaster.js # Broadcasting de eventos MQTT → WebSocket
      /utils
        message-validator.js   # Validación de mensajes WebSocket
        response-builder.js    # Constructor de respuestas WebSocket
      /docs
        deployment-guide.md    # Guía de despliegue
        mqtt-websocket-integration.md # Documentación de integración
        websocket-api-reference.md # Referencia de API WebSocket
        websocket-mqtt-integration-test-results.md # Resultados de testing
    
    /public
      /js
        app.js                 # Frontend web
    
    server.js                  # Inicialización principal y servidor Express
    package.json               # Dependencias del proyecto

  /data
    alarmas.json               # Datos de alarmas
    registro_evento.json       # Historial de eventos
    mac_to_id.json             # Cruce MAC <-> ID
    device_status.json         # Estado de dispositivos
    task-config.json           # Configuración de tareas programadas
    task-config-manager.js     # Gestor de persistencia de tareas
    telegram-config.json       # ← NUEVO: Configuración del bot de Telegram
    TASK-CONFIGURATION-GUIDE.md # Guía del archivo JSON
    db-repository.js           # Operaciones de lectura/escritura y mantenimiento de datos
    README.md                  # Documentación de datos
    
  /logs                        # ← NUEVO: Logs del sistema
    telegram-bot.log           # Logs del bot de Telegram
```

---

## Diagrama de Arquitectura Completo

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SISTEMA COMPLETO IOT                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌───────────────┐    ┌──────────────────────────────────────────┐
│  ESP32 Nodo  │◄──►│ Broker MQTT   │◄──►│      Backend Node.js                     │
│              │    │ (Mosquitto)   │    │  ┌────────────────────────────────────┐  │
│ - Botón      │    │               │    │  │    MQTT Module                     │  │
│ - Heartbeat  │    │ Topics:       │    │  │  - message-processor.js            │  │
│ - Audio      │    │ NODO/+/ACK    │    │  │  - mqtt-client.js                  │  │
│              │    │ NODO/+/CMD    │    │  │  - device-monitor.js               │  │
└──────────────┘    │ SYSTEM/TEST   │    │  └──────────────┬─────────────────────┘  │
                    └───────────────┘    │                 │                        │
                                         │                 ▼                        │
┌──────────────┐                         │  ┌────────────────────────────────────┐  │
│ Cliente Web  │◄───────────────────────►│  │  Task System (v2.0.0)              │  │
│              │    WebSocket            │  │  - task-system.js                  │  │
│ - Dashboard  │                         │  │  - task-scheduler.js (3s)          │  │
│ - Comandos   │                         │  │  - task-executor.js                │  │
│ - Eventos RT │                         │  │  - task-config-manager.js          │  │
│              │                         │  └──────────────┬─────────────────────┘  │
└──────────────┘                         │                 │                        │
                                         │                 ▼                        │
┌──────────────┐                         │  ┌────────────────────────────────────┐  │
│ Telegram Bot │◄───────────────────────►│  │  Telegram Bot Module               │  │
│              │    Telegram API         │  │  - telegram-bot-manager.js         │  │
│ - Usuarios   │                         │  │  - Handlers (message, command,     │  │
│ - Grupo      │                         │  │    task, notification)             │  │
│ - Comandos   │                         │  │  - Services (auth, parser,         │  │
│ - Alertas    │                         │  │    response-builder)               │  │
└──────────────┘                         │  │  - Utils (logger, validator)       │  │
                                         │  └──────────────┬─────────────────────┘  │
                                         │                 │                        │
                                         │                 ▼                        │
                                         │  ┌────────────────────────────────────┐  │
                                         │  │  WebSocket Module                  │  │
                                         │  │  - notification-broadcaster        │  │
                                         │  │  - device-handler                  │  │
                                         │  │  - client-manager                  │  │
                                         │  └────────────────────────────────────┘  │
                                         │                 │                        │
                                         │                 ▼                        │
                                         │  ┌────────────────────────────────────┐  │
                                         │  │  Data Layer (JSON + db-repository) │  │
                                         │  │  - alarmas.json                    │  │
                                         │  │  - registro_evento.json            │  │
                                         │  │  - task-config.json                │  │
                                         │  │  - telegram-config.json            │  │
                                         │  │  - mac_to_id.json                  │  │
                                         │  └────────────────────────────────────┘  │
                                         └──────────────────────────────────────────┘
```

---

## Flujos de Interacción

### **1. Flujo de Eventos (ESP32 → Cliente Web + Telegram)**

```
[ESP32] --MQTT--> [Broker] --MQTT--> [message-processor.js]
                                              |
                                              ├──> Validación
                                              ├──> db-repository.addEventoByMac()
                                              ├──> Enviar ACK al ESP32
                                              ├──> [notification-broadcaster.js] → WebSocket Clients
                                              └──> [telegramBotManager.notifyButtonEvent()] ← NUEVO
                                                          |
                                                          └──> [notification-handler.js]
                                                                      |
                                                                      ├──> db.getDeviceByMac()
                                                                      └──> Enviar alerta a grupo Telegram
```

**Ejemplo:**
```
1. ESP32 → Topic: NODO/EA8914/ACK
   Payload: {"dsp":"EA8914","event":"button","time":"2025-10-25T08:00:00Z"}

2. Backend procesa y envía ACK
   Topic: NODO/EA8914/CMD
   Payload: {"dsp":"EA8914","event":"ack_ans_button","time":"2025-10-25T08:00:01Z"}

3. Broadcasting WebSocket
   {"type":"notification","event":"button_pressed","deviceId":"ESP32_001",...}

4. Notificación Telegram (Grupo)
   🚨 ALERTA - Botón Presionado
   📍 Dispositivo: ESP32_001
   📌 Ubicación: Sala Principal
   🔗 MAC: EA:89:14:12:34:56
   🕐 Hora: 25/10/2025 08:00:00
```

---

### **2. Flujo de Comandos (Cliente Web → ESP32)**

```
[Cliente Web] --WebSocket--> [device-handler.js]
                                    |
                                    ├──> Validación
                                    ├──> Traducción ID → MAC
                                    └──> [mqtt-client.js]
                                             |
                                             └──> [Broker MQTT]
                                                       |
                                                       └──> [ESP32]
```

**Ejemplo:**
```
1. Cliente Web → WebSocket
   {"type":"device_command","deviceId":"ESP32_001","command":"play_track","data":{"parameters":{"track":15}}}

2. Backend traduce y publica MQTT
   Topic: NODO/EA8914/CMD
   Payload: {"dsp":"EA8914","event":"play_track","track":15,"time":"2025-10-25T14:30:00Z"}

3. ESP32 responde con ACK
   Topic: NODO/EA8914/ACK
   Payload: {"dsp":"EA8914","event":"ack_ans_play_track","status":"ok",...}
```

---

### **3. Flujo de Tareas Programadas (Task System)**

```
[task-config.json] ──> [task-system.js] ──> [task-scheduler.js]
                                                    │
                                                    ├──> Evaluación cada 3 segundos
                                                    ├──> Verificar hora actual (CDMX)
                                                    └──> ¿Ejecutar tarea?
                                                              │
                                                              └──> [task-executor.js]
                                                                        │
                                                                        └──> [mqtt-client.js]
                                                                                  │
                                                                                  └──> Topic: SYSTEM/TEST
                                                                                        Payload: {"dsp":"all","event":"play_track","track":11,...}
                                                                                              │
                                                                                              └──> [Todos los ESP32]
```

**Ciclo de Evaluación:**
```
┌─────────────────────────────────────────────────────────────┐
│ TaskScheduler Loop (cada 3 segundos)                        │
│                                                              │
│ 1. Obtener hora actual (CDMX, UTC-6)                        │
│ 2. Iterar tareas habilitadas                                │
│ 3. Para cada tarea:                                         │
│    - ¿Hora actual >= hora programada?                       │
│    - ¿Diferencia <= tolerancia (5 min)?                     │
│    - ¿No ejecutada hoy?                                     │
│    → SÍ → Ejecutar (TaskExecutor → MQTT)                    │
│    → NO → Siguiente tarea                                   │
│ 4. Esperar 3 segundos                                       │
│ 5. Repetir                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

### **4. Flujo de Gestión de Tareas (CRUD - Telegram Bot)** ← NUEVO

```
[Usuario Telegram] ──> [Telegram API] ──> [telegram-bot-manager.js]
                                                      |
                                                      ├──> [auth-service.isAuthorized()]
                                                      ├──> [message-handler.handleMessage()]
                                                      |         |
                                                      |         ├──> ¿Comando? → [command-handler]
                                                      |         └──> ¿Datos? → [task-handler]
                                                      |                    |
                                                      |                    ├──> [message-parser.parseCreateTask()]
                                                      |                    ├──> [message-validator.validateTaskCreation()]
                                                      |                    └──> [taskSystem.createTask()]
                                                      |                              |
                                                      |                              └──> [task-config-manager.js]
                                                      |                                        |
                                                      |                                        └──> task-config.json
                                                      |
                                                      └──> [response-builder.buildTaskCreatedMessage()]
                                                                |
                                                                └──> Respuesta a usuario
```

**Ejemplo CRUD desde Telegram:**
```
Usuario: /creartarea

Bot: 📝 Crear Nueva Tarea
     Envía un mensaje con el siguiente formato:
     *nombre*HH:MM*track##

Usuario: *Prueba Tarde*15:30*20##

Bot: ✅ Tarea Creada Exitosamente
     📌 Nombre: Prueba Tarde
     🕐 Hora: 15:30
     🎵 Pista: 20
     🆔 ID: audio_test_1
```

---

### **5. Flujo de Notificación de Botón de Pánico** ← NUEVO

```
[ESP32 presiona botón] --MQTT--> [message-processor.js]
                                        |
                                        ├──> Evento detectado: "button"
                                        |
                                        └──> telegramBotManager.notifyButtonEvent({
                                                   deviceId: "EA8914",
                                                   mac: "EA8914",
                                                   timestamp: "2025-10-25T08:00:00Z",
                                                   topic: "NODO/EA8914/ACK"
                                             })
                                                   |
                                                   └──> [notification-handler.js]
                                                             |
                                                             ├──> db.getDeviceByMac("EA8914")
                                                             |    └──> { name, location, mac, ... }
                                                             |
                                                             ├──> buildButtonAlertMessage()
                                                             |
                                                             └──> bot.sendMessage(groupChatId, mensaje)
                                                                       |
                                                                       └──> [Grupo Telegram]
                                                                            🚨 ALERTA - Botón Presionado
                                                                            📍 Dispositivo: ESP32_001
                                                                            ...
```

---

## Componentes del Telegram Bot Module

### **1. TelegramBotManager (Singleton)** ← NUEVO
**Archivo:** `backend/telegram-bot/telegram-bot-manager.js`

**Responsabilidades:**
- Orquestador principal del bot
- Gestión del ciclo de vida (initialize, start, stop)
- Coordinación de handlers y services
- Registro de event listeners
- Inyección de dependencias (TaskSystem)

**Métodos principales:**
```javascript
// Ciclo de vida
telegramBotManager.initialize()
telegramBotManager.start()
telegramBotManager.stop()

// Configuración
telegramBotManager.loadConfig()
telegramBotManager.setTaskSystem(taskSystem)

// Eventos
telegramBotManager.notifyButtonEvent(eventData)
```

---

### **2. Message Handler** ← NUEVO
**Archivo:** `backend/telegram-bot/handlers/message-handler.js`

**Responsabilidades:**
- Clasificación de mensajes entrantes
- Autenticación de usuarios
- Ruteo a handlers correspondientes
- Logging de mensajes

**Tipos de mensajes manejados:**
- Comandos (`/start`, `/ayuda`, `/creartarea`, etc.)
- Datos de crear tarea (`*nombre*HH:MM*track##`)
- Datos de editar tarea (`*nombre*HH:MM*pista:X*estado##`)
- Datos de test manual (`*track##`)

---

### **3. Command Handler** ← NUEVO
**Archivo:** `backend/telegram-bot/handlers/command-handler.js`

**Responsabilidades:**
- Procesamiento de comandos de Telegram
- Manejo de callbacks de botones inline
- Gestión de flujos de conversación

**Comandos soportados:**
```javascript
/start              // Mensaje de bienvenida
/ayuda, /help       // Ayuda completa
/creartarea         // Iniciar creación de tarea
/listartareas       // Listar tareas con botones
/testmanual         // Test manual de audio
/status             // Estado del sistema
```

---

### **4. Task Handler** ← NUEVO
**Archivo:** `backend/telegram-bot/handlers/task-handler.js`

**Responsabilidades:**
- Gestión de flujos de tareas (crear, editar, eliminar)
- Parseo y validación de datos
- Interacción con TaskSystem
- Construcción de respuestas

**Flujos gestionados:**
```javascript
handleCreateTaskData()    // Crear tarea desde mensaje
handleEditTaskData()      // Editar tarea desde mensaje
handleManualTest()        // Ejecutar test manual
handleTaskActions()       // Acciones de botones (toggle, delete)
```

---

### **5. Notification Handler** ← NUEVO
**Archivo:** `backend/telegram-bot/handlers/notification-handler.js`

**Responsabilidades:**
- Envío de alertas de eventos al grupo
- Formateo de mensajes de alerta
- Uso de db-repository para info de dispositivos

**Métodos:**
```javascript
sendButtonAlert(bot, groupConfig, eventData)
buildButtonAlertMessage(eventData, deviceInfo)
formatTimestamp(timestamp)
```

**Integración con db-repository:**
```javascript
const deviceInfo = db.getDeviceByMac(eventData.mac);
// → { id, mac, name, status, location, alarmActive, lastSeen }
```

---

### **6. Auth Service** ← NUEVO
**Archivo:** `backend/telegram-bot/services/auth-service.js`

**Responsabilidades:**
- Autenticación de usuarios autorizados
- Verificación de permisos
- Logging de accesos

**Métodos:**
```javascript
authService.initialize(config)
authService.isAuthorized(chatId)  // → boolean
authService.getUserInfo(chatId)   // → { chat_id, name, role }
```

---

### **7. Message Parser** ← NUEVO
**Archivo:** `backend/telegram-bot/services/message-parser.js`

**Responsabilidades:**
- Parsing de mensajes con formatos especiales
- Extracción de campos
- Retorno de objetos estructurados

**Métodos:**
```javascript
parseCreateTask(text)  // *nombre*HH:MM*track##
parseEditTask(text)    // *nombre*HH:MM*pista:X*estado##
parseManualTest(text)  // *track##
```

---

### **8. Response Builder** ← NUEVO
**Archivo:** `backend/telegram-bot/services/response-builder.js`

**Responsabilidades:**
- Construcción de mensajes formateados
- Generación de teclados inline
- Templates de respuestas

**Métodos:**
```javascript
buildWelcomeMessage(userName)
buildTaskCreatedMessage(task)
buildTaskListMessage(tasks)
buildTaskListKeyboard(tasks)
```

---

### **9. Logger** ← NUEVO
**Archivo:** `backend/telegram-bot/utils/logger.js`

**Responsabilidades:**
- Logging a consola (con colores)
- Logging a archivo (`logs/telegram-bot.log`)
- Rotación de logs
- Niveles de log (ERROR, WARN, INFO, DEBUG)

---

### **10. Message Validator** ← NUEVO
**Archivo:** `backend/telegram-bot/utils/message-validator.js`

**Responsabilidades:**
- Validación de datos antes de procesamiento
- Verificación de rangos
- Mensajes de error descriptivos

**Métodos:**
```javascript
validateTaskCreation(data)   // → { valid, error? }
validateTaskEdit(data)
isValidTrack(track)
isValidTime(hour, minute)
```

---

## Integración Telegram Bot ↔ TaskSystem

### **Flujo Completo: Crear Tarea desde Telegram**

```
┌──────────────────────────────────────────────────────────────────┐
│ Usuario Telegram: /creartarea                                    │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ command-handler.js                                               │
│ - Guardar estado: userFlows[chatId] = 'awaiting_task_creation'  │
│ - Enviar instrucciones de formato                               │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Usuario: *Prueba*08:00*15##                                      │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ message-handler.js                                               │
│ - Verificar estado: userFlows[chatId] === 'awaiting_...'        │
│ - Rutear a task-handler                                          │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ task-handler.handleCreateTaskData()                              │
│ 1. messageParser.parseCreateTask(text)                           │
│    → { name: "Prueba", hour: 8, minute: 0, track: 15 }          │
│                                                                  │
│ 2. messageValidator.validateTaskCreation(data)                   │
│    → { valid: true }                                             │
│                                                                  │
│ 3. taskSystem.createTask("Prueba", 8, 0, 15)                    │
│    → { id: "audio_test_1", ... }                                │
│                                                                  │
│ 4. responseBuilder.buildTaskCreatedMessage(task)                 │
│    → Mensaje formateado                                          │
│                                                                  │
│ 5. bot.sendMessage(chatId, mensaje)                             │
│                                                                  │
│ 6. Limpiar estado: delete userFlows[chatId]                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Integración Telegram Bot ↔ MQTT (Eventos)

### **Flujo: Evento de Botón → Notificación Telegram**

```
┌──────────────────────────────────────────────────────────────────┐
│ ESP32 presiona botón                                             │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ MQTT Broker (Topic: NODO/EA8914/ACK)                             │
│ Payload: {"dsp":"EA8914","event":"button","time":"..."}          │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ message-processor.js                                             │
│ - Detecta event: "button"                                        │
│ - Procesa y guarda en db-repository                              │
│ - Envía ACK al ESP32                                             │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ telegramBotManager.notifyButtonEvent()                           │
│ eventData = {                                                    │
│   deviceId: "EA8914",                                            │
│   mac: "EA8914",                                                 │
│   timestamp: "2025-10-25T08:00:00Z",                             │
│   topic: "NODO/EA8914/ACK"                                       │
│ }                                                                │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│ notification-handler.sendButtonAlert()                           │
│ 1. db.getDeviceByMac("EA8914")                                   │
│    → { name: "ESP32_001", location: "Sala Principal", ... }     │
│                                                                  │
│ 2. buildButtonAlertMessage(eventData, deviceInfo)                │
│    → Mensaje formateado con emoji                                │
│                                                                  │
│ 3. bot.sendMessage(groupChatId, mensaje)                         │
│    → Envío al grupo con sonido                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Configuración y Parámetros

### **Configuración MQTT**
```javascript
// backend/mqtt/config/mqtt-config.js
{
  brokerUrl: 'mqtt://server-sra.local',
  port: 1883,
  clientId: 'backend-server-' + Math.random(),
  qos: 1,
  retain: false
}
```

### **Configuración Task System**
```javascript
// data/task-config.json (global_settings)
{
  "enabled": true,
  "check_interval_ms": 3000,
  "timezone": "America/Mexico_City",
  "max_tasks": 10,
  "default_track": 11,
  "default_tolerance_minutes": 5
}
```

### **Configuración Telegram Bot** ← NUEVO
```json
// data/telegram-config.json
{
  "bot_token": "8421143353:AAH0erRNncqFxMdmCFPh_ypVwRuQi3hOTQU",
  "authorized_users": [
    {
      "chat_id": 7581887852,
      "name": "Jorge Admin",
      "role": "admin"
    }
  ],
  "notification_group": {
    "enabled": true,
    "chat_id": -1001234567890,
    "name": "SLT Alertas Botón Pánico"
  },
  "settings": {
    "polling": true,
    "webhook": false,
    "polling_interval": 300,
    "timezone": "America/Mexico_City"
  }
}
```

### **Topics MQTT**
```javascript
// Eventos ESP32
NODO/{MAC}/ACK  // Eventos del dispositivo (button, heartbeat, etc.)
NODO/{MAC}/CMD  // Comandos al dispositivo

// Sistema de Tareas
SYSTEM/TEST     // Broadcast de comandos programados (QoS 1)
```

---

## Validaciones y Límites

### **Task System**
- ✅ Máximo 10 tareas simultáneas
- ✅ Nombres únicos (3-50 caracteres)
- ✅ Horarios únicos (no duplicados)
- ✅ Hora: 0-23, Minuto: 0-59
- ✅ Track: 0-999
- ✅ Tolerancia: 1-60 minutos (recomendado: 5)
- ✅ No ejecutar 2 veces el mismo día

### **Telegram Bot** ← NUEVO
- ✅ Autenticación obligatoria por chat_id
- ✅ Validación de formatos de mensajes
- ✅ Límite de tareas heredado de TaskSystem
- ✅ Validación de track: 0-999
- ✅ Validación de hora: formato 24h
- ✅ Logging completo de operaciones

### **MQTT Messages**
- ✅ Formato JSON válido
- ✅ Campo `dsp` obligatorio
- ✅ Campo `event` obligatorio
- ✅ Timestamp ISO 8601
- ✅ Validación de comandos permitidos

---

## Observaciones

- **Arquitectura completa MQTT + WebSocket + Task System + Telegram Bot** para máxima flexibilidad
- **Traducción automática MAC ↔ ID** entre protocolos
- **Broadcasting en tiempo real** de eventos a WebSocket y Telegram
- **Automatización de comandos** mediante Task System con scheduler preciso (3s)
- **Gestión remota** de tareas desde Telegram Bot
- **Notificaciones push** de eventos críticos al grupo de Telegram
- **Validación completa** en todos los niveles (MQTT, WebSocket, Tasks, Telegram)
- **Documentación exhaustiva** para desarrollo, despliegue y mantenimiento
- **Testing completo** validado y documentado
- **Escalabilidad** para múltiples dispositivos, clientes, tareas y usuarios
- **Mantenimiento de eventos** con limpieza automática de historial
- **Persistencia robusta** de configuración en archivos JSON
- **Zona horaria fija** CDMX (UTC-6) para consistencia
- **Seguridad** mediante autenticación de usuarios y validación de mensajes
- **Centralización de datos** mediante db-repository

---

## Casos de Uso Completos

### **1. Pruebas Automáticas Diarias (Telegram)**
```
Usuario: /creartarea
Bot: [Instrucciones]
Usuario: *Prueba Matutina*08:00*11##
Bot: ✅ Tarea Creada Exitosamente

→ Cada día a las 08:00, todos los ESP32 reproducen pista 11
```

### **2. Test Manual Inmediato (Telegram)**
```
Usuario: /testmanual
Bot: [Instrucciones]
Usuario: *25##
Bot: ✅ Test Manual Ejecutado - Pista 25

→ Inmediatamente, todos los ESP32 reproducen pista 25
```

### **3. Alerta de Botón de Pánico**
```
ESP32 presiona botón físico
→ MQTT: event="button"
→ message-processor detecta
→ telegramBotManager.notifyButtonEvent()
→ Grupo Telegram recibe:
    🚨 ALERTA - Botón Presionado
    📍 Dispositivo: ESP32_001
    📌 Ubicación: Sala Principal
    🔗 MAC: EA:89:14:12:34:56
    🕐 Hora: 25/10/2025 08:00:00
```

### **4. Gestión Completa de Tareas**
```
// Crear
Usuario: /creartarea → *Test*18:00*15##
Bot: ✅ Tarea creada

// Listar
Usuario: /listartareas
Bot: [Lista con botones de editar/toggle/eliminar]

// Editar
Usuario: [Presiona botón ✏️]
Bot: [Instrucciones]
Usuario: *Test Modificado*19:00*pista:20*habilitada##
Bot: ✅ Tarea actualizada

// Deshabilitar
Usuario: [Presiona botón 🔴]
Bot: ✅ Tarea deshabilitada

// Eliminar
Usuario: [Presiona botón 🗑️]
Bot: ⚠️ Confirmar eliminación [✅ Confirmar] [❌ Cancelar]
Usuario: [Presiona ✅ Confirmar]
Bot: ✅ Tarea eliminada
```

---

## Documentación Relacionada

### **Sistema General**
- `ARQUITECTURA.md` - Este documento (arquitectura completa)
- `README.md` - Documentación principal del proyecto

### **MQTT Module**
- `backend/mqtt/README.md` - Documentación del módulo MQTT
- `backend/mqtt/backend-mqtt-commands-guide.md` - Guía de comandos MQTT
- `backend/mqtt/ARQUITECTURA.md` - Arquitectura del módulo MQTT

### **WebSocket Module**
- `backend/websocket/docs/websocket-api-reference.md` - API WebSocket completa
- `backend/websocket/docs/mqtt-websocket-integration.md` - Integración MQTT ↔ WebSocket
- `backend/websocket/docs/deployment-guide.md` - Guía de despliegue
- `backend/websocket/docs/websocket-mqtt-integration-test-results.md` - Resultados de testing

### **Task System**
- `backend/task-services/TASK-SYSTEM-README.md` - Overview y arquitectura del Task System
- `backend/task-services/TASK-API-REFERENCE.md` - API completa del Task System
- `backend/task-services/TASK-MQTT-PROTOCOL.md` - Especificación del protocolo MQTT de tareas
- `backend/task-services/TASK-TESTING-GUIDE.md` - Guía de testing del Task System
- `data/TASK-CONFIGURATION-GUIDE.md` - Guía completa del archivo task-config.json

### **Telegram Bot Module** ← NUEVO
- `backend/telegram-bot/docs/README.md` - Guía de inicio rápido del bot
- `backend/telegram-bot/docs/ARCHITECTURE.md` - Arquitectura detallada del bot
- `backend/telegram-bot/docs/USER-GUIDE.md` - Guía completa de usuario
- `backend/telegram-bot/docs/API-REFERENCE.md` - Referencia de API del bot
- `backend/telegram-bot/docs/DEPLOYMENT.md` - Guía de despliegue y producción

### **Data Layer**
- `data/README.md` - Documentación de archivos de datos
- `data/db-repository.js` - Repositorio centralizado de datos

---

**Versión:** 2.0  
**Última actualización:** 25 de octubre, 2025  
**Estado:** Sistema completo MQTT + WebSocket + Task System + Telegram Bot funcionando