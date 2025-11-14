# 🐛 Problemas Conocidos - Telegram Bot

> Registro de bugs y mejoras pendientes antes del próximo git push.

**Última actualización:** 25 de octubre, 2025  
**Versión actual:** 1.0.0-beta

---

## 🔴 Problemas Críticos

### Ninguno detectado
El sistema funciona correctamente en sus funciones principales.

---

## 🟡 Problemas No Críticos

### 1. **Errores en Menú de Tareas** 🐛

**Descripción:**  
El menú interactivo de gestión de tareas presenta errores al intentar editar/eliminar tareas usando botones inline.

**Componente afectado:**
- `handlers/task-handler.js`
- `handlers/command-handler.js` (callbacks de botones)

**Comandos afectados:**
- `/listartareas` - Los botones inline no responden correctamente
- Posibles problemas con:
  - ✏️ Editar tarea
  - 🔴 Toggle (habilitar/deshabilitar)
  - 🗑️ Eliminar tarea

**Síntomas:**
- [ ] Los botones no ejecutan la acción esperada
- [ ] Error al procesar callbacks
- [ ] Respuesta incorrecta del bot
- [ ] (Especificar síntomas exactos cuando se pruebe)

**Estado:** 🟡 **Pendiente de corrección**

**Prioridad:** Media (funcionalidad alternativa disponible vía comandos directos)

**Workaround temporal:**
Los usuarios pueden gestionar tareas mediante:
- Editar `task-config.json` manualmente
- Usar comandos `/creartarea` y formato de texto

**Solución propuesta:**
- Revisar handler de `callback_query` en `telegram-bot-manager.js`
- Validar estructura de callbacks en `task-handler.js`
- Agregar logging detallado para debug

**Notas:**
- No afecta las notificaciones de botón de pánico ✅
- No afecta la ejecución automática de tareas ✅
- Sistema principal funcional ✅

---

## ✅ Funcionalidades Verificadas (Funcionando)

### Core Features
- ✅ Inicialización del bot
- ✅ Autenticación de usuarios
- ✅ Logging completo
- ✅ Integración con TaskSystem
- ✅ Integración con MQTT

### Notificaciones
- ✅ Notificación de botón de pánico al grupo
- ✅ Formato de mensaje con emoji
- ✅ Información completa del dispositivo (nombre, ubicación, MAC, timestamp)
- ✅ Integración con db-repository

### Comandos Básicos
- ✅ `/start` - Mensaje de bienvenida
- ✅ `/ayuda` - Ayuda completa
- ✅ `/status` - Estado del sistema

### Task System
- ✅ Tareas programadas se ejecutan correctamente
- ✅ Scheduler funcional (cada 3 segundos)
- ✅ Publicación MQTT de comandos
- ✅ Persistencia en task-config.json

---

## 🔧 Mejoras Planificadas

### Prioridad Alta
- [ ] Corregir menú interactivo de tareas
- [ ] Agregar tests unitarios para handlers
- [ ] Documentar formato de callbacks

### Prioridad Media
- [ ] Agregar confirmación visual al crear tarea
- [ ] Mejorar mensajes de error
- [ ] Agregar comando `/eliminarultimotarea`

### Prioridad Baja
- [ ] Agregar estadísticas de uso
- [ ] Implementar notificaciones de dispositivos offline
- [ ] Agregar comando `/historial` para eventos recientes

---

## 📊 Testing Pendiente

### Por Probar
- [ ] Editar tarea desde botones inline
- [ ] Eliminar tarea desde botones inline
- [ ] Toggle de estado desde botones inline
- [ ] Crear tarea con caracteres especiales en nombre
- [ ] Crear tarea con límites (track > 999, hora > 23, etc.)

### Probado y Funcionando
- [x] Notificación de botón de pánico (evento real desde ESP32)
- [x] Autenticación de usuarios
- [x] Carga de configuración
- [x] Integración con db-repository
- [x] Logs de actividad

---

## 🚀 Roadmap

### Versión 1.0.0 (Próximo Release)
- Corregir menú de tareas
- Completar testing de todos los comandos
- Documentación completa de API
- Guía de troubleshooting

### Versión 1.1.0 (Futuro)
- Notificaciones de dispositivos offline
- Historial de eventos
- Estadísticas de uso
- Modo mantenimiento

---

## 📝 Notas para el Próximo Git Push

### Antes de hacer push:
1. ✅ Verificar que todas las funcionalidades core funcionen
2. ⚠️ Corregir errores del menú de tareas
3. ✅ Actualizar documentación (README, USER-GUIDE)
4. ✅ Limpiar código de debug
5. ✅ Verificar que telegram-config.json esté en .gitignore
6. ✅ Actualizar CHANGELOG.md

### Archivos a revisar antes de push:
```
backend/telegram-bot/
  ├── handlers/
  │   ├── command-handler.js    ⚠️ Revisar callbacks
  │   ├── task-handler.js        ⚠️ Revisar botones inline
  │   └── message-handler.js     ✅ OK (debug comentado)
  ├── telegram-bot-manager.js    ⚠️ Revisar callback_query handler
  └── docs/
      ├── KNOWN-ISSUES.md        ✅ Este archivo
      └── CHANGELOG.md           📝 Actualizar
```

### Comandos pre-push:
```bash
# Verificar archivos modificados
git status

# Verificar que telegram-config.json NO esté staged
git ls-files | grep telegram-config.json

# Verificar .gitignore
cat .gitignore | grep telegram-config.json

# Test final
npm test  # (si tienes tests)
```

---

## 🔗 Referencias

- [USER-GUIDE.md](./USER-GUIDE.md) - Guía de usuario completa
- [API-REFERENCE.md](./API-REFERENCE.md) - Referencia de API
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del bot
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía de despliegue

---

## 📞 Contacto

Para reportar bugs adicionales o sugerir mejoras, contactar al equipo de desarrollo.

**Mantenedor:** Jorge (jorge dev)  
**Proyecto:** Sistema de Monitoreo SLT - Telegram Bot Module