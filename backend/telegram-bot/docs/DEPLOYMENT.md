# 🚀 Guía de Despliegue - Telegram Bot

> Guía completa para desplegar, configurar y mantener el bot de Telegram en producción.

---

## 📋 Tabla de Contenidos

- [Requisitos del Sistema](#-requisitos-del-sistema)
- [Preparación del Entorno](#-preparación-del-entorno)
- [Configuración del Bot](#-configuración-del-bot)
- [Instalación](#-instalación)
- [Configuración de Producción](#-configuración-de-producción)
- [Inicio y Gestión](#-inicio-y-gestión)
- [Monitoreo](#-monitoreo)
- [Backup y Recuperación](#-backup-y-recuperación)
- [Actualización](#-actualización)
- [Seguridad](#-seguridad)
- [Troubleshooting](#-troubleshooting)

---

## 💻 Requisitos del Sistema

### Hardware Mínimo (Raspberry Pi)

```
CPU:        1 GHz (Raspberry Pi 3 o superior)
RAM:        512 MB disponibles
Almacenamiento: 500 MB libres
Red:        Conexión a Internet estable
```

### Software Requerido

```bash
# Sistema Operativo
Raspberry Pi OS (Debian-based)
o cualquier distribución Linux compatible

# Node.js
Versión: 14.x o superior
npm: 6.x o superior

# Servicios
MQTT Broker: Mosquitto 1.6+
TaskSystem: Sistema de tareas programadas (incluido)
```

### Puertos Necesarios

```
1883    - MQTT Broker
443     - HTTPS (si se usa webhook)
```

---

## 🛠️ Preparación del Entorno

### 1. Actualizar Sistema

```bash
# Actualizar paquetes
sudo apt-get update
sudo apt-get upgrade -y

# Instalar dependencias del sistema
sudo apt-get install -y git curl build-essential
```

### 2. Instalar Node.js

```bash
# Descargar e instalar Node.js 16.x
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version    # Debe mostrar v16.x.x
npm --version     # Debe mostrar 8.x.x
```

### 3. Crear Usuario del Sistema (Opcional pero Recomendado)

```bash
# Crear usuario para el bot
sudo adduser --system --group telegrambot

# Crear directorio de trabajo
sudo mkdir -p /opt/red-local-iot
sudo chown telegrambot:telegrambot /opt/red-local-iot
```

---

## 🤖 Configuración del Bot

### 1. Crear Bot en Telegram

#### Paso 1: Abrir BotFather

1. Abrir Telegram
2. Buscar: `@BotFather`
3. Iniciar conversación: `/start`

#### Paso 2: Crear Nuevo Bot

```
Tú: /newbot

BotFather: Alright, a new bot. How are we going to call it?
           Please choose a name for your bot.

Tú: SLT Monitoreo Bot

BotFather: Good. Now let's choose a username for your bot.
           It must end in `bot`. Like this, for example: TetrisBot

Tú: slt_monitoreo_bot

BotFather: Done! Congratulations on your new bot.
           You will find it at t.me/slt_monitoreo_bot
           
           Use this token to access the HTTP API:
           8421143353:AAH0erRNncqFxMdmCFPh_ypVwRuQi3hOTQU
           
           Keep your token secure and store it safely.
```

#### Paso 3: Guardar Token

**⚠️ IMPORTANTE:** Guarda el token de forma segura. Nunca lo compartas públicamente.

```bash
# Anotar el token
TOKEN: 8421143353:AAH0erRNncqFxMdmCFPh_ypVwRuQi3hOTQU
```

---

### 2. Obtener Chat IDs

#### Método 1: Usar @userinfobot (Recomendado)

```
1. Buscar en Telegram: @userinfobot
2. Enviar: /start
3. El bot responderá con tu información:

Id: 7581887852
First name: Jorge
Username: @jorge_dev
```

**Anotar el ID:** `7581887852`

#### Método 2: Desde Logs del Bot

```bash
# 1. Iniciar bot temporalmente (ver sección de instalación)
# 2. Enviar /start a tu bot
# 3. Ver logs
tail -f backend/logs/telegram-bot.log

# Buscar línea similar a:
[INFO] Mensaje recibido de usuario: 7581887852
```

---

### 3. Configurar Grupo de Notificaciones

#### Crear Grupo

```
1. Crear grupo en Telegram
   Nombre sugerido: "SLT Alertas Botón Pánico"

2. Agregar tu bot al grupo
   - Buscar: @slt_monitoreo_bot
   - Agregar como miembro

3. Hacer al bot administrador
   - Info del grupo > Editar > Administradores
   - Agregar bot como administrador
   - Permisos mínimos: Enviar mensajes
```

#### Obtener Chat ID del Grupo

**Método 1: Desde Logs**

```bash
# 1. Bot debe estar ejecutándose
# 2. Enviar /start en el grupo
# 3. Ver logs
tail -f backend/logs/telegram-bot.log

# Buscar:
[INFO] Mensaje recibido del grupo: -1001234567890
```

**⚠️ NOTA:** El chat_id de grupos siempre es **negativo**.

**Método 2: Usar Bot de Información**

```
1. Agregar @getidsbot al grupo
2. Enviar cualquier mensaje
3. El bot responderá con el chat_id
4. Remover @getidsbot del grupo
```

---

## 📦 Instalación

### 1. Clonar/Copiar Proyecto

```bash
# Si usas Git
cd /opt
sudo git clone <URL_REPOSITORIO> red-local-iot
sudo chown -R telegrambot:telegrambot red-local-iot

# O copiar archivos manualmente
sudo scp -r proyecto/* admin@raspberrypi:/opt/red-local-iot/
```

### 2. Instalar Dependencias

```bash
cd /opt/red-local-iot/backend/telegram-bot
npm install
```

**Dependencias instaladas:**
```json
{
  "node-telegram-bot-api": "^0.64.0"
}
```

### 3. Estructura de Directorios

```bash
# Verificar estructura
tree -L 3 /opt/red-local-iot/backend/

backend/
├── telegram-bot/
│   ├── telegram-bot-manager.js
│   ├── index.js
│   ├── handlers/
│   ├── services/
│   ├── utils/
│   ├── docs/
│   └── package.json
├── data/
│   ├── telegram-config.json
│   ├── alarmas.json
│   └── tareas.json
└── logs/
    └── telegram-bot.log
```

### 4. Crear Directorios Necesarios

```bash
# Crear directorios si no existen
mkdir -p /opt/red-local-iot/backend/data
mkdir -p /opt/red-local-iot/backend/logs

# Permisos
sudo chown -R telegrambot:telegrambot /opt/red-local-iot/backend/data
sudo chown -R telegrambot:telegrambot /opt/red-local-iot/backend/logs
```

---

## ⚙️ Configuración de Producción

### 1. Configurar `telegram-config.json`

```bash
# Editar archivo de configuración
nano /opt/red-local-iot/backend/data/telegram-config.json
```

**Contenido:**

```json
{
  "bot_token": "8421143353:AAH0erRNncqFxMdmCFPh_ypVwRuQi3hOTQU",
  "authorized_users": [
    {
      "chat_id": 7581887852,
      "name": "Jorge Admin",
      "role": "admin"
    },
    {
      "chat_id": 123456789,
      "name": "Operador Principal",
      "role": "operator"
    }
  ],
  "notification_group": {
    "enabled": true,
    "chat_id": -1001234567890,
    "name": "SLT Alertas Botón Pánico"
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

**Campos a configurar:**

| Campo                        | Descripción                | Ejemplo               |
| ---------------------------- | -------------------------- | --------------------- |
| `bot_token`                  | Token de BotFather         | `8421143353:AAH0...`  |
| `authorized_users[].chat_id` | ID de usuarios autorizados | `7581887852`          |
| `notification_group.chat_id` | ID del grupo (negativo)    | `-1001234567890`      |
| `settings.timezone`          | Zona horaria               | `America/Mexico_City` |

**Guardar y cerrar:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 2. Proteger Archivo de Configuración

```bash
# Permisos restrictivos
sudo chmod 600 /opt/red-local-iot/backend/data/telegram-config.json
sudo chown telegrambot:telegrambot /opt/red-local-iot/backend/data/telegram-config.json
```

---

### 3. Configurar Variables de Entorno (Opcional)

```bash
# Crear archivo .env
nano /opt/red-local-iot/backend/.env
```

**Contenido:**

```bash
NODE_ENV=production
LOG_LEVEL=info
MQTT_BROKER=mqtt://localhost:1883
```

**Permisos:**

```bash
chmod 600 /opt/red-local-iot/backend/.env
chown telegrambot:telegrambot /opt/red-local-iot/backend/.env
```

---

## 🔄 Inicio y Gestión

### Opción 1: Ejecución Manual (Testing)

```bash
# Como usuario telegrambot
sudo -u telegrambot node /opt/red-local-iot/backend/telegram-bot/index.js

# O desde directorio del proyecto
cd /opt/red-local-iot/backend/telegram-bot
sudo -u telegrambot node index.js
```

**Verificar inicio:**

```
[INFO] Iniciando TelegramBotManager...
[INFO] Configuración cargada exitosamente
[INFO] Auth Service inicializado con 2 usuarios autorizados
[INFO] ✅ TelegramBotManager iniciado exitosamente
[INFO] Bot de Telegram iniciado con polling
```

---

### Opción 2: PM2 (Recomendado para Producción)

#### Instalar PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2
```

#### Configurar PM2

**Crear archivo de configuración:**

```bash
nano /opt/red-local-iot/backend/ecosystem.config.js
```

**Contenido:**

```javascript
module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: './telegram-bot/index.js',
      cwd: '/opt/red-local-iot/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/telegram-bot-error.log',
      out_file: './logs/telegram-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
```

#### Iniciar con PM2

```bash
# Iniciar aplicación
cd /opt/red-local-iot/backend
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs
pm2 logs telegram-bot

# Detener
pm2 stop telegram-bot

# Reiniciar
pm2 restart telegram-bot
```

#### Configurar Inicio Automático

```bash
# Generar script de inicio
pm2 startup

# Ejecutar el comando que muestra (ejemplo):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u admin --hp /home/admin

# Guardar configuración actual
pm2 save
```

**Verificar:**

```bash
# Reiniciar sistema
sudo reboot

# Después del reinicio, verificar
pm2 status
```

---

### Opción 3: Systemd Service

#### Crear Service File

```bash
sudo nano /etc/systemd/system/telegram-bot.service
```

**Contenido:**

```ini
[Unit]
Description=Telegram Bot - Sistema de Monitoreo
After=network.target mosquitto.service

[Service]
Type=simple
User=telegrambot
WorkingDirectory=/opt/red-local-iot/backend/telegram-bot
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/red-local-iot/backend/logs/telegram-bot-out.log
StandardError=append:/opt/red-local-iot/backend/logs/telegram-bot-error.log

# Seguridad
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/red-local-iot/backend/logs
ReadWritePaths=/opt/red-local-iot/backend/data

[Install]
WantedBy=multi-user.target
```

#### Habilitar y Gestionar

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar inicio automático
sudo systemctl enable telegram-bot

# Iniciar servicio
sudo systemctl start telegram-bot

# Ver estado
sudo systemctl status telegram-bot

# Ver logs
sudo journalctl -u telegram-bot -f

# Detener
sudo systemctl stop telegram-bot

# Reiniciar
sudo systemctl restart telegram-bot
```

---

## 📊 Monitoreo

### Logs del Sistema

#### Ver Logs en Tiempo Real

```bash
# PM2
pm2 logs telegram-bot --lines 100

# Systemd
sudo journalctl -u telegram-bot -f

# Archivo de log
tail -f /opt/red-local-iot/backend/logs/telegram-bot.log
```

#### Buscar Errores

```bash
# Últimos errores
grep ERROR /opt/red-local-iot/backend/logs/telegram-bot.log | tail -20

# Errores de hoy
grep "$(date +%Y-%m-%d)" /opt/red-local-iot/backend/logs/telegram-bot.log | grep ERROR
```

#### Filtrar por Usuario

```bash
# Actividad de usuario específico
grep "chat_id: 7581887852" /opt/red-local-iot/backend/logs/telegram-bot.log
```

---

### Métricas del Sistema

#### Uso de Recursos

```bash
# CPU y memoria del proceso (PM2)
pm2 monit

# O con top
top -p $(pgrep -f "telegram-bot")

# Memoria detallada
ps aux | grep telegram-bot
```

#### Estado del Bot

Desde Telegram, enviar:

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
```

---

### Rotación de Logs

#### Configurar Logrotate

```bash
sudo nano /etc/logrotate.d/telegram-bot
```

**Contenido:**

```
/opt/red-local-iot/backend/logs/telegram-bot*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 telegrambot telegrambot
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

**Probar configuración:**

```bash
sudo logrotate -d /etc/logrotate.d/telegram-bot
```

---

## 💾 Backup y Recuperación

### Archivos Críticos a Respaldar

```
/opt/red-local-iot/backend/data/telegram-config.json
/opt/red-local-iot/backend/data/alarmas.json
/opt/red-local-iot/backend/data/tareas.json
/opt/red-local-iot/backend/logs/telegram-bot.log
```

### Script de Backup Automático

```bash
# Crear script de backup
nano /opt/red-local-iot/scripts/backup-telegram.sh
```

**Contenido:**

```bash
#!/bin/bash

# Configuración
BACKUP_DIR="/opt/backups/telegram-bot"
SOURCE_DIR="/opt/red-local-iot/backend"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

# Backup de datos
tar -czf "$BACKUP_DIR/telegram-data-$DATE.tar.gz" \
    "$SOURCE_DIR/data/telegram-config.json" \
    "$SOURCE_DIR/data/alarmas.json" \
    "$SOURCE_DIR/data/tareas.json"

# Backup de logs (últimos 7 días)
find "$SOURCE_DIR/logs" -name "telegram-bot*.log" -mtime -7 \
    -exec tar -czf "$BACKUP_DIR/telegram-logs-$DATE.tar.gz" {} +

# Mantener solo últimos 30 backups
ls -t "$BACKUP_DIR"/telegram-data-*.tar.gz | tail -n +31 | xargs -r rm
ls -t "$BACKUP_DIR"/telegram-logs-*.tar.gz | tail -n +31 | xargs -r rm

echo "Backup completado: $DATE"
```

**Permisos:**

```bash
chmod +x /opt/red-local-iot/scripts/backup-telegram.sh
```

**Configurar Cron:**

```bash
# Editar crontab
crontab -e

# Backup diario a las 2 AM
0 2 * * * /opt/red-local-iot/scripts/backup-telegram.sh >> /var/log/telegram-backup.log 2>&1
```

---

### Restaurar desde Backup

```bash
# Detener bot
pm2 stop telegram-bot

# Restaurar datos
cd /opt/red-local-iot/backend
tar -xzf /opt/backups/telegram-bot/telegram-data-20251025_020000.tar.gz

# Verificar permisos
chown -R telegrambot:telegrambot /opt/red-local-iot/backend/data

# Reiniciar bot
pm2 start telegram-bot
```

---

## 🔄 Actualización

### Actualizar Código del Bot

```bash
# 1. Hacer backup
/opt/red-local-iot/scripts/backup-telegram.sh

# 2. Detener bot
pm2 stop telegram-bot

# 3. Actualizar código (Git)
cd /opt/red-local-iot
git pull origin main

# O copiar archivos manualmente
# scp -r nuevos_archivos/* admin@raspberrypi:/opt/red-local-iot/backend/telegram-bot/

# 4. Instalar dependencias (si hay cambios)
cd backend/telegram-bot
npm install

# 5. Verificar configuración
cat /opt/red-local-iot/backend/data/telegram-config.json

# 6. Reiniciar bot
pm2 restart telegram-bot

# 7. Verificar logs
pm2 logs telegram-bot --lines 50
```

---

### Actualizar Node.js

```bash
# Verificar versión actual
node --version

# Instalar nueva versión (ejemplo: 18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar nueva versión
node --version

# Reinstalar dependencias
cd /opt/red-local-iot/backend/telegram-bot
rm -rf node_modules package-lock.json
npm install

# Reiniciar bot
pm2 restart telegram-bot
```

---

## 🔒 Seguridad

### Mejores Prácticas

#### 1. Proteger Token

```bash
# Nunca compartir token públicamente
# Nunca commitear a Git
echo "telegram-config.json" >> .gitignore

# Permisos restrictivos
chmod 600 /opt/red-local-iot/backend/data/telegram-config.json
```

#### 2. Firewall

```bash
# Permitir solo conexiones salientes (bot usa polling)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Habilitar SSH (si necesario)
sudo ufw allow 22/tcp

# Activar firewall
sudo ufw enable
```

#### 3. Usuarios Autorizados

```json
// Solo agregar usuarios de confianza
{
  "authorized_users": [
    {
      "chat_id": 7581887852,
      "name": "Admin Principal",
      "role": "admin"
    }
  ]
}
```

#### 4. Monitorear Accesos

```bash
# Revisar intentos no autorizados
grep "Usuario no autorizado" /opt/red-local-iot/backend/logs/telegram-bot.log

# Crear alerta
grep "Usuario no autorizado" /opt/red-local-iot/backend/logs/telegram-bot.log | \
  mail -s "Intento de acceso no autorizado" admin@ejemplo.com
```

---

### Renovar Token (Si se Compromete)

```
1. Abrir @BotFather en Telegram
2. Enviar: /mybots
3. Seleccionar tu bot
4. "API Token" > "Regenerate Token"
5. Actualizar telegram-config.json con nuevo token
6. Reiniciar bot: pm2 restart telegram-bot
```

---

## 🔧 Troubleshooting

### Problema: Bot No Inicia

**Síntomas:**
```
[ERROR] Error iniciando bot
```

**Diagnóstico:**

```bash
# 1. Verificar logs
pm2 logs telegram-bot --err

# 2. Verificar configuración
cat /opt/red-local-iot/backend/data/telegram-config.json

# 3. Probar token manualmente
curl https://api.telegram.org/bot<TOKEN>/getMe
```

**Soluciones:**

```bash
# Token inválido → Regenerar en BotFather
# Archivo JSON malformado → Validar con jq
cat telegram-config.json | jq .

# Permisos incorrectos
chown telegrambot:telegrambot telegram-config.json
chmod 600 telegram-config.json
```

---

### Problema: No Recibe Mensajes

**Síntomas:**
- Bot no responde a comandos
- Sin logs de mensajes

**Diagnóstico:**

```bash
# 1. Verificar estado del bot
pm2 status telegram-bot

# 2. Verificar polling
pm2 logs telegram-bot | grep "polling"

# 3. Probar conectividad
curl https://api.telegram.org/bot<TOKEN>/getUpdates
```

**Soluciones:**

```bash
# Reiniciar polling
pm2 restart telegram-bot

# Verificar firewall
sudo ufw status

# Verificar conexión a Internet
ping -c 4 api.telegram.org
```

---

### Problema: Notificaciones No Llegan al Grupo

**Síntomas:**
- Alertas no aparecen en grupo
- Sin errores en logs

**Diagnóstico:**

```bash
# 1. Verificar configuración
cat telegram-config.json | jq '.notification_group'

# 2. Verificar que bot está en grupo
# Enviar mensaje en grupo y ver logs

# 3. Verificar permisos del bot
# El bot debe ser administrador
```

**Soluciones:**

```bash
# Chat ID incorrecto → Volver a obtener desde logs
# Bot no es administrador → Hacer administrador en grupo
# Notificaciones deshabilitadas → enabled: true
```

---

### Problema: Alto Uso de Memoria

**Síntomas:**
```
pm2 monit muestra >150MB de RAM
```

**Soluciones:**

```bash
# 1. Reiniciar bot (libera memoria)
pm2 restart telegram-bot

# 2. Configurar límite en PM2
pm2 delete telegram-bot
pm2 start ecosystem.config.js

# En ecosystem.config.js:
# max_memory_restart: '200M'

# 3. Limpiar logs antiguos
find /opt/red-local-iot/backend/logs -mtime +7 -delete
```

---

### Problema: Errores de Parsing

**Síntomas:**
```
[ERROR] Error parseando mensaje
```

**Diagnóstico:**

```bash
# Ver mensaje exacto que causó error
grep "Error parseando" /opt/red-local-iot/backend/logs/telegram-bot.log -A 5
```

**Soluciones:**
- Verificar formato de mensaje del usuario
- Actualizar validaciones en `message-validator.js`
- Agregar más casos de prueba

---

### Comandos Útiles de Diagnóstico

```bash
# Estado completo del sistema
pm2 status && pm2 logs telegram-bot --lines 20

# Espacio en disco
df -h /opt/red-local-iot

# Procesos activos
ps aux | grep telegram

# Conexiones de red
netstat -tuln | grep node

# Última actividad
tail -50 /opt/red-local-iot/backend/logs/telegram-bot.log

# Test de conectividad con Telegram
curl -s https://api.telegram.org/bot<TOKEN>/getMe | jq .
```

---

## 📞 Soporte y Contacto

### Documentación

- **README.md**: Guía de inicio rápido
- **ARCHITECTURE.md**: Arquitectura del sistema
- **USER-GUIDE.md**: Guía de usuario
- **API-REFERENCE.md**: Referencia de API

### Contacto

- **Desarrollador:** Jorge - Nexus Tech
- **Cliente:** SLT
- **Proyecto:** Sistema de Monitoreo Red Local - Botón de Pánico

---

## ✅ Checklist de Despliegue

```
[ ] Node.js 14+ instalado
[ ] Dependencias npm instaladas
[ ] Bot creado en BotFather
[ ] Token guardado de forma segura
[ ] Chat IDs obtenidos (usuarios y grupo)
[ ] telegram-config.json configurado
[ ] Permisos de archivos correctos
[ ] Bot agregado al grupo como administrador
[ ] PM2 o systemd configurado
[ ] Inicio automático configurado
[ ] Backup automático configurado
[ ] Firewall configurado
[ ] Logs funcionando correctamente
[ ] Test de /start exitoso
[ ] Test de creación de tarea exitoso
[ ] Test de notificación exitoso
[ ] Monitoreo configurado
[ ] Documentación revisada
```

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025  
**Estado:** Producción