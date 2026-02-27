# P.I.A.R II. Cap amb IA

🎥 Aplicació web per a la detecció facial en temps real mitjançant **intel·ligència artificial** i enviament de dades a una **micro:bit** per Bluetooth.

---

## 🔍 Què fa aquesta aplicació?

- Detecta la **posició del cap** (gir horitzontal)
- Mesura l’**obertura de la boca**
- Detecta si els **ulls estan oberts o tancats**
- Envia tota aquesta informació a una **micro:bit via Bluetooth** (sense emparellament)
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
| Gir horitzontal cap | 2 dígits | 00 a 99  | `73`    |
| Obertura boca       | 2 dígits | 00 a 99  | `10`    |
| Ull esquerre        | 1 dígit  | 0 o 1    | `1`     |
| Ull dret            | 1 dígit  | 0 o 1    | `0`     |

**Exemple de paquet enviat:** `731010` → Cap girat 73, boca oberta 10, ull esquerre obert, dret tancat.

---

## 📲 Instruccions d’ús

1. Accedeix a la web des del navegador (millor Chrome)
2. Dona permís per usar la càmera
3. Prem **🔵 Connectar** per buscar la micro:bit
4. Prem **⛶ Pantalla completa** si vols millor experiència
5. Prem **ℹ️ Informació** per conèixer els detalls tècnics

> L’aplicació també funciona **desconnectada d’internet**: pots activar-la, i després posar el mòbil en mode avió.

---

## 🛡️ Privacitat

Aquesta aplicació **NO envia cap dada a internet**. Tot el processament es fa en local al teu dispositiu.

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
