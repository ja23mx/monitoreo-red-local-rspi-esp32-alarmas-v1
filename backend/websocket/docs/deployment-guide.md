# Deployment Guide - Sistema de Alarmas ESP32

**Sistema:** Backend WebSocket/MQTT Gateway  
**Versión:** 1.0  
**Fecha:** Septiembre 19, 2025  

---

## 📋 Requisitos del Sistema

### **Hardware Mínimo**
- **CPU:** 1 Core, 1 GHz
- **RAM:** 512 MB
- **Almacenamiento:** 1 GB libre
- **Red:** Ethernet o WiFi con acceso a dispositivos ESP32

### **Software Requerido**
- **OS:** Linux (Ubuntu 20.04+ recomendado)
- **Node.js:** v16.0 o superior
- **NPM:** v8.0 o superior
- **MQTT Broker:** Mosquitto o compatible

---

## 🚀 Instalación Paso a Paso

### **1. Preparar el Entorno**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js y NPM
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # v18.x.x
npm --version   # 8.x.x
```

### **2. Instalar MQTT Broker (Mosquitto)**

```bash
# Instalar Mosquitto
sudo apt install mosquitto mosquitto-clients -y

# Iniciar servicio
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Verificar estado
sudo systemctl status mosquitto
```

### **3. Configurar MQTT Broker**

```bash
# Editar configuración (opcional)
sudo nano /etc/mosquitto/mosquitto.conf
```

**Configuración básica:**
```conf
# /etc/mosquitto/mosquitto.conf
port 1883
allow_anonymous true
persistence true
persistence_location /var/lib/mosquitto/
log_dest file /var/log/mosquitto/mosquitto.log
```

```bash
# Reiniciar servicio después de cambios
sudo systemctl restart mosquitto
```

### **4. Descargar y Configurar Aplicación**

```bash
# Navegar al directorio de instalación
cd /home/admin

# Clonar o copiar código fuente
# (Asumiendo que tienes el código en red-local-iot)
cd red-local-iot/backend

# Instalar dependencias
npm install
```

### **5. Configurar Archivos de Datos**

```bash
# Crear directorio de datos si no existe
mkdir -p data

# Configurar mac_to_id.json
cat > data/mac_to_id.json << EOF
{
    "77FF44": "ESP32_001",
    "88AA55": "ESP32_002",
    "99BB66": "ESP32_003"
}
EOF

# Configurar device_status.json inicial
cat > data/device_status.json << EOF
[
    {
        "id": "ESP32_001",
        "mac": "77FF44",
        "location": "Entrada Principal",
        "status": "offline",
        "lastConnection": null
    }
]
EOF

# Configurar alarmas.json inicial
cat > data/alarmas.json << EOF
[]
EOF
```

### **6. Configurar Variables de Entorno**

```bash
# Crear archivo .env
cat > .env << EOF
# Configuración del servidor
PORT=3000
NODE_ENV=production

# Configuración MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_CLIENT_ID=backend-server

# Configuración WebSocket
WS_HEARTBEAT_INTERVAL=15000
WS_CONNECTION_TIMEOUT=30000

# Rutas de archivos
MAC_TO_ID_FILE=./data/mac_to_id.json
DEVICE_STATUS_FILE=./data/device_status.json
ALARMAS_FILE=./data/alarmas.json
EOF
```

---

## ⚙️ Configuración de Red

### **Firewall (UFW)**

```bash
# Habilitar firewall si no está activo
sudo ufw enable

# Permitir puerto WebSocket/HTTP
sudo ufw allow 3000/tcp

# Permitir puerto MQTT
sudo ufw allow 1883/tcp

# Verificar reglas
sudo ufw status
```

### **Configuración de Red Local**

**Asegurar que el servidor sea accesible desde la red local:**

```bash
# Verificar IP del servidor
ip addr show

# Ejemplo de configuración estática (opcional)
# Editar /etc/netplan/01-network-manager-all.yaml
```

---

## 🔧 Configuración del Servicio

### **Crear Servicio Systemd**

```bash
# Crear archivo de servicio
sudo nano /etc/systemd/system/esp32-backend.service
```

**Contenido del servicio:**
```ini
[Unit]
Description=ESP32 Backend WebSocket/MQTT Gateway
After=network.target mosquitto.service
Wants=mosquitto.service

[Service]
Type=simple
User=admin
Group=admin
WorkingDirectory=/home/admin/red-local-iot/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=esp32-backend

[Install]
WantedBy=multi-user.target
```

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar servicio
sudo systemctl enable esp32-backend

# Iniciar servicio
sudo systemctl start esp32-backend

# Verificar estado
sudo systemctl status esp32-backend
```

---

## 📊 Verificación de Instalación

### **1. Verificar Servicios Activos**

```bash
# Estado de servicios
sudo systemctl status mosquitto
sudo systemctl status esp32-backend

# Verificar puertos abiertos
sudo netstat -tlnp | grep :3000  # WebSocket
sudo netstat -tlnp | grep :1883  # MQTT
```

### **2. Testing de Conectividad**

```bash
# Test MQTT Broker
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT"
mosquitto_sub -h localhost -t "test/topic" &

# Test WebSocket (desde otro terminal)
wscat -c ws://localhost:3000
```

### **3. Verificar Logs**

```bash
# Logs del backend
sudo journalctl -u esp32-backend -f

# Logs de Mosquitto
sudo tail -f /var/log/mosquitto/mosquitto.log

# Logs del sistema
sudo journalctl -xe
```

---

## 🔐 Configuración de Seguridad

### **Configurar Autenticación MQTT (Opcional)**

```bash
# Crear usuario MQTT
sudo mosquitto_passwd -c /etc/mosquitto/passwd esp32user

# Configurar mosquitto.conf
sudo nano /etc/mosquitto/mosquitto.conf
```

**Agregar autenticación:**
```conf
password_file /etc/mosquitto/passwd
allow_anonymous false
```

### **Configurar SSL/TLS (Opcional)**

```bash
# Generar certificados auto-firmados
sudo openssl req -new -x509 -days 365 -extensions v3_ca -keyout ca.key -out ca.crt
sudo openssl genrsa -out server.key 2048
sudo openssl req -out server.csr -key server.key -new
sudo openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365
```

---

## 📱 Configuración de Dispositivos ESP32

### **Parámetros de Conexión MQTT**

```c
// Configuración en ESP32
#define MQTT_SERVER "192.168.1.100"  // IP del servidor
#define MQTT_PORT 1883
#define MQTT_USER "esp32user"        // Si configuraste auth
#define MQTT_PASS "password123"
```

### **Topics de Comunicación**

```c
// Topics para ESP32 con MAC 77FF44
#define TOPIC_CMD "NODO/77FF44/CMD"   // Recibir comandos
#define TOPIC_ACK "NODO/77FF44/ACK"   // Enviar respuestas
```

---

## 🚨 Troubleshooting

### **Problemas Comunes**

**1. Backend no inicia**
```bash
# Verificar logs
sudo journalctl -u esp32-backend --no-pager
# Verificar dependencias
cd /home/admin/red-local-iot/backend && npm install
```

**2. MQTT no conecta**
```bash
# Verificar broker
sudo systemctl status mosquitto
# Test conectividad
mosquitto_pub -h localhost -t "test" -m "test"
```

**3. ESP32 no se conecta**
- Verificar IP del servidor en código ESP32
- Verificar firewall (puerto 1883)
- Verificar logs MQTT: `sudo tail -f /var/log/mosquitto/mosquitto.log`

**4. WebSocket no accesible**
```bash
# Verificar puerto
sudo netstat -tlnp | grep :3000
# Verificar firewall
sudo ufw status
```

### **Comandos de Diagnóstico**

```bash
# Estado general del sistema
sudo systemctl --failed
sudo journalctl -p err --no-pager

# Verificar procesos
ps aux | grep node
ps aux | grep mosquitto

# Verificar archivos de configuración
ls -la /home/admin/red-local-iot/backend/data/
cat /home/admin/red-local-iot/backend/data/mac_to_id.json
```

---

## 🔄 Mantenimiento

### **Backup de Datos**

```bash
# Script de backup
#!/bin/bash
BACKUP_DIR="/home/admin/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r /home/admin/red-local-iot/backend/data/ $BACKUP_DIR/
tar -czf $BACKUP_DIR.tar.gz -C /home/admin/backups/ $(basename $BACKUP_DIR)
rm -rf $BACKUP_DIR
echo "Backup created: $BACKUP_DIR.tar.gz"
```

### **Actualización del Sistema**

```bash
# Parar servicio
sudo systemctl stop esp32-backend

# Backup de datos
./backup_script.sh

# Actualizar código
cd /home/admin/red-local-iot/backend
git pull  # o copiar nuevos archivos

# Instalar dependencias nuevas
npm install

# Reiniciar servicio
sudo systemctl start esp32-backend
```

### **Monitoreo de Logs**

```bash
# Log rotation automático (ya configurado por systemd)
sudo journalctl --vacuum-time=7d  # Limpiar logs > 7 días
sudo journalctl --vacuum-size=100M  # Limitar tamaño logs
```

---

## 📞 Soporte

### **Información del Sistema**
- **Logs Backend:** `sudo journalctl -u esp32-backend -f`
- **Logs MQTT:** `sudo tail -f /var/log/mosquitto/mosquitto.log`
- **Configuración:** `/home/admin/red-local-iot/backend/`
- **Datos:** `/home/admin/red-local-iot/backend/data/`

### **Contactos**
- **Desarrollador:** GitHub Copilot
- **Documentación:** `/home/admin/red-local-iot/backend/docs/`
- **Testing:** `websocket-mqtt-integration-test-results.md`

---

*Guía de deployment actualizada - Septiembre 19, 2025*