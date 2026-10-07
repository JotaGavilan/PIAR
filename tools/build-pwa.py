#!/usr/bin/env python3
"""
Genera precache.json (llista de fitxers de PIAR) i posa la versió a sw.js.
Cal tornar-lo a executar cada vegada que afegisques o canvies fitxers:   python3 tools/build-pwa.py
(Si no el tornes a executar, l'app continua funcionant: les pàgines s'actualitzen soles
 en obrir-les, però un fitxer NOU no estarà disponible sense Internet fins que s'execute.)
"""
import hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', 'tools', 'node_modules', '__pycache__', '_testlibs', '_fonts'}
SKIP_FILES = {'sw.js', 'precache.json', '.DS_Store'}
SHELL_EXT = {'.html', '.css', '.js', '.json', '.webmanifest', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.svg', '.woff2'}

def walk():
    for d, ds, fs in os.walk(ROOT):
        ds[:] = sorted(x for x in ds if x not in SKIP_DIRS)
        for f in sorted(fs):
            if f in SKIP_FILES: continue
            p = os.path.join(d, f)
            yield os.path.relpath(p, ROOT).replace(os.sep, '/')

def sha(p):
    h = hashlib.sha256()
    with open(os.path.join(ROOT, p), 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''): h.update(chunk)
    return h.hexdigest()

files = list(walk())
shell, vendor = [], []
for p in files:
    ext = os.path.splitext(p)[1].lower()
    if p.startswith('vendor/') and not p.startswith('vendor/fonts/'):
        if ext in {'.md'}: continue
        vendor.append(p)
    elif ext in SHELL_EXT:
        shell.append(p)
shell.insert(0, './')   # la portada (adreça de la carpeta)

GROUPS = [
    ('jface', 'JFace', ['mediapipe-face_mesh/', 'mediapipe-camera_utils/', 'mediapipe-drawing_utils/'], None),
    ('robhort', 'RobHort', ['tfjs-4.17.0/', 'coco-ssd-2.2.3/'], 'robhort/precarrega.html'),
    ('teachable', 'Teachable Microbit', ['tfjs-3.11.0/', 'teachablemachine-image-0.8.5/', 'teachablemachine-pose-0.8.6/', 'tfjs-4.15.0/', 'mobilenet-2.1.0/', 'posenet-2.2.2/', 'mediapipe-hands/'], None),
    ('maquina', 'Màquina Ensenyable', ['tfjs-4.15.0/', 'mobilenet-2.1.0/', 'posenet-2.2.2/', 'mediapipe-hands/'], 'maquina-ensenyable/precarrega.html'),
    ('quevuen', 'Què veuen de tu', ['exifr-', 'face-api-', 'coco-ssd-2.2.3/', 'tesseract.js-', 'tesseract.js-core-', 'tesseract-lang-'], 'quevuen/precarrega.html'),
]
groups = []
used = set()
for gid, name, prefixes, preload in GROUPS:
    fl = [p for p in vendor if any(p.startswith('vendor/' + x) for x in prefixes)]
    used.update(fl)
    groups.append({'id': gid, 'name': name, 'files': [{'u': p, 's': os.path.getsize(os.path.join(ROOT, p))} for p in fl], 'preload': preload})
orphans = [p for p in vendor if p not in used]
if orphans: print('AVÍS: fitxers de vendor/ sense grup:', orphans)

h = hashlib.sha256()
for p in shell + vendor: h.update(p.encode()); h.update(sha(p).encode() if p != './' else b'')
version = h.hexdigest()[:12]
plan = {'version': version, 'shell': shell, 'groups': groups}
json.dump(plan, open(os.path.join(ROOT, 'precache.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf8').read()
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", sw, count=1)
open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf8').write(sw)
tot = sum(os.path.getsize(os.path.join(ROOT, p)) for p in shell if p != './')
print(f'versió {version} · pàgines i icones: {len(shell)} fitxers ({tot/1e6:.1f} MB) · llibreries (vendor): {len(vendor)} fitxers')
