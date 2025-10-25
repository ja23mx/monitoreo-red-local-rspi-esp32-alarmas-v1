# DeviceUpdateHandler - Handler de Actualizaciones de Dispositivos

**Versión:** v1.0  
**Archivo:** `js/services/websocket/handlers/DeviceUpdateHandler.js`  
**Patrón:** Singleton + Auto-initialization + Observer  
**Dependencias:** `EventBus.js`, `StateManager.js`

---

## 📋 Descripción

DeviceUpdateHandler es el **procesador de heartbeats** de los dispositivos ESP32. Actualiza `status` y `lastSeen` cada vez que un dispositivo envía señal de vida (cada 30 segundos), sin mostrar notificaciones para evitar spam.

### Características principales:
- ✅ **Auto-initialization**: Se registra automáticamente al importar
- ✅ **Silent updates**: No muestra Toast (evita spam por heartbeats frecuentes)
- ✅ **Notification-based**: Escucha `notification:heartbeat` de MessageRouter
- ✅ **State sync**: Actualiza StateManager automáticamente
- ✅ **Error isolation**: Try/catch sin notificaciones al usuario
- ✅ **Device verification**: Verifica existencia antes de actualizar
- ✅ **High frequency**: Optimizado para procesar mensajes cada 30s/device

---

## 🏗️ Arquitectura

```javascript
DeviceUpdateHandler (Singleton)
  ├── constructor()
  │    └─> EventBus.on('notification:heartbeat', handle)
  ├── handle(message)
  │    ├─> validate()
  │    ├─> StateManager.updateDevice()
  │    └─> console.log (NO Toast, NO event emission)
  └── validate(message)
```

### Auto-inicialización:
```javascript
// En App.js
import './services/websocket/handlers/DeviceUpdateHandler.js';

// El constructor se ejecuta automáticamente:
// [DeviceUpdateHandler] ✅ Handler registrado
```

---

## 📦 Mensaje Esperado (Backend → Frontend)

### Estructura de notificación de heartbeat:
```javascript
{
  type: 'notification',
  event: 'heartbeat',
  timestamp: string (ISO 8601),
  data: {
    deviceId: string,
    mac: string,
    deviceName: string
  }
}
```

### Ejemplo real:
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

---

## 🔧 Métodos

### `constructor()`
Inicializa el handler y se registra en EventBus (auto-ejecutado).

**Comportamiento:**
```javascript
constructor() {
  EventBus.on('notification:heartbeat', this.handle.bind(this));
  console.log('[DeviceUpdateHandler] ✅ Handler registrado');
}
```

**Console output:**
```
[DeviceUpdateHandler] ✅ Handler registrado
```

**⚠️ Nota:** No llamar manualmente, se ejecuta al importar el módulo.

---

### `handle(message)`
Procesa el heartbeat y actualiza StateManager (método principal).

**Parámetros:**
- `message` (Object): Mensaje de notificación heartbeat

**Retorna:** `void`

**Flujo completo:**
```javascript
handle(message)
  │
  ├─> [1] try {
  │
  ├─> [2] validate(message)
  │    ├─> if invalid → console.error + return
  │    └─> if valid → continue
  │
  ├─> [3] Extraer deviceId y timestamp
  │    const { deviceId } = message.data
  │    const timestamp = message.timestamp
  │
  ├─> [4] StateManager.getDevice(deviceId)
  │    ├─> if not found → console.warn + return
  │    └─> if found → device object
  │
  ├─> [5] StateManager.updateDevice(deviceId, {
  │         status: 'online',
  │         lastSeen: timestamp
  │       })
  │    ├─> if failed → console.error + return
  │    └─> if success → continue
  │
  └─> [6] console.log('💓 Heartbeat de "deviceId" - lastSeen: timestamp')
  
  } catch (error) {
     console.error('[DeviceUpdateHandler] Error al procesar heartbeat:', error)
     // NO muestra Toast al usuario
  }
```

**Ejemplo de ejecución:**

```javascript
// Mensaje recibido del backend
const message = {
  type: 'notification',
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    deviceId: 'ESP32_001',
    mac: '77FF44',
    deviceName: 'ALARMA X'
  }
};

// Procesamiento interno (automático)
// 1. Validación ✅
// 2. Device encontrado: { id: 'ESP32_001', status: 'offline', ... }
// 3. Actualizar StateManager:
StateManager.updateDevice('ESP32_001', {
  status: 'online',
  lastSeen: '2025-10-25T05:12:33.766Z'
});

// 4. StateManager emite automáticamente:
// → EventBus.emit('state:devices:changed')
// → DeviceList re-renderiza
// → DeviceCard actualiza "Visto: hace 2 segundos"

// 5. Console log:
// [DeviceUpdateHandler] 💓 Heartbeat de "ESP32_001" - lastSeen: 2025-10-25T05:12:33.766Z

// 6. NO Toast, NO evento custom
```

---

### `validate(message)`
Valida la estructura del mensaje de notificación (privado).

**Parámetros:**
- `message` (Object): Mensaje a validar

**Retorna:** `boolean` - true si válido, false si inválido

**Validaciones:**
```javascript
validate(message) {
  // 1. Debe ser objeto
  if (!message || typeof message !== 'object') {
    console.warn('[DeviceUpdateHandler] Mensaje no es un objeto');
    return false;
  }
  
  // 2. event debe ser 'heartbeat'
  if (!message.event || message.event !== 'heartbeat') {
    console.warn('[DeviceUpdateHandler] event debe ser "heartbeat"');
    return false;
  }
  
  // 3. data debe ser objeto
  if (!message.data || typeof message.data !== 'object') {
    console.warn('[DeviceUpdateHandler] data inválido');
    return false;
  }
  
  // 4. deviceId debe existir en data
  if (!message.data.deviceId || typeof message.data.deviceId !== 'string') {
    console.warn('[DeviceUpdateHandler] deviceId inválido');
    return false;
  }
  
  // 5. timestamp debe ser string
  if (!message.timestamp || typeof message.timestamp !== 'string') {
    console.warn('[DeviceUpdateHandler] timestamp inválido');
    return false;
  }
  
  return true;
}
```

**Casos de validación:**

```javascript
// ✅ Válido
validate({
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    deviceId: 'ESP32_001',
    mac: '77FF44'
  }
}); // → true

// ❌ Inválido - event incorrecto
validate({
  event: 'button_pressed',  // ← NO es heartbeat
  timestamp: '2025-10-25T05:12:33.766Z',
  data: { deviceId: 'ESP32_001' }
}); // → false

// ❌ Inválido - sin data
validate({
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z'
}); // → false

// ❌ Inválido - sin deviceId
validate({
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: { mac: '77FF44' }
}); // → false

// ❌ Inválido - sin timestamp
validate({
  event: 'heartbeat',
  data: { deviceId: 'ESP32_001' }
}); // → false
```

**Console output en errores:**
```
[DeviceUpdateHandler] Mensaje no es un objeto
[DeviceUpdateHandler] event debe ser "heartbeat"
[DeviceUpdateHandler] data inválido
[DeviceUpdateHandler] deviceId inválido
[DeviceUpdateHandler] timestamp inválido
```

---

## 🔥 Eventos

### Evento escuchado: `notification:heartbeat`
Notificación de heartbeat enrutada por MessageRouter.

**Emitido por:** MessageRouter (al recibir `{type: 'notification', event: 'heartbeat'}`)

**Listener:**
```javascript
EventBus.on('notification:heartbeat', this.handle.bind(this));
```

---

### Eventos emitidos: Ninguno directo

**⚠️ Importante:** DeviceUpdateHandler **NO emite eventos custom**. La reactividad viene de StateManager:

```javascript
StateManager.updateDevice(deviceId, updates)
  ↓
StateManager emite: 'state:devices:changed'
  ↓
DeviceCard.update() escucha y actualiza UI
```

**Razón del diseño:**
- Heartbeats son **muy frecuentes** (cada 30s por device)
- Emitir evento custom sería **redundante** (StateManager ya lo hace)
- **Performance**: Evita propagación innecesaria de eventos

**Si necesitas detectar heartbeats:**
```javascript
// Opción 1: Escuchar evento de StateManager
EventBus.on('state:devices:changed', () => {
  const device = StateManager.getDevice('ESP32_001');
  console.log('Last seen:', device.lastSeen);
});

// Opción 2: Interceptar directamente (debugging)
EventBus.on('notification:heartbeat', (message) => {
  console.log('Heartbeat recibido:', message.data.deviceId);
});
```

---

## 📊 Flujo Completo: Heartbeat de Device

```
[1] ESP32_001 envía heartbeat MQTT cada 30s
  ↓
[2] ESP32 publica MQTT: devices/ESP32_001/heartbeat
{
  "event": "hb",
  "time": "2025-10-25T04:25:32Z"
}
  ↓
[3] Backend Node.js recibe MQTT (mqtt-handler.js)
  ↓
[4] Backend procesa evento (notification-broadcaster.js)
  ↓
[5] Backend envía WebSocket a todos los clientes:
{
  "type": "notification",
  "event": "heartbeat",
  "timestamp": "2025-10-25T05:12:33.766Z",
  "data": {
    "deviceId": "ESP32_001",
    "mac": "77FF44",
    "deviceName": "ALARMA X"
  }
}
  ↓
[6] WebSocketService.handleMessage()
  ↓
[7] MessageRouter.route(message)
  ↓
[8] MessageRouter emite: EventBus.emit('notification:heartbeat', message)
  ↓
[9] DeviceUpdateHandler.handle(message)
  │
  ├─> [9.1] validate() ✅
  │
  ├─> [9.2] StateManager.getDevice('ESP32_001')
  │         → { id: 'ESP32_001', status: 'offline', lastSeen: '...', ... }
  │
  ├─> [9.3] StateManager.updateDevice('ESP32_001', {
  │           status: 'online',
  │           lastSeen: '2025-10-25T05:12:33.766Z'
  │         })
  │         ↓
  │    StateManager emite: 'state:devices:changed'
  │         ↓
  │    [9.3.1] DeviceCard escucha evento
  │         ↓
  │    [9.3.2] DeviceCard.update()
  │         ↓
  │    [9.3.3] UI actualiza:
  │              - Badge verde "ONLINE"
  │              - Timestamp "Visto: hace 2 segundos"
  │
  └─> [9.4] console.log('[DeviceUpdateHandler] 💓 Heartbeat de "ESP32_001"...')

[10] NO Toast mostrado (silencioso)
[11] NO evento custom emitido (usa StateManager)

[12] 30 segundos después: se repite desde [1]
```

---

## 🧪 Testing

### Test: Heartbeat válido
```javascript
import DeviceUpdateHandler from './services/websocket/handlers/DeviceUpdateHandler.js';
import StateManager from './core/StateManager.js';
import EventBus from './core/EventBus.js';

// Setup: Device offline en StateManager
StateManager.setDevices([
  { id: 'ESP32_001', status: 'offline', lastSeen: null }
]);

// Simular heartbeat
const message = {
  type: 'notification',
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    deviceId: 'ESP32_001',
    mac: '77FF44',
    deviceName: 'ALARMA X'
  }
};

EventBus.emit('notification:heartbeat', message);

// Verificar
const device = StateManager.getDevice('ESP32_001');
console.assert(device.status === 'online', 'status debe ser online');
console.assert(device.lastSeen === '2025-10-25T05:12:33.766Z', 'lastSeen debe actualizarse');
console.log('✅ Test passed: heartbeat válido');
```

---

### Test: Heartbeat con device no existente
```javascript
StateManager.setDevices([]);  // Sin devices

const message = {
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    deviceId: 'ESP32_999'  // No existe
  }
};

EventBus.emit('notification:heartbeat', message);

// Console output:
// [DeviceUpdateHandler] Device "ESP32_999" no encontrado en StateManager
console.log('✅ Test passed: device no existe');
```

---

### Test: Mensaje inválido (sin deviceId)
```javascript
const invalidMessage = {
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    mac: '77FF44'  // Falta deviceId
  }
};

EventBus.emit('notification:heartbeat', invalidMessage);

// Console output:
// [DeviceUpdateHandler] deviceId inválido
// [DeviceUpdateHandler] Mensaje inválido: {...}
console.log('✅ Test passed: mensaje inválido');
```

---

### Test: No muestra Toast
```javascript
let toastCalled = false;

// Mock de Toast
const originalShow = Toast.show;
Toast.show = () => {
  toastCalled = true;
};

const message = {
  event: 'heartbeat',
  timestamp: '2025-10-25T05:12:33.766Z',
  data: {
    deviceId: 'ESP32_001',
    mac: '77FF44'
  }
};

EventBus.emit('notification:heartbeat', message);

console.assert(toastCalled === false, 'NO debe llamar Toast.show');
console.log('✅ Test passed: no muestra toast');

// Restore
Toast.show = originalShow;
```

---

## 📊 Casos de Uso Reales

### 1. Monitor de conexión en tiempo real
```javascript
// ConnectionMonitor.js
import EventBus from './core/EventBus.js';
import StateManager from './core/StateManager.js';

class ConnectionMonitor {
  constructor() {
    this.setupListener();
    this.checkStaleDevices();
  }
  
  setupListener() {
    // Escuchar cambios de StateManager
    EventBus.on('state:devices:changed', () => {
      this.updateConnectionStats();
    });
  }
  
  updateConnectionStats() {
    const devices = StateManager.getDevices();
    const online = devices.filter(d => d.status === 'online').length;
    const total = devices.length;
    
    const badge = document.querySelector('#connection-stats');
    badge.textContent = `${online}/${total} online`;
    badge.className = online === total ? 'badge-success' : 'badge-warning';
  }
  
  checkStaleDevices() {
    setInterval(() => {
      const devices = StateManager.getDevices();
      const now = Date.now();
      const threshold = 60000; // 60 segundos sin heartbeat
      
      devices.forEach(device => {
        if (!device.lastSeen) return;
        
        const lastSeenTime = new Date(device.lastSeen).getTime();
        const elapsed = now - lastSeenTime;
        
        if (elapsed > threshold && device.status === 'online') {
          console.warn(`⚠️ Device ${device.id} sin heartbeat por ${Math.round(elapsed/1000)}s`);
          
          // Marcar como stale (opcional)
          StateManager.updateDevice(device.id, { 
            status: 'offline',
            stale: true 
          });
        }
      });
    }, 30000); // Verificar cada 30s
  }
}

new ConnectionMonitor();
```

---

### 2. Logger de heartbeats (debugging)
```javascript
// HeartbeatLogger.js
import EventBus from './core/EventBus.js';

class HeartbeatLogger {
  constructor() {
    this.logs = [];
    this.interceptHeartbeats();
  }
  
  interceptHeartbeats() {
    EventBus.on('notification:heartbeat', (message) => {
      const entry = {
        timestamp: new Date().toISOString(),
        deviceId: message.data.deviceId,
        heartbeatTime: message.timestamp,
        raw: message
      };
      
      this.logs.push(entry);
      
      // Limitar a últimas 100 entradas
      if (this.logs.length > 100) {
        this.logs.shift();
      }
      
      if (window.DEBUG_HEARTBEATS) {
        console.log('💓 Heartbeat logged:', entry);
      }
    });
  }
  
  getLogs(deviceId = null) {
    if (deviceId) {
      return this.logs.filter(log => log.deviceId === deviceId);
    }
    return this.logs;
  }
  
  clear() {
    this.logs = [];
  }
  
  getFrequency(deviceId) {
    const logs = this.getLogs(deviceId);
    if (logs.length < 2) return null;
    
    const times = logs.map(log => new Date(log.timestamp).getTime());
    const intervals = [];
    
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i-1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(avgInterval / 1000); // Segundos
  }
}

const heartbeatLogger = new HeartbeatLogger();
window.getHeartbeatLogs = (deviceId) => heartbeatLogger.getLogs(deviceId);
window.getHeartbeatFrequency = (deviceId) => heartbeatLogger.getFrequency(deviceId);

// Uso en consola:
// getHeartbeatLogs('ESP32_001') → últimos 100 heartbeats
// getHeartbeatFrequency('ESP32_001') → promedio en segundos (ej: 30)
```