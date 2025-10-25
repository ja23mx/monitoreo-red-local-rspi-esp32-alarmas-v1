# app-config - Configuración Centralizada de la Aplicación

**Versión:** v0.2-beta  
**Archivo:** `js/config/app-config.js`  
**Patrón:** Configuration Object + Constants + Environment-aware  
**Dependencias:** Ninguna (archivo base del sistema)

---

## 📋 Descripción

app-config es el **archivo de configuración centralizada** del sistema. Define todas las constantes, URLs, timeouts, mensajes, estilos y comportamientos de la aplicación en un único lugar. Facilita el cambio entre entornos (desarrollo/producción) y el mantenimiento de configuraciones sin tocar código funcional.

### Características principales:
- ✅ **Configuración centralizada**: Todos los valores configurables en un lugar
- ✅ **Environment-aware**: Detecta automáticamente host para WebSocket
- ✅ **Type-safe structure**: Objeto JavaScript con documentación JSDoc
- ✅ **Hot-configurable**: Cambios sin re-compilar (ES6 module)
- ✅ **Production-ready**: Valores optimizados para producción
- ✅ **Zero dependencies**: No requiere otros módulos

---

## 🏗️ Estructura del Objeto de Configuración

```javascript
config = {
  websocket: {
    url: string,
    reconnectDelays: number[],
    reconnectDelaysMin: number,
    reconnectDelaysMax: number,
    maxReconnectAttempts: number,
    pingInterval: number,
    connectionTimeout: number
  },
  
  deviceStates: {
    online: DeviceStateConfig,
    offline: DeviceStateConfig,
    activated: DeviceStateConfig,
    noserver: DeviceStateConfig
  },
  
  commands: {
    ping: CommandConfig,
    play_track: CommandConfig,
    stop_audio: CommandConfig
  },
  
  ui: {
    onlineCounter: UIConfig,
    websocketStatus: UIConfig,
    tooltips: UIConfig,
    dateFormat: string,
    devicesContainerId: string
  },
  
  notifications: {
    duration: DurationConfig,
    maxVisible: number,
    position: string
  },
  
  clock: {
    updateInterval: number,
    weekdayFormat: string,
    monthFormat: string,
    hourFormat: string
  },
  
  debug: {
    enableLogs: boolean,
    showEvents: boolean,
    showWebSocketMessages: boolean
  }
}
```

---

## ⚙️ Secciones de Configuración

### 1️⃣ WebSocket Configuration

Configuración de conexión WebSocket y reconexión automática.

```javascript
websocket: {
  // URL del servidor WebSocket
  // Auto-detecta host actual (ideal para desarrollo y producción)
  url: `ws://${window.location.host}`,
  
  // Delays de reconexión (array de milisegundos)
  reconnectDelays: [3000, 6000, 12000, 24000, 48000],
  // → Intento 1: 3s
  // → Intento 2: 6s
  // → Intento 3: 12s
  // → Intento 4: 24s
  // → Intento 5: 48s
  
  // Backoff exponencial (alternativa a reconnectDelays)
  reconnectDelaysMin: 3000,   // 3 segundos
  reconnectDelaysMax: 30000,  // 30 segundos (tope)
  // → Si se define, sobreescribe reconnectDelays
  // → Genera: 3s, 6s, 12s, 24s, 30s (tope en max)
  
  // Máximo de intentos antes de fallar
  maxReconnectAttempts: 5,
  
  // Ping cada 30 segundos para mantener conexión viva
  pingInterval: 30000,
  
  // Timeout para considerar conexión perdida
  connectionTimeout: 5000
}
```

**Uso en código:**
```javascript
import config from './config/app-config.js';

// WebSocketService.js
const wsUrl = config.websocket.url;
const ws = new WebSocket(wsUrl);

// ConnectionManager.js
const delays = config.websocket.reconnectDelays;
const maxAttempts = config.websocket.maxReconnectAttempts;

setTimeout(() => {
  this.reconnect();
}, delays[this.reconnectAttempt]);
```

**Configuración por entorno:**
```javascript
// Desarrollo local
url: 'ws://localhost:3000'

// Producción con IP fija
url: 'ws://192.168.1.40:3000'

// Producción con auto-detect (recomendado)
url: `ws://${window.location.host}`
// → Si página está en http://192.168.1.40:3000
// → WebSocket será ws://192.168.1.40:3000
```

---

### 2️⃣ Device States Configuration

Define estilos y comportamiento para cada estado de dispositivo.

```javascript
deviceStates: {
  // Device conectado y respondiendo
  online: {
    cssClass: 'online',
    borderColor: 'green',
    label: 'En línea',
    buttonsEnabled: true
  },
  
  // Device no responde heartbeat
  offline: {
    cssClass: 'offline',
    borderColor: 'gray',
    label: 'Desconectado',
    buttonsEnabled: false
  },
  
  // Alarma activada (botón presionado)
  activated: {
    cssClass: 'activated',
    borderColor: 'red',
    label: 'Alarma Activada',
    buttonsEnabled: true,
    animation: 'pulse'  // Animación de borde rojo pulsante
  },
  
  // WebSocket desconectado
  noserver: {
    cssClass: 'noserver',
    borderColor: 'gray',
    label: 'Sin conexión al servidor',
    buttonsEnabled: false
  }
}
```

**Uso en código:**
```javascript
// DeviceCard.js
import config from './config/app-config.js';

const deviceState = device.status; // 'online' | 'offline'
const stateConfig = config.deviceStates[deviceState];

// Aplicar clase CSS
element.classList.add(stateConfig.cssClass);

// Aplicar color de borde
element.style.borderColor = stateConfig.borderColor;

// Mostrar label
labelElement.textContent = stateConfig.label;

// Habilitar/deshabilitar botones
buttons.forEach(btn => {
  btn.disabled = !stateConfig.buttonsEnabled;
});

// Aplicar animación (si existe)
if (stateConfig.animation) {
  element.classList.add(`animation-${stateConfig.animation}`);
}
```

**CSS correspondiente:**
```css
.device-card.online {
  border: 2px solid green;
}

.device-card.offline {
  border: 2px solid gray;
  opacity: 0.7;
}

.device-card.activated {
  border: 2px solid red;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 10px red;
  }
  50% {
    box-shadow: 0 0 25px red;
  }
}

.device-card.animation-pulse {
  animation: pulse 1s infinite;
}
```

---

### 3️⃣ Commands Configuration

Configuración de comandos enviables a dispositivos.

```javascript
commands: {
  // Comando ping (probar conexión)
  ping: {
    track: null,
    label: 'Probar Conexión',
    icon: 'fa-wifi',
    confirmMessage: null,  // Sin confirmación
    successMessage: '✅ Ping enviado',
    errorMessage: '❌ Error al enviar ping'
  },
  
  // Comando play_track (reproducir audio)
  play_track: {
    track: 25,  // Track número 25 del DFPlayer
    label: 'Enviar Aviso',
    icon: 'fa-bullhorn',
    confirmMessage: null,
    successMessage: '✅ Aviso enviado',
    errorMessage: '❌ Error al enviar aviso'
  },
  
  // Comando stop_audio (desactivar alarma)
  stop_audio: {
    track: null,
    label: 'Desactivar',
    icon: 'fa-power-off',
    confirmMessage: null,
    successMessage: '✅ Alarma desactivada',
    errorMessage: '❌ Error al desactivar'
  }
}
```

**Uso en código:**
```javascript
// DeviceCard.js
import config from './config/app-config.js';

function sendCommand(commandName, deviceId) {
  const cmdConfig = config.commands[commandName];
  
  // Confirmación (si está configurada)
  if (cmdConfig.confirmMessage) {
    if (!confirm(cmdConfig.confirmMessage)) {
      return;
    }
  }
  
  // Crear payload
  const payload = {
    type: 'device_command',
    deviceId: deviceId,
    command: commandName
  };
  
  // Agregar track si existe
  if (cmdConfig.track !== null) {
    payload.track = cmdConfig.track;
  }
  
  // Enviar comando
  WebSocketService.send(payload);
  
  // Toast de confirmación
  Toast.show(cmdConfig.successMessage, 'success');
}

// Renderizar botón
function renderButton(commandName) {
  const cmdConfig = config.commands[commandName];
  
  return `
    <button class="btn" data-command="${commandName}">
      <i class="${cmdConfig.icon}"></i>
      ${cmdConfig.label}
    </button>
  `;
}
```

**Agregar nuevo comando:**
```javascript
// En app-config.js
commands: {
  // ...existing commands...
  
  // Nuevo comando: reset device
  reset: {
    track: null,
    label: 'Reiniciar',
    icon: 'fa-refresh',
    confirmMessage: '¿Reiniciar el dispositivo?',  // Requiere confirmación
    successMessage: '✅ Dispositivo reiniciado',
    errorMessage: '❌ Error al reiniciar'
  }
}

// DeviceCard.js automáticamente lo reconocerá
```

---

### 4️⃣ UI Configuration

Configuración de interfaz de usuario.

```javascript
ui: {
  // ID del contenedor de devices
  devicesContainerId: '#devices-container',
  
  // Contador de dispositivos online
  onlineCounter: {
    label: 'Dispositivos Online',
    format: '{online}/{total}'  // Ej: "3/5"
  },
  
  // Mensajes de estado WebSocket
  websocketStatus: {
    connected: 'Conectado al servidor',
    disconnected: 'Desconectado del servidor',
    reconnecting: 'Reconectando...',
    failed: 'Error de conexión'
  },
  
  // Tooltips
  tooltips: {
    lastSeen: 'Última conexión',
    alarmStatus: 'Estado de alarma',
    deviceStatus: 'Estado del dispositivo'
  },
  
  // Formato de fecha para lastSeen
  // Opciones: 'relative' | 'absolute'
  dateFormat: 'relative'
  // relative: "hace 3 minutos"
  // absolute: "09/10/2025 10:30 AM"
}
```

**Uso en código:**
```javascript
// DeviceList.js
import config from './config/app-config.js';

const container = document.querySelector(config.ui.devicesContainerId);

// StatusBar.js
const status = App.getStatus();
const counterConfig = config.ui.onlineCounter;

const text = counterConfig.format
  .replace('{online}', status.onlineDevices)
  .replace('{total}', status.devicesCount);

document.querySelector('#online-counter').textContent = 
  `${counterConfig.label}: ${text}`;

// DeviceCard.js
const lastSeenElement = document.createElement('p');
lastSeenElement.title = config.ui.tooltips.lastSeen;

// DateUtils.js
const dateFormat = config.ui.dateFormat;

if (dateFormat === 'relative') {
  return this.getRelativeTime(date);
} else {
  return this.getAbsoluteTime(date);
}
```

---

### 5️⃣ Notifications Configuration

Configuración de sistema de notificaciones (Toast).

```javascript
notifications: {
  // Duración por tipo de notificación
  duration: {
    success: 3000,  // 3 segundos
    error: 5000,    // 5 segundos
    warning: 4000,  // 4 segundos
    info: 3000      // 3 segundos
  },
  
  // Máximo de toasts visibles simultáneamente
  maxVisible: 3,
  
  // Posición en pantalla
  position: 'top-right'
  // Opciones: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}
```

**Uso en código:**
```javascript
// Toast.js
import config from './config/app-config.js';

show(message, type = 'info', customDuration = null) {
  // Obtener duración configurada o usar custom
  const duration = customDuration || config.notifications.duration[type];
  
  // Limitar cantidad visible
  if (this.toasts.length >= config.notifications.maxVisible) {
    this.removeOldest();
  }
  
  // Crear toast
  const toast = this.createToast(message, type);
  
  // Auto-dismiss
  setTimeout(() => {
    this.remove(toast.id);
  }, duration);
}

// CSS
.toast-container {
  position: fixed;
  /* Usar config.notifications.position */
  top: 20px;      /* si position = 'top-right' */
  right: 20px;    /* si position = 'top-right' */
  z-index: 9999;
}
```

---

### 6️⃣ Clock Configuration

Configuración del reloj del header.

```javascript
clock: {
  // Actualizar cada 1 segundo
  updateInterval: 1000,
  
  // Formato de día de semana
  weekdayFormat: 'short',  // 'LUN' | 'Lunes'
  
  // Formato de mes
  monthFormat: 'short',    // 'OCT' | 'Octubre' | '10'
  
  // Formato de hora
  hourFormat: '12h'        // '04:30 PM' | '16:30'
}
```

**Uso en código:**
```javascript
// Clock.js
import config from './config/app-config.js';

class Clock {
  constructor() {
    this.updateInterval = null;
  }
  
  start() {
    this.update();
    this.updateInterval = setInterval(() => {
      this.update();
    }, config.clock.updateInterval);
  }
  
  update() {
    const now = new Date();
    
    // Día de semana
    const weekdayFormat = config.clock.weekdayFormat === 'short' 
      ? 'short' 
      : 'long';
    const weekday = now.toLocaleDateString('es-ES', { weekday: weekdayFormat });
    
    // Mes
    const monthFormat = config.clock.monthFormat === 'short'
      ? 'short'
      : config.clock.monthFormat === 'long'
        ? 'long'
        : 'numeric';
    const month = now.toLocaleDateString('es-ES', { month: monthFormat });
    
    // Hora
    const hour12 = config.clock.hourFormat === '12h';
    const time = now.toLocaleTimeString('es-ES', { 
      hour12: hour12,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    document.querySelector('#clock-weekday').textContent = weekday;
    document.querySelector('#clock-month').textContent = month;
    document.querySelector('#clock-time').textContent = time;
  }
}
```

**Ejemplos de formatos:**
```javascript
// weekdayFormat: 'short'
// → "LUN", "MAR", "MIÉ"

// weekdayFormat: 'long'
// → "Lunes", "Martes", "Miércoles"

// monthFormat: 'short'
// → "OCT", "NOV", "DIC"

// monthFormat: 'long'
// → "Octubre", "Noviembre", "Diciembre"

// monthFormat: 'numeric'
// → "10", "11", "12"

// hourFormat: '12h'
// → "04:30:15 PM"

// hourFormat: '24h'
// → "16:30:15"
```

---

### 7️⃣ Debug Configuration

Configuración de debugging y logs.

```javascript
debug: {
  // Activar logs en consola
  enableLogs: true,
  
  // Mostrar eventos de EventBus
  showEvents: false,
  
  // Mostrar mensajes WebSocket completos
  showWebSocketMessages: true
}
```

**Uso en código:**
```javascript
// Logger.js
import config from './config/app-config.js';

class Logger {
  static log(...args) {
    if (config.debug.enableLogs) {
      console.log(...args);
    }
  }
  
  static error(...args) {
    if (config.debug.enableLogs) {
      console.error(...args);
    }
  }
  
  static warn(...args) {
    if (config.debug.enableLogs) {
      console.warn(...args);
    }
  }
}

// EventBus.js
emit(event, data) {
  if (config.debug.showEvents) {
    console.log(`[EventBus] emit: ${event}`, data);
  }
  
  // ...emit logic...
}

// MessageRouter.js
route(message) {
  if (config.debug.showWebSocketMessages) {
    console.log('[MessageRouter] Mensaje recibido:', message);
  }
  
  // ...routing logic...
}
```

**Configuración por entorno:**
```javascript
// Desarrollo
debug: {
  enableLogs: true,
  showEvents: true,
  showWebSocketMessages: true
}

// Producción
debug: {
  enableLogs: false,
  showEvents: false,
  showWebSocketMessages: false
}
```

---

## 📊 Casos de Uso Reales

### 1. Cambio de entorno (Dev → Prod)

```javascript
// ANTES del deploy:
// app-config.js (desarrollo)
websocket: {
  url: 'ws://localhost:3000',
  // ...
},
debug: {
  enableLogs: true,
  showEvents: true,
  showWebSocketMessages: true
}

// DESPUÉS del deploy:
// app-config.js (producción)
websocket: {
  url: `ws://${window.location.host}`,  // Auto-detect
  // ...
},
debug: {
  enableLogs: false,
  showEvents: false,
  showWebSocketMessages: false
}
```

---

### 2. Ajustar timeouts de reconexión

```javascript
// Problema: Reconexión muy agresiva
reconnectDelays: [1000, 2000, 4000, 8000, 16000],
// → 1s, 2s, 4s, 8s, 16s (total: 31s)

// Solución: Delays más espaciados
reconnectDelays: [3000, 6000, 12000, 24000, 48000],
// → 3s, 6s, 12s, 24s, 48s (total: 93s)

// O usar backoff exponencial con tope
reconnectDelaysMin: 3000,   // 3s
reconnectDelaysMax: 30000,  // 30s máximo
```

---

### 3. Personalizar mensajes de UI

```javascript
// Cliente en español
ui: {
  websocketStatus: {
    connected: 'Conectado al servidor',
    disconnected: 'Desconectado del servidor',
    reconnecting: 'Reconectando...',
    failed: 'Error de conexión'
  }
}

// Cliente en inglés
ui: {
  websocketStatus: {
    connected: 'Connected to server',
    disconnected: 'Disconnected from server',
    reconnecting: 'Reconnecting...',
    failed: 'Connection error'
  }
}
```

---

### 4. Agregar nuevo comando

```javascript
// app-config.js
commands: {
  // ...existing...
  
  // Nuevo: Actualizar firmware
  update_firmware: {
    track: null,
    label: 'Actualizar Firmware',
    icon: 'fa-download',
    confirmMessage: '⚠️ ¿Actualizar firmware? El dispositivo se reiniciará.',
    successMessage: '✅ Actualización iniciada',
    errorMessage: '❌ Error al actualizar'
  }
}

// DeviceCard.js (sin cambios, lo detecta automáticamente)
Object.keys(config.commands).forEach(commandName => {
  const cmdConfig = config.commands[commandName];
  const button = createButton(commandName, cmdConfig);
  container.appendChild(button);
});
```

---

### 5. Configuración dinámica desde servidor

```javascript
// ConfigLoader.js
class ConfigLoader {
  static async loadRemoteConfig() {
    try {
      const response = await fetch('/api/config');
      const remoteConfig = await response.json();
      
      // Merge con config local
      Object.assign(config, remoteConfig);
      
      console.log('✅ Configuración remota cargada');
    } catch (error) {
      console.warn('⚠️ No se pudo cargar config remota, usando local');
    }
  }
}

// App.js
async init() {
  // Cargar config remota antes de inicializar
  await ConfigLoader.loadRemoteConfig();
  
  // Continuar con inicialización normal
  // ...
}
```

---

## 🔧 Debugging

### Ver configuración completa:
```javascript
import config from './config/app-config.js';

console.log('📝 Configuración completa:', config);
console.table(config.websocket);
console.table(config.deviceStates);
console.table(config.commands);
```

### Validar configuración:
```javascript
// ConfigValidator.js
class ConfigValidator {
  static validate() {
    const errors = [];
    
    // Validar WebSocket URL
    if (!config.websocket.url) {
      errors.push('❌ websocket.url no definido');
    }
    
    // Validar reconnectDelays
    if (!Array.isArray(config.websocket.reconnectDelays)) {
      errors.push('❌ reconnectDelays debe ser array');
    }
    
    // Validar device states
    const requiredStates = ['online', 'offline', 'activated', 'noserver'];
    requiredStates.forEach(state => {
      if (!config.deviceStates[state]) {
        errors.push(`❌ deviceStates.${state} no definido`);
      }
    });
    
    // Validar commands
    Object.entries(config.commands).forEach(([cmd, cmdConfig]) => {
      if (!cmdConfig.label || !cmdConfig.successMessage) {
        errors.push(`❌ commands.${cmd} incompleto`);
      }
    });
    
    if (errors.length > 0) {
      console.error('⚠️ Errores de configuración:', errors);
      return false;
    }
    
    console.log('✅ Configuración válida');
    return true;
  }
}

// Validar al iniciar
ConfigValidator.validate();
```

---

## 📚 Referencias

### Patrones implementados:
- **Configuration Object Pattern:** Objeto con configuración centralizada
- **Constants Pattern:** Valores inmutables exportados
- **Environment-aware Pattern:** Auto-detección de entorno

---

## 🎯 Roadmap

### Mejoras futuras:
- [ ] **Schema validation**: JSON Schema para validar config
- [ ] **Type definitions**: TypeScript definitions (.d.ts)
- [ ] **Config profiles**: dev.config.js, prod.config.js
- [ ] **Runtime updates**: Actualizar config sin recargar página
- [ ] **Config UI**: Panel admin para editar config

---

## 📝 Changelog

### v0.2-beta (Actual)
- ✅ Configuración centralizada completa
- ✅ Auto-detect de host para WebSocket
- ✅ Backoff exponencial configurable
- ✅ Device states con animaciones
- ✅ Commands extensibles
- ✅ UI completamente configurable
- ✅ Debug flags para desarrollo/producción
- ✅ JSDoc documentation

---

**Anterior:** [App.md](../04-app/App.md) - Aplicación principal  
**Siguiente:** [README.md](../../README.md) - Documentación general

**Ver también:**
- [WebSocketService.md](../02-servicios/WebSocketService.md) - Uso de config.websocket
- [Toast.md](../03-components/ui/Toast.md) - Uso de config.notifications
- [DeviceCard.md](../03-components/DeviceCard.md) - Uso de config.deviceStates