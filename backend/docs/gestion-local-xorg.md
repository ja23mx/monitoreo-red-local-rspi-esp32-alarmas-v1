# Gestión de Logs del Sistema

**Fecha**:  2025-12-31  
**Autor**: ja23mx  
**Servidor**: server-sra

## Problemas Detectados

### 1. Log de Xorg creciendo descontroladamente

El archivo de log `/var/log/Xorg. 0.log` crece de manera descontrolada, alcanzando tamaños de **40-50MB** en poco tiempo debido a que el monitor HDMI (Xiaomi XMI, prod id 45075) se re-detecta constantemente, generando entradas repetitivas en el log.

**Síntomas:**
- Log de Xorg crece aproximadamente **1.7MB por minuto**
- Consumo innecesario de espacio en disco
- Entradas repetitivas de detección EDID del monitor

### 2. Logs de PM2 sin rotación

Los logs de PM2 (`panic-monitor`) crecieron sin control: 
- `/home/admin/. pm2/logs/panic-monitor-out.log` → **334MB**
- `/home/admin/.pm2/logs/panic-monitor-error.log` → **84MB**

### 3. Logs del proyecto red-local-iot

Los logs del proyecto crecen constantemente:
- `diagnostico_esp32.txt` → **239MB**
- `diagnostico_esp32_detallado.log` → **34MB**
- `cron_output.log` → **13MB**

**Espacio total recuperado**:  ~690MB

---

## Soluciones Implementadas

### 1. Rotación del Log de Xorg

Script que rota el log de Xorg cuando supera **5MB**, ejecutándose cada **10 minutos**. 

**Ubicación**: `/home/admin/truncate_xorg_log.sh`

```bash
#!/bin/bash
# Script para rotar el log de Xorg cuando supera 5MB

LOG_FILE="/var/log/Xorg.0.log"
MAX_SIZE=$((5 * 1024 * 1024))  # 5MB en bytes

if [ -f "$LOG_FILE" ]; then
    SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null)
    if [ "$SIZE" -gt "$MAX_SIZE" ]; then
        # Rotar el log:  mover el actual y crear uno nuevo
        sudo mv "$LOG_FILE" "${LOG_FILE}.old"
        sudo touch "$LOG_FILE"
        sudo chmod 644 "$LOG_FILE"
        sudo chown root:root "$LOG_FILE"
        # Eliminar el log antiguo
        sudo rm -f "${LOG_FILE}.old"
        echo "$(date): Log rotado (tamaño: $SIZE bytes)" >> ~/xorg_truncate.log
    fi
fi
```

**Permisos**:
```bash
chmod +x ~/truncate_xorg_log. sh
```

### 2. Desactivación de Logs de PM2

Los logs de PM2 se desactivaron completamente redirigiendo a `/dev/null`:

```bash
# Detener proceso actual
pm2 delete panic-monitor

# Reiniciar sin logs
pm2 start /home/admin/red-local-iot/backend/server. js --name panic-monitor -o /dev/null -e /dev/null

# Guardar configuración
pm2 save

# Eliminar logs antiguos
rm -f ~/. pm2/logs/panic-monitor-*. log
```

**Verificar**:
```bash
pm2 info panic-monitor | grep "log path"
```

Debe mostrar: 
```
│ error log path    │ /dev/null   │
│ out log path      │ /dev/null   │
```

### 3. Rotación de Logs del Proyecto

Script que rota los logs del proyecto cuando superan **50MB**.

**Ubicación**: `/home/admin/rotate_project_logs.sh`

```bash
#!/bin/bash
# Script para rotar logs del proyecto red-local-iot cuando superan 50MB

LOG_DIR="/home/admin/red-local-iot/logs"
MAX_SIZE=$((50 * 1024 * 1024))  # 50MB en bytes

# Función para rotar un archivo
rotate_log() {
    local LOG_FILE="$1"
    if [ -f "$LOG_FILE" ]; then
        SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null)
        if [ "$SIZE" -gt "$MAX_SIZE" ]; then
            # Crear backup con timestamp
            TIMESTAMP=$(date +%Y%m%d_%H%M%S)
            mv "$LOG_FILE" "${LOG_FILE}.${TIMESTAMP}. old"
            touch "$LOG_FILE"
            # Eliminar backups antiguos (mantener solo el último)
            find "$(dirname "$LOG_FILE")" -name "$(basename "$LOG_FILE").*.old" -type f | sort -r | tail -n +2 | xargs rm -f
            echo "$(date): $LOG_FILE rotado (tamaño: $SIZE bytes)" >> ~/project_logs_rotation.log
        fi
    fi
}

# Rotar logs específicos
rotate_log "$LOG_DIR/diagnostico_esp32.txt"
rotate_log "$LOG_DIR/diagnostico_esp32_detallado.log"
rotate_log "$LOG_DIR/cron_output.log"
rotate_log "$LOG_DIR/telegram-bot.log"
```

**Permisos**: 
```bash
chmod +x ~/rotate_project_logs.sh
```

### 4. Configuración de Sudo (visudo)

Para que los scripts puedan rotar logs sin pedir contraseña:

```bash
sudo visudo
```

**Agregar al final**:
```
admin ALL=(ALL) NOPASSWD: /usr/bin/truncate, /bin/mv, /usr/bin/touch, /bin/chmod, /bin/chown, /bin/rm
```

### 5. Automatización con Cron

Cronjobs configurados para ejecutar los scripts cada **10 minutos**: 

```bash
crontab -e
```

**Configuración actual**:
```
# Monitor ESP32 cada 2 minutos
*/2 * * * * /home/admin/red-local-iot/monitor_esp32.sh >> /home/admin/red-local-iot/logs/cron_output.log 2>&1

# Rotar log de Xorg cada 10 minutos (si > 5MB)
*/10 * * * * /home/admin/truncate_xorg_log.sh

# Rotar logs del proyecto cada 10 minutos (si > 50MB)
*/10 * * * * /home/admin/rotate_project_logs.sh
```

---

## Comandos Útiles

### Verificación de Espacio

```bash
# Ver espacio en disco
df -h

# Ver tamaño de logs de Xorg
ls -lh /var/log/Xorg.0.log

# Ver tamaño de logs del proyecto
du -sh ~/red-local-iot/logs/*
```

### Ejecución Manual de Scripts

```bash
# Rotar log de Xorg manualmente
~/truncate_xorg_log. sh

# Rotar logs del proyecto manualmente
~/rotate_project_logs.sh
```

### Ver Historial de Rotaciones

```bash
# Historial de rotaciones de Xorg
cat ~/xorg_truncate.log

# Historial de rotaciones del proyecto
cat ~/project_logs_rotation.log
```

### Gestión de Cronjobs

```bash
# Ver cronjobs configurados
crontab -l

# Editar cronjobs
crontab -e
```

### Gestión de PM2

```bash
# Ver procesos de PM2
pm2 list

# Ver detalles de panic-monitor
pm2 info panic-monitor

# Ver configuración de logs
pm2 info panic-monitor | grep "log path"
```

### Búsqueda de Archivos Grandes

```bash
# Buscar archivos mayores a 50MB en el sistema
sudo find / -type f -size +50M -exec ls -lh {} \; 2>/dev/null | sort -k5 -hr | head -20

# Ver los 20 directorios más grandes en /var/log
sudo du -sh /var/log/* | sort -hr | head -20
```

---

## Estado Actual del Sistema

**Espacio en disco**: 22% utilizado (6.1G de 29G)

**Logs activos**:
- `/var/log/Xorg. 0.log` → Rotado cada 10 min si > 5MB
- `~/red-local-iot/logs/*. log` → Rotados cada 10 min si > 50MB
- PM2 logs → Desactivados (`/dev/null`)

**Cronjobs activos**: 
- Monitor ESP32: cada 2 minutos
- Rotación Xorg: cada 10 minutos
- Rotación proyecto:  cada 10 minutos

---

## Notas Importantes

- El servidor ejecuta **Chromium en modo kiosko**, por lo que Xorg debe permanecer activo
- Si se necesita reiniciar el display manager:  `sudo systemctl restart display-manager` (cerrará la sesión gráfica)
- Los backups de logs rotados se mantienen solo **1 versión** (el más reciente)
- PM2 sigue funcionando normalmente sin logs

---

## Causa Raíz del Log de Xorg (Pendiente)

El monitor HDMI Xiaomi (XMI, prod id 45075) está causando re-detecciones constantes de EDID. 

**Posibles soluciones a futuro**:
1. Reemplazar el cable HDMI
2. Usar un monitor diferente
3. Deshabilitar la detección automática de EDID en la configuración de Xorg
4. Reducir el nivel de logging de Xorg

---

**Última actualización**: 2025-12-31