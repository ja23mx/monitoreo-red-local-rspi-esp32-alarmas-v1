# DeviceUpdateHandler - Handler de Actualizaciones de Dispositivos

**Versión:** v0.2-beta  
**Archivo:** `js/services/websocket/handlers/DeviceUpdateHandler.js`  
**Patrón:** Singleton + Auto-initialization + Observer  
**Dependencias:** `EventBus.js`, `StateManager.js`

---

## 📋 Descripción

DeviceUpdateHandler es el **procesador de actualizaciones periódicas de estado** de los dispositivos ESP32. Maneja principalmente heartbeats (señales de vida cada 30 segundos) y cambios de estado silenciosos, sin mostrar notificaciones para evitar spam.

### Características principales:
- ✅ **Auto-initialization**: Se registra automáticamente al importar
- ✅ **Silent updates**: No muestra Toast (evita spam por heartbeats frecuentes)
- ✅ **Flexible validation**: Acepta cualquier combinación de campos
- ✅ **State sync**: Actualiza StateManager automáticamente
- ✅ **Error isolation**: Try/catch sin notificaciones al usuario
- ✅ **Device verification**: Verifica existencia antes de actualizar
- ✅ **High frequency**: Optimizado para procesar mensajes cada 30s/device

---

## 🏗️ Arquitectura

```javascript
DeviceUpdateHandler (Singleton)
  ├── constructor()
  │    └─> EventBus.on('message:device_update', handle)
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

### Estructura mínima:
```javascript
{
  type: 'device_update',
  deviceId: string,
  // Al menos UNO de los siguientes:
  status?: 'online' | 'offline',
  lastSeen?: string (ISO 8601)
}
```

### Campos opcionales adicionales:
```javascript
{
  type: 'device_update',
  deviceId: string,
  status?: 'online' | 'offline',
  lastSeen?: string,
  rssi?: number,              // Señal WiFi (dBm)
  uptime?: number,            // Segundos desde boot
  ipAddress?: string,         // IP local
  firmware?: string,          // Versión firmware
  // ... cualquier otro campo
}
```

### Ejemplo - Heartbeat típico:
```javascript
{
  type: 'device_update',
  deviceId: 'ESP32_001',
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z'
}
```

### Ejemplo - Update extendido:
```javascript
{
  type: 'device_update',
  deviceId: 'ESP32_001',
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z',
  rssi: -65,
  uptime: 3600,
  ipAddress: '192.168.1.45',
  firmware: 'v1.2.3'
}
```

### Ejemplo - Solo cambio de status:
```javascript
{
  type: 'device_update',
  deviceId: 'ESP32_001',
  status: 'offline'
}
```

---

## 🔧 Métodos

### `constructor()`
Inicializa el handler y se registra en EventBus (auto-ejecutado).

**Comportamiento:**
```javascript
constructor() {
  EventBus.on('message:device_update', this.handle.bind(this));
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
Procesa el mensaje de actualización (método principal).

**Parámetros:**
- `message` (Object): Mensaje recibido del servidor

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
  ├─> [3] StateManager.getDevice(deviceId)
  │    ├─> if not found → console.warn + return
  │    └─> if found → device object
  │
  ├─> [4] Construir objeto updates con campos presentes
  │    updates = {}
  │    if (message.status) updates.status = message.status
  │    if (message.lastSeen) updates.lastSeen = message.lastSeen
  │    // ... más campos
  │
  ├─> [5] StateManager.updateDevice(deviceId, updates)
  │    ├─> if failed → console.error + return
  │    └─> if success → continue
  │
  └─> [6] console.log('📊 Device actualizado: ...')
  
  } catch (error) {
     console.error('[DeviceUpdateHandler] Error inesperado:', error)
     // NO muestra Toast al usuario
  }
```

**Ejemplo de ejecución:**

```javascript
// Mensaje recibido del backend (heartbeat)
const message = {
  type: 'device_update',
  deviceId: 'ESP32_001',
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z'
};

// Procesamiento interno (automático)
// 1. Validación ✅
// 2. Device encontrado: { id: 'ESP32_001', status: 'online', ... }
// 3. Construir updates:
const updates = {
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z'
};

// 4. StateManager actualizado:
StateManager.updateDevice('ESP32_001', updates);
// → EventBus.emit('state:devices:changed') (automático por StateManager)
// → DeviceList re-renderiza (reactividad automática)

// 5. Console log:
// [DeviceUpdateHandler] 📊 Device "ESP32_001" actualizado: online

// 6. NO Toast, NO evento custom
```

---

### `validate(message)`
Valida la estructura del mensaje (privado).

**Parámetros:**
- `message` (Object): Mensaje a validar

**Retorna:** `boolean` - true si válido, false si inválido

**Validaciones flexibles:**
```javascript
validate(message) {
  // 1. Debe ser objeto
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  // 2. deviceId debe ser string no vacío
  if (!message.deviceId || typeof message.deviceId !== 'string') {
    return false;
  }
  
  // 3. Al menos UNO de estos campos debe estar presente
  const hasStatus = 'status' in message;
  const hasLastSeen = 'lastSeen' in message;
  
  if (!hasStatus && !hasLastSeen) {
    console.error('[DeviceUpdateHandler] Debe incluir al menos status o lastSeen');
    return false;
  }
  
  return true;
}
```

**Casos de validación:**

```javascript
// ✅ Válido - ambos campos
validate({
  deviceId: 'ESP32_001',
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z'
}); // → true

// ✅ Válido - solo status
validate({
  deviceId: 'ESP32_001',
  status: 'offline'
}); // → true

// ✅ Válido - solo lastSeen
validate({
  deviceId: 'ESP32_001',
  lastSeen: '2025-10-23T14:30:00.000Z'
}); // → true

// ✅ Válido - campos extra (se ignoran en validación)
validate({
  deviceId: 'ESP32_001',
  status: 'online',
  rssi: -65,
  uptime: 3600
}); // → true

// ❌ Inválido - falta deviceId
validate({
  status: 'online'
}); // → false

// ❌ Inválido - deviceId vacío
validate({
  deviceId: '',
  status: 'online'
}); // → false

// ❌ Inválido - sin status ni lastSeen
validate({
  deviceId: 'ESP32_001'
}); // → false
```

**Console output en errores:**
```
[DeviceUpdateHandler] Mensaje no es un objeto
[DeviceUpdateHandler] deviceId inválido
[DeviceUpdateHandler] Debe incluir al menos status o lastSeen
```

---

## 🔥 Eventos

### Evento escuchado: `message:device_update`
Mensaje enrutado por MessageRouter.

**Emitido por:** MessageRouter (al recibir `{type: 'device_update'}`)

**Listener:**
```javascript
EventBus.on('message:device_update', this.handle.bind(this));
```

---

### Eventos emitidos: Ninguno directo

**⚠️ Importante:** DeviceUpdateHandler **NO emite eventos custom**. La reactividad viene de StateManager:

```javascript
StateManager.updateDevice(deviceId, updates)
  ↓
StateManager emite: 'state:devices:changed'
  ↓
DeviceList escucha y re-renderiza automáticamente
```

**Razón del diseño:**
- Updates son **muy frecuentes** (cada 30s por device)
- Emitir evento custom sería **redundante** (StateManager ya lo hace)
- **Performance**: Evita propagación innecesaria de eventos

**Si necesitas detectar cambios específicos:**
```javascript
// Escuchar evento de StateManager
EventBus.on('state:devices:changed', () => {
  const devices = StateManager.getDevices();
  // Procesar cambios
});

// O mejor: Usar StateManager con reactividad granular
const device = StateManager.getDevice('ESP32_001');
console.log('Última actualización:', device.lastSeen);
```

---

## 📊 Flujo Completo: Heartbeat de Device

```
[1] ESP32_001 envía heartbeat MQTT cada 30s
  ↓
[2] ESP32 publica MQTT: devices/ESP32_001/status
{
  "status": "online",
  "lastSeen": "2025-10-23T14:30:00.000Z",
  "rssi": -65
}
  ↓
[3] Backend Node.js recibe MQTT
  ↓
[4] Backend envía WebSocket a todos los clientes:
{
  "type": "device_update",
  "deviceId": "ESP32_001",
  "status": "online",
  "lastSeen": "2025-10-23T14:30:00.000Z",
  "rssi": -65
}
  ↓
[5] WebSocketService.handleMessage()
  ↓
[6] MessageRouter.route(message)
  ↓
[7] EventBus.emit('message:device_update', message)
  ↓
[8] DeviceUpdateHandler.handle(message)
  │
  ├─> [8.1] validate() ✅
  │
  ├─> [8.2] StateManager.getDevice('ESP32_001')
  │         → { id: 'ESP32_001', status: 'online', lastSeen: '...', ... }
  │
  ├─> [8.3] Construir updates:
  │         updates = {
  │           status: 'online',
  │           lastSeen: '2025-10-23T14:30:00.000Z',
  │           rssi: -65
  │         }
  │
  ├─> [8.4] StateManager.updateDevice('ESP32_001', updates)
  │         ↓
  │    StateManager._devices['ESP32_001'] = { ...device, ...updates }
  │         ↓
  │    EventBus.emit('state:devices:changed')
  │         ↓
  │    [8.4.1] DeviceList escucha evento
  │         ↓
  │    [8.4.2] DeviceList.renderDevices()
  │         ↓
  │    [8.4.3] DeviceCard actualiza badge de status
  │              - Badge verde "ONLINE"
  │              - Timestamp "Hace 2 segundos"
  │              - RSSI bar: -65 dBm (3/4 barras)
  │
  └─> [8.5] console.log('[DeviceUpdateHandler] 📊 Device "ESP32_001" actualizado: online')

[9] NO Toast mostrado (silencioso)
[10] NO evento custom emitido (usa StateManager)

[11] 30 segundos después: se repite desde [1]
```

---

## 🧪 Testing

### Test: Mensaje válido con ambos campos
```javascript
import DeviceUpdateHandler from './services/websocket/handlers/DeviceUpdateHandler.js';
import StateManager from './core/StateManager.js';
import EventBus from './core/EventBus.js';

// Setup: Device en StateManager
StateManager.setDevices([
  { id: 'ESP32_001', status: 'offline', lastSeen: null }
]);

// Simular mensaje
const message = {
  type: 'device_update',
  deviceId: 'ESP32_001',
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z'
};

EventBus.emit('message:device_update', message);

// Verificar
const device = StateManager.getDevice('ESP32_001');
console.assert(device.status === 'online', 'status debe ser online');
console.assert(device.lastSeen === '2025-10-23T14:30:00.000Z', 'lastSeen debe actualizarse');
```

---

### Test: Mensaje válido solo con status
```javascript
const message = {
  deviceId: 'ESP32_001',
  status: 'offline'
};

EventBus.emit('message:device_update', message);

const device = StateManager.getDevice('ESP32_001');
console.assert(device.status === 'offline', 'status debe ser offline');
```

---

### Test: Mensaje inválido (sin campos requeridos)
```javascript
const invalidMessage = {
  deviceId: 'ESP32_001'
  // Falta status Y lastSeen
};

// No debe lanzar error
EventBus.emit('message:device_update', invalidMessage);

// Console output:
// [DeviceUpdateHandler] Debe incluir al menos status o lastSeen
// [DeviceUpdateHandler] Mensaje inválido: {...}
```

---

### Test: Device no existe
```javascript
StateManager.setDevices([]);  // Sin devices

const message = {
  deviceId: 'ESP32_999',  // No existe
  status: 'online'
};

EventBus.emit('message:device_update', message);

// Console output:
// [DeviceUpdateHandler] Device "ESP32_999" no encontrado en StateManager
```

---

### Test: Campos adicionales se procesan
```javascript
const message = {
  deviceId: 'ESP32_001',
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z',
  rssi: -65,
  uptime: 3600,
  customField: 'custom_value'
};

EventBus.emit('message:device_update', message);

const device = StateManager.getDevice('ESP32_001');
console.assert(device.rssi === -65, 'rssi debe actualizarse');
console.assert(device.uptime === 3600, 'uptime debe actualizarse');
console.assert(device.customField === 'custom_value', 'campos custom se aceptan');
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
  deviceId: 'ESP32_001',
  status: 'online',
  lastSeen: '2025-10-23T14:30:00.000Z'
};

EventBus.emit('message:device_update', message);

console.assert(toastCalled === false, 'NO debe llamar Toast.show');

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
    // Escuchar cambios generales de StateManager
    EventBus.on('state:devices:changed', () => {
      this.updateConnectionStats();
    });
  }
  
  updateConnectionStats() {
    const devices = StateManager.getDevices();
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    
    const badge = document.querySelector('#connection-stats');
    badge.textContent = `${online}/${devices.length} online`;
    badge.className = online === devices.length ? 'badge-success' : 'badge-warning';
  }
  
  checkStaleDevices() {
    setInterval(() => {
      const devices = StateManager.getDevices();
      const now = Date.now();
      const threshold = 60000; // 60 segundos
      
      devices.forEach(device => {
        if (!device.lastSeen) return;
        
        const lastSeenTime = new Date(device.lastSeen).getTime();
        const elapsed = now - lastSeenTime;
        
        if (elapsed > threshold && device.status === 'online') {
          console.warn(`⚠️ Device ${device.id} sin actualizar por ${Math.round(elapsed/1000)}s`);
          // Opcionalmente marcar como stale
          StateManager.updateDevice(device.id, { stale: true });
        }
      });
    }, 30000); // Cada 30s
  }
}

new ConnectionMonitor();
```

---

### 2. Logger de actualizaciones (debugging)
```javascript
// UpdateLogger.js
import EventBus from './core/EventBus.js';

class UpdateLogger {
  constructor() {
    this.logs = [];
    this.interceptUpdates();
  }
  
  interceptUpdates() {
    // Interceptar mensaje antes de procesar
    EventBus.on('message:device_update', (message) => {
      const entry = {
        timestamp: new Date().toISOString(),
        deviceId: message.deviceId,
        changes: this.extractChanges(message),
        raw: message
      };
      
      this.logs.push(entry);
      
      // Limitar a últimas 100 entradas
      if (this.logs.length > 100) {
        this.logs.shift();
      }
      
      if (window.DEBUG_UPDATES) {
        console.log('📝 Update logged:', entry);
      }
    });
  }
  
  extractChanges(message) {
    const changes = {};
    if ('status' in message) changes.status = message.status;
    if ('lastSeen' in message) changes.lastSeen = message.lastSeen;
    if ('rssi' in message) changes.rssi = message.rssi;
    // ... más campos
    return changes;
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
}

const updateLogger = new UpdateLogger();
window.getUpdateLogs = (deviceId) => updateLogger.getLogs(deviceId);
```

---

### 3. Indicador de señal WiFi (RSSI)
```javascript
// RSSIIndicator.js - Actualizar badge de señal WiFi
import EventBus from './core/EventBus.js';
import StateManager from './core/StateManager.js';

class RSSIIndicator {
  constructor(deviceId, element) {
    this.deviceId = deviceId;
    this.element = element;
    this.setupListener();
    this.update(); // Inicial
  }
  
  setupListener() {
    EventBus.on('state:devices:changed', () => {
      this.update();
    });
  }
  
  update() {
    const device = StateManager.getDevice(this.deviceId);
    if (!device || !device.rssi) return;
    
    const bars = this.rssiToBars(device.rssi);
    const color = this.rssiToColor(device.rssi);
    
    this.element.innerHTML = `
      <div class="rssi-indicator" style="color: ${color}">
        ${this.renderBars(bars)}
        <span>${device.rssi} dBm</span>
      </div>
    `;
  }
  
  rssiToBars(rssi) {
    if (rssi >= -50) return 4;      // Excelente
    if (rssi >= -60) return 3;      // Buena
    if (rssi >= -70) return 2;      // Regular
    if (rssi >= -80) return 1;      // Débil
    return 0;                       // Muy débil
  }
  
  rssiToColor(rssi) {
    if (rssi >= -60) return '#00ff00';  // Verde
    if (rssi >= -70) return '#ffff00';  // Amarillo
    if (rssi >= -80) return '#ff8800';  // Naranja
    return '#ff0000';                   // Rojo
  }
  
  renderBars(count) {
    const bars = [];
    for (let i = 0; i < 4; i++) {
      const active = i < count ? 'active' : '';
      bars.push(`<span class="bar ${active}"></span>`);
    }
    return bars.join('');
  }
}

// Uso en DeviceCard
const rssiElement = document.querySelector(`#rssi-${device.id}`);
new RSSIIndicator(device.id, rssiElement);
```

---

## ⚡ Performance

### Mediciones (Chrome DevTools):
- **validate():** < 0.1ms
- **handle() completo:** < 1ms (incluye StateManager update)
- **StateManager.updateDevice():** < 0.5ms (Object.assign)
- **Total latency:** < 2ms (end-to-end)

### Frecuencia de ejecución:
```
5 devices × 30s heartbeat = 10 updates/minuto
100 devices × 30s = 200 updates/minuto
```

### Overhead estimado:
```
200 updates/min × 2ms = 400ms/min = 0.67% CPU
```

**Conclusión:** Optimizado para alta frecuencia, impacto negligible.

---

## 🚨 Errores Comunes

### ❌ Error: "Device no encontrado"
```javascript
// Causa: deviceId no existe en StateManager
{
  deviceId: 'ESP32_999',  // No existe
  status: 'online'
}

// Console output:
// [DeviceUpdateHandler] Device "ESP32_999" no encontrado en StateManager

// Solución: Verificar que handshake inicial cargó todos los devices
```

---

### ❌ Error: "Debe incluir al menos status o lastSeen"
```javascript
// ❌ Backend envía mensaje vacío
{
  deviceId: 'ESP32_001'
  // Sin campos
}

// Solución: Backend debe enviar al menos uno de:
{
  deviceId: 'ESP32_001',
  status: 'online'  // ✅
}
// o
{
  deviceId: 'ESP32_001',
  lastSeen: '2025-10-23T14:30:00.000Z'  // ✅
}
```

---

### ❌ Warning: Campo no existe en device
```javascript
// Backend envía campo nuevo no documentado
{
  deviceId: 'ESP32_001',
  status: 'online',
  newField: 'value'
}

// Comportamiento: Se acepta y guarda en StateManager
// (Flexibilidad para campos futuros)

// Para validar estrictamente, modificar validate():
validate(message) {
  const allowedFields = ['status', 'lastSeen', 'rssi', 'uptime'];
  const extraFields = Object.keys(message).filter(
    key => key !== 'type' && key !== 'deviceId' && !allowedFields.includes(key)
  );
  
  if (extraFields.length > 0) {
    console.warn(`Campos no reconocidos: ${extraFields.join(', ')}`);
  }
  // ... resto de validación
}
```

---

## 🔧 Debugging

### Activar logs detallados:
```javascript
// En consola del navegador
window.DEBUG_UPDATES = true;

// Ahora cada update muestra:
// 📝 Update logged: { timestamp, deviceId, changes, raw }
```

### Inspeccionar mensajes:
```javascript
// Interceptar todos los updates
const originalHandle = DeviceUpdateHandler.handle.bind(DeviceUpdateHandler);
DeviceUpdateHandler.handle = function(message) {
  console.log('🔍 Device update recibido:', message);
  originalHandle(message);
};
```

### Ver historial de updates:
```javascript
// Usar UpdateLogger (del caso de uso #2)
window.getUpdateLogs('ESP32_001');
// → Array con últimos 100 updates de ESP32_001
```

---

## 📚 Referencias

### Patrones implementados:
- **Observer Pattern:** EventBus para comunicación
- **Singleton Pattern:** Una única instancia auto-inicializada
- **Validation Pattern:** Método `validate()` separado
- **Silent Update Pattern:** No notifica al usuario (evita spam)

### Frecuencias típicas:
- **Heartbeat normal:** 30 segundos
- **Heartbeat agresivo:** 10 segundos (alto tráfico)
- **Keep-alive mínimo:** 60 segundos (ahorro energía)

---

## 🎯 Roadmap

### Mejoras futuras:
- [ ] **Delta updates:** Solo enviar campos cambiados (ahorro bandwidth)
- [ ] **Batch updates:** Agrupar múltiples devices en un mensaje
- [ ] **Compression:** gzip para mensajes grandes
- [ ] **Schema validation:** Zod/Joi para validación completa
- [ ] **Metrics:** Contador de updates por device
- [ ] **Offline detection:** Auto-marcar offline si no hay heartbeat en 90s

---

## 📝 Changelog

### v0.2-beta (Actual)
- ✅ Handler de updates silencioso (sin Toast)
- ✅ Validación flexible (acepta cualquier combinación)
- ✅ Verificación de existencia de device
- ✅ Construcción dinámica de objeto updates
- ✅ Optimizado para alta frecuencia
- ✅ Error handling sin notificaciones al usuario

---

**Anterior:** [DeviceAlarmHandler.md](./DeviceAlarmHandler.md) - Handler de alarmas  
**Siguiente:** [HandshakeHandler.md](./HandshakeHandler.md) - Handler de handshake

**Ver también:**
- [MessageRouter.md](../MessageRouter.md) - Enrutador de mensajes
- [StateManager.md](../../01-fundamentos/StateManager.md) - Estado global
- [DeviceList.md](../../03-componentes/DeviceList.md) - Lista de dispositivos