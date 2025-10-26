# Guía de Testing - Sistema de Tareas Programadas

## 📋 Descripción General

Esta guía proporciona métodos y scripts para probar el Sistema de Tareas Programadas, incluyendo pruebas unitarias, de integración y manuales.

---

## 🎯 Tipos de Pruebas

### 1. Pruebas Manuales (Interactivas)
- Operaciones CRUD básicas
- Ejecución manual de tareas
- Verificación de estado

### 2. Pruebas Automatizadas (Scripts)
- Suite completa de CRUD
- Validación de errores
- Tests de carga

### 3. Pruebas de Integración
- MQTT end-to-end
- WebSocket notifications
- Bot de Telegram

---

## 🚀 Pruebas Manuales Rápidas

### Prerequisitos

```bash
# 1. Servidor en ejecución
node server.js

# 2. Conexión MQTT activa
# Verificar logs: [MQTT] Conectado al broker

# 3. Node.js REPL o script temporal
```

---

### Test 1: Verificar Estado del Sistema

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

// Esperar inicialización (2 segundos)
setTimeout(() => {
  const status = taskSystem.getStatus();
  
  console.log('=== ESTADO DEL SISTEMA ===');
  console.log('Sistema activo:', status.isRunning);
  console.log('MQTT inicializado:', status.isInitialized);
  console.log('Tareas cargadas:', status.taskCount);
  console.log('Slots disponibles:', status.availableSlots);
  console.log('Intervalo de chequeo:', status.checkInterval/1000, 'segundos');
}, 2000);
```

**Resultado esperado:**
```
=== ESTADO DEL SISTEMA ===
Sistema activo: true
MQTT inicializado: true
Tareas cargadas: 2
Slots disponibles: 8
Intervalo de chequeo: 60 segundos
```

---

### Test 2: Listar Tareas

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(() => {
  const tasks = taskSystem.listTasks();
  
  console.log('=== TAREAS CONFIGURADAS ===');
  console.log(`Total: ${tasks.length}`);
  
  tasks.forEach(task => {
    console.log(`\n${task.name} (${task.id})`);
    console.log(`  Estado: ${task.enabled ? 'Activa' : 'Inactiva'}`);
    console.log(`  Horario: ${task.schedule.formatted}`);
    console.log(`  Track: ${task.track}`);
    console.log(`  Próxima ejecución: ${task.nextExecution}`);
  });
}, 2000);
```

**Resultado esperado:**
```
=== TAREAS CONFIGURADAS ===
Total: 2

Prueba Matutina (audio_test_1)
  Estado: Activa
  Horario: 08:00
  Track: 11
  Próxima ejecución: 26/10/2025, 08:00:00

Prueba Vespertina (audio_test_2)
  Estado: Activa
  Horario: 20:00
  Track: 11
  Próxima ejecución: 25/10/2025, 20:00:00
```

---

### Test 3: Crear Nueva Tarea

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
  console.log('=== CREANDO NUEVA TAREA ===');
  
  const result = await taskSystem.createTask(
    "Prueba Mediodía",  // nombre
    12,                  // hora
    30,                  // minuto
    15,                  // track
    true                 // habilitada
  );
  
  if (result.success) {
    console.log('✅ Tarea creada exitosamente');
    console.log('ID:', result.taskId);
    console.log('Próxima ejecución:', result.nextExecution);
  } else {
    console.log('❌ Error:', result.error);
    console.log('Mensaje:', result.message);
  }
}, 2000);
```

**Resultado esperado:**
```
=== CREANDO NUEVA TAREA ===
✅ Tarea creada exitosamente
ID: audio_test_3
Próxima ejecución: 26/10/2025, 12:30:00
```

---

### Test 4: Actualizar Tarea

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
  console.log('=== ACTUALIZANDO TAREA ===');
  
  const result = await taskSystem.updateTask('audio_test_1', {
    hour: 9,
    minute: 15,
    track: 20
  });
  
  if (result.success) {
    console.log('✅ Tarea actualizada');
    console.log('Nuevo horario:', result.task.schedule);
    console.log('Nuevo track:', result.task.track);
  } else {
    console.log('❌ Error:', result.message);
  }
}, 2000);
```

**Resultado esperado:**
```
=== ACTUALIZANDO TAREA ===
✅ Tarea actualizada
Nuevo horario: { hour: 9, minute: 15, timezone: 'America/Mexico_City' }
Nuevo track: 20
```

---

### Test 5: Eliminar Tarea

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
  console.log('=== ELIMINANDO TAREA ===');
  
  const result = await taskSystem.deleteTask('audio_test_3');
  
  if (result.success) {
    console.log('✅', result.message);
    console.log('Tareas restantes:', result.remainingTasks);
  } else {
    console.log('❌ Error:', result.message);
  }
}, 2000);
```

**Resultado esperado:**
```
=== ELIMINANDO TAREA ===
✅ Tarea "Prueba Mediodía" eliminada exitosamente
Tareas restantes: 2
```

---

### Test 6: Ejecutar Tarea Manualmente

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
  console.log('=== EJECUTANDO TAREA MANUAL ===');
  
  const result = await taskSystem.executeTask('audio_test_1');
  
  if (result.success) {
    console.log('✅ Tarea ejecutada');
    console.log('Topic:', result.topic);
    console.log('Track:', result.payload.track);
    console.log('Timestamp:', result.timestamp);
  } else {
    console.log('❌ Error:', result.error);
  }
}, 2000);
```

**Resultado esperado:**
```
=== EJECUTANDO TAREA MANUAL ===
✅ Tarea ejecutada
Topic: SYSTEM/TEST
Track: 11
Timestamp: 2025-10-25T21:30:45.123Z
```

---

### Test 7: Test con Track Personalizado

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
  console.log('=== TEST CON TRACK PERSONALIZADO ===');
  
  const result = await taskSystem.executeTestByTrack(25);
  
  if (result.success) {
    console.log('✅ Test ejecutado con track 25');
    console.log('Payload:', result.payload);
  } else {
    console.log('❌ Error:', result.error);
  }
}, 2000);
```

**Resultado esperado:**
```
=== TEST CON TRACK PERSONALIZADO ===
✅ Test ejecutado con track 25
Payload: { dsp: 'all', event: 'play_track', time: '...', track: 25 }
```

---

## 🤖 Script de Prueba Automatizado

### Archivo: `task-test.js`

**Ubicación:** `/backend/task-services/task-test.js`

```javascript
const { taskSystem } = require('./task-system');

async function testCRUD() {
    console.log('\n=== TESTING CRUD ===\n');

    // Simular cliente MQTT (mock)
    const mockMqttClient = {
        publish: (topic, message, options, callback) => {
            console.log(`[MOCK MQTT] Publish: ${topic} -> ${message}`);
            if (callback) callback(null);
        },
        connected: true
    };

    // Inicializar TaskSystem
    console.log('0. Inicializando TaskSystem...');
    taskSystem.setMqttClient(mockMqttClient);
    await taskSystem.start();
    console.log('Sistema iniciado\n');

    // CREATE
    console.log('1. Creando tarea...');
    const created = await taskSystem.createTask("Prueba Mediodía", 12, 30, 15);
    console.log(created.success ? '✅ Creada' : '❌ Error:', created);

    // READ
    console.log('\n2. Listando tareas...');
    const tasks = taskSystem.listTasks();
    console.log(`Total: ${tasks.length} tareas`);
    tasks.forEach(t => console.log(`  - ${t.name}: ${t.schedule.formatted}`));

    // UPDATE
    console.log('\n3. Actualizando tarea...');
    const updated = await taskSystem.updateTask("audio_test_1", { hour: 9 });
    console.log(updated.success ? '✅ Actualizada' : '❌ Error:', updated);

    // DELETE
    console.log('\n4. Eliminando tarea...');
    const deleted = await taskSystem.deleteTask("audio_test_3");
    console.log(deleted.success ? '✅ Eliminada' : '❌ Error:', deleted);

    // EXECUTE
    console.log('\n5. Ejecutando tarea manualmente...');
    const executed = await taskSystem.executeTask("audio_test_1");
    console.log(executed.success ? '✅ Ejecutada' : '❌ Error:', executed);

    // STATUS
    console.log('\n6. Estado del sistema...');
    const status = taskSystem.getStatus();
    console.log(`  Activo: ${status.isRunning}`);
    console.log(`  Tareas: ${status.taskCount}/${status.maxTasks}`);

    // Cleanup
    taskSystem.stop();
    console.log('\n✅ Tests completados\n');
    process.exit(0);
}

// Ejecutar
testCRUD().catch(error => {
    console.error('❌ Error en tests:', error);
    process.exit(1);
});
```

**Ejecutar:**
```bash
cd backend/task-services
node task-test.js
```

**Salida esperada:**
```
=== TESTING CRUD ===

0. Inicializando TaskSystem...
[TaskSystem] Iniciando sistema de tareas...
[TaskConfigManager] ✓ Configuración cargada exitosamente
Sistema iniciado

1. Creando tarea...
[MOCK MQTT] Publish: SYSTEM/TEST -> ...
✅ Creada

2. Listando tareas...
Total: 3 tareas
  - Prueba Matutina: 08:00
  - Prueba Mediodía: 12:30
  - Prueba Vespertina: 20:00

3. Actualizando tarea...
✅ Actualizada

4. Eliminando tarea...
✅ Eliminada

5. Ejecutando tarea manualmente...
[MOCK MQTT] Publish: SYSTEM/TEST -> ...
✅ Ejecutada

6. Estado del sistema...
  Activo: true
  Tareas: 2/10

✅ Tests completados
```

---

## 🧪 Suite de Pruebas Avanzadas

### Test de Validaciones

```javascript
const { taskSystem } = require('./task-system');

async function testValidations() {
    console.log('\n=== TESTS DE VALIDACIÓN ===\n');

    // Mock MQTT client
    const mockMqtt = {
        publish: (t, m, o, cb) => cb(null),
        connected: true
    };
    
    taskSystem.setMqttClient(mockMqtt);
    await taskSystem.start();

    // Test 1: Nombre muy corto
    console.log('Test 1: Nombre muy corto');
    let result = await taskSystem.createTask("AB", 10, 0);
    console.log(result.success ? '❌ FALLÓ' : '✅ PASÓ:', result.error);

    // Test 2: Hora inválida
    console.log('\nTest 2: Hora inválida');
    result = await taskSystem.createTask("Test", 25, 0);
    console.log(result.success ? '❌ FALLÓ' : '✅ PASÓ:', result.error);

    // Test 3: Minuto inválido
    console.log('\nTest 3: Minuto inválido');
    result = await taskSystem.createTask("Test", 10, 60);
    console.log(result.success ? '❌ FALLÓ' : '✅ PASÓ:', result.error);

    // Test 4: Track inválido
    console.log('\nTest 4: Track inválido');
    result = await taskSystem.createTask("Test", 10, 0, 1000);
    console.log(result.success ? '❌ FALLÓ' : '✅ PASÓ:', result.error);

    // Test 5: Nombre duplicado
    console.log('\nTest 5: Nombre duplicado');
    await taskSystem.createTask("Test Único", 10, 0);
    result = await taskSystem.createTask("Test Único", 11, 0);
    console.log(result.success ? '❌ FALLÓ' : '✅ PASÓ:', result.error);

    // Test 6: Horario duplicado
    console.log('\nTest 6: Horario duplicado');
    await taskSystem.createTask("Test A", 13, 0);
    result = await taskSystem.createTask("Test B", 13, 0);
    console.log(result.success ? '❌ FALLÓ' : '✅ PASÓ:', result.error);

    // Test 7: Límite de tareas (10)
    console.log('\nTest 7: Límite de tareas');
    // Crear tareas hasta alcanzar límite
    for (let i = 0; i < 15; i++) {
        result = await taskSystem.createTask(`Tarea ${i}`, 10 + i, 0);
        if (!result.success) {
            console.log(`✅ PASÓ: Límite alcanzado en tarea ${i}`);
            break;
        }
    }

    taskSystem.stop();
    console.log('\n✅ Tests de validación completados\n');
    process.exit(0);
}

testValidations();
```

---

## 📡 Pruebas de Integración MQTT

### Test 1: Publicación Real

**Prerequisitos:**
- Broker MQTT activo
- Servidor en ejecución
- Cliente suscrito (mosquitto_sub)

```bash
# Terminal 1: Suscribirse al topic
mosquitto_sub -h server-sra.local -t "SYSTEM/TEST" -v

# Terminal 2: Ejecutar test
node
> const { taskSystem } = require('./backend/task-services/task-system');
> setTimeout(() => taskSystem.executeTestByTrack(25), 2000);
```

**Resultado esperado en Terminal 1:**
```
SYSTEM/TEST {"dsp":"all","event":"play_track","time":"2025-10-25T21:45:00.123Z","track":25}
```

---

### Test 2: Verificación End-to-End con ESP32

**Pasos:**
1. Encender al menos 1 dispositivo ESP32
2. Verificar conexión MQTT (logs del dispositivo)
3. Ejecutar test manual

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
    console.log('Ejecutando test con track 11...');
    const result = await taskSystem.executeTestByTrack(11);
    
    if (result.success) {
        console.log('✅ Comando enviado');
        console.log('⏳ Verificar que ESP32 reproduzca audio...');
    }
}, 2000);
```

**Verificación:**
- ✅ ESP32 debe reproducir track 11
- ✅ Logs del ESP32 deben mostrar recepción de mensaje
- ✅ Speaker debe emitir sonido

---

## 🕐 Pruebas de Scheduler

### Test de Ejecución Automática

**Configuración de prueba:**
```javascript
// 1. Crear tarea para ejecutar en 2 minutos
const now = new Date();
const testHour = now.getHours();
const testMinute = now.getMinutes() + 2;

const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
    await taskSystem.createTask(
        "Test Scheduler",
        testHour,
        testMinute % 60,
        99  // Track distintivo para test
    );
    
    console.log(`Tarea creada para ejecutar a las ${testHour}:${testMinute % 60}`);
    console.log('Esperando ejecución automática...');
    console.log('Verificar logs del servidor en 2 minutos');
}, 2000);
```

**Logs esperados (en 2 minutos):**
```
[TaskScheduler] Ejecutando tarea: audio_test_X (Test Scheduler)
[TaskExecutor] Mensaje publicado en SYSTEM/TEST: {"dsp":"all",...,"track":99}
[TaskExecutor] ✓ Tarea ejecutada [SCHEDULED]: {...}
```

---

### Test de Tolerancia

**Objetivo:** Verificar que tareas se ejecuten dentro de ventana de tolerancia (5 min)

**Configuración:**
```javascript
// 1. Crear tarea programada para hace 3 minutos
const now = new Date();
const pastHour = now.getHours();
const pastMinute = now.getMinutes() - 3;

const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(async () => {
    await taskSystem.createTask(
        "Test Tolerancia",
        pastHour,
        pastMinute >= 0 ? pastMinute : 60 + pastMinute,
        88
    );
    
    console.log('Tarea creada (hace 3 min)');
    console.log('Debe ejecutarse en próximo ciclo del scheduler (dentro de 60s)');
}, 2000);
```

**Resultado esperado:**
- ✅ Tarea se ejecuta en siguiente evaluación del scheduler
- ✅ Logs muestran ejecución exitosa
- ❌ Si han pasado >5 min, NO debe ejecutarse

---

## 🐛 Debugging y Troubleshooting

### Habilitar Logs Detallados

```javascript
// Agregar al inicio de task-system.js
const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}
```

---

### Verificar Estado de Componentes

```javascript
const { taskSystem } = require('./backend/task-services/task-system');

setTimeout(() => {
    // Verificar inicialización
    console.log('Sistema corriendo:', taskSystem.isRunning);
    console.log('MQTT configurado:', taskSystem.mqttClient ? 'Sí' : 'No');
    console.log('Config cargada:', taskSystem.config ? 'Sí' : 'No');
    
    // Verificar tareas
    const tasks = taskSystem.listTasks();
    console.log('Tareas:', tasks.length);
    
    // Verificar próximas ejecuciones
    const next = taskSystem.getNextExecutions();
    console.log('Próximas ejecuciones:', next);
}, 2000);
```

---

### Capturar Errores de MQTT

```javascript
const mqttClient = require('./backend/mqtt/index');

mqttClient.on('error', (error) => {
    console.error('[MQTT ERROR]', error);
});

mqttClient.on('offline', () => {
    console.warn('[MQTT] Cliente offline');
});

mqttClient.on('reconnect', () => {
    console.log('[MQTT] Reconectando...');
});
```

---

## ✅ Checklist de Pruebas Completas

Antes de considerar el sistema listo para producción:

### Funcionalidad Básica
- [ ] Sistema inicia correctamente
- [ ] Configuración se carga desde JSON
- [ ] CREATE: Crear tarea funciona
- [ ] READ: Listar tareas funciona
- [ ] UPDATE: Actualizar tarea funciona
- [ ] DELETE: Eliminar tarea funciona
- [ ] Tarea se ejecuta manualmente
- [ ] Test personalizado funciona

### Validaciones
- [ ] Rechaza nombre muy corto (< 3 caracteres)
- [ ] Rechaza hora inválida (> 23)
- [ ] Rechaza minuto inválido (> 59)
- [ ] Rechaza track inválido (> 999)
- [ ] Rechaza nombre duplicado
- [ ] Rechaza horario duplicado
- [ ] Rechaza crear tarea cuando límite alcanzado (10)

### Scheduler
- [ ] Tarea se ejecuta automáticamente a la hora programada
- [ ] Tolerancia de 5 minutos funciona
- [ ] No se ejecuta 2 veces el mismo día
- [ ] Tareas deshabilitadas NO se ejecutan

### MQTT
- [ ] Mensajes se publican en topic correcto (SYSTEM/TEST)
- [ ] Payload tiene estructura correcta
- [ ] ESP32 recibe mensajes
- [ ] ESP32 reproduce audio correctamente
- [ ] Cliente MQTT maneja desconexiones

### Persistencia
- [ ] Configuración se guarda correctamente
- [ ] Cambios persisten después de reiniciar servidor
- [ ] Archivo JSON tiene formato correcto
- [ ] Metadata se actualiza automáticamente

### Rendimiento
- [ ] Sistema responde en < 100ms para operaciones CRUD
- [ ] Scheduler evalúa en < 1s
- [ ] Publicación MQTT en < 50ms
- [ ] Sin memory leaks después de 24h

---

## 📚 Documentación Relacionada

- **Overview del Sistema:** [TASK-SYSTEM-README.md](./TASK-SYSTEM-README.md)
- **API Completa:** [TASK-API-REFERENCE.md](./TASK-API-REFERENCE.md)
- **Configuración JSON:** [/data/TASK-CONFIGURATION-GUIDE.md](../../data/TASK-CONFIGURATION-GUIDE.md)
- **Protocolo MQTT:** [TASK-MQTT-PROTOCOL.md](./TASK-MQTT-PROTOCOL.md)
- **FAQ:** [/docs/TASK-FAQ.md](../../docs/TASK-FAQ.md)

---

**Versión:** 2.0.0  
**Última actualización:** Octubre 2025  
**Sistema de Monitoreo Local - Nexus Tech**