# 📚 Documentación Frontend - Sistema de Monitoreo IoT

**Versión:** v0.2-beta  
**Última actualización:** 24 de Octubre, 2025

---

## 📖 Índice General

### 🔧 Fundamentos
1. [EventBus](./01-fundamentos/EventBus.md) - Bus de eventos global
2. [StateManager](./01-fundamentos/StateManager.md) - Gestión de estado
3. [DOMHelpers](./01-fundamentos/DOMHelpers.md) - Utilidades DOM

### 🌐 Servicios WebSocket
4. [WebSocketService](./02-servicios/WebSocketService.md) - Servicio principal
5. [ConnectionManager](./02-servicios/websocket/ConnectionManager.md) - Gestión de conexión
6. [MessageRouter](./02-servicios/websocket/MessageRouter.md) - Enrutador de mensajes

#### Handlers
7. [HandshakeHandler](./02-servicios/websocket/handlers/HandshakeHandler.md) - Handshake inicial
8. [DeviceUpdateHandler](./02-servicios/websocket/handlers/DeviceUpdateHandler.md) - Actualizaciones
9. [DeviceAlarmHandler](./02-servicios/websocket/handlers/DeviceAlarmHandler.md) - Alarmas

### 🎨 Componentes
10. [Toast](./03-components/ui/Toast.md) - Notificaciones
11. [DeviceCard](./03-components/DeviceCard.md) - Tarjeta de dispositivo
12. [DeviceList](./03-components/DeviceList.md) - Contenedor de tarjetas

### 🚀 Aplicación
13. [App](./04-app/App.md) - Orquestador principal

### ⚙️ Configuración
14. [app-config](./05-config/app-config.md) - Configuración centralizada

---

## 🚀 Inicio Rápido

```javascript
// 1. Importar App
import App from './js/App.js';

// 2. Inicializar
await App.init();

// 3. La aplicación está lista ✅
```

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────┐
│                   index.html                 │
│           (Punto de entrada HTML)            │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│                   App.js                     │
│         (Orquestador principal)              │
└─┬──────────┬──────────┬──────────┬──────────┘
  │          │          │          │
  │          │          │          │
  ▼          ▼          ▼          ▼
┌───────┐ ┌─────────┐ ┌──────┐ ┌─────────┐
│Event  │ │State    │ │Device│ │WebSocket│
│Bus    │ │Manager  │ │List  │ │Service  │
└───────┘ └─────────┘ └──────┘ └────┬────┘
                         │           │
                         │           ▼
                         │     ┌──────────────┐
                         │     │Connection    │
                         │     │Manager       │
                         │     └──────┬───────┘
                         │            │
                         │            ▼
                         │     ┌──────────────┐
                         │     │Message       │
                         │     │Router        │
                         │     └──────┬───────┘
                         │            │
                         │            ▼
                         │     ┌──────────────┐
                         │     │Handlers (3)  │
                         │     └──────────────┘
                         │
                         ▼
                    ┌──────────┐
                    │DeviceCard│
                    │(múltiples)│
                    └──────────┘
```

---

## 📊 Flujo de Datos

```
[1] Backend envía mensaje WebSocket
  ↓
[2] WebSocketService.onmessage recibe
  ↓
[3] MessageRouter.route(message)
  ├─> Identifica tipo de mensaje
  └─> EventBus.emit('message:{type}', data)
  ↓
[4] Handler apropiado escucha evento
  ├─> HandshakeHandler (handshake_response)
  ├─> DeviceUpdateHandler (device_update)
  └─> DeviceAlarmHandler (device_alarm)
  ↓
[5] Handler actualiza StateManager
  ├─> StateManager.setDevices(...)
  └─> EventBus.emit('state:devices:changed')
  ↓
[6] Componentes escuchan cambio de estado
  ├─> DeviceList.updateDeviceList()
  └─> DeviceCard.update()
  ↓
[7] UI actualizada ✅
```

---

## 🛠️ Desarrollo

### Requisitos
- Node.js 18+ (para backend)
- Navegador moderno con soporte ES6 Modules
- Editor con soporte JSDoc (VSCode recomendado)

### Estructura del Proyecto
```
backend/public/
├── js/
│   ├── App.js
│   ├── config/
│   │   └── app-config.js
│   ├── core/
│   │   ├── EventBus.js
│   │   ├── StateManager.js
│   │   └── DOMHelpers.js
│   ├── services/
│   │   ├── WebSocketService.js
│   │   └── websocket/
│   │       ├── ConnectionManager.js
│   │       ├── MessageRouter.js
│   │       └── handlers/
│   │           ├── HandshakeHandler.js
│   │           ├── DeviceUpdateHandler.js
│   │           └── DeviceAlarmHandler.js
│   └── components/
│       ├── DeviceCard.js
│       ├── DeviceList.js
│       └── ui/
│           └── Toast.js
├── css/
│   └── main.css
└── index.html
```

---

## 📚 Guías

- [Cómo agregar un nuevo comando](./05-config/app-config.md#agregar-nuevo-comando)
- [Cómo crear un nuevo handler](./02-servicios/websocket/MessageRouter.md#agregar-handler)
- [Cómo personalizar Toast](./03-components/ui/Toast.md)
- [Configuración de entornos](./05-config/app-config.md#configuración-por-entorno)

---

## 🐛 Debugging

```javascript
// Ver estado completo
console.log(StateManager.getState());

// Ver status de App
console.table(App.getStatus());

// Ver config
import config from './js/config/app-config.js';
console.log(config);

// Habilitar logs de EventBus
// En app-config.js:
debug: {
  showEvents: true
}
```

---

## 📝 Contribuir

1. Leer documentación de módulo específico
2. Seguir patrones establecidos
3. Documentar con JSDoc
4. Probar cambios localmente

---

## 📄 Licencia

© 2025 NEXUS TECH - Sistema de Monitoreo IoT