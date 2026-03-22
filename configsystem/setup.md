# Configuración Kiosko — Raspberry Pi 3B+
**Sistema:** Raspberry Pi OS Lite (Debian Trixie)
**Usuario:** admin
**Fecha de configuración:** 2026-03-21

---

## Descripción general

Este documento describe la configuración completa de una Raspberry Pi 3B+ como kiosko web. Al encender, el sistema arranca automáticamente un servidor Node.js y abre Chromium en modo kiosko apuntando a `localhost:3000`. Sin escritorio, sin barra de tareas, con mouse funcional.

### Stack utilizado
- **Compositor Wayland:** `cage` — minimalista, diseñado para kiosko (una sola app, pantalla completa)
- **Navegador:** `chromium` con flags Wayland (resuelve problemas de puntero que ocurren con X11)
- **Gestor de servicios:** `systemd`
- **Runtime:** Node.js v20 LTS

### Orden de arranque
```
boot
 └─ systemd → nodeapp.service (Node.js puerto 3000)
 └─ getty TTY1 → auto-login admin
                  └─ .bash_profile → espera puerto 3000
                                      └─ cage → chromium → localhost:3000
```

---

## Requisitos previos

- Raspberry Pi OS Lite instalado y configurado
- Usuario `admin` creado con contraseña
- Acceso a internet para instalar paquetes
- Conexión SSH o acceso físico al equipo

---

## Paso 1 — Auto-login TTY1

Configura systemd para que el usuario `admin` inicie sesión automáticamente en TTY1 al boot, sin pedir contraseña.

### Crear directorio de override
```bash
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
```

### Crear archivo de configuración
```bash
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin admin --noclear %I $TERM
EOF
```

> **Nota:** La primera línea `ExecStart=` vacía es intencional — limpia el valor original de systemd antes de establecer el nuevo. Sin esta línea, el override no funciona correctamente.

### Verificación
Después de reboot, la pantalla física debe mostrar:
```
admin@raspberrypi:~$
```
Sin solicitar usuario ni contraseña.

---

## Paso 2 — Instalación de Node.js v20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Verificar instalación
```bash
node --version   # debe mostrar v20.x.x
```

---

## Paso 3 — Instalación de cage y chromium

```bash
sudo apt update
sudo apt install -y cage chromium
```

> **Nota:** En Debian Trixie el paquete se llama `chromium`, no `chromium-browser`.

### Verificar instalación
```bash
chromium --version
# Chromium 146.x.x built on Debian GNU/Linux 13 (trixie)
```

---

## Paso 4 — Servicio Node.js (nodeapp.service)

Crea el servicio systemd que arranca el servidor Node.js automáticamente al boot.

### Crear archivo de servicio
```bash
sudo tee /etc/systemd/system/nodeapp.service << 'EOF'
[Unit]
Description=Node.js App (puerto 3000)
After=network.target

[Service]
User=admin
WorkingDirectory=/home/admin/monitoreo-unam
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Descripción de parámetros clave
| Parámetro | Valor | Descripción |
|---|---|---|
| `User` | admin | Corre el proceso como usuario admin, no root |
| `WorkingDirectory` | /home/admin/monitoreo-unam | Directorio del proyecto |
| `ExecStart` | /usr/bin/node server.js | Comando de inicio |
| `Restart` | on-failure | Reinicia solo si falla, no si se detiene manualmente |
| `RestartSec` | 5 | Espera 5 segundos antes de reintentar |
| `After` | network.target | Arranca después de que la red esté disponible |

> **Para el proyecto real:** Ajustar `ExecStart` si el comando de inicio es diferente (ej. `npm start`). En ese caso usar `/usr/bin/npm start` o crear un script wrapper.

---

## Paso 5 — Kiosko en .bash_profile

En lugar de un servicio systemd para el kiosko (que falla porque `cage` necesita una sesión TTY real), se lanza desde `.bash_profile`. Cuando el auto-login ocurre en TTY1, `.bash_profile` se ejecuta automáticamente.

### Agregar al archivo .bash_profile
```bash
cat << 'EOF' >> /home/admin/.bash_profile

# Kiosko en TTY1
if [ "$(tty)" = "/dev/tty1" ]; then
    while ! (echo > /dev/tcp/localhost/3000) 2>/dev/null; do sleep 1; done
    /usr/bin/cage -- /usr/bin/chromium \
      --kiosk \
      --noerrdialogs \
      --disable-infobars \
      --no-first-run \
      --ozone-platform=wayland \
      http://localhost:3000
fi
EOF
```

### Descripción de la lógica
1. `if [ "$(tty)" = "/dev/tty1" ]` — Solo ejecuta en TTY1. Si el usuario abre una sesión SSH, no lanza el kiosko.
2. `while ! (echo > /dev/tcp/localhost/3000)` — Espera activamente hasta que el puerto 3000 responda. Usa sockets TCP de bash (sin dependencias externas).
3. `cage -- /usr/bin/chromium ...` — Lanza cage con chromium como única aplicación.

### Flags de Chromium explicados
| Flag | Descripción |
|---|---|
| `--kiosk` | Pantalla completa, sin controles del navegador |
| `--noerrdialogs` | Suprime diálogos de error del navegador |
| `--disable-infobars` | Oculta la barra de información |
| `--no-first-run` | Omite el wizard de primera ejecución |
| `--ozone-platform=wayland` | Usa Wayland en lugar de X11 (resuelve problemas de puntero) |

---

## Paso 6 — Habilitar servicios y reboot

```bash
sudo systemctl daemon-reload
sudo systemctl enable nodeapp.service
sudo reboot
```

### Verificación después del reboot
```bash
sudo systemctl status nodeapp.service
```
Debe mostrar `active (running)`.

La pantalla física debe mostrar Chromium en pantalla completa con la interfaz de `localhost:3000`.

---

## Troubleshooting

| Problema | Causa probable | Solución |
|---|---|---|
| Pantalla negra sin navegador | cage no inicia | Revisar `journalctl -u kiosk.service` o logs de `.bash_profile` |
| Chromium no carga la página | Node.js no arrancó | `sudo systemctl status nodeapp.service` |
| Node.js no arranca | Error en server.js | `journalctl -u nodeapp.service --no-pager` |
| Puntero no responde | Flag Wayland faltante | Verificar `--ozone-platform=wayland` en `.bash_profile` |
| Auto-login no funciona | Override mal aplicado | Verificar `/etc/systemd/system/getty@tty1.service.d/autologin.conf` |
| Kiosko abre en sesión SSH | Condición TTY faltante | Verificar `if [ "$(tty)" = "/dev/tty1" ]` en `.bash_profile` |

---

## Archivos modificados / creados

| Archivo | Tipo | Descripción |
|---|---|---|
| `/etc/systemd/system/getty@tty1.service.d/autologin.conf` | Creado | Override auto-login TTY1 |
| `/etc/systemd/system/nodeapp.service` | Creado | Servicio systemd Node.js |
| `/home/admin/.bash_profile` | Modificado | Lanzador del kiosko en TTY1 |
| `/home/admin/monitoreo-unam/server.js` | Creado | Servidor Node.js (app de prueba / producción) |

---

## Fase 3 — Reemplazar app de prueba por proyecto real

Cuando el backend esté listo:

1. Clonar el repositorio en `/home/admin/monitoreo-unam` (o reemplazar `server.js`)
2. Instalar dependencias:
   ```bash
   cd /home/admin/monitoreo-unam
   npm install
   ```
3. Si el comando de inicio cambia (ej. `npm start`), actualizar `nodeapp.service`:
   ```bash
   sudo nano /etc/systemd/system/nodeapp.service
   # Cambiar ExecStart=/usr/bin/node server.js  →  ExecStart=/usr/bin/npm start
   sudo systemctl daemon-reload
   sudo systemctl restart nodeapp.service
   ```
4. Verificar que el servicio arranca correctamente:
   ```bash
   sudo systemctl status nodeapp.service
   ```
5. Reboot final para confirmar arranque completo desde cero.
