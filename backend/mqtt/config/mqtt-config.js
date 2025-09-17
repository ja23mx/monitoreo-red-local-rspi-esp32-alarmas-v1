// config/mqtt-config.js
// Configuración para la conexión MQTT

module.exports = {
    brokerUrl: 'mqtt://server-sra.local', // Cambia la URL del broker según tu entorno
    options: {
        clean: true,
        username: 'user-mqtt', // Usuario MQTT
        password: '5457kzs07', // Clave MQTT
        keepalive: 60,
        reconnectPeriod: 1000,
        clientId: 'monitoreo-local-backend'
    }
};