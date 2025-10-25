# MessageRouter - Enrutador de Mensajes WebSocket

**Versión:** v1.0  
**Archivo:** `js/services/websocket/MessageRouter.js`  
**Patrón:** Singleton + Strategy Pattern  
**Dependencias:** `EventBus.js`

---

## 📋 Descripción

MessageRouter es el **dispatcher central de mensajes WebSocket**. Recibe todos los mensajes del WebSocketService y los enruta a handlers específicos basándose en el campo `type` del mensaje.

### Características principales:
- ✅ **Strategy Pattern**: Handlers intercambiables por tipo de mensaje
- ✅ **Event-driven**: Emite eventos en EventBus para cada tipo
- ✅ **Extensible**: Registrar/desregistrar handlers dinámicamente
- ✅ **Error isolation**: Try/catch en cada handler
- ✅ **Type-safe**: Validación estricta de estructura de mensajes
- ✅ **Singleton**: Una única instancia global
- ✅ **Notification routing**: Soporte para eventos MQTT genéricos

---

## 🏗️ Arquitectura

```javascript
MessageRouter (Singleton)
  ├── handlers: Map<string, Function>
  │   ├── 'handshake_response' → handlerFn
  │   ├── 'notification' → handlerFn (NUEVO v1.0)
  │   ├── 'pong' → handlerFn
  │   ├── 'error' → handlerFn
  │   └── 'command_response' → handlerFn
  └── Métodos públicos (5)
```

### Flujo de mensajes:
```
WebSocketService.handleMessage()
  ↓
JSON.parse(event.data)
  ↓
MessageRouter.route(message)
  ↓
handlers.get(message.type)
  ↓
handler(message)
  ↓
EventBus.emit(`notification:${message.event}`, message)  ← NUEVO
  ↓
DeviceAlarmHandler / DeviceUpdateHandler
  ↓
StateManager.updateDevice()
  ↓
DeviceCard.update()
```

---

## 📦 API Pública

### `register(messageType, handler)`
Registra un handler para un tipo de mensaje específico.

**Parámetros:**
- `messageType` (string): Tipo de mensaje (ej: 'notification')
- `handler` (Function): Función que procesa el mensaje

**Retorna:** `void`

**Validaciones:**
- ✅ `messageType` debe ser string no vacío
- ✅ `handler` debe ser función

**Ejemplo básico:**
```javascript
import MessageRouter from './services/websocket/MessageRouter.js';

// Registrar handler personalizado
MessageRouter.register('custom_event', (message) => {
  console.log('Custom event recibido:', message);
  EventBus.emit('message:custom_event', message);
});
```

**Ejemplo con notificación:**
```javascript
// Handler para notificaciones MQTT
MessageRouter.register('notification', (message) => {
  // Validar estructura
  if (!message.event) {
    console.error('Notification sin campo event');
    return;
  }
  
  // Emitir evento específico
  EventBus.emit(`notification:${message.event}`, message);
});
```

**⚠️ Importante:**
- Si ya existe handler para ese tipo, se **sobrescribe**
- No retorna función de cleanup (usar `unregister()`)

---

### `unregister(messageType)`
Elimina el handler de un tipo de mensaje.

**Parámetros:**
- `messageType` (string): Tipo de mensaje a desregistrar

**Retorna:** `void`

**Ejemplo:**
```javascript
// Registrar
MessageRouter.register('temp_event', (msg) => console.log(msg));

// Más tarde... desregistrar
MessageRouter.unregister('temp_event');

// Ahora mensajes 'temp_event' se ignoran
```

---

### `route(message)`
Enruta un mensaje al handler correspondiente (entry point principal).

**Parámetros:**
- `message` (Object): Objeto mensaje con al menos `{type: string}`

**Retorna:** `void`

**Validaciones:**
- ✅ `message` debe ser objeto
- ✅ `message.type` debe existir y ser string

**Comportamiento:**
1. Valida estructura del mensaje
2. Busca handler registrado por `message.type`
3. Si existe handler, lo ejecuta con try/catch
4. Si no existe handler, muestra warning

**Ejemplo de mensaje de notificación:**
```javascript
{
  type: 'notification',
  event: 'button_pressed',  // ← Campo específico del evento
  timestamp: '2025-10-25T05:12:50.426Z',
  data: {
    deviceId: 'ESP32_001',
    buttonName: 'BOTON_PANICO',
    alarmState: 'activated'
  }
}
```

**⚠️ Llamado por:** Solo `WebSocketService.handleMessage()`

---

### `getRegisteredTypes()`
Obtiene lista de todos los tipos de mensajes registrados.

**Parámetros:** Ninguno  
**Retorna:** `Array<string>` - Array con tipos registrados

**Ejemplo:**
```javascript
const types = MessageRouter.getRegisteredTypes();
console.log('Handlers registrados:', types);
// Output: ['handshake_response', 'notification', 'pong', 'error', 'command_response']
```

---

### `isRegistered(messageType)`
Verifica si existe un handler para un tipo de mensaje.

**Parámetros:**
- `messageType` (string): Tipo a verificar

**Retorna:** `boolean` - true si existe handler

**Ejemplo:**
```javascript
if (MessageRouter.isRegistered('notification')) {
  console.log('✅ Handler de notificaciones disponible');
} else {
  console.warn('⚠️ Handler de notificaciones no registrado');
}
```

---

## 🔧 Handlers Pre-registrados

### Inicialización automática:
```javascript
constructor() {
  this.handlers = new Map();
  this.registerDefaultHandlers();
}
```

### 1. `handshake_response`
Respuesta del handshake inicial.

**Handler:**
```javascript
(message) => {
  console.log('[MessageRouter] 🤝 Handshake response recibido');
  EventBus.emit('message:handshake_response', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'handshake_response',
  timestamp: '2025-10-25T05:12:12.492Z',
  success: true,
  data: {
    devices: [
      {
        id: 'ESP32_001',
        mac: '77FF44',
        name: 'ALARMA X',
        location: 'Entrada Principal',
        status: 'online',
        lastSeen: '2025-10-25T05:12:12.492Z',
        alarmActive: false
      }
    ],
    mqttConnected: true,
    serverVersion: '1.0.0',
    uptime: '9s',
    connectedClients: 1
  }
}
```

**Procesado por:** `HandshakeHandler.js`

---

### 2. `notification` ⭐ **NUEVO v1.0**
Notificaciones genéricas de eventos MQTT.

**Handler:**
```javascript
(message) => {
  // Validar estructura
  if (!message.event) {
    console.error('[MessageRouter] ❌ Notification sin campo "event":', message);
    return;
  }

  if (!message.data) {
    console.warn('[MessageRouter] ⚠️ Notification sin datos:', message);
  }

  // Log del evento
  console.log(`[MessageRouter] 📢 Notification: ${message.event}`, message.data?.deviceId || 'N/A');

  // Emitir evento específico
  EventBus.emit(`notification:${message.event}`, message);

  // Emitir evento genérico (para listeners globales)
  EventBus.emit('notification', message);

  // Validar que sea un evento soportado
  const supportedEvents = ['button_pressed', 'heartbeat'];
  
  if (!supportedEvents.includes(message.event)) {
    console.warn(`[MessageRouter] ⚠️ Evento no soportado: ${message.event}`);
  }
}
```

**Eventos soportados:**
#### **2.1. `notification:button_pressed`**
Botón de pánico presionado.

**Payload:**
```javascript
{
  type: 'notification',
  event: 'button_pressed',
  timestamp: '2025-10-25T05:12:50.426Z',
  data: {
    deviceId: 'ESP32_001',
    mac: '77FF44',
    deviceName: 'ALARMA X',
    buttonName: 'BOTON_PANICO',
    buttonKey: 'BOTON_PANICO',
    alarmState: 'activated'  // 'activated' | 'deactivated'
  }
}
```

**Procesado por:** `DeviceAlarmHandler.js`

**Emite en EventBus:**
- `notification:button_pressed` (evento específico)
- `notification` (evento genérico)

**Flujo completo:**
```
Backend MQTT → WebSocket → MessageRouter
  ↓
EventBus.emit('notification:button_pressed', message)
  ↓
DeviceAlarmHandler.handleButtonPressed()
  ↓
StateManager.updateDevice(deviceId, { alarmActive: true })
  ↓
EventBus.emit('device:alarm:changed', { deviceId, alarmActive: true })
  ↓
DeviceCard.updateAlarmIndicator(true)
  ↓
UI muestra: "🚨 ALARMA ACTIVA"
```

---

#### **2.2. `notification:heartbeat`**
Latido del dispositivo (cada 30s).

**Payload:**
```javascript
{
  type: 'notification',
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    deviceId: 'ESP32_001',
    mac: '77FF44',
    deviceName: 'ALARMA X'
  }
}
```

**Procesado por:** `DeviceUpdateHandler.js`

**Emite en EventBus:**
- `notification:heartbeat` (evento específico)
- `notification` (evento genérico)

**Flujo completo:**
```
Backend MQTT → WebSocket → MessageRouter
  ↓
EventBus.emit('notification:heartbeat', message)
  ↓
DeviceUpdateHandler.handle()
  ↓
StateManager.updateDevice(deviceId, { status: 'online', lastSeen: timestamp })
  ↓
EventBus.emit('state:devices:changed')
  ↓
DeviceCard.update()
  ↓
UI actualiza: "Visto: hace 2 segundos"
```

---

### 3. `pong`
Respuesta al ping (keep-alive).

**Handler:**
```javascript
(message) => {
  console.log('[MessageRouter] 🏓 Pong recibido');
  EventBus.emit('message:pong', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'pong',
  timestamp: '2025-10-25T05:12:42.493Z',
  originalTimestamp: '2025-10-25T05:12:43.506Z'
}
```

---

### 4. `error`
Error reportado por el servidor.

**Handler:**
```javascript
(message) => {
  console.error('[MessageRouter] ❌ Error recibido:', message.message);
  EventBus.emit('message:error', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'error',
  code: 'DEVICE_NOT_FOUND',
  message: 'Device ESP32_099 no encontrado',
  timestamp: '2025-10-25T05:15:00.000Z'
}
```

---

### 5. `command_response`
Respuesta a un comando enviado al dispositivo.

**Handler:**
```javascript
(message) => {
  console.log('[MessageRouter] ✅ Command response:', message.command);
  EventBus.emit('message:command_response', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'command_response',
  deviceId: 'ESP32_001',
  command: 'ping',
  success: true,
  timestamp: '2025-10-25T05:15:30.000Z'
}
```

---

## 🔥 Eventos Emitidos

| Tipo de Mensaje      | Evento Principal                     | Eventos Secundarios                        | Handler Procesador       |
| -------------------- | ------------------------------------ | ------------------------------------------ | ------------------------ |
| `handshake_response` | `message:handshake_response`         | -                                          | `HandshakeHandler`       |
| `notification`       | `notification:${message.event}`      | `notification` (genérico)                  | Ver tabla abajo          |
| `pong`               | `message:pong`                       | -                                          | `ConnectionManager`      |
| `error`              | `message:error`                      | -                                          | -                        |
| `command_response`   | `message:command_response`           | -                                          | -                        |

### Eventos de notificación específicos:

| Evento Backend       | Evento Emitido EventBus       | Handler Procesador     | Actualiza StateManager |
| -------------------- | ----------------------------- | ---------------------- | ---------------------- |
| `button_pressed`     | `notification:button_pressed` | `DeviceAlarmHandler`   | ✅ `alarmActive`       |
| `heartbeat`          | `notification:heartbeat`      | `DeviceUpdateHandler`  | ✅ `status`, `lastSeen`|

---

## 🧪 Testing

### Test: Notificación de botón presionado
```javascript
const testMessage = {
  type: 'notification',
  event: 'button_pressed',
  timestamp: '2025-10-25T05:12:50.426Z',
  data: {
    deviceId: 'ESP32_001',
    buttonName: 'BOTON_PANICO',
    alarmState: 'activated'
  }
};

// Simular mensaje
MessageRouter.route(testMessage);

// Verificar evento emitido
EventBus.on('notification:button_pressed', (message) => {
  console.assert(message.data.deviceId === 'ESP32_001');
  console.assert(message.data.alarmState === 'activated');
  console.log('✅ Test passed: button_pressed');
});
```

### Test: Notificación de heartbeat
```javascript
const testMessage = {
  type: 'notification',
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    deviceId: 'ESP32_001'
  }
};

MessageRouter.route(testMessage);

EventBus.on('notification:heartbeat', (message) => {
  console.assert(message.data.deviceId === 'ESP32_001');
  console.log('✅ Test passed: heartbeat');
});
```

---

## 📊 Logs Esperados

### Handshake:
```
[MessageRouter] 🤝 Handshake response recibido
[HandshakeHandler] 🤝 Procesando handshake response...
[HandshakeHandler] 2 dispositivos cargados
```

### Heartbeat:
```
[MessageRouter] 📢 Notification: heartbeat ESP32_001
[DeviceUpdateHandler] 💓 Heartbeat de "ESP32_001" - lastSeen: 2025-10-25T05:12:33.766Z
```

### Botón presionado:
```
[MessageRouter] 📢 Notification: button_pressed ESP32_001
[DeviceAlarmHandler] 🚨 Botón "BOTON_PANICO" presionado en "ESP32_001"
[Toast] 🚨 ALARMA ACTIVADA: ALARMA X (BOTON_PANICO)
```

---

## 🚨 Errores Comunes

### ❌ Error: "Notification sin campo event"
```javascript
// ❌ MAL
{
  type: 'notification',
  data: { deviceId: 'ESP32_001' }
}

// ✅ BIEN
{
  type: 'notification',
  event: 'heartbeat',  // ← Campo requerido
  data: { deviceId: 'ESP32_001' }
}
```

### ❌ Warning: "Evento no soportado"
```javascript
// Backend envía evento no reconocido
{
  type: 'notification',
  event: 'unknown_event',  // ← No está en supportedEvents
  data: {}
}

// Console output:
// [MessageRouter] ⚠️ Evento no soportado: unknown_event
```

---

## ⚡ Performance

### Mediciones (Chrome DevTools):
- **route():** < 0.1ms (lookup en Map)
- **notification handler:** < 0.2ms
- **EventBus.emit():** < 0.1ms
- **Total per message:** < 0.5ms

---

## 📝 Changelog

### v1.0 (2025-10-25)
- ✅ **BREAKING:** Eliminado handler `device_update`
- ✅ **BREAKING:** Eliminado handler `device_alarm`
- ✅ **NUEVO:** Handler `notification` para eventos MQTT genéricos
- ✅ **NUEVO:** Soporte para `notification:button_pressed`
- ✅ **NUEVO:** Soporte para `notification:heartbeat`
- ✅ Arquitectura limpia sin eventos legacy
- ✅ Validación de eventos soportados

### v0.2-beta
- ✅ 6 handlers pre-registrados
- ✅ Strategy pattern para routing
- ✅ Error isolation en handlers
- ✅ Event emission automática

---

## 🔗 Ver También

**Handlers de notificación:**
- [DeviceAlarmHandler.md](./handlers/DeviceAlarmHandler.md) - Procesa `button_pressed`
- [DeviceUpdateHandler.md](./handlers/DeviceUpdateHandler.md) - Procesa `heartbeat`

**Sistema base:**
- [WebSocketService.md](./WebSocketService.md) - Cliente WebSocket
- [EventBus.md](../01-fundamentos/EventBus.md) - Sistema de eventos
- [StateManager.md](../01-fundamentos/StateManager.md) - Estado global

**Backend:**
- [notification-broadcaster.md](../../backend/notification-broadcaster.md) - Emisor de notificaciones MQTT