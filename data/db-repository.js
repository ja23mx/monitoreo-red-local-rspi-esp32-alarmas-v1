const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'alarmas.db');
const db = new Database(DB_PATH);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

const ALARMAS_PATH = path.join(__dirname, 'alarmas.json');
const EVENTOS_PATH = path.join(__dirname, 'registro_evento.json');
const MAC_TO_ID_PATH = path.join(__dirname, 'mac_to_id.json');

/**
 * Exportados
*/

// Obtiene la información de una alarma por MAC
function getAlarmaByMac(mac) {
    try {
        const stmt = db.prepare(`
            SELECT 
                id,
                mac,
                nickname,
                location,
                ult_cnx,
                alarm_active,
                track
            FROM devices
            WHERE mac = ?
        `);

        const row = stmt.get(mac);

        if (!row) return null;

        return {
            id: row.id,
            ult_cnx: row.ult_cnx,
            nickname: row.nickname,
            location: row.location,
            alarmActive: row.alarm_active === 1,
            track: row.track
        };

    } catch (error) {
        console.error('[db-repository] Error en getAlarmaByMac:', error);
        return null;
    }
}

// Obtiene el track de una alarma por MAC
function getAlarmaTrackByMac(mac) {
    try {
        const stmt = db.prepare(`
            SELECT track 
            FROM devices 
            WHERE mac = ?
        `);

        const row = stmt.get(mac);

        return row ? row.track : null;

    } catch (error) {
        console.error('[db-repository] Error en getAlarmaTrackByMac:', error);
        return null;
    }
}

// Actualiza la última conexión de una alarma por MAC
function updateUltimaConexionByMac(mac, fechaISO) {
    try {
        const stmt = db.prepare(`
            UPDATE devices 
            SET ult_cnx = ?,
                updated_at = datetime('now')
            WHERE mac = ?
        `);

        const result = stmt.run(fechaISO, mac);

        return result.changes > 0;

    } catch (error) {
        console.error('[db-repository] Error en updateUltimaConexionByMac:', error);
        return false;
    }
}

// Agrega un evento al historial de un dispositivo por MAC
function addEventoByMac(mac, eventoObj) {
    try {
        // Obtener device_id desde MAC
        const deviceStmt = db.prepare('SELECT id FROM devices WHERE mac = ?');
        const device = deviceStmt.get(mac);

        if (!device) {
            console.error(`[db-repository] Dispositivo con MAC ${mac} no encontrado`);
            return false;
        }

        // Generar event_id único
        const countStmt = db.prepare('SELECT COUNT(*) as total FROM events WHERE device_id = ?');
        const count = countStmt.get(device.id).total;
        const eventId = `evt-${count + 1}`;

        // Insertar evento
        const insertStmt = db.prepare(`
            INSERT INTO events (device_id, event_id, time, event_type, data)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = insertStmt.run(
            device.id,
            eventId,
            eventoObj.time,
            eventoObj.event || 'unknown',
            eventoObj.data ? JSON.stringify(eventoObj.data) : null
        );

        return result.changes > 0;

    } catch (error) {
        console.error('[db-repository] Error en addEventoByMac:', error);
        return false;
    }
}

// Obtiene todos los eventos de un dispositivo por MAC
function getEventosByMac(mac) {
    try {
        const stmt = db.prepare(`
            SELECT 
                e.event_id as id,
                e.time,
                e.event_type as event,
                e.data
            FROM events e
            JOIN devices d ON e.device_id = d.id
            WHERE d.mac = ?
            ORDER BY e.time DESC
        `);

        const rows = stmt.all(mac);

        return rows.map(row => ({
            id: row.id,
            time: row.time,
            event: row.event,
            data: row.data ? JSON.parse(row.data) : null
        }));

    } catch (error) {
        console.error('[db-repository] Error en getEventosByMac:', error);
        return [];
    }
}

// Borra eventos antiguos de un dispositivo por MAC
function deleteEventosByMac(mac, dias = 30) {
    try {
        const deviceStmt = db.prepare('SELECT id FROM devices WHERE mac = ?');
        const device = deviceStmt.get(mac);

        if (!device) {
            console.error(`[db-repository] Dispositivo con MAC ${mac} no encontrado`);
            return false;
        }

        let deleteStmt;

        if (dias === 0) {
            // Borra todo el historial
            deleteStmt = db.prepare('DELETE FROM events WHERE device_id = ?');
            deleteStmt.run(device.id);
        } else if (dias === 1) {
            // Solo conserva eventos del día actual
            deleteStmt = db.prepare(`
                DELETE FROM events 
                WHERE device_id = ? 
                AND date(time) != date('now')
            `);
            deleteStmt.run(device.id);
        } else {
            // Borra eventos más antiguos que N días
            deleteStmt = db.prepare(`
                DELETE FROM events 
                WHERE device_id = ? 
                AND julianday('now') - julianday(time) > ?
            `);
            deleteStmt.run(device.id, dias);
        }

        return true;

    } catch (error) {
        console.error('[db-repository] Error en deleteEventosByMac:', error);
        return false;
    }
}

// Borra eventos antiguos de todos los dispositivos
function deleteEventosAll(dias = 30) {
    try {
        const stmt = db.prepare('DELETE FROM events');
        stmt.run();
        return true;

    } catch (error) {
        console.error('[db-repository] Error en deleteEventosAll:', error);
        return false;
    }
}

/** Obtiene todos los dispositivos formateados para WebSocket */
function getAllDevicesForWS(timeoutMinutes = 5) {
    try {
        const stmt = db.prepare(`
            SELECT 
                id,
                mac,
                nickname,
                location,
                ult_cnx,
                alarm_active,
                track
            FROM devices
            ORDER BY id ASC
        `);

        const rows = stmt.all();

        return rows.map(row => ({
            id: `ESP32_${String(row.id).padStart(3, '0')}`,
            mac: row.mac,
            name: row.nickname,
            status: _calculateDeviceStatus(row.ult_cnx, timeoutMinutes),
            lastSeen: row.ult_cnx || new Date(0).toISOString(),
            location: row.location,
            alarmActive: row.alarm_active === 1
        }));

    } catch (error) {
        console.error('[db-repository] Error en getAllDevicesForWS:', error);
        return [];
    }
}

// Obtiene un dispositivo por MAC formateado para WebSocket
function getDeviceByMac(mac, timeoutMinutes = 5) {
    try {
        const stmt = db.prepare(`
            SELECT 
                id,
                mac,
                nickname,
                location,
                ult_cnx,
                alarm_active,
                track
            FROM devices
            WHERE mac = ?
        `);

        const row = stmt.get(mac);

        if (!row) {
            return null;
        }

        return {
            id: `ESP32_${String(row.id).padStart(3, '0')}`,
            mac: row.mac,
            name: row.nickname,
            status: _calculateDeviceStatus(row.ult_cnx, timeoutMinutes),
            lastSeen: row.ult_cnx || new Date(0).toISOString(),
            location: row.location,
            alarmActive: row.alarm_active === 1
        };

    } catch (error) {
        console.error('[db-repository] Error en getDeviceByMac:', error);
        return null;
    }
}

// Actualiza el estado de alarma activa por MAC
function updateAlarmActiveByMac(mac, isActive) {
    try {
        const stmt = db.prepare(`
            UPDATE devices 
            SET alarm_active = ?,
                updated_at = datetime('now')
            WHERE mac = ?
        `);

        const result = stmt.run(isActive ? 1 : 0, mac);

        return result.changes > 0;

    } catch (error) {
        console.error('[db-repository] Error en updateAlarmActiveByMac:', error);
        return false;
    }
}

// Helper: Calcula el status basado en última conexión
function _calculateDeviceStatus(ultimaConexion, thresholdMinutes = 5) {
    if (!ultimaConexion) return 'offline';

    const now = new Date();
    const lastSeen = new Date(ultimaConexion);
    const diffMinutes = (now - lastSeen) / (1000 * 60);

    return diffMinutes <= thresholdMinutes ? 'online' : 'offline';
}

module.exports = {
    getAlarmaByMac,
    getAlarmaTrackByMac,
    updateUltimaConexionByMac,
    addEventoByMac,
    getEventosByMac,
    deleteEventosByMac,
    deleteEventosAll,
    getAllDevicesForWS,
    getDeviceByMac,
    updateAlarmActiveByMac
};