# Màquina Ensenyable

Aplicació d'una sola pàgina (tot el codi està en `index.html`) per a entrenar models d'IA directament en el navegador del mòbil, com Teachable Machine, però sense necessitat de cap compte de Google ni de Google Drive. Tota la interfície està en valencià.

## Tipus de model

1. **🖼 Imatge**: MobileNet (aprenentatge per transferència) + cap classificador propi. Es poden fer fotos amb la càmera o pujar-ne de la galeria.
2. **🎤 Àudio**: llibreria `speech-commands` de Google (la mateixa que fa servir per sota Teachable Machine). Cada mostra es grava en viu (1 segon) i l'entrenament usa les mostres recollides. Una de les classes es pot marcar com a **soroll de fons**, que és l'etiqueta que espera la llibreria.
3. **🕺 Postura**: PoseNet + cap classificador sobre els 17 punts del cos. Les coordenades són les mateixes en capturar i en provar (sense mirall), així que esquerra i dreta es tracten igual en les dues fases.
4. **🤚 Mans**: MediaPipe Hands + cap classificador sobre els 21 punts de la mà. No existix en Teachable Machine; s'ha afegit perquè és un control natural per a robots i micro:bit.

Durant la captura de postura i de mans es dibuixa en viu l'esquelet o la mà detectada, per a saber si el model reconeix bé abans de guardar la mostra.

## Pestanyes

**Dades** (classes i mostres), **Entrenar** (èpoques, taxa d'aprenentatge i mida del lot), **Provar**, **Exportar** i **Guardar**. El botó ❓ de la capçalera obri l'**Ajuda**.

## Guardar i exportar

- **Fitxer local (`.mia.json`)**: descarregar, compartir (Web Share: WhatsApp, AirDrop, Drive, correu…) o carregar un fitxer anterior. No cal cap compte.
- **Exportar el model entrenat**: TensorFlow.js, Keras/Python o TF Lite (de moment exporta TF.js; la conversió a TFLite requerix un servidor).
- Canviar de tipus de model, esborrar una classe o buidar-ne les mostres demana confirmació, perquè s'esborren les dades.

## Limitacions conegudes

- Les mostres d'àudio no es guarden en el `.mia.json` (viuen dins del reconeixedor); sí es guarda el model entrenat. Recuperar un model d'àudio des d'un fitxer és experimental: si la predicció no funciona bé, torna a gravar les mostres i entrena de nou.
- Cal connexió a Internet només per a descarregar els models base (MobileNet, PoseNet, àudio i mans), la primera vegada que s'usa cada tipus després d'obrir l'aplicació. Una vegada descarregats, la càmera i el micròfon es processen en el dispositiu i es pot llevar el Wi-Fi i les dades mòbils (també es pot usar el mode avió, perquè esta aplicació no usa Bluetooth). No hi ha mode sense connexió: si es recarrega la pàgina sense Internet, no s'obri. L'aplicació avisa en canviar a un tipus de model que encara no s'ha descarregat i mostra un error clar si la descàrrega falla.
- Esta aplicació no envia dades a la micro:bit; per a això, vegeu Teachable Microbit.
