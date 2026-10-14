"""Gera as regras do "Fundo escuro na TV" a partir do css/painel.css.
Pega as regras das telas de TV com cor escrita direto (hex) e cria a versão escura:
fundos claros -> superfícies escuras; textos escuros -> claros; cores de situação (verde/vermelho/amarelo/azul) -> mais claras.
Uso: python3 testes/gera-tv-escuro.py  (reescreve o bloco entre os marcadores em js/14-tv-melhor.js)."""
import re, colorsys, os
RAIZ=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css=open(os.path.join(RAIZ,'css/painel.css'),encoding='utf-8').read()
TELAS=r'\.(?:md[a-z]*|me[a-z]*|mcol|dbmon|tv2[a-z-]*)\b'
D='html:root[data-theme="dark"]'
def rgb(h):
    h=h.lstrip('#'); h=''.join(c*2 for c in h) if len(h)==3 else h; return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def hexd(r,g,b): return '#%02X%02X%02X'%tuple(round(max(0,min(1,x))*255) for x in (r,g,b))
def conv(h,papel):
    r,g,b=rgb(h); hh,l,s=colorsys.rgb_to_hls(r,g,b)
    if papel=='fundo':
        if s<0.25: return '#1E2427' if l>0.97 else '#263035' if l>0.9 else '#2E383D'   # branco/cinza claro -> superfície
        return hexd(*colorsys.hls_to_rgb(hh,0.17,min(0.55,s)))                             # tinta clara colorida -> tinta escura
    if papel=='texto':
        if s<0.25: return '#F1F4F5' if l<0.2 else '#C9D2D6' if l<0.38 else '#A7B2B7'          # textos neutros
        return hexd(*colorsys.hls_to_rgb(hh,max(l,0.68),min(0.75,s+0.1)))                  # cores de situação, mais claras
    # borda
    if s<0.25: return '#34404A'
    return hexd(*colorsys.hls_to_rgb(hh,0.32,min(0.5,s)))
regras=[]
for m in re.finditer(r'([^{}@]+)\{([^{}]*)\}',css):
    sel,body=m.group(1).strip(),m.group(2)
    if not re.search(TELAS,sel) or ':root' in sel: continue
    decl=[]
    for prop,val in re.findall(r'(background(?:-color)?|(?<![-\w])color|border(?:-[a-z]+)?|fill|stroke|--p(?:b|bg))\s*:\s*([^;]+)',body):
        papel='fundo' if prop.startswith('background') or prop.startswith('--p') else 'texto' if prop in ('color','fill') else 'borda'
        novo=re.sub(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',lambda x:conv(x.group(0),papel),val)
        if novo!=val: decl.append(f'{prop}:{novo.strip()}')
    if decl:
        sels=','.join(f'{D} {x.strip()}' for x in sel.split(','))
        regras.append(f'{sels}{{{";".join(decl)}}}')
# animações de "pisca" com fundo branco fixo: versão escura com outro nome, ligada só no escuro
for nome in re.findall(r'@keyframes\s+([\w-]+)\s*\{[^@]*?background:\s*#fff',css,flags=re.I):
    regras.append('@keyframes '+nome+'Esc{0%,100%{background:#1E2427}50%{background:var(--pb)}}')
    for m in re.finditer(r'([^{}@]+)\{[^{}]*animation[^{}]*\b'+re.escape(nome)+r'\b[^{}]*\}',css):
        regras.append(','.join(f'{D} {x.strip()}' for x in m.group(1).split(','))+'{animation-name:'+nome+'Esc}')
bloco='\n'.join(regras)
p=os.path.join(RAIZ,'js/14-tv-melhor.js'); s=open(p,encoding='utf-8').read()
ini,fim='/* gerado: tv-escuro (testes/gera-tv-escuro.py) */','/* fim do gerado */'
novo=ini+'\n'+bloco+'\n'+fim
s=re.sub(re.escape(ini)+r'.*?'+re.escape(fim),lambda _:novo,s,flags=re.S) if ini in s else s.replace('</style>`);',novo+'\n</style>`);',1)
open(p,'w',encoding='utf-8').write(s); print(len(regras),'regras geradas')
