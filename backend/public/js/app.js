// Reloj con fecha en formato "DOM 23 SEP 04:34 PM"
function updateClock() {
    const now = new Date();

    // Día de la semana
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const dayName = days[now.getDay()];

    // Día del mes
    const day = now.getDate();

    // Mes
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
        'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const monthName = months[now.getMonth()];

    // Hora en formato 12h
    let hh = now.getHours();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    hh = hh ? hh : 12;

    if (hh < 10) hh = '0' + hh; // Añadir cero inicial si es menor a 10

    // Formato final: "DOM 23 SEP 04:34 PM"
    const timeString = `${dayName} ${day} ${monthName} ${hh}:${mm} ${ampm}`;
    document.getElementById('clock').textContent = timeString;
}
setInterval(updateClock, 1000);
updateClock();

// ===== WEBSOCKET MANAGEMENT =====
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds

const websocketIcon = document.getElementById('websocketIcon');

// Actualizar estado visual del icono WebSocket
function updateWebSocketIcon(status) {
    websocketIcon.className = `icon-circle websocket-icon ${status}`;
}

// Conectar al WebSocket
function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return; // Ya conectado o conectando
    }

    updateWebSocketIcon('connecting');
    console.log('🔄 Intentando conectar al WebSocket...');

    try {

        ws = new WebSocket(`ws://${window.location.host}`);

        ws.onopen = function (event) {
            console.log('✅ WebSocket conectado');
            isConnected = true;
            reconnectAttempts = 0;
            updateWebSocketIcon('connected');

            // Enviar handshake automático
            sendHandshake();
        };

        ws.onclose = function (event) {
            console.log('❌ WebSocket desconectado');
            isConnected = false;
            updateWebSocketIcon('disconnected');

            // Intentar reconexión automática
            attemptReconnection();
        };

        ws.onerror = function (error) {
            console.error('❌ Error WebSocket:', error);
            isConnected = false;
            updateWebSocketIcon('disconnected');
        };

        ws.onmessage = function (event) {
            console.log('📨 Mensaje recibido:', event.data);
            handleMessage(JSON.parse(event.data));
        };

    } catch (error) {
        console.error('❌ Error al crear WebSocket:', error);
        updateWebSocketIcon('disconnected');
        attemptReconnection();
    }
}
function handleMessage(message) {
    console.log(`📨 Mensaje recibido: ${message.type}`);

    switch (message.type) {
        case 'welcome':
            console.log(`🎉 Mensaje de bienvenida: ${message.data.message}`);
            break;

        case 'handshake':
            if (message.success) {
                console.log('✅ Handshake completado exitosamente');
            } else {
                console.log(`❌ Error en handshake: ${message.error?.message || 'Error desconocido'}`);
            }
            break;

        case 'pong':
            const latency = Date.now() - new Date(message.originalTimestamp || message.timestamp).getTime();
            console.log(`🏓 Pong recibido (Latencia: ${latency}ms)`);
            break;

        case 'error':
            console.log(`❌ Error del servidor: [${message.error.code}] ${message.error.message}`);
            break;

        default:
            console.log(`❓ Tipo de mensaje desconocido: ${message.type}`);
    }

    console.log(`📋 Datos: ${JSON.stringify(message)}`);
}

// Enviar handshake inicial
function sendHandshake() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const handshakeMessage = {
            type: 'handshake',
            timestamp: new Date().toISOString(),
            clientId: `web-client-${Date.now()}`,
            userAgent: navigator.userAgent,
            data: {
                version: '1.0'
            }
        };
        ws.send(JSON.stringify(handshakeMessage));
        console.log('🤝 Handshake enviado');
    }
}

// Intentar reconexión automática
function attemptReconnection() {
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`🔄 Reintento ${reconnectAttempts}/${maxReconnectAttempts} en ${reconnectDelay / 1000}s...`);

        setTimeout(() => {
            connectWebSocket();
        }, reconnectDelay);
    } else {
        console.log('❌ Máximo de reintentos alcanzado');
        updateWebSocketIcon('disconnected');
    }
}

// Mantener conexión activa con ping
function maintainConnection() {
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const pingMessage = {
                type: 'ping',
                timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(pingMessage));
        }
    }, 30000); // Ping cada 30 segundos
}

// Inicialización automática al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Iniciando conexión WebSocket automática...');
    connectWebSocket();
    maintainConnection();
});