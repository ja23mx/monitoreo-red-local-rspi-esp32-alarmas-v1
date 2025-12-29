const db = require('./db-repository');

console.log('\n=== TEST: getAllDevicesForWS ===');
const devices = db.getAllDevicesForWS(5);
console.log(`Total dispositivos: ${devices.length}`);
console.log('\nPrimeros 3 dispositivos:');
console.log(JSON.stringify(devices.slice(0, 3), null, 2));

console.log('\n=== TEST: getDeviceByMac ===');
const device = db.getDeviceByMac('F2D224', 5);
console.log(JSON.stringify(device, null, 2));

console.log('\n=== TEST: getAlarmaTrackByMac ===');
const track = db.getAlarmaTrackByMac('F2D224');
console.log(`Track para F2D224: ${track}`);

console.log('\n=== TEST: updateUltimaConexionByMac ===');
const newTimestamp = new Date().toISOString();
const updateResult = db.updateUltimaConexionByMac('F2D224', newTimestamp);
console.log(`Actualización exitosa: ${updateResult}`);
const updatedDevice = db.getDeviceByMac('F2D224', 5);
console.log(`Nuevo lastSeen: ${updatedDevice.lastSeen}`);

console.log('\n=== TEST: updateAlarmActiveByMac ===');
const alarmResult = db.updateAlarmActiveByMac('F2D224', false);
console.log(`Activar alarma: ${alarmResult}`);
const deviceWithAlarm = db.getDeviceByMac('F2D224', 5);
console.log(`Alarma activa: ${deviceWithAlarm.alarmActive}`);

console.log('\n=== TEST: addEventoByMac ===');
const evento = {
    time: new Date().toISOString(),
    event: 'button',
    data: { test: true }
};
const addResult = db.addEventoByMac('F2D224', evento);
console.log(`Evento agregado: ${addResult}`);

console.log('\n=== TEST: getEventosByMac ===');
const eventos = db.getEventosByMac('F2D224');
console.log(`Total eventos: ${eventos.length}`);
if (eventos.length > 0) {
    console.log('Último evento:', JSON.stringify(eventos[0], null, 2));
}

console.log('\n=== TEST: deleteEventosByMac ===');
const eventosAntes = db.getEventosByMac('F2D224');
console.log(`Eventos antes: ${eventosAntes.length}`);
const deleteResult = db.deleteEventosByMac('F2D224', 1); // Borra eventos antiguos
console.log(`Borrado exitoso: ${deleteResult}`);
const eventosDespues = db.getEventosByMac('F2D224');
console.log(`Eventos después: ${eventosDespues.length}`);

console.log('\n✅ Tests completados\n');