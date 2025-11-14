# db-repository.js

Módulo para la gestión y persistencia de datos de alarmas y eventos en archivos JSON.  
Permite simular operaciones básicas de una base de datos para el backend MQTT de alarmas y WebSocket.

## Archivos utilizados

- **alarmas.json:**  
  Contiene la información principal de cada dispositivo de alarma, indexado por su ID.
  - `id` (number): ID interno del dispositivo
  - `ult_cnx` (string ISO8601): Última conexión registrada
  - `nickname` (string): Nombre amigable del dispositivo
  - `location` (string): Ubicación física del dispositivo
  - `alarmActive` (boolean): Estado actual de la alarma
  - `track` (number): Pista de reproducción de audio (usado en MQTT payload)

- **registro_evento.json:**  
  Almacena el historial de eventos de cada dispositivo, agrupados por ID.

- **mac_to_id.json:**  
  Tabla de cruce que relaciona la MAC del dispositivo con su ID interno.

---

## Métodos exportados

### getAlarmaByMac(mac)
Obtiene la información de una alarma usando la MAC del dispositivo.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.

**Retorna:**  
- Objeto con los datos de la alarma, o `null` si no existe.

**Ejemplo:**
```javascript
const alarma = db.getAlarmaByMac('77FF44');
// { id: 1, ult_cnx: "2025-10-25T03:27:33Z", nickname: "ALARMA X", location: "Entrada Principal", alarmActive: false, track: 30 }
```

---

### getAlarmaTrackByMac(mac)
Obtiene el número de pista de reproducción de una alarma usando la MAC del dispositivo.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.

**Retorna:**  
- Número de track (ejemplo: `30`), o `null` si la MAC no existe.

**Ejemplo:**
```javascript
const track = db.getAlarmaTrackByMac('77FF44');
// 30

const trackNoExiste = db.getAlarmaTrackByMac('INVALID_MAC');
// null
```

---

### updateUltimaConexionByMac(mac, fechaISO)
Actualiza la fecha de última conexión (`ult_cnx`) de una alarma usando la MAC.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.
- `fechaISO` (string): Fecha en formato ISO8601.

**Retorna:**  
- `true` si la actualización fue exitosa, `false` si la MAC no existe.

**Ejemplo:**
```javascript
db.updateUltimaConexionByMac('77FF44', '2025-10-25T05:30:00Z');
```

---

### addEventoByMac(mac, eventoObj)
Agrega un evento al historial de un dispositivo usando la MAC.  
El campo `id` del evento se genera automáticamente como `evt-<n>`.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.
- `eventoObj` (object): Objeto con los datos del evento (ejemplo: `{ time: "...", event: "btn1" }`).  
  *No es necesario incluir el campo `id`.*

**Retorna:**  
- `true` si el evento fue agregado correctamente.

**Ejemplo:**
```javascript
db.addEventoByMac('EA8914', {
  time: '2025-09-17T06:18:12Z',
  event: 'btn1'
});
```

---

### getEventosByMac(mac)
Obtiene todos los eventos registrados para un dispositivo usando la MAC.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.

**Retorna:**  
- Array de eventos, o array vacío si no hay eventos.

**Ejemplo:**
```javascript
const eventos = db.getEventosByMac('EA8914');
// [{ id: "evt-1", time: "...", event: "btn1" }, ...]
```

---

### deleteEventosByMac(mac, dias = 30)
Borra eventos antiguos del historial de un dispositivo usando la MAC.  
- Si `dias = 0`, borra todo el historial.  
- Si `dias = 1`, conserva solo los eventos del día actual.  
- Si `dias > 1`, conserva los eventos dentro del rango de días especificado.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.
- `dias` (number, opcional): Número de días a conservar (por defecto 30).

**Retorna:**  
- `true` si la operación fue exitosa.

**Ejemplo:**
```javascript
db.deleteEventosByMac('EA8914', 7); // Borra eventos de más de 7 días
```

---

### deleteEventosAll(dias = 30)
Borra eventos antiguos del historial de **todos** los dispositivos.  
- Si `dias = 0`, borra todo el historial.  
- Si `dias = 1`, conserva solo los eventos del día actual.  
- Si `dias > 1`, conserva los eventos dentro del rango de días especificado.

**Parámetros:**  
- `dias` (number, opcional): Número de días a conservar (por defecto 30).

**Retorna:**  
- `true` si la operación fue exitosa.

**Ejemplo:**
```javascript
db.deleteEventosAll(0); // Borra todos los eventos
```

---

### getAllDevicesForWS(timeoutMinutes = 5)
**[NUEVO]** Obtiene todos los dispositivos formateados para envío por WebSocket.  
Combina información de `alarmas.json`, `mac_to_id.json` y calcula el estado `online`/`offline` basado en la última conexión.

**Parámetros:**  
- `timeoutMinutes` (number, opcional): Umbral en minutos para considerar un dispositivo offline (por defecto 5).

**Retorna:**  
- Array de objetos con la siguiente estructura:
  ```javascript
  {
    id: "ESP32_001",           // ID formateado
    mac: "77FF44",             // MAC del dispositivo
    name: "ALARMA X",          // Nickname del dispositivo
    status: "online",          // "online" o "offline" (calculado)
    lastSeen: "2025-10-25...", // Última conexión (ISO8601)
    location: "Entrada...",    // Ubicación física
    alarmActive: false         // Estado de alarma activa
  }
  ```

**Ejemplo:**
```javascript
const devices = db.getAllDevicesForWS(5);
// [
//   { id: "ESP32_001", mac: "77FF44", status: "online", name: "ALARMA X", ... },
//   { id: "ESP32_002", mac: "EA8914", status: "offline", name: "ALARMA Y", ... }
// ]
```

---

### getDeviceByMac(mac, timeoutMinutes = 5)
**[NUEVO]** Obtiene un dispositivo individual formateado para WebSocket usando su MAC.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.
- `timeoutMinutes` (number, opcional): Umbral en minutos para calcular el estado (por defecto 5).

**Retorna:**  
- Objeto con la información del dispositivo, o `null` si no existe.

**Ejemplo:**
```javascript
const device = db.getDeviceByMac('77FF44');
// { id: "ESP32_001", mac: "77FF44", status: "online", name: "ALARMA X", lastSeen: "...", location: "...", alarmActive: false }
```

---

### updateAlarmActiveByMac(mac, isActive)
**[NUEVO]** Actualiza el estado de alarma activa (`alarmActive`) de un dispositivo usando su MAC.  
**⚠️ Comportamiento importante:** Cuando `isActive = true`, también actualiza automáticamente `ult_cnx` a la hora actual, ya que la activación implica que el dispositivo está conectado.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.
- `isActive` (boolean): `true` para activar alarma, `false` para desactivar.

**Retorna:**  
- `true` si la actualización fue exitosa, `false` si la MAC no existe.

**Comportamiento:**
- **Si `isActive = true`:** Actualiza `alarmActive = true` y `ult_cnx = <hora actual>`
- **Si `isActive = false`:** Solo actualiza `alarmActive = false` (mantiene `ult_cnx` sin cambios)

**Ejemplo:**
```javascript
// Activar alarma (también actualiza ult_cnx)
db.updateAlarmActiveByMac('77FF44', true);
// Resultado: { alarmActive: true, ult_cnx: "2025-10-25T05:30:00.000Z" }

// Desactivar alarma (NO actualiza ult_cnx)
db.updateAlarmActiveByMac('77FF44', false);
// Resultado: { alarmActive: false, ult_cnx: "2025-10-25T05:30:00.000Z" } (sin cambios)
```

**Uso en MQTT:**
```javascript
// Al recibir botón de pánico
db.addEventoByMac(mac, { time: now, event: 'btn1' });
db.updateAlarmActiveByMac(mac, true); // ✅ Un solo método actualiza alarma + conexión
```

---

## Ejemplo de uso completo

```javascript
const db = require('./db-repository');

// ========== GESTIÓN DE ALARMAS ==========

// Obtener datos de una alarma por MAC
const alarma = db.getAlarmaByMac('EA8914');
console.log(alarma);
// { id: 2, ult_cnx: "2025-10-03T03:44:55Z", nickname: "ALARMA Y", location: "Parque Central", alarmActive: true, track: 31 }

// Obtener solo el track de reproducción
const track = db.getAlarmaTrackByMac('77FF44');
console.log(track);
// 30

// Actualizar última conexión por MAC (manual)
db.updateUltimaConexionByMac('EA8914', '2025-09-17T06:18:12Z');

// Activar alarma (también actualiza ult_cnx automáticamente)
db.updateAlarmActiveByMac('77FF44', true);

// Desactivar alarma (NO actualiza ult_cnx)
db.updateAlarmActiveByMac('77FF44', false);

// ========== GESTIÓN DE EVENTOS ==========

// Agregar un evento por MAC
db.addEventoByMac('EA8914', {
  time: '2025-09-17T06:18:12Z',
  event: 'btn1'
});

// Obtener historial de eventos por MAC
const eventos = db.getEventosByMac('EA8914');
console.log(eventos);
// [{ id: "evt-1", time: "2025-09-17T06:18:12Z", event: "btn1" }, ...]

// Borrar eventos antiguos de un dispositivo (por MAC)
db.deleteEventosByMac('EA8914', 7); // Borra eventos de más de 7 días

// Borrar todo el historial de eventos de todos los dispositivos
db.deleteEventosAll(0); // Borra todos los eventos

// ========== INTEGRACIÓN WEBSOCKET ==========

// Obtener todos los dispositivos para envío por WebSocket
const allDevices = db.getAllDevicesForWS(5);
console.log(allDevices);
// [
//   { id: "ESP32_001", mac: "77FF44", status: "online", name: "ALARMA X", ... },
//   { id: "ESP32_002", mac: "EA8914", status: "offline", name: "ALARMA Y", ... }
// ]

// Obtener un dispositivo específico para WebSocket
const device = db.getDeviceByMac('77FF44', 5);
console.log(device);
// { id: "ESP32_001", mac: "77FF44", status: "online", name: "ALARMA X", lastSeen: "...", location: "...", alarmActive: false }
```

---

## Estructura de datos

### alarmas.json
```json
{
  "1": {
    "id": 1,
    "ult_cnx": "2025-10-25T03:27:33Z",
    "nickname": "ALARMA X",
    "location": "Entrada Principal",
    "alarmActive": false,
    "track": 30
  },
  "2": {
    "id": 2,
    "ult_cnx": "2025-10-03T03:44:55Z",
    "nickname": "ALARMA Y",
    "location": "Parque Central",
    "alarmActive": true,
    "track": 31
  }
}
```

### mac_to_id.json
```json
{
  "77FF44": 1,
  "EA8914": 2
}
```

### Salida de getAllDevicesForWS()
```json
{
  "id": "ESP32_001",
  "mac": "77FF44",
  "name": "ALARMA X",
  "status": "online",
  "lastSeen": "2025-10-25T03:27:33Z",
  "location": "Entrada Principal",
  "alarmActive": false
}
```

---

## Notas

- **Campo `track`:**  
  Representa la pista de reproducción de audio que se enviará vía MQTT cuando se active una alarma. Los valores van del 30 al 45 (ALARMA 1 a ALARMA 16).

- **Cálculo de estado online/offline:**  
  Se compara `ult_cnx` con la hora actual. Si la diferencia es mayor al umbral (`timeoutMinutes`), el dispositivo se marca como `offline`.

- **Formato de ID:**  
  Los dispositivos se formatean como `ESP32_XXX` (ejemplo: `ESP32_001`, `ESP32_002`) usando `String(id).padStart(3, '0')`.

- **Actualización automática de `ult_cnx`:**  
  Al activar una alarma con `updateAlarmActiveByMac(mac, true)`, el campo `ult_cnx` se actualiza automáticamente a la hora actual, ya que esto indica que el dispositivo está activo y conectado.

- **Helpers internos:**  
  Los métodos `_readJsonFile`, `_writeJsonFile`, `_getIdByMac`, `_calculateDeviceStatus`, `_getIdToMacMap` no están exportados y se usan internamente para operaciones de lectura/escritura.

- **Migración a producción:**  
  Este módulo está pensado para proyectos pequeños o pruebas; para producción se recomienda migrar a una base de datos real (MongoDB, PostgreSQL, etc.).

---