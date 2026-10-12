#!/bin/bash
cd "$(dirname "$0")"; for t in "$@"; do (timeout 270 node $t.js > out-$t.txt 2>&1) & done; wait
for t in "$@"; do python3 -c "
ls=[l.rstrip() for l in open('out-$t.txt',encoding='utf-8',errors='replace')]
p=sum(l.startswith('PASSOU') for l in ls); f=[l[:150] for l in ls if l.startswith(('FALHOU','ERRO'))]
print('$t', p, 'passou', ('FALHOU: '+' | '.join(f)) if f else '')"; done
