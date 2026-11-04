#!/usr/bin/env python3
"""
Canvia la contrasenya del panell /control.   Ús:   python3 tools/control-password.py "la teua contrasenya"
Escriu control/auth.js (sal + PBKDF2-SHA256). Després puja control/auth.js al repositori.
(La contrasenya NO es guarda enlloc: només el seu «hash».)
"""
import hashlib, os, sys, secrets
if len(sys.argv) < 2 or len(sys.argv[1]) < 8:
    sys.exit('Ús: python3 tools/control-password.py "contrasenya de 8 caràcters o més"')
pw = sys.argv[1]; salt = secrets.token_hex(16); it = 200000
h = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt.encode('utf-8'), it).hex()
path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'control', 'auth.js')
open(path, 'w', encoding='utf8').write(
    '// Generat per tools/control-password.py. Conté només el «hash» de la contrasenya (no la contrasenya).\n'
    'window.CONTROL_AUTH = { salt: "%s", iter: %d, hash: "%s" };\n' % (salt, it, h))
print('Contrasenya canviada. Puja control/auth.js al repositori.')
