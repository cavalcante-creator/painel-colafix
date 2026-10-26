/* Análise PCP organizada (js/61): 4 abas, Resumo/Necessidades/Acerto saem, ações da Necessidades em Produzir, projeção por botão. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10); const hj=loc(now), cp=hj.slice(0,7), t=now.toISOString();
 let du=new Date(now); while([0,6].includes(du.getDay())) du=new Date(du.getTime()+864e5); const dDC=loc(du); const mais=n=>loc(new Date(now.getTime()+n*864e5));
 const l={AC0005:{d:'ARGAMASSA CINZA AC3 EMB PAPEL 20 KG',sal:1,a3:200,a30:0,seg:500,ln:['Linha 1']},AC0009:{d:'ARGAMASSA CINZA PIC EMB PAPEL 20 KG',sal:1,a3:767,a30:0,seg:440,ln:['Linha 1']}};
 D['pcpbase/itens']={l,atual:{SALDO:t},em:t}; D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={atual:t,l:[['AC0005','DC',dDC,-3000]]};
 D['pcpbase/vendas']={mensal:{AC0005:{[cp]:[1000,800]}},ate:hj}; D['pcpbase/prev']={mes:{[cp]:{AC0005:20000,AC0009:1000}},est:{[cp]:{AC0005:300,AC0009:1408}}};
 D['itens/AC0005']={codigo:'AC0005',descricao:'ARGAMASSA CINZA AC3 EMB PAPEL 20 KG',linhas:['Linha 1']};
 D['ordens/7001']={num:'7001',produto:'AC0005 - ARGAMASSA CINZA AC3 EMB PAPEL 20 KG',linha:'Linha 1',data:mais(9),turno:'Dia todo',total:5000,status:'aberta',criadaEm:t};
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('anlres')); await H.dorme(1500);
 ok('Link antigo do Resumo abre "O que precisa produzir"', await p.evaluate(()=>__T.S().view)==='anlest'&&!!(await p.$('.esw-top')));
 const tabs=await p.evaluate(()=>[...document.querySelectorAll('[data-grp],.tabs [data-go]')].map(x=>x.innerText.trim()).filter(Boolean).join('|'));
 const tx=await p.evaluate(()=>(document.querySelector('.tabs')||document.querySelector('.navsub')||document.body).innerText);
 ok('Abas da Análise PCP: Produzir · Mês · Linhas · Sistema (sem Hoje, Estoque, Capacidade, Outros)', /Produzir/.test(tx)&&/Mês/.test(tx)&&/Linhas/.test(tx)&&/Sistema/.test(tx)&&!/\bHoje\b/.test(tx)&&!/Outros/.test(tx)&&!/Capacidade/.test(tx), tx.replace(/\n/g,' | ').slice(0,200));
 const fr=await p.evaluate(()=>(document.querySelector('.ao-fr')||{}).innerText||'');
 ok('Produzir mostra quando a base foi atualizada e "Ver projeção dia a dia"', /Saldo/.test(fr)&&/Atualizar base/.test(fr)&&/Ver projeção dia a dia/.test(fr), fr.replace(/\n/g,' | '));
 await p.selectOption('[data-esw="sit"]','todas'); await H.dorme(600);
 const ac=await p.evaluate(()=>{ const b=document.querySelector('tr[data-c="AC0005"] .ao-ac'); return b?{t:b.innerText,ti:b.title,id:b.dataset.id}:null; });
 ok('Ação da antiga Necessidades na linha do item ("Antecipar 7001")', ac&&/Antecipar 7001|Programar 7001/.test(ac.t)&&/7001/.test(ac.ti), JSON.stringify(ac));
 if(ac){ await p.click('tr[data-c="AC0005"] .ao-ac'); await H.dorme(900); ok('O botão abre a ordem na Programação', await p.evaluate(()=>__T.S().view)==='programacao'&&await p.evaluate(()=>String((__T.S().ord||{}).aberta||'')).then(x=>/7001/.test(x)), await p.evaluate(()=>__T.S().view)); }
 await p.evaluate(()=>__T.go('anlest')); await H.dorme(900);
 await p.click('[data-act="ao-proj"]'); await H.dorme(900);
 ok('"Ver projeção dia a dia" abre a grade, com "Voltar"', await p.evaluate(()=>__T.S().view)==='anlproj'&&!!(await p.$('.anl-hm'))&&!!(await p.$('[data-act="ao-volta"]')));
 await p.click('[data-act="ao-volta"]'); await H.dorme(700); ok('Voltar leva de novo a Produzir', await p.evaluate(()=>__T.S().view)==='anlest');
 await p.evaluate(()=>__T.go('anlace')); await H.dorme(800); ok('Acerto da projeção (link antigo) abre a Base de dados, que já tem o acerto', await p.evaluate(()=>__T.S().view)==='anlbase'&&/ACERTO DA PROJEÇÃO/i.test(await p.evaluate(()=>document.getElementById('view').innerText)));
 for(const v of ['anlrit','anlmes','anllin','anlapt']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(700); }
 ok('As outras telas continuam abrindo (Previsto × Realizado, Previsão, Carga das linhas, Painel × sistema)', await p.evaluate(()=>__T.S().view)==='anlapt');
 console.log('erros:',B.erros.filter(x=>!/404/.test(x)));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
