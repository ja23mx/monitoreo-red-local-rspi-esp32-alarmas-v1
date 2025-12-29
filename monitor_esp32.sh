#!/bin/bash

# ============================================
# Monitor de ESP32 - Diagnóstico MQTT Completo
# Monitorea 16 ESP32 en la red
# ============================================

# Rutas de logs
LOG_DIR="/home/admin/red-local-iot/logs"
LOG_FILE="$LOG_DIR/diagnostico_esp32.txt"
LOG_DETALLADO="$LOG_DIR/diagnostico_esp32_detallado.log"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Lista completa de ESP32 (NOMBRE|IP|CLIENT_ID)
declare -A ESP32_LIST
ESP32_LIST["NECROPSIAS"]="192.168.1.24|nodo-F2C214"
ESP32_LIST["LIME-1"]="192.168. 1.17|nodo-78087C"
ESP32_LIST["ZONA-DEPORTIVA"]="192.168.1.4|nodo-F40838"
ESP32_LIST["SILOS-CEA"]="192.168.1. 40|nodo-F2C48C"
ESP32_LIST["HOSPITALES"]="192.168.1.11|nodo-F2D224"
ESP32_LIST["CORRALES-CEA"]="192.168.1.3|nodo-77FF44"
ESP32_LIST["LIME-4"]="192.168.1. 6|nodo-F47DDC"
ESP32_LIST["EXPLANADA-INGENIERIAS"]="192.168.1.8|nodo-F42F20"
ESP32_LIST["A13-A14"]="192.168.1.10|nodo-78027C"
ESP32_LIST["EXPLANADA-BIBLIOTECA"]="192.168.1. 13|nodo-F3ABE8"
ESP32_LIST["PARADERO"]="192.168.1.14|nodo-F2C260"
ESP32_LIST["ESTACIONAMIENTO-GOBIERNO"]="192.168.1. 15|nodo-F47E20"
ESP32_LIST["EXUBE-PUERTA-TRASERA"]="192.168.1.16|nodo-F386CC"
ESP32_LIST["AGRICOLA"]="192.168.1.41|nodo-F384D0"
ESP32_LIST["L8"]="192.168.1.251|nodo-BB6734"
ESP32_LIST["ESTACIONAMIENTO-VETERINARIA"]="192.168. 1.252|nodo-F38718"

# Función para verificar conexión MQTT
check_mqtt() {
    local nombre=$1
    local ip=$2
    local client_id=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local fecha=$(date '+%Y-%m-%d')
    local hora=$(date '+%H:%M:%S')
    
    # Verificar si el cliente está conectado (buscar en últimas 200 líneas sin desconexión)
    mqtt_connected=false
    
    # Buscar última mención del client_id en el log
    last_status=$(sudo tail -200 /var/log/mosquitto/mosquitto.log | grep "$client_id" | tail -1)
    
    # Si encuentra "connected" y NO encuentra "disconnected" después, está conectado
    if echo "$last_status" | grep -q "connected"; then
        mqtt_connected=true
    fi
    
    # Si encuentra "disconnected" o "Connection lost", está desconectado
    if echo "$last_status" | grep -qE "disconnected|Connection lost|Socket error"; then
        mqtt_connected=false
    fi
    
    # Verificar mDNS
    mdns_ok=false
    if timeout 2 avahi-resolve -n "${client_id}.local" &>/dev/null; then
        mdns_ok=true
    fi
    
    # Evaluar resultado
    if $mqtt_connected && $mdns_ok; then
        # TODO OK
        echo "[$timestamp] ✓ $nombre - CONECTADO [MQTT:✓ mDNS:✓ IP:$ip]" >> "$LOG_DETALLADO"
        return 0
    elif $mqtt_connected && !  $mdns_ok; then
        # MQTT ok pero mDNS falla
        echo "[$timestamp] ⚠ $nombre - PARCIAL [MQTT:✓ mDNS:✗ IP:$ip]" >> "$LOG_DETALLADO"
        
        echo "[$timestamp] ALERTA PARCIAL: $nombre" >> "$LOG_FILE"
        echo "  → MQTT: Conectado ✓" >> "$LOG_FILE"
        echo "  → mDNS: No responde ✗" >> "$LOG_FILE"
        echo "  → IP: $ip" >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
        
        return 1
    else
        # FALLA TOTAL
        echo "[$timestamp] ✗ $nombre - DESCONECTADO [MQTT:✗ mDNS:$mdns_ok IP:$ip]" >> "$LOG_DETALLADO"
        
        # Escribir reporte detallado
        echo "================================================" >> "$LOG_FILE"
        echo "⚠️  FALLA CRÍTICA DETECTADA" >> "$LOG_FILE"
        echo "================================================" >> "$LOG_FILE"
        echo "Dispositivo: $nombre" >> "$LOG_FILE"
        echo "IP: $ip" >> "$LOG_FILE"
        echo "Client ID MQTT: $client_id" >> "$LOG_FILE"
        echo "Fecha: $fecha" >> "$LOG_FILE"
        echo "Hora de falla: $hora" >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
        echo "DIAGNÓSTICO:" >> "$LOG_FILE"
        echo "❌ Conexión MQTT: PERDIDA" >> "$LOG_FILE"
        if $mdns_ok; then
            echo "✓ mDNS: RESPONDE (dispositivo en red)" >> "$LOG_FILE"
        else
            echo "❌ mDNS: NO RESPONDE" >> "$LOG_FILE"
        fi
        echo "" >> "$LOG_FILE"
        echo "POSIBLES CAUSAS:" >> "$LOG_FILE"
        echo "1. 🔌 Pérdida total de energía del dispositivo" >> "$LOG_FILE"
        echo "2. 🌐 Desconexión de cable Ethernet" >> "$LOG_FILE"
        echo "3. 💥 ESP32 bloqueado/congelado (requiere reset físico)" >> "$LOG_FILE"
        echo "4. 🔄 Switch intermitente en antena punto-a-punto" >> "$LOG_FILE"
        echo "5. ⚡ Problema en línea eléctrica compartida" >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
        echo "ACCIONES INMEDIATAS:" >> "$LOG_FILE"
        echo "→ Verificar alimentación eléctrica" >> "$LOG_FILE"
        echo "→ Revisar cable Ethernet" >> "$LOG_FILE"
        echo "→ Reiniciar físicamente el ESP32" >> "$LOG_FILE"
        echo "→ Revisar switch de la antena punto-a-punto" >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
        
        return 2
    fi
}

# Inicializar archivo de reporte
if [ ! -f "$LOG_FILE" ]; then
    echo "=====================================================" > "$LOG_FILE"
    echo "DIAGNÓSTICO DE CONECTIVIDAD MQTT - 16 ESP32" >> "$LOG_FILE"
    echo "=====================================================" >> "$LOG_FILE"
    echo "Inicio de monitoreo: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "Dispositivos monitoreados: 16 ESP32" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "Método de monitoreo:" >> "$LOG_FILE"
    echo "✓ Conexión MQTT al broker Mosquitto (crítico)" >> "$LOG_FILE"
    echo "✓ Respuesta mDNS (secundario)" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "=====================================================" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
fi

# Inicializar log detallado con timestamp
if [ ! -f "$LOG_DETALLADO" ]; then
    echo "=== Inicio de monitoreo detallado: $(date '+%Y-%m-%d %H:%M:%S') ===" > "$LOG_DETALLADO"
fi

# Ejecutar monitoreo
echo "=== Monitor ESP32 - $(date '+%Y-%m-%d %H:%M:%S') ==="
echo "Verificando 16 dispositivos..."

contador_ok=0
contador_parcial=0
contador_falla=0

for nombre in "${!ESP32_LIST[@]}"; do
    IFS='|' read -r ip client_id <<< "${ESP32_LIST[$nombre]}"
    
    check_mqtt "$nombre" "$ip" "$client_id"
    result=$?
    
    case $result in
        0)
            echo "✓ $nombre"
            ((contador_ok++))
            ;;
        1)
            echo "⚠ $nombre - PARCIAL"
            ((contador_parcial++))
            ;;
        2)
            echo "✗ $nombre - FALLA"
            ((contador_falla++))
            ;;
    esac
done

echo "---"
echo "Resumen: OK=$contador_ok | Parcial=$contador_parcial | Fallas=$contador_falla"
echo "Logs: $LOG_DIR"

# Escribir resumen en log de usuario solo si hay fallas
if [ $contador_falla -gt 0 ] || [ $contador_parcial -gt 0 ]; then
    echo "--- RESUMEN $(date '+%Y-%m-%d %H:%M:%S') ---" >> "$LOG_FILE"
    echo "Dispositivos OK: $contador_ok" >> "$LOG_FILE"
    echo "Dispositivos con falla parcial: $contador_parcial" >> "$LOG_FILE"
    echo "Dispositivos con falla crítica: $contador_falla" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
fi
