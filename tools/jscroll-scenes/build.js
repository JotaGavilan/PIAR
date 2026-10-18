// Ús: node build.js [--thumbs] [--topics music,food] [--out CARPETA]
// Genera les 72 publicacions (fotos .webp i vídeos .mp4 + pòsters) i captions.json. Cal Node, Playwright (amb Chromium), Python 3 + Pillow i ffmpeg.
const { open, DIR, fs } = require('./common.js');
const { execSync } = require('child_process');
const TOPICS = ['music', 'gaming', 'sport', 'fashion', 'humor', 'animals', 'food', 'travel', 'science', 'art', 'cars', 'cinema'];
const args = process.argv.slice(2); const thumbs = args.includes('--thumbs');
const only = args.includes('--topics') ? args[args.indexOf('--topics') + 1].split(',') : TOPICS;
const OUT = (args.includes('--out') ? args[args.indexOf('--out') + 1] : DIR + 'out/').replace(/\/?$/, '/');
const FPS = 24, N = 192;
// plan: id → [escena, variante, tipo]
const PLAN = (t) => [[`${t}-a`, 0, 'video', 5], [`${t}-b`, 0, 'video', 6], [`${t}-a`, 1, 'photo', 1], [`${t}-b`, 1, 'photo', 2], [`${t}-c`, 0, 'photo', 3], [`${t}-c`, 1, 'photo', 4]];
(async () => {
  const { br, pg, errs } = await open(null);
  fs.mkdirSync(OUT, { recursive: true }); const caps = {}; const tmp = require('os').tmpdir() + '/jsbuild/'; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const meta = await pg.evaluate(() => Object.fromEntries(Object.entries(SCENES).map(([k, s]) => [k, { cap: s.cap, stillT: s.stillT }])));
  for (const t of only) {
    for (const [sid, v, kind, n] of PLAN(t)) {
      const m = meta[sid]; if (!m) { console.log('FALTA', sid); continue; }
      const id = `${t}-${n}`; const cap = Array.isArray(m.cap) ? m.cap[v] : m.cap; caps[id] = cap;
      const sT = (m.stillT && m.stillT[v] != null) ? m.stillT[v] : .3;
      if (thumbs) { const b64 = await pg.evaluate(([s, v, tt]) => renderFrame(s, v, tt, .25, 'png'), [sid, v, kind === 'photo' ? sT : .3]); fs.writeFileSync(`${tmp}${id}.png`, Buffer.from(b64, 'base64')); continue; }
      if (kind === 'photo') {
        const b64 = await pg.evaluate(async ([s, v, tt]) => { const r = await renderFrame(s, v, tt, 1, 'png'); const c = document.getElementById('c'); const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); L.grain(g, 1080, 1920, .05, 3 + v); return c.toDataURL('image/png').split(',')[1]; }, [sid, v, sT]);
        fs.writeFileSync(`${tmp}${id}.png`, Buffer.from(b64, 'base64'));
        execSync(`python3 -c "from PIL import Image; Image.open('${tmp}${id}.png').convert('RGB').save('${OUT}${id}.webp',quality=80,method=6)"`);
      } else {
        const d = `${tmp}${id}/`; fs.mkdirSync(d);
        for (let f = 0; f < N; f++) { const b64 = await pg.evaluate(([s, v, tt]) => renderFrame(s, v, tt, 2 / 3, 'jpeg', .93), [sid, v, f / N]); fs.writeFileSync(`${d}f${String(f).padStart(3, '0')}.jpg`, Buffer.from(b64, 'base64')); }
        execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${d}f%03d.jpg -c:v libx264 -pix_fmt yuv420p -crf 33 -preset slow -profile:v high -movflags +faststart -an ${OUT}${id}.mp4`);
        const pb = await pg.evaluate(([s, v, tt]) => renderFrame(s, v, tt, 2 / 3, 'png'), [sid, v, sT]); fs.writeFileSync(`${tmp}${id}-poster.png`, Buffer.from(pb, 'base64'));
        execSync(`python3 -c "from PIL import Image; Image.open('${tmp}${id}-poster.png').convert('RGB').save('${OUT}${id}-poster.webp',quality=72,method=6)"`);
        fs.rmSync(d, { recursive: true, force: true });
        console.log('vídeo', id, (fs.statSync(`${OUT}${id}.mp4`).size / 1024).toFixed(0) + ' KB');
      }
    }
    console.log('fet', t);
  }
  if (thumbs) {
    execSync(`python3 - <<'PY'
from PIL import Image
import os
topics=${JSON.stringify(only)}
for k in range(0,len(topics),3):
    grp=topics[k:k+3]; w,h=270,480
    S=Image.new('RGB',(6*w+7*4,len(grp)*h+(len(grp)+1)*4),(20,20,20))
    for r,t in enumerate(grp):
        for c,n in enumerate([5,6,1,2,3,4]):
            p='${tmp}%s-%d.png'%(t,n)
            if os.path.exists(p): S.paste(Image.open(p).convert('RGB'),(4+c*(w+4),4+r*(h+4)))
    S.save('${DIR}sheets/ALL-%d.png'%(k//3))
PY`);
  } else fs.writeFileSync(OUT + 'captions.json', JSON.stringify(caps, null, 1));
  if (errs.length) console.log('ERRORES:\n' + errs.join('\n')); await br.close();
})();
