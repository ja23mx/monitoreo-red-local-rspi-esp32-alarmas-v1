const fs = require('fs');
const path = require('path');

const ALARMAS_PATH = path.join(__dirname, 'alarmas.json');
const EVENTOS_PATH = path.join(__dirname, 'registro_evento.json');
const MAC_TO_ID_PATH = path.join(__dirname, 'mac_to_id.json');

/**
 * Exportados
*/

// Obtiene la información de una alarma por MAC
function getAlarmaByMac(mac) {
    const id = _getIdByMac(mac);
    if (!id) return null;
    const alarmas = _readJsonFile(ALARMAS_PATH);
    return alarmas[id] || null;
}

// Actualiza la última conexión de una alarma por MAC
function updateUltimaConexionByMac(mac, fechaISO) {
    const id = _getIdByMac(mac);
    if (!id) return false;
    const alarmas = _readJsonFile(ALARMAS_PATH);
    if (alarmas[id]) {
        alarmas[id].ult_cnx = fechaISO;
        _writeJsonFile(ALARMAS_PATH, alarmas);
        return true;
    }
    return false;
}

// Agrega un evento al historial de un dispositivo por MAC
function addEventoByMac(mac, eventoObj) {
    const id = _getIdByMac(mac);
    if (!id) return false;
    let eventos = {};

    // Intenta leer el archivo, si está vacío o tiene error, inicializa como objeto vacío
    try {
        const raw = fs.existsSync(EVENTOS_PATH) ? fs.readFileSync(EVENTOS_PATH, 'utf8') : '';
        eventos = raw.trim() ? JSON.parse(raw) : {};
    } catch (e) {
        console.error('[db-repository] Error leyendo archivo (se inicializa vacío):', EVENTOS_PATH, e);
        eventos = {};
    }

    // Inicializa el historial si no existe
    if (!eventos[id]) eventos[id] = [];

    // Genera el siguiente id secuencial: evt-<n>
    const nextNum = eventos[id].length + 1;
    const eventoId = `evt-${nextNum}`;

    // Crea el nuevo evento con id generado
    const nuevoEvento = {
        ...eventoObj,
        id: eventoId
    };

    eventos[id].push(nuevoEvento);
    _writeJsonFile(EVENTOS_PATH, eventos);
    return true;
}

// Obtiene todos los eventos de un dispositivo por MAC
function getEventosByMac(mac) {
    const id = _getIdByMac(mac);
    if (!id) return [];
    const eventos = _readJsonFile(EVENTOS_PATH);
    return eventos[id] || [];
}

// Borra eventos antiguos de un dispositivo por MAC
function deleteEventosByMac(mac, dias = 30) {
    const id = _getIdByMac(mac);
    if (!id) return false;
    let eventos = _readJsonFile(EVENTOS_PATH);

    // Si no hay historial, nada que borrar
    if (!eventos[id] || !Array.isArray(eventos[id])) return true;

    if (dias === 0) {
        // Borra todo el historial
        eventos[id] = [];
    } else {
        const now = new Date();
        eventos[id] = eventos[id].filter(ev => {
            const evDate = new Date(ev.time);
            if (dias === 1) {
                // Solo conserva eventos del mismo día
                return evDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
            } else {
                // Conserva eventos dentro del rango de días
                const diff = (now - evDate) / (1000 * 60 * 60 * 24);
                return diff <= dias;
            }
        });
    }

    _writeJsonFile(EVENTOS_PATH, eventos);
    return true;
}

// Borra eventos antiguos de todos los dispositivos
function deleteEventosAll(dias = 30) {
    let eventos = _readJsonFile(EVENTOS_PATH);
    const ids = Object.keys(eventos);

    ids.forEach(id => {
        // Simula MAC inversa si necesitas, pero aquí usamos el id directamente
        // Si tienes MAC, puedes obtenerla con una función inversa si lo requieres
        if (Array.isArray(eventos[id])) {
            if (dias === 0) {
                eventos[id] = [];
            } else {
                const now = new Date();
                eventos[id] = eventos[id].filter(ev => {
                    const evDate = new Date(ev.time);
                    if (dias === 1) {
                        return evDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
                    } else {
                        const diff = (now - evDate) / (1000 * 60 * 60 * 24);
                        return diff <= dias;
                    }
                });
            }
        }
    });

    _writeJsonFile(EVENTOS_PATH, eventos);
    return true;
}

/**
 * Locales (no exportados)
 */

// Lee un archivo JSON y lo parsea
function _readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[db-repository] Error leyendo archivo:', filePath, e);
        return {};
    }
}

// Escribe un objeto en un archivo JSON
function _writeJsonFile(filePath, obj) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('[db-repository] Error escribiendo archivo:', filePath, e);
    }
}

// Obtiene el ID correspondiente a una MAC
function _getIdByMac(mac) {
    const macToId = _readJsonFile(MAC_TO_ID_PATH);
    return macToId[mac] || null;
}

module.exports = {
    getAlarmaByMac,
    updateUltimaConexionByMac,
    addEventoByMac,
    getEventosByMac,
    deleteEventosByMac,
    deleteEventosAll
};