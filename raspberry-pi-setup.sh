#!/bin/bash
# ===========================================
# Raspberry Pi Kiosk Setup voor Blokhut Display
# ===========================================
# GEBRUIK:
#   wget https://raw.githubusercontent.com/mcmusabe/blokhut-display/main/raspberry-pi-setup.sh
#   sudo bash raspberry-pi-setup.sh
#   (daarna automatisch reboot)
# ===========================================
# Ondersteunt zowel:
#   - Raspberry Pi OS Bookworm+ (labwc/Wayland)
#   - Oudere versies (LXDE/X11)
# ===========================================

DISPLAY_URL="http://192.168.178.51:8000/"
PI_USER=$(whoami)
HOME_DIR=$(eval echo ~$PI_USER)

# Als root, gebruik pi user
if [ "$PI_USER" = "root" ]; then
    PI_USER="pi"
    HOME_DIR="/home/pi"
fi

# Detecteer desktop environment
detect_desktop() {
    if [ -d "/etc/xdg/labwc" ] || command -v labwc &> /dev/null; then
        echo "labwc"
    elif [ -d "/etc/xdg/lxsession/LXDE-pi" ]; then
        echo "lxde"
    else
        echo "unknown"
    fi
}

DESKTOP_ENV=$(detect_desktop)

echo ""
echo "=========================================="
echo "  Blokhut Display - Raspberry Pi Setup"
echo "=========================================="
echo "  Server: ${DISPLAY_URL}"
echo "  User: ${PI_USER}"
echo "  Desktop: ${DESKTOP_ENV}"
echo "=========================================="
echo ""

# Update en installeer packages
echo "[1/6] Systeem updaten en packages installeren..."
apt-get update -qq
apt-get install -y chromium unclutter xdotool || apt-get install -y chromium-browser unclutter xdotool

# Maak kiosk start script
echo "[2/6] Kiosk script maken..."
cat > ${HOME_DIR}/start-kiosk.sh << EOF
#!/bin/bash
# Wacht op netwerk en desktop
sleep 10

# Verberg muiscursor (werkt op zowel X11 als Wayland)
if command -v unclutter &> /dev/null; then
    unclutter -idle 0.5 -root &
fi

# Sluit eventuele crash dialogen
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ${HOME_DIR}/.config/chromium/Default/Preferences 2>/dev/null
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ${HOME_DIR}/.config/chromium/Default/Preferences 2>/dev/null

# Start Chromium in kiosk mode (chromium of chromium-browser)
BROWSER=\$(which chromium || which chromium-browser)
\$BROWSER \\
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
    --ozone-platform=wayland \\
    ${DISPLAY_URL}
EOF

chmod +x ${HOME_DIR}/start-kiosk.sh
chown ${PI_USER}:${PI_USER} ${HOME_DIR}/start-kiosk.sh

# Configureer autostart afhankelijk van desktop environment
echo "[3/6] Autostart configureren voor ${DESKTOP_ENV}..."

if [ "$DESKTOP_ENV" = "labwc" ]; then
    # ============================================
    # LABWC (Raspberry Pi OS Bookworm en nieuwer)
    # ============================================
    echo "  -> labwc/Wayland configuratie..."
    
    # Maak user labwc config directory
    mkdir -p ${HOME_DIR}/.config/labwc
    
    # Voeg toe aan labwc autostart (user-level)
    cat > ${HOME_DIR}/.config/labwc/autostart << EOF
# Blokhut Display Kiosk - Autostart
# Disable screen blanking
wlr-randr --output HDMI-A-1 --transform normal 2>/dev/null

# Start kiosk na korte delay
sleep 5
${HOME_DIR}/start-kiosk.sh &
EOF
    
    chown -R ${PI_USER}:${PI_USER} ${HOME_DIR}/.config/labwc
    
    # Disable screen blanking via labwc environment
    mkdir -p ${HOME_DIR}/.config/labwc
    cat > ${HOME_DIR}/.config/labwc/environment << EOF
# Disable screen blanking
DISPLAY_DPMS=off
EOF
    chown ${PI_USER}:${PI_USER} ${HOME_DIR}/.config/labwc/environment

else
    # ============================================
    # LXDE (Oudere Raspberry Pi OS versies)
    # ============================================
    echo "  -> LXDE/X11 configuratie..."
    
    mkdir -p /etc/xdg/lxsession/LXDE-pi
    cat > /etc/xdg/lxsession/LXDE-pi/autostart << 'EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0.5 -root
@bash -c "sleep 10 && chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-translate --no-first-run --enable-gpu-rasterization --enable-zero-copy --disable-software-rasterizer --enable-features=VaapiVideoDecoder --autoplay-policy=no-user-gesture-required http://192.168.178.51:8000/"
EOF
fi

# Disable screen saver via raspi-config (werkt voor beide)
echo "[4/6] Screensaver uitschakelen..."
if command -v raspi-config &> /dev/null; then
    # Set boot to desktop with auto-login
    raspi-config nonint do_boot_behaviour B4
fi

# Disable screen blanking via kernel (werkt voor beide)
echo "[5/6] Screen blanking kernel-level uitschakelen..."
if [ -f /boot/firmware/cmdline.txt ]; then
    # Raspberry Pi OS Bookworm+
    if ! grep -q "consoleblank=0" /boot/firmware/cmdline.txt; then
        sed -i 's/$/ consoleblank=0/' /boot/firmware/cmdline.txt
    fi
elif [ -f /boot/cmdline.txt ]; then
    # Oudere versies
    if ! grep -q "consoleblank=0" /boot/cmdline.txt; then
        sed -i 's/$/ consoleblank=0/' /boot/cmdline.txt
    fi
fi

# Disable screen saver via lightdm (voor X11)
if [ -f /etc/lightdm/lightdm.conf ]; then
    sed -i 's/#xserver-command=X/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
fi

# Autostart via desktop file als extra backup
echo "[6/6] Backup autostart configureren..."
mkdir -p ${HOME_DIR}/.config/autostart
cat > ${HOME_DIR}/.config/autostart/kiosk.desktop << EOF
[Desktop Entry]
Type=Application
Name=Blokhut Display
Exec=${HOME_DIR}/start-kiosk.sh
X-GNOME-Autostart-enabled=true
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
