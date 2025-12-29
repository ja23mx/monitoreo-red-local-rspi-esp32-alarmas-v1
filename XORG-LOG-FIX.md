# Mitigar crecimiento excesivo de /var/log/Xorg.0.log

Descripción
- Instrucciones para:
  - Desactivar el polling del módulo drm_kms_helper (persistente).
  - Añadir rotación automática para /var/log/Xorg.0.log.
  - Liberar espacio inmediatamente si Xorg mantiene un inode "deleted".
  - Verificar y probar la configuración.
- Objetivo: evitar que el log Xorg crezca descontrolado y llenar la SD/SSD.

Requisitos
- Acceso root (sudo) en la máquina.
- Nano o editor de texto disponible (opcional).
- logrotate instalado (normalmente presente en distribuciones Debian/Ubuntu/Raspbian).

1) Comprobaciones iniciales
- Verificar el parámetro del módulo (antes del reboot):
  sudo cat /sys/module/drm_kms_helper/parameters/poll
  - Resultado esperado tras aplicar: N
- Ver tamaño y fecha del log:
  sudo stat -c '%n %s %y' /var/log/Xorg.0.log
- Ver qué fichero tiene Xorg abierto:
  sudo lsof -nP | grep Xorg

2) Hacer persistente poll=0 (se aplica en el próximo arranque)
- Crear archivo:
  sudo bash -c "echo 'options drm_kms_helper poll=0' | tee /etc/modprobe.d/drm_kms_helper.conf >/dev/null"
- Verificar:
  sudo cat /etc/modprobe.d/drm_kms_helper.conf

Notas: el cambio se aplica en el siguiente reinicio. Antes del reinicio seguirás viendo el valor antiguo.

3) Configurar logrotate para Xorg
- Crear/editar archivo:
  sudo nano /etc/logrotate.d/xorg
- Pegar exactamente:

/var/log/Xorg.0.log {
    size 1M
    rotate 7
    compress
    missingok
    notifempty
    create 0644 root root
    copytruncate
}

- Guardar y cerrar.
- Verificar:
  sudo cat /etc/logrotate.d/xorg

Explicación de las opciones:
- size 1M: rotar cuando alcance 1 MiB.
- rotate 7: conservar 7 rotaciones.
- compress: comprimir las rotaciones (.gz).
- copytruncate: copia y trunca el fichero (evita reiniciar Xorg).

4) Liberar espacio inmediatamente (si existe un inode "deleted")
- Si lsof muestra que Xorg tiene abierto un fichero eliminado grande:
  Ejemplo: Xorg PID 905 FD 6 → /var/log/Xorg.0.log.1 (deleted)
- Truncar el descriptor abierto (sin reiniciar Xorg):
  sudo truncate -s 0 /proc/<PID>/fd/<FD>
  Ejemplo:
  sudo truncate -s 0 /proc/905/fd/6
- Verificar liberación de espacio:
  sudo df -h /

Advertencia: esto libera espacio pero Xorg seguirá escribiendo en ese descriptor hasta que cierre/reabra su logfile (p. ej. tras reiniciar Xorg o el display manager).

5) Forzar una rotación de prueba
- (Opcional) Generar ~2 MiB de texto para provocar rotación:
  yes "LOGTEST" | head -c 2000000 >> /var/log/Xorg.0.log
- Forzar rotación y ver salida:
  sudo logrotate -f -v /etc/logrotate.d/xorg
- Comprobar archivos resultantes:
  ls -lh /var/log/Xorg.0.log*

Si logrotate indica "does not exist" es porque Xorg no está escribiendo en /var/log/Xorg.0.log (puede usar un .old o descriptor eliminado). Fix: abrir/crear /var/log/Xorg.0.log o reiniciar Xorg.

6) Reiniciar para aplicar poll=0 y normalizar logs
- Opciones:
  - Reinicio completo (recomendado si puedes desconectar):
    sudo reboot
  - Reiniciar solo el display manager (cierra sesiones gráficas):
    1) Identificar DM:
       ps -e | egrep 'gdm|gdm3|lightdm|sddm|xdm|lxdm' || sudo systemctl status display-manager
    2) Reiniciarlo:
       sudo systemctl restart <servicio>
- Tras reinicio verifica:
  sudo cat /sys/module/drm_kms_helper/parameters/poll   (debe mostrar N)
  sudo stat -c '%n %s %y' /var/log/Xorg.0.log
  sudo tail -n 50 /var/log/Xorg.0.log
  sudo df -h /
  sudo lsof -nP /var/log/Xorg.0.log

7) Limpieza de logs antiguos (si procede)
- Si quedan ficheros .old o rotaciones antiguas puedes eliminarlos manualmente:
  sudo rm /var/log/Xorg.0.log.old
  (sólo si no están en uso; comprobar con lsof)

8) Reversión (rollback)
- Para deshacer poll=0:
  sudo rm /etc/modprobe.d/drm_kms_helper.conf
  sudo reboot
- Para eliminar rotación:
  sudo rm /etc/logrotate.d/xorg

9) Ubicación recomendada para este documento
- Sistema (recomendado): /usr/local/share/doc/xorg-log-fix.md
- Usuario: ~/Documents/xorg-log-fix.md
- Para control de versiones: dentro de tu repo en /srv/configs/ o ~/projects/configs/

Ejemplo de comando para mover el archivo local:
sudo mv xorg-log-fix.md /usr/local/share/doc/

10) Troubleshooting rápido
- logrotate: error "unknown unit '}'" → el archivo de configuración está en una sola línea; editar y añadir saltos de línea.
- logrotate: "log ... does not exist" → comprueba nombres: /var/log/Xorg.0.log vs /var/log/Xorg.0.log.old; usa lsof para ver dónde escribe Xorg.
- Si espacio no se libera aunque borres archivos: un proceso mantiene el descriptor; usar lsof para identificar PID/FD y truncar o reiniciar el proceso.

11) Notas finales
- copytruncate es práctico para procesos que no pueden ser reiniciados, pero no evita que Xorg mantenga inodes borrados generados anteriormente.
- La solución definitiva es que Xorg cierre y reabra su logfile (reiniciar DM o reboot).
- Mantén un tamaño de rotación razonable (1M en el ejemplo) según uso y frecuencia de logs.

Licencia
- Copia/usa/adapta libremente.

Fin.