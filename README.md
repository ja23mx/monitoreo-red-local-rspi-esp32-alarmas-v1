# Backend MQTT + WebSocket para Gestión de Alarmas

Este proyecto implementa el backend MQTT y WebSocket para la comunicación entre el servidor central, dispositivos ESP32 y clientes web en el sistema de gestión de alarmas.  
Incluye integración bidireccional MQTT ↔ WebSocket para tiempo real.

## Estructura de Carpetas

```
/red-local-iot
  /backend
    /mqtt
      index.js                 # Lógica de conexión y suscripción MQTT
      /config
        mqtt-config.js         # Configuración del broker MQTT
        topics-config.js       # Topics de suscripción
      /services
        message-processor.js   # Procesamiento y validación de eventos entrantes + integración WebSocket
        mqtt-client.js         # Cliente MQTT (conexión y publicación)
        device-monitor.js      # Monitoreo de dispositivos
      /utils
        message-validators.js  # Validadores de formato y estructura de mensajes
    /websocket                 # ✅ AGREGAR MÓDULO WEBSOCKET
      index.js                 # WebSocket Manager principal
      /config
        websocket-config.js    # Configuración WebSocket
      /handlers
        connection-handler.js  # Manejo de conexiones WebSocket
        device-handler.js      # Comandos WebSocket → MQTT
        system-handler.js      # Comandos del sistema
      /services
        client-manager.js      # Gestión de clientes WebSocket
        message-router.js      # Enrutamiento de mensajes
        notification-broadcaster.js # Eventos MQTT → WebSocket
      /utils
        message-validator.js   # Validación de mensajes WebSocket
        response-builder.js    # Constructor de respuestas
      /docs                    # Documentación completa del sistema
    /data
      alarmas.json             # Datos de alarmas
      registro_evento.json     # Historial de eventos
      mac_to_id.json           # Cruce MAC <-> ID
      device_status.json       # Estado de dispositivos
    server.js                  # Inicialización principal y servidor Express
```

## Arquitectura de Integración

### **Flujo Bidireccional:**
```
ESP32 ↔ MQTT ↔ Backend ↔ WebSocket ↔ Cliente Web
```

### **Procesamiento de Eventos:**
- **MQTT → WebSocket:** Eventos ESP32 se difunden automáticamente a clientes web
- **WebSocket → MQTT:** Comandos de clientes web se traducen a comandos MQTT

## Topics MQTT

- **Comandos del servidor al ESP32:**  
  `NODO/<MAC>/CMD`
- **Eventos y respuestas del ESP32 al servidor:**  
  `NODO/<MAC>/ACK`

Donde `<MAC>` es la dirección MAC del ESP32.

## Procesamiento de Mensajes

### **MQTT (message-processor.js):**
- Se suscribe a `NODO/+/ACK` para recibir eventos de todos los nodos
- Valida y sanitiza mensajes
- **Envía respuestas ACK específicas** (ack_ans_rst, ack_ans_button, etc.)
- **Integra con WebSocket** para broadcasting automático

### **WebSocket (notification-broadcaster.js):**
- Recibe eventos desde MQTT
- Traduce MAC → ID limpio
- Broadcasting a todos los clientes conectados

## Ejemplo de Flujo Completo

### **1. Evento ESP32 → Cliente Web:**
```json
// ESP32 envía evento
Topic: NODO/EA8914/ACK
{
  "dsp": "EA8914",
  "event": "button", 
  "time": "2025-10-02T01:10:10Z"
}

// Backend responde ACK específico
Topic: NODO/EA8914/CMD  
{
  "dsp": "EA8914",
  "event": "ack_ans_button",
  "time": "2025-10-02T01:10:11Z"
}

// Backend broadcasting WebSocket
{
  "type": "notification",
  "event": "button_pressed",
  "deviceId": "ESP32_001",
  "deviceName": "Poste Entrada"
}
```

### **2. Comando Cliente Web → ESP32:**
```json
// Cliente envía comando WebSocket
{
  "type": "device_command",
  "deviceId": "ESP32_001", 
  "command": "play_track",
  "data": {"parameters": {"track": 1}}
}

// Backend traduce y publica MQTT
Topic: NODO/EA8914/CMD
{
  "dsp": "EA8914",
  "event": "play_track",
  "track": 1,
  "time": "2025-10-02T01:10:12Z"
}
```

## Gestión y Persistencia de Datos

- **alarmas.json:** Información principal de cada dispositivo, indexado por ID
- **registro_evento.json:** Historial de eventos por dispositivo, agrupados por ID  
- **mac_to_id.json:** Tabla de cruce que relaciona la MAC del dispositivo con su ID interno
- **device_status.json:** Estado actual de dispositivos
- **db-repository.js:** Métodos para lectura, escritura, actualización y limpieza de datos

## Documentación Adicional

### **MQTT:**
- `backend-mqtt-commands-guide.md` - Guía completa de comandos MQTT
- `ARQUITECTURA.md` - Arquitectura del sistema completo

### **WebSocket:**
- `websocket/docs/mqtt-websocket-integration.md` - Integración MQTT ↔ WebSocket
- `websocket/docs/websocket-api-reference.md` - API WebSocket completa
- `websocket/docs/websocket-mqtt-integration-test-results.md` - Resultados de testing

## Requisitos

- Node.js
- Acceso a un broker MQTT (puede ser local o remoto)
- WebSocket support para clientes web

## Ejecución

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Configura el broker en `config/mqtt-config.js`
3. Configura WebSocket en `websocket/config/websocket-config.js`
4. Inicia el servidor:
   ```bash
   node server.js
   ```

## Testing

El sistema ha sido completamente probado:
- ✅ 6 comandos WebSocket → MQTT funcionando
- ✅ 4 eventos MQTT → WebSocket broadcasting
- ✅ Integración bidireccional validada
- ✅ Performance < 100ms confirmado

Ver: `websocket/docs/websocket-mqtt-integration-test-results.md`

## Licencia

MIT

---

**Versión:** 1.0  
**Última actualización:** 2 de octubre, 2025  
**Estado:** Sistema MQTT + WebSocket completamente funcional