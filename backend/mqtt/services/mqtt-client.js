// services/mqtt-client.js
// Cliente MQTT simplificado para el backend de monitoreo local

const mqtt = require('mqtt');

let client = null;

/**
 * Conecta al broker MQTT usando la configuración proporcionada.
 * @param {Object} config - Configuración de conexión MQTT.
 */
function connect(config) {
    client = mqtt.connect(config.brokerUrl, config.options || {});

    client.on('connect', () => {
        console.log('Conectado al broker MQTT:', config.brokerUrl);
    });

    client.on('error', (err) => {
        console.error('Error en la conexión MQTT:', err);
    });
}

/**
 * Suscribe al cliente a un topic.
 * @param {string} topic - Topic MQTT a suscribirse.
 */
function subscribe(topic) {
    if (client) {
        client.subscribe(topic, (err) => {
            if (err) {
                console.error('Error al suscribirse al topic:', topic, err);
            } else {
                console.log('Suscrito al topic:', topic);
            }
        });
    }
}

/**
 * Publica un mensaje en un topic.
 * @param {string} topic - Topic MQTT donde publicar.
 * @param {string|Buffer} message - Mensaje a publicar.
 */
function publish(topic, message) {
    if (client) {
        client.publish(topic, message, (err) => {
            if (err) {
                console.error('Error al publicar en topic:', topic, err);
            }
        });
    }
}

/**
 * Registra un callback para procesar mensajes entrantes.
 * @param {function} callback - Callback(topic, message)
 */
function onMessage(callback) {
    if (client) {
        client.on('message', (topic, message) => {
            callback(topic, message.toString());
        });
    }
}

module.exports = {
    connect,
    subscribe,
    publish,
    onMessage
};