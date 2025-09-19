
const express = require('express');
const http = require('http'); 
const path = require('path');

require('./mqtt/index.js');
const { initializeWebSocket } = require('./websocket/index.js'); 

const app = express();
const PORT = 3000;

const server = http.createServer(app);
initializeWebSocket(server);

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar el servidor Express
server.listen(PORT, () => {
  console.log(`Servidor HTTP y WebSocket en ejecución en http://localhost:${PORT}`);
});