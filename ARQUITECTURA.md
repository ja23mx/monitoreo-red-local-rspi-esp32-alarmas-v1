# Arquitectura Actual del Sistema - Backend MQTT + WebSocket de Alarmas

Este documento describe la arquitectura actual del sistema de backend MQTT y WebSocket para la gestión de alarmas, así como el diagrama de flujo básico de interacción entre los componentes principales.

---

## Componentes Principales

- **ESP32 (Nodo de alarma):**  
  Dispositivo IoT que envía eventos (botón, heartbeat, reset, etc.) al servidor mediante MQTT y recibe comandos.

- **Broker MQTT:**  
  Intermediario que gestiona los mensajes entre nodos ESP32 y el backend.  
  Ejemplo: Mosquitto.

- **Servidor Backend (Node.js):**  
  - **Módulo MQTT:** Se conecta al broker MQTT, suscribe eventos y procesa mensajes
  - **Módulo WebSocket:** Maneja conexiones de clientes web en tiempo real
  - **Integración MQTT ↔ WebSocket:** Broadcasting automático de eventos y traducción de comandos
  - **Capa de traducción MAC ↔ ID:** Compatibilidad entre formatos MQTT y WebSocket
  - Valida y sanitiza los mensajes recibidos
  - Responde a los nodos con comandos y ACK, incluyendo detalles de error si la validación falla
  - Actualiza la información de última conexión y almacena eventos en archivos JSON
  - Permite borrar eventos antiguos por MAC o de todos los dispositivos

- **Cliente Web:**
  - Conexión WebSocket para tiempo real
  - Envío de comandos a dispositivos ESP32
  - Recepción de notificaciones de eventos

- **Archivos de datos (JSON):**
  - `alarmas.json`: Información principal de cada dispositivo, indexado por ID
  - `registro_evento.json`: Historial de eventos por dispositivo, agrupados por ID
  - `mac_to_id.json`: Tabla de cruce que relaciona la MAC del dispositivo con su ID interno
  - `device_status.json`: Estado actual de dispositivos

---

## Estructura Completa de Carpetas

```
/red-local-iot
  /backend
    /mqtt
      index.js                 # Lógica de conexión y suscripción MQTT
      /config
        mqtt-config.js         # Configuración del broker MQTT
        topics-config.js       # Topics de suscripción
      /services
        message-processor.js   # Procesamiento y validación de eventos entrantes
        mqtt-client.js         # Cliente MQTT (conexión y publicación)
        device-monitor.js      # Monitoreo de dispositivos
      /utils
        message-validators.js  # Validadores de formato y estructura de mensajes
      ARQUITECTURA.md          # Este documento
      README.md                # Documentación del módulo MQTT
      backend-mqtt-commands-guide.md # Guía de comandos MQTT
    /websocket
      index.js                 # WebSocket Manager principal
      /config
        websocket-config.js    # Configuración WebSocket
      /handlers
        connection-handler.js  # Manejo de conexiones WebSocket
        device-handler.js      # Manejo de comandos de dispositivos
        system-handler.js      # Manejo de comandos del sistema
      /services
        client-manager.js      # Gestión de clientes WebSocket conectados
        message-router.js      # Enrutamiento de mensajes WebSocket
        notification-broadcaster.js # Broadcasting de eventos MQTT → WebSocket
      /utils
        message-validator.js   # Validación de mensajes WebSocket
        response-builder.js    # Constructor de respuestas WebSocket
      /docs
        deployment-guide.md    # Guía de despliegue
        mqtt-websocket-integration.md # Documentación de integración
        websocket-api-reference.md # Referencia de API WebSocket
        websocket-mqtt-integration-test-results.md # Resultados de testing
    /public
      /js
        app.js                 # Frontend web
    /data
      alarmas.json             # Datos de alarmas
      registro_evento.json     # Historial de eventos
      mac_to_id.json           # Cruce MAC <-> ID
      device_status.json       # Estado de dispositivos
    server.js                  # Inicialización principal y servidor Express
    package.json               # Dependencias del proyecto
/data
  alarmas.json                 # Datos de alarmas (copia)
  registro_evento.json         # Historial de eventos (copia)
  mac_to_id.json               # Cruce MAC <-> ID (copia)
  db-repository.js             # Operaciones de lectura/escritura y mantenimiento de datos
  README.md                    # Documentación de datos
```

---

## Diagrama de Flujo de Interacción Completo

```
+----------------+    +---------------+    +------------------+    +------------------+
|   ESP32 Nodo   |<-->|  Broker MQTT  |<-->|  Backend Node.js |<-->|   Cliente Web    |
+----------------+    +---------------+    +------------------+    +------------------+
                                                    |
                                                    v
                                        +-----------------------+
                                        | WebSocket Manager     |
                                        | - NotificationBroadcaster |
                                        | - DeviceHandler       |
                                        | - ClientManager       |
                                        +-----------------------+

FLUJO DE EVENTOS:
[1] ESP32 → MQTT → message-processor.js → notification-broadcaster.js → WebSocket Clients

FLUJO DE COMANDOS:
[1] Cliente Web → WebSocket → device-handler.js → MQTT → ESP32
```

---

## Ejemplo de Interacción Bidireccional

### **Evento ESP32 → Cliente Web:**
1. **ESP32 envía evento:**  
   - Topic: `NODO/EA8914/ACK`
   - Payload: `{"dsp":"EA8914","event":"button","time":"2025-09-17T01:10:10Z"}`

2. **Backend MQTT procesa:**  
   - `message-processor.js` valida y procesa el evento
   - Envía ACK: `{"dsp":"EA8914","event":"ack_ans_button","time":"2025-09-17T01:10:11Z"}`

3. **Backend WebSocket broadcasting:**  
   - `notification-broadcaster.js` convierte MAC → ID
   - Broadcasting: `{"type":"notification","event":"button_pressed","deviceId":"ESP32_001",...}`

### **Comando Cliente Web → ESP32:**
1. **Cliente envía comando:**  
   - WebSocket: `{"type":"device_command","deviceId":"ESP32_001","command":"play_track","data":{"parameters":{"track":1}}}`

2. **Backend traduce y envía:**  
   - `device-handler.js` convierte ID → MAC
   - Publica MQTT: Topic `NODO/EA8914/CMD`, Payload: `{"dsp":"EA8914","event":"play_track","track":1,...}`

3. **ESP32 responde:**  
   - ACK: `{"dsp":"EA8914","event":"ack_ans_play_track","status":"ok",...}`

---

## Observaciones

- **Arquitectura híbrida MQTT + WebSocket** para máxima compatibilidad
- **Traducción automática MAC ↔ ID** entre protocolos
- **Broadcasting en tiempo real** de todos los eventos MQTT a clientes WebSocket
- **Validación completa** en ambos protocolos
- **Documentación exhaustiva** para desarrollo y despliegue
- **Testing completo** validado y documentado
- **Escalabilidad** para múltiples dispositivos y clientes
- **Mantenimiento de eventos** con limpieza automática de historial

---

**Versión:** 0.1 
**Última actualización:** 2 de octubre, 2025  
**Estado:** Sistema completo MQTT + WebSocket funcionando