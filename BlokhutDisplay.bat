@echo off
:: Blokhutwinkel Display - Auto Start
:: Wacht even tot netwerk verbonden is
timeout /t 5 /nobreak >nul

:: Start Chrome in kiosk mode
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-infobars --noerrdialogs --disable-translate --no-first-run https://display.intern.blokhutwinkel.nl

:: Als Chrome niet gevonden, probeer Edge
if errorlevel 1 (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk --disable-infobars https://display.intern.blokhutwinkel.nl
)
