# Escenas de JScroll – guía para quien escriba escenas

## Objetivo
JScroll es una app educativa (14–18 años) que simula una red social tipo TikTok/Instagram. El feed tiene 72 publicaciones (12 temas × 6).
No podemos descargar vídeos de bancos de imágenes (red bloqueada), así que **creamos nosotros** el contenido como *ilustraciones animadas procedurales* dibujadas con Canvas 2D.
El contenido actual (emoji grande sobre un degradado) es **feo y plano**. Tiene que ser lo bastante atractivo como para que un adolescente se detenga a mirarlo: tipo "loop satisfactorio", póster de ilustración vectorial, neón, lo-fi, motion graphics.

## Cómo se escribe una escena
Un fichero `scenes/<tema>.js` (IIFE) que registra escenas en `SCENES[id]`. Ver `scenes/travel.js` (escena `travel-a`, ya aceptada: ese es el nivel mínimo de calidad) y `lib.js` (helpers `L.*`: ruido, ondas de bucle, gradientes, halo, texto, emoji, partículas, estrellas, vignette...).

```js
SCENES['music-a'] = {
  topic: 'music',
  stillT: [.12, .55],              // instante t (0..1) que se usa cuando la escena sale como FOTO, uno por variante
  cap: [ {ca:'…',es:'…',en:'…'}, {ca:'…',es:'…',en:'…'} ],   // un pie por variante (ver "Pies")
  draw(ctx, t, v) { /* dibuja en un lienzo lógico de 1080×1920; t∈[0,1); v = nº de variante (0,1,2…) */ }
};
```

Por cada tema hay **tres escenas**: `<tema>-a`, `<tema>-b` y `<tema>-c`.
* `a` y `b` son **vídeos en bucle de 8 s** (variante 0 → vídeo) y además se usan como **foto** con la variante 1 (otra paleta/composición/instante). **El bucle debe ser perfecto**: t=0 y t=1 idénticos. Todo movimiento debe ser función periódica de t (`L.wave(t,k,fase)` con k entero, `% periodo` con desplazamientos de un nº **entero** de periodos, etc.). Cuidado con velocidades que dan una fracción de ciclo (error típico).
* `c` es **solo foto** (variantes 0 y 1): puede ser una composición estática más detallada; `t` no necesita bucle (usa `stillT`), pero que tenga algún detalle de vida si se dibuja con otro t.
* Cada escena debe tener **al menos 2 variantes realmente distintas** (paleta + composición/objeto, no solo un tono). Usa `v % N` para elegir.

## Dirección de arte (importante)
* Ilustración **plana/vectorial con iluminación**: formas limpias, siluetas fuertes, **un punto focal claro**, degradados atmosféricos, halos (`L.halo`), capas de profundidad, luz de borde. Piensa en pósters, no en clip-art.
* Paletas **limitadas y armoniosas** (3–5 colores + neutros), alto contraste entre figura y fondo. Nada de gris sucio.
* Movimiento suave con *easing*; algo que respire siempre (partículas, parpadeo, balanceo). Evita el movimiento brusco.
* Composición vertical 9:16: zona útil central. **La parte inferior (≈ 330 px) y la superior (≈ 200 px) quedan tapadas por la interfaz de la app** (usuario, pie, botones): pon el interés visual entre y≈250 y y≈1500.
* **Sin texto en ningún idioma concreto.** Solo se admiten tokens universales muy breves (LOL, OMG, XD, ???, !!!, números, 3-2-1, onomatopeyas) y solo si el tema lo pide (humor, cine). Nada de nombres propios.
* **Sin marcas, logotipos, personajes con copyright** (nada de Mario, Pokémon, Nike, Messi, Marvel...). Diseños propios y genéricos. Sin personas reales ni caras de personas (las caras estilizadas tipo emoji u ojos de personaje original están bien).
* Contenido apto para menores. Nada de alcohol, tabaco, armas, violencia.
* El emoji (`L.emoji`) puede usarse como **acento pequeño**, nunca como protagonista.
* No hay que parecerse a una foto; hay que parecer un buen motion-graphic de redes sociales.

## Rendimiento y técnica
* Se renderiza a 720×1280 (vídeo, 192 fotogramas = 8 s a 24 fps) y 1080×1920 (foto). Objetivo: **< 120 ms por fotograma**. Evita `ctx.filter` (blur) y `shadowBlur` grandes (lentos); usa `L.halo`/gradientes radiales.
* `draw` debe ser una **función pura de (t, v)**: no guardes estado entre fotogramas (se renderiza en cualquier orden). Usa `L.rng(semilla)` para aleatoriedad determinista, creada **dentro** de draw con una semilla fija por variante.
* Los patrones de sine-wave con `k` entero y `L.pulse` están pensados para bucles. `L.ridge` es periódica de periodo `P`.
* Para texto/emoji ya están cargadas las fuentes `Bricolage Grotesque`, `Poppins` (700), `Space Mono` (700) y `Noto Color Emoji`.
* La codificación H.264 sufre con ruido de alta frecuencia (grano, miles de puntos diminutos parpadeando): evítalo en vídeo; el grano se añade solo a las fotos al construir.

## Pies (captions)
Cada variante lleva un pie breve (≤ 70 caracteres) con 1 o 2 hashtags, estilo red social adolescente, tono natural, en **valenciano (`ca`, nunca castellanismos), castellano (`es`) e inglés (`en`)**, que describa lo que se ve (si ves una gata, no digas perro). Un emoji como mucho.

## Herramientas (carpeta /home/claude/work/jsscenes)
* `node preview.js ESCENA [variantes=0,1] [tiempos=0,.25,.5,.75]` → hoja de contacto en `sheets/ESCENA.png` (léela con la herramienta Read para **ver** lo que has dibujado). `--full` renderiza a tamaño completo para revisar detalles.
* `node looptest.js ESCENA [variantes]` → comprueba que el bucle es perfecto y estima el tiempo de render.
* Itera: **mira siempre la imagen** tras cada cambio. No des una escena por buena sin haberla visto en ≥ 3 instantes de ≥ 2 variantes. Cuando un frame se vea soso, vacío o confuso, rehazlo.
* **Solo escribe en tu(s) propio(s) `scenes/<tema>.js`** (no toques lib.js ni otros ficheros; si te falta un helper, defínelo localmente en tu fichero).
