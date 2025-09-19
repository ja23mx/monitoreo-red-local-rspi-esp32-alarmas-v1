const path = require('path');
const db = require('../../../data/db-repository');

let wsNotifier = null; // Función para notificar por WebSocket (si existe)
let lastStatus = {};   // Estado previo de cada dispositivo

/**
 * Inicia el monitor de dispositivos.
 * @param {number} intervalMs - Intervalo de evaluación en milisegundos (default: 60000)
 * @param {number} timeoutMin - Minutos sin conexión para marcar como desconectado (default: 2)
 */
function startMonitor(intervalMs = 5000, timeoutMin = 2) {
    setInterval(() => {
        checkDevices(timeoutMin);
    }, intervalMs);
}

/**
 * Evalúa el estado de conexión de todos los dispositivos.
 * @param {number} timeoutMin - Minutos sin conexión para marcar como desconectado
 */
function checkDevices(timeoutMin = 2) {
    const alarmas = db._readJsonFile(path.join(__dirname, '../../../data/alarmas.json'));
    const now = Date.now();

    Object.entries(alarmas).forEach(([id, info]) => {
        const lastConn = Date.parse(info.ult_cnx);
        const diffMin = (now - lastConn) / (1000 * 60);
        const status = diffMin <= timeoutMin ? 'activo' : 'desconectado';

        if (lastStatus[id] !== status) {
            lastStatus[id] = status;
            notifyStatusChange(info, status);
        }
    });
}

/**
 * Notifica el cambio de estado por consola y WebSocket (si está configurado).
 * @param {object} device - Info del dispositivo
 * @param {string} status - Estado nuevo ('activo' | 'desconectado')
 */
function notifyStatusChange(device, status) {
    console.log(`[MONITOR] Dispositivo ${device.nickname || device.id} (${device.id}) está ahora: ${status}`);
    if (wsNotifier) wsNotifier(device, status);
}

/**
 * Permite registrar una función para notificar por WebSocket.
 * @param {function} fn - Función de notificación (device, status)
 */
/* function setWebSocketNotifier(fn) {
    wsNotifier = fn;
}
 */

module.exports = {
    startMonitor
};