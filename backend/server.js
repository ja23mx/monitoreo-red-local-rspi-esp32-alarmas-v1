// backend/server.js
// Archivo principal del backend: solo levanta Express y activa la lógica MQTT mediante mqtt/index.js

const express = require('express');
const path = require('path');

// Importa y ejecuta la lógica MQTT (el archivo index.js dentro de la carpeta mqtt)
require('./mqtt/index.js');

const app = express();
const PORT = 3000;

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar el servidor Express
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});