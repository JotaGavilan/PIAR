# JScroll – Què saben de tu quan fas scroll

App de PIAR que simula una **xarxa social tipus TikTok/Instagram** (scroll vertical amb ~50 fotos i vídeos). L'alumnat només fa scroll; l'app mesura **què fan els seus dits** i en deduïx un **perfil d'interessos**, per a treballar com els algoritmes ens perfilen. Pensada per a **14–18 anys**. Tot es calcula i es guarda al dispositiu: **no hi ha comptes, servidor, càmera ni micròfon**.

## Com funciona

1. L'alumne tria 3 temes dels 12 (música, videojocs, esport, moda, humor, animals, menjar, viatges, ciència, art, cotxes, cinema). Opcional.
2. Fa scroll per N publicacions (20–60; 50 per defecte). Mesures per publicació: **temps**, **zoom** (pessic, botó 🔍, Ctrl+roda), **repeticions** de vídeo, **pausa**, **salt ràpid** (< 0,8 s), **«m'agrada»** i **guardar**.
3. **Feed en dues fases**: ≈ 40 % equilibrat (tots els temes per igual) i la resta **adaptatiu** (més del que més has mirat, 20 % d'exploració): efecte bombolla. Es pot desactivar.
4. **Resultats**: ranking amb percentatges, «el que vaig dir vs el que vaig fer», anuncis fictius amb «per què veus este anunci?», mapa d'atenció, efecte bombolla, números, «com es calcula?» i targeta descarregable (PNG).

Puntuació per publicació (`js/core.js`, pesos a `W`): temps fins a +1,0 · zoom fins a +0,6 · repetició +0,2 (màx. 3) · pausa fins a +0,2 · salt ràpid −0,4 · m'agrada +0,5 · guardar +0,7. El perfil és la **mitjana per tema**, convertida en percentatge. Mínim 8 publicacions vistes.

## Fitxers

| Fitxer | Contingut |
|---|---|
| `index.html`, `css/style.css` | Interfície (inici, feed, resultats, configuració, ajuda) |
| `js/core.js` | Lògica pura, sense DOM: puntuació, planificador del feed, resum (es prova amb node) |
| `js/script.js` | Feed, mesura de senyals, gestos, resultats, targeta PNG |
| `js/i18n.js` | Textos ca/es/en (claus `js.*`) |
| `media/` | Fotos (`.webp`), vídeos (`.mp4`), `feed.json` (catàleg) i `captions.json` |
| `guia.html`, `guia-img/` | Guia del professorat (seqüència didàctica, debat, ètica, importar mitjans) |

## Contingut d'exemple i com posar el teu

El catàleg inclou **72 publicacions generades** (6 per tema: 4 fotos 1080×1920 + 2 vídeos de 6 s en bucle, sense persones reals). Per a posar-hi les teues:

```
python3 tools/jscroll-media.py LA-MEUA-CARPETA [--clean]
python3 tools/build-pwa.py
```

`LA-MEUA-CARPETA` ha de tindre una subcarpeta per tema (`music`, `gaming`, `sport`, `fashion`, `humor`, `animals`, `food`, `travel`, `science`, `art`, `cars`, `cinema`). Cal Python 3, Pillow i ffmpeg/ffprobe. Mínim 6 publicacions per tema (millor 8+). Usa material propi o amb llicència lliure.

## Configuració del professorat (⚙️)

Publicacions (20–60) · límit de temps (0–20 min) · adaptació del feed (sí/no) · mostrar mesuraments en directe (demostracions) · esborrar dades. Es guarda a `localStorage` (`jscroll.cfg`); l'últim perfil a `jscroll.last`.

## Sense Internet

Les pàgines i tot `media/` entren a la memòria del service worker. Els vídeos es demanen per trossos (*Range*): el service worker els serveix des de la memòria (`rangeFromCache` a `sw.js`).

## Proves

`js/core.js` s'ha provat amb 23 comprovacions (planificador, puntuació, resum) i la interfície amb Playwright (scroll tàctil real, pessic multitàctil per CDP, zoom, like, doble toc, pausa, repeticions, límit de temps, resultats en 3 idiomes, targeta PNG, esborrat). No s'han pogut comprovar en mòbils reals ni amb alumnat.
