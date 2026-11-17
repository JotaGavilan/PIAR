# JÚLI.A. · Robot amb veu i moviment

🎭🗣💬 El robot de la micro:bit (el cap de **JFace**) amb tres modes, que es trien amb els botons de dalt (l'app recorda l'últim):

- **🎭 Mou** (el que feia **JVeu**, ara fusionat ací): obeïx ordres de moviment que dius o escrius («mira a l'esquerra, obri la boca i parpelleja tres vegades»). No parla.
- **🗣 Repetix**: el mòbil llig un text en veu alta i l'app mou la **boca a cada síl·laba**, gira un poc el cap i parpelleja. Admet ordres entre `[claudàtors]`. Pensat a partir de la idea del robot de cartó parlant de LOFI Robot (*Talking Robot*).
- **💬 Conversa**: contesta la IA de Google (Gemini) amb la personalitat triada i el robot ho diu.

A la pantalla, el cap és un **robot de cartró verd** (gira, obri la boca i parpelleja com el real) amb el cartell **«Parla amb JÚLI.A.»** (en castellà «Habla con JÚLI.A.», en anglés «Talk to JÚLI.A.»). **JÚLI.A. és una marca: s'escriu sempre així, en majúscules i amb els dos punts.**

Valencià · castellà · anglés, mòbil (Android) i sense Internet (excepte la IA). En els tres modes s'envia el **mateix paquet de 6 dígits que JFace**, per això **no cal canviar el programa de la micro:bit**.

Guia pas a pas: [`guia.html`](guia.html).

## Com funciona

```
veu (navegador o Whisper local) / text
        ├─ 🎭 Mou ──── commands.js (regles ca/es/en; Gemini si no les entén) → passos ─────┐
        ├─ 🗣 Repeteix ─ text + [ordres] → síl·labes → línia de temps + veu del dispositiu ┼→ puppet.js → paquets «yyMMEE» → Bluetooth UART → micro:bit
        └─ 💬 Conversa → Gemini → text + [ordres] → igual que Repeteix ─────────────────────┘                                  i cap virtual en pantalla
```

- **Paquet**: `yyMMEE` = gir (2 dígits, 15 = de cara), boca (2), ull E (0/1), ull D (0/1). Només s'envia quan canvia. **La boca ha de ser 0…10**: el programa «Cap amb IA» ignora els valors > 10 (per defecte `mouthMax` = 10; la configuració antiga amb 20 es migra).
- **Ordres entre claudàtors** (no es pronuncien): `[parpelleja] [guinya_esquerra] [guinya_dreta] [esquerra] [dreta] [centre] [nega] [sorpresa] [riu] [pensa] [dorm] [desperta] [pausa]`, amb àlies en valencià, castellà i anglés. La IA només pot usar esta llista blanca (`JParla.sanitizeReply` treu Markdown, emojis, adreces i ordres desconegudes, i limita a 6 ordres i 600 caràcters).
- **Idioma de la conversa**: selector a la pantalla principal (`#langSel`, sincronitzat amb Configuració; `cfg.lang`): fixa la llengua del micròfon, de la veu i de la resposta de Gemini (`chat.reply({lang})`).
- **Entrada de text i frases d'exemple**: la caixa de text (`#textIn`) té aspecte de «paper» clar, les llistes desplegables van en fosc amb fletxa ▾ i les frases d'exemple ja no són una llista a l'escena: el botó 💡 (`#phraseBtn`) obri un panell (`#phrasePanel`) damunt de la caixa, amb les frases del mode actual (`#exMove/#exSay/#exChat`, botons `.ex.ph`). En triar-ne una s'executa i el panell es tanca (també amb ✕, Esc, tocar fora o canviar de mode). L'escena no es mou.
- **Avís de Conversa**: en obrir el mode es mostra `#aiNotice` (no activat per defecte, models externs, cal clau/token); botó «Posar la clau» → Configuració → IA.
- **Personalitat**: per defecte «Irònic i amb retranca» (config `v:3` migra «amable» i l'antiga «gruñó»); `chat.js` afig una regla general: mai diu que està vell/cansat ni talla la conversa.
- **Clau de Google**: la mateixa que *Què veuen de tu* (`localStorage['qv.gk.v1']`). Només s'envia **text**, mai àudio. En **Mou**, la IA només es consulta si l'actives i les regles no entenen la frase; l'eixida es valida amb `JMove.sanitize`.
- **Ajustos**: `localStorage['jparla.cfg.v1']`. La primera vegada, si hi ha ajustos de l'antiga JVeu (`jveu.cfg.v1`), es migren i s'obri en el mode Mou.

## Sincronia de la boca (el punt delicat en Android)

Les veus d'Android (i les de xarxa de Chrome) no avisen paraula a paraula, així que:

1. `JParla.syllables()` compta síl·labes (regles de diftongs/hiats en ca/es, vocals per a anglés) i dóna l'obertura de cada una (a > e,o > i,u).
2. `JParla.timeline()` calcula quan cau cada síl·laba amb una durada base per idioma, la velocitat de la veu, el control «Ritme de la boca» i una pausa en la puntuació.
3. En acabar cada tros, `puppet.js` compara la durada real amb la prevista i ajusta un factor `k` per veu i idioma (`localStorage['jparla.k.v1']`) ⇒ la boca s'adapta en 2–3 frases.
4. Si el navegador sí dona `boundary` (escriptori), la línia de temps es resincronitza amb eixos esdeveniments i no s'aprén.

En parlar, la boca va «a clap» (sense rampa de programari: només enviava valors intermedis ja vells) i l'interval entre paquets no passa de 50 ms. Opcions: «Avançar la boca» (ms, compensa Bluetooth i servo) i «Boca mig oberta entre síl·labes» (`mouthAt(tl,t,floor)`). «Com es mou la boca» pot ser per síl·laba o per paraula (`mouthAt(tl,t,floor,'word')`: una obertura per paraula, per a servos lents). El botó «👄 Prova de la boca» fa el mateix moviment que en parlar una frase, sense veu, per a calibrar el servo.

En el mode **Mou** la boca avança més a poc a poc (3,6 unitats/s) perquè el servo no patisca.

## Fitxers

| Fitxer | Funció |
|---|---|
| `js/core.js` | Lògica pura (sense DOM): síl·labes, ordres [claudàtors], línia de temps, paquets, neteja de la resposta |
| `js/commands.js` | Intèrpret del mode Mou (`JMove`): regles ca/es/en, números en paraules, percentatges, graus, seqüències, gestos |
| `js/puppet.js` | Bucle de 25 ms: mou gir/boca/ulls amb límit de velocitat, parla amb `speechSynthesis`, executa passos, envia paquets només quan canvien |
| `js/speech.js` | Micròfon → text: Web Speech API o **Whisper local** (Worker `js/stt-worker.js`) |
| `js/chat.js` | Gemini: conversa (instrucció de sistema: alumnat, resposta curta, llista d'ordres) i interpretació de frases lliures per a Mou |
| `js/head_robot.js` | Cap virtual SVG: robot de cartró verd (gira, obri la boca i parpelleja) |
| `js/script.js` | Interfície, configuració, modes, targeta amb la paraula ressaltada |
| `js/i18n.js` | Textos ca/es/en (claus `jp.*`, `jv.*`; **generat**) |
| `precarrega.html` | Descàrrega del model de Whisper per a l'ús sense Internet |

## Whisper local (opcional)

Necessita `vendor/transformers-4.3.1/stt-bundle.js` (transformers.js 4.3.1 + ONNX Runtime Web empaquetats amb esbuild; el `.wasm` ja és a la mateixa carpeta, compartit amb *Què veuen de tu*). Si no hi és, JÚLI.A. funciona igual amb la veu del navegador i ho indica. Vegeu `OPCIONAL-whisper/LEEME.txt`.

## Límits coneguts

- Sense provar amb una micro:bit, un mòbil Android, Gemini ni Whisper reals (només navegador d'escriptori amb veu, Bluetooth i xarxa simulats). La sincronia real depén de cada veu.
- Només gir, boca i ulls: el cap de JFace no pot assentir ni mirar amunt/avall.
- El reconeixement de veu del navegador (Chrome) necessita Internet.

## Prova sense micro:bit

Obri `jparla/index.html`: el cap virtual es mou igual. A la consola, `__jp.handleInput('mira a l\'esquerra')` executa una ordre en el mode actiu.
