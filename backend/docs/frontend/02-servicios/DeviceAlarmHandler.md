# DeviceAlarmHandler - Handler de Eventos de Alarma

**Versión:** v0.2-beta  
**Archivo:** `js/services/websocket/handlers/DeviceAlarmHandler.js`  
**Patrón:** Singleton + Auto-initialization + Observer  
**Dependencias:** `EventBus.js`, `StateManager.js`, `Toast.js`

---

## 📋 Descripción

DeviceAlarmHandler es el **procesador de eventos de alarma críticos**. Maneja la activación y desactivación de alarmas (botones de pánico) de los dispositivos ESP32, actualiza el estado global y muestra notificaciones críticas con duración extendida.

### Características principales:
- ✅ **Auto-initialization**: Se registra automáticamente al importar
- ✅ **Critical notifications**: Toast de 10 segundos para alarmas activas
- ✅ **State sync**: Actualiza StateManager automáticamente
- ✅ **Event emission**: Emite eventos para animaciones/UI
- ✅ **Strict validation**: Validación estricta de `alarmActive` (boolean)
- ✅ **Error isolation**: Try/catch con Toast de error
- ✅ **Device verification**: Verifica existencia antes de actualizar

---

## 🏗️ Arquitectura

```javascript
DeviceAlarmHandler (Singleton)
  ├── constructor()
  │    └─> EventBus.on('message:device_alarm', handle)
  ├── handle(message)
  │    ├─> validate()
  │    ├─> StateManager.updateDevice()
  │    ├─> Toast.show() (critical)
  │    └─> EventBus.emit('device:alarm:changed')
  └── validate(message)
```

### Auto-inicialización:
```javascript
// En App.js
import './services/websocket/handlers/DeviceAlarmHandler.js';

// El constructor se ejecuta automáticamente:
// [DeviceAlarmHandler] ✅ Handler registrado
```

---

## 📦 Mensaje Esperado (Backend → Frontend)

### Estructura:
```javascript
{
  type: 'device_alarm',        // Identificador del mensaje
  deviceId: string,            // ID único del device (ej: 'ESP32_001')
  alarmActive: boolean,        // Estado de la alarma
  timestamp: string            // ISO 8601 (opcional)
}
```

### Ejemplo - Alarma activada:
```javascript
{
  type: 'device_alarm',
  deviceId: 'ESP32_001',
  alarmActive: true,
  timestamp: '2025-10-23T14:45:30.000Z'
}
```

### Ejemplo - Alarma desactivada:
```javascript
{
  type: 'device_alarm',
  deviceId: 'ESP32_001',
  alarmActive: false,
  timestamp: '2025-10-23T14:46:00.000Z'
}
```

---

## 🔧 Métodos

### `constructor()`
Inicializa el handler y se registra en EventBus (auto-ejecutado).

**Comportamiento:**
```javascript
constructor() {
  EventBus.on('message:device_alarm', this.handle.bind(this));
  console.log('[DeviceAlarmHandler] ✅ Handler registrado');
}
```

**Console output:**
```
[DeviceAlarmHandler] ✅ Handler registrado
```

**⚠️ Nota:** No llamar manualmente, se ejecuta al importar el módulo.

---

### `handle(message)`
Procesa el mensaje de alarma (método principal).

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
  ├─> [4] StateManager.updateDevice(deviceId, {
  │         alarmActive: boolean,
  │         lastSeen: ISO string
  │       })
  │    ├─> if failed → console.error + return
  │    └─> if success → continue
  │
  ├─> [5] console.log('🚨 Alarma ... ACTIVADA/DESACTIVADA')
  │
  ├─> [6] Toast.show()
  │    ├─> if alarmActive === true
  │    │    └─> Toast.show('🚨 ALARMA ACTIVADA: ...', 'error', 10000)
  │    └─> else
  │         └─> Toast.show('✅ Alarma desactivada: ...', 'success')
  │
  └─> [7] EventBus.emit('device:alarm:changed', {
           deviceId,
           alarmActive,
           deviceName,
           timestamp
         })
  
  } catch (error) {
     console.error + Toast.show('❌ Error al procesar alarma', 'error')
  }
```

**Ejemplo de ejecución:**

```javascript
// Mensaje recibido del backend
const message = {
  type: 'device_alarm',
  deviceId: 'ESP32_001',
  alarmActive: true,
  timestamp: '2025-10-23T14:45:30.000Z'
};

// Procesamiento interno (automático)
// 1. Validación ✅
// 2. Device encontrado: { id: 'ESP32_001', name: 'Alarma Principal', ... }
// 3. StateManager actualizado:
StateManager.updateDevice('ESP32_001', {
  alarmActive: true,
  lastSeen: '2025-10-23T14:45:30.000Z'
});

// 4. Console log:
// [DeviceAlarmHandler] 🚨 Alarma "ESP32_001": ACTIVADA

// 5. Toast mostrado:
// Toast: "🚨 ALARMA ACTIVADA: Alarma Principal" (rojo, 10 segundos)

// 6. Evento emitido:
EventBus.emit('device:alarm:changed', {
  deviceId: 'ESP32_001',
  alarmActive: true,
  deviceName: 'Alarma Principal',
  timestamp: '2025-10-23T14:45:30.000Z'
});
```

---

### `validate(message)`
Valida la estructura del mensaje (privado).

**Parámetros:**
- `message` (Object): Mensaje a validar

**Retorna:** `boolean` - true si válido, false si inválido

**Validaciones estrictas:**
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
  
  // 3. alarmActive debe ser boolean ESTRICTO
  if (typeof message.alarmActive !== 'boolean') {
    return false;
  }
  
  return true;
}
```

**Casos de validación:**

```javascript
// ✅ Válido
validate({
  deviceId: 'ESP32_001',
  alarmActive: true
}); // → true

// ❌ Inválido - alarmActive no es boolean
validate({
  deviceId: 'ESP32_001',
  alarmActive: 1  // ❌ Number en vez de boolean
}); // → false

// ❌ Inválido - deviceId vacío
validate({
  deviceId: '',
  alarmActive: true
}); // → false

// ❌ Inválido - falta alarmActive
validate({
  deviceId: 'ESP32_001'
}); // → false
```

**Console output en errores:**
```
[DeviceAlarmHandler] Mensaje no es un objeto
[DeviceAlarmHandler] deviceId inválido
[DeviceAlarmHandler] alarmActive debe ser boolean
```

---

## 🔥 Eventos

### Evento escuchado: `message:device_alarm`
Mensaje enrutado por MessageRouter.

**Emitido por:** MessageRouter (al recibir `{type: 'device_alarm'}`)

**Listener:**
```javascript
EventBus.on('message:device_alarm', this.handle.bind(this));
```

---

### Evento emitido: `device:alarm:changed`
Notifica cambio de estado de alarma (para UI/animaciones).

**Payload:**
```javascript
{
  deviceId: string,       // 'ESP32_001'
  alarmActive: boolean,   // true/false
  deviceName: string,     // 'Alarma Principal' o deviceId (fallback)
  timestamp: string       // ISO 8601 o generado
}
```

**Emitido por:** `handle()` (después de actualizar StateManager)

**Listeners potenciales:**
```javascript
// DeviceCard.js - Activar animación de alarma
EventBus.on('device:alarm:changed', ({ deviceId, alarmActive }) => {
  const card = document.querySelector(`[data-device-id="${deviceId}"]`);
  
  if (alarmActive) {
    card.classList.add('alarm-active');  // Pulso rojo
    card.classList.add('shake-animation');
  } else {
    card.classList.remove('alarm-active');
    card.classList.remove('shake-animation');
  }
});

// AlarmLogger.js - Registrar historial
EventBus.on('device:alarm:changed', ({ deviceId, alarmActive, timestamp }) => {
  const entry = {
    deviceId,
    alarmActive,
    timestamp,
    loggedAt: new Date().toISOString()
  };
  
  alarmHistory.push(entry);
  saveToLocalStorage('alarm_history', alarmHistory);
});

// SoundNotifier.js - Reproducir sonido de alarma
EventBus.on('device:alarm:changed', ({ alarmActive }) => {
  if (alarmActive) {
    playAlarmSound();
  } else {
    stopAlarmSound();
  }
});
```

---

## 🎨 Notificaciones Toast

### Alarma activada (crítica):
```javascript
Toast.show('🚨 ALARMA ACTIVADA: Alarma Principal', 'error', 10000);
```

**Características:**
- **Tipo:** `'error'` (rojo)
- **Duración:** 10,000ms (10 segundos) - extendida
- **Icono:** 🚨 (emoji en el mensaje)
- **Propósito:** Notificación crítica que requiere atención

**Apariencia:**
```
┌────────────────────────────────────────┐
│ ❌ 🚨 ALARMA ACTIVADA: Alarma Principal│  ← Fondo rojo
│                                    [×] │
└────────────────────────────────────────┘
(visible por 10 segundos)
```

---

### Alarma desactivada (éxito):
```javascript
Toast.show('✅ Alarma desactivada: Alarma Principal', 'success');
```

**Características:**
- **Tipo:** `'success'` (verde)
- **Duración:** Default (3 segundos)
- **Icono:** ✅
- **Propósito:** Confirmar desactivación exitosa

**Apariencia:**
```
┌────────────────────────────────────────┐
│ ✅ Alarma desactivada: Alarma Principal│  ← Fondo verde
│                                    [×] │
└────────────────────────────────────────┘
(visible por 3 segundos)
```

---

## 📊 Flujo Completo: Botón de Pánico Presionado

```
[1] Usuario presiona botón físico en ESP32_001
  ↓
[2] ESP32 publica MQTT: devices/ESP32_001/alarm
{
  "alarmActive": true,
  "timestamp": "2025-10-23T14:45:30.000Z"
}
  ↓
[3] Backend Node.js recibe MQTT
  ↓
[4] Backend envía WebSocket a todos los clientes:
{
  "type": "device_alarm",
  "deviceId": "ESP32_001",
  "alarmActive": true,
  "timestamp": "2025-10-23T14:45:30.000Z"
}
  ↓
[5] WebSocketService.handleMessage()
  ↓
[6] MessageRouter.route(message)
  ↓
[7] EventBus.emit('message:device_alarm', message)
  ↓
[8] DeviceAlarmHandler.handle(message)
  │
  ├─> [8.1] validate() ✅
  │
  ├─> [8.2] StateManager.getDevice('ESP32_001')
  │         → { id: 'ESP32_001', name: 'Alarma Principal', alarmActive: false, ... }
  │
  ├─> [8.3] StateManager.updateDevice('ESP32_001', {
  │           alarmActive: true,
  │           lastSeen: '2025-10-23T14:45:30.000Z'
  │         })
  │         ↓
  │    EventBus.emit('state:devices:changed')
  │         ↓
  │    DeviceList re-renderiza (badge rojo "ALARMA")
  │
  ├─> [8.4] Toast.show('🚨 ALARMA ACTIVADA: Alarma Principal', 'error', 10000)
  │         ↓
  │    Toast rojo visible por 10 segundos en pantalla
  │
  └─> [8.5] EventBus.emit('device:alarm:changed', {
            deviceId: 'ESP32_001',
            alarmActive: true,
            deviceName: 'Alarma Principal',
            timestamp: '2025-10-23T14:45:30.000Z'
          })
          ↓
     [8.5.1] DeviceCard → Agregar clase 'alarm-active' (pulso rojo)
     [8.5.2] DeviceCard → Agregar clase 'shake-animation'
     [8.5.3] AlarmLogger → Guardar en historial
     [8.5.4] SoundNotifier → Reproducir sonido de alarma

[9] Usuario desactiva alarma (30 segundos después)
  ↓
[Similar flow con alarmActive: false]
  ↓
Toast.show('✅ Alarma desactivada: Alarma Principal', 'success')
DeviceCard → Remover clases de alarma
SoundNotifier → Detener sonido
```

---

## 🧪 Testing

### Test: Mensaje válido de activación
```javascript
import DeviceAlarmHandler from './services/websocket/handlers/DeviceAlarmHandler.js';
import StateManager from './core/StateManager.js';
import EventBus from './core/EventBus.js';

// Setup: Device en StateManager
StateManager.setDevices([
  { id: 'ESP32_001', name: 'Test Alarm', alarmActive: false }
]);

// Mock de Toast
let toastCalled = false;
const originalShow = Toast.show;
Toast.show = (msg, type, duration) => {
  toastCalled = true;
  console.log('Toast:', msg, type, duration);
};

// Simular mensaje
const message = {
  type: 'device_alarm',
  deviceId: 'ESP32_001',
  alarmActive: true,
  timestamp: new Date().toISOString()
};

EventBus.emit('message:device_alarm', message);

// Verificar
const device = StateManager.getDevice('ESP32_001');
console.assert(device.alarmActive === true, 'alarmActive debe ser true');
console.assert(toastCalled === true, 'Debe llamar Toast.show');

// Restore
Toast.show = originalShow;
```

---

### Test: Mensaje inválido (sin alarmActive)
```javascript
const invalidMessage = {
  deviceId: 'ESP32_001'
  // Falta alarmActive
};

// No debe lanzar error
EventBus.emit('message:device_alarm', invalidMessage);

// Debe loggear error
// [DeviceAlarmHandler] alarmActive debe ser boolean
// [DeviceAlarmHandler] Mensaje inválido: {...}
```

---

### Test: Device no existe
```javascript
StateManager.setDevices([]);  // Sin devices

const message = {
  deviceId: 'ESP32_999',  // No existe
  alarmActive: true
};

EventBus.emit('message:device_alarm', message);

// Console output:
// [DeviceAlarmHandler] Device "ESP32_999" no encontrado en StateManager
```

---

### Test: Evento emitido
```javascript
let eventReceived = false;
let eventData = null;

EventBus.on('device:alarm:changed', (data) => {
  eventReceived = true;
  eventData = data;
});

const message = {
  deviceId: 'ESP32_001',
  alarmActive: false,
  timestamp: '2025-10-23T14:46:00.000Z'
};

EventBus.emit('message:device_alarm', message);

console.assert(eventReceived === true, 'Debe emitir evento');
console.assert(eventData.deviceId === 'ESP32_001', 'deviceId correcto');
console.assert(eventData.alarmActive === false, 'alarmActive correcto');
```

---

## 📊 Casos de Uso Reales

### 1. Animación de alarma en DeviceCard
```javascript
// DeviceCard.js
import EventBus from './core/EventBus.js';

class DeviceCard {
  constructor(device) {
    this.device = device;
    this.element = this.render();
    this.setupAlarmListener();
  }
  
  setupAlarmListener() {
    EventBus.on('device:alarm:changed', ({ deviceId, alarmActive }) => {
      if (deviceId !== this.device.id) return;
      
      if (alarmActive) {
        this.activateAlarmAnimation();
      } else {
        this.deactivateAlarmAnimation();
      }
    });
  }
  
  activateAlarmAnimation() {
    this.element.classList.add('alarm-active');
    this.element.classList.add('shake');
    
    // Pulso rojo infinito
    this.element.style.animation = 'alarm-pulse 1s infinite';
  }
  
  deactivateAlarmAnimation() {
    this.element.classList.remove('alarm-active');
    this.element.classList.remove('shake');
    this.element.style.animation = '';
  }
}
```

**CSS:**
```css
@keyframes alarm-pulse {
  0%, 100% {
    background-color: #ff0000;
    box-shadow: 0 0 20px #ff0000;
  }
  50% {
    background-color: #cc0000;
    box-shadow: 0 0 40px #ff0000;
  }
}

.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
```

---

### 2. Historial de alarmas
```javascript
// AlarmHistory.js
import EventBus from './core/EventBus.js';

class AlarmHistory {
  constructor() {
    this.history = this.loadFromStorage();
    this.setupListener();
  }
  
  setupListener() {
    EventBus.on('device:alarm:changed', (data) => {
      this.addEntry(data);
    });
  }
  
  addEntry({ deviceId, alarmActive, deviceName, timestamp }) {
    const entry = {
      deviceId,
      deviceName,
      alarmActive,
      timestamp: timestamp || new Date().toISOString(),
      loggedAt: new Date().toISOString()
    };
    
    this.history.unshift(entry);  // Más reciente primero
    
    // Limitar a últimas 100 entradas
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }
    
    this.saveToStorage();
    console.log('📝 Alarma registrada:', entry);
  }
  
  loadFromStorage() {
    const stored = localStorage.getItem('alarm_history');
    return stored ? JSON.parse(stored) : [];
  }
  
  saveToStorage() {
    localStorage.setItem('alarm_history', JSON.stringify(this.history));
  }
  
  getHistory(limit = 10) {
    return this.history.slice(0, limit);
  }
  
  clear() {
    this.history = [];
    this.saveToStorage();
  }
}

const alarmHistory = new AlarmHistory();
window.getAlarmHistory = () => alarmHistory.getHistory();
```

---

### 3. Notificación sonora
```javascript
// AlarmSoundNotifier.js
import EventBus from './core/EventBus.js';

class AlarmSoundNotifier {
  constructor() {
    this.audio = new Audio('/sounds/alarm.mp3');
    this.audio.loop = true;
    this.isPlaying = false;
    
    this.setupListener();
  }
  
  setupListener() {
    EventBus.on('device:alarm:changed', ({ alarmActive }) => {
      if (alarmActive) {
        this.play();
      } else {
        this.stop();
      }
    });
  }
  
  play() {
    if (this.isPlaying) return;
    
    this.audio.play().then(() => {
      this.isPlaying = true;
      console.log('🔊 Sonido de alarma activado');
    }).catch(error => {
      console.error('Error reproduciendo sonido:', error);
    });
  }
  
  stop() {
    if (!this.isPlaying) return;
    
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    console.log('🔇 Sonido de alarma detenido');
  }
}

new AlarmSoundNotifier();
```

---

## ⚡ Performance

### Mediciones (Chrome DevTools):
- **validate():** < 0.1ms
- **handle() completo:** < 2ms (incluye StateManager update + Toast)
- **EventBus.emit():** < 0.1ms
- **Toast.show():** < 5ms (render + animation)

### Impacto en UI:
- **Re-render de DeviceCard:** ~10ms
- **Animación CSS:** Hardware-accelerated (GPU)

---

## 🚨 Errores Comunes

### ❌ Error: "Device no encontrado"
```javascript
// Causa: deviceId no existe en StateManager
{
  deviceId: 'ESP32_999',  // No existe
  alarmActive: true
}

// Console output:
// [DeviceAlarmHandler] Device "ESP32_999" no encontrado en StateManager

// Solución: Verificar handshake inicial
```

---

### ❌ Error: "alarmActive debe ser boolean"
```javascript
// ❌ Backend envía number en vez de boolean
{
  deviceId: 'ESP32_001',
  alarmActive: 1  // ❌ Should be true/false
}

// Solución: Corregir en backend (enviar boolean)
{
  deviceId: 'ESP32_001',
  alarmActive: true  // ✅
}
```

---

### ❌ Warning: "device.name es undefined"
```javascript
// Causa: Device no tiene propiedad 'name'
const device = { id: 'ESP32_001', nombre: 'Alarma 1' };  // 'nombre' no 'name'

// Código usa:
const deviceName = device.name || deviceId;  // 👈 Fallback a deviceId

// Console output:
// Toast: "🚨 ALARMA ACTIVADA: ESP32_001" (usa ID en vez de nombre)

// Solución: Unificar schema (usar 'name' o 'nombre' consistentemente)
```

---

## 🔧 Debugging

### Inspección de mensajes:
```javascript
// Interceptar todos los mensajes de alarma
const originalHandle = DeviceAlarmHandler.handle.bind(DeviceAlarmHandler);
DeviceAlarmHandler.handle = function(message) {
  console.log('🔍 Mensaje de alarma recibido:', message);
  originalHandle(message);
};
```

### Ver historial de eventos:
```javascript
const alarmEvents = [];

EventBus.on('device:alarm:changed', (data) => {
  alarmEvents.push({ ...data, receivedAt: new Date().toISOString() });
  console.log('Historial de alarmas:', alarmEvents);
});

window.getAlarmEvents = () => alarmEvents;
```

---

## 📚 Referencias

### Patrones implementados:
- **Observer Pattern:** EventBus para comunicación
- **Singleton Pattern:** Una única instancia auto-inicializada
- **Validation Pattern:** Método `validate()` separado

### Notificaciones críticas:
- [UX Guidelines: Error Notifications](https://uxdesign.cc/designing-error-messages-88e8e1e37c4e)
- Duración extendida (10s) para eventos críticos

---

## 🎯 Roadmap

### Mejoras futuras:
- [ ] **Notificación push del navegador** (Notification API)
- [ ] **Vibración en móviles** (Vibration API)
- [ ] **Rate limiting** (evitar spam si backend falla)
- [ ] **Confirmación de lectura** (enviar ACK al backend)
- [ ] **Escalamiento de notificaciones** (re-notificar si no se atiende)
- [ ] **Integración con servicios externos** (Twilio, PagerDuty)

---

## 📝 Changelog

### v0.2-beta (Actual)
- ✅ Handler de alarmas con validación estricta
- ✅ Notificaciones críticas (10s duración)
- ✅ Event emission para UI/animaciones
- ✅ Verificación de existencia de device
- ✅ Fallback de timestamp si no provisto
- ✅ Error handling con Toast

---

**Anterior:** [DeviceUpdateHandler.md](./DeviceUpdateHandler.md) - Handler de actualizaciones  
**Siguiente:** [DeviceCard.md](../../03-componentes/DeviceCard.md) - Componente de dispositivo

**Ver también:**
- [MessageRouter.md](../MessageRouter.md) - Enrutador de mensajes
- [StateManager.md](../../01-fundamentos/StateManager.md) - Estado global
- [Toast.md](../../03-componentes/ui/Toast.md) - Notificaciones