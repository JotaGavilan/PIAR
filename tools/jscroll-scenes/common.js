const fs = require('fs'), path = require('path');
const DIR = __dirname + path.sep;
// Playwright: instal·lat en este projecte, o global (npm i -g playwright), o ruta a l'ordre PLAYWRIGHT_PATH
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')); }
async function open(only) {
  const opts = { args: ['--no-sandbox', '--allow-file-access-from-files'] };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;     // opcional: un Chrome/Chromium concret
  const br = await chromium.launch(opts);
  const pg = await (await br.newContext({ viewport: { width: 400, height: 400 } })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + DIR + 'harness.html');
  for (const f of fs.readdirSync(DIR + 'scenes').filter(f => f.endsWith('.js')).sort()) {
    if (only && !only.some(o => f.startsWith(o))) continue;
    const src = fs.readFileSync(DIR + 'scenes/' + f, 'utf8');
    try { await pg.addScriptTag({ content: src }); } catch (e) { errs.push(f + ': ' + e.message); }
  }
  await pg.evaluate(() => fontsReady());
  return { br, pg, errs };
}
module.exports = { open, DIR, fs, path };
