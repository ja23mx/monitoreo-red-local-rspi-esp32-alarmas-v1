# Guía de Comandos y Topics MQTT — Backend <-> ESP32

Esta documentación describe la estructura, funcionamiento y ejemplos de los comandos y eventos intercambiados entre el backend (servidor central) y los nodos ESP32 en el sistema de gestión de alarmas.  
Se utiliza comunicación MQTT sobre los siguientes topics y formatos JSON.

---

## Nota sobre el evento "rst" y sincronización de tiempo

El primer mensaje de reset enviado por el ESP32 puede incluir el campo `"time": "UNSYNC"`.  
Esto indica que el ESP32 aún no tiene un reloj sincronizado. El backend responde con el timestamp actual en formato ISO 8601.  
El ESP32 debe sincronizar su reloj interno a partir del tiempo recibido en la respuesta del backend.  
Todos los mensajes posteriores deben incluir timestamps correctos.

---

## Topics de Comunicación

### Topics Punto a Punto (Unicast)

- **Servidor a ESP32 (Comandos):**  
  `NODO/<MAC>/CMD`

- **ESP32 a Servidor (Eventos / Respuestas):**  
  `NODO/<MAC>/ACK`

Donde `<MAC>` es la dirección MAC de 6 dígitos hexadecimales en mayúsculas del ESP32 (ejemplo: 77FF44).

### Topics de Sistema (Broadcast)

- **Servidor a Todos los ESP32:**  
  `SYSTEM/TEST`

**Descripción:**  
Topic broadcast para comandos que deben ejecutarse en todos los dispositivos simultáneamente.  
Los ESP32 **NO** envían ACK individual para mensajes recibidos por este topic.

### Tabla Comparativa de Topics

| Topic Pattern        | Dirección       | Tipo      | ACK Requerido | Uso                                    |
| -------------------- | --------------- | --------- | ------------- | -------------------------------------- |
| `NODO/<MAC>/CMD`     | Server → ESP    | Unicast   | ✅ Sí         | Comandos a dispositivo específico      |
| `NODO/<MAC>/ACK`     | ESP → Server    | Unicast   | N/A           | Respuestas y eventos de dispositivo    |
| `SYSTEM/TEST`        | Server → Todos  | Broadcast | ❌ No         | Comandos simultáneos a todos los ESP32 |

---

## Estructura General del Mensaje JSON

Todos los mensajes incluyen los siguientes campos obligatorios:

- `"dsp"`: Destinatario del mensaje
  - **MAC específica** (ej: `"77FF44"`) para comunicación punto a punto (topics `NODO/<MAC>/CMD`)
  - **`"all"`** para broadcast a todos los dispositivos (topic `SYSTEM/TEST`)
  
- `"event"`: Tipo de comando o evento.

- `"time"`: Timestamp en formato ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`).  
  En el primer mensaje de reset puede ser `"UNSYNC"`.

- `"data"`: Información adicional, opcional y dependiente del tipo de comando/evento.

---

## Comandos y Ejemplos

### 1. GET INFO - REVISADO

**Descripción:**  
El servidor solicita información de estado y red al ESP32.

**Solicitud**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "status",        
  "time": "2025-09-17T01:09:03Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans",
  "time": "2025-09-19T07:40:01Z",
  "status": "ok",
  "data": {
    "firmware": "1.0.0",
    "network": {
      "ip": "192.168.1.100",
      "subnet": "255.255.255.0",
      "gateway": "192.168.1.1"
    },
    "system": {
      "chip_id": "1234567890",
      "ram": 90
    }
  }
}
```

---

### 2. RESET

**Descripción:**  
El ESP32 notifica al backend un reinicio. El backend responde con el timestamp actual.

**Solicitud**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "rst",
  "time": "UNSYNC"
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans_rst",
  "time": "2025-09-17T01:10:01Z",
  "status": "ok"
}
```

---

### 3. BUTTON - REVISADO

**Descripción:**  
El ESP32 notifica que se ha presionado un botón.

**Solicitud**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "button",
  "time": "2025-09-17T01:10:10Z",
  "data": {
    "nmb-btn": 1
  }
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans_button",
  "time": "2025-09-17T01:10:11Z",
  "status": "ok"
}
```

---

### 4. HEARTBEAT - REVISADO

**Descripción:**  
El ESP32 envía un evento periódico para indicar que sigue activo.

**Solicitud**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "hb",
  "time": "2025-09-17T01:10:20Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans_hb",
  "time": "2025-09-17T01:10:21Z",
  "status": "ok"
}
```

---

### 5. PLAY TRACK (Unicast) - REVISADO

**Descripción:**  
El servidor solicita a un ESP32 específico reproducir una pista de audio.

**Solicitud**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "play_track",
  "time": "2025-09-17T01:10:30Z",
  "track": 25
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans",
  "time": "2025-09-19T07:10:05Z",
  "status": "ok",
  "data": {
    "cmd": "play_track",
    "result": "done"
  }
}
```

---

### 5b. PLAY TRACK (Broadcast) - NUEVO

**Descripción:**  
El servidor solicita a **todos** los ESP32 reproducir una pista de audio simultáneamente.  
Este comando se utiliza principalmente para:
- Pruebas automáticas programadas (Task System)
- Alertas generales del sistema
- Sincronización de múltiples dispositivos

**⚠️ Importante:** Los ESP32 **NO** envían ACK individual para este comando.

**Solicitud**  
**Topic:**  
`SYSTEM/TEST`

**Payload:**
```json
{
  "dsp": "all",
  "event": "play_track",
  "time": "2025-10-25T20:30:15Z",
  "track": 11
}
```

**Comportamiento:**
- Todos los ESP32 suscritos a `SYSTEM/TEST` reciben el mensaje
- Cada ESP32 verifica que `"dsp": "all"` para procesar el comando
- Reproducción se ejecuta inmediatamente sin enviar confirmación
- No hay respuesta en `NODO/<MAC>/ACK`

**Ejemplo de Uso (Task System):**
```javascript
// Tarea programada ejecuta comando broadcast
const payload = {
  dsp: "all",
  event: "play_track",
  time: new Date().toISOString(),
  track: 11
};

mqttClient.publish('SYSTEM/TEST', JSON.stringify(payload), { qos: 1 });
```

**Logs del Servidor:**
```
[TaskScheduler] Ejecutando tarea: audio_test_1 (Prueba Matutina)
[TaskExecutor] Mensaje publicado en SYSTEM/TEST: {"dsp":"all","event":"play_track","time":"2025-10-25T08:00:15Z","track":11}
[TaskExecutor] ✓ Tarea ejecutada [SCHEDULED]
```

---

### 6. PLAY FINISHED

**Descripción:**  
El ESP32 notifica que la reproducción de audio terminó.

**Solicitud**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "play_fin",
  "time": "2025-09-17T01:10:40Z",
  "data": {
    "status": "ok",
    "audio": 12
  }
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans_play_fin",
  "time": "2025-09-17T01:10:41Z",
  "status": "ok"
}
```

---

### 7. PING - REVISADO

**Descripción:**  
El servidor verifica la conectividad con el ESP32. Hay una espera de 10 segundos para responder.

**Solicitud**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ping",
  "time": "2025-09-17T01:10:50Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans",
  "time": "2025-09-19T06:19:45Z",
  "status": "ok",
  "data": {
    "cmd": "ping",
    "result": "pong"
  }
}
```

---

### 8. REINICIO_SRV

**Descripción:**  
El servidor fuerza un reinicio del ESP32.  
Este comando se utiliza para que el backend pueda inducir un reset remoto en el ESP32 en caso de falla, mantenimiento o actualización.  
Se usa el evento `"reinicio_srv"` para evitar confusión con el evento `"rst"` originado del ESP32.

**Solicitud**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "reinicio_srv",
  "time": "2025-09-17T01:15:00Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans",
  "time": "2025-09-19T08:00:01Z",
  "status": "ok",
  "data": {
    "cmd": "reinicio_srv",
    "result": "rebooting"
  }
}
```

---

### 9. STOP_AUDIO

**Descripción:**  
El servidor solicita al ESP32 detener la reproducción de audio actual.

**Solicitud**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "stop_audio",
  "time": "2025-09-19T08:15:00Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans",
  "time": "2025-09-19T08:15:01Z",
  "status": "ok",
  "data": {
    "cmd": "stop_audio",
    "result": "stopped"
  }
}
```

---

### 10. SET_VOLUME

**Descripción:**  
El servidor solicita al ESP32 ajustar el volumen de audio.

**Solicitud**  
**Topic:**  
`NODO/77FF44/CMD`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "set_volume",
  "time": "2025-09-19T08:20:00Z",
  "data": {
    "volume": 75
  }
}
```

**Respuesta**  
**Topic:**  
`NODO/77FF44/ACK`

**Payload:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans",
  "time": "2025-09-19T08:20:01Z",
  "status": "ok",
  "data": {
    "cmd": "set_volume",
    "result": "volume_set",
    "volume": 75
  }
}
```

---

## Manejo de Errores

**En caso de error, incluye el campo `error_msg` en la respuesta:**
```json
{
  "dsp": "77FF44",
  "event": "ack_ans",
  "time": "2025-09-17T01:12:01Z",
  "status": "error",
  "error_msg": "Invalid parameters"
}
```

---

## Tolerancia de Heartbeat

- Si el servidor no recibe un evento tipo `"hb"` (heartbeat) o cualquier evento del ESP32 en **5 minutos**, debe generar una alerta/log indicando que el nodo está inactivo.

---

## Debugging de Topics Broadcast

### Herramientas Recomendadas

#### 1. Mosquitto Subscriber (Terminal)
```bash
# Suscribirse al topic broadcast para ver mensajes
mosquitto_sub -h server-sra.local -t "SYSTEM/TEST" -v

# Salida esperada:
# SYSTEM/TEST {"dsp":"all","event":"play_track","time":"2025-10-25T08:00:15Z","track":11}
```

#### 2. Publicación Manual de Prueba
```bash
# Enviar comando broadcast manualmente
mosquitto_pub -h server-sra.local -t "SYSTEM/TEST" \
  -m '{"dsp":"all","event":"play_track","time":"2025-10-25T08:00:00Z","track":11}'
```

---

## Notas

- El campo `"data"` es opcional y depende del comando/evento.
- El tiempo debe estar en formato ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`), excepto en el mensaje de reset, que puede ser `"UNSYNC"`.
- Todos los comandos y eventos deben incluir el campo `"time"` para sincronización y deduplicación.
- Los comandos broadcast en `SYSTEM/TEST` **NO** generan respuestas ACK individuales.
- Los ejemplos de MAC y tiempo son ilustrativos.

---