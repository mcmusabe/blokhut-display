@echo off
:: Blokhutwinkel Display - Auto Start
:: Wacht even tot netwerk verbonden is
timeout /t 5 /nobreak >nul

:: Start Chrome in kiosk mode
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-infobars --noerrdialogs --disable-translate --no-first-run http://192.168.178.183

:: Als Chrome niet gevonden, probeer Edge
if errorlevel 1 (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk --disable-infobars http://192.168.178.183
)
