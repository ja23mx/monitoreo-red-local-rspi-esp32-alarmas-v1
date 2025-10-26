# 📖 Guía de Usuario - Telegram Bot

> Guía completa de uso del bot de Telegram para gestión de tareas programadas y monitoreo de eventos.

---

## 📋 Tabla de Contenidos

- [Introducción](#-introducción)
- [Primeros Pasos](#-primeros-pasos)
- [Comandos Principales](#-comandos-principales)
- [Gestión de Tareas](#-gestión-de-tareas)
- [Pruebas Manuales](#-pruebas-manuales)
- [Notificaciones](#-notificaciones)
- [Casos de Uso Comunes](#-casos-de-uso-comunes)
- [Preguntas Frecuentes](#-preguntas-frecuentes)
- [Solución de Problemas](#-solución-de-problemas)

---

## 👋 Introducción

El bot de Telegram te permite:

- 📝 **Crear y gestionar tareas programadas** de reproducción de audio
- ⏰ **Programar ejecuciones automáticas** a horas específicas
- 🔊 **Ejecutar tests manuales** de audio cuando lo necesites
- 📊 **Monitorear el estado** del sistema en tiempo real
- 🚨 **Recibir alertas** de eventos del botón de pánico

---

## 🚀 Primeros Pasos

### 1. Encontrar el Bot

1. Abre Telegram en tu dispositivo
2. Busca el bot por su nombre de usuario (proporcionado por el administrador)
3. Presiona "Iniciar" o envía `/start`

### 2. Verificar Acceso

Al enviar `/start`, deberías recibir:

```
👋 Bienvenido [Tu Nombre]

Soy el bot de gestión de tareas programadas para el sistema de monitoreo.

📋 Comandos disponibles:
/creartarea - Crear nueva tarea
/listartareas - Ver todas las tareas
/testmanual - Ejecutar test de audio
/status - Ver estado del sistema
/ayuda - Mostrar esta ayuda

💡 Usa /creartarea para comenzar
```

**Si no recibes respuesta:**
- Verifica que tu usuario esté autorizado
- Contacta al administrador del sistema

### 3. Obtener Ayuda

En cualquier momento puedes enviar:
```
/ayuda
```

Para ver la lista completa de comandos y ejemplos de uso.

---

## 📝 Comandos Principales

### `/start` - Iniciar Conversación

**Cuándo usar:** Primera vez que usas el bot o necesitas ver comandos básicos.

**Ejemplo:**
```
/start
```

**Respuesta:** Mensaje de bienvenida con lista de comandos.

---

### `/ayuda` o `/help` - Ayuda Completa

**Cuándo usar:** Necesitas recordar formatos de mensajes o comandos disponibles.

**Ejemplo:**
```
/ayuda
```

**Respuesta:** Guía completa de comandos con ejemplos de formato.

---

### `/status` - Estado del Sistema

**Cuándo usar:** Verificar que el sistema esté funcionando correctamente.

**Ejemplo:**
```
/status
```

**Respuesta:**
```
📊 Estado del Sistema

TaskSystem: ✅ Activo
⏱️ Uptime: 2d 5h 30m
📋 Tareas totales: 5
✅ Tareas habilitadas: 3
❌ Tareas deshabilitadas: 2
🎯 Última ejecución: 25/10/2025 08:00

Próxima tarea:
📌 Prueba Vespertino
🕐 18:30
```

**Información mostrada:**
- ✅ Estado del TaskSystem (Activo/Detenido)
- ⏱️ Tiempo de funcionamiento continuo
- 📋 Cantidad total de tareas
- ✅ Tareas activas
- ❌ Tareas deshabilitadas
- 🎯 Última tarea ejecutada
- 📌 Próxima tarea programada

---

## 📋 Gestión de Tareas

### Crear Nueva Tarea

#### Paso 1: Iniciar Creación

Envía el comando:
```
/creartarea
```

Recibirás las instrucciones:
```
📝 Crear Nueva Tarea

Envía un mensaje con el siguiente formato:

`*nombre*HH:MM*track##`

Campos:
• nombre - Nombre descriptivo de la tarea
• HH:MM - Hora de ejecución (formato 24h)
• track - Número de pista de audio (0-999)

Ejemplos:
`*Prueba Matutina*08:00*15##`
`*Test Vespertino*18:30*25##`

⚠️ El mensaje debe terminar con ##
```

#### Paso 2: Enviar Datos

Envía un mensaje con el formato indicado:

**Ejemplo 1: Prueba matutina**
```
*Prueba Mañana*08:00*15##
```

**Ejemplo 2: Test vespertino**
```
*Test Tarde*18:30*25##
```

**Ejemplo 3: Verificación nocturna**
```
*Check Noche*22:00*5##
```

#### Paso 3: Confirmación

Recibirás confirmación:
```
✅ Tarea Creada Exitosamente

📌 Nombre: Prueba Mañana
🕐 Hora: 08:00
🎵 Pista: 15
🆔 ID: `audio_test_1`
✅ Estado: Habilitada

La tarea se ejecutará automáticamente todos los días a las 08:00

_Usa /listartareas para ver todas las tareas_
```

#### Reglas Importantes

**Nombre de la tarea:**
- ✅ Entre 1 y 50 caracteres
- ✅ Puede incluir espacios
- ✅ Descriptivo y único

**Hora:**
- ✅ Formato 24 horas: `HH:MM`
- ✅ Hora: `00` a `23`
- ✅ Minutos: `00` a `59`
- ❌ No usar formato 12h (AM/PM)

**Track (Pista):**
- ✅ Número entre `0` y `999`
- ✅ Debe existir el archivo de audio correspondiente

**Terminador:**
- ✅ **Siempre** terminar con `##`
- ❌ Sin espacios antes de `##`

---

### Listar Tareas

#### Ver Todas las Tareas

Envía:
```
/listartareas
```

Recibirás:
```
📋 Lista de Tareas (3)

1. ✅ Prueba Matutina
   🕐 08:00 | 🎵 Pista 15
   🆔 `audio_test_1`

2. ❌ Test Vespertino
   🕐 18:30 | 🎵 Pista 25
   🆔 `audio_test_2`

3. ✅ Prueba Nocturna
   🕐 22:00 | 🎵 Pista 30
   🆔 `audio_test_3`

_Selecciona una tarea para ver opciones_
```

**Leyenda:**
- ✅ = Tarea habilitada (se ejecutará)
- ❌ = Tarea deshabilitada (no se ejecutará)

#### Botones de Acción

Cada tarea tiene botones inline:

**Botón de nombre:** Muestra detalles de la tarea

**Botones de gestión (por número):**
- **✏️ 1** - Editar tarea 1
- **🔴 1** - Deshabilitar tarea 1 (si está habilitada)
- **🟢 1** - Habilitar tarea 1 (si está deshabilitada)
- **🗑️ 1** - Eliminar tarea 1

---

### Editar Tarea

#### Paso 1: Seleccionar Tarea

1. Envía `/listartareas`
2. Presiona el botón **✏️** de la tarea que quieres editar

#### Paso 2: Recibir Instrucciones

Recibirás:
```
✏️ Editar Tarea

Tarea actual:
📌 Prueba Matutina
🕐 08:00
🎵 Pista: 15
✅ habilitada

Envía los nuevos datos con formato:
`*nombre*HH:MM*pista:track*estado##`

Ejemplo:
`*Prueba Matutina*08:00*pista:15*habilitada##`

Estados válidos: habilitada | deshabilitada
⚠️ El mensaje debe terminar con ##
```

#### Paso 3: Enviar Nuevos Datos

**Ejemplo: Cambiar hora y pista**
```
*Prueba Matutina*09:30*pista:20*habilitada##
```

**Ejemplo: Cambiar nombre y deshabilitar**
```
*Prueba Modificada*08:00*pista:15*deshabilitada##
```

**Ejemplo: Solo cambiar estado**
```
*Prueba Matutina*08:00*pista:15*deshabilitada##
```

#### Paso 4: Confirmación

```
✅ Tarea Actualizada

📌 Nombre: Prueba Matutina
🕐 Hora: 09:30
🎵 Pista: 20
✅ Estado: Habilitada

_Usa /listartareas para ver todas las tareas_
```

---

### Habilitar/Deshabilitar Tarea

#### Método Rápido (Botones)

1. Envía `/listartareas`
2. Presiona el botón **🟢** (habilitar) o **🔴** (deshabilitar)
3. La tarea cambia de estado inmediatamente

**Estados:**
- **🟢 Habilitar:** Tarea se ejecutará automáticamente
- **🔴 Deshabilitar:** Tarea NO se ejecutará (pero se mantiene)

---

### Eliminar Tarea

#### Paso 1: Seleccionar para Eliminar

1. Envía `/listartareas`
2. Presiona el botón **🗑️** de la tarea a eliminar

#### Paso 2: Confirmar Eliminación

Recibirás:
```
⚠️ Confirmar Eliminación

¿Estás seguro de eliminar esta tarea?

📌 Nombre: Prueba Matutina
🕐 Hora: 08:00
🎵 Pista: 15

⚠️ Esta acción no se puede deshacer

[✅ Confirmar] [❌ Cancelar]
```

#### Paso 3: Confirmar o Cancelar

- **✅ Confirmar:** Elimina la tarea permanentemente
- **❌ Cancelar:** Cancela la operación

#### Paso 4: Confirmación Final

Si confirmas:
```
✅ Tarea Eliminada

La tarea "Prueba Matutina" ha sido eliminada exitosamente.
```

**⚠️ IMPORTANTE:** La eliminación es permanente y no se puede deshacer.

---

## 🔊 Pruebas Manuales

### Ejecutar Test de Audio

Los tests manuales permiten reproducir audio inmediatamente sin esperar tareas programadas.

#### Paso 1: Iniciar Test

Envía:
```
/testmanual
```

Recibirás:
```
🔊 Test Manual de Audio

Envía el número de pista a reproducir:

`*track##`

Ejemplos:
`*15##` - Reproducir pista 15
`*25##` - Reproducir pista 25

Rango válido: 0 - 999
⚠️ El mensaje debe terminar con ##
```

#### Paso 2: Enviar Número de Pista

**Ejemplo 1: Reproducir pista 15**
```
*15##
```

**Ejemplo 2: Reproducir pista 25**
```
*25##
```

**Ejemplo 3: Reproducir pista 100**
```
*100##
```

#### Paso 3: Confirmación

```
✅ Test Manual Ejecutado

🎵 Pista reproducida: 15
🕐 Hora: 14:30:15

El audio fue enviado a todos los dispositivos conectados.
```

**¿Qué sucede?**
- El audio se reproduce **inmediatamente**
- Se envía a **todos los dispositivos** conectados
- **No afecta** las tareas programadas
- Se **registra** en los logs del sistema

---

## 🔔 Notificaciones

### Alertas de Botón de Pánico

Cuando un dispositivo presiona el botón de pánico, recibirás una alerta automática en el grupo configurado:

```
🚨 ALERTA - Botón Presionado

📍 Dispositivo: ESP32_001
📌 Ubicación: Sala Principal
🔗 MAC: `EA:89:14:XX:XX:XX`
🕐 Hora: 25/10/2025 14:30:15

⚠️ Se requiere atención inmediata
```

**Información incluida:**
- 📍 **Dispositivo:** Nombre del ESP32
- 📌 **Ubicación:** Ubicación física configurada
- 🔗 **MAC:** Dirección MAC del dispositivo
- 🕐 **Hora:** Timestamp exacto del evento

**Características:**
- ✅ Notificación con **sonido**
- ✅ Enviada **inmediatamente**
- ✅ Al **grupo configurado**
- ✅ Información desde `alarmas.json`

---

## 💡 Casos de Uso Comunes

### Caso 1: Configurar Verificación Matutina

**Objetivo:** Reproducir pista de verificación todos los días a las 8:00 AM

**Pasos:**
1. Envía `/creartarea`
2. Envía `*Verificación Matutina*08:00*10##`
3. Confirma que la tarea fue creada

**Resultado:** Todos los días a las 8:00 AM se reproducirá la pista 10.

---

### Caso 2: Desactivar Tarea Temporalmente

**Objetivo:** No ejecutar tarea hoy, pero mantenerla para mañana

**Pasos:**
1. Envía `/listartareas`
2. Presiona botón **🔴** de la tarea
3. La tarea se deshabilita

**Mañana:**
1. Envía `/listartareas`
2. Presiona botón **🟢** de la tarea
3. La tarea se reactiva

---

### Caso 3: Probar Audio Antes de Programar

**Objetivo:** Verificar que la pista 25 funcione antes de crear tarea

**Pasos:**
1. Envía `/testmanual`
2. Envía `*25##`
3. Escucha el audio en los dispositivos
4. Si funciona, crea la tarea con `/creartarea`

---

### Caso 4: Cambiar Hora de Tarea Existente

**Objetivo:** Cambiar tarea de 8:00 a 9:30

**Pasos:**
1. Envía `/listartareas`
2. Presiona **✏️** de la tarea
3. Copia el formato mostrado
4. Modifica solo la hora: `*Nombre*09:30*pista:15*habilitada##`
5. Envía el mensaje

---

### Caso 5: Eliminar Tarea Obsoleta

**Objetivo:** Eliminar tarea que ya no se necesita

**Pasos:**
1. Envía `/listartareas`
2. Presiona **🗑️** de la tarea
3. Presiona **✅ Confirmar**
4. Tarea eliminada permanentemente

---

## ❓ Preguntas Frecuentes

### ¿Cuántas tareas puedo crear?

No hay límite establecido por el bot. El límite depende del sistema TaskSystem.

---

### ¿Las tareas se ejecutan en qué días?

**Todos los días** a la hora configurada. No hay configuración de días específicos actualmente.

---

### ¿Qué pasa si envío un formato incorrecto?

Recibirás un mensaje de error explicando qué está mal:

```
❌ El mensaje debe terminar con ##
```

```
❌ La hora debe estar entre 0 y 23
```

```
❌ El track debe estar entre 0 y 999
```

---

### ¿Puedo editar varias tareas a la vez?

No. Debes editar una tarea a la vez.

---

### ¿Qué sucede si el bot no responde?

**Verificar:**
1. ¿El bot está en ejecución?
2. ¿Tu usuario está autorizado?
3. ¿Hay errores en los logs?

Contacta al administrador del sistema.

---

### ¿Puedo ver el historial de ejecuciones?

Actualmente no a través del bot. El administrador puede revisar los logs del sistema.

---

### ¿Las notificaciones llegan aunque no esté en Telegram?

Sí, recibirás las notificaciones push de Telegram aunque la app esté cerrada (si tienes notificaciones habilitadas).

---

### ¿Puedo usar el bot desde varios dispositivos?

Sí, puedes usar Telegram (y el bot) desde múltiples dispositivos simultáneamente.

---

### ¿Qué diferencia hay entre deshabilitar y eliminar?

- **Deshabilitar:** La tarea se mantiene pero no se ejecuta. Puedes habilitarla después.
- **Eliminar:** La tarea se elimina permanentemente. Debes crearla nuevamente.

---

## 🔧 Solución de Problemas

### Problema: "Usuario no autorizado"

**Síntoma:** El bot no responde a tus mensajes

**Solución:**
1. Verifica que tu `chat_id` esté en `telegram-config.json`
2. Contacta al administrador para agregar tu usuario

---

### Problema: "Formato inválido"

**Síntoma:** Error al crear/editar tarea

**Solución:**
1. Verifica que uses asteriscos `*` para separar campos
2. Confirma que termine con `##`
3. Revisa los ejemplos en `/ayuda`

**Ejemplo correcto:**
```
*Nombre*08:00*15##
```

**Ejemplos incorrectos:**
```
*Nombre*08:00*15        ❌ Falta ##
Nombre*08:00*15##       ❌ Falta * inicial
*Nombre*08:00*15 ##     ❌ Espacio antes de ##
```

---

### Problema: "Track inválido"

**Síntoma:** Error: "El track debe estar entre 0 y 999"

**Solución:**
1. Usa un número entre 0 y 999
2. No uses letras ni caracteres especiales
3. Verifica que el archivo de audio exista

---

### Problema: "Hora inválida"

**Síntoma:** Error: "La hora debe estar entre 0 y 23"

**Solución:**
1. Usa formato 24 horas: `HH:MM`
2. Hora: `00` a `23`
3. Minutos: `00` a `59`

**Ejemplos correctos:**
```
08:00  ✅
18:30  ✅
23:59  ✅
00:00  ✅
```

**Ejemplos incorrectos:**
```
24:00  ❌ (usa 00:00)
8:30   ❌ (usa 08:30)
18:60  ❌ (minutos máximo 59)
```

---

### Problema: No recibo notificaciones del grupo

**Síntoma:** No llegan alertas de botón de pánico

**Solución:**
1. Verifica que estés en el grupo configurado
2. Verifica que el bot sea administrador del grupo
3. Revisa que `notification_group.enabled` sea `true`
4. Contacta al administrador

---

### Problema: Tarea no se ejecuta

**Síntoma:** Tarea programada no reproduce audio

**Solución:**
1. Verifica que la tarea esté **habilitada** (✅)
2. Envía `/status` para verificar que TaskSystem esté activo
3. Verifica que el archivo de audio exista
4. Revisa logs del sistema

---

### Problema: Bot lento o no responde

**Síntoma:** Respuestas tardías o sin respuesta

**Solución:**
1. Verifica conexión a internet
2. Verifica que el servidor esté funcionando
3. Contacta al administrador del sistema

---

## 📞 Soporte Adicional

Si tienes problemas no cubiertos en esta guía:

1. **Revisa los logs:** Pide al administrador revisar `telegram-bot.log`
2. **Verifica configuración:** Confirma tu usuario en `telegram-config.json`
3. **Contacta soporte:** 
   - **Desarrollador:** Jorge - Nexus Tech
   - **Cliente:** SLT
   - **Proyecto:** Sistema de Monitoreo Red Local

---

## 📚 Recursos Adicionales

### Documentación Técnica
- **[README.md](./README.md)** - Instalación y configuración
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura del sistema
- **[API-REFERENCE.md](./API-REFERENCE.md)** - Referencia de API
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Despliegue y mantenimiento

---

## 🎯 Consejos y Mejores Prácticas

### Nombres de Tareas

✅ **Buenas prácticas:**
- Nombres descriptivos: `Verificación Matutina`
- Incluir hora si ayuda: `Test 08:00`
- Mencionar pista: `Alarma Principal (Track 15)`

❌ **Evitar:**
- Nombres genéricos: `Tarea1`, `Test`
- Nombres muy largos (máximo 50 caracteres)
- Caracteres especiales innecesarios

---

### Gestión de Tareas

✅ **Recomendaciones:**
- Revisa `/status` periódicamente
- Usa `/listartareas` antes de crear duplicados
- Deshabilita en vez de eliminar si vas a reactivar
- Prueba con `/testmanual` antes de programar

---

### Notificaciones

✅ **Configuración:**
- Mantén notificaciones de Telegram activas
- Únete al grupo de alertas
- Configura sonidos para alertas importantes

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025