# Guía de Pruebas de Backend — Modo Desarrollo
**Proyecto:** monitoreo-unam
**RPi IP:** 192.168.0.100

---

## Descripción

Esta guía describe cómo detener el kiosko y el servicio Node.js para probar
el backend manualmente desde tu PC via `192.168.0.100:3000`.
Al terminar las pruebas, un `sudo reboot` restaura el modo kiosko completo.

---

## Flujo de trabajo

```
MODO KIOSKO (normal)
       ↓
Detener servicio Node.js
Detener kiosko (cage)
       ↓
MODO DESARROLLO
Correr backend manualmente → probar desde PC (192.168.0.100:3000)
       ↓
sudo reboot
       ↓
MODO KIOSKO (restaurado)
```

---

## Paso 1 — Detener el servicio Node.js

Libera el puerto 3000 para que puedas correr tu propio proceso:

```bash
sudo systemctl stop nodeapp.service
```

Verificar que el puerto quedó libre:
```bash
ss -tlnp | grep 3000
# No debe mostrar nada
```

---

## Paso 2 — Detener el kiosko (cage + chromium)

El kiosko no corre como servicio systemd, corre como proceso de usuario.
Para matarlo:

```bash
pkill cage
```

Verificar que terminó:
```bash
pgrep cage
# No debe mostrar nada
```

> **Nota:** Si el kiosko ya no está corriendo (por ejemplo, tras un fallo),
> este comando no hace nada. No es un error.

---

## Paso 3 — Correr el backend manualmente

Desde PuTTY, navega al directorio del proyecto y arranca el servidor:

### App de prueba
```bash
cd /home/admin/monitoreo-unam
node server.js
```

### Proyecto real (cuando esté listo)
```bash
cd /home/admin/monitoreo-unam
npm start
```

Los logs aparecerán directamente en la terminal de PuTTY en tiempo real.
Para detener el servidor: `Ctrl+C`

---

## Paso 4 — Probar desde tu PC

Con el servidor corriendo, abre en tu navegador:
```
http://192.168.0.100:3000
```

---

## Comandos útiles durante desarrollo

### Ver logs del servicio Node.js (cuando corre como servicio)
```bash
journalctl -u nodeapp.service -f
# -f = sigue los logs en tiempo real (como tail -f)
```

### Ver los últimos logs del servicio Node.js
```bash
journalctl -u nodeapp.service --no-pager -n 50
# -n 50 = últimas 50 líneas
```

### Verificar qué proceso ocupa el puerto 3000
```bash
ss -tlnp | grep 3000
```

### Reiniciar solo el servicio Node.js (sin reboot)
```bash
sudo systemctl restart nodeapp.service
sudo systemctl status nodeapp.service
```

### Ver si el kiosko está corriendo
```bash
pgrep -a cage
```

---

## Paso 5 — Restaurar modo kiosko

Cuando termines las pruebas, simplemente:

```bash
sudo reboot
```

Al arrancar, el sistema restaura automáticamente:
1. `nodeapp.service` inicia Node.js en puerto 3000
2. Auto-login de `admin` en TTY1
3. `.bash_profile` lanza cage + chromium en modo kiosko

---

## Notas importantes

- **No uses** `sudo systemctl start nodeapp.service` después de probar
  manualmente si dejaste un proceso `node` corriendo — el puerto 3000
  ya estará ocupado y el servicio fallará.
- Siempre detén tu proceso manual con `Ctrl+C` antes de reiniciar el servicio.
- Si el servicio falla al reiniciar por puerto ocupado:
  ```bash
  pkill node
  sudo systemctl start nodeapp.service
  ```
