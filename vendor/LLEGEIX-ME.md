# vendor/ – llibreries incloses dins de PIAR

Estes fitxers s'allotgen ací (en lloc de baixar-los d'un CDN) perquè PIAR es puga **instal·lar i usar sense Internet**.
Són còpies sense modificar dels paquets de npm indicats.

| Carpeta | Paquet npm | Llicència |
|---|---|---|
| `tfjs-4.17.0`, `tfjs-4.15.0`, `tfjs-3.11.0` | `@tensorflow/tfjs` | Apache-2.0 |
| `coco-ssd-2.2.3` | `@tensorflow-models/coco-ssd` | Apache-2.0 |
| `mobilenet-2.1.0` | `@tensorflow-models/mobilenet` | Apache-2.0 |
| `posenet-2.2.2` | `@tensorflow-models/posenet` | Apache-2.0 |
| `teachablemachine-image-0.8.5`, `teachablemachine-pose-0.8.6` | `@teachablemachine/image`, `@teachablemachine/pose` | Apache-2.0 |
| `mediapipe-face_mesh` (0.4.1633559619) | `@mediapipe/face_mesh` | Apache-2.0 |
| `mediapipe-hands` (0.4.1675469240) | `@mediapipe/hands` | Apache-2.0 |
| `mediapipe-camera_utils`, `mediapipe-drawing_utils` | `@mediapipe/camera_utils`, `@mediapipe/drawing_utils` | Apache-2.0 |
| `exifr-7.1.3` | `exifr` | MIT |
| `face-api-1.7.15` (inclou TF.js 4.22 i els models de cares) | `@vladmandic/face-api` | MIT |
| `tesseract.js-7.0.0`, `tesseract.js-core-7.0.0` | `tesseract.js`, `tesseract.js-core` | Apache-2.0 |
| `tesseract-lang-4.0.0` (català, castellà i anglés) | `@tesseract.js-data/cat`, `spa`, `eng` | Apache-2.0 |
| `fonts/` | Poppins, Space Mono, DM Sans (subconjunt llatí, via `@fontsource`) | SIL OFL 1.1 |

Els **pesos dels models** de COCO-SSD, MobileNet i PoseNet no estan ací: cada app els descarrega de
Google la primera vegada i el service worker (`/sw.js`) els guarda al dispositiu (vegeu la portada → «Ús sense Internet»).

Després d'afegir o canviar fitxers del repositori, executa `python3 tools/build-pwa.py` (actualitza `precache.json` i la versió de `sw.js`).
