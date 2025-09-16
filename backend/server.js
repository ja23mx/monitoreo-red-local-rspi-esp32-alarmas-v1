const express = require('express');
const path = require('path');
const mqtt = require('mqtt'); // Importar la librería MQTT

const app = express();
const PORT = 3000; // Cambia el puerto si lo necesitas

// Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuración del cliente MQTT
const mqttOptions = {
  clientId: 'ExpressServer_' + Math.random().toString(16).substr(2, 8), // ID único para el cliente
  clean: true,
  username: 'user-mqtt', // Usuario MQTT
  password: '5457kzs07', // Clave MQTT
};
const mqttBrokerUrl = 'mqtt://server-sra.local'; // Cambia esto dependiendo de tu broker MQTT
const mqttClient = mqtt.connect(mqttBrokerUrl, mqttOptions);

// Manejo de eventos del cliente MQTT
mqttClient.on('connect', () => {
  console.log('Conectado al broker MQTT');

  // Suscribirse al topic NODO/+/ACK
  mqttClient.subscribe('NODO/+/ACK', (err) => {
    if (err) {
      console.error('Error al suscribirse al topic:', err);
    } else {
      console.log('Suscrito al topic: NODO/+/ACK');
    }
  });
});

mqttClient.on('message', (topic, message) => {
  // Manejar mensajes recibidos
  console.log(`Mensaje recibido en el topic ${topic}: ${message.toString()}`);
});

// Manejo de errores MQTT
mqttClient.on('error', (err) => {
  console.error('Error en el cliente MQTT:', err);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});