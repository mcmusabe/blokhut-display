#!/bin/bash
# ===========================================
# Raspberry Pi Kiosk Setup voor Blokhut Display
# ===========================================
# Dit script configureert een Raspberry Pi om automatisch
# de display website te openen in fullscreen kiosk mode
#
# Gebruik: sudo bash raspberry-pi-setup.sh [SERVER_IP]
# Voorbeeld: sudo bash raspberry-pi-setup.sh 192.168.1.100
# ===========================================

SERVER_IP=${1:-"192.168.1.100"}
DISPLAY_URL="http://${SERVER_IP}"

echo "🖥️  Raspberry Pi Kiosk Setup"
echo "=============================="
echo "Server URL: ${DISPLAY_URL}"
echo ""

# Update systeem
echo "📦 Systeem updaten..."
apt-get update -qq

# Installeer benodigde packages
echo "📦 Chromium browser installeren..."
apt-get install -y chromium-browser unclutter xdotool

# Disable screen blanking
echo "🔆 Scherm altijd aan houden..."
cat >> /etc/xdg/lxsession/LXDE-pi/autostart << 'EOF'
@xset s off
@xset -dpms
@xset s noblank
EOF

# Maak kiosk autostart script
echo "🚀 Autostart configureren..."
mkdir -p /home/pi/.config/autostart

cat > /home/pi/.config/autostart/kiosk.desktop << EOF
[Desktop Entry]
Type=Application
Name=Blokhut Display Kiosk
Exec=/home/pi/start-kiosk.sh
EOF

# Maak start script
cat > /home/pi/start-kiosk.sh << EOF
#!/bin/bash
# Wacht tot netwerk beschikbaar is
sleep 10

# Verberg muiscursor
unclutter -idle 0.5 -root &

# Start Chromium in kiosk mode
chromium-browser \\
    --kiosk \\
    --noerrdialogs \\
    --disable-infobars \\
    --disable-session-crashed-bubble \\
    --disable-restore-session-state \\
    --disable-translate \\
    --no-first-run \\
    --start-fullscreen \\
    --autoplay-policy=no-user-gesture-required \\
    ${DISPLAY_URL}
EOF

chmod +x /home/pi/start-kiosk.sh
chown pi:pi /home/pi/start-kiosk.sh
chown pi:pi /home/pi/.config/autostart/kiosk.desktop

echo ""
echo "✅ Setup compleet!"
echo ""
echo "De Raspberry Pi zal nu automatisch opstarten met:"
echo "  → URL: ${DISPLAY_URL}"
echo "  → Fullscreen kiosk mode"
echo "  → Geen muiscursor"
echo "  → Scherm blijft altijd aan"
echo ""
echo "🔄 Herstart nu de Pi met: sudo reboot"
