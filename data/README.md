# db-repository.js

Módulo para la gestión y persistencia de datos de alarmas y eventos en archivos JSON.  
Permite simular operaciones básicas de una base de datos para el backend MQTT de alarmas.

## Archivos utilizados

- **alarmas.json:**  
  Contiene la información principal de cada dispositivo de alarma, indexado por su ID.

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

---

### updateUltimaConexionByMac(mac, fechaISO)
Actualiza la fecha de última conexión (`ult_cnx`) de una alarma usando la MAC.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.
- `fechaISO` (string): Fecha en formato ISO8601.

**Retorna:**  
- `true` si la actualización fue exitosa, `false` si la MAC no existe.

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

---

### getEventosByMac(mac)
Obtiene todos los eventos registrados para un dispositivo usando la MAC.

**Parámetros:**  
- `mac` (string): MAC del dispositivo.

**Retorna:**  
- Array de eventos, o array vacío si no hay eventos.

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

---

## Ejemplo de uso

```javascript
const db = require('./db-repository');

// Obtener datos de una alarma por MAC
const alarma = db.getAlarmaByMac('EA8914');

// Actualizar última conexión por MAC
db.updateUltimaConexionByMac('EA8914', '2025-09-17T06:18:12Z');

// Agregar un evento por MAC
db.addEventoByMac('EA8914', {
  time: '2025-09-17T06:18:12Z',
  event: 'btn1'
});

// Obtener historial de eventos por MAC
const eventos = db.getEventosByMac('EA8914');

// Borrar eventos antiguos de un dispositivo (por MAC)
db.deleteEventosByMac('EA8914', 7); // Borra eventos de más de 7 días

// Borrar todo el historial de eventos de todos los dispositivos
db.deleteEventosAll(0); // Borra todos los eventos
```

---

## Notas

- Los métodos internos (`_readJsonFile`, `_writeJsonFile`, `_getIdByMac`) no están exportados y se usan para la lectura/escritura segura de los archivos JSON y la conversión de MAC a ID.
- Este módulo está pensado para proyectos pequeños o pruebas; para producción se recomienda migrar a una base de datos real.

---