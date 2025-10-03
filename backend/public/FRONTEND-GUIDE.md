# Guía del Frontend - Mockup de Interfaz Web

Este documento describe el mockup de interfaz web (`index-2.html`) que sirve como guía de diseño para el sistema de monitoreo de botones de pánico.

---

## Estructura del Mockup

### **Header Section:**
- **Título:** "Monitoreo de Botones de Pánico"
- **Reloj en tiempo real:** `id="clock"` - Actualizado por `app.js`
- **Indicador WebSocket:** `id="websocketIcon"` - Estados: `connected`/`disconnected`

### **Main Section:**
- **Contador dinámico:** "Dispositivos Online: X/Y"
- **Grid de dispositivos:** `id="alarmsDevicesGrid"` - Contenedor principal

---

## Estados Visuales de Dispositivos

### **1. Estado ONLINE (.online)**
```html
<div class="alarm-device-card online">
  <h3>Poste Entrada (ESP32_001)</h3>
  <p>Status: ONLINE</p>
  <p>Alarma: OFF</p>
  <button>Probar Conexión</button>
  <button>Enviar Aviso</button>
</div>
```
- **Color:** Verde
- **Descripción:** Dispositivo conectado y funcionando

### **2. Estado OFFLINE (.offline)**
```html
<div class="alarm-device-card offline">
  <h3>Poste Salida (ESP32_002)</h3>
  <p>Status: OFFLINE</p>
  <p>Alarma: OFF</p>
  <button>Probar Conexión</button>
  <button>Enviar Aviso</button>
</div>
```
- **Color:** Rojo
- **Descripción:** Dispositivo desconectado

### **3. Estado ACTIVADA (.activated)**
```html
<div class="alarm-device-card activated">
  <h3>Poste Parque (ESP32_003)</h3>
  <p>Status: ONLINE</p>
  <p>Alarma: ON</p>
  <button>Probar Conexión</button>
  <button>Desactivar</button>
</div>
```
- **Color:** Naranja/Amarillo
- **Descripción:** Alarma activa (botón presionado)

### **4. Estado NOSERVER (.noserver)**
```html
<div class="alarm-device-card noserver">
  <h3>Dispositivo (ESP32_XXX)</h3>
  <p>Status: SIN CONEXIÓN AL SERVIDOR</p>
  <p>Alarma: ---</p>
  <button disabled>Sin conexión</button>
</div>
```
- **Color:** Gris
- **Descripción:** Sin conexión al servidor

---

## Integración con WebSocket

### **Elementos dinámicos:**
- **`clock`** - Actualizado cada segundo por `updateClock()`
- **`websocketIcon`** - Cambia clase según conexión WebSocket
- **`alarmsDevicesGrid`** - Contenedor para actualización dinámica de dispositivos

### **Eventos esperados del backend:**
```javascript
// Actualización de estado de dispositivo
{
  "type": "notification",
  "event": "heartbeat",
  "data": {
    "deviceId": "ESP32_001",
    "deviceName": "Poste Entrada"
  }
}

// Botón de pánico presionado
{
  "type": "notification", 
  "event": "button_pressed",
  "data": {
    "deviceId": "ESP32_003",
    "deviceName": "Poste Parque"
  }
}
```

### **Comandos a enviar:**
```javascript
// Probar conexión
{
  "type": "device_command",
  "deviceId": "ESP32_001",
  "command": "ping"
}

// Enviar aviso (reproducir audio)
{
  "type": "device_command",
  "deviceId": "ESP32_001", 
  "command": "play_track",
  "data": {"parameters": {"track": 1}}
}
```

---

## Características Técnicas

### **Responsividad:**
- Meta viewport configurado
- CSS Grid para layout de dispositivos
- Diseño adaptable a móviles

### **Accesibilidad:**
- HTML semántico (`header`, `main`, `footer`)
- ARIA labels (`role`, `aria-live`)
- Iconos Font Awesome con significado

### **Recursos:**
- **Google Fonts:** Roboto (400, 500, 700)
- **Font Awesome:** 6.4.0 (iconos)
- **CSS modular:** Archivos separados por componente

---

## Implementación Pendiente

### **JavaScript dinámico:**
- **Actualización del grid** según eventos WebSocket
- **Manejo de clicks** en botones (envío de comandos)
- **Animaciones** para cambios de estado
- **Notificaciones** visuales para alertas

### **Estados adicionales:**
- **Cargando** - Durante envío de comandos
- **Error** - Para fallos de comunicación
- **Mantenimiento** - Para dispositivos en servicio

### **Funciones sugeridas:**
```javascript
// Actualizar estado de dispositivo
function updateDeviceStatus(deviceId, status, alarmState) { }

// Agregar nuevo dispositivo al grid
function addDeviceToGrid(deviceData) { }

// Manejar click en botón de comando
function handleDeviceCommand(deviceId, command) { }

// Mostrar notificación temporal
function showNotification(message, type) { }
```

---

## Archivos Relacionados

- **`index-2.html`** - Mockup principal
- **`app.js`** - Cliente WebSocket (funcional)
- **`css/*.css`** - Estilos modulares
- **Backend WebSocket** - API para comandos y eventos

---

**Versión:** 1.0  
**Última actualización:** 3 de octubre, 2025  
**Estado:** Mockup completo, integración JavaScript pendiente