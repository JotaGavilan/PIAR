# P.I.A.R II. Cap amb IA

🎥 Aplicació web per a la detecció facial en temps real mitjançant **intel·ligència artificial** i enviament de dades a una **micro:bit** per Bluetooth.

---

## 🔍 Què fa esta aplicació?

- Detecta la **posició del cap** (gir horitzontal)
- Mesura l’**obertura de la boca**
- Detecta si els **ulls estan oberts o tancats**
- Envia tota esta informació a una **micro:bit via Bluetooth** (sense emparellament)
- Funciona totalment **en local**, sense enviar dades a cap servidor

---

## ⚙️ Tecnologies emprades

- 🧠 [MediaPipe FaceMesh (Google)](https://ai.google.dev/edge/mediapipe/solutions/vision/face_mesh) per detectar punts de la cara
- 🎥 WebRTC + JavaScript per accedir a la càmera
- 🖼️ HTML5 `<canvas>` per pintar la malla facial
- 📡 Web Bluetooth API per comunicar-se amb la micro:bit
- 💡 CSS per a una interfície mòbil moderna

---

## 🧪 Format de dades enviades per UART

| Dada                | Longitud | Rang     | Exemple |
|---------------------|----------|----------|---------|
| Gir horitzontal cap | 2 dígits | 00 a 99  | `15`    |
| Obertura boca       | 2 dígits | 00 a 99  | `10`    |
| Ull esquerre        | 1 dígit  | 0 o 1    | `1`     |
| Ull dret            | 1 dígit  | 0 o 1    | `0`     |

**Exemple de paquet enviat:** `151010` → cap de cara (15), boca amb obertura 10, ull esquerre obert i ull dret tancat. Quan la cara desapareix de la imatge s'envia `0` una sola vegada.

---

## 📲 Instruccions d’ús

1. Accedeix a la web des del navegador (millor Chrome)
2. Dona permís per usar la càmera
3. Prem **🔵 Connectar Bluetooth** per a buscar la micro:bit
4. Prem **⚙️ Configurar** per a canviar l'interval d'enviament
5. Prem **ℹ️ Ajuda** per a conéixer els detalls tècnics

> Cal connexió a Internet només en obrir l'aplicació, per a descarregar les llibreries i el model de detecció facial. Quan es veu «Càmera llesta», es pot llevar el Wi-Fi i les dades mòbils: la càmera es processa en local. No actives el mode avió (o torna a activar el Bluetooth després), perquè la micro:bit es connecta per Bluetooth. No hi ha mode sense connexió: si es recarrega la pàgina sense Internet, no s'obri.

---

## 🛡️ Privacitat

Esta aplicació **no envia cap imatge ni dada de la càmera a cap servidor**. Només descarrega les llibreries i el model; tot el processament es fa en local al teu dispositiu.

---

## 🎓 Crèdits

- Projecte desenvolupat a l’IES Jorge Juan (Alacant, 2025)
- Inspirat en: [cardboard.lofirobot.com](https://cardboard.lofirobot.com)
- Fet per **Jose** amb ❤️ i tecnologia IA

---

## 📂 Fitxers principals

- `index.html` — estructura principal i enllaços
- `style.css` — estils visuals responsius
- `script.js` — detecció facial + Bluetooth + càlcul de dades
