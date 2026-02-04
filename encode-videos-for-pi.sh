#!/bin/bash
# Re-encode video's voor betere afspeelbaarheid op Raspberry Pi Zero 2 W
# Vereist: ffmpeg. Gebruik: ./encode-videos-for-pi.sh
# Output: *_720.mp4 in assets/videos/ (vervang originelen of pas slides.json aan)

set -e
cd "$(dirname "$0")/assets/videos"

for f in "Douglas tuinhuis met carport, overkapping, industrial look glas en berging. Geproduceerd in Lochem..mp4" "montagehandleiding blokhut tuindeco.mp4"; do
  [ -f "$f" ] || { echo "Bestand niet gevonden: $f"; continue; }
  out="${f%.mp4}_720.mp4"
  echo "Encode: $f -> $out"
  ffmpeg -y -i "$f" -vf "scale=-2:720" -c:v libx264 -profile:v baseline -level 3.0 -crf 28 -an -movflags +faststart "$out"
  echo "Klaar: $out"
done

echo "Gereed. Gebruik de *_720.mp4 bestanden of vervang de originelen."
