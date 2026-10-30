# JParla · Robot que parla

🗣 Fa **parlar** el robot de la micro:bit (el de **JFace** i **JVeu**). El mòbil llig un text en veu alta i l'app mou la **boca a cada síl·laba**, gira un poc el cap i parpelleja. Va pensada a partir de la idea del robot de cartó parlant de LOFI Robot (*Talking Robot*), integrada en PIAR: valencià · castellà · anglés, mòbil (Android) i sense Internet.

Guia pas a pas: [`guia.html`](guia.html).

## Com funciona

```
text (escrit o per veu) ─┬─ mode Repeteix ──────────────┐
                         └─ mode Conversa → Gemini ─────┤   text + ordres [entre claudàtors]
                                                        ▼
        síl·labes de cada paraula → línia de temps de la boca ┐
        veu del dispositiu (speechSynthesis) ─────────────────┼→ paquets «yyMMEE» → Bluetooth UART → micro:bit
                                                              ┘   i cap virtual en pantalla
```

- **Mateix paquet que JFace** (6 dígits: gir 2, boca 2, ull E 1, ull D 1) ⇒ **no cal canviar el programa de la micro:bit**.
- **Dos modes**: *Repeteix* (sense Internet ni clau) i *Conversa* (IA de Google; clau gratuïta, la mateixa que JVeu i *Què veuen de tu*, `localStorage['qv.gk.v1']`).
- **Ordres entre claudàtors** (no es pronuncien): `[parpelleja] [guinya_esquerra] [guinya_dreta] [esquerra] [dreta] [centre] [nega] [sorpresa] [riu] [pensa] [dorm] [desperta] [pausa]`, amb àlies en valencià, castellà i anglés. La IA només pot usar esta llista blanca (`JParla.sanitizeReply` treu Markdown, emojis, adreces i ordres desconegudes, i limita a 6 ordres i 600 caràcters).

## Sincronia de la boca (el punt delicat en Android)

Les veus d'Android (i les de xarxa de Chrome) no avisen paraula a paraula, així que:

1. `JParla.syllables()` compta síl·labes (regles de diftongs/hiats en ca/es, vocals per a anglés) i dóna l'obertura de cada una (a > e,o > i,u).
2. `JParla.timeline()` calcula quan cau cada síl·laba amb una durada base per idioma, la velocitat de la veu, el control «Ritme de la boca» i una pausa en la puntuació.
3. En acabar cada tros, `puppet.js` compara la durada real amb la prevista i ajusta un factor `k` per veu i idioma (`localStorage['jparla.k.v1']`, mitjana mòbil) ⇒ la boca s'adapta en 2–3 frases.
4. Si el navegador sí dona `boundary` (escriptori), la línia de temps es resincronitza amb eixos esdeveniments i no s'aprèn.

## Fitxers

| Fitxer | Funció |
|---|---|
| `js/core.js` | Lògica pura (sense DOM): síl·labes, ordres, línia de temps, paquets, neteja de la resposta |
| `js/puppet.js` | Bucle de 25 ms: mou gir/boca/ulls amb límit de velocitat, parla amb `speechSynthesis`, envia paquets només quan canvien |
| `js/stt.js` | Micròfon → text (Web Speech API) |
| `js/chat.js` | Conversa amb Gemini (instrucció de sistema: alumnat, resposta curta, llista d'ordres) |
| `js/head.js` | Cap virtual SVG (el de JVeu) |
| `js/script.js` | Interfície, configuració, modes, targeta amb la paraula ressaltada |
| `js/i18n.js` | Textos ca/es/en (claus `jp.*`) |

## Límits conegudos

- Sense provar amb una micro:bit i un mòbil Android reals (només navegador d'escriptori amb veu i Bluetooth simulats). La sincronia real depén de cada veu.
- Només gir, boca i ulls: el cap de JFace no pot assentir.
- El reconeixement de veu és el del navegador (Chrome): cal Internet.
