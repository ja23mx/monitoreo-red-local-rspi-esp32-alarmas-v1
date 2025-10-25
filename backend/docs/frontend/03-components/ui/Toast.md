# Toast - Sistema de Notificaciones Temporales

**Versión:** v0.2-beta  
**Archivo:** `js/components/ui/Toast.js`  
**Patrón:** Singleton + Auto-dismiss + Queue Management  
**Dependencias:** `DOMHelpers.js`, `app-config.js`

---

## 📋 Descripción

Toast es el **sistema de notificaciones temporales** de la aplicación. Muestra mensajes no intrusivos en la esquina superior derecha de la pantalla que desaparecen automáticamente después de un tiempo configurable. Utilizado para feedback inmediato de operaciones (éxito, error, advertencias, información).

### Características principales:
- ✅ **Singleton pattern**: Una única instancia global
- ✅ **4 tipos de notificación**: success, error, warning, info
- ✅ **Auto-dismiss**: Desaparición automática configurable
- ✅ **Queue management**: Límite de toasts visibles simultáneos
- ✅ **Manual close**: Botón × para cerrar manualmente
- ✅ **CSS animations**: Entrada/salida suaves
- ✅ **Accessibility**: ARIA attributes (`role="alert"`, `aria-live="polite"`)
- ✅ **DOMHelpers integration**: Uso completo de utilidades DOM
- ✅ **Configurable**: Duraciones y límites desde app-config.js

---

## 🏗️ Arquitectura

```javascript
Toast (Singleton)
  ├── container: HTMLElement (.toast-container)
  ├── activeToasts: Map<string, Object>
  │    └── { element, timeoutId, type }
  ├── idCounter: number (generador de IDs)
  │
  ├── init() - Crear contenedor global
  ├── show(message, type, duration) - Mostrar toast
  ├── hide(toastId) - Ocultar específico
  ├── clear() - Limpiar todos
  └── getActiveCount() - Cantidad activos
```

### Estructura HTML generada:
```html
<body>
  <!-- Auto-generado por Toast -->
  <div class="toast-container">
    <!-- Toast individual -->
    <div id="toast-1" class="toast toast-success toast-show" role="alert" aria-live="polite">
      <span class="toast-message">✅ Operación exitosa</span>
      <button class="toast-close" aria-label="Cerrar notificación">×</button>
    </div>
    
    <div id="toast-2" class="toast toast-error toast-show" role="alert" aria-live="polite">
      <span class="toast-message">❌ Error al conectar</span>
      <button class="toast-close" aria-label="Cerrar notificación">×</button>
    </div>
  </div>
</body>
```

---

## 🎨 Tipos de Toast

### 1. Success (verde)
**Uso:** Operaciones exitosas, confirmaciones

**Ejemplos:**
```javascript
Toast.show('✅ Dispositivo conectado', 'success');
Toast.show('✅ Comando enviado correctamente', 'success');
Toast.show('✅ Configuración guardada', 'success');
```

**Duración por defecto:** 3000ms (3 segundos)

**CSS classes:** `toast toast-success`

---

### 2. Error (rojo)
**Uso:** Errores críticos, fallos de operación

**Ejemplos:**
```javascript
Toast.show('❌ Error al conectar con el servidor', 'error');
Toast.show('❌ Comando falló: Dispositivo offline', 'error');
Toast.show('❌ Error al procesar respuesta', 'error');
```

**Duración por defecto:** 5000ms (5 segundos)

**CSS classes:** `toast toast-error`

---

### 3. Warning (amarillo)
**Uso:** Advertencias, situaciones que requieren atención

**Ejemplos:**
```javascript
Toast.show('⚠️ Dispositivo sin respuesta', 'warning');
Toast.show('⚠️ Batería baja en ESP32_003', 'warning');
Toast.show('⚠️ MQTT desconectado, reconectando...', 'warning');
```

**Duración por defecto:** 4000ms (4 segundos)

**CSS classes:** `toast toast-warning`

---

### 4. Info (azul)
**Uso:** Información general, mensajes informativos

**Ejemplos:**
```javascript
Toast.show('ℹ️ Sincronizando dispositivos...', 'info');
Toast.show('ℹ️ Actualizando datos del servidor', 'info');
Toast.show('ℹ️ Nueva versión disponible', 'info');
```

**Duración por defecto:** 3000ms (3 segundos)

**CSS classes:** `toast toast-info`

---

## 🔧 Métodos Públicos

### `show(message, type, duration)`
Mostrar un toast en pantalla.

**Parámetros:**
- `message` (string, requerido): Texto a mostrar
- `type` (string, opcional): Tipo de toast - `'success'` | `'error'` | `'warning'` | `'info'` (default: `'info'`)
- `duration` (number, opcional): Duración en milisegundos (default: según config)

**Retorna:** `string` - ID único del toast (`"toast-1"`, `"toast-2"`, etc.)

**Comportamiento:**
```javascript
show(message, type, duration)
  │
  ├─> [1] Validar parámetros
  │    ├─> if (!message || typeof !== 'string') → console.warn + return null
  │    └─> if (type no válido) → type = 'info'
  │
  ├─> [2] Obtener duración desde config si no especificada
  │    duration = duration || config.notifications.duration[type]
  │
  ├─> [3] Generar ID único
  │    toastId = `toast-${++this.idCounter}`
  │
  ├─> [4] Crear elemento HTML
  │    toast = createToastElement(toastId, message, type)
  │
  ├─> [5] Verificar límite de toasts visibles
  │    if (activeToasts.size >= config.notifications.maxVisible) {
  │      hide(oldest_toast_id)  // FIFO - remover el más antiguo
  │    }
  │
  ├─> [6] Agregar al contenedor
  │    container.appendChild(toast)
  │
  ├─> [7] Activar animación de entrada
  │    setTimeout(() => toast.classList.add('toast-show'), 10)
  │
  ├─> [8] Programar auto-dismiss
  │    timeoutId = setTimeout(() => hide(toastId), duration)
  │
  └─> [9] Guardar en activeToasts Map
       activeToasts.set(toastId, { element, timeoutId, type })
```

**Ejemplos de uso:**

```javascript
// Básico (usa duración por defecto)
const id = Toast.show('Operación exitosa', 'success');
// → Visible por 3000ms

// Con duración custom
Toast.show('Error crítico', 'error', 10000);
// → Visible por 10 segundos

// Solo mensaje (tipo 'info' por defecto)
Toast.show('Cargando...');
// → Tipo 'info', visible por 3000ms

// Con emojis
Toast.show('🚀 Servidor iniciado', 'success');
Toast.show('⚠️ Batería baja', 'warning');
```

**Validaciones:**
```javascript
// ❌ Inválido - mensaje no es string
Toast.show(123, 'success');
// → console.warn + return null

// ❌ Inválido - tipo no válido
Toast.show('Mensaje', 'invalid-type');
// → console.warn + type = 'info' (fallback)

// ✅ Válido
Toast.show('Mensaje válido', 'success');
// → ID retornado: "toast-1"
```

---

### `hide(toastId)`
Ocultar un toast específico manualmente.

**Parámetros:**
- `toastId` (string, requerido): ID del toast a ocultar

**Retorna:** `void`

**Comportamiento:**
```javascript
hide(toastId)
  │
  ├─> [1] Buscar en activeToasts
  │    toastData = activeToasts.get(toastId)
  │    if (!toastData) return
  │
  ├─> [2] Cancelar timeout de auto-dismiss
  │    clearTimeout(toastData.timeoutId)
  │
  ├─> [3] Aplicar animación de salida
  │    toast.classList.remove('toast-show')
  │    toast.classList.add('toast-hide')
  │
  ├─> [4] Remover del DOM después de animación
  │    setTimeout(() => {
  │      DOMHelpers.remove(toast)
  │      activeToasts.delete(toastId)
  │    }, 300)  // Duración de animación CSS
```

**Ejemplos de uso:**

```javascript
// Mostrar y ocultar manualmente
const id = Toast.show('Procesando...', 'info', 30000);

// Ocultar después de 5 segundos (sin esperar los 30s)
setTimeout(() => {
  Toast.hide(id);
}, 5000);

// Ocultar al recibir respuesta del servidor
async function sendCommand() {
  const id = Toast.show('Enviando comando...', 'info', 60000);
  
  try {
    await fetch('/api/command');
    Toast.hide(id);
    Toast.show('✅ Comando enviado', 'success');
  } catch (error) {
    Toast.hide(id);
    Toast.show('❌ Error al enviar', 'error');
  }
}
```

---

### `clear()`
Limpiar todos los toasts visibles.

**Parámetros:** Ninguno

**Retorna:** `void`

**Comportamiento:**
```javascript
clear()
  │
  └─> activeToasts.forEach(id => hide(id))
```

**Ejemplos de uso:**

```javascript
// Mostrar múltiples toasts
Toast.show('Mensaje 1', 'info');
Toast.show('Mensaje 2', 'success');
Toast.show('Mensaje 3', 'warning');

// Limpiar todos de golpe
Toast.clear();
// → Los 3 toasts desaparecen con animación

// Uso típico: limpiar al cambiar de página
function navigateToPage(page) {
  Toast.clear();  // Limpiar notificaciones de página anterior
  loadPage(page);
}
```

---

### `getActiveCount()`
Obtener la cantidad de toasts actualmente visibles.

**Parámetros:** Ninguno

**Retorna:** `number` - Cantidad de toasts activos

**Ejemplos de uso:**

```javascript
console.log(Toast.getActiveCount());
// → 0

Toast.show('Mensaje 1', 'info');
Toast.show('Mensaje 2', 'success');

console.log(Toast.getActiveCount());
// → 2

// Verificar límite antes de mostrar
if (Toast.getActiveCount() < config.notifications.maxVisible) {
  Toast.show('Nuevo mensaje', 'info');
}
```

---

## ⚙️ Configuración (app-config.js)

```javascript
// filepath: js/config/app-config.js
export default {
  notifications: {
    duration: {
      success: 3000,    // 3 segundos
      error: 5000,      // 5 segundos
      warning: 4000,    // 4 segundos
      info: 3000        // 3 segundos
    },
    maxVisible: 3       // Máximo de toasts simultáneos
  }
};
```

### Personalizar duraciones:
```javascript
// Modificar en app-config.js
notifications: {
  duration: {
    success: 2000,    // Más rápido
    error: 8000,      // Más lento para errores críticos
    warning: 5000,
    info: 3000
  },
  maxVisible: 5       // Permitir más toasts simultáneos
}
```

---

## 🎨 CSS Requerido

### Estructura mínima:
```css
/* Contenedor global (esquina superior derecha) */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
}

/* Toast base */
.toast {
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: white;
  opacity: 0;
  transform: translateX(400px);
  transition: all 0.3s ease;
}

/* Animación de entrada */
.toast.toast-show {
  opacity: 1;
  transform: translateX(0);
}

/* Animación de salida */
.toast.toast-hide {
  opacity: 0;
  transform: translateX(400px);
}

/* Tipos */
.toast-success {
  background-color: #10b981; /* Verde */
}

.toast-error {
  background-color: #ef4444; /* Rojo */
}

.toast-warning {
  background-color: #f59e0b; /* Amarillo */
}

.toast-info {
  background-color: #3b82f6; /* Azul */
}

/* Mensaje */
.toast-message {
  flex: 1;
  line-height: 1.5;
}

/* Botón cerrar */
.toast-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.toast-close:hover {
  opacity: 1;
}

/* Responsive */
@media (max-width: 640px) {
  .toast-container {
    left: 20px;
    right: 20px;
    max-width: none;
  }
  
  .toast {
    font-size: 13px;
    padding: 12px 16px;
  }
}
```

---

## 🔥 Gestión de Queue (FIFO)

### Comportamiento con límite de 3 toasts:

```javascript
// Escenario: maxVisible = 3

// [1] Mostrar primer toast
Toast.show('Mensaje 1', 'info');
// → activeToasts = [toast-1]

// [2] Mostrar segundo toast
Toast.show('Mensaje 2', 'success');
// → activeToasts = [toast-1, toast-2]

// [3] Mostrar tercer toast
Toast.show('Mensaje 3', 'warning');
// → activeToasts = [toast-1, toast-2, toast-3]

// [4] Mostrar cuarto toast (excede límite)
Toast.show('Mensaje 4', 'error');
// → hide(toast-1) automático (FIFO - First In, First Out)
// → activeToasts = [toast-2, toast-3, toast-4]
```

**Implementación:**
```javascript
// En método show()
if (this.activeToasts.size >= config.notifications.maxVisible) {
  // Obtener el primer ID insertado (más antiguo)
  const oldestId = this.activeToasts.keys().next().value;
  this.hide(oldestId);
}
```

---

## 📊 Flujo de Vida de un Toast

```
[1] Toast.show('Mensaje', 'success', 3000)
  ↓
[2] Validar parámetros ✅
  ↓
[3] Generar ID: "toast-1"
  ↓
[4] Crear elemento HTML:
    <div id="toast-1" class="toast toast-success">
      <span class="toast-message">Mensaje</span>
      <button class="toast-close">×</button>
    </div>
  ↓
[5] Verificar límite (3 toasts)
  ├─> if (activeToasts.size < 3) → Continuar
  └─> else → hide(oldest) primero
  ↓
[6] container.appendChild(toast)
  ↓
[7] setTimeout(() => addClass('toast-show'), 10)
  ↓
[8] CSS transition: opacity 0 → 1, translateX(400px) → 0
  ↓
[9] Usuario ve toast en pantalla (300ms de animación)
  ↓
[10] setTimeout(() => hide(toastId), 3000)
  ↓
[11a] Opción A: Auto-dismiss después de 3s
  ├─> removeClass('toast-show')
  ├─> addClass('toast-hide')
  ├─> CSS transition: opacity 1 → 0, translateX(0) → 400px
  ├─> setTimeout(() => remove(toast), 300)
  └─> activeToasts.delete(toastId)

[11b] Opción B: Usuario hace clic en ×
  ├─> clearTimeout(timeoutId)  // Cancelar auto-dismiss
  ├─> removeClass('toast-show')
  ├─> addClass('toast-hide')
  ├─> CSS transition
  └─> remove(toast) + delete de Map
```

---

## 🧪 Testing

### Test: Mostrar toast básico
```javascript
import Toast from './components/ui/Toast.js';

// Limpiar estado
Toast.clear();

// Mostrar toast
const id = Toast.show('Test message', 'success');

// Verificar
console.assert(id === 'toast-1', 'ID debe ser toast-1');
console.assert(Toast.getActiveCount() === 1, 'Debe haber 1 toast activo');

// Verificar elemento en DOM
const element = document.getElementById(id);
console.assert(element !== null, 'Toast debe estar en DOM');
console.assert(element.classList.contains('toast-success'), 'Debe tener clase success');

// Verificar mensaje
const messageSpan = element.querySelector('.toast-message');
console.assert(messageSpan.textContent === 'Test message', 'Mensaje correcto');
```

---

### Test: Validación de parámetros
```javascript
// ❌ Mensaje inválido
const id1 = Toast.show(null, 'success');
console.assert(id1 === null, 'Debe retornar null si mensaje inválido');

// ❌ Tipo inválido
const id2 = Toast.show('Mensaje', 'invalid-type');
console.assert(id2 !== null, 'Debe crear toast con tipo fallback');

const element = document.getElementById(id2);
console.assert(element.classList.contains('toast-info'), 'Debe usar tipo info como fallback');
```

---

### Test: Límite de toasts (queue FIFO)
```javascript
// Configurar límite
// config.notifications.maxVisible = 3

Toast.clear();

// Mostrar 3 toasts
const id1 = Toast.show('Mensaje 1', 'info');
const id2 = Toast.show('Mensaje 2', 'success');
const id3 = Toast.show('Mensaje 3', 'warning');

console.assert(Toast.getActiveCount() === 3, 'Debe tener 3 toasts');

// Mostrar cuarto (excede límite)
const id4 = Toast.show('Mensaje 4', 'error');

// Verificar que el más antiguo (id1) fue removido
setTimeout(() => {
  console.assert(Toast.getActiveCount() === 3, 'Debe mantener límite de 3');
  console.assert(document.getElementById(id1) === null, 'toast-1 debe estar removido');
  console.assert(document.getElementById(id2) !== null, 'toast-2 debe existir');
  console.assert(document.getElementById(id4) !== null, 'toast-4 debe existir');
}, 100);
```

---

### Test: Auto-dismiss
```javascript
Toast.clear();

const id = Toast.show('Test', 'info', 1000); // 1 segundo

// Verificar que existe
console.assert(Toast.getActiveCount() === 1, 'Debe existir');

// Esperar auto-dismiss
setTimeout(() => {
  console.assert(Toast.getActiveCount() === 0, 'Debe auto-dismiss después de 1s');
  console.assert(document.getElementById(id) === null, 'Toast debe estar removido del DOM');
}, 1500);
```

---

### Test: Hide manual
```javascript
Toast.clear();

const id = Toast.show('Test', 'info', 30000); // 30 segundos

// Verificar que existe
console.assert(Toast.getActiveCount() === 1, 'Debe existir');

// Ocultar manualmente
Toast.hide(id);

// Esperar animación de salida
setTimeout(() => {
  console.assert(Toast.getActiveCount() === 0, 'Debe estar removido');
  console.assert(document.getElementById(id) === null, 'Toast removido del DOM');
}, 500);
```

---

### Test: Clear all
```javascript
Toast.clear();

// Mostrar múltiples toasts
Toast.show('Mensaje 1', 'info');
Toast.show('Mensaje 2', 'success');
Toast.show('Mensaje 3', 'warning');

console.assert(Toast.getActiveCount() === 3, 'Debe tener 3 toasts');

// Limpiar todos
Toast.clear();

setTimeout(() => {
  console.assert(Toast.getActiveCount() === 0, 'Todos deben estar removidos');
}, 500);
```

---

## 📊 Casos de Uso Reales

### 1. Feedback de comandos WebSocket
```javascript
// DeviceCard.js
async handleAction(action) {
  const device = StateManager.getDevice(this.deviceId);
  
  if (device.status !== 'online') {
    Toast.show(`❌ Dispositivo "${device.name}" está offline`, 'error');
    return;
  }
  
  // Mostrar toast de "enviando"
  const sendingId = Toast.show(`⏳ Enviando comando "${action}"...`, 'info', 30000);
  
  try {
    WebSocketService.send({
      type: 'device_command',
      deviceId: this.deviceId,
      command: action
    });
    
    // Ocultar toast de "enviando"
    Toast.hide(sendingId);
    
    // Mostrar toast de éxito
    Toast.show(`✅ Comando "${action}" enviado a ${device.name}`, 'success');
    
  } catch (error) {
    Toast.hide(sendingId);
    Toast.show(`❌ Error al enviar comando: ${error.message}`, 'error');
  }
}
```

---

### 2. Notificaciones de estado de conexión
```javascript
// WebSocketService.js
class WebSocketService {
  handleOpen() {
    Toast.show('✅ Conectado al servidor', 'success');
  }
  
  handleClose() {
    Toast.show('⚠️ Desconectado del servidor. Reconectando...', 'warning', 10000);
  }
  
  handleError(error) {
    Toast.show('❌ Error de conexión WebSocket', 'error');
  }
}
```

---

### 3. Progress toast con actualización
```javascript
// UploadManager.js
class UploadManager {
  async uploadFile(file) {
    // Mostrar toast inicial
    const uploadId = Toast.show('⏳ Subiendo archivo...', 'info', 60000);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: file
      });
      
      // Ocultar toast de progreso
      Toast.hide(uploadId);
      
      if (response.ok) {
        Toast.show('✅ Archivo subido correctamente', 'success');
      } else {
        Toast.show('❌ Error al subir archivo', 'error');
      }
      
    } catch (error) {
      Toast.hide(uploadId);
      Toast.show(`❌ Error: ${error.message}`, 'error');
    }
  }
}
```

---

### 4. Notificaciones de alarma
```javascript
// DeviceAlarmHandler.js
EventBus.on('device:alarm:changed', ({ deviceId, alarmActive, deviceName }) => {
  if (alarmActive) {
    Toast.show(`🚨 ALARMA ACTIVADA: ${deviceName}`, 'error', 10000);
  } else {
    Toast.show(`✅ Alarma desactivada: ${deviceName}`, 'success');
  }
});
```

---

## ⚡ Performance

### Mediciones (Chrome DevTools):
- **show() execution:** < 1ms
- **hide() execution:** < 0.5ms
- **CSS animation:** 300ms (GPU-accelerated)
- **Memory per toast:** ~2KB

### Optimizaciones:
- ✅ **Map lookup:** O(1) para buscar toasts
- ✅ **FIFO removal:** O(1) usando Map.keys().next()
- ✅ **CSS transitions:** Hardware-accelerated (transform, opacity)
- ✅ **Cleanup:** setTimeout cleanup en hide()

---

## 🚨 Errores Comunes

### ❌ Error: "message debe ser un string"
```javascript
// ❌ Pasar número
Toast.show(123, 'success');
// → console.warn + return null

// ✅ Convertir a string
Toast.show(String(123), 'success');
Toast.show(`${value}`, 'success');
```

---

### ❌ Warning: Tipo no válido
```javascript
// ❌ Tipo incorrecto
Toast.show('Mensaje', 'danger');  // No existe 'danger'
// → console.warn + type = 'info' (fallback)

// ✅ Tipos válidos
Toast.show('Mensaje', 'success');
Toast.show('Mensaje', 'error');
Toast.show('Mensaje', 'warning');
Toast.show('Mensaje', 'info');
```

---

### ❌ Issue: Toast no se muestra
```javascript
// Causa: CSS no cargado o contenedor no visible

// Verificar:
const container = document.querySelector('.toast-container');
console.log(container); // Debe existir
console.log(window.getComputedStyle(container).display); // No debe ser 'none'

// Solución: Asegurar que CSS esté cargado
<link rel="stylesheet" href="/css/components/toast.css">
```

---

## 🔧 Debugging

### Ver toasts activos:
```javascript
// En consola del navegador
console.log(Toast.getActiveCount());
// → 2

console.log(Toast.activeToasts);
// → Map { "toast-1" => {...}, "toast-2" => {...} }
```

### Interceptar todos los toasts:
```javascript
// Wrapper para logging
const originalShow = Toast.show.bind(Toast);
Toast.show = function(message, type, duration) {
  console.log('🔍 Toast.show():', { message, type, duration });
  return originalShow(message, type, duration);
};
```

### Simular límite de queue:
```javascript
// Forzar límite bajo para testing
config.notifications.maxVisible = 2;

Toast.show('Toast 1', 'info');
Toast.show('Toast 2', 'success');
Toast.show('Toast 3', 'warning');  // Auto-remove toast 1
```

---

## 📚 Referencias

### Patrones implementados:
- **Singleton Pattern:** Una única instancia global
- **Queue Management:** FIFO para límite de toasts
- **Auto-dismiss Pattern:** setTimeout para remoción automática

### Accessibility:
- [ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
- [role="alert"](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role)

### Design inspiration:
- [Material Design Snackbar](https://material.io/components/snackbars)
- [Bootstrap Toast](https://getbootstrap.com/docs/5.0/components/toasts/)

---

## 🎯 Roadmap

### Mejoras futuras:
- [ ] **Métodos helper:** `Toast.success()`, `Toast.error()`, `Toast.warning()`, `Toast.info()`
- [ ] **Progress bar:** Indicador visual de tiempo restante
- [ ] **Stacking:** Apilar toasts en vez de deslizar
- [ ] **Positions:** Permitir esquinas diferentes (top-left, bottom-right, etc.)
- [ ] **Actions:** Botones de acción dentro del toast (ej: "Deshacer")
- [ ] **Rich content:** Soportar HTML o componentes dentro del toast
- [ ] **Sound notifications:** Sonido opcional según tipo
- [ ] **Persistence:** Guardar en localStorage para mostrar al recargar

---

## 📝 Changelog

### v0.2-beta (Actual)
- ✅ Sistema de toasts con 4 tipos
- ✅ Auto-dismiss configurable
- ✅ Queue management (FIFO)
- ✅ Manual close con botón ×
- ✅ CSS animations
- ✅ ARIA accessibility
- ✅ DOMHelpers integration
- ✅ Configuración desde app-config.js

---

**Anterior:** [StateManager.md](../../01-fundamentos/StateManager.md) - Estado global  
**Siguiente:** [DeviceCard.md](../DeviceCard.md) - Componente de tarjeta

**Ver también:**
- [DOMHelpers.md](../../utils/DOMHelpers.md) - Utilidades DOM
- [app-config.md](../../config/app-config.md) - Configuración global
- [DeviceAlarmHandler.md](../../02-servicios/websocket/handlers/DeviceAlarmHandler.md) - Uso de Toast en alarmas