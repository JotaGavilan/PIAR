# Escenes de JScroll (generador de les 72 publicacions d'exemple)

Les fotos i els vídeos d'exemple de JScroll **no són fotos reals**: són il·lustracions animades dibuixades amb codi (Canvas 2D),
3 escenes per interés × 12 interessos. Així no hi ha drets d'imatge, ni persones reals, ni marques, i tot pesa poc.

| Fitxer | Contingut |
|---|---|
| `lib.js` | Biblioteca de dibuix (soroll, degradats, halos, text, partícules, bucles perfectes…) |
| `scenes/<interés>.js` | Les escenes (`<interés>-a`, `-b` = vídeo en bucle de 8 s i foto; `-c` = només foto), amb 2 variants i peus ca/es/en |
| `harness.html`, `common.js` | Pàgina i utilitats per a renderitzar amb Chromium |
| `preview.js` | `node preview.js ESCENA [variants] [temps]` → full de contacte a `sheets/` (per a veure què dibuixes) |
| `looptest.js` | `node looptest.js ESCENA` → comprova que el bucle és perfecte |
| `build.js` | `node build.js [--topics a,b] [--out CARPETA]` → renderitza fotos (1080×1920, WebP) i vídeos (720×1280, H.264, 8 s, 24 fps) |
| `STYLE.md` | Guia d'estil i regles per a escriure escenes noves |

## Passos per a regenerar o canviar-ne

1. `npm i playwright` (i `npx playwright install chromium`), Python 3 amb Pillow i ffmpeg.
2. Edita o afig escenes a `scenes/` (mira `STYLE.md`).
3. `node build.js --out ../../jscroll/media` (o una carpeta temporal i després copia'ls).
4. `python3 ../jscroll-media.py` (regenera `feed.json` amb `captions.json`) i `python3 ../build-pwa.py`.

Les ruta de Playwright/Chromium es poden indicar amb `PLAYWRIGHT_PATH` i `CHROME_PATH` si no estan instal·lats de la manera habitual.
Si prefereixes **vídeos reals**, usa `tools/jscroll-media.py CARPETA` (mira la guia de JScroll): cal que tinguen llicència lliure.
