#!/bin/bash
# ===========================================
# Raspberry Pi Kiosk Setup voor Blokhut Display
# ===========================================
# GEBRUIK:
#   wget https://raw.githubusercontent.com/mcmusabe/blokhut-display/main/raspberry-pi-setup.sh
#   sudo bash raspberry-pi-setup.sh
#   (daarna automatisch reboot)
# ===========================================

DISPLAY_URL="http://192.168.178.51:8000/"
PI_USER=$(whoami)
HOME_DIR=$(eval echo ~$PI_USER)

# Als root, gebruik pi user
if [ "$PI_USER" = "root" ]; then
    PI_USER="pi"
    HOME_DIR="/home/pi"
fi

echo ""
echo "=========================================="
echo "  Blokhut Display - Raspberry Pi Setup"
echo "=========================================="
echo "  Server: ${DISPLAY_URL}"
echo "  User: ${PI_USER}"
echo "=========================================="
echo ""

# Update en installeer packages
echo "[1/5] Systeem updaten en packages installeren..."
apt-get update -qq
apt-get install -y chromium-browser unclutter xdotool

# Disable screen blanking
echo "[2/5] Scherm altijd aan houden..."
mkdir -p /etc/xdg/lxsession/LXDE-pi
cat > /etc/xdg/lxsession/LXDE-pi/autostart << 'EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@bash /home/pi/start-kiosk.sh
EOF

# Maak kiosk start script
echo "[3/5] Kiosk script maken..."
cat > ${HOME_DIR}/start-kiosk.sh << EOF
#!/bin/bash
# Wacht op netwerk en desktop
sleep 15

# Verberg muiscursor
unclutter -idle 0.5 -root &

# Sluit eventuele crash dialogen
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ${HOME_DIR}/.config/chromium/Default/Preferences 2>/dev/null
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ${HOME_DIR}/.config/chromium/Default/Preferences 2>/dev/null

# Start Chromium in kiosk mode
chromium-browser \\
    --kiosk \\
    --noerrdialogs \\
    --disable-infobars \\
    --disable-session-crashed-bubble \\
    --disable-restore-session-state \\
    --disable-translate \\
    --no-first-run \\
    --check-for-update-interval=31536000 \\
    --start-fullscreen \\
    --autoplay-policy=no-user-gesture-required \\
    ${DISPLAY_URL}
EOF

chmod +x ${HOME_DIR}/start-kiosk.sh
chown ${PI_USER}:${PI_USER} ${HOME_DIR}/start-kiosk.sh

# Disable screen saver via lightdm
echo "[4/5] Screensaver uitschakelen..."
if [ -f /etc/lightdm/lightdm.conf ]; then
    sed -i 's/#xserver-command=X/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
fi

# Autostart via desktop file als backup
echo "[5/5] Autostart configureren..."
mkdir -p ${HOME_DIR}/.config/autostart
cat > ${HOME_DIR}/.config/autostart/kiosk.desktop << EOF
[Desktop Entry]
Type=Application
Name=Blokhut Display
Exec=${HOME_DIR}/start-kiosk.sh
EOF
chown -R ${PI_USER}:${PI_USER} ${HOME_DIR}/.config

echo ""
echo "=========================================="
echo "  ✅ SETUP COMPLEET!"
echo "=========================================="
echo ""
echo "  De Raspberry Pi herstart nu automatisch."
echo "  Na herstart opent het display fullscreen."
echo ""
echo "  URL: ${DISPLAY_URL}"
echo ""
echo "=========================================="
echo ""

# Automatisch rebooten
sleep 3
reboot
