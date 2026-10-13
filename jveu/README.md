# JVeu · Cap amb veu

🎤 Mou el cap de la micro:bit (el de **JFace**) **amb la veu**. Digues «mira a l'esquerra, obri la boca i parpelleja tres vegades»: l'app ho entén, ho converteix en el **mateix paquet de 6 dígits que JFace** i l'envia per Bluetooth. Per això **no cal canviar el programa de la micro:bit**.

Guia pas a pas: [`guia.html`](guia.html).

## Com funciona

```
veu / text → intèrpret d'ordres → passos (gir, boca, ulls) → reproductor → paquets «yyMMEE» → Bluetooth UART
                                          ↘ cap virtual en pantalla
```

| Peça | Fitxer | Què fa |
|---|---|---|
| Intèrpret | `js/commands.js` | Regles en valencià, castellà i anglés alhora (números en paraules, percentatges, graus, seqüències, gestos). Sense dependències; també es pot usar des de Node. |
| Reproductor | `js/player.js` | Interpola els passos i només envia quan canvia el paquet. |
| Cap virtual | `js/head.js` | Cap en SVG que es mou igual que el real. |
| Veu | `js/speech.js` | Dos motors: Web Speech API (navegador) i Whisper local (Worker `js/stt-worker.js`). |
| IA opcional | `js/gemini.js` | Només per a frases lliures. Envia **text**, mai àudio; l'eixida es valida amb `JVeu.sanitize`. Comparteix la clau amb *Què veuen de tu* (`localStorage['qv.gk.v1']`). |
| Interfície | `js/script.js`, `index.html`, `css/style.css`, `js/i18n.js` | ca / es / en. |

## Paquet enviat

`yyMMEE` — gir (2 dígits, 15 = de cara), boca (2 dígits), ull E (0/1), ull D (0/1). Exemple: `151010`.
El cap només té gir, boca i ulls; «assentir» o «mira amunt» no es poden fer (l'app ho diu).

## Whisper local (opcional)

El motor de Whisper necessita el fitxer `vendor/transformers-4.3.1/stt-bundle.js` (transformers.js 4.3.1 + ONNX Runtime Web empaquetats amb esbuild; el `.wasm` ja és a la mateixa carpeta, compartit amb *Què veuen de tu*). Si no hi és, JVeu funciona igual amb la veu del navegador i ho indica a l'usuari. El model (`onnx-community/whisper-tiny|base`, q8) es baixa de Hugging Face una vegada i es guarda en `transformers-cache`.

## Prova sense micro:bit

Obri `jveu/index.html`: el cap virtual de la pantalla es mou igual. A la consola, `__jv.handleText('mira a la izquierda')` executa una ordre.
