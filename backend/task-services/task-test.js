const { taskSystem } = require('./task-system');

async function testCRUD() {
    console.log('\n=== TESTING CRUD ===\n');

    // Simular cliente MQTT (mock)
    const mockMqttClient = {
        publish: (topic, message, options, callback) => {
            console.log(`[MOCK MQTT] Publish: ${topic} -> ${message}`);
            if (callback) callback(null);
        }
    };

    // Inicializar TaskSystem
    console.log('0. Inicializando TaskSystem...');
    taskSystem.setMqttClient(mockMqttClient);
    await taskSystem.start();
    console.log('Sistema iniciado\n');

    // CREATE
    console.log('1. Creando tarea...');
    const created = await taskSystem.createTask("Prueba Mediodía", 12, 30, 15);
    console.log(created);

    // READ
    console.log('\n2. Listando tareas...');
    console.log(taskSystem.listTasks());

    // UPDATE
    console.log('\n3. Actualizando tarea...');
    const updated = await taskSystem.updateTask("audio_test_1", { hour: 9 });
    console.log(updated);

    // DELETE
    console.log('\n4. Eliminando tarea...');
    const deleted = await taskSystem.deleteTask("audio_test_3");
    console.log(deleted);

    // STATUS
    console.log('\n5. Estado del sistema...');
    console.log(taskSystem.getStatus());

    // Cleanup
    taskSystem.stop();
    process.exit(0);
}

// Ejecutar
testCRUD();