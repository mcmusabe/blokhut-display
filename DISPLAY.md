# Showroom-display op grote TV

## Wat er is ingesteld

- **TV safe zone (5%)** – Tekst en belangrijke content zitten minstens 5% van de rand, zodat niets wordt afgesneden door overscan.
- **Viewport-typography** – Lettergroottes gebruiken `clamp()` en `vw`, zodat ze meeschalen op Full HD en 4K en leesbaar blijven op afstand.
- **16:9** – Layout is geschikt voor standaard TV-formaat.

## TV-instellingen (aanbevolen)

Om afsnijden aan de randen te voorkomen:

- **Samsung:** Beeld > Beeldaanpassing > Beeldgrootte > **Screen Fit**
- **LG:** Instellingen > Beeld > Beeldgrootte > **Just Scan** aan
- **Andere merken:** Zoek naar “overscan uitzetten”, “1:1” of “Pixel-voor-pixel”

## Lite-modus (Pi Zero: snel en professioneel)

**Gebruik op de Pi:** open de display met **`?lite=1`** of **`?pi=1`**:

```
http://192.168.178.51:8000/?lite=1
```

In lite-modus worden **geen video’s** geladen. Video-slides tonen dezelfde titel en tekst met een nette gradient-achtergrond. Geen traagheid, geen artefacten, stabiel en professioneel op de Pi Zero 2 W.

**Autostart op de Pi:** pas de Chromium-URL in `/etc/xdg/lxsession/LXDE-pi/autostart` aan naar `http://192.168.178.51:8000/?lite=1`.

## Raspberry Pi Zero 2 W: video en performance

De Pi Zero 2 W heeft **512 MB RAM**; Chromium is zwaar en 1080p-video is vaak te zwaar. In de app:

- **Video lazy load:** Alleen de video van de **actieve slide** wordt geladen en afgespeeld. Bij wissel wordt de vorige video gepauzeerd en de `src` geleegd (geheugen vrij).
- **preload="none":** Video wordt niet vooraf geladen; pas bij tonen van de slide wordt geladen (MDN / web.dev).

### Video bestanden lichter maken (aanbevolen voor Pi)

Re-encode met **FFmpeg** voor betere afspeelbaarheid op de Pi:

```bash
# 720p, H.264 baseline, geen audio, lagere bitrate (CRF 28)
ffmpeg -i origineel.mp4 -vf "scale=-2:720" -c:v libx264 -profile:v baseline -level 3.0 -crf 28 -an -movflags +faststart uit_720.mp4
```

- **scale=-2:720** – max. hoogte 720px (geschikt voor Pi).
- **-profile:v baseline -level 3.0** – betere compatibiliteit en minder CPU.
- **-an** – geen audio (minder bestandsgrootte en CPU).
- **-movflags +faststart** – snellere start van afspelen.

Voor nog lichtere bestanden: `scale=-2:480` en/of `-crf 30`.

Plaats de lichte bestanden in `assets/videos/` en pas de bestandsnamen in `assets/slides.json` aan, of vervang de originele bestanden.

### Als het nog te traag is

- Overweeg een **Raspberry Pi 4 (2 GB+)** of een mini-PC voor soepele video en Chromium.
- Op de Pi: **GPU memory** verhogen (raspi-config → Performance → GPU Memory → 128 MB).

## Bronnen (onderzoek)

- Digital signage: 3x5-regel (max. 3 regels × 5 woorden), sans-serif, 5% safe zone (EBU/ITU).
- Grote schermen: viewport-units (vw/vh) en `clamp()` voor schaalbare typography (MDN).
- Raspberry Pi + TV: overscan via TV-menu uitzetten of `config.txt` / `cmdline.txt` margins.
- Pi Zero 2 W: Raspberry Pi Forums (Chromium traag, 1080p video problematisch).
- Video performance: MDN preload, web.dev video performance; FFmpeg H.264 baseline voor lage CPU.
