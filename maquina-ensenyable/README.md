# Màquina Ensenyable - Notes

Aquest projecte és una aplicació monolítica (tot-en-un) amb el codi inline, pensada com un "Teachable Machine" propi que funciona en qualsevol navegador mòbil, sense necessitat de compte de Google ni de Google Drive.

## Tipus de model disponibles

1. **🖼 Imatge** — MobileNet (transfer learning) + cap classificadora pròpia.
2. **🎤 Audio** — llibreria `speech-commands` de Google (la mateixa que fa servir per sota Teachable Machine), amb aprenentatge per transferència en viu: cada mostra es grava i s'analitza a l'instant (`collectExample`), i `train()` entrena la cap classificadora amb els exemples recollits.
3. **🕺 Pose** — PoseNet + cap classificadora pròpia sobre els keypoints normalitzats.
4. **🤚 Mans** — MediaPipe Hands + cap classificadora pròpia sobre els 21 punts de referència de la mà. No existeix a Teachable Machine original; s'ha afegit perquè és un control natural per a robots/microbit (gestos).

Durant la **captura** de mostres de Pose i Mans es mostra en viu l'esquelet/mà detectada sobre la vista de la càmera, perquè l'usuari sàpiga si el model està reconeixent bé la postura abans de guardar la mostra.

## Guardar / exportar

- **Fitxer local (`.mia.json`)**: descarregar, compartir (Web Share API: WhatsApp, AirDrop, Drive, correu…) o carregar un fitxer previ. No requereix cap compte.
- **Exportar model entrenat**: TensorFlow.js, Keras/Python o TF Lite (instruccions), igual que a Teachable Machine.
- Ja **no hi ha integració amb Google Drive/Sign-In** (eliminada deliberadament perquè l'app no depenga de cap compte).

## Limitacions conegudes

- La reconstrucció d'un model d'àudio carregat des d'un `.mia.json` antic és "best effort": la llibreria `speech-commands` no documenta públicament com reencastar pesos guardats en un reconeixedor de transferència nou. Si després de carregar un projecte d'àudio la predicció no funciona bé, la solució fiable és tornar a grabar les mostres i reentrenar.
- Esborrar una classe o una mostra d'àudio individualment demana al navegador que elimine eixe exemple intern del reconeixedor; si açò falla per qualsevol motiu, es recomana revisar el nombre de mostres abans d'entrenar.
