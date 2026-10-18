# JEmo – Emocions de la cara

App de PIAR que **llig amb la càmera l'emoció de la cara** (les 7 d'Ekman) i l'envia a la micro:bit per Bluetooth UART com a **text curt**. Tot el càlcul es fa dins del dispositiu: cap imatge surt del mòbil.

## Missatges (una línia cada un)

| Codi | Significat |
|---|---|
| `E0` | Neutra |
| `E1` | Alegria |
| `E2` | Tristesa |
| `E3` | Enuig |
| `E4` | Sorpresa |
| `E5` | Por |
| `E6` | Fàstic |
| `E9` | No es veu cap cara |

Amb «Afegir la força» (per defecte) s'hi afig `:<0–100>`: `E1:87`. `E9` no en porta. A Configuració es pot posar un text propi per a cada codi. A MakeCode convé separar per «:» (`linia.split(":")[0]`).

> **Canvis respecte a versions anteriors:** s'han llevat la lectura de les mans i del cos (PoseNet) i, ara, **els moviments del cap** (els codis `G0`–`G3`). JEmo només envia emocions (`E…`). Les configuracions guardades s'adapten soles: s'esborren les opcions del cap i els textos propis dels codis `G`.

## Models (tots locals i dins de PIAR)

- **Cara · xarxa neuronal** (per defecte): `face-api` (detector petit + xarxa d'expressions), pesos dins de `vendor/face-api-1.7.15/model/`.
- **Cara · punts i regles**: MediaPipe Face Mesh (`vendor/mediapipe-face_mesh/`) + regles geomètriques (millor amb «Calibrar»).
- Cada model es carrega només quan fa falta (`js/vision.js`). No es descarrega res de Google.

## Fitxers

- `js/core.js` – lògica pura: emocions, suavitzat, format dels missatges i enviament.
- `js/vision.js` – càmera, models i bucle de lectura (una inferència cada vegada).
- `js/script.js` – interfície, configuració, calibratge, Bluetooth.
- `js/i18n.js` – textos ca/es/en (`je.*`).
- `guia.html` + `guia-img/` – guia pas a pas (programa de MakeCode inclòs).

## Limits

Detecta l'**expressió** de la cara, no el que sent la persona. Una sola persona. Fàstic, por i enuig són les emocions més difícils.
