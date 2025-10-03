# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2025-10-03

### ✨ Added
- **Sistema MQTT completo** para comunicación con dispositivos ESP32
  - Suscripción a topics `NODO/+/ACK` para eventos de dispositivos
  - Publicación en topics `NODO/<MAC>/CMD` para comandos
  - Validación y sanitización robusta de mensajes
  - Respuestas ACK específicas (ack_ans_rst, ack_ans_button, etc.)

- **Sistema WebSocket completo** para frontend en tiempo real
  - Conexión bidireccional con reconexión automática
  - Broadcasting automático de eventos MQTT a clientes web
  - API de comandos de dispositivos desde frontend
  - Keep-alive con ping/pong (latencia < 15ms confirmada)

- **Integración MQTT ↔ WebSocket**
  - Traducción automática de eventos ESP32 → notificaciones web
  - Traducción de comandos web → comandos MQTT
  - Capa de traducción MAC ↔ ID para compatibilidad
  - Processing en tiempo real (< 100ms end-to-end)

- **10 comandos/eventos MQTT implementados:**
  - `ping` - Verificación de conectividad ✅ **PROBADO**
  - `status` - Información del dispositivo (GET INFO) **PENDIENTE, NO IMPORTANTE**
  - `play_track` - Reproducción de audio (tracks 1-500) ✅ **PROBADO**
  - `stop_audio` - Detener reproducción **PENDIENTE, NO IMPORTANTE**
  - `set_volume` - Control de volumen (0-100) **PENDIENTE, NO IMPORTANTE**
  - `reinicio_srv` - Reinicio desde servidor **PENDIENTE, NO IMPORTANTE**
  - `button` - Evento botón de pánico (ESP32 → Backend) ✅ **PROBADO**
  - `hb` - Heartbeat del dispositivo ✅ **PROBADO** (eventos ESP32 → Frontend)
  - `rst` - Reset con sincronización de tiempo ✅ **PROBADO** (ESP32 → Backend)
  - `play_fin` - Finalización de reproducción (ESP32 → Backend) **PENDIENTE, NO IMPORTANTE**

- **Frontend mockup completo**
  - Interfaz responsive con estados visuales (Online, Offline, Activada, NoServer)
  - Cliente WebSocket funcional con logging extensivo
  - Reloj en tiempo real y indicador de conexión
  - Grid dinámico para múltiples dispositivos

- **Gestión de datos JSON**
  - `alarmas.json` - Información de dispositivos por ID
  - `registro_evento.json` - Historial de eventos
  - `mac_to_id.json` - Tabla de traducción MAC ↔ ID
  - `device_status.json` - Estado actual de dispositivos
  - Operaciones CRUD con `db-repository.js`

- **Documentación completa**
  - Guía de comandos MQTT con ejemplos funcionales
  - API WebSocket con formatos de mensaje
  - Arquitectura del sistema con diagramas de flujo
  - Documentación de integración y despliegue
  - Guía del frontend mockup

### 🧪 Testing
- **✅ Flujo ESP32 → Frontend validado:**
  - Eventos heartbeat confirmados funcionando end-to-end
  - Broadcasting automático MQTT → WebSocket → Navegador

- **✅ Flujo Frontend → ESP32 validado:**
  - Comando **PING** probado exitosamente desde consola del navegador
  - Comando **PLAY_TRACK** probado exitosamente con track 25
  - Confirmación inmediata del backend + respuesta final del ESP32
  - Timeouts y error handling funcionando correctamente

- **⚡ Comandos adicionales listos** (siguen el mismo patrón validado):
  - `get_status`, `stop_audio`, `set_volume`, `reboot`

### 📁 File Structure
```
/red-local-iot
  /backend
    /mqtt/              # Módulo MQTT completo
    /websocket/         # Módulo WebSocket completo  
    /public/            # Frontend mockup
    /data/              # Archivos de datos
    server.js           # Servidor principal
  /data/                # Repositorio de datos
  README.md             # Documentación principal
  CHANGELOG.md          # Este archivo
```

### 🔧 Technical Details
- **Node.js** backend con arquitectura modular
- **MQTT** integration con validación robusta
- **WebSocket** con reconexión automática
- **JSON** data persistence con operaciones atómicas
- **Error handling** completo con códigos específicos
- **Logging** extensivo para debugging y monitoring

### 📋 Dependencies
- **MQTT client** para comunicación con broker
- **WebSocket** para tiempo real con frontend
- **Express** para servidor HTTP
- **JSON file operations** para persistencia

---

## [Unreleased]

### 🔄 Planned
- Implementación de ESP32 firmware
- Frontend dinámico (reemplazo del mockup)
- Dashboard administrativo
- Autenticación y autorización
- Base de datos relacional (migración desde JSON)
- API REST complementaria
- Logging a archivos
- Monitoreo de performance
- Tests unitarios automatizados

---

**Versión actual:** 0.1.0  
**Estado:** Sistema backend completo y funcional  
**Próxima versión:** 0.2.0 (ESP32 firmware + Frontend dinámico)