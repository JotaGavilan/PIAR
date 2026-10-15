# JEmo – Cara i cos amb emoció

App de PIAR que **llig amb la càmera l'emoció de la cara** (les 7 d'Ekman) i **els gestos del cos**, i els envia a la micro:bit per Bluetooth UART com a **text curt**. Tot el càlcul es fa dins del dispositiu: cap imatge surt del mòbil.

## Missatges (una línia cada un)

| Codi | Significat | | Codi | Significat |
|---|---|---|---|---|
| `E0` | Neutra | | `G0` | Cap gest |
| `E1` | Alegria | | `G1` | Braços amunt |
| `E2` | Tristesa | | `G2` | Saludant |
| `E3` | Enuig | | `G3` | Braços creuats |
| `E4` | Sorpresa | | `G4` | Mans a la cara |
| `E5` | Por | | `G5` | Cap inclinat |
| `E6` | Fàstic | | `G6` | Esquena caiguda |
| `E9` | No es veu cap cara | | | |

Amb «Afegir la força» (per defecte) s'hi afig `:<0–100>`: `E1:87`, `G2:90`. `E9` i `G0` no en porten. A Configuració es pot posar un text propi per a cada codi.

## Models (tots locals)

- **Cara · xarxa neuronal** (per defecte): `face-api` (detector petit + xarxa d'expressions), pesos dins de `vendor/face-api-1.7.15/model/`.
- **Cara · punts i regles**: MediaPipe Face Mesh (`vendor/mediapipe-face_mesh/`) + regles geomètriques (millor amb «Calibrar»).
- **Cos**: PoseNet (MobileNetV1, 0,75, stride 16) amb `tfjs-4.15.0`. Els pesos els baixa de Google la 1a vegada i el service worker els guarda (`piar-models-v1`); `precarrega.html` els descarrega des de la portada.
- Cada model es carrega només quan fa falta (`js/vision.js`).

## Fitxers

- `js/core.js` – lògica pura: emocions, gestos (`classifyPose`), suavitzat, reforç, format dels missatges i enviament.
- `js/vision.js` – càmera, models i bucle de lectura (una inferència cada vegada).
- `js/script.js` – interfície, configuració, calibratge, Bluetooth.
- `js/i18n.js` – textos ca/es/en (`je.*`).
- `guia.html` + `guia-img/` – guia pas a pas (programa de MakeCode inclòs, comprovat amb els tipus de pxt).

## Limits

Detecta l'**expressió** de la cara, no el que sent la persona. Una sola persona. Els gestos necessiten veure cap i espatlles. Fàstic, por i enuig són les emocions més difícils.
