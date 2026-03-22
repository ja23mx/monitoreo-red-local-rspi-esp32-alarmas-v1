#!/bin/bash
# netconfig.sh — Configuración de red (estática / DHCP)
# Uso: ./netconfig.sh [static|dhcp]

INTERFACE="eth0"

CONN=$(nmcli -g GENERAL.CONNECTION device show "$INTERFACE" 2>/dev/null)

if [ -z "$CONN" ]; then
    echo "Error: no se encontró conexión activa en $INTERFACE"
    exit 1
fi

case "$1" in
    static)
        GATEWAY=$(nmcli -g IP4.GATEWAY device show "$INTERFACE")
        DNS=$(nmcli -g IP4.DNS device show "$INTERFACE" | head -1)
        PREFIX=$(nmcli -g IP4.ADDRESS device show "$INTERFACE" | cut -d'/' -f2)

        echo ""
        echo "Red detectada:"
        echo "  Interfaz : $INTERFACE"
        echo "  Gateway  : $GATEWAY"
        echo "  DNS      : $DNS"
        echo "  Prefijo  : /$PREFIX"
        echo ""
        read -p "Ingresa la IP estática deseada (ej. 192.168.1.7): " STATIC_IP

        if [ -z "$STATIC_IP" ]; then
            echo "Error: no ingresaste una IP."
            exit 1
        fi

        echo ""
        echo "Aplicando IP estática $STATIC_IP/$PREFIX ..."
        nmcli con mod "$CONN" \
            ipv4.method manual \
            ipv4.addresses "$STATIC_IP/$PREFIX" \
            ipv4.gateway "$GATEWAY" \
            ipv4.dns "$DNS"
        nmcli con up "$CONN"
        echo "Listo. IP estática aplicada: $STATIC_IP"
        ;;

    dhcp)
        echo "Revirtiendo a DHCP..."
        nmcli con mod "$CONN" \
            ipv4.method auto \
            ipv4.addresses "" \
            ipv4.gateway "" \
            ipv4.dns ""
        nmcli con up "$CONN"
        echo "Listo. DHCP activado."
        ;;

    *)
        echo "Uso: $0 [static|dhcp]"
        echo ""
        echo "  static   Aplica IP estática (lee gateway/DNS del DHCP actual)"
        echo "  dhcp     Revierte a IP dinámica"
        exit 1
        ;;
esac
