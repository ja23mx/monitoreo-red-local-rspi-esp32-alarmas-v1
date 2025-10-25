# Formato de Mensajes WebSocket - API Documentation

Esta documentación describe los formatos de mensaje para la comunicación WebSocket entre el cliente (navegador) y el servidor backend del sistema de gestión de alarmas.

---

## Estructura Base de Mensajes

Todos los mensajes WebSocket deben seguir esta estructura básica:

```json
{
  "type": "string",           // Tipo de mensaje (obligatorio)
  "timestamp": "ISO8601",     // Timestamp del mensaje (obligatorio)
  "data": {}                  // Datos específicos del mensaje (opcional)
}
```

### Límites y Restricciones
- **Tamaño máximo**: 8KB por mensaje
- **Formato**: JSON válido
- **Encoding**: UTF-8

---

## Tipos de Mensaje

### 1. Handshake (Cliente → Servidor)
**Propósito:** Inicializar conexión y obtener estado actual del sistema

```json
{
  "type": "handshake",
  "timestamp": "2025-09-18T10:30:00.000Z",
  "clientId": "web-client-001",
  "userAgent": "Mozilla/5.0...",
  "data": {
    "version": "1.0"
  }
}
```

**Respuesta del Servidor:**
```json
{
  "type": "handshake_response",
  "timestamp": "2025-09-18T10:30:00.100Z",
  "success": true,
  "data": {
    "devices": [
      {
        "id": "ESP32_001",
        "mac": "AA:BB:CC:DD:EE:FF",
        "status": "online",
        "lastSeen": "2025-09-18T10:29:45.000Z",
        "alarmActive": false,
        "location":"Parque Central",
        "name":"Poste Parque"
      }
    ],
    "serverTime": "2025-09-18T10:30:00.100Z",
    "connectedClients":1,
    "serverStatus":"online",
    "serverUptime":86.843877991,
    "serverVersion":"1.0.0",
    "mqttStatus":"connected",
    "lastUpdate":"2025-10-08T02:19:05.214Z"
  }
}
```

### 2. Device Command (Cliente → Servidor)
**Propósito:** Enviar comando a un dispositivo ESP32

```json
{
  "type": "device_command",
  "timestamp": "2025-09-18T10:31:00.000Z",
  "deviceId": "ESP32_001",
  "command": "ping",
  "data": {
    "parameters": {}
  }
}
```

### 3. Notification (Servidor → Cliente)
**Propósito:** Notificar eventos en tiempo real desde dispositivos

```json
{
  "type": "notification",
  "timestamp": "2025-09-18T10:32:00.000Z",
  "event": "button_pressed",
  "data": {
    "deviceId": "ESP32_001",
    "mac": "AA:BB:CC:DD:EE:FF",
    "buttonName": "BOTON_PANICO",
    "alarmState": "activated"
  }
}
```

### 4. System Info (Bidireccional)
**Propósito:** Información del sistema o solicitar estado

```json
{
  "type": "system_info",
  "timestamp": "2025-09-18T10:33:00.000Z",
  "request": "device_status",
  "data": {
    "deviceId": "ESP32_001"
  }
}
```

### 5. Ping/Pong (Bidireccional)
**Propósito:** Mantener conexión activa (heartbeat)

```json
{
  "type": "ping",
  "timestamp": "2025-09-18T10:34:00.000Z"
}
```

---

## Eventos de Dispositivos (Notifications)

### Eventos Soportados
- `button_pressed` - Botón de pánico presionado
- `heartbeat` - Latido del dispositivo
- `device_reset` - Dispositivo reiniciado
- `alarm_activated` - Alarma activada
- `alarm_deactivated` - Alarma desactivada
- `device_online` - Dispositivo conectado
- `device_offline` - Dispositivo desconectado

### Comandos de Dispositivo Soportados
- `ping` - Verificar conectividad
- `get_status` - Obtener información del dispositivo
- `play_track` - Reproducir audio
- `set_config` - Configurar parámetros

---

## Respuestas de Error

```json
{
  "type": "error",
  "timestamp": "2025-09-18T10:35:00.000Z",
  "success": false,
  "error": {
    "code": 1001,
    "message": "Formato JSON inválido",
    "details": "Carácter inesperado en línea 5"
  }
}
```

### Códigos de Error
- `1001` - Formato JSON inválido
- `1002` - Campos obligatorios faltantes
- `1003` - Tipo de mensaje no válido
- `1004` - Falló la autenticación
- `1005` - Dispositivo no encontrado
- `1006` - Error interno del servidor
- `1007` - Límite de conexiones alcanzado
- `1008` - Mensaje demasiado grande

---

## Ejemplos de Flujo Completo

### Conexión e Inicialización
1. Cliente se conecta al WebSocket
2. Cliente envía `handshake`
3. Servidor responde con estado actual de dispositivos
4. Cliente queda listo para recibir notificaciones

### Evento de Botón de Pánico
1. ESP32 presiona botón → MQTT
2. Servidor recibe evento MQTT
3. Servidor envía `notification` a todos los clientes WebSocket
4. Clientes actualizan UI en tiempo real

---

### Ejemplo de Device Reset
```json
{
  "type": "notification",
  "timestamp": "2025-10-02T10:32:00.000Z",
  "event": "device_reset",
  "data": {
    "deviceId": "ESP32_001",
    "mac": "EA8914",
    "deviceName": "Poste Entrada",
    "version": "1.2.3",
    "reason": "power_on_reset"
  }
}
```

### Ejemplo de Play Finished
```json
{
  "type": "notification",
  "timestamp": "2025-10-02T10:32:00.000Z",
  "event": "play_finished",
  "data": {
    "deviceId": "ESP32_001",
    "mac": "EA8914", 
    "deviceName": "Poste Entrada",
    "track": 1,
    "ntpStatus": "OK"
  }
}
```

---

**Versión:** 0.1  
**Última actualización:** 18 de septiembre, 2025