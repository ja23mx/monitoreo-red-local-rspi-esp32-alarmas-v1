// database/device-repository.js
// Funciones para gestionar dispositivos y eventos en archivos JSON locales

const fs = require('fs');
const path = require('path');

const DEVICES_FILE = path.join(__dirname, 'devices.json');
const ALARMS_FILE = path.join(__dirname, 'alarms.json');
const ACKS_FILE = path.join(__dirname, 'acks.json');

/**
 * Lee un archivo JSON y devuelve el contenido (array u objeto).
 * Si no existe, retorna el valor inicial proporcionado.
 */
function readJsonFile(file, initialValue) {
    try {
        if (!fs.existsSync(file)) {
            return initialValue;
        }
        const data = fs.readFileSync(file, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error leyendo archivo', file, err);
        return initialValue;
    }
}

/**
 * Escribe data en un archivo JSON.
 */
function writeJsonFile(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error escribiendo archivo', file, err);
    }
}

/**
 * Actualiza el heartbeat (timestamp) de un dispositivo en devices.json.
 */
function updateHeartbeat({ deviceId, timestamp }) {
    let devices = readJsonFile(DEVICES_FILE, []);
    let found = false;
    devices = devices.map(dev => {
        if (dev.deviceId === deviceId) {
            found = true;
            return { ...dev, lastHeartbeat: timestamp };
        }
        return dev;
    });
    if (!found) {
        devices.push({ deviceId, lastHeartbeat: timestamp });
    }
    writeJsonFile(DEVICES_FILE, devices);
}

/**
 * Registra un evento de alarma en alarms.json.
 */
function logAlarmEvent(alarmEvent) {
    let alarms = readJsonFile(ALARMS_FILE, []);
    alarms.push(alarmEvent);
    writeJsonFile(ALARMS_FILE, alarms);
}

/**
 * Registra un ACK de comando en acks.json.
 */
function logCommandAck(ackEvent) {
    let acks = readJsonFile(ACKS_FILE, []);
    acks.push(ackEvent);
    writeJsonFile(ACKS_FILE, acks);
}

module.exports = {
    updateHeartbeat,
    logAlarmEvent,
    logCommandAck
};