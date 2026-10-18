// uso: node preview.js ESCENA [variantes=0,1] [tiempos=0,.25,.5,.75] [--full]
const { open, DIR, fs } = require('./common.js');
const { execSync } = require('child_process');
(async () => {
  const id = process.argv[2]; const vs = (process.argv[3] || '0,1').split(',').map(Number); const ts = (process.argv[4] || '0,.25,.5,.75').split(',').map(Number); const full = process.argv.includes('--full');
  const { br, pg, errs } = await open([id.split('-')[0]]);
  const sc = full ? 1 : .25, dir = DIR + 'sheets/' + id + '/'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const v of vs) for (const t of ts) {
    const t0 = Date.now(); const b64 = await pg.evaluate(([id, v, t, sc]) => renderFrame(id, v, t, sc, 'png'), [id, v, t, sc]);
    const f = `${dir}v${v}_t${t}.png`; fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); if (Date.now() - t0 > 400) console.log('lento', v, t, Date.now() - t0, 'ms');
  }
  const out = DIR + 'sheets/' + id + (full ? '-full' : '') + '.png';
  execSync(`python3 - <<'PY'
from PIL import Image
fs=${JSON.stringify(files)}; cols=${ts.length}
ims=[Image.open(f).convert('RGB') for f in fs]; w,h=ims[0].size; rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(cols*w+(cols+1)*6,rows*h+(rows+1)*6),(30,30,30))
for i,im in enumerate(ims): S.paste(im,(6+(i%cols)*(w+6),6+(i//cols)*(h+6)))
S.save('${out}')
PY`);
  console.log('hoja:', out); if (errs.length) console.log('ERRORES:\n' + errs.join('\n'));
  await br.close();
})();
