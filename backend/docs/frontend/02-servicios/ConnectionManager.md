# ConnectionManager - Gestión de Conexión WebSocket

**Versión:** v0.2-beta  
**Archivo:** `js/services/websocket/ConnectionManager.js`  
**Patrón:** Singleton + Retry Pattern (Exponential Backoff)  
**Dependencias:** `EventBus.js`, `app-config.js`

---

## 📋 Descripción

ConnectionManager es el **gestor del ciclo de vida de la conexión WebSocket**. Maneja el handshake automático, keep-alive (ping/pong) y reconexión automática con backoff exponencial cuando se pierde la conexión.

### Características principales:
- ✅ **Handshake automático**: Envía handshake al conectar
- ✅ **Keep-alive**: Ping cada 30s para mantener conexión viva
- ✅ **Reconexión automática**: Retry con exponential backoff
- ✅ **Backoff exponencial**: Delays crecientes (1s, 2s, 4s, 8s, 16s, 30s max)
- ✅ **Max attempts**: Límite configurable de reintentos
- ✅ **Manual control**: Pausar/reanudar reconexión
- ✅ **Event-driven**: Emite eventos de progreso
- ✅ **Singleton**: Una única instancia global

---

## 🏗️ Arquitectura

```javascript
ConnectionManager (Singleton)
  ├── webSocketService: WebSocketService (inyectado)
  ├── pingInterval: number|null (setInterval ID)
  ├── reconnectTimeout: number|null (setTimeout ID)
  ├── reconnectAttempts: number (contador)
  ├── maxReconnectAttempts: number (del config)
  ├── shouldReconnect: boolean (flag manual)
  └── Métodos públicos (8)
```

### Configuración (app-config.js):
```javascript
export default {
  websocket: {
    pingInterval: 30000,           // 30s entre pings
    maxReconnectAttempts: 5,       // Máximo de intentos
    reconnectDelays: {
      min: 1000,                   // 1s delay inicial
      max: 30000                   // 30s delay máximo
    }
  }
};
```

---

## 📦 API Pública

### `setWebSocketService(service)`
Inyecta la instancia de WebSocketService (llamado internamente).

**Parámetros:**
- `service` (Object): Instancia de WebSocketService

**Retorna:** `void`

**Uso interno:**
```javascript
// En WebSocketService.js
ConnectionManager.setWebSocketService(instance);
```

**⚠️ Nota:** No llamar manualmente, se ejecuta automáticamente al importar módulos.

---

### `handleOpen(event)`
Maneja el evento de conexión establecida (llamado por WebSocketService).

**Parámetros:**
- `event` (Event): Evento onopen del WebSocket

**Retorna:** `void`

**Flujo interno:**
```javascript
handleOpen(event)
  ├─> reconnectAttempts = 0        // Reset contador
  ├─> shouldReconnect = true       // Habilitar reconexión
  ├─> sendHandshake()              // Enviar handshake automático
  └─> startPingInterval()          // Iniciar keep-alive
```

**Handshake enviado:**
```javascript
{
  type: 'handshake',
  clientId: 'web-client-1729701234567',
  timestamp: '2025-10-23T14:30:00.000Z',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  data: {
    version: '1.0',
    platform: 'web'
  }
}
```

**Console output:**
```
[ConnectionManager] ✅ Conectado - Enviando handshake
[ConnectionManager] 🔄 Keep-alive iniciado (ping cada 30s)
```

---

### `handleClose(event)`
Maneja el evento de conexión cerrada (llamado por WebSocketService).

**Parámetros:**
- `event` (CloseEvent): Evento onclose del WebSocket

**Retorna:** `void`

**Comportamiento:**
```javascript
handleClose(event)
  ├─> stopPingInterval()           // Detener keep-alive
  ├─> if (code === 1000)           // Cierre limpio
  │    └─> No reconectar (manual)
  └─> else
       └─> scheduleReconnect()     // Iniciar reconexión
```

**Códigos de cierre:**
- **1000**: Normal Closure → No reconecta (cierre manual)
- **1001-1015**: Error → Reconecta automáticamente
- **1006**: Abnormal Closure → Reconecta (pérdida de red)

**Console output:**
```
[ConnectionManager] ⚠️ Conexión cerrada (code: 1006)
[ConnectionManager] 🔄 Programando reconexión (intento 1/5 en 1s)
```

---

### `stopReconnecting()`
Detiene el proceso de reconexión automática.

**Parámetros:** Ninguno  
**Retorna:** `void`

**Comportamiento:**
1. Cancela timeout de reconexión pendiente
2. Marca `shouldReconnect = false`
3. Resetea contador de intentos

**Ejemplo:**
```javascript
import ConnectionManager from './services/websocket/ConnectionManager.js';

// Usuario quiere desconectar manualmente
function disconnectManually() {
  ConnectionManager.stopReconnecting();
  WebSocketService.disconnect();
  Toast.info('Desconectado manualmente');
}
```

**Uso en pruebas:**
```javascript
// Evitar reconexión durante tests
beforeEach(() => {
  ConnectionManager.stopReconnecting();
});
```

---

### `enableReconnect()`
Habilita la reconexión automática (después de haberla pausado).

**Parámetros:** Ninguno  
**Retorna:** `void`

**Ejemplo:**
```javascript
// Reactivar reconexión después de pausa
ConnectionManager.enableReconnect();

// Si no está conectado, reconectar inmediatamente
if (!WebSocketService.isConnected()) {
  WebSocketService.connect();
}
```

---

### `reset()`
Resetea completamente el estado del ConnectionManager.

**Parámetros:** Ninguno  
**Retorna:** `void`

**Comportamiento:**
1. Para ping interval
2. Cancela reconexión pendiente
3. Resetea contadores
4. Habilita reconexión

**Ejemplo:**
```javascript
// Al destruir la aplicación
App.destroy = function() {
  ConnectionManager.reset();
  WebSocketService.disconnect();
  StateManager.reset();
  EventBus.clear();
};
```

**Uso en tests:**
```javascript
afterEach(() => {
  ConnectionManager.reset();
});
```

---

### `getReconnectStatus()`
Obtiene el estado actual de reconexión (debugging/monitoring).

**Parámetros:** Ninguno  
**Retorna:** `Object` - Status object

**Estructura del retorno:**
```javascript
{
  isReconnecting: boolean,       // Si hay reconexión pendiente
  attempts: number,              // Intentos realizados
  maxAttempts: number,           // Máximo configurado
  shouldReconnect: boolean,      // Flag de habilitación
  nextRetryIn: number|null       // ms hasta próximo intento (si aplica)
}
```

**Ejemplo:**
```javascript
const status = ConnectionManager.getReconnectStatus();

console.log('Estado reconexión:', {
  'Reconectando': status.isReconnecting ? '🔄' : '⏸️',
  'Intentos': `${status.attempts}/${status.maxAttempts}`,
  'Habilitado': status.shouldReconnect ? '✅' : '❌'
});

if (status.nextRetryIn) {
  console.log(`Próximo intento en ${status.nextRetryIn}ms`);
}
```

**Uso en UI:**
```javascript
// Mostrar estado de reconexión en header
function updateReconnectBadge() {
  const status = ConnectionManager.getReconnectStatus();
  const badge = document.querySelector('#reconnect-badge');
  
  if (status.isReconnecting) {
    badge.textContent = `Reconectando ${status.attempts}/${status.maxAttempts}`;
    badge.className = 'badge-warning';
  } else {
    badge.textContent = '';
  }
}

// Actualizar cada segundo
setInterval(updateReconnectBadge, 1000);
```

---

## 🔧 Métodos Privados

### `sendHandshake()`
Envía el mensaje de handshake inicial al backend.

**Payload enviado:**
```javascript
{
  type: 'handshake',
  clientId: string,        // 'web-client-{timestamp}'
  timestamp: string,       // ISO 8601
  userAgent: string,       // navigator.userAgent
  data: {
    version: '1.0',
    platform: 'web'
  }
}
```

**Ejemplo de clientId generado:**
```
web-client-1729701234567
```

**Backend responde con:**
```javascript
{
  type: 'handshake_response',
  devices: [...],
  mqttConnected: true,
  serverTime: '2025-10-23T14:30:01.000Z',
  clientId: 'web-client-1729701234567'
}
```

---

### `startPingInterval()`
Inicia el envío periódico de pings (keep-alive).

**Comportamiento:**
```javascript
startPingInterval()
  ├─> Para interval previo (si existe)
  └─> setInterval(() => sendPing(), 30000)
```

**Ping enviado:**
```javascript
{
  type: 'ping',
  timestamp: '2025-10-23T14:30:00.000Z'
}
```

**Backend responde:**
```javascript
{
  type: 'pong',
  timestamp: '2025-10-23T14:30:00.000Z',
  serverTime: '2025-10-23T14:30:00.100Z'
}
```

**Propósito:**
- Mantener conexión TCP viva
- Detectar conexiones zombie
- Evitar timeouts de proxies/firewalls

---

### `stopPingInterval()`
Detiene el envío de pings.

**Llamado en:**
- `handleClose()` - Conexión cerrada
- `reset()` - Reset completo

---

### `sendPing()`
Envía un único ping al servidor.

**Validación:**
- Solo envía si WebSocketService está conectado
- Si no está conectado, muestra warning

---

### `scheduleReconnect()`
Programa el próximo intento de reconexión con backoff exponencial.

**Algoritmo de backoff:**
```javascript
// Fórmula: min(minDelay * 2^(attempts - 1), maxDelay)
const delay = Math.min(
  config.reconnectDelays.min * Math.pow(2, this.reconnectAttempts - 1),
  config.reconnectDelays.max
);
```

**Ejemplos de delays:**
```
Intento 1: min(1000 * 2^0, 30000) = 1s
Intento 2: min(1000 * 2^1, 30000) = 2s
Intento 3: min(1000 * 2^2, 30000) = 4s
Intento 4: min(1000 * 2^3, 30000) = 8s
Intento 5: min(1000 * 2^4, 30000) = 16s
Intento 6: min(1000 * 2^5, 30000) = 30s (capped)
```

**Flujo:**
```javascript
scheduleReconnect()
  ├─> if (attempts >= maxAttempts)
  │    ├─> EventBus.emit('connection:failed')
  │    └─> return
  │
  ├─> attempts++
  ├─> calcular delay (exponential backoff)
  ├─> EventBus.emit('connection:reconnecting', {attempt, delay, maxAttempts})
  └─> setTimeout(() => reconnect(), delay)
```

**Console output:**
```
[ConnectionManager] 🔄 Intento 1/5 - Reconectando en 1000ms
[ConnectionManager] 🔄 Intento 2/5 - Reconectando en 2000ms
[ConnectionManager] 🔄 Intento 3/5 - Reconectando en 4000ms
[ConnectionManager] 🔄 Intento 4/5 - Reconectando en 8000ms
[ConnectionManager] 🔄 Intento 5/5 - Reconectando en 16000ms
[ConnectionManager] ❌ Reconexión fallida después de 5 intentos
```

---

### `reconnect()`
Ejecuta un intento de reconexión.

**Comportamiento:**
```javascript
async reconnect()
  ├─> if (!shouldReconnect)
  │    └─> return (cancelado manualmente)
  │
  ├─> try
  │    └─> await WebSocketService.connect()
  │         ↓
  │    [Si éxito: handleOpen resetea attempts]
  │
  └─> catch
       ├─> console.error
       └─> scheduleReconnect() (próximo intento)
```

---

## 🔥 Eventos Emitidos

### `connection:reconnecting`
Se emite al iniciar cada intento de reconexión.

**Payload:**
```javascript
{
  attempt: number,        // Intento actual (1-based)
  delay: number,          // ms hasta este intento
  maxAttempts: number     // Límite configurado
}
```

**Emitido por:** `scheduleReconnect()`

**Listeners:**
```javascript
// App.js
EventBus.on('connection:reconnecting', ({ attempt, maxAttempts }) => {
  Toast.info(`Reconectando (${attempt}/${maxAttempts})...`);
});

// UI - Progress bar
EventBus.on('connection:reconnecting', ({ attempt, maxAttempts }) => {
  const progress = (attempt / maxAttempts) * 100;
  document.querySelector('#reconnect-progress').style.width = `${progress}%`;
});
```

---

### `connection:failed`
Se emite cuando se alcanza el máximo de intentos sin éxito.

**Payload:**
```javascript
{
  attempts: number        // Total de intentos realizados
}
```

**Emitido por:** `scheduleReconnect()`

**Listeners:**
```javascript
// App.js
EventBus.on('connection:failed', ({ attempts }) => {
  Toast.error(`No se pudo reconectar después de ${attempts} intentos`);
  
  // Mostrar botón de reconexión manual
  document.querySelector('#manual-reconnect-btn').style.display = 'block';
});
```

---

## 📊 Flujo Completo: Conexión → Pérdida → Reconexión

```
[1] Conexión inicial
WebSocketService.connect()
  ↓
ws.onopen
  ↓
ConnectionManager.handleOpen()
  ├─> reconnectAttempts = 0
  ├─> shouldReconnect = true
  ├─> sendHandshake()
  │    └─> Backend responde con devices
  └─> startPingInterval()
       └─> setInterval(sendPing, 30000)

[2] Keep-alive en progreso
Cada 30s:
  sendPing() → { type: 'ping', timestamp: ISO }
  Backend responde → { type: 'pong', ... }

[3] Pérdida de conexión (ej: servidor caído)
ws.onclose (code: 1006)
  ↓
ConnectionManager.handleClose()
  ├─> stopPingInterval()
  └─> scheduleReconnect()
       ├─> attempts = 1
       ├─> delay = 1s
       ├─> EventBus.emit('connection:reconnecting', {attempt: 1, delay: 1000, maxAttempts: 5})
       │    └─> App → Toast.info('Reconectando (1/5)...')
       └─> setTimeout(() => reconnect(), 1000)

[4] Intento 1 (después de 1s)
reconnect()
  ↓
WebSocketService.connect()
  ↓
[Si falla: ws.onclose]
  ↓
scheduleReconnect()
  ├─> attempts = 2
  ├─> delay = 2s
  ├─> EventBus.emit('connection:reconnecting', {attempt: 2, delay: 2000, maxAttempts: 5})
  └─> setTimeout(() => reconnect(), 2000)

[5] Intento 2 (después de 2s adicionales)
[Similar a Intento 1, delay = 4s]

[6] Intento 3 (después de 4s adicionales)
[delay = 8s]

[7] Intento 4 (después de 8s adicionales)
[delay = 16s]

[8] Intento 5 (después de 16s adicionales)
reconnect()
  ↓
[Si falla de nuevo]
  ↓
scheduleReconnect()
  ├─> attempts = 5 >= maxAttempts (5)
  ├─> EventBus.emit('connection:failed', {attempts: 5})
  │    └─> App → Toast.error('No se pudo reconectar después de 5 intentos')
  └─> return (no más intentos)

[9] Reconexión manual (usuario hace clic)
ConnectionManager.reset()
  ├─> attempts = 0
  └─> shouldReconnect = true
WebSocketService.connect()
  ↓
[Si éxito: vuelve a [1]]
```

---

## 🧪 Testing

### Test: Handshake automático
```javascript
import ConnectionManager from './services/websocket/ConnectionManager.js';
import WebSocketService from './services/websocket/WebSocketService.js';
import EventBus from './core/EventBus.js';

let handshakeSent = false;

// Mock de send
const originalSend = WebSocketService.send;
WebSocketService.send = (msg) => {
  if (msg.type === 'handshake') {
    handshakeSent = true;
  }
  return true;
};

// Conectar
await WebSocketService.connect();

// Esperar onopen
await new Promise(resolve => {
  EventBus.on('websocket:connected', resolve);
});

console.assert(handshakeSent === true, 'Debe enviar handshake');

// Restore
WebSocketService.send = originalSend;
```

---

### Test: Keep-alive iniciado
```javascript
let pingCount = 0;

WebSocketService.send = (msg) => {
  if (msg.type === 'ping') pingCount++;
  return true;
};

await WebSocketService.connect();

// Esperar 65 segundos (2 pings)
await new Promise(resolve => setTimeout(resolve, 65000));

console.assert(pingCount >= 2, 'Debe enviar al menos 2 pings');
```

---

### Test: Reconexión con backoff
```javascript
let reconnectEvents = [];

EventBus.on('connection:reconnecting', (data) => {
  reconnectEvents.push(data);
});

// Simular cierre abrupto
WebSocketService.ws.close(1006);

// Esperar 5 intentos (1s + 2s + 4s + 8s + 16s = 31s total)
await new Promise(resolve => setTimeout(resolve, 32000));

console.assert(reconnectEvents.length === 5, 'Debe intentar 5 veces');
console.assert(reconnectEvents[0].delay === 1000, 'Delay 1: 1s');
console.assert(reconnectEvents[1].delay === 2000, 'Delay 2: 2s');
console.assert(reconnectEvents[4].delay === 16000, 'Delay 5: 16s');
```

---

### Test: stopReconnecting cancela intentos
```javascript
// Simular cierre
WebSocketService.ws.close(1006);

// Esperar que inicie reconexión
await new Promise(resolve => setTimeout(resolve, 500));

// Cancelar
ConnectionManager.stopReconnecting();

const status = ConnectionManager.getReconnectStatus();
console.assert(status.isReconnecting === false, 'No debe estar reconectando');
console.assert(status.attempts === 0, 'Attempts debe resetear');
```

---

## 📊 Casos de Uso Reales

### 1. Botón de reconexión manual
```javascript
// reconnect-button.js
import ConnectionManager from './services/websocket/ConnectionManager.js';
import WebSocketService from './services/websocket/WebSocketService.js';
import Toast from './components/ui/Toast.js';

async function manualReconnect() {
  Toast.info('Intentando reconectar...');
  
  // Reset estado
  ConnectionManager.reset();
  
  try {
    await WebSocketService.connect();
    Toast.success('Reconectado exitosamente');
  } catch (error) {
    Toast.error('Error al reconectar');
    console.error(error);
  }
}

// HTML
// <button id="manual-reconnect-btn" onclick="manualReconnect()">
//   Reconectar Manualmente
// </button>
```

---

### 2. Monitor de latencia (con pings)
```javascript
// latency-monitor.js
import EventBus from './core/EventBus.js';

class LatencyMonitor {
  constructor() {
    this.latencies = [];
    this.pingTimestamps = new Map();
    
    this.monitorPings();
  }
  
  monitorPings() {
    // Capturar timestamp de ping enviado
    const originalSendPing = ConnectionManager.sendPing.bind(ConnectionManager);
    ConnectionManager.sendPing = () => {
      const timestamp = new Date().toISOString();
      this.pingTimestamps.set(timestamp, Date.now());
      originalSendPing();
    };
    
    // Calcular latencia al recibir pong
    EventBus.on('message:pong', ({ timestamp }) => {
      const sent = this.pingTimestamps.get(timestamp);
      if (sent) {
        const latency = Date.now() - sent;
        this.latencies.push(latency);
        this.pingTimestamps.delete(timestamp);
        
        console.log(`Latencia: ${latency}ms`);
        this.updateUI(latency);
      }
    });
  }
  
  updateUI(latency) {
    const badge = document.querySelector('#latency-badge');
    badge.textContent = `${latency}ms`;
    
    if (latency < 100) {
      badge.className = 'badge-success';
    } else if (latency < 300) {
      badge.className = 'badge-warning';
    } else {
      badge.className = 'badge-error';
    }
  }
  
  getAverage() {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencies.length);
  }
}

const monitor = new LatencyMonitor();
window.getAverageLatency = () => monitor.getAverage();
```

---

### 3. Notificación progresiva de reconexión
```javascript
// reconnect-progress.js
import EventBus from './core/EventBus.js';
import Toast from './components/ui/Toast.js';

class ReconnectNotifier {
  constructor() {
    this.currentToast = null;
    this.setupListeners();
  }
  
  setupListeners() {
    EventBus.on('connection:reconnecting', ({ attempt, maxAttempts, delay }) => {
      // Cerrar toast previo
      if (this.currentToast) {
        this.currentToast.close();
      }
      
      // Mostrar progreso
      const secondsUntilNext = Math.round(delay / 1000);
      const message = `Reconectando (${attempt}/${maxAttempts})... próximo intento en ${secondsUntilNext}s`;
      
      this.currentToast = Toast.info(message, {
        duration: delay,
        closeable: false
      });
    });
    
    EventBus.on('websocket:connected', () => {
      if (this.currentToast) {
        this.currentToast.close();
        this.currentToast = null;
      }
    });
    
    EventBus.on('connection:failed', ({ attempts }) => {
      if (this.currentToast) {
        this.currentToast.close();
      }
      
      Toast.error(
        `No se pudo reconectar después de ${attempts} intentos. ` +
        `<button onclick="location.reload()">Recargar página</button>`,
        { duration: 0 }
      );
    });
  }
}

new ReconnectNotifier();
```

---

## ⚡ Performance

### Mediciones:
- **sendHandshake():** < 1ms
- **sendPing():** < 0.5ms
- **scheduleReconnect():** < 0.1ms
- **Overhead de ping interval:** Negligible

### Consumo de red:
- **Ping/pong:** ~100 bytes cada 30s
- **Handshake:** ~500 bytes (una vez al conectar)

---

## 🚨 Errores Comunes

### ❌ Reconexión infinita
```javascript
// Causa: maxReconnectAttempts muy alto
export default {
  websocket: {
    maxReconnectAttempts: 999  // ❌ MAL
  }
};

// Solución: Límite razonable
export default {
  websocket: {
    maxReconnectAttempts: 5  // ✅ BIEN
  }
};
```

---

### ❌ Ping interval no se detiene
```javascript
// Causa: No llamar stopPingInterval() al desconectar

// ✅ Solución: Siempre llamar en handleClose()
handleClose(event) {
  this.stopPingInterval();  // IMPORTANTE
  // ... resto del código
}
```

---

### ❌ Múltiples reconexiones simultáneas
```javascript
// Causa: No cancelar timeout previo

// ✅ Solución: Siempre limpiar en scheduleReconnect()
scheduleReconnect() {
  if (this.reconnectTimeout) {
    clearTimeout(this.reconnectTimeout);  // IMPORTANTE
  }
  // ... resto del código
}
```

---

## 🔧 Debugging

### Ver estado de reconexión:
```javascript
console.log(ConnectionManager.getReconnectStatus());
// {
//   isReconnecting: true,
//   attempts: 3,
//   maxAttempts: 5,
//   shouldReconnect: true,
//   nextRetryIn: 4000
// }
```

### Simular pérdida de conexión:
```javascript
// En consola del navegador
WebSocketService.ws.close(1006);  // Cierre anormal
```

### Forzar reconexión inmediata:
```javascript
ConnectionManager.reset();
WebSocketService.connect();
```

### Exponer en window:
```javascript
window.ConnectionManager = ConnectionManager;

// En consola:
ConnectionManager.getReconnectStatus()
ConnectionManager.stopReconnecting()
ConnectionManager.enableReconnect()
```

---

## 📚 Referencias

### Patrones implementados:
- **Retry Pattern:** Reintentos con backoff exponencial
- **Singleton Pattern:** Una única instancia
- **Observer Pattern:** Eventos de progreso
- **Strategy Pattern:** Delays configurables

### Algoritmos:
- **Exponential Backoff:** [AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- **Keep-alive:** [RFC 6455 Section 5.5.2](https://datatracker.ietf.org/doc/html/rfc6455#section-5.5.2)

---

## 🎯 Roadmap

### Mejoras futuras:
- [ ] Jitter en backoff (evitar thundering herd)
- [ ] Adaptive backoff (ajustar según latencia)
- [ ] Pong timeout detection (detectar conexión zombie)
- [ ] Backoff reset after success duration
- [ ] Circuit breaker pattern
- [ ] Metrics (reconnect rate, success rate)
- [ ] Health check antes de reconectar

---

## 📝 Changelog

### v0.2-beta (Actual)
- ✅ Handshake automático al conectar
- ✅ Keep-alive con ping/pong cada 30s
- ✅ Reconexión automática con backoff exponencial
- ✅ Máximo de intentos configurable
- ✅ Eventos de progreso
- ✅ Control manual (stop/enable)
- ✅ Status API para monitoring

---

**Anterior:** [MessageRouter.md](./MessageRouter.md) - Enrutador de mensajes  
**Siguiente:** [HandshakeHandler.md](./handlers/HandshakeHandler.md) - Handler de handshake

**Ver también:**
- [WebSocketService.md](./WebSocketService.md) - Cliente WebSocket
- [EventBus.md](../01-fundamentos/EventBus.md) - Sistema de eventos
- [app-config.md](../05-config/app-config.md) - Configuración