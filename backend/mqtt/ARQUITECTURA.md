# Arquitectura Actual del Sistema - Backend MQTT de Alarmas

Este documento describe la arquitectura actual del sistema de backend MQTT para la gestión de alarmas, así como el diagrama de flujo básico de interacción entre los componentes principales.

---

## Componentes Principales

- **ESP32 (Nodo de alarma):**  
  Dispositivo IoT que envía eventos (botón, heartbeat, reset, etc.) al servidor mediante MQTT y recibe comandos.

- **Broker MQTT:**  
  Intermediario que gestiona los mensajes entre nodos ESP32 y el backend.  
  Ejemplo: Mosquitto.

- **Servidor Backend (Node.js):**  
  - Se conecta al broker MQTT.
  - Suscribe a los eventos de todos los nodos.
  - Procesa los mensajes según el tipo de evento.
  - Valida y sanitiza los mensajes recibidos.
  - Responde a los nodos con comandos y ACK, incluyendo detalles de error si la validación falla.
  - Actualiza la información de última conexión y almacena eventos en archivos JSON.
  - Permite borrar eventos antiguos por MAC o de todos los dispositivos.
  - Opcional: expone API REST o WebSocket para integración con otras aplicaciones.

- **Archivos de datos (JSON):**
  - `alarmas.json`: Información principal de cada dispositivo, indexado por ID.
  - `registro_evento.json`: Historial de eventos por dispositivo, agrupados por ID.
  - `mac_to_id.json`: Tabla de cruce que relaciona la MAC del dispositivo con su ID interno.

---

## Estructura de Carpetas

```
/red-local-iot
  /backend
    /mqtt
      index.js                 # Lógica de conexión y suscripción MQTT
      /config
        mqtt-config.js         # Configuración del broker MQTT
        topics-config.js       # Topics de suscripcion
      /services
        message-processor.js   # Procesamiento y validación de eventos entrantes
        mqtt-client.js         # Cliente MQTT (conexión y publicación)
      /utils
        message-validators.js  # Validadores de formato y estructura de mensajes
/data
    alarmas.json           # Datos de alarmas
    registro_evento.json   # Historial de eventos
    mac_to_id.json         # Cruce MAC <-> ID
    db-repository.js       # Operaciones de lectura/escritura y mantenimiento de datos
server.js                 # Inicialización principal y servidor Express
```

---

## Diagrama de Flujo de Interacción (TXT)

```
+----------------+         +---------------+         +------------------+
|   ESP32 Nodo   | <-----> |  Broker MQTT  | <-----> |  Backend Node.js |
+----------------+         +---------------+         +------------------+

[1] ESP32 publica evento a topic: NODO/<MAC>/ACK
        |
        v
[2] Broker MQTT enruta el mensaje al backend suscrito a NODO/+/ACK
        |
        v
[3] Backend recibe el mensaje, lo valida y procesa según el campo "event"
        |
        v
[4] Backend responde (si corresponde) al ESP32 por topic: NODO/<MAC>/CMD
        |
        v
[5] ESP32 recibe la respuesta y actúa en consecuencia

(Flujo típico para heartbeat, botón, reset, etc.)
```

---

## Ejemplo de Interacción

1. **Evento:** ESP32 envía botón presionado  
   - Topic: `NODO/EA8914/ACK`
   - Payload:  
     ```json
     {"dsp":"EA8914","event":"button","time":"2025-09-17T01:10:10Z","data":{"nmb-btn":1}}
     ```

2. **Procesamiento:** Backend responde con ACK  
   - Topic: `NODO/EA8914/CMD`
   - Payload:  
     ```json
     {"dsp":"EA8914","event":"ack_ans","time":"2025-09-17T01:10:11Z","status":"ok"}
     ```

---

## Observaciones

- El backend valida y sanitiza todos los mensajes antes de procesarlos.
- La información de última conexión y eventos se actualiza y almacena en archivos JSON.
- Se pueden borrar eventos antiguos por MAC o de todos los dispositivos, facilitando el mantenimiento.
- La suscripción a `NODO/+/ACK` permite recibir eventos de todos los nodos sin necesidad de cambios adicionales.
- La arquitectura es modular y fácilmente escalable.

---