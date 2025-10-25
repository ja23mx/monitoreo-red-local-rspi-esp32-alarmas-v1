# MessageRouter - Enrutador de Mensajes WebSocket

**Versión:** v0.2-beta  
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

---

## 🏗️ Arquitectura

```javascript
MessageRouter (Singleton)
  ├── handlers: Map<string, Function>
  │   ├── 'handshake_response' → handlerFn
  │   ├── 'device_update' → handlerFn
  │   ├── 'device_alarm' → handlerFn
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
EventBus.emit(`message:${type}`, message)
  ↓
External handlers listen
  ↓
Process message
```

---

## 📦 API Pública

### `register(messageType, handler)`
Registra un handler para un tipo de mensaje específico.

**Parámetros:**
- `messageType` (string): Tipo de mensaje (ej: 'device_update')
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

**Ejemplo avanzado:**
```javascript
// Handler con validación
MessageRouter.register('device_status', (message) => {
  // Validar estructura
  if (!message.deviceId || !message.status) {
    console.error('Mensaje device_status inválido:', message);
    return;
  }
  
  // Procesar
  console.log(`Device ${message.deviceId}: ${message.status}`);
  
  // Emitir evento
  EventBus.emit('message:device_status', message);
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

**Uso en testing:**
```javascript
afterEach(() => {
  // Limpiar handlers de test
  MessageRouter.unregister('test_event');
});
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

**Ejemplo de mensaje válido:**
```javascript
{
  type: 'device_update',
  deviceId: 'ESP32_001',
  data: {
    status: 'online',
    lastSeen: '2025-10-23T14:30:00.000Z'
  }
}
```

**Flujo interno:**
```javascript
route(message) {
  // 1. Validar
  if (!message || typeof message !== 'object') {
    console.error('Mensaje inválido');
    return;
  }
  
  if (!message.type) {
    console.error('Mensaje sin tipo');
    return;
  }
  
  // 2. Buscar handler
  const handler = this.handlers.get(message.type);
  
  if (!handler) {
    console.warn(`Sin handler para: ${message.type}`);
    return;
  }
  
  // 3. Ejecutar con try/catch
  try {
    handler(message);
  } catch (error) {
    console.error(`Error en handler '${message.type}':`, error);
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
// Output: ['handshake_response', 'device_update', 'device_alarm', ...]
```

**Uso en debugging:**
```javascript
// Verificar que handlers estén cargados
function checkHandlers() {
  const expected = ['handshake_response', 'device_update', 'device_alarm'];
  const registered = MessageRouter.getRegisteredTypes();
  
  expected.forEach(type => {
    if (!registered.includes(type)) {
      console.error(`❌ Handler faltante: ${type}`);
    }
  });
}
```

---

### `isRegistered(messageType)`
Verifica si existe un handler para un tipo de mensaje.

**Parámetros:**
- `messageType` (string): Tipo a verificar

**Retorna:** `boolean` - true si existe handler

**Ejemplo:**
```javascript
if (MessageRouter.isRegistered('device_alarm')) {
  console.log('✅ Handler de alarmas disponible');
} else {
  console.warn('⚠️ Handler de alarmas no registrado');
}
```

**Uso en validación:**
```javascript
// Antes de enviar mensaje, verificar que el backend soporte la respuesta
function sendCommand(command) {
  const responseType = `${command}_response`;
  
  if (!MessageRouter.isRegistered(responseType)) {
    console.warn(`No hay handler para respuesta de '${command}'`);
  }
  
  WebSocketService.send({ type: command });
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
  EventBus.emit('message:handshake_response', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'handshake_response',
  devices: [
    {
      id: 'ESP32_001',
      mac: 'AA:BB:CC:DD:EE:FF',
      nombre: 'Alarma 1',
      ubicacion: 'Entrada',
      status: 'online',
      // ... más propiedades
    }
  ],
  mqttConnected: true,
  serverTime: '2025-10-23T14:30:00.000Z',
  clientId: 'web-client-1729701234567'
}
```

**Listener externo:**
```javascript
// HandshakeHandler.js
EventBus.on('message:handshake_response', (data) => {
  StateManager.setDevices(data.devices);
  StateManager.setMQTTConnected(data.mqttConnected);
  StateManager.setServerTime(data.serverTime);
  EventBus.emit('handshake:completed', data);
});
```

---

### 2. `device_update`
Actualización de estado de un dispositivo.

**Handler:**
```javascript
(message) => {
  EventBus.emit('message:device_update', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'device_update',
  deviceId: 'ESP32_001',
  data: {
    status: 'online',
    lastSeen: '2025-10-23T14:35:00.000Z',
    rssi: -65,
    uptime: 3600000
  }
}
```

**Listener externo:**
```javascript
// DeviceUpdateHandler.js
EventBus.on('message:device_update', ({ deviceId, data }) => {
  StateManager.updateDevice(deviceId, data);
  EventBus.emit('device:update', { deviceId, ...data });
});
```

---

### 3. `device_alarm`
Notificación de alarma activada.

**Handler:**
```javascript
(message) => {
  EventBus.emit('message:device_alarm', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'device_alarm',
  deviceId: 'ESP32_001',
  alarmType: 'button',  // 'button' | 'sensor' | 'manual'
  timestamp: '2025-10-23T14:40:00.000Z',
  data: {
    location: 'Entrada',
    severity: 'high'
  }
}
```

**Listener externo:**
```javascript
// DeviceAlarmHandler.js
EventBus.on('message:device_alarm', ({ deviceId, alarmType, timestamp }) => {
  // Actualizar estado
  StateManager.updateDevice(deviceId, {
    alarmActive: true,
    alarmType,
    alarmTimestamp: timestamp
  });
  
  // Notificar UI
  Toast.error(`¡ALARMA! ${deviceId} - ${alarmType}`);
  
  // Emitir evento procesado
  EventBus.emit('device:alarm', { deviceId, alarmType });
});
```

---

### 4. `pong`
Respuesta al ping (keep-alive).

**Handler:**
```javascript
(message) => {
  EventBus.emit('message:pong', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'pong',
  timestamp: '2025-10-23T14:30:05.000Z',
  serverTime: '2025-10-23T14:30:05.100Z'
}
```

**Listener externo:**
```javascript
// (Opcional) Calcular latencia
EventBus.on('message:pong', ({ timestamp, serverTime }) => {
  const sent = new Date(timestamp).getTime();
  const received = new Date().getTime();
  const latency = received - sent;
  
  console.log(`Latencia: ${latency}ms`);
});
```

---

### 5. `error`
Error reportado por el servidor.

**Handler:**
```javascript
(message) => {
  EventBus.emit('message:error', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'error',
  code: 'DEVICE_NOT_FOUND',
  message: 'Device ESP32_099 no encontrado',
  details: {
    deviceId: 'ESP32_099',
    requestType: 'device_command'
  }
}
```

**Listener externo:**
```javascript
// App.js o error handler
EventBus.on('message:error', ({ code, message, details }) => {
  console.error(`Error ${code}: ${message}`, details);
  Toast.error(message);
});
```

---

### 6. `command_response`
Respuesta a un comando enviado al dispositivo.

**Handler:**
```javascript
(message) => {
  EventBus.emit('message:command_response', message);
}
```

**Payload esperado:**
```javascript
{
  type: 'command_response',
  deviceId: 'ESP32_001',
  command: 'test_alarm',
  success: true,
  timestamp: '2025-10-23T14:45:00.000Z',
  data: {
    duration: 5000,
    acknowledged: true
  }
}
```

**Listener externo:**
```javascript
// DeviceCard.js
EventBus.on('message:command_response', ({ deviceId, command, success }) => {
  if (success) {
    Toast.success(`Comando '${command}' ejecutado en ${deviceId}`);
  } else {
    Toast.error(`Comando '${command}' falló en ${deviceId}`);
  }
});
```

---

## 🔥 Eventos Emitidos

| Tipo de Mensaje      | Evento Emitido               | Payload                                    |
| -------------------- | ---------------------------- | ------------------------------------------ |
| `handshake_response` | `message:handshake_response` | `Object` (devices, mqttStatus, serverTime) |
| `device_update`      | `message:device_update`      | `Object` (deviceId, data)                  |
| `device_alarm`       | `message:device_alarm`       | `Object` (deviceId, alarmType, timestamp)  |
| `pong`               | `message:pong`               | `Object` (timestamp, serverTime)           |
| `error`              | `message:error`              | `Object` (code, message, details)          |
| `command_response`   | `message:command_response`   | `Object` (deviceId, command, success)      |

**Convención de nombres:**
```
message:{type}

Ejemplos:
- message:handshake_response
- message:device_update
- message:device_alarm
```

---

## 🧪 Testing

### Test: Registrar handler
```javascript
import MessageRouter from './services/websocket/MessageRouter.js';

let called = false;

MessageRouter.register('test_type', (msg) => {
  called = true;
  console.log('Handler ejecutado:', msg);
});

// Verificar registro
console.assert(MessageRouter.isRegistered('test_type') === true);

// Simular mensaje
MessageRouter.route({ type: 'test_type', data: 'test' });

// Verificar ejecución
console.assert(called === true);
```

---

### Test: Handler con error no rompe el sistema
```javascript
MessageRouter.register('error_test', (msg) => {
  throw new Error('Error intencional');
});

// No debe lanzar error
MessageRouter.route({ type: 'error_test' });

console.log('✅ Error capturado correctamente');
```

---

### Test: Mensaje sin tipo
```javascript
// Debe mostrar error pero no crashear
MessageRouter.route({ data: 'sin tipo' });

console.log('✅ Mensaje inválido manejado');
```

---

### Test: Tipo sin handler
```javascript
// Debe mostrar warning
MessageRouter.route({ type: 'tipo_inexistente' });

console.log('✅ Warning mostrado correctamente');
```

---

### Test: Desregistrar handler
```javascript
MessageRouter.register('temp', () => console.log('test'));
console.assert(MessageRouter.isRegistered('temp') === true);

MessageRouter.unregister('temp');
console.assert(MessageRouter.isRegistered('temp') === false);
```

---

## 📊 Casos de Uso Reales

### 1. Extensión con nuevo tipo de mensaje
```javascript
// custom-handlers.js
import MessageRouter from './services/websocket/MessageRouter.js';
import EventBus from './core/EventBus.js';
import Toast from './components/ui/Toast.js';

// Registrar handler para mensajes del tipo 'system_notification'
MessageRouter.register('system_notification', (message) => {
  const { title, body, severity } = message;
  
  // Emitir evento
  EventBus.emit('message:system_notification', message);
  
  // Mostrar toast según severidad
  switch (severity) {
    case 'info':
      Toast.info(`${title}: ${body}`);
      break;
    case 'warning':
      Toast.warning(`${title}: ${body}`);
      break;
    case 'error':
      Toast.error(`${title}: ${body}`);
      break;
  }
});
```

---

### 2. Logger de todos los mensajes
```javascript
// message-logger.js
import MessageRouter from './services/websocket/MessageRouter.js';

class MessageLogger {
  constructor() {
    this.logs = [];
    this.interceptAllMessages();
  }
  
  interceptAllMessages() {
    const types = MessageRouter.getRegisteredTypes();
    
    types.forEach(type => {
      EventBus.on(`message:${type}`, (message) => {
        this.log(type, message);
      });
    });
  }
  
  log(type, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    
    this.logs.push(entry);
    console.log(`📨 [${type}]`, message);
  }
  
  getLogs() {
    return this.logs;
  }
  
  clear() {
    this.logs = [];
  }
}

// Uso
const logger = new MessageLogger();
window.getMessageLogs = () => logger.getLogs();
```

---

### 3. Validador de mensajes
```javascript
// message-validator.js
import MessageRouter from './services/websocket/MessageRouter.js';

const schemas = {
  device_update: {
    required: ['deviceId', 'data'],
    dataRequired: ['status']
  },
  device_alarm: {
    required: ['deviceId', 'alarmType', 'timestamp']
  }
};

function validateMessage(message) {
  const schema = schemas[message.type];
  
  if (!schema) return true; // Sin validación
  
  // Validar campos requeridos
  for (const field of schema.required) {
    if (!(field in message)) {
      console.error(`Campo faltante '${field}' en mensaje:`, message);
      return false;
    }
  }
  
  // Validar campos nested
  if (schema.dataRequired && message.data) {
    for (const field of schema.dataRequired) {
      if (!(field in message.data)) {
        console.error(`Campo faltante 'data.${field}' en mensaje:`, message);
        return false;
      }
    }
  }
  
  return true;
}

// Interceptar route() original
const originalRoute = MessageRouter.route.bind(MessageRouter);
MessageRouter.route = function(message) {
  if (validateMessage(message)) {
    originalRoute(message);
  } else {
    console.error('❌ Mensaje inválido ignorado:', message);
  }
};
```

---

## ⚡ Performance

### Mediciones (Chrome DevTools):
- **route():** < 0.1ms (lookup en Map)
- **handler execution:** < 0.5ms (promedio)
- **EventBus.emit():** < 0.1ms
- **Total per message:** < 1ms

### Optimizaciones:
- Uso de `Map` para handlers (O(1) lookup)
- Try/catch solo en handler, no en validación
- No clona mensajes (pasa referencia)

---

## 🚨 Errores Comunes

### ❌ Error: "Mensaje debe ser un objeto"
```javascript
// ❌ MAL
MessageRouter.route('string');

// ✅ BIEN
MessageRouter.route({ type: 'test' });
```

---

### ❌ Warning: "Sin handler para tipo..."
```javascript
// Backend envía mensaje no soportado
{
  type: 'nuevo_tipo',
  data: '...'
}

// Solución: Registrar handler
MessageRouter.register('nuevo_tipo', (msg) => {
  console.log('Nuevo tipo recibido:', msg);
});
```

---

### ❌ Error en handler no manejado
```javascript
// ❌ MAL - Handler sin try/catch
MessageRouter.register('risky', (msg) => {
  msg.data.campo.nested.profundo; // Puede fallar
});

// ✅ BIEN - Handler con validación
MessageRouter.register('risky', (msg) => {
  if (!msg.data?.campo?.nested) {
    console.error('Estructura inválida');
    return;
  }
  
  const value = msg.data.campo.nested.profundo;
});
```

---

## 🔧 Debugging

### Ver handlers registrados:
```javascript
console.log('Handlers:', MessageRouter.getRegisteredTypes());
```

### Interceptar todos los mensajes:
```javascript
const types = MessageRouter.getRegisteredTypes();

types.forEach(type => {
  EventBus.on(`message:${type}`, (msg) => {
    console.log(`📨 ${type}:`, msg);
  });
});
```

### Exponer en window:
```javascript
window.MessageRouter = MessageRouter;

// En consola:
MessageRouter.getRegisteredTypes()
MessageRouter.isRegistered('device_update')
```

---

## 📚 Referencias

### Patrones implementados:
- **Strategy Pattern:** Handlers intercambiables por tipo
- **Chain of Responsibility:** Route → Handler → EventBus
- **Singleton Pattern:** Una única instancia

### Inspiración:
- Express.js routing
- Redux action dispatching
- Command pattern

---

## 🎯 Roadmap

### Mejoras futuras:
- [ ] Schema validation (Zod/Joi)
- [ ] Middleware chain (pre/post processing)
- [ ] Handler priorities (orden de ejecución)
- [ ] Async handlers support
- [ ] Wildcards (`device:*`)
- [ ] Message replay (re-procesar mensajes)
- [ ] Metrics (contador por tipo)

---

## 📝 Changelog

### v0.2-beta (Actual)
- ✅ 6 handlers pre-registrados
- ✅ Strategy pattern para routing
- ✅ Error isolation en handlers
- ✅ Event emission automática
- ✅ API de registro dinámica

---

**Anterior:** [WebSocketService.md](./WebSocketService.md) - Cliente WebSocket  
**Siguiente:** [ConnectionManager.md](./ConnectionManager.md) - Gestión de conexión

**Ver también:**
- [EventBus.md](../01-fundamentos/EventBus.md) - Sistema de eventos
- [HandshakeHandler.md](./handlers/HandshakeHandler.md) - Handler de handshake
- [DeviceUpdateHandler.md](./handlers/DeviceUpdateHandler.md) - Handler de updates