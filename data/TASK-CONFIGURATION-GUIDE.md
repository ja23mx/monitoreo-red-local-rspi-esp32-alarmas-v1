# Guía de Configuración - task-config.json

## 📋 Descripción General

El archivo `task-config.json` es el archivo central de configuración del Sistema de Tareas Programadas. Almacena todas las tareas, configuración global y metadata del sistema.

**Ubicación:** `/data/task-config.json`

**Formato:** JSON (JavaScript Object Notation)

**Gestión:** Automática vía `TaskConfigManager` (CRUD API)

---

## 🏗️ Estructura Completa

```json
{
  "tasks": {
    "audio_test_1": { /* Tarea 1 */ },
    "audio_test_2": { /* Tarea 2 */ }
  },
  "global_settings": { /* Configuración global */ },
  "metadata": { /* Información del sistema */ }
}
```

### Secciones Principales

1. **`tasks`** - Diccionario de tareas programadas (máx 10)
2. **`global_settings`** - Configuración global del sistema
3. **`metadata`** - Información de versión y estado

---

## 📦 Sección: tasks

Diccionario de tareas donde cada clave es el **ID único** de la tarea.

### Estructura de una Tarea

```json
{
  "tasks": {
    "audio_test_1": {
      "id": "audio_test_1",
      "name": "Prueba Matutina",
      "enabled": true,
      "schedule": {
        "hour": 8,
        "minute": 0,
        "timezone": "America/Mexico_City"
      },
      "action": {
        "type": "mqtt_broadcast",
        "topic": "SYSTEM/BROADCAST",
        "payload": {
          "event": "play_track",
          "track": 11
        }
      },
      "tolerance_minutes": 5,
      "createdAt": "2025-10-25T20:00:00.000Z",
      "lastExecution": null,
      "nextExecution": null
    }
  }
}
```

### Campos de Tarea

#### `id` (String) - **Requerido**
Identificador único de la tarea.

**Formato:** `audio_test_N` donde N = 1-10

**Características:**
- Auto-generado por el sistema
- Inmutable (no se modifica)
- Reutilizable después de eliminar tarea

**Ejemplos:**
```json
"id": "audio_test_1"
"id": "audio_test_5"
"id": "audio_test_10"
```

---

#### `name` (String) - **Requerido**
Nombre descriptivo de la tarea.

**Restricciones:**
- Longitud: 3-50 caracteres
- Único (no duplicados)
- Letras, números, espacios, guiones

**Ejemplos válidos:**
```json
"name": "Prueba Matutina"
"name": "Test Mediodía - Lunes"
"name": "Verificación Diaria 20:00"
```

**Ejemplos inválidos:**
```json
"name": "AB"                    // Muy corto (< 3 caracteres)
"name": "Prueba Matutina"       // Duplicado (ya existe)
"name": "Test@#$%"              // Caracteres especiales no permitidos
```

---

#### `enabled` (Boolean) - **Requerido**
Estado de la tarea (activa/inactiva).

**Valores:**
- `true` - Tarea habilitada (se ejecutará automáticamente)
- `false` - Tarea deshabilitada (no se ejecutará)

**Uso típico:**
```json
// Activar tarea
"enabled": true

// Desactivar temporalmente sin eliminar
"enabled": false
```

**Comportamiento:**
- Tareas con `enabled: false` **NO se ejecutan** automáticamente
- Se pueden ejecutar manualmente con `executeTask()`
- No se incluyen en `getNextExecutions()`

---

#### `schedule` (Object) - **Requerido**
Configuración de horario de ejecución.

**Estructura:**
```json
"schedule": {
  "hour": 8,
  "minute": 0,
  "timezone": "America/Mexico_City"
}
```

##### `hour` (Number) - **Requerido**
Hora de ejecución (formato 24 horas).

**Rango:** 0-23

**Ejemplos:**
```json
"hour": 0     // 12:00 AM (medianoche)
"hour": 8     // 08:00 AM
"hour": 12    // 12:00 PM (mediodía)
"hour": 20    // 08:00 PM
"hour": 23    // 11:00 PM
```

##### `minute` (Number) - **Requerido**
Minuto de ejecución.

**Rango:** 0-59

**Ejemplos:**
```json
"minute": 0     // En punto
"minute": 15    // :15
"minute": 30    // :30
"minute": 45    // :45
```

##### `timezone` (String) - **Requerido**
Zona horaria de referencia.

**Valor fijo:** `"America/Mexico_City"` (UTC-6)

**Importante:**
- ⚠️ **NO modificar** este campo
- El sistema está calibrado para CDMX/UTC-6
- Cambiar puede causar ejecuciones incorrectas

---

#### `action` (Object) - **Requerido**
Acción a ejecutar cuando se dispare la tarea.

**Estructura:**
```json
"action": {
  "type": "mqtt_broadcast",
  "topic": "SYSTEM/BROADCAST",
  "payload": {
    "event": "play_track",
    "track": 11
  }
}
```

##### `type` (String) - **Requerido**
Tipo de acción a ejecutar.

**Valor fijo:** `"mqtt_broadcast"`

**Descripción:**
- Publica mensaje MQTT broadcast
- Todos los dispositivos ESP32 conectados reciben el comando

##### `topic` (String) - **Requerido**
Topic MQTT donde se publicará el mensaje.

**Valor fijo:** `"SYSTEM/TEST"`

**Descripción:**
- Topic especial para comandos de prueba
- Broadcast a todos los nodos (`dsp: "all"`)

##### `payload` (Object) - **Requerido**
Contenido del mensaje MQTT.

**Estructura:**
```json
"payload": {
  "event": "play_track",
  "track": 11
}
```

###### `event` (String) - **Requerido**
Tipo de evento a ejecutar.

**Valor fijo:** `"play_track"`

**Descripción:**
- Comando para reproducir pista de audio
- Interpretado por firmware ESP32

###### `track` (Number) - **Requerido**
Número de pista de audio a reproducir.

**Rango:** 0-999

**Valores típicos:**
```json
"track": 11    // Track de prueba por defecto
"track": 15    // Track personalizado
"track": 20    // Otro track
```

**Recomendación:**
- Tracks 11-30: Pruebas automáticas
- Tracks 31-50: Pruebas manuales
- Tracks 51+: Reservados para futuro

---

#### `tolerance_minutes` (Number) - **Requerido**
Ventana de tiempo para ejecutar la tarea después de la hora programada.

**Rango:** 1-60 (recomendado: 5)

**Descripción:**
- Tiempo en minutos que el sistema esperará para ejecutar
- Útil si el sistema se reinicia cerca de la hora programada
- Previene perder ejecuciones por segundos de diferencia

**Ejemplo con tolerancia de 5 minutos:**
```
Tarea programada: 08:00
Tolerancia: 5 minutos

Ventana de ejecución: 08:00 - 08:05

08:00:00 → Ejecutar ✅
08:02:30 → Ejecutar ✅ (dentro de tolerancia)
08:05:00 → Ejecutar ✅ (último minuto)
08:06:00 → NO ejecutar ❌ (fuera de tolerancia)
```

**Configuración recomendada:**
```json
"tolerance_minutes": 5    // Default (recomendado)
"tolerance_minutes": 3    // Conservadora
"tolerance_minutes": 10   // Flexible
```

---

#### `createdAt` (String) - **Requerido**
Timestamp de creación de la tarea.

**Formato:** ISO 8601 (UTC)

**Generación:** Automática al crear tarea

**Ejemplo:**
```json
"createdAt": "2025-10-25T20:00:00.000Z"
```

**Descripción:**
- `2025-10-25` - Fecha (YYYY-MM-DD)
- `T` - Separador
- `20:00:00.000` - Hora UTC (HH:MM:SS.mmm)
- `Z` - Indicador de zona UTC

---

#### `lastExecution` (String | null)
Timestamp de última ejecución exitosa.

**Formato:** ISO 8601 (UTC)

**Valores:**
- `null` - Nunca ejecutada
- `"2025-10-25T08:00:15.234Z"` - Última ejecución

**Actualización:** Automática después de cada ejecución exitosa

**Ejemplo:**
```json
// Tarea nunca ejecutada
"lastExecution": null

// Tarea ejecutada hoy a las 08:00
"lastExecution": "2025-10-25T08:00:15.234Z"
```

**Uso:**
- Prevenir ejecuciones duplicadas el mismo día
- Auditoría de ejecuciones
- Debugging

---

#### `nextExecution` (String | null)
Próxima ejecución calculada (informativo).

**Formato:** ISO 8601 (UTC) o `null`

**Cálculo:** Automático por TaskScheduler

**Ejemplo:**
```json
"nextExecution": null    // Se calcula dinámicamente
```

**Nota:** Este campo **NO se usa** para la lógica de ejecución. Es solo informativo y puede estar desactualizado en el archivo.

---

## ⚙️ Sección: global_settings

Configuración global del sistema de tareas.

```json
{
  "global_settings": {
    "enabled": true,
    "check_interval_ms": 60000,
    "timezone": "America/Mexico_City",
    "max_tasks": 10,
    "default_track": 11,
    "default_tolerance_minutes": 5
  }
}
```

### Campos de Configuración Global

#### `enabled` (Boolean)
Habilitar/deshabilitar sistema completo.

**Valores:**
- `true` - Sistema activo (todas las tareas se evalúan)
- `false` - Sistema inactivo (ninguna tarea se ejecuta)

**Uso típico:**
```json
// Activar sistema
"enabled": true

// Desactivar temporalmente todo el sistema
"enabled": false
```

**Efecto:**
- Si `false`, **ninguna tarea se ejecuta** (incluso si `task.enabled: true`)
- Útil para mantenimiento o emergencias

---

#### `check_interval_ms` (Number)
Intervalo de evaluación del scheduler (milisegundos).

**Valor recomendado:** `60000` (60 segundos = 1 minuto)

**Rango:** 30000-300000 (30s - 5min)

**Descripción:**
- Cada N milisegundos, el scheduler verifica si debe ejecutar tareas
- Menor intervalo = mayor precisión, más consumo CPU
- Mayor intervalo = menor precisión, menos consumo CPU

**Configuraciones:**
```json
"check_interval_ms": 60000    // 1 minuto (recomendado)
"check_interval_ms": 30000    // 30 segundos (preciso)
"check_interval_ms": 120000   // 2 minutos (conservador)
```

**⚠️ Advertencia:** No usar valores < 30000 (sobrecarga del sistema)

---

#### `timezone` (String)
Zona horaria del sistema.

**Valor fijo:** `"America/Mexico_City"` (UTC-6)

**⚠️ IMPORTANTE:**
- **NO modificar** este campo
- El sistema está calibrado para CDMX
- Horario de verano se maneja automáticamente

---

#### `max_tasks` (Number)
Límite máximo de tareas simultáneas.

**Valor fijo:** `10`

**Descripción:**
- Máximo número de tareas que pueden existir
- Validación automática al crear tareas
- Límite de seguridad para prevenir sobrecarga

**⚠️ Advertencia:** No modificar este valor sin consultar al desarrollador.

---

#### `default_track` (Number)
Track de audio por defecto para nuevas tareas.

**Valor recomendado:** `11`

**Rango:** 0-999

**Descripción:**
- Track usado si no se especifica al crear tarea
- Puede ser sobreescrito por tarea individual

**Configuración:**
```json
"default_track": 11    // Track de prueba estándar
```

---

#### `default_tolerance_minutes` (Number)
Tolerancia por defecto para nuevas tareas.

**Valor recomendado:** `5`

**Rango:** 1-60

**Descripción:**
- Tolerancia usada si no se especifica al crear tarea
- Puede ser sobreescrita por tarea individual

---

## 📊 Sección: metadata

Información del sistema y estadísticas.

```json
{
  "metadata": {
    "version": "2.0.0",
    "lastModified": "2025-10-25T21:07:58.200Z",
    "taskCount": 2
  }
}
```

### Campos de Metadata

#### `version` (String)
Versión del formato de configuración.

**Valor actual:** `"2.0.0"`

**Actualización:** Automática al guardar

**Uso:**
- Compatibilidad futura
- Migraciones de esquema

---

#### `lastModified` (String)
Timestamp de última modificación del archivo.

**Formato:** ISO 8601 (UTC)

**Actualización:** Automática en cada guardado

**Ejemplo:**
```json
"lastModified": "2025-10-25T21:07:58.200Z"
```

---

#### `taskCount` (Number)
Número total de tareas configuradas.

**Rango:** 0-10

**Actualización:** Automática al crear/eliminar tareas

**Uso:**
- Validación de límite
- Estadísticas rápidas

---

## 📝 Ejemplo Completo - Configuración con 3 Tareas

```json
{
  "tasks": {
    "audio_test_1": {
      "id": "audio_test_1",
      "name": "Prueba Matutina",
      "enabled": true,
      "schedule": {
        "hour": 8,
        "minute": 0,
        "timezone": "America/Mexico_City"
      },
      "action": {
        "type": "mqtt_broadcast",
        "topic": "SYSTEM/BROADCAST",
        "payload": {
          "event": "play_track",
          "track": 11
        }
      },
      "tolerance_minutes": 5,
      "createdAt": "2025-10-25T20:00:00.000Z",
      "lastExecution": "2025-10-25T08:00:15.234Z",
      "nextExecution": null
    },
    "audio_test_2": {
      "id": "audio_test_2",
      "name": "Prueba Mediodía",
      "enabled": true,
      "schedule": {
        "hour": 12,
        "minute": 30,
        "timezone": "America/Mexico_City"
      },
      "action": {
        "type": "mqtt_broadcast",
        "topic": "SYSTEM/BROADCAST",
        "payload": {
          "event": "play_track",
          "track": 15
        }
      },
      "tolerance_minutes": 5,
      "createdAt": "2025-10-25T21:00:00.000Z",
      "lastExecution": null,
      "nextExecution": null
    },
    "audio_test_3": {
      "id": "audio_test_3",
      "name": "Prueba Vespertina",
      "enabled": false,
      "schedule": {
        "hour": 20,
        "minute": 0,
        "timezone": "America/Mexico_City"
      },
      "action": {
        "type": "mqtt_broadcast",
        "topic": "SYSTEM/BROADCAST",
        "payload": {
          "event": "play_track",
          "track": 11
        }
      },
      "tolerance_minutes": 5,
      "createdAt": "2025-10-25T20:00:00.000Z",
      "lastExecution": null,
      "nextExecution": null
    }
  },
  "global_settings": {
    "enabled": true,
    "check_interval_ms": 60000,
    "timezone": "America/Mexico_City",
    "max_tasks": 10,
    "default_track": 11,
    "default_tolerance_minutes": 5
  },
  "metadata": {
    "version": "2.0.0",
    "lastModified": "2025-10-25T21:07:58.200Z",
    "taskCount": 3
  }
}
```

---

## ✅ Validaciones del Sistema

### Validaciones Automáticas

El sistema valida automáticamente:

#### Estructura de Archivo
- ✅ JSON válido (sintaxis correcta)
- ✅ Sección `tasks` presente
- ✅ Sección `global_settings` presente
- ✅ Sección `metadata` presente

#### Validaciones de Tareas
- ✅ Nombre único (no duplicados)
- ✅ Nombre entre 3-50 caracteres
- ✅ Horario único (no 2 tareas a la misma hora)
- ✅ Hora en rango 0-23
- ✅ Minuto en rango 0-59
- ✅ Track en rango 0-999
- ✅ Tolerancia en rango 1-60
- ✅ Máximo 10 tareas

#### Validaciones de Tipos
- ✅ `enabled` es booleano
- ✅ `hour`, `minute`, `track` son números
- ✅ `name` es string
- ✅ Timestamps en formato ISO 8601

---

## 🔧 Edición Manual (Avanzado)

### ⚠️ Advertencias

**NO se recomienda** editar manualmente `task-config.json` porque:
- Riesgo de romper sintaxis JSON
- Validaciones solo ocurren al cargar
- Sin backup automático
- Posible pérdida de datos

**Recomendación:** Usar API CRUD de TaskSystem

---

### Si decides editar manualmente:

#### 1. **Hacer backup primero**
```bash
cp task-config.json task-config.json.backup
```

#### 2. **Usar editor con validación JSON**
- Visual Studio Code
- Sublime Text
- Notepad++ (con plugin JSON)

#### 3. **Validar sintaxis antes de guardar**
```bash
# Validar JSON
cat task-config.json | python -m json.tool
```

#### 4. **Reiniciar sistema para cargar cambios**
```javascript
await taskSystem.reloadConfig();
```

---

### Cambios Seguros por Editor

#### Habilitar/Deshabilitar Tarea
```json
// Antes
"enabled": true

// Después
"enabled": false
```

#### Cambiar Track
```json
// Antes
"track": 11

// Después
"track": 20
```

#### Cambiar Horario
```json
// Antes
"hour": 8,
"minute": 0

// Después
"hour": 9,
"minute": 30
```

#### ⚠️ Validar que no colisione con otra tarea:
```bash
# Buscar horarios duplicados
grep -A 2 '"hour": 9' task-config.json | grep '"minute": 30'
```

---

## 🔍 Troubleshooting

### Problema: Sistema no ejecuta tareas

**Verificar:**
1. `global_settings.enabled` = `true`
2. Tarea específica `enabled` = `true`
3. Horario correcto (zona horaria CDMX)
4. Cliente MQTT conectado

**Comando de diagnóstico:**
```javascript
const status = taskSystem.getStatus();
console.log(status);
```

---

### Problema: Error al cargar configuración

**Posibles causas:**
1. JSON inválido (sintaxis)
2. Archivo no existe
3. Permisos de lectura

**Solución:**
```bash
# Validar JSON
cat task-config.json | python -m json.tool

# Verificar permisos
ls -la task-config.json

# Restaurar desde backup
cp task-config.json.backup task-config.json
```

---

### Problema: Configuración por defecto se carga siempre

**Causa:** Archivo `task-config.json` no existe o tiene errores graves

**Solución:**
1. Verificar ruta: `/data/task-config.json`
2. Validar sintaxis JSON
3. Permitir que el sistema cree uno nuevo (eliminar archivo corrupto)

---

## 📚 Documentación Relacionada

- **Overview del Sistema:** [/backend/task-services/TASK-SYSTEM-README.md](../backend/task-services/TASK-SYSTEM-README.md)
- **API Completa:** [/backend/task-services/TASK-API-REFERENCE.md](../backend/task-services/TASK-API-REFERENCE.md)
- **Protocolo MQTT:** [/backend/task-services/TASK-MQTT-PROTOCOL.md](../backend/task-services/TASK-MQTT-PROTOCOL.md)
- **Guía de Testing:** [/backend/task-services/TASK-TESTING-GUIDE.md](../backend/task-services/TASK-TESTING-GUIDE.md)
- **FAQ:** [/docs/TASK-FAQ.md](../docs/TASK-FAQ.md)

---

**Versión:** 2.0.0  
**Última actualización:** Octubre 2025  
**Sistema de Monitoreo Local - Nexus Tech**