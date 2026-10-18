# JScroll – Què saben de tu quan fas scroll

App de PIAR que simula una **xarxa social tipus TikTok/Instagram** (scroll vertical amb ~50 il·lustracions i vídeos animats). L'alumnat només fa scroll; l'app mesura **què fan els seus dits** i en deduïx un **perfil d'interessos**, per a treballar com els algoritmes ens perfilen. Pensada per a **14–18 anys**. Tot es calcula i es guarda al dispositiu: **no hi ha comptes, servidor, càmera ni micròfon**.

## Com funciona

1. L'alumne tria 3 temes dels 12 (música, videojocs, esport, moda, humor, animals, menjar, viatges, ciència, art, cotxes, cinema). Opcional.
2. Fa scroll per N publicacions (20–60; 50 per defecte). Mesures per publicació: **temps**, **zoom** (pessic, botó 🔍, Ctrl+roda), **repeticions** de vídeo, **pausa**, **salt ràpid** (< 0,8 s), **«m'agrada»** i **guardar**.
3. **Feed en dues fases**: ≈ 40 % equilibrat (tots els temes per igual) i la resta **adaptatiu** (més del que més has mirat, 20 % d'exploració): efecte bombolla. Es pot desactivar.
4. **Simulador de diners** (💸): estima quant guanya una plataforma amb la teua atenció (CPM × anuncis per segon i ingressos per menor), amb taula d'1 s a 1 any, projecció a la classe, el ritme de Meta al món i les fonts. Targeta pròpia als resultats i comptador opcional en directe al feed.
5. **Resultats**: ranking amb percentatges, «el que vaig dir vs el que vaig fer», anuncis fictius amb «per què veus este anunci?», mapa d'atenció, efecte bombolla, números, «com es calcula?» i targeta descarregable (PNG).

### Model del simulador de diners (`js/core.js`, bloc MONEY)

Totes les xifres són **estimacions d'ordre de magnitud**. Mètode 1: `CPM del mercat ÷ 1000 × anuncis per segon` (hipòtesi per defecte: 1 anunci cada 5 publicacions, 15 s per publicació; editable). Mètode 2: ingressos publicitaris de menors als EUA el 2022 (Harvard, PLOS ONE 2023) ÷ usuaris ÷ segons d'ús a l'any (Qustodio 2025, Espanya), escalat pel CPM mitjà del mercat respecte al dels EUA. L'estimació és la mitjana i la forquilla va del mínim al màxim. Referències: Meta T2 2026 ≈ 6.561 €/s (ingressos publicitaris 59,36 mil milions de $ en 91 dies, canvi 0,869) i SMI 2026 = 40,70 €/dia. Les fonts amb enllaços són a la llista `SRC` de `js/script.js` i a «Com es calcula» dins del simulador. Cal revisar-les cada curs.

Puntuació per publicació (`js/core.js`, pesos a `W`): temps fins a +1,0 · zoom fins a +0,6 · repetició +0,2 (màx. 3) · pausa fins a +0,2 · salt ràpid −0,4 · m'agrada +0,5 · guardar +0,7. El perfil és la **mitjana per tema**, convertida en percentatge. Mínim 8 publicacions vistes.

## Fitxers

| Fitxer | Contingut |
|---|---|
| `index.html`, `css/style.css` | Interfície (inici, feed, resultats, simulador de diners, configuració, ajuda) |
| `js/core.js` | Lògica pura, sense DOM: puntuació, planificador del feed, resum i model de diners (es prova amb node) |
| `js/script.js` | Feed, mesura de senyals, gestos, resultats, targeta PNG |
| `js/i18n.js` | Textos ca/es/en (claus `js.*`) |
| `media/` | Il·lustracions (`.webp`), vídeos (`.mp4`), `feed.json` (catàleg) i `captions.json` |
| `guia.html`, `guia-img/` | Guia del professorat (seqüència didàctica, debat, ètica, importar mitjans) |

## Contingut d'exemple i com posar el teu

El catàleg inclou **72 publicacions** (6 per tema: 4 il·lustracions fixes 1080×1920 + 2 vídeos animats de 8 s en bucle perfecte, 720×1280, sense so, sense persones reals ni marques), **dibuixades amb Canvas 2D** per a este projecte (≈ 14 MB). No s'han usat bancs de vídeos. El generador és a `tools/jscroll-scenes/` (vegeu el seu `README.md`; `node tools/jscroll-scenes/build.js`, Playwright + ffmpeg + Pillow). Per a posar-hi fotos i vídeos reals:

```
python3 tools/jscroll-media.py LA-MEUA-CARPETA [--clean]
python3 tools/build-pwa.py
```

`LA-MEUA-CARPETA` ha de tindre una subcarpeta per tema (`music`, `gaming`, `sport`, `fashion`, `humor`, `animals`, `food`, `travel`, `science`, `art`, `cars`, `cinema`). Cal Python 3, Pillow i ffmpeg/ffprobe. Mínim 6 publicacions per tema (millor 8+). Usa material propi o amb llicència lliure.

## Configuració del professorat (⚙️)

Publicacions (20–60) · límit de temps (0–20 min) · adaptació del feed (sí/no) · mostrar mesuraments en directe (demostracions) · mostrar els diners en directe (💸, apagat per defecte) · esborrar dades. Es guarda a `localStorage` (`jscroll.cfg`); l'últim perfil a `jscroll.last`.

## Sense Internet

Les pàgines i tot `media/` entren a la memòria del service worker. Els vídeos es demanen per trossos (*Range*): el service worker els serveix des de la memòria (`rangeFromCache` a `sw.js`).

## Proves

`js/core.js` s'ha provat amb comprovacions de planificador, puntuació, resum i model de diners (monotonia, forquilla, projeccions) i la interfície amb Playwright (scroll tàctil real, pessic multitàctil per CDP, zoom, like, doble toc, pausa, repeticions, límit de temps, resultats en 3 idiomes, targeta PNG, simulador de diners, esborrat). No s'han pogut comprovar en mòbils reals ni amb alumnat.
