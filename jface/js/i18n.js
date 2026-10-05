// ============================================================
//  i18n.js – Textos de JFace (claus «jf.*»). Valencià = text original.
// ============================================================
PIAR_I18N.add({
  ca: {
    'jf.title': 'JFace – Seguiment facial amb IA',
    'jf.alt.app': 'Icona JFace',
    'jf.alt.icon': 'Icona',

    'jf.data.yaw': 'Gir:',
    'jf.data.mouth': '| Boca:',
    'jf.data.eyel': '| Ull E:',
    'jf.data.eyer': '| Ull D:',

    'jf.btn.config': '⚙️ Configurar',
    'jf.btn.help': 'ℹ️ Ajuda',
    'jf.close': 'Tancar',

    'jf.status.starting': '⏳ Iniciant càmera...',
    'jf.status.ready': '✅ Càmera llesta · Ja no cal Internet',
    'jf.status.cam_denied': '❌ Has denegat l\'accés a la càmera. Permet-lo en el navegador i recarrega la pàgina.',
    'jf.status.cam_fail': '❌ No s\'ha pogut accedir a la càmera.',
    'jf.status.reload': 'Recarrega la pàgina.',
    'jf.what.model': 'el model de detecció facial',

    'jf.loading.msg': 'Carregant càmera i IA facial...',
    'jf.loading.det': 'Descarregant MediaPipe Face Mesh',
    'jf.loading.slow': 'Encara descarregant…',
    'jf.loading.slow_det': 'Si tarda massa, comprova que tens connexió a Internet.',

    'jf.cfg.title': '⚙️ Configuració',
    'jf.cfg.send': 'Enviament de dades',
    'jf.cfg.interval': 'Interval d\'enviament:',
    'jf.cfg.note': 'Cada quants segons s\'envien les dades a la micro:bit per Bluetooth. Valors baixos (0,1–0,3 s) donen més fluïdesa però consumixen més bateria.',

    'jf.help.p1': '<strong>JFace</strong> utilitza <a href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker" target="_blank">MediaPipe Face Mesh</a> de Google per a detectar la posició del cap, l\'obertura de la boca i l\'estat dels ulls en temps real, i envia estes dades a una micro:bit per Bluetooth.',
    'jf.help.guide': '📖 Guia completa pas a pas',
    'jf.help.format': '<strong>Format de dades enviades (6 dígits):</strong>',
    'jf.help.f1': '<strong>2 dígits:</strong> gir horitzontal del cap (00 a 99). Amb el cap de cara el valor ronda 15, i canvia en girar-lo cap a un costat o cap a l\'altre.',
    'jf.help.f2': '<strong>2 dígits:</strong> obertura de la boca (00 a 99). 00 és boca tancada; com més oberta, més gran és el valor.',
    'jf.help.f3': '<strong>1 dígit:</strong> ull esquerre (0 = tancat, 1 = obert)',
    'jf.help.f4': '<strong>1 dígit:</strong> ull dret (0 = tancat, 1 = obert)',
    'jf.help.example': '<strong>Exemple:</strong> <code>151010</code> → cap de cara (15), boca amb obertura 10, ull esquerre obert i ull dret tancat.',
    'jf.help.lost': 'Quan la cara desapareix de la imatge, s\'envia <code>0</code> una sola vegada. Tot el processament es fa localment al navegador, sense enviar cap dada a Internet.',
    'jf.help.net_title': '<strong>Internet i mode avió:</strong>',
    'jf.help.net1': 'Cal Internet <strong>només la primera vegada</strong> que obris l\'app (descarrega les llibreries i el model de detecció facial). Si has instal·lat PIAR i has fet «📥 Ús sense Internet» a la portada, ja no cal mai.',
    'jf.help.net2': 'Quan veges «Càmera llesta», pots llevar el Wi-Fi i les dades mòbils: la càmera es processa en el dispositiu i no s\'envia res a cap servidor.',
    'jf.help.net3': '<strong>No actives el mode avió</strong> (o torna a activar el Bluetooth després), perquè la micro:bit es connecta per Bluetooth.',
    'jf.help.net4': 'Sense Internet, l\'app només s\'obri si ja l\'has instal·lat o usat abans amb connexió, i només funcionen els models ja descarregats. Des de la portada, «📥 Ús sense Internet» els descarrega tots.',
    'jf.help.footer': 'Projecte inspirat en <a href="https://cardboard.lofirobot.com" target="_blank">cardboard.lofirobot.com</a><br>Fet per Jose L. Gavilán amb ❤️ i IA<br>IES Jorge Juan, Alacant, 2026'
  },
  es: {
    'jf.title': 'JFace – Seguimiento facial con IA',
    'jf.alt.app': 'Icono de JFace',
    'jf.alt.icon': 'Icono',

    'jf.data.yaw': 'Giro:',
    'jf.data.mouth': '| Boca:',
    'jf.data.eyel': '| Ojo I:',
    'jf.data.eyer': '| Ojo D:',

    'jf.btn.config': '⚙️ Configurar',
    'jf.btn.help': 'ℹ️ Ayuda',
    'jf.close': 'Cerrar',

    'jf.status.starting': '⏳ Iniciando cámara...',
    'jf.status.ready': '✅ Cámara lista · Ya no hace falta Internet',
    'jf.status.cam_denied': '❌ Has denegado el acceso a la cámara. Permítelo en el navegador y recarga la página.',
    'jf.status.cam_fail': '❌ No se ha podido acceder a la cámara.',
    'jf.status.reload': 'Recarga la página.',
    'jf.what.model': 'el modelo de detección facial',

    'jf.loading.msg': 'Cargando cámara e IA facial...',
    'jf.loading.det': 'Descargando MediaPipe Face Mesh',
    'jf.loading.slow': 'Todavía descargando…',
    'jf.loading.slow_det': 'Si tarda demasiado, comprueba que tienes conexión a Internet.',

    'jf.cfg.title': '⚙️ Configuración',
    'jf.cfg.send': 'Envío de datos',
    'jf.cfg.interval': 'Intervalo de envío:',
    'jf.cfg.note': 'Cada cuántos segundos se envían los datos a la micro:bit por Bluetooth. Los valores bajos (0,1–0,3 s) dan más fluidez pero consumen más batería.',

    'jf.help.p1': '<strong>JFace</strong> utiliza <a href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker" target="_blank">MediaPipe Face Mesh</a> de Google para detectar la posición de la cabeza, la apertura de la boca y el estado de los ojos en tiempo real, y envía estos datos a una micro:bit por Bluetooth.',
    'jf.help.guide': '📖 Guía completa paso a paso (en valenciano)',
    'jf.help.format': '<strong>Formato de los datos enviados (6 dígitos):</strong>',
    'jf.help.f1': '<strong>2 dígitos:</strong> giro horizontal de la cabeza (00 a 99). Con la cabeza de frente el valor ronda 15, y cambia al girarla hacia un lado o hacia el otro.',
    'jf.help.f2': '<strong>2 dígitos:</strong> apertura de la boca (00 a 99). 00 es boca cerrada; cuanto más abierta, mayor es el valor.',
    'jf.help.f3': '<strong>1 dígito:</strong> ojo izquierdo (0 = cerrado, 1 = abierto)',
    'jf.help.f4': '<strong>1 dígito:</strong> ojo derecho (0 = cerrado, 1 = abierto)',
    'jf.help.example': '<strong>Ejemplo:</strong> <code>151010</code> → cabeza de frente (15), boca con apertura 10, ojo izquierdo abierto y ojo derecho cerrado.',
    'jf.help.lost': 'Cuando la cara desaparece de la imagen, se envía <code>0</code> una sola vez. Todo el procesamiento se hace localmente en el navegador, sin enviar ningún dato a Internet.',
    'jf.help.net_title': '<strong>Internet y modo avión:</strong>',
    'jf.help.net1': 'Hace falta Internet <strong>solo la primera vez</strong> que abres la app (descarga las bibliotecas y el modelo de detección facial). Si has instalado PIAR y has pulsado «📥 Uso sin Internet» en la portada, ya no hace falta nunca.',
    'jf.help.net2': 'Cuando veas «Cámara lista», puedes quitar el Wi-Fi y los datos móviles: la cámara se procesa en el dispositivo y no se envía nada a ningún servidor.',
    'jf.help.net3': '<strong>No actives el modo avión</strong> (o vuelve a activar el Bluetooth después), porque la micro:bit se conecta por Bluetooth.',
    'jf.help.net4': 'Sin Internet, la app solo se abre si ya la has instalado o usado antes con conexión, y solo funcionan los modelos ya descargados. Desde la portada, «📥 Uso sin Internet» los descarga todos.',
    'jf.help.footer': 'Proyecto inspirado en <a href="https://cardboard.lofirobot.com" target="_blank">cardboard.lofirobot.com</a><br>Hecho por Jose L. Gavilán con ❤️ e IA<br>IES Jorge Juan, Alicante, 2026'
  },
  en: {
    'jf.title': 'JFace – Face tracking with AI',
    'jf.alt.app': 'JFace icon',
    'jf.alt.icon': 'Icon',

    'jf.data.yaw': 'Head turn:',
    'jf.data.mouth': '| Mouth:',
    'jf.data.eyel': '| Left eye:',
    'jf.data.eyer': '| Right eye:',

    'jf.btn.config': '⚙️ Settings',
    'jf.btn.help': 'ℹ️ Help',
    'jf.close': 'Close',

    'jf.status.starting': '⏳ Starting camera...',
    'jf.status.ready': '✅ Camera ready · Internet is no longer needed',
    'jf.status.cam_denied': '❌ You have denied access to the camera. Allow it in the browser and reload the page.',
    'jf.status.cam_fail': '❌ Could not access the camera.',
    'jf.status.reload': 'Reload the page.',
    'jf.what.model': 'the facial detection model',

    'jf.loading.msg': 'Loading camera and facial AI...',
    'jf.loading.det': 'Downloading MediaPipe Face Mesh',
    'jf.loading.slow': 'Still downloading…',
    'jf.loading.slow_det': 'If it takes too long, check that you have an Internet connection.',

    'jf.cfg.title': '⚙️ Settings',
    'jf.cfg.send': 'Sending data',
    'jf.cfg.interval': 'Sending interval:',
    'jf.cfg.note': 'How many seconds pass between each time data is sent to the micro:bit over Bluetooth. Low values (0.1–0.3 s) feel smoother but use more battery.',

    'jf.help.p1': '<strong>JFace</strong> uses Google\'s <a href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker" target="_blank">MediaPipe Face Mesh</a> to detect the position of the head, how open the mouth is and the state of the eyes in real time, and sends this data to a micro:bit over Bluetooth.',
    'jf.help.guide': '📖 Complete step-by-step guide (in Valencian)',
    'jf.help.format': '<strong>Format of the data sent (6 digits):</strong>',
    'jf.help.f1': '<strong>2 digits:</strong> horizontal head turn (00 to 99). With the head facing forward the value is around 15, and it changes as you turn it to one side or the other.',
    'jf.help.f2': '<strong>2 digits:</strong> mouth opening (00 to 99). 00 means mouth closed; the more open it is, the higher the value.',
    'jf.help.f3': '<strong>1 digit:</strong> left eye (0 = closed, 1 = open)',
    'jf.help.f4': '<strong>1 digit:</strong> right eye (0 = closed, 1 = open)',
    'jf.help.example': '<strong>Example:</strong> <code>151010</code> → head facing forward (15), mouth opening 10, left eye open and right eye closed.',
    'jf.help.lost': 'When the face disappears from the image, <code>0</code> is sent just once. All the processing is done locally in the browser, without sending any data to the Internet.',
    'jf.help.net_title': '<strong>Internet and airplane mode:</strong>',
    'jf.help.net1': 'Internet is needed <strong>only the first time</strong> you open the app (it downloads the libraries and the facial detection model). If you have installed PIAR and tapped «📥 Use without Internet» on the home page, you never need it again.',
    'jf.help.net2': 'When you see «Camera ready», you can turn off Wi-Fi and mobile data: the camera is processed on the device and nothing is sent to any server.',
    'jf.help.net3': '<strong>Do not turn on airplane mode</strong> (or turn Bluetooth back on afterwards), because the micro:bit connects over Bluetooth.',
    'jf.help.net4': 'Without Internet, the app only opens if you have already installed it or used it before with a connection, and only the models already downloaded work. From the home page, «📥 Use without Internet» downloads them all.',
    'jf.help.footer': 'Project inspired by <a href="https://cardboard.lofirobot.com" target="_blank">cardboard.lofirobot.com</a><br>Made by Jose L. Gavilán with ❤️ and AI<br>IES Jorge Juan, Alicante, 2026'
  }
});
