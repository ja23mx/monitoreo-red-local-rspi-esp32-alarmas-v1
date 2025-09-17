# Gestión de Alarmas MQTT - Backend (v0.1)

Este proyecto implementa la versión inicial (v0.1) del backend para la gestión de alarmas utilizando comunicación MQTT entre dispositivos ESP32 y el servidor central.  
Permite recibir eventos de los nodos, procesarlos y enviar comandos o respuestas mediante topics MQTT estructurados.

---

## Arquitectura

- **ESP32 (Nodos):**  
  Dispositivos IoT que envían eventos (botón, heartbeat, reset) y reciben comandos.
- **Broker MQTT:**  
  Intermediario de mensajes entre nodos y el backend. Ejemplo: Mosquitto.
- **Backend Node.js:**  
  - Se conecta y suscribe a topics de eventos.
  - Procesa mensajes según el campo `event`.
  - Envía comandos o respuestas por MQTT.
  - Expone un servidor Express (expandible).

---

## Estructura del Proyecto

```
/red-local-iot
    /backend
        /mqtt
            /config
                mqtt-config.js         # Configuración del broker MQTT
            /mqtt
                index.js               # Lógica de conexión y suscripción MQTT
            /services
                message-processor.js   # Procesamiento de eventos entrantes
            ARQUITECTURA.md            # Documento de arquitectura y flujo
            README.md
        server.js                      # Inicialización principal y servidor Express

README.md                              # este archivo
```

---

## Topics MQTT

- **Comandos hacia ESP32:**  
  `NODO/<MAC>/CMD`
- **Eventos desde ESP32:**  
  `NODO/<MAC>/ACK`

Donde `<MAC>` es la dirección MAC única del nodo.

---

## Ejemplo de Flujo

1. **ESP32 envía evento:**  
   - Topic: `NODO/EA8914/ACK`
   - Payload:  
     ```json
     {"dsp":"EA8914","event":"button","time":"2025-09-17T01:10:10Z","data":{"nmb-btn":1}}
     ```
2. **Backend responde:**  
   - Topic: `NODO/EA8914/CMD`
   - Payload:  
     ```json
     {"dsp":"EA8914","event":"ack_ans","time":"2025-09-17T01:10:11Z","status":"ok"}
     ```

---

## Instalación y Ejecución

1. Instala dependencias:
   ```
   npm install
   ```
2. Configura el broker MQTT en `config/mqtt-config.js`
3. Inicia el servidor:
   ```
   node server.js
   ```

---

## Estado & Notas

- **Versión:** 0.1 (base funcional, sin integración con base de datos ni frontend)
- Modular y expandible.
- Para detalles técnicos, consulta `ARQUITECTURA.md`.

---

## Licencia

MIT