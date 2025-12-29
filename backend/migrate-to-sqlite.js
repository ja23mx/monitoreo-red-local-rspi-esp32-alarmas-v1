const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../data/alarmas.db');
const ALARMAS_PATH = path.join(__dirname, '../data/alarmas.json');
const MAC_TO_ID_PATH = path.join(__dirname, '../data/mac_to_id.json');
const EVENTOS_PATH = path.join(__dirname, '../data/registro_evento.json');

console.log('[Migración] Iniciando migración de JSON a SQLite...');

// Abrir base de datos
const db = new Database(DB_PATH);

try {
    // Leer archivos JSON
    const macToId = JSON.parse(fs.readFileSync(MAC_TO_ID_PATH, 'utf8'));
    const alarmas = JSON.parse(fs.readFileSync(ALARMAS_PATH, 'utf8'));
    const eventos = fs.existsSync(EVENTOS_PATH) 
        ? JSON.parse(fs.readFileSync(EVENTOS_PATH, 'utf8')) 
        : {};

    // Preparar statements
    const insertDevice = db.prepare(`
        INSERT INTO devices (id, mac, nickname, location, track, ult_cnx, alarm_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEvent = db.prepare(`
        INSERT INTO events (device_id, event_id, time, event_type, data)
        VALUES (?, ?, ?, ?, ?)
    `);

    // Iniciar transacción
    db.prepare('BEGIN').run();

    // Migrar dispositivos
    let deviceCount = 0;
    for (const [mac, id] of Object.entries(macToId)) {
        const alarma = alarmas[id];
        if (!alarma) continue;

        insertDevice.run(
            id,
            mac,
            alarma.nickname || `Dispositivo ${id}`,
            alarma.location || 'Sin ubicación',
            alarma.track || 0,
            alarma.ult_cnx || null,
            alarma.alarmActive ? 1 : 0
        );
        deviceCount++;
    }

    console.log(`[Migración] ✅ Migrados ${deviceCount} dispositivos`);

    // Migrar eventos
    let eventCount = 0;
    for (const [deviceId, eventList] of Object.entries(eventos)) {
        if (!Array.isArray(eventList)) continue;

        for (const evt of eventList) {
            insertEvent.run(
                parseInt(deviceId),
                evt.id || `evt-${eventCount + 1}`,
                evt.time,
                evt.event || 'unknown',
                evt.data ? JSON.stringify(evt.data) : null
            );
            eventCount++;
        }
    }

    console.log(`[Migración] ✅ Migrados ${eventCount} eventos`);

    // Commit
    db.prepare('COMMIT').run();
    console.log('[Migración] ✅ Migración completada exitosamente');

} catch (error) {
    console.error('[Migración] ❌ Error durante la migración:', error);
    db.prepare('ROLLBACK').run();
    process.exit(1);
} finally {
    db.close();
}
