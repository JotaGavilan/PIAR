#!/usr/bin/env python3
"""Revisió del valencià de PIAR segons el criteri de l'AVL/DNV.
Ús (des de l'arrel del repositori):   py -3 tools/valencia-dnv.py .  [--dry]
Només toca els textos en valencià (bloc «ca» dels i18n, text visible de guies i index.html, README, manifests) i és
idempotent: si ja està corregit, no canvia res. Criteri: verbs incoatius en -ix- (repetix, servix, construïx), subjuntiu
en -e/-es (digues, tries), este/eixe, meua/teua/seua, «aprés», «vegada» (no «cop»).
--dry mostra què canviaria sense escriure."""
import re,sys,os,glob,html,json
root=sys.argv[1]; dry='--dry' in sys.argv
# --- incoatius: -eix- -> -ix- (criteri únic) ---
inc={'repeteix':'repetix','repeteixen':'repetixen','repeteixes':'repetixes','reparteix':'repartix','descobreix':'descobrix',
'descobreixes':'descobrixes','segueix':'seguix','parteix':'partix','farceix':'farcix','afegeix':'afegix','uneix':'unix',
'serveix':'servix','serveixen':'servixen','coincideix':'coincidix','coincideixen':'coincidixen','aconsegueix':'aconseguix',
'consegueix':'conseguix','prefereix':'preferix','prefereixes':'preferixes','cobreix':'cobrix','converteix':'convertix',
'comprimeix':'comprimix','comprimeixen':'comprimixen','decideix':'decidix','decideixes':'decidixes','defineix':'definix',
'exigeix':'exigix','exigeixen':'exigixen','ofereix':'oferix','suggereix':'suggerix','convergeixen':'convergixen',
'compleix':'complix','construeix':'construïx','construeixes':'construïxes','condueix':'conduïx','dedueix':'deduïx',
'redueix':'reduïx','substitueix':'substituïx','reprodueix':'reproduïx','obeeix':'obeïx'}
other={'diguis':'digues','triïs':'tries','creguis':'cregues','puguis':'pugues','aprèn':'aprén','après':'aprés',
 'dónes':'dones','esos':'eixos','aquests':'estos','aquest':'este','aquesta':'esta','cop':'vegada'}
M={}
for d in (inc,other):
    for k,v in d.items():
        M[k]=v; M[k.capitalize()]=v.capitalize()
# 'cop' i 'aquest*' es fan a mà (context): no s'apliquen en bloc
for k in ['cop','Cop','aquests','Aquests','aquest','Aquest','aquesta','Aquesta']: M.pop(k,None)
pat=re.compile(r"(?<![\wÀ-ÿ·])("+"|".join(sorted(map(re.escape,M),key=len,reverse=True))+r")(?![\wÀ-ÿ·])")
log=[]
def sub(text,fn):
    def r(m):
        log.append((fn,m.group(1),M[m.group(1)]))
        return M[m.group(1)]
    return pat.sub(r,text)
def do_i18n(path):
    s=open(path,encoding='utf8').read()
    m=re.search(r'\n\s*["\']?ca["\']?:\s*\{',s); m2=re.search(r'\n\s*["\']?es["\']?:\s*\{',s[m.end():])
    a,b=m.end(),m.end()+m2.start()
    n=s[:a]+sub(s[a:b],path)+s[b:]
    return n
def do_html(path):
    s=open(path,encoding='utf8').read()
    parts=re.split(r'(<script\b.*?</script>|<style\b.*?</style>|<pre\b.*?</pre>|<[^>]+>)',s,flags=re.S)
    out=[]
    for p in parts:
        if p.startswith('<script') or p.startswith('<style') or p.startswith('<pre'): out.append(p)
        elif p.startswith('<') and p.endswith('>'):
            out.append(re.sub(r'((?:title|aria-label|alt|placeholder)=")([^"]*)(")',lambda m:m.group(1)+sub(m.group(2),path)+m.group(3),p))
        else: out.append(sub(p,path))
    return ''.join(out)
def do_md(path):
    s=open(path,encoding='utf8').read()
    parts=re.split(r'(```.*?```|`[^`\n]*`)',s,flags=re.S)
    return ''.join(p if p.startswith('`') else sub(p,path) for p in parts)
def do_plain(path): return sub(open(path,encoding='utf8').read(),path)
def do_manifest(path):
    s=open(path,encoding='utf8').read()
    return re.sub(r'("description":\s*")([^"]*)(")',lambda m:m.group(1)+sub(m.group(2),path)+m.group(3),s)
targets=[]
for f in glob.glob(root+'/**/*',recursive=True):
    if re.search(r'/(PIAR|piar_repo|vendor|jveu|node_modules|OPCIONAL-whisper)/',f) or not os.path.isfile(f): continue
    rel=f[len(root)+1:]
    if re.search(r'(^|/)js/i18n\.js$|^shared/i18n_(shared|portada)\.js$',rel): targets.append((f,do_i18n))
    elif re.search(r'(guia|index)\.html$',rel): targets.append((f,do_html))
    elif rel.endswith('README.md'): targets.append((f,do_md))
    elif rel.endswith('site.webmanifest'): targets.append((f,do_manifest))
    elif rel in ('tools/jscroll-media.py','tools/build-pwa.py','tools/control-password.py'): targets.append((f,do_plain))
changed=[]
for f,fn in targets:
    old=open(f,encoding='utf8').read(); new=fn(f)
    if new!=old:
        changed.append(f[len(root)+1:])
        if not dry: open(f,'w',encoding='utf8').write(new)
print('canviats:',len(changed)); print('\n'.join(changed))
from collections import Counter
c=Counter((a,b) for _,a,b in log)
print(sum(c.values()),'substitucions'); 
for (a,b),n in sorted(c.items()): print(f'  {a} → {b}: {n}')
