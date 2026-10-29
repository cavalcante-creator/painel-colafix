/* Pedido de 29/10: "Lys", o robozinho do modo treinamento — lições por login, espera a pessoa fazer para seguir. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const hj=new Date(), iso=new Date(hj.getTime()-hj.getTimezoneOffset()*6e4).toISOString().slice(0,10);
 D['ordens/5001'].data=iso; D['silos/c1']={saldoKg:20000,atualizadoEm:new Date().toISOString(),origem:'medicao'};
 d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 const erros=[]; let B=await H.abrir({viewport:{width:1440,height:950}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d);
 await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 ok('Sem treinamento, o robô não aparece', !(await p.evaluate(()=>{ const r=document.getElementById('rb'); return r&&!r.hidden; })));
 await p.goto(H.BASE+'?treino=1'); await H.dorme(1500); if(await p.$('#lg-e')) await H.entrar(p,'iasmyn','senha123'); await H.dorme(4500);
 const bolha=()=>p.evaluate(()=>{ const b=document.getElementById('rb-b'); return b&&!b.hidden?b.innerText.replace(/\s+/g,' '):''; });
 let t=await bolha(); ok('No treinamento o Lys se apresenta e oferece as lições do login', /Eu sou o Lys/.test(t)&&/Lançar apontamento/.test(t)&&/Receber areia ou cimento/.test(t), t);
 const ls=await p.evaluate(()=>Painel.robo.licoes()); ok('Administradora vê as lições de todas as telas', ls.includes('apont')&&ls.includes('silorec')&&ls.includes('unif'), ls.join(','));
 // lição: receber no silo
 await p.click('[data-rb="lic"][data-v="silorec"]'); await H.dorme(1200);
 t=await bolha(); ok('Começa a lição e leva para a tela certa (passo 1 de 5)', /passo 1 de 5/.test(t)&&await p.evaluate(()=>__T.S().view)==='silorec', t);
 const anel=await p.evaluate(()=>{ const r=document.getElementById('rb-ring'); return r&&!r.hidden; }); ok('Anel mostra onde tocar', anel);
 await H.dorme(1500); t=await bolha(); ok('Espera a pessoa fazer (não avança sozinho)', /passo 1 de 5/.test(t), t);
 await p.click('[data-act="sr-mat"][data-v="Cimento"]'); await H.dorme(1600); t=await bolha(); ok('Tocou no material → passo 2', /passo 2 de 5/.test(t), t);
 await p.click('[data-act="sr-silo"][data-v="c1"]'); await H.dorme(1600); t=await bolha(); ok('Tocou no silo → passo 3', /passo 3 de 5/.test(t), t);
 await p.fill('#sr-nf','555'); await p.press('#sr-nf','Enter'); await H.dorme(1400); t=await bolha(); ok('Digitou a nota (Enter) → passo 4', /passo 4 de 5/.test(t), t);
 await p.fill('#sr-q','10'); await H.dorme(700); t=await bolha(); ok('Com o campo preenchido aparece "Pronto"', /Pronto/.test(t), t);
 await p.click('[data-rb="ok"]'); await H.dorme(1200); t=await bolha(); ok('Pronto → passo 5', /passo 5 de 5/.test(t), t);
 await p.click('[data-act="sr-ok"]'); await H.dorme(2200); t=await bolha(); ok('Último passo feito → Parabéns e a próxima lição', /Parabéns/.test(t)&&/Próxima/.test(t), t);
 const srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['silos/c1'].saldoKg); ok('No treinamento o recebimento não foi gravado de verdade', srv===20000, String(srv));
 await p.click('[data-rb="menu"]'); await H.dorme(500); t=await bolha(); ok('Menu marca a lição feita (1 de N)', /1 de \d+ lições feitas/.test(t), t);
 // pular passo e parar
 await p.click('[data-rb="lic"][data-v="filtros"]'); await H.dorme(1200); t=await bolha(); ok('Passo de leitura tem "Entendi"', /Entendi/.test(t), t);
 await p.click('[data-rb="pula"]'); await H.dorme(800); t=await bolha(); ok('"Pular passo" segue para o próximo', /passo 2 de 4/.test(t), t);
 await p.click('[data-rb="para"]'); await H.dorme(400); ok('"Parar" fecha o robô', !(await bolha())&&!(await p.evaluate(()=>{ const r=document.getElementById('rb-ring'); return r&&!r.hidden; })));
 ok('Sem erros no console (administradora)', !erros.length, erros.join(' | ')); await B.browser.close();
 // RH: só as lições do RH
 B=await H.abrir({viewport:{width:1440,height:950}}); p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE+'?treino=1'); await H.entrar(p,'rh','rh1234'); await H.dorme(5000);
 const lr=await p.evaluate(()=>Painel.robo.licoes()); ok('RH vê só as lições do RH (personalizado pelo login)', lr.includes('unif')&&lr.includes('unifrh')&&!lr.includes('apont')&&!lr.includes('silorec'), lr.join(','));
 t=await p.evaluate(()=>{ const b=document.getElementById('rb-b'); return b?b.innerText:''; }); ok('Chama a pessoa pelo nome', /Oi, Stefani/.test(t), t.slice(0,80));
 ok('Sem erros no console (RH)', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
