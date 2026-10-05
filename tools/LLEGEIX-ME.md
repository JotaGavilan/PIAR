# Eines de PIAR

## build-pwa.py
Cada vegada que canvies **qualsevol fitxer** de PIAR (una pàgina, un estil, una imatge, una llibreria…), executa en l'arrel del repositori:

    python3 tools/build-pwa.py

Això actualitza `precache.json` i el número de versió de `sw.js`. Gràcies a això, els mòbils que ja tenen PIAR instal·lada
reben els canvis la pròxima vegada que l'obrin amb Internet. Si t'oblides d'executar-lo, els mòbils continuaran mostrant
la versió antiga fins que canvie algun altre fitxer.

No cal instal·lar res: només Python 3. (Si vols que ho faça Claude, demana-li «actualitza la PWA».)
