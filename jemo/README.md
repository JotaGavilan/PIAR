# JEmo – Cara i cos amb emoció

App de PIAR que **llig amb la càmera l'emoció de la cara** (les 7 d'Ekman) i **els gestos** (mans, cap i cos), i els envia a la micro:bit per Bluetooth UART com a **text curt**. Tot el càlcul es fa dins del dispositiu: cap imatge surt del mòbil.

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
| `E9` | No es veu cap cara | | `G7` | ✋ Mà oberta |
| | | | `G8` | ✊ Puny |
| | | | `G9` | 👍 Polze amunt |
| | | | `G10` | ✌️ Victòria |
| | | | `G11` | ↕️ Assentint (sí) |
| | | | `G12` | ↔️ Negant (no) |

**Atenció:** els codis poden tindre 2 o 3 caràcters (`G2`, `G10`). A MakeCode separa per «:» (`linia.split(":")[0]`), no per posició.

Amb «Afegir la força» (per defecte) s'hi afig `:<0–100>`: `E1:87`, `G2:90`. `E9` i `G0` no en porten. A Configuració es pot posar un text propi per a cada codi.

## Vistes dels gestos

La càmera frontal del mòbil només veu la cara i les mans, per això hi ha dues vistes (Configuració → *Com et col·loques*):

- **Cerca** (per defecte): `G2` saludar, `G4` mà a la cara o sobre el cap, `G5` cap inclinat, `G6` esquena caiguda (només si es veuen les dos espatlles; si no, s'ignora), `G7`–`G10` formes de la mà, `G11`/`G12` sí/no amb el cap.
- **Cos sencer** (càmera lluny): `G1`–`G6` amb PoseNet.

## Models (tots locals)

- **Cara · xarxa neuronal** (per defecte): `face-api` (detector petit + xarxa d'expressions), pesos dins de `vendor/face-api-1.7.15/model/`.
- **Cara · punts i regles**: MediaPipe Face Mesh (`vendor/mediapipe-face_mesh/`) + regles geomètriques (millor amb «Calibrar»).
- **Mans** (vista «Cerca»): MediaPipe Hands (`vendor/mediapipe-hands/`, `modelComplexity` 1), 21 punts per mà → `classifyHand` (forma) i oscil·lació horitzontal per a saludar.
- **Cap** (vista «Cerca»): els 468 punts de la malla → `headFeatures` (yaw, pitch, roll); sí/no = oscil·lació de pitch/yaw (`oscillation`), inclinat = roll. Amb el model de cara «xarxa» la malla corre com a tasca addicional.
- **Cos**: PoseNet (MobileNetV1, 0,75, stride 16) amb `tfjs-4.15.0`. Els pesos els baixa de Google la 1a vegada i el service worker els guarda (`piar-models-v1`); `precarrega.html` els descarrega des de la portada.
- Cada model es carrega només quan fa falta (`js/vision.js`).

## Fitxers

- `js/core.js` – lògica pura: emocions, gestos (`classifyPose` · `classifyClose`), suavitzat, reforç, format dels missatges i enviament.
- `js/vision.js` – càmera, models i bucle de lectura (una inferència cada vegada).
- `js/script.js` – interfície, configuració, calibratge, Bluetooth.
- `js/i18n.js` – textos ca/es/en (`je.*`).
- `guia.html` + `guia-img/` – guia pas a pas (programa de MakeCode inclòs, comprovat amb els tipus de pxt).

## Limits

Detecta l'**expressió** de la cara, no el que sent la persona. Una sola persona. A la vista «Cos sencer» els gestos necessiten veure cap i espatlles. El sí/no amb el cap i la forma de la mà depenen de la llum i de mostrar-los de cara; els llindars (`Moviment del cap`) s'han d'afinar amb el mòbil real. Fàstic, por i enuig són les emocions més difícils.
