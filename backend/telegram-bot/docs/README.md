# 📱 Telegram Bot - Sistema de Gestión de Tareas Programadas

> Bot de Telegram para gestionar tareas de reproducción de audio programadas y recibir notificaciones de eventos del sistema de monitoreo.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Características Principales](#-características-principales)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Configuración Inicial](#-configuración-inicial)
- [Inicio Rápido](#-inicio-rápido)
- [Comandos Disponibles](#-comandos-disponibles)
- [Formato de Mensajes](#-formato-de-mensajes)
- [Notificaciones Automáticas](#-notificaciones-automáticas)
- [Documentación Adicional](#-documentación-adicional)

---

## 🎯 Descripción General

Este bot de Telegram permite a usuarios autorizados:

- **Crear y gestionar tareas programadas** de reproducción de audio
- **Ejecutar tests manuales** de audio en dispositivos conectados
- **Recibir notificaciones en tiempo real** de eventos del sistema (botón de pánico)
- **Monitorear el estado** del TaskSystem y dispositivos

El bot se integra completamente con:
- **TaskSystem**: Sistema de tareas programadas basado en cron
- **MQTT Broker**: Para eventos de dispositivos IoT
- **Alarmas.json**: Base de datos de dispositivos registrados

---

## ✨ Características Principales

### 🔐 Control de Acceso
- Autenticación por `chat_id` de Telegram
- Roles diferenciados: `admin` y `operator`
- Lista de usuarios autorizados configurable

### 📋 Gestión de Tareas
- **Crear** tareas con horario y pista de audio
- **Listar** todas las tareas programadas
- **Editar** tareas existentes (hora, pista, estado)
- **Habilitar/Deshabilitar** tareas individualmente
- **Eliminar** tareas con confirmación

### 🔊 Control de Audio
- **Ejecución manual** de pistas de audio
- Soporte para 1000 pistas (0-999)
- Reproducción simultánea en todos los dispositivos

### 📢 Notificaciones
- **Alertas de botón de pánico** al grupo configurado
- Información detallada del dispositivo (nombre, ubicación, MAC)
- Timestamp preciso de eventos
- Notificaciones con sonido

### 📊 Monitoreo
- Estado del TaskSystem (activo/detenido)
- Uptime del sistema
- Estadísticas de tareas
- Próxima tarea programada

---

## 📦 Requisitos

### Software
- **Node.js**: v14.0.0 o superior
- **npm**: v6.0.0 o superior
- **Raspberry Pi OS** o sistema Linux compatible

### Dependencias
```json
{
  "node-telegram-bot-api": "^0.64.0"
}
```

### Servicios Externos
- **Bot de Telegram**: Token obtenido de [@BotFather](https://t.me/BotFather)
- **MQTT Broker**: Mosquitto configurado y en ejecución
- **TaskSystem**: Sistema de tareas programadas activo

---

## 🚀 Instalación

### 1. Instalar Dependencias

```bash
cd backend/telegram-bot
npm install node-telegram-bot-api
```

### 2. Verificar Estructura de Carpetas

```
backend/
├── telegram-bot/
│   ├── telegram-bot-manager.js
│   ├── index.js
│   ├── handlers/
│   ├── services/
│   ├── utils/
│   └── docs/
├── data/
│   ├── telegram-config.json    # ← Configuración del bot
│   ├── alarmas.json
│   └── tareas.json
└── logs/
    └── telegram-bot.log        # ← Se crea automáticamente
```

### 3. Crear Bot en Telegram

1. Abrir [@BotFather](https://t.me/BotFather) en Telegram
2. Enviar comando `/newbot`
3. Seguir instrucciones (nombre y username)
4. **Guardar el token** que proporciona BotFather

Ejemplo de token:
```
8421143353:AAH0erRNncqFxMdmCFPh_ypVwRuQi3hOTQU
```

---

## ⚙️ Configuración Inicial

### 1. Configurar `telegram-config.json`

Editar el archivo `backend/data/telegram-config.json`:

```json
{
  "bot_token": "TU_TOKEN_DE_BOTFATHER",
  "authorized_users": [
    {
      "chat_id": TU_CHAT_ID,
      "name": "Tu Nombre",
      "role": "admin"
    }
  ],
  "notification_group": {
    "enabled": true,
    "chat_id": CHAT_ID_DEL_GRUPO,
    "name": "Grupo Alertas"
  },
  "settings": {
    "polling": true,
    "webhook": false,
    "webhook_url": "",
    "polling_interval": 300,
    "timezone": "America/Mexico_City"
  }
}
```

### 2. Obtener tu Chat ID

**Opción A: Usando el bot @userinfobot**
1. Buscar [@userinfobot](https://t.me/userinfobot) en Telegram
2. Enviar `/start`
3. Copiar el número de `Id`

**Opción B: Desde logs del bot**
1. Iniciar el bot temporalmente
2. Enviar `/start` a tu bot
3. Ver logs en `backend/logs/telegram-bot.log`
4. Buscar el `chat_id` en los logs

### 3. Configurar Grupo de Notificaciones (Opcional)

1. Crear grupo en Telegram
2. Agregar tu bot al grupo
3. Hacer al bot administrador (para enviar mensajes)
4. Obtener `chat_id` del grupo:
   - Enviar `/start` en el grupo
   - Ver logs del bot
   - El `chat_id` del grupo es **negativo** (ej: `-1001234567890`)
5. Actualizar `telegram-config.json` con el `chat_id` del grupo

---

## 🎬 Inicio Rápido

### Iniciar el Bot

```bash
# Desde el directorio principal del proyecto
node backend/telegram-bot/index.js
```

O si usas el sistema completo:
```bash
# Inicia todo el sistema incluyendo el bot
npm start
```

### Verificar que Funciona

1. Abrir Telegram
2. Buscar tu bot por su `@username`
3. Enviar `/start`
4. Deberías recibir mensaje de bienvenida:

```
👋 Bienvenido Jorge

Soy el bot de gestión de tareas programadas para el sistema de monitoreo.

📋 Comandos disponibles:
/creartarea - Crear nueva tarea
/listartareas - Ver todas las tareas
/testmanual - Ejecutar test de audio
/status - Ver estado del sistema
/ayuda - Mostrar esta ayuda

💡 Usa /creartarea para comenzar
```

---

## 📝 Comandos Disponibles

### `/start`
Muestra mensaje de bienvenida y comandos disponibles.

**Uso:**
```
/start
```

---

### `/ayuda` o `/help`
Muestra guía completa de comandos y formatos.

**Uso:**
```
/ayuda
```

**Respuesta:**
```
📚 Guía de Comandos

Gestión de Tareas:
/creartarea - Crear nueva tarea programada
/listartareas - Ver lista de todas las tareas

Ejecución:
/testmanual - Ejecutar test de audio manual

Sistema:
/status - Ver estado del sistema
/ayuda - Mostrar esta ayuda

📝 Formato para crear tarea:
`*nombre*HH:MM*track##`
```

---

### `/creartarea`
Inicia el proceso para crear una nueva tarea programada.

**Uso:**
```
/creartarea
```

**Respuesta:**
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

**Luego enviar:**
```
*Prueba Tarde*15:30*20##
```

**Confirmación:**
```
✅ Tarea Creada Exitosamente

📌 Nombre: Prueba Tarde
🕐 Hora: 15:30
🎵 Pista: 20
🆔 ID: `audio_test_1`
✅ Estado: Habilitada

La tarea se ejecutará automáticamente todos los días a las 15:30
```

---

### `/listartareas`
Muestra todas las tareas programadas con opciones de gestión.

**Uso:**
```
/listartareas
```

**Respuesta:**
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

Con botones inline:
- **✏️** Editar
- **🟢/🔴** Habilitar/Deshabilitar
- **🗑️** Eliminar

---

### `/testmanual`
Ejecuta una reproducción de audio inmediata en todos los dispositivos.

**Uso:**
```
/testmanual
```

**Respuesta:**
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

**Luego enviar:**
```
*25##
```

**Confirmación:**
```
✅ Test Manual Ejecutado

🎵 Pista reproducida: 25
🕐 Hora: 14:30:15

El audio fue enviado a todos los dispositivos conectados.
```

---

### `/status`
Muestra el estado actual del sistema.

**Uso:**
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

---

## 📨 Formato de Mensajes

### Crear Tarea
```
*nombre*HH:MM*track##
```

**Ejemplos:**
```
*Prueba Mañana*08:00*15##
*Test Tarde*15:30*20##
*Verificación Noche*22:00*5##
```

**Reglas:**
- ✅ Nombre: 1-50 caracteres
- ✅ Hora: 00-23
- ✅ Minuto: 00-59
- ✅ Track: 0-999
- ✅ Debe terminar con `##`

---

### Editar Tarea
```
*nombre*HH:MM*pista:track*estado##
```

**Ejemplos:**
```
*Prueba Editada*12:00*pista:15*habilitada##
*Test Modificado*09:30*pista:5*deshabilitada##
```

**Estados válidos:**
- `habilitada`
- `deshabilitada`

---

### Test Manual
```
*track##
```

**Ejemplos:**
```
*15##
*25##
*100##
```

---

## 🔔 Notificaciones Automáticas

El bot envía alertas automáticas al grupo configurado cuando:

### Evento de Botón de Pánico

```
🚨 ALERTA - Botón Presionado

📍 Dispositivo: ESP32_001
📌 Ubicación: Sala Principal
🔗 MAC: `EA:89:14:XX:XX:XX`
🕐 Hora: 25/10/2025 14:30:15

⚠️ Se requiere atención inmediata
```

**Características:**
- ✅ Notificación con sonido
- ✅ Información del dispositivo desde `alarmas.json`
- ✅ Timestamp preciso del evento
- ✅ Enviado inmediatamente al detectar evento MQTT

---

## 📚 Documentación Adicional

### Para Usuarios
- **[USER-GUIDE.md](./USER-GUIDE.md)** - Guía detallada de uso con ejemplos y casos comunes

### Para Desarrolladores
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura del sistema y patrones de diseño
- **[API-REFERENCE.md](./API-REFERENCE.md)** - Referencia completa de la API interna

### Para Administradores
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía de despliegue, configuración y mantenimiento

---

## 🛡️ Seguridad

- ✅ **Autenticación obligatoria** por `chat_id`
- ✅ **Lista blanca** de usuarios autorizados
- ✅ **Token seguro** almacenado en archivo de configuración
- ✅ **Validación de entrada** en todos los mensajes
- ✅ **Logging completo** de accesos y acciones

**⚠️ IMPORTANTE:** 
- Nunca compartir el `bot_token` públicamente
- Mantener `telegram-config.json` fuera de repositorios públicos
- Usar `.gitignore` para proteger datos sensibles

---

## 🐛 Solución de Problemas

### El bot no responde

**Verificar:**
1. Bot está ejecutándose: `ps aux | grep telegram-bot`
2. Token es correcto en `telegram-config.json`
3. Tu `chat_id` está en la lista de autorizados
4. Revisar logs: `tail -f backend/logs/telegram-bot.log`

### No recibo notificaciones del grupo

**Verificar:**
1. `notification_group.enabled` es `true`
2. Bot es miembro y administrador del grupo
3. `chat_id` del grupo es correcto (negativo)
4. MQTT está publicando eventos correctamente

### Errores al crear tareas

**Verificar:**
1. Formato correcto del mensaje
2. Mensaje termina con `##`
3. Campos separados por `*`
4. Hora y track en rangos válidos
5. TaskSystem está activo

---

## 📄 Licencia

Proyecto propietario de **Nexus Tech** para cliente **SLT**.

---

## 👥 Soporte

Para soporte técnico o consultas:
- **Desarrollador:** Jorge - Nexus Tech
- **Cliente:** SLT
- **Proyecto:** Sistema de Monitoreo Red Local - Botón de Pánico

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025