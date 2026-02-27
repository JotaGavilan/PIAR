# Màquina Ensenyable - Notes

Aquest projecte és una aplicació monolítica (tot-en-un) amb el codi inline.

## Limitacions conegudes:

1. **Mode Audio**: El mode d'entrenament d'audio pot no funcionar correctament al navegador per restriccions de permisos de micròfon. Es recomana usar Teachable Machine (Google) per a models d'audio.

2. **Mode Postura**: El skeleton (línies del cos) no es mostra durant l'entrenament. El model detecta postures però no dibuixa l'esquelet visual.

## Alternatives:

- Per a models d'audio i postura amb millor suport, usa **Teachable Microbit** que integra els models oficials de Teachable Machine de Google.

- Per a entrenament visual d'imatges, **Màquina Ensenyable** funciona correctament.

## Modificacions futures:

Per afegir visualització del skeleton o arreglar l'audio, cal:
1. Externalitzar el JavaScript inline (~1500 línies)
2. Modularitzar les funcions de captura
3. Afegir renderització de PoseNet
