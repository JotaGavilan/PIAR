// uso: node looptest.js ESCENA [variantes=0,1]  → comprueba que el bucle es perfecto y mide la velocidad de render
const { open, DIR, fs } = require('./common.js');
const { execSync } = require('child_process');
(async () => {
  const id = process.argv[2]; const vs = (process.argv[3] || '0,1').split(',').map(Number);
  const { br, pg, errs } = await open([id.split('-')[0]]);
  const N = 192, sc = .25;
  const TMP = require('os').tmpdir() + '/lt-' + process.pid + '.png';
  async function px(v, t) { const b64 = await pg.evaluate(([id, v, t, sc]) => renderFrame(id, v, t, sc, 'png'), [id, v, t, sc]); fs.writeFileSync(TMP, Buffer.from(b64, 'base64')); return execSync(`python3 -c "from PIL import Image;im=Image.open('${TMP}').convert('RGB');print(' '.join(map(str,im.resize((135,240)).tobytes()[::7])))"`, { maxBuffer: 1 << 28 }).toString().trim().split(' ').map(Number); }
  const d = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0) / a.length;
  for (const v of vs) {
    const t0 = Date.now(); const f0 = await px(v, 0), f1 = await px(v, 1 / N), fl = await px(v, (N - 1) / N), fe = await px(v, 1 - 1e-6);
    const step = d(f0, f1), wrap = d(fl, f0), dd = d(f0, fe);
    // máximo salto entre fotogramas consecutivos en una muestra
    let mx = 0, prev = f0; for (let k = 1; k <= 16; k++) { const f = await px(v, k * (N / 16) / N); mx = Math.max(mx, d(prev, f)); prev = f; }
    const ms = (Date.now() - t0) / 20;
    console.log(`v${v}: salto t=0→1/N ${step.toFixed(2)} | salto final→inicio ${wrap.toFixed(2)} | t=0 vs t≈1 ${dd.toFixed(2)} ${wrap > step * 2.5 + 1 || dd > 1.5 ? '⚠ BUCLE NO PERFECTO' : 'ok'} | ~${ms.toFixed(0)} ms/fotograma(1/4 res)`);
  }
  if (errs.length) console.log('ERRORES:\n' + errs.join('\n')); await br.close();
})();
