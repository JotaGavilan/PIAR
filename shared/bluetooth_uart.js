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

// Text i estil del botó «Connectar Bluetooth» segons l'estat i l'idioma actual
function updateConnectButton() {
  const connectBtn = document.getElementById('connectBtn');
  if (!connectBtn) return;
  if (!navigator.bluetooth) {          // sense Web Bluetooth (iPhone, Firefox…): text curt perquè càpiga en 320 px
    connectBtn.classList.remove('btn-primary'); connectBtn.classList.add('no-bt');   // avís (groc), igual en totes les apps
    connectBtn.textContent = _t('sh.bt.none');
    connectBtn.title = isIOSDevice() ? _t('sh.bt.none_ios_title') : _t('sh.bt.none_title');
    return;
  }
  if (isConnected) {
    connectBtn.classList.add('connected');
    connectBtn.textContent = _t('sh.bt.connected');   // el ✓ el posa el CSS (.connected::before)
  } else {
    connectBtn.classList.remove('connected');
    // Mostrar nom de l'última micro:bit si existeix
    let lastDevice = null;
    try { lastDevice = localStorage.getItem('lastMicrobit'); } catch(e) {}
    connectBtn.textContent = lastDevice ? _t('sh.bt.connect_named', { name: lastDevice }) : _t('sh.bt.connect');
  }
}

function notifyStatus(connected, message) {
  isConnected = connected;
  
  // Actualitzar classe i text del botó de connexió
  updateConnectButton();

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
      setStatusText(_t('sh.bt.ios_status'));
      alert(_t('sh.bt.ios_alert'));
    } else {
      setStatusText(_t('sh.bt.unsupported_status'));
      alert(_t('sh.bt.unsupported_alert'));
    }
    return;
  }
  try {
    notifyStatus(false, _t('sh.bt.searching'));

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

    notifyStatus(true, _t('sh.bt.ok'));
  } catch (e) {
    console.error('❌ Error BT:', e);
    uart = null;
    rxCharacteristic = null;
    notifyStatus(false, _t('sh.bt.error'));
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
  notifyStatus(false, _t('sh.bt.disconnected'));
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
document.addEventListener('DOMContentLoaded', () => { if (!navigator.bluetooth || (window.PIAR_I18N && PIAR_I18N.lang !== 'ca')) updateConnectButton(); });
// En canviar d'idioma, el botó es torna a escriure en el nou idioma
if (window.PIAR_I18N) PIAR_I18N.onChange(() => updateConnectButton());
