# Fase 3: Automatización con PM2

Esta fase configura PM2 para gestionar automáticamente el servidor Node.js y configura el sistema para iniciar el kiosco automáticamente al arrancar la Raspberry Pi.

## Requisitos Previos

- Fase 2 completada exitosamente
- Aplicación funcionando manualmente
- Usuario con permisos sudo
- PM2 instalado globalmente

---

## Paso 1: Detener procesos manuales

Antes de configurar la automatización, detener todos los procesos que estén corriendo manualmente:

```bash
# Detener Chromium
pkill chromium

# Detener servidor X
pkill X

# Detener servidor Node.js (si está corriendo manualmente)
pkill -f "node server.js"
```

### Verificar que todo se detuvo
```bash
ps aux | grep -E "(chromium|node|X)"
```
**Resultado esperado**: Solo debe aparecer el comando `grep` que acabas de ejecutar.

---

## Paso 2: Configurar PM2 para el servidor Node.js

### Iniciar aplicación con PM2
```bash
# Navegar al directorio de la aplicación
cd ~/red-local-iot/backend

# Iniciar servidor con PM2
pm2 start server.js --name "panic-monitor"
```

### Verificar funcionamiento
```bash
# Verificar estado de PM2
pm2 list

# Verificar respuesta del servidor
curl http://localhost:3000
```
**Resultado esperado**: 
- PM2 muestra "panic-monitor" en estado "online"
- curl devuelve el HTML de la aplicación

### Configurar autostart de PM2
```bash
# Configurar PM2 para autostart (importante: SIN sudo)
pm2 startup
```

**Importante**: PM2 mostrará un comando específico que debes copiar y ejecutar. Será algo como:
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u [usuario] --hp /home/[usuario]
```

### Ejecutar el comando proporcionado por PM2
Copia y ejecuta exactamente el comando que PM2 te mostró.

### Guardar configuración actual
```bash
pm2 save
```
**Descripción**: Guarda el estado actual para que se restaure automáticamente al reiniciar.

---

## Paso 3: Crear script para iniciar Chromium automáticamente

### Crear directorio para scripts
```bash
mkdir -p ~/scripts
```

### Crear script de kiosco
```bash
nano ~/scripts/start-kiosk.sh
```

### Contenido del script
```bash
#!/bin/bash

# Esperar a que el servidor esté disponible
echo "Esperando servidor..."
while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 2
done
echo "Servidor disponible, iniciando kiosco..."

# Iniciar X11 en segundo plano
startx &
sleep 5

# Deshabilitar protector de pantalla y ahorro de energía
DISPLAY=:0 xset s off
DISPLAY=:0 xset -dpms
DISPLAY=:0 xset s noblank

# Iniciar Chromium en modo kiosco
DISPLAY=:0 chromium-browser \
    --kiosk \
    --no-sandbox \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-features=TranslateUI \
    --app=http://localhost:3000 &

echo "Kiosco iniciado"
```

### Hacer script ejecutable
```bash
chmod +x ~/scripts/start-kiosk.sh
```

### Verificar permisos
```bash
ls -la ~/scripts/start-kiosk.sh
```
**Resultado esperado**: Archivo con permisos de ejecución (formato `-rwxr-xr-x`).

---

## Paso 4: Configurar autostart del script de kiosco

### Editar archivo de configuración del usuario
```bash
nano ~/.bashrc
```

### Agregar al final del archivo
```bash
# Autostart kiosko only on console login
if [ "$XDG_VTNR" = "1" ] && [ -z "$SSH_CLIENT" ]; then
    # Esperar a que PM2 inicie completamente
    sleep 10
    # Ejecutar script de kiosco
    sudo ~/scripts/start-kiosk.sh
fi
```

**Descripción de parámetros**:
- `"$XDG_VTNR" = "1"`: Solo se ejecuta en consola principal
- `[ -z "$SSH_CLIENT" ]`: Solo se ejecuta si NO es conexión SSH
- `sleep 10`: Espera a que PM2 termine de cargar
- **Nota**: El tiempo de `sleep 10` puede reducirse en sistemas con más RAM y procesador más potente

### Guardar y salir
Presionar `Ctrl+X`, luego `Y`, luego `Enter`.

---

## Paso 5: Prueba final del sistema completo

### Reiniciar sistema
```bash
sudo reboot
```

### Secuencia esperada al arrancar:
1. **Boot del sistema** (~30 segundos)
2. **Autologin del usuario** (automático)
3. **PM2 inicia automáticamente** y carga "panic-monitor"
4. **Script .bashrc se ejecuta** (espera 10 segundos)
5. **Detecta servidor disponible** (PM2 ya lo tiene corriendo)
6. **Inicia X11 y Chromium** automáticamente
7. **Kiosco listo** (~60 segundos total)

### Resultado esperado:
La aplicación "Monitoreo de Botones de Pánico" aparece automáticamente en pantalla completa sin intervención manual.

---

## Verificaciones Post-Reinicio

Si necesitas verificar el estado del sistema después del reinicio:

### Verificar PM2
```bash
pm2 list
systemctl status pm2-[usuario]
```

### Verificar procesos del kiosco
```bash
ps aux | grep chromium
ps aux | grep X
```

### Verificar logs de PM2
```bash
pm2 logs panic-monitor
```

---

## Troubleshooting

### Problema: PM2 no inicia automáticamente
**Síntoma**: Al reiniciar, aparece "ESPERANDO SERVIDOR" pero PM2 no está corriendo.

**Causa**: Conflicto de usuarios en PM2 (configurado como root pero aplicación guardada como usuario).

**Solución**:
```bash
# 1. Limpiar configuración incorrecta
sudo systemctl stop pm2-root 2>/dev/null
sudo systemctl disable pm2-root 2>/dev/null
sudo rm /etc/systemd/system/pm2-root.service 2>/dev/null

# 2. Reconfigurar PM2 para usuario actual (SIN sudo)
pm2 startup

# 3. Ejecutar comando que PM2 proporcione
# (será algo como: sudo env PATH=$PATH... -u [usuario] --hp /home/[usuario])

# 4. Reiniciar aplicación y guardar
pm2 start ~/red-local-iot/backend/server.js --name "panic-monitor"
pm2 save
```

### Problema: Error de permisos X11
**Síntoma**: "Only console users are allowed to run the X server"

**Causa**: Ejecutando desde SSH en lugar de consola física.

**Solución**: El script debe ejecutarse desde la consola física de la Raspberry Pi, no por SSH.

### Problema: Chromium no aparece
**Síntoma**: PM2 funciona pero no aparece Chromium.

**Verificaciones**:
```bash
# Verificar que X11 está corriendo
ps aux | grep X

# Verificar logs del sistema
journalctl -u pm2-[usuario] -f
```

---

## Comandos de Gestión del Sistema

### Detener kiosco manualmente
```bash
pkill chromium
pkill X
```

### Reiniciar solo PM2
```bash
pm2 restart panic-monitor
```

### Ver logs en tiempo real
```bash
pm2 logs panic-monitor --lines 50
```

### Deshabilitar autostart temporalmente
```bash
# Comentar líneas en ~/.bashrc
nano ~/.bashrc
```

---

## Resultado Final

Al completar esta fase exitosamente:

✅ **PM2 gestiona automáticamente** el servidor Node.js  
✅ **Autostart configurado** para PM2 y script de kiosco  
✅ **Kiosco se inicia automáticamente** al arrancar la Pi  
✅ **Sistema completamente autónomo** sin intervención manual  
✅ **Recuperación automática** ante reinicios del sistema  

El sistema está listo para funcionar de manera independiente en un entorno de producción.