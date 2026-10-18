#!/usr/bin/env python3
"""
JScroll – gestor del catàleg de fotos i vídeos.

  python3 tools/jscroll-media.py                 → torna a generar jscroll/media/feed.json a partir dels fitxers de jscroll/media/
  python3 tools/jscroll-media.py CARPETA         → importa les teues fotos/vídeos i després regenera feed.json
  python3 tools/jscroll-media.py CARPETA --clean → igual, però abans esborra els fitxers de mostra d'aquells interessos

CARPETA ha de tindre una subcarpeta per interés, amb este nom (en anglés, minúscules):
  music gaming sport fashion humor animals food travel science art cars cinema
  p. ex.  la-meua-carpeta/music/concert.jpg   la-meua-carpeta/sport/gol.mp4
Les fotos es redimensionen (màx. 720×1280) i es guarden en WebP; els vídeos es comprimeixen (H.264, màx. 720×1280, ≤ 12 s, sense so)
amb ffmpeg (cal tindre'l instal·lat: ffmpeg i ffprobe). Els peus de foto (opcionals) es posen a jscroll/media/captions.json:
  { "music-7": { "ca": "text", "es": "texto", "en": "text" } }   (o simplement "text" per a tots els idiomes)
Cada interés necessita almenys 6 publicacions per a una sessió de 60. Després d'executar-lo: python3 tools/build-pwa.py
"""
import hashlib, json, os, re, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(ROOT, 'jscroll', 'media')
TOPICS = ['music', 'gaming', 'sport', 'fashion', 'humor', 'animals', 'food', 'travel', 'science', 'art', 'cars', 'cinema']
IMG = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}
VID = {'.mp4', '.mov', '.webm', '.m4v', '.mkv'}
HANDLES = ['lia', 'nuria', 'marc', 'aleix', 'sara', 'pau', 'jana', 'eric', 'noa', 'hugo', 'carla', 'dani', 'irene', 'biel', 'laia', 'adri', 'mireia', 'oscar', 'alba', 'ivan']
TAILS = ['daily', 'vibes', 'clips', 'zone', 'mood', 'lab', 'world', 'hub', 'tv', 'moments']

def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)

def next_n(topic):
    n = 0
    for f in os.listdir(MEDIA):
        m = re.match(r'^%s-(\d+)\.' % topic, f)
        if m: n = max(n, int(m.group(1)))
    return n + 1

def import_folder(src, clean):
    for t in TOPICS:
        d = os.path.join(src, t)
        if not os.path.isdir(d): continue
        if clean:
            for f in os.listdir(MEDIA):
                if re.match(r'^%s-\d+(-poster)?\.' % t, f): os.remove(os.path.join(MEDIA, f))
        for f in sorted(os.listdir(d)):
            ext = os.path.splitext(f)[1].lower(); p = os.path.join(d, f); n = next_n(t); base = os.path.join(MEDIA, '%s-%d' % (t, n))
            if ext in IMG:
                im = Image.open(p); im = im.convert('RGB'); im.thumbnail((720, 1280)); im.save(base + '.webp', quality=78, method=6); print('foto ', t, n, f)
            elif ext in VID:
                r = run(['ffmpeg', '-y', '-loglevel', 'error', '-i', p, '-t', '12', '-an', '-vf', "scale='min(720,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', base + '.mp4'])
                if r.returncode: print('ERROR amb', f, r.stderr[:200]); continue
                print('vídeo', t, n, f)
            else: continue
    # peus per defecte: el nom del fitxer
    return

def probe(path):
    r = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', path])
    j = json.loads(r.stdout or '{}'); s = (j.get('streams') or [{}])[0]
    return int(s.get('width', 0)), int(s.get('height', 0)), float((j.get('format') or {}).get('duration', 6) or 6)

def build():
    caps = {}
    cp = os.path.join(MEDIA, 'captions.json')
    if os.path.exists(cp): caps = json.load(open(cp, encoding='utf8'))
    items = []
    for t in TOPICS:
        ids = sorted({int(m.group(1)) for f in os.listdir(MEDIA) for m in [re.match(r'^%s-(\d+)\.(webp|jpg|jpeg|png|mp4|webm)$' % t, f)] if m})
        for n in ids:
            id_ = '%s-%d' % (t, n); it = {'id': id_, 'topic': t}
            mp4 = os.path.join(MEDIA, id_ + '.mp4'); webm = os.path.join(MEDIA, id_ + '.webm')
            vid = mp4 if os.path.exists(mp4) else webm if os.path.exists(webm) else None
            if vid:
                w, h, dur = probe(vid); it.update(type='video', file=os.path.basename(vid), dur=round(dur, 1), w=w, h=h)
                poster = os.path.join(MEDIA, id_ + '-poster.webp')
                if not os.path.exists(poster):
                    tmp = poster + '.png'; run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.5', '-i', vid, '-vframes', '1', tmp])
                    if os.path.exists(tmp): Image.open(tmp).convert('RGB').save(poster, quality=70, method=6); os.remove(tmp)
                it['poster'] = id_ + '-poster.webp'
            else:
                f = next(x for x in os.listdir(MEDIA) if re.match(r'^%s\.(webp|jpg|jpeg|png)$' % re.escape(id_), x))
                w, h = Image.open(os.path.join(MEDIA, f)).size; it.update(type='photo', file=f, w=w, h=h)
            hh = int(hashlib.md5(id_.encode()).hexdigest(), 16)
            it['user'] = '%s.%s' % (HANDLES[hh % len(HANDLES)], TAILS[(hh >> 8) % len(TAILS)])
            it['likes'] = 120 + (hh >> 16) % 9800
            c = caps.get(id_)
            if c: it['cap'] = c
            items.append(it)
    out = {'version': 1, 'items': items}
    json.dump(out, open(os.path.join(MEDIA, 'feed.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    cnt = {t: sum(1 for i in items if i['topic'] == t) for t in TOPICS}
    print('feed.json:', len(items), 'publicacions ·', ', '.join('%s %d' % (t, c) for t, c in cnt.items()))
    low = [t for t, c in cnt.items() if c < 6]
    if low: print('AVÍS: menys de 6 publicacions en', ', '.join(low), '(la sessió adaptativa en necessita més)')

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if args:
        if not shutil.which('ffmpeg'): print('Cal ffmpeg per als vídeos'); 
        import_folder(args[0], '--clean' in sys.argv)
    build()
