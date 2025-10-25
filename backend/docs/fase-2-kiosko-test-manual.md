# Fase 2: Pruebas Manuales

Esta fase verifica que todos los componentes funcionen correctamente antes de automatizar el sistema.

## Requisitos Previos

- Fase 1 completada exitosamente
- Servidor Node.js con aplicación lista (archivo `server.js`)
- Raspberry Pi conectada a monitor HDMI

## Paso 1: Probar el servidor Node.js manualmente

### Navegar al directorio de la aplicación
```bash
cd /ruta/de/tu/aplicacion
```
**Nota**: Sustituye `/ruta/de/tu/aplicacion` por el directorio donde se encuentra tu archivo `server.js`

### Ejecutar el servidor
```bash
node server.js
```
**Descripción**: Inicia el servidor Node.js directamente. El servidor debería mostrar mensajes de inicio indicando que está corriendo en puerto 3000.

**Salida esperada**:
```
Server running on port 3000
WebSocket server started
```

### Verificar respuesta del servidor
En una nueva terminal, ejecutar:
```bash
curl http://localhost:3000
```
**Descripción**: Verifica que el servidor HTTP responde correctamente devolviendo el HTML de la aplicación.

---

## Paso 2: Probar Chromium en modo kiosco

### Iniciar entorno gráfico
```bash
startx &
```
**Descripción**: 
- Inicia el servidor X11 con Openbox
- El `&` ejecuta el proceso en segundo plano
- **Importante**: Debe ejecutarse desde la consola física de la Pi, no por SSH

### Ejecutar Chromium en modo kiosco
```bash
DISPLAY=:0 chromium-browser --kiosk --no-sandbox --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --disable-features=TranslateUI --app=http://localhost:3000 &
```

**Descripción de parámetros**:
- `DISPLAY=:0`: Especifica la pantalla donde mostrar la aplicación
- `--kiosk`: Modo pantalla completa sin interfaz del navegador
- `--no-sandbox`: Desactiva sandbox (necesario en sistemas embebidos)
- `--disable-infobars`: Oculta barras de información del navegador
- `--disable-session-crashed-bubble`: Evita popups de sesión cerrada inesperadamente
- `--disable-restore-session-state`: No restaura sesión anterior
- `--disable-features=TranslateUI`: Desactiva sugerencias de traducción
- `--app=http://localhost:3000`: URL de la aplicación a mostrar

Esperar unos segundos a que aparezca la pagina html
---

## Paso 3: Verificaciones del sistema

### Verificaciones visuales en pantalla HDMI
1. ✅ **Resolución 1920x1080**: Confirmar que la pantalla se ve correctamente
2. ✅ **Interfaz completa**: Verificar que aparece "Monitoreo de Botones de Pánico"
3. ✅ **Cursor visible**: Confirmar que el mouse se ve y funciona
4. ✅ **Sin barras del navegador**: Solo debe verse la aplicación, sin interfaz de Chromium

### Verificaciones funcionales
1. ✅ **WebSockets en tiempo real**: Los estados de dispositivos se actualizan automáticamente
2. ✅ **Botones interactivos**: Probar "Probar Conexión", "Enviar Aviso", etc.
3. ✅ **Datos actualizados**: Verificar que muestra dispositivos online/offline correctamente

### Comandos de verificación en terminal
```bash
# Verificar que el servidor Node.js está corriendo
ps aux | grep node

# Verificar que Chromium está ejecutándose
ps aux | grep chromium

# Verificar resolución actual de pantalla
xrandr
```

---

## Detener las pruebas

### Cerrar Chromium
```bash
pkill chromium
```

### Cerrar servidor X
```bash
pkill X
```

### Detener servidor Node.js
En la terminal donde está corriendo, presionar `Ctrl+C`

---

## Errores esperados (normales)

Durante la ejecución de Chromium, es normal ver estos errores en la consola:
```
ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: QUOTA_EXCEEDED
```

**Explicación**: Son errores de servicios de Google Cloud Messaging que no afectan el funcionamiento local de la aplicación.

---

## Resultado Esperado

Al completar esta fase exitosamente:
- El servidor Node.js responde en `localhost:3000`
- Chromium muestra la aplicación en pantalla completa
- La interfaz es completamente funcional con mouse
- Los WebSockets actualizan datos en tiempo real
- No hay barras ni elementos del navegador visibles

Una vez verificado el funcionamiento correcto, se puede proceder a la Fase 3 para automatizar el sistema con PM2.