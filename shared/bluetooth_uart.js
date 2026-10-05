// ============================================================
//  bluetooth_uart.js  –  Connexió Bluetooth amb micro:bit via UART
//  Mateix protocol que jFace. No cal modificar per canviar categoria.
// ============================================================

const UART_SERVICE_UUID      = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_CHARACTERISTIC = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_CHARACTERISTIC = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let uBitDevice       = null;
let rxCharacteristic = null;
let uart             = null;
let queue            = Promise.resolve();
let isConnected      = false;

// Callback que script.js pot registrar per rebre canvis d'estat
let onStatusChangeCallback = null;

function queueGattOperation(operation) {
  queue = queue.then(operation, operation);
  return queue;
}

// Escriu un missatge d'estat sense esborrar l'indicador del dispositiu
// (#device-indicator): si existix un <span id="status-text"> s'hi escriu allà.
function setStatusText(msg) {
  const el = document.getElementById('status-text') || document.getElementById('status');
  if (el) el.textContent = msg;
}

function onBTStatusChange(cb) {
  onStatusChangeCallback = cb;
}

function notifyStatus(connected, message) {
  isConnected = connected;
  
  // Actualitzar classe del botó de connexió
  const connectBtn = document.getElementById('connectBtn');
  if (connectBtn) {
    if (connected) {
      connectBtn.classList.add('connected');
      connectBtn.textContent = 'Bluetooth connectat';   // el ✓ el posa el CSS (.connected::before)
    } else {
      connectBtn.classList.remove('connected');
      
      // Mostrar nom de l'última micro:bit si existeix
      let lastDevice = null;
    try { lastDevice = localStorage.getItem('lastMicrobit'); } catch(e) {}
      if (lastDevice) {
        connectBtn.textContent = `🔵 Connectar (${lastDevice})`;
      } else {
        connectBtn.textContent = '🔵 Connectar Bluetooth';
      }
    }
  }
  
  // Actualitzar indicador de dispositiu a la pàgina
  const deviceIndicator = document.getElementById('device-indicator');
  if (deviceIndicator && connected && uBitDevice) {
    deviceIndicator.textContent = `📡 ${uBitDevice.name}`;
    deviceIndicator.style.display = 'block';
  } else if (deviceIndicator) {
    deviceIndicator.style.display = 'none';
  }
  
  if (onStatusChangeCallback) onStatusChangeCallback(connected, message);
}

// Detecta iPhone/iPad (inclou Chrome i altres navegadors en iOS, que per
// restricció d'Apple/WebKit tampoc tenen Web Bluetooth, encara que el
// navegador siga Chrome).
function isIOSDevice() {
  const ua = navigator.userAgent || '';
  const isAppleTouch = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS "desktop" UA
  return isAppleTouch;
}

async function connectBluetooth() {
  // Web Bluetooth no és suportat per Firefox, Safari, ni per CAP navegador
  // en iOS/iPadOS (és una restricció del sistema, no del navegador concret).
  if (!navigator.bluetooth) {
    if (isIOSDevice()) {
      setStatusText('❌ Bluetooth no disponible a l\'iPhone/iPad.');
      alert('Este dispositiu (iPhone/iPad) no permet connectar per Bluetooth des del navegador: és una limitació del sistema d\'Apple, no d\'esta aplicació.\n\nLa càmera i la IA funcionen igual, però per a enviar dades a la micro:bit necessites un mòbil o un ordinador amb Android, Windows, Linux o ChromeOS (amb Chrome o Edge).');
    } else {
      setStatusText('❌ Bluetooth no disponible. Usa Chrome o Edge.');
      alert('El Bluetooth Web no és compatible amb este navegador.\nUtilitza Google Chrome o Microsoft Edge.');
    }
    return;
  }
  try {
    notifyStatus(false, '🔍 Cercant micro:bit...');

    uBitDevice = await navigator.bluetooth.requestDevice({
      filters:          [{ namePrefix: 'BBC micro:bit' }],
      optionalServices: [UART_SERVICE_UUID],
    });

    // Guardar el nom del dispositiu
    if (uBitDevice.name) {
      try { localStorage.setItem('lastMicrobit', uBitDevice.name); } catch(e) {}
    }

    uBitDevice.addEventListener('gattserverdisconnected', onDisconnected);

    const server  = await uBitDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);

    rxCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC);
    await rxCharacteristic.startNotifications();
    rxCharacteristic.addEventListener('characteristicvaluechanged', onTxValueChanged);

    uart = await service.getCharacteristic(UART_RX_CHARACTERISTIC);

    notifyStatus(true, '✅ micro:bit connectada');
  } catch (e) {
    console.error('❌ Error BT:', e);
    uart = null;
    rxCharacteristic = null;
    notifyStatus(false, '❌ Error en la connexió');
  }
}

function onTxValueChanged(event) {
  const data = new Uint8Array(event.target.value.buffer);
  const str  = String.fromCharCode(...data);
  console.log('📥 Rebut de micro:bit:', str);
}

function onDisconnected(event) {
  console.log(`🔌 Desconnectat de ${event.target.name}`);
  uart             = null;
  rxCharacteristic = null;
  notifyStatus(false, '🔌 micro:bit desconnectada');
}

/**
 * Envia una cadena per UART.
 * Format esperat per a RobHort: "gat:87,ocell:45"
 * @param {string} data
 */
function sendUARTData(data) {
  if (!uart) return;
  const encoded = new TextEncoder().encode(data + '\n');
  // El servei UART de la micro:bit admet com a màxim 20 bytes per escriptura
  // BLE. Els missatges més llargs (p. ex. «gat:87,ocell:45,persona:99») es
  // trossegen en blocs de 20 bytes; la micro:bit els torna a unir i el
  // salt de línia final marca on acaba el missatge.
  for (let i = 0; i < encoded.length; i += 20) {
    const chunk = encoded.slice(i, i + 20);
    queueGattOperation(() =>
      (uart.writeValueWithoutResponse
        ? uart.writeValueWithoutResponse(chunk)
        : uart.writeValue(chunk))
        .catch(e => console.error('❌ Error UART:', e))
    );
  }
  console.log('📤 UART enviat:', data);
}

function isBluetoothConnected() {
  return isConnected && uart !== null;
}

// Avisa d'entrada (sense esperar que l'usuari prema "Connectar") si este
// dispositiu no podrà mai connectar per Bluetooth, perquè sàpia per què
// abans de perdre temps provant-ho.
document.addEventListener('DOMContentLoaded', () => {
  if (navigator.bluetooth) return;
  const connectBtn = document.getElementById('connectBtn');
  if (!connectBtn) return;
  // Text curt perquè càpiga en pantalles de 320 px; l'explicació completa
  // apareix en tocar el botó.
  connectBtn.textContent = '⚠️ Sense Bluetooth';
  connectBtn.title = isIOSDevice()
    ? 'Bluetooth no disponible a l\'iPhone/iPad'
    : 'Este navegador no té Bluetooth Web';
});
