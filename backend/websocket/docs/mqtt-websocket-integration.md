# Integración MQTT → WebSocket - Sistema de Alarmas ESP32

Esta documentación describe la integración entre el módulo MQTT existente y el sistema WebSocket para broadcasting en tiempo real de eventos desde dispositivos ESP32 hacia clientes web.

---

## Arquitectura de Integración

### Flujo Principal de Eventos
```
ESP32 → MQTT Broker → Backend MQTT → WebSocket Manager → Clientes Web
```

### Componentes Involucrados
1. **MQTT Module** (`backend/mqtt/index.js`) - Receptor de eventos ESP32
2. **WebSocket Manager** (`backend/websocket/index.js`) - Orquestador WebSocket
3. **Notification Broadcaster** (`backend/websocket/services/notification-broadcaster.js`) - Broadcasting en tiempo real
4. **Device Handler** (`backend/websocket/handlers/device-handler.js`) - Procesamiento de comandos

### **🔄 Capa de Traducción MAC ↔ ID**
El sistema utiliza una capa de traducción para mantener compatibilidad:
- **MQTT:** Usa MACs como identificador (`EA8914`, `BB7A23`)
- **WebSocket:** Usa IDs limpios (`ESP32_001`, `ESP32_002`) 
- **Traducción:** `mac_to_id.json` mapea entre ambos formatos

---

## Eventos MQTT Soportados

### 1. Botón de Pánico Presionado
**Topic MQTT:** `NODO/{MAC}/ACK`

**Payload ESP32:**
```json
{
  "event": "button",
  "dsp": "EA8914",
  "str": "BOTON_PANICO", 
  "control": "CONTROL_01",
  "ntp": "OK",
  "timestamp": "2025-09-18T10:30:00Z"
}
```

**WebSocket Broadcasting:**
```json
{
  "type": "notification",
  "timestamp": "2025-09-18T10:30:00.000Z",
  "event": "button_pressed",
  "data": {
    "deviceId": "ESP32_001",
    "mac": "EA8914", 
    "deviceName": "Poste Entrada",
    "buttonName": "BOTON_PANICO",
    "buttonKey": "BOTON_PANICO",
    "alarmState": "activated",
    "controlName": "CONTROL_01",
    "ntpStatus": "OK"
  }
}
```

### 2. Heartbeat de Dispositivo
**Topic MQTT:** `NODO/{MAC}/ACK`

**Payload ESP32:**
```json
{
  "event": "hb",
  "dsp": "EA8914",
  "uptime": 3600,
  "freeMemory": 45000,
  "rssi": -45,
  "ntp": "OK"
}
```

**WebSocket Broadcasting:**
```json
{
  "type": "notification",
  "timestamp": "2025-09-18T10:30:00.000Z", 
  "event": "heartbeat",
  "data": {
    "deviceId": "ESP32_001",
    "mac": "EA8914",
    "deviceName": "Poste Entrada", 
    "uptime": 3600,
    "freeMemory": 45000,
    "rssi": -45,
    "ntpStatus": "OK"
  }
}
```

### 3. Reinicio de Dispositivo
**Topic MQTT:** `NODO/{MAC}/ACK`

**Payload ESP32:**
```json
{
  "event": "rst",
  "dsp": "EA8914",
  "reason": "power_on_reset",
  "ntp": "OK",
  "version": "1.2.3"
}
```

**WebSocket Broadcasting:**
```json
{
  "type": "notification",
  "timestamp": "2025-09-18T10:30:00.000Z",
  "event": "device_reset",
  "data": {
    "deviceId": "ESP32_001", 
    "mac": "EA8914",
    "deviceName": "Poste Entrada",
    "reason": "power_on_reset",
    "ntpStatus": "OK",
    "version": "1.2.3"
  }
}
```

---

## Implementación de la Integración

### 1. Punto de Integración en MQTT Module

**Ubicación:** `backend/mqtt/index.js`

**Modificación requerida:**
```javascript
// Importar WebSocket Manager
const { webSocketManager } = require('../websocket/index.js');

// En el handler de mensaje MQTT:
client.on('message', (topic, message) => {
  // ... procesamiento MQTT existente ...
  
  // Extraer MAC del topic: NODO/EA8914/ACK → EA8914
  const topicParts = topic.split('/');
  const deviceMac = topicParts[1];
  
  // Nuevo: Broadcasting a WebSocket
  if (webSocketManager.isInitialized) {
    webSocketManager.broadcastMqttEvent(topic, parsedMessage, deviceMac);
  }
});
```

### 2. Nuevo Método en WebSocket Manager

**Ubicación:** `backend/websocket/index.js`

**Método a agregar:**
```javascript
/**
 * Recibe eventos del módulo MQTT y los broadcast a clientes WebSocket
 * @param {String} topic - Topic MQTT 
 * @param {Object} message - Mensaje MQTT parseado  
 * @param {String} deviceMac - MAC del dispositivo
 */
broadcastMqttEvent(topic, message, deviceMac) {
  if (!this.notificationBroadcaster) return;
  
  this.notificationBroadcaster.processMqttEvent(topic, message, deviceMac);
}
```

### 3. Notification Broadcaster

**Responsabilidades:**
- Recibir eventos del WebSocket Manager
- Traducir MAC → ID usando `mac_to_id.json`
- Determinar tipo de evento basado en `message.event`
- Enriquecer datos del dispositivo
- Broadcasting a clientes conectados

### 4. Device Handler

**Responsabilidades:**
- Procesar comandos desde clientes WebSocket hacia dispositivos
- Traducir ID → MAC usando `mac_to_id.json` 
- Publicar comandos en topics MQTT apropiados
- Manejar respuestas de dispositivos

---

## Mapeo de Topics y Eventos MQTT

| Topic MQTT       | Event JSON | Evento WebSocket | Handler                 |
| ---------------- | ---------- | ---------------- | ----------------------- |
| `NODO/{MAC}/ACK` | `"button"` | `button_pressed` | NotificationBroadcaster |
| `NODO/{MAC}/ACK` | `"hb"`     | `heartbeat`      | NotificationBroadcaster |
| `NODO/{MAC}/ACK` | `"rst"`    | `device_reset`   | NotificationBroadcaster |
| `NODO/{MAC}/CMD` | -          | `device_command` | DeviceHandler           |

## Traducción MAC ↔ ID

### Archivo de Mapeo: `mac_to_id.json`
```json
{
  "EA8914": "ESP32_001",
  "BB7A23": "ESP32_002", 
  "CC9D45": "ESP32_003"
}
```

### Flujo de Traducción
```javascript
// MQTT → WebSocket (NotificationBroadcaster)
"EA8914" → buscar en mac_to_id.json → "ESP32_001"

// WebSocket → MQTT (DeviceHandler)  
"ESP32_001" → buscar inverso en mac_to_id.json → "EA8914"
```

---

## Comandos WebSocket → MQTT

### Ping a Dispositivo
**WebSocket Input:**
```json
{
  "type": "device_command",
  "deviceId": "ESP32_001",
  "command": "ping"
}
```

**Proceso de Traducción:**
1. DeviceHandler recibe comando con `deviceId: "ESP32_001"`
2. Traduce a MAC: `ESP32_001` → `EA8914`
3. Publica en topic: `NODO/EA8914/CMD`

**MQTT Output:** 
- **Topic:** `NODO/EA8914/CMD`
- **Payload:** `{"cmd": "ping", "timestamp": "..."}`

### Reproducir Audio
**WebSocket Input:**
```json
{
  "type": "device_command", 
  "deviceId": "ESP32_001",
  "command": "play_track",
  "data": {"trackId": 1}
}
```

**MQTT Output:**
- **Topic:** `NODO/EA8914/CMD` 
- **Payload:** `{"cmd": "play_track", "track": 1, "timestamp": "..."}`

### Comandos Soportados
| WebSocket Command | MQTT Payload                         | Descripción            |
| ----------------- | ------------------------------------ | ---------------------- |
| `ping`            | `{"cmd": "ping"}`                    | Verificar conectividad |
| `play_track`      | `{"cmd": "play_track", "track": N}`  | Reproducir pista N     |
| `stop_audio`      | `{"cmd": "stop_audio"}`              | Detener audio          |
| `set_volume`      | `{"cmd": "set_volume", "volume": N}` | Establecer volumen     |
| `get_status`      | `{"cmd": "status"}`                  | Solicitar estado       |
| `reboot`          | `{"cmd": "reboot"}`                  | Reiniciar dispositivo  |

---

## Flujo de Datos Completo

### Evento ESP32 → Cliente Web
1. **ESP32** presiona botón → publica en `NODO/EA8914/ACK` con `event: "button"`
2. **MQTT Module** recibe mensaje → procesa y actualiza JSON files
3. **MQTT Module** llama `webSocketManager.broadcastMqttEvent(topic, message, "EA8914")`
4. **NotificationBroadcaster** traduce `EA8914` → `ESP32_001` y procesa evento
5. **ClientManager** envía notificación → todos clientes WebSocket conectados
6. **Cliente Web** recibe notificación con `deviceId: "ESP32_001"` → actualiza UI

### Comando Cliente Web → ESP32  
1. **Cliente Web** envía comando WebSocket con `deviceId: "ESP32_001"`
2. **MessageRouter** dirige a **DeviceHandler**
3. **DeviceHandler** traduce `ESP32_001` → `EA8914` y publica en `NODO/EA8914/CMD`
4. **ESP32** recibe comando → ejecuta acción
5. **ESP32** publica ACK → `NODO/EA8914/ACK` con respuesta
6. **MQTT Module** procesa ACK → notifica a WebSocket
7. **Cliente Web** recibe confirmación traducida con `deviceId: "ESP32_001"`

---

## Configuración y Inicialización

### Orden de Inicialización
1. **MQTT Module** se conecta al broker
2. **WebSocket Manager** se inicializa con NotificationBroadcaster y DeviceHandler
3. **MessageRouter** configura DeviceHandler con cliente MQTT
4. **MQTT Module** registra callback hacia WebSocket
5. **Sistema listo** para bidirectional communication con traducción MAC↔ID

### Variables de Configuración
```javascript
// En websocket-config.js
MQTT_INTEGRATION: {
  enabled: true,
  eventTimeout: 5000,        // Timeout para eventos MQTT
  retryAttempts: 3,          // Reintentos para comandos
  broadcastDelay: 100,       // Delay antes de broadcast
  macToIdFile: 'mac_to_id.json'  // Archivo de mapeo
},

MESSAGE_TYPES: {
  DEVICE_COMMAND: 'device_command'
},

COMMAND_TIMEOUT: 10000  // Timeout para comandos a dispositivos
```

---

## Manejo de Errores

### Errores de Integración
- **MQTT desconectado:** WebSocket continúa funcionando, DeviceHandler rechaza comandos
- **WebSocket no inicializado:** MQTT continúa, eventos se pierden
- **Dispositivo offline:** Comandos fallan con timeout (10s)
- **MAC no encontrada:** Se usa MAC como ID, warning en logs
- **ID no encontrada:** Comando rechazado con error

### Logging y Debugging
```javascript
[MQTT→WS] Evento recibido: button desde MAC EA8914
[NotificationBroadcaster] Traduciendo EA8914 → ESP32_001
[WS] Broadcasting button_pressed a 3 clientes conectados  
[DeviceHandler] Comando ping para ESP32_001, traduciendo a EA8914
[DeviceHandler] Enviando comando MQTT: NODO/EA8914/CMD → {"cmd":"ping"}
[MQTT→WS] ACK recibido de EA8914: success
```

---

## Testing y Validación

### Test de Integración
1. **Simular evento MQTT** → verificar broadcasting WebSocket con traducción
2. **Enviar comando WebSocket** → verificar publicación MQTT con MAC correcto
3. **Desconectar MQTT** → verificar graceful degradation
4. **Múltiples clientes** → verificar broadcasting simultáneo
5. **Traducción MAC↔ID** → verificar mapeos correctos
6. **Dispositivo no mapeado** → verificar fallback behavior

### Métricas de Performance
- **Latencia MQTT→WebSocket:** < 100ms (incluyendo traducción)
- **Latencia WebSocket→MQTT:** < 50ms (incluyendo traducción)
- **Throughput:** > 100 eventos/segundo
- **Memory usage:** < 50MB adicionales
- **Translation cache hit rate:** > 95%

### Casos de Prueba
```javascript
// 1. Evento ESP32 → Cliente
Topic: "NODO/EA8914/ACK"
Payload: {"event": "button", "dsp": "EA8914", "str": "BOTON_PANICO"}
Expected WebSocket: {"event": "button_pressed", "data": {"deviceId": "ESP32_001"}}

// 2. Comando Cliente → ESP32
WebSocket: {"type": "device_command", "deviceId": "ESP32_001", "command": "ping"}
Expected MQTT Topic: "NODO/EA8914/CMD"
Expected MQTT Payload: {"cmd": "ping"}
```

---

**Versión:** 1.1  
**Fecha:** 18 de septiembre, 2025  
**Autor:** Sistema WebSocket Modular  
**Cambios:** Integración real con traducción MAC↔ID, eventos por JSON field, topics corregidos