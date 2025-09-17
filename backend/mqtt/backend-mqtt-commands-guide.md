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

Donde `<MAC>` es la dirección MAC de 6 dígitos hexadecimales en mayúsculas del ESP32 (ejemplo: EA8914).

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

### 1. GET INFO

**Descripción:**  
El servidor solicita información de estado y red al ESP32.

**Solicitud**  
**Topic:**  
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "getinfo",
  "time": "2025-09-17T01:09:03Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:09:04Z",
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
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "rst",
  "time": "UNSYNC"
}
```

**Respuesta**  
**Topic:**  
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:10:01Z",
  "status": "ok"
}
```

---

### 3. BUTTON

**Descripción:**  
El ESP32 notifica que se ha presionado un botón.

**Solicitud**  
**Topic:**  
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "button",
  "time": "2025-09-17T01:10:10Z",
  "data": {
    "nmb-btn": 1
  }
}
```

**Respuesta**  
**Topic:**  
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:10:11Z",
  "status": "ok"
}
```

---

### 4. HEARTBEAT

**Descripción:**  
El ESP32 envía un evento periódico para indicar que sigue activo.

**Solicitud**  
**Topic:**  
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "hb",
  "time": "2025-09-17T01:10:20Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:10:21Z",
  "status": "ok"
}
```

---

### 5. PLAY TRACK

**Descripción:**  
El servidor solicita al ESP32 reproducir una pista de audio.

**Solicitud**  
**Topic:**  
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "play_track",
  "time": "2025-09-17T01:10:30Z",
  "data": {
    "track": 25
  }
}
```

**Respuesta**  
**Topic:**  
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:10:31Z",
  "status": "ok"
}
```

---

### 6. PLAY FINISHED

**Descripción:**  
El ESP32 notifica que la reproducción de audio terminó.

**Solicitud**  
**Topic:**  
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
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
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:10:41Z",
  "status": "ok"
}
```

---

### 7. PING

**Descripción:**  
El servidor verifica la conectividad con el ESP32.

**Solicitud**  
**Topic:**  
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ping",
  "time": "2025-09-17T01:10:50Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:10:51Z",
  "status": "ok"
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
`NODO/EA8914/CMD`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "reinicio_srv",
  "time": "2025-09-17T01:15:00Z"
}
```

**Respuesta**  
**Topic:**  
`NODO/EA8914/ACK`

**Payload:**
```json
{
  "dsp": "EA8914",
  "event": "ack_ans",
  "time": "2025-09-17T01:15:01Z",
  "status": "ok"
}
```

---

## Manejo de Errores

**En caso de error, incluye el campo `error_msg` en la respuesta:**
```json
{
  "dsp": "EA8914",
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