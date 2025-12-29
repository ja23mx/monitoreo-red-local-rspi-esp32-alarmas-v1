# Gestión del Log de Xorg

**Fecha**:  2025-12-29  
**Autor**: ja23mx  
**Servidor**: server-sra

## Problema Detectado

El archivo de log `/var/log/Xorg. 0.log` crece de manera descontrolada, alcanzando tamaños de **40-50MB** en poco tiempo debido a que el monitor HDMI (Xiaomi XMI, prod id 45075) se re-detecta constantemente, generando entradas repetitivas en el log.

### Síntomas:
- Log de Xorg crece aproximadamente **1.7MB por minuto**
- Consumo innecesario de espacio en disco
- Entradas repetitivas de detección EDID del monitor

```bash
# Verificar tamaño actual del log
ls -lh /var/log/Xorg.0.log
```

## Solución Implementada

Se creó un script automatizado que rota el log de Xorg cuando supera **5MB**, ejecutándose cada **10 minutos** mediante cronjob.

### 1. Script de Rotación

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
        echo "$(date): Log rotado (tamaño: $SIZE bytes)" >> ~/xorg_truncate. log
    fi
fi
```

**Permisos de ejecución**:
```bash
chmod +x ~/truncate_xorg_log. sh
```

### 2. Configuración de Sudo (visudo)

Para que el script pueda rotar el log sin pedir contraseña, se configuró sudo: 

```bash
sudo visudo
```

**Agregar al final del archivo**:
```
admin ALL=(ALL) NOPASSWD: /usr/bin/truncate, /bin/mv, /usr/bin/touch, /bin/chmod, /bin/chown, /bin/rm
```

### 3. Automatización con Cron

Se configuró un cronjob para ejecutar el script cada **10 minutos**:

```bash
crontab -e
```

**Línea agregada**:
```
*/10 * * * * /home/admin/truncate_xorg_log.sh
```

### 4. Verificar Configuración

**Ver cronjobs activos**:
```bash
crontab -l
```

**Prueba manual del script**:
```bash
~/truncate_xorg_log. sh
```

**Verificar tamaño después de la rotación**:
```bash
ls -lh /var/log/Xorg.0.log
```

**Ver historial de rotaciones**:
```bash
cat ~/xorg_truncate.log
```

## Comandos Útiles

```bash
# Verificar tamaño actual del log
ls -lh /var/log/Xorg.0.log

# Ejecutar script manualmente
~/truncate_xorg_log. sh

# Ver últimas entradas del log de Xorg
sudo tail -50 /var/log/Xorg.0.log

# Ver cronjobs configurados
crontab -l

# Editar cronjobs
crontab -e

# Ver historial de rotaciones
cat ~/xorg_truncate.log
```

## Notas Importantes

- El script se ejecuta cada **10 minutos**
- Solo rota el log si supera **5MB**
- El log antiguo se elimina automáticamente después de la rotación
- El servidor ejecuta Chromium en modo kiosko, por lo que **Xorg debe permanecer activo**
- Si se necesita reiniciar el display manager:  `sudo systemctl restart display-manager` (cerrará la sesión gráfica)

## Causa Raíz (Pendiente de Investigación)

El monitor HDMI Xiaomi (XMI) está causando re-detecciones constantes de EDID.  Posibles soluciones a futuro:
1. Reemplazar el cable HDMI
2. Usar un monitor diferente
3. Deshabilitar la detección automática de EDID en la configuración de Xorg
4. Reducir el nivel de logging de Xorg

---

**Última actualización**: 2025-12-29