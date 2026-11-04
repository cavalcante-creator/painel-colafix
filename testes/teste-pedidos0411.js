/* Pedidos de ajuste de 04/11 (js/79): busca do topo no RH, itens inativos fora do "O que precisa produzir", capacidade do ensacado em fardos. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10), hj=loc(now), t=now.toISOString();
 d.users['ju@painel-colafix.app']={uid:'uJU',pass:'ju1234',nome:'Juliana RH'}; D['perfis/uJU']={nome:'Juliana RH',usuario:'ju'}; D['acessos/uJU']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 D['rh/dados/funcionarios/f1']={nome:'Carla Mendes',setor:'Linha 1',funcao:'Operadora',status:'Ativo',tipo:'CLT',empresa:'COLAFIX',admissao:'2024-03-01'};
 /* ensacado de 1 kg, fardo de 20; capacidade da linha 500 por dia */
 D['config/geral'].capacidade=Object.assign({},D['config/geral'].capacidade||{},{'Linha 1':500});
 D['itens/M00010']={codigo:'M00010',descricao:'ENSACADO REJUNTE BRANCO 1 KG',unidade:'UN',fardo:20,linhas:['Linha 1']};
 Object.keys(D).filter(k=>/^ordens\//.test(k)).forEach(k=>{ D[k].data='2099-01-05'; });
 D['ordens/7001']={num:'7001',produto:'M00010 - ENSACADO REJUNTE BRANCO 1 KG',linha:'Linha 1',data:hj,turno:'Dia todo',total:4000,status:'aberta',criadaEm:t};
 /* base da análise com dois itens; o AC0030 vai ser desativado */
 D['pcpbase/itens']={l:{AC0005:{d:'ARGAMASSA CINZA AC3 20 KG',a3:50,a30:0,sal:1,trep:6,ln:['Linha 1']},AC0030:{d:'ARGAMASSA POZOSUL AC1 20 KG',a3:40,a30:0,sal:1,trep:5,ln:['Linha 1']}},atual:{SALDO:t},em:t};
 D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={atual:t,l:[['AC0005','DC',hj,-300],['AC0030','DC',hj,-300]]};
 D['pcpbase/vendas']={mensal:{}}; D['pcpbase/prev']={mes:{},est:{},mesEm:{}};
 D['itens/AC0030']={codigo:'AC0030',descricao:'ARGAMASSA POZOSUL AC1 20 KG',ativo:false,linhas:['Linha 1']};
 let B=await H.abrir({viewport:{width:1440,height:1000}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
 /* 3 · capacidade em fardos */
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(1200);
 const C=await p.evaluate(()=>{ const g=[...document.querySelectorAll('.ogrp')].find(x=>/Linha 1/.test(x.innerText)); return {txt:g?g.innerText.replace(/\s+/g,' '):'',over:g?g.classList.contains('over'):null,q:Painel.p04.capQtd(__T.S().ordens.find(o=>o.num==='7001'))}; });
 ok('Ensacado de 4.000 unidades (fardo de 20) conta 200 na capacidade de 500: sem "acima da capacidade"', C.q===200&&C.over===false&&!/acima da capacidade/.test(C.txt)&&/200 \/ 500/.test(C.txt), JSON.stringify(C));
 await p.evaluate(()=>__T.go('calendario')); await H.dorme(1000);
 const cal=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Calendário também não acusa acima da capacidade', !/acima da capacidade|acima do real/i.test(cal.split('\n').filter(l=>/acima/i.test(l)).join(' ')) , cal.split('\n').filter(l=>/acima/i.test(l)).join(' | '));
 /* 2 · item inativo */
 await p.evaluate(()=>{ __T.S().esw&&(__T.S().esw.sit=''); __T.go('anlest'); }); await H.dorme(2000);
 const tela=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('"O que precisa produzir" mostra o AC0005 e não o AC0030 (inativo em Ajustes › Itens)', /AC0005/.test(tela)&&!/AC0030/.test(tela), (tela.match(/AC00\d\d/g)||[]).join(','));
 await p.evaluate(async()=>{ await __T.S().db.doc('itens/AC0030').update({ativo:true}); }); await H.dorme(1500); await p.evaluate(()=>__T.go('anlest')); await H.dorme(1200);
 const tela2=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Reativado, o AC0030 volta', /AC0030/.test(tela2), (tela2.match(/AC00\d\d/g)||[]).join(','));
 const er1=B.erros.filter(x=>!/404/.test(x)); await B.browser.close();
 /* 1 · busca do topo no RH */
 B=await H.abrir({viewport:{width:1440,height:900}}); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'ju','ju1234'); await H.dorme(4500);
 await p.click('#tp-busca'); await H.dorme(400);
 const ph=await p.evaluate(()=>({ph:(document.getElementById('tp-q')||{}).placeholder,ti:document.getElementById('tp-busca').title}));
 ok('RH: o exemplo da busca do topo fala de pessoa, tela e ação do RH (sem ordem/rancho)', /RH/.test(ph.ph)&&!/rancho|ordem|PMX/i.test(ph.ph+ph.ti), JSON.stringify(ph));
 await p.fill('#tp-q','carla'); await p.evaluate(()=>document.getElementById('tp-q').dispatchEvent(new Event('input',{bubbles:true}))); await H.dorme(500);
 const r=await p.evaluate(()=>document.getElementById('tp-res').innerText);
 ok('RH: buscar "carla" acha a pessoa', /Carla Mendes/.test(r), r.replace(/\n/g,'|'));
 await p.keyboard.press('Enter'); await H.dorme(1200);
 const v=await p.evaluate(()=>({v:__T.S().view,t:document.getElementById('view').innerText.slice(0,400)}));
 ok('Enter abre a pessoa', /Carla Mendes/.test(v.t)&&/^rh/.test(v.v), JSON.stringify(v).slice(0,200));
 const er2=B.erros.filter(x=>!/404/.test(x)); ok('Sem erro de script', !er1.length&&!er2.length, er1.concat(er2).join(' | '));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
