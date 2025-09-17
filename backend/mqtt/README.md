# Backend MQTT para Gestión de Alarmas

Este proyecto implementa el backend MQTT para la comunicación entre el servidor central y dispositivos ESP32 en el sistema de gestión de alarmas.  
Sigue la guía de topics y estructura recomendada para comandos y eventos entre backend y nodos ESP32.

## Estructura de Carpetas

- `config/mqtt-config.js`: Configuración del broker MQTT.
- `mqtt/index.js`: Lógica de conexión, suscripción y recepción de mensajes MQTT.
- `services/message-processor.js`: Procesamiento de los mensajes entrantes según el campo `event`.
- `server.js`: Orquestador principal con Express.

## Topics MQTT

- **Comandos del servidor al ESP32:**  
  `NODO/<MAC>/CMD`
- **Eventos y respuestas del ESP32 al servidor:**  
  `NODO/<MAC>/ACK`

Donde `<MAC>` es la dirección MAC del ESP32.

## Procesamiento de Mensajes

El backend se suscribe a `NODO/+/ACK` para recibir eventos de todos los nodos.  
El procesamiento se realiza por el campo `event` del payload JSON recibido.

## Ejemplo de Flujo

1. **ESP32 envía un evento (ejemplo: botón presionado):**
   - Topic: `NODO/EA8914/ACK`
   - Payload:
     ```json
     {
       "dsp": "EA8914",
       "event": "button",
       "time": "2025-09-17T01:10:10Z",
       "data": { "nmb-btn": 1 }
     }
     ```
2. **Backend responde:**
   - Topic: `NODO/EA8914/CMD`
   - Payload:
     ```json
     {
       "dsp": "EA8914",
       "event": "ack_ans",
       "time": "2025-09-17T01:10:11Z",
       "status": "ok"
     }
     ```

## Documentación Adicional

Para detalles sobre los comandos, eventos y estructura de topics, consulta el archivo `docs/mqtt-topics.md`.

## Requisitos

- Node.js
- Acceso a un broker MQTT (puede ser local o remoto)

## Ejecución

1. Instala dependencias:
   ```
   npm install
   ```
2. Configura el broker en `config/mqtt-config.js`
3. Inicia el servidor:
   ```
   node server.js
   ```

## Licencia

MIT