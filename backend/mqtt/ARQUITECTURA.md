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
  - Responde a los nodos con comandos y ACK.
  - Opcional: expone API REST o WebSocket para integración con otras aplicaciones.

---

## Estructura de Carpetas

```
/config
    mqtt-config.js     # Configuración del broker MQTT
/mqtt
    index.js           # Lógica de conexión y suscripción MQTT
/services
    message-processor.js # Procesamiento de eventos entrantes
server.js             # Inicialización principal y servidor Express
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
[3] Backend recibe el mensaje, lo procesa según el campo "event"
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

- El backend puede expandirse con lógica para monitoreo de nodos, alertas, integración con otros sistemas, etc.
- La suscripción a `NODO/+/ACK` permite recibir eventos de todos los nodos sin necesidad de cambios adicionales.
- La arquitectura es modular y fácilmente escalable.

---