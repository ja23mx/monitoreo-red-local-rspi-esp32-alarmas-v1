# EventBus - Sistema de Pub/Sub Centralizado

**Versión:** v0.2-beta  
**Archivo:** `js/core/EventBus.js`  
**Patrón:** Singleton + Observer  
**Dependencias:** Ninguna (módulo fundacional)

---

## 📋 Descripción

EventBus es el **sistema de comunicación desacoplada** del frontend. Implementa el patrón Observer (Pub/Sub) permitiendo que los módulos se comuniquen mediante eventos sin conocerse directamente.

### Características principales:
- ✅ **Singleton**: Una única instancia global
- ✅ **Type-safe**: Validación estricta de parámetros
- ✅ **Error isolation**: Try/catch automático en cada callback
- ✅ **Debug mode**: Logs detallados de eventos
- ✅ **Testing-friendly**: Método `clear()` para reset completo

---

## 🏗️ Arquitectura

```javascript
EventBus (Singleton)
  ├── listeners: Map<string, Set<Function>>
  ├── debugMode: boolean
  └── Métodos públicos (8)
```

### Estructura interna:
```javascript
{
  listeners: Map {
    'device:updated' => Set(3) [ fn1, fn2, fn3 ],
    'websocket:connected' => Set(1) [ fn4 ],
    ...
  },
  debugMode: false
}
```

---

## 📦 API Pública

### `on(eventName, callback)`
Suscribe un callback a un evento específico.

**Parámetros:**
- `eventName` (string): Nombre del evento
- `callback` (Function): Función a ejecutar cuando se emita el evento

**Retorna:** `void`

**Validaciones:**
- ✅ `eventName` debe ser string no vacío
- ✅ `callback` debe ser función

**Ejemplo:**
```javascript
import EventBus from './js/core/EventBus.js';

EventBus.on('device:updated', (device) => {
  console.log('Device actualizado:', device.id);
});
```

**Características:**
- Usa `Set` internamente (evita duplicados automáticamente)
- No retorna unsubscribe function (usar `off()` explícitamente)

---

### `emit(eventName, data)`
Emite un evento a todos los suscriptores.

**Parámetros:**
- `eventName` (string): Nombre del evento
- `data` (any): Datos a pasar a los callbacks (opcional)

**Retorna:** `void`

**Validaciones:**
- ✅ `eventName` debe ser string no vacío

**Ejemplo:**
```javascript
EventBus.emit('device:updated', {
  id: 'ESP32_001',
  status: 'online',
  lastSeen: new Date().toISOString()
});
```

**Comportamiento:**
- Si no hay listeners, no hace nada (no lanza error)
- Ejecuta callbacks en orden de registro
- Si un callback falla, continúa con los demás (error isolation)
- En debug mode, muestra todos los listeners ejecutados

---

### `off(eventName, callback)`
Remueve un callback específico de un evento.

**Parámetros:**
- `eventName` (string): Nombre del evento
- `callback` (Function): Referencia exacta del callback a remover

**Retorna:** `void`

**Validaciones:**
- ✅ `eventName` debe ser string no vacío
- ✅ `callback` debe ser función

**Ejemplo:**
```javascript
const handleUpdate = (device) => {
  console.log('Update:', device);
};

EventBus.on('device:updated', handleUpdate);
// ... más tarde
EventBus.off('device:updated', handleUpdate);
```

**⚠️ Importante:**
- Debe ser la **misma referencia** de función
- Arrow functions inline no se pueden remover:
  ```javascript
  // ❌ MAL - No se puede remover
  EventBus.on('test', (data) => console.log(data));
  EventBus.off('test', (data) => console.log(data)); // No funciona
  
  // ✅ BIEN - Se puede remover
  const handler = (data) => console.log(data);
  EventBus.on('test', handler);
  EventBus.off('test', handler); // Funciona
  ```

---

### `removeAllListeners(eventName)`
Elimina todos los listeners de un evento específico.

**Parámetros:**
- `eventName` (string): Nombre del evento (opcional)

**Retorna:** `void`

**Comportamiento:**
- Si se pasa `eventName`: elimina solo ese evento
- Si se omite `eventName`: elimina TODOS los eventos (equivalente a `clear()`)

**Ejemplo:**
```javascript
// Eliminar listeners específicos
EventBus.removeAllListeners('device:updated');

// Eliminar TODOS (no recomendado en producción)
EventBus.removeAllListeners();
```

---

### `clear()`
Reset completo del EventBus (testing/debugging).

**Parámetros:** Ninguno  
**Retorna:** `void`

**Comportamiento:**
- Elimina todos los eventos y listeners
- Restaura el Map interno a estado vacío

**Ejemplo:**
```javascript
// En tests unitarios
afterEach(() => {
  EventBus.clear();
});
```

**⚠️ Advertencia:**
- Solo usar en tests o debugging
- En producción puede romper módulos que esperan eventos

---

### `setDebugMode(enabled)`
Activa/desactiva logs detallados de eventos.

**Parámetros:**
- `enabled` (boolean): `true` para activar, `false` para desactivar

**Retorna:** `void`

**Ejemplo:**
```javascript
// Activar debug
EventBus.setDebugMode(true);

EventBus.emit('test', { msg: 'hola' });
// Console output:
// 🔔 [EventBus] Emitiendo: test con data: {msg: "hola"}
// 🎯 [EventBus] Ejecutando listener 1 de 3 para: test
```

**Uso recomendado:**
```javascript
// En desarrollo
if (import.meta.env.DEV) {
  EventBus.setDebugMode(true);
}
```

---

### `listenerCount(eventName)`
Cuenta cuántos listeners tiene un evento.

**Parámetros:**
- `eventName` (string): Nombre del evento

**Retorna:** `number` - Cantidad de listeners (0 si no existe el evento)

**Ejemplo:**
```javascript
EventBus.on('test', () => {});
EventBus.on('test', () => {});

console.log(EventBus.listenerCount('test')); // 2
console.log(EventBus.listenerCount('otro')); // 0
```

---

### `getEventNames()`
Obtiene lista de todos los eventos registrados.

**Parámetros:** Ninguno  
**Retorna:** `Array<string>` - Array con nombres de eventos

**Ejemplo:**
```javascript
EventBus.on('device:updated', () => {});
EventBus.on('websocket:connected', () => {});

console.log(EventBus.getEventNames());
// ['device:updated', 'websocket:connected']
```

**Uso:** Debugging, health checks, tests

---

## 🔥 Eventos del Sistema

### Convención de nombres:
```
<módulo>:<acción>[:<detalle>]

Ejemplos:
- device:updated
- websocket:connected
- state:devices:changed
```

### Eventos Core (12):

| Evento                    | Emitido por         | Payload                  | Descripción                        |
| ------------------------- | ------------------- | ------------------------ | ---------------------------------- |
| `websocket:connected`     | WebSocketService    | `null`                   | WebSocket conectado exitosamente   |
| `websocket:disconnected`  | WebSocketService    | `{code, reason}`         | WebSocket desconectado             |
| `websocket:error`         | WebSocketService    | `Error`                  | Error en WebSocket                 |
| `connection:reconnecting` | ConnectionManager   | `{attempt, maxAttempts}` | Intentando reconectar              |
| `connection:failed`       | ConnectionManager   | `null`                   | Reconexión fallida definitivamente |
| `handshake:completed`     | HandshakeHandler    | `{devices, mqttStatus}`  | Handshake inicial completado       |
| `state:devices:changed`   | StateManager        | `Array<Device>`          | Array de devices actualizado       |
| `state:websocket:changed` | StateManager        | `boolean`                | Estado WS cambió                   |
| `state:mqtt:changed`      | StateManager        | `boolean`                | Estado MQTT cambió                 |
| `device:update`           | DeviceUpdateHandler | `Device`                 | Device individual actualizado      |
| `device:alarm`            | DeviceAlarmHandler  | `{deviceId, type, ...}`  | Alarma disparada                   |
| `device:card:action`      | DeviceCard          | `{deviceId, action}`     | Acción en card (test/reset)        |

---

## 🧪 Testing

### Test básico:
```javascript
// test-eventbus.html
import EventBus from './js/core/EventBus.js';

// Test 1: Suscripción básica
EventBus.on('test', (data) => console.log('Recibido:', data));
EventBus.emit('test', { msg: 'Hola' });
// Output: Recibido: {msg: "Hola"}

// Test 2: Múltiples suscriptores
EventBus.on('multi', (data) => console.log('Listener 1:', data));
EventBus.on('multi', (data) => console.log('Listener 2:', data));
EventBus.emit('multi', 123);
// Output:
// Listener 1: 123
// Listener 2: 123

// Test 3: Remover suscriptor
const handler = (data) => console.log('Handler:', data);
EventBus.on('remove-test', handler);
EventBus.emit('remove-test', 'antes');  // Output: Handler: antes
EventBus.off('remove-test', handler);
EventBus.emit('remove-test', 'después'); // (silencio)

// Test 4: Debugging
EventBus.setDebugMode(true);
EventBus.emit('debug-test', { x: 1 });
// Output: 🔔 [EventBus] Emitiendo: debug-test con data: {x: 1}
```

---

## 📊 Casos de Uso Reales

### 1. Actualización de dispositivo
```javascript
// HandshakeHandler.js
EventBus.emit('handshake:completed', {
  devices: devicesArray,
  mqttStatus: true
});

// App.js
EventBus.on('handshake:completed', ({ devices, mqttStatus }) => {
  Toast.success(`${devices.length} dispositivos cargados`);
  if (mqttStatus) {
    Toast.info('Servidor MQTT: Conectado');
  }
});
```

### 2. Notificación de reconexión
```javascript
// ConnectionManager.js
EventBus.emit('connection:reconnecting', {
  attempt: 3,
  maxAttempts: 5
});

// App.js
EventBus.on('connection:reconnecting', ({ attempt, maxAttempts }) => {
  Toast.info(`Reconectando (${attempt}/${maxAttempts})...`);
});
```

### 3. Alarma de dispositivo
```javascript
// DeviceAlarmHandler.js
EventBus.emit('device:alarm', {
  deviceId: 'ESP32_001',
  type: 'button',
  timestamp: new Date().toISOString()
});

// DeviceCard.js
EventBus.on('device:alarm', ({ deviceId, type }) => {
  if (this.deviceId === deviceId) {
    this.showAlarmAnimation(type);
  }
});
```

---

## ⚡ Performance

### Mediciones (Chrome DevTools):
- **Emit simple:** < 0.1ms
- **Emit con 10 listeners:** < 0.5ms
- **Emit con 100 listeners:** < 2ms
- **Memory overhead:** ~50 bytes por listener

### Optimizaciones internas:
- Uso de `Set` para evitar duplicados (O(1) lookup)
- Try/catch solo en callbacks (no en validación)
- No clona el `data` (pasa referencia directa)

---

## 🚨 Errores Comunes

### ❌ Error: "eventName debe ser un string"
```javascript
EventBus.on(123, () => {}); // ❌ MAL
EventBus.on('evento', () => {}); // ✅ BIEN
```

### ❌ Error: "callback debe ser una función"
```javascript
EventBus.on('test', 'not a function'); // ❌ MAL
EventBus.on('test', () => {}); // ✅ BIEN
```

### ❌ No se remueve el listener
```javascript
// ❌ MAL - Referencias diferentes
EventBus.on('test', () => console.log('a'));
EventBus.off('test', () => console.log('a')); // No funciona

// ✅ BIEN - Misma referencia
const fn = () => console.log('a');
EventBus.on('test', fn);
EventBus.off('test', fn); // Funciona
```

---

## 🔧 Debugging

### Inspección en consola:
```javascript
// Activar debug global
EventBus.setDebugMode(true);

// Ver eventos registrados
console.log(EventBus.getEventNames());

// Contar listeners de evento
console.log(EventBus.listenerCount('device:updated'));

// Acceso directo (solo debugging)
console.log(EventBus.listeners);
```

### En Chrome DevTools:
```javascript
// Exponer en window (en index.html)
window.EventBus = EventBus;

// Luego en consola:
EventBus.on('debug', (data) => console.log('DEBUG:', data));
EventBus.emit('debug', { test: 123 });
```

---

## 📚 Referencias

### Patrones implementados:
- **Observer Pattern:** Gang of Four Design Patterns
- **Singleton Pattern:** Una única instancia global
- **Event-Driven Architecture:** Desacoplamiento mediante eventos

### Alternativas consideradas:
- ❌ **EventTarget API nativa:** No soporta datos complejos sin CustomEvent
- ❌ **RxJS:** Overhead innecesario para este caso de uso
- ✅ **Implementación custom:** Balance perfecto simplicidad/features

---

## 🎯 Roadmap

### Posibles mejoras futuras:
- [ ] Soporte para eventos con wildcards (`device:*`)
- [ ] Once() - Listener que se ejecuta una sola vez
- [ ] Prioridad de listeners (ejecutar en orden específico)
- [ ] Namespace de eventos (`app:device:updated`)
- [ ] TypeScript types para eventos
- [ ] Histórico de eventos (últimos N eventos)

---

## 📝 Changelog

### v0.2-beta (Actual)
- ✅ Implementación completa del patrón Observer
- ✅ 8 métodos públicos
- ✅ Debug mode
- ✅ Error isolation
- ✅ Testing utilities

---

**Siguiente:** [StateManager.md](./StateManager.md) - Gestión de estado global

**Ver también:**
- [App.md](../04-app/App.md) - Orquestador principal
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Arquitectura completa del sistema