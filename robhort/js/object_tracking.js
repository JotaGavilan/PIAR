/**
 * P.I.A.R III - Object Tracking Logic
 * Sustituye a video_facial_tracking.js para detectar personas y animales.
 */

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const labelEl = document.getElementById('label'); // Asegúrate de tener este ID en el panel de datos del HTML
const scoreEl = document.getElementById('score'); // Asegúrate de tener este ID en el panel de datos del HTML

let model;
let ultimoEnvio = 0;
const INTERVALO_ENVIO = 1000; // 1 segundo para optimizar en gama baja

// Lista de objetivos compatibles con COCO-SSD
const objetivosValidos = [
  "person", "dog", "cat", "bird", "horse", 
  "sheep", "cow", "elephant", "bear", "zebra", "giraffe"
];

/**
 * Inicializa el modelo y la cámara
 */
async function initIA() {
  try {
    statusEl.textContent = "⏳ Carregant IA (COCO-SSD)...";
    // Carga el modelo de detección de objetos
    model = await cocoSsd.load();
    statusEl.textContent = "📷 Iniciant càmera trasera...";
    await startCamera();
  } catch (error) {
    console.error("Error en la inicialización:", error);
    statusEl.textContent = "❌ Error al carregar la IA";
  }
}

/**
 * Configura el acceso a la cámara trasera
 */
async function startCamera() {
  try {
    // Usamos 'environment' para ver lo que hay frente al móvil
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 640 }, // Resolución moderada para ahorrar CPU
        height: { ideal: 480 }
      } 
    });
    
    video.srcObject = stream;
    
    await new Promise(r => video.onloadedmetadata = r);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Iniciamos el bucle de detección
    detectFrame();
  } catch (e) {
    console.error("❌ Error al iniciar la cámara:", e);
    statusEl.textContent = "❌ Error de càmera";
  }
}

/**
 * Bucle de detección y procesado de imagen
 */
async function detectFrame() {
  // Realiza la detección en el frame actual
  const predictions = await model.detect(video);
  
  // Limpia el canvas y dibuja la imagen actual del video
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let detectadoEnEsteFrame = false;

  predictions.forEach(p => {
    // Filtramos solo si es persona o animal y tiene buena confianza (>50%)
    if (objetivosValidos.includes(p.class) && p.score > 0.5) {
      detectadoEnEsteFrame = true;
      const score = Math.round(p.score * 100);
      
      // Dibujar caja de detección verde
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 4;
      ctx.strokeRect(p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]);
      
      // Estilo del texto
      ctx.fillStyle = "#00FF00";
      ctx.font = "18px Arial";
      ctx.fillText(`${p.class} (${score}%)`, p.bbox[0], p.bbox[1] > 20 ? p.bbox[1] - 10 : 20);

      // Gestión de envío de datos vía Bluetooth UART
      const ahora = Date.now();
      // Solo enviamos si ha pasado 1 segundo desde el último envío exitoso
      if (ahora - ultimoEnvio > INTERVALO_ENVIO) {
        // Formato: "animal:porcentaje" (Ej: "dog:85")
        const mensaje = `${p.class}:${score}`;
        
        // Llamada a la función global en bluetooth_uart.js
        sendUARTData(mensaje); 
        
        // Actualizamos marcas de tiempo y UI
        ultimoEnvio = ahora;
        if(labelEl) labelEl.textContent = p.class;
        if(scoreEl) scoreEl.textContent = score;
      }
    }
  });

  // Si no hay nada en pantalla, limpiamos los indicadores
  if (!detectadoEnEsteFrame) {
    if(labelEl) labelEl.textContent = "--";
    if(scoreEl) scoreEl.textContent = "--";
  }

  // Mantenemos el bucle infinito
  requestAnimationFrame(detectFrame);
}

// Arrancar la aplicación
initIA();