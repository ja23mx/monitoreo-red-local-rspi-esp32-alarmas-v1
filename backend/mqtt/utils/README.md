# message-validators.js

Validador de mensajes MQTT para el backend de gestión de alarmas.  
Este módulo contiene funciones para validar el formato, campos obligatorios y datos específicos de los mensajes recibidos desde los nodos ESP32.

## Funciones exportadas

- **macFormat(mac):**  
  Valida que la dirección MAC tenga 6 caracteres hexadecimales.

- **TopicFormat(topic):**  
  Verifica que el topic MQTT tenga la estructura y caracteres válidos.

- **sanitizePayload(payload):**  
  Limpia el payload de caracteres peligrosos y limita la longitud de los strings.

- **searchErrors(payload):**  
  Realiza todas las validaciones necesarias sobre el payload:
  - Verifica campos obligatorios (`dsp`, `event`, `time`).
  - Valida el formato y sincronización del campo `time` (ISO 8601 y no mayor a 1 minuto de diferencia).
  - Valida el tipo de evento permitido.
  - Realiza validaciones específicas para eventos como `button` y `play_fin`.

## Funciones internas (no exportadas)

- **Iso8601Recent(time, toleranceSeconds):**  
  Valida que el campo `time` esté en formato ISO 8601 y que la diferencia con el tiempo actual no exceda el rango permitido (por defecto, 60 segundos).

- **validateIso8601(time):**  
  Verifica que el campo `time` esté en formato ISO 8601 o sea igual a `"UNSYNC"`.

- **validateRequiredFields(payload, requiredFields):**  
  Comprueba que el payload incluya todos los campos obligatorios y que no sean nulos/vacíos.

- **validateEventType(event):**  
  Valida que el tipo de evento (`event`) sea uno de los permitidos (`rst`, `hb`, `button`, `play_fin`, `ack_ans`).

- **validateButtonData(data):**  
  Verifica que el campo `data.nmb-btn` para el evento `button` sea un número entero entre 1 y 5.

- **validatePlayFinData(data):**  
  Verifica que el campo `data.track` para el evento `play_fin` sea un número entre 1 y 500.

## Ejemplo de uso

```javascript
const validators = require('./message-validators');

const payload = {
  dsp: 'EA8914',
  event: 'button',
  time: '2025-09-17T06:18:12Z',
  data: { 'nmb-btn': 2 }
};

const errors = validators.searchErrors(payload);
if (errors.length > 0) {
  console.error('Errores de validación:', errors);
} else {
  console.log('Payload válido');
}
```

## Eventos soportados

- `rst`
- `hb`
- `button`
- `play_fin`
- `ack_ans`

## Notas

- El campo `time` debe estar en formato ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) y no tener más de 60 segundos de diferencia con el tiempo actual del servidor.
- Para el evento `button`, el campo `data.nmb-btn` debe ser un número entero entre 1 y 5.
- Para el evento `play_fin`, el campo `data.track` debe ser un número entre 1 y 500.

---