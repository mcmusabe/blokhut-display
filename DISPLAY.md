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

## Bronnen (onderzoek)

- Digital signage: 3x5-regel (max. 3 regels × 5 woorden), sans-serif, 5% safe zone (EBU/ITU).
- Grote schermen: viewport-units (vw/vh) en `clamp()` voor schaalbare typography (MDN).
- Raspberry Pi + TV: overscan via TV-menu uitzetten of `config.txt` / `cmdline.txt` margins.
