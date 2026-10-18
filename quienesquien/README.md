# Qui és qui neuronal

App de PIAR per a **3r–4t d'ESO** (sessió de 50 minuts) que explica com funciona una xarxa neuronal amb el joc del «Qui és qui»: **pesos, biaix, error i entrenament**. Tot es calcula al dispositiu (sense servidor, càmera ni micròfon). Funciona sense connexió i en ca-ES-valencia / es / en.

## Dos nivells

**Bàsic** (6 personatges × 4 trets: ulleres, barret, barba, somriu; punts enters)
1. *Joc*: Qui és qui clàssic amb ajuda opcional («la pregunta que reparteix millor»).
2. *Un detector*: es posen punts +/− (−6 a +6) a cada tret i es veu qui guanya.
3. *La xarxa aprén*: una fila de punts per personatge; quan s'equivoca, puja un punt al correcte i en baixa un al que ha colat. Botons «Ensenya-li una cara», «Entrenar sola» i dades d'entrenament («Sense els d'ulleres»…).

**Avançat** (12 personatges × 6 trets)
1. *Tauler*: el joc amb 12 personatges.
2. *Una neurona*: sliders de pesos (±6) i biaix (±15), «Que aprenga sola».
3. *La xarxa*: capa oculta de 2 a 8 neurones, eixida softmax, entrenament amb Adam; diagrama amb línies blaves (a favor) i taronges (en contra), gràfica d'error, cara de prova i dades d'entrenament.

La **guia del professorat** (pla de 50 min, correspondències joc ↔ xarxa, què hauria de passar, preguntes de tancament, versió sense pantalles, límits de l'analogia, glossari) està dins de l'app, en la pestanya final de cada nivell.

## Fitxers

| Fitxer | Contingut |
|---|---|
| `index.html`, `css/style.css` | Interfície (aspecte propi: blau = a favor, taronja = en contra; mode clar/fosc automàtic) |
| `js/core.js` | Motor sense DOM (`window.QQ`, també `module.exports` per a node): personatges, perceptró bàsic, neurona logística, xarxa 6→H→12 |
| `js/script.js` | Interfície i pestanyes |
| `js/i18n.js` | Textos ca/es/en (claus `qq.*`), inclosa la guia |
| `fonts/` | Bricolage Grotesque, Atkinson Hyperlegible i DM Mono en local (SIL OFL) |

## Proves

El motor es pot provar amb node (`require('./js/core.js')`). Valors de referència mesurats: bàsic, 3000 entrenaments sempre convergeixen (mitjana 27 cares i 13 fallades, màx. 72); «sense gafes» reconeix 3/6; avançat amb 5 ocultes acaba en ≈ 100 èpoques (error < 0,02), amb 3 ≈ 435, amb 8 ≈ 45 i amb 2 triga 1200–2500 i a voltes es queda en 11/12.

Enllaços directes: `#juego`, `#detector`, `#aprende` (bàsic) i `#tablero`, `#neurona`, `#red` (avançat).
