# Configuración de Kiosco Web para Raspberry Pi 3 Model B

Esta guía describe la preparación del sistema necesaria para configurar una Raspberry Pi 3 Model B con Raspbian Lite como un kiosco web que ejecute una aplicación Node.js.

## Requisitos Previos

- Raspberry Pi 3 Model B con Raspbian Lite instalado
- Node.js ya instalado (verificado con `node -v`)
- Aplicación Node.js lista para ejecutar
- Conexión a internet para descargar dependencias

## Fase 1: Preparación del Sistema

### Paso 1: Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```
**Descripción**: Actualiza la lista de paquetes disponibles y todos los paquetes instalados. El `-y` responde automáticamente "sí" a todas las confirmaciones.

### Paso 2: Instalar X11 y dependencias gráficas
```bash
sudo apt install -y xorg xinit xserver-xorg-video-fbdev
```
**Descripción**: 
- `xorg`: Sistema de ventanas X11 requerido para cualquier interfaz gráfica
- `xinit`: Utilidad para iniciar el servidor X
- `xserver-xorg-video-fbdev`: Driver de video framebuffer para Raspberry Pi
- **Instalación**: Sistema (global), disponible para todos los usuarios

### Paso 3: Instalar gestor de ventanas ligero
```bash
sudo apt install -y openbox
```
**Descripción**: Openbox es un gestor de ventanas muy ligero, ideal para kioscos. Consume mínimos recursos comparado con escritorios completos.
- **Instalación**: Sistema (global)

### Paso 4: Instalar Chromium
```bash
sudo apt install -y chromium-browser
```
**Descripción**: Instala el navegador Chromium optimizado para Raspberry Pi. Es más ligero que Chrome y funciona mejor en arquitectura ARM.
- **Instalación**: Sistema (global), disponible para todos los usuarios

### Paso 5: Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```
**Descripción**: 
- PM2 es un gestor de procesos para Node.js con auto-restart y monitoreo
- `npm install -g`: Instala el paquete de forma **global** (disponible desde cualquier directorio)
- `sudo`: Necesario para instalación global en el sistema

### Paso 6: Configurar autologin automático
```bash
sudo raspi-config
```
**Descripción**: Abre la herramienta de configuración de Raspberry Pi para habilitar el login automático.

**Navegación en el menú**:
1. Seleccionar `1 System Options`
2. Seleccionar `S5 Boot / Auto Login` 
3. Seleccionar `B2 Console Autologin`
4. Presionar `<Finish>` y `<Yes>` para reiniciar

**Importancia**: Sin autologin, la Pi se quedaría en pantalla de login y nunca arrancaría el kiosco automáticamente.

## Verificación de Instalaciones

Ejecutar los siguientes comandos para verificar que todo se instaló correctamente:

```bash
# Verificar Chromium
chromium-browser --version

# Verificar PM2
pm2 --version

# Verificar X11
which startx
```

**Salida esperada**:
- Chromium: Debe mostrar la versión instalada
- PM2: Debe mostrar la versión y información del gestor de procesos
- X11: Debe mostrar la ruta `/usr/bin/startx`

## Siguientes Pasos

Una vez completada esta fase de preparación del sistema, el siguiente paso será:
- Configurar y probar el servidor Node.js con PM2
- Configurar Chromium en modo kiosco
- Automatizar el inicio del sistema completo

---

**Nota**: Esta guía cubre únicamente la preparación del sistema. Los pasos posteriores incluirán la configuración específica de la aplicación y la automatización del kiosco.