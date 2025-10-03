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

- **Servidor a ESP32 (Comandos):**  
  `NODO/<MAC>/CMD`

- **ESP32 a Servidor (Eventos / Respuestas):**  
  `NODO/<MAC>/ACK`

Donde `<MAC>` es la dirección MAC de 6 dígitos hexadecimales en mayúsculas del ESP32 (ejemplo: 77FF44).

---

## Estructura General del Mensaje JSON

Todos los mensajes incluyen los siguientes campos obligatorios:
- `"dsp"`: MAC del dispositivo ESP32.
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

### 5. PLAY TRACK - REVISADO

**Descripción:**  
El servidor solicita al ESP32 reproducir una pista de audio.

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

// ...existing code... (continúa con Manejo de Errores, etc.)

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

## Notas

- El campo `"data"` es opcional y depende del comando/evento.
- El tiempo debe estar en formato ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`), excepto en el mensaje de reset, que puede ser `"UNSYNC"`.
- Todos los comandos y eventos deben incluir el campo `"time"` para sincronización y deduplicación.
- Los ejemplos de MAC y tiempo son ilustrativos.

---