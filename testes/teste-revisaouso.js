/* Revisão de uso (24/10): posto "não começou", técnico no computador de chamados, monitor do rancho sem rolagem lateral, texto da tela Chamados do gestor. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs, ago=m=>new Date(Date.now()-m*6e4).toISOString(), hj=(x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10))(new Date());
 D['ordens/5001'].data=hj; D['ordens/5002']=Object.assign({},D['ordens/5002']||{},{num:'5002',produto:'AC3001 - ARGAMASSA AC3 20KG',linha:'Linha 2',data:hj,total:1000,status:'aberta',prodSeg:[{ini:ago(300),fim:ago(200),por:'x',motivo:'teste'}]});
 D['crachas/BCDE3456']={codigo:'BCDE3456',nome:'Bruno Lima',linha:'',papel:'tecnico',ativo:true,adesivo:'777888',criadoEm:ago(999)};
 D['chamados/os-00011']={numero:11,linha:'Linha 2',defeito:'Mecânico',impacto:'parou',nome:'Ana',status:'Aberta',criado:ago(25),por:'outro'};
 for(const [u,pf] of [['posto','posto'],['chamados','chamados']]){ d.users[u+'@painel-colafix.app']={uid:'u'+u,pass:'x12345',nome:u}; D['perfis/u'+u]={nome:u,usuario:u}; D['acessos/u'+u]={perfil:pf,mods:['tablet'],locais:[],ativo:true}; }
 let B=await H.abrir({viewport:{width:1366,height:768}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'posto','x12345'); await H.dorme(3500);
 let t=await p.evaluate(()=>document.querySelector('.cq').innerText);
 ok('Posto: ordem do dia que ninguém começou aparece "Ordem de hoje · 5001 · não começou" (não "Produzindo")', /Ordem de hoje · 5001 · não começou/.test(t)&&!/Produzindo · ordem 5001/.test(t), t.slice(0,300).replace(/\n/g,'|'));
 await B.browser.close();
 B=await H.abrir({viewport:{width:1366,height:768}}); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'chamados','x12345'); await H.dorme(3000);
 await p.keyboard.type('777888',{delay:12}); await p.keyboard.press('Enter'); await H.dorme(1200); t=await p.evaluate(()=>document.querySelector('.cq').innerText);
 ok('Computador de chamados: técnico vê "Nenhum chamado aberto neste computador" e o aviso do chamado de outro lugar (não "Tudo funcionando")', /neste computador/.test(t)&&/1 chamado aberto em outro lugar/.test(t)&&!/Tudo funcionando/.test(t), t.slice(0,300).replace(/\n/g,'|'));
 await B.browser.close();
 B=await H.abrir({viewport:{width:1366,height:768}}); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3500);
 await p.evaluate(()=>__T.go('dbmon')); await H.dorme(900);
 ok('Monitor do rancho no painel (1366 com menu) sem rolagem para o lado', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2&&[...document.querySelectorAll('.megrid')].every(g=>g.scrollWidth<=g.clientWidth+2)));
 await p.evaluate(()=>__T.go('gxch')); await H.dorme(700); t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Chamados do gestor explica que as tarefas vão para o computador da manutenção', /computador da manutenção \(oficina\)/.test(t)&&!/no computador de chamados, no posto/.test(t));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
