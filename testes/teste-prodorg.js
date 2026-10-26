/* Produção no visual novo: menu (Painel primeiro), Painel da produção, Indicadores (+PDF), Paradas com resumo em cima da tela de hoje. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
const ago=m=>new Date(Date.now()-m*60000).toISOString();
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 D['paradas/p1']={linha:'Linha 2',motivo:'Falta de cimento',inicio:ago(30),fim:null};
 D['paradas/p2']={linha:'Linha 1',motivo:'Ajuste de máquina',inicio:ago(200),fim:ago(170)};
 const B=await H.abrir({viewport:{width:1500,height:950}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(900);
 const abas=await p.evaluate(()=>[...document.querySelectorAll('.tabs a, .tabs button, nav.tabs *')].map(x=>(x.innerText||'').trim()).filter(Boolean));
 /* desde 26/10 a administradora vê só Painel · Programação · Calendário · Conferir apontamentos; os indicadores ficam em Relatórios (teste-prodmenu.js) */
 ok('Menu da Produção: Painel primeiro (administradora: só Painel · Programação · Calendário · Conferir apontamentos)', abas[0]==='Painel'&&abas[1]==='Programação'&&abas.join('|')==='Painel|Programação|Calendário|Conferir apontamentos', abas.slice(0,8).join(' · '));
 await p.evaluate(()=>__T.go('prodpainel')); await H.dorme(1200);
 const pn=await p.evaluate(()=>({k:[...document.querySelectorAll('.mo-k')].map(k=>k.innerText.replace(/\n/g,' ')),ln:document.querySelectorAll('.pd-ln').length,par:(document.querySelector('.mo-col')||{}).innerText||''}));
 ok('Painel da produção: números do dia, uma linha por linha da fábrica e a parada aberta (Linha 2 · falta de cimento)', pn.k.some(x=>/Produzido hoje/.test(x))&&pn.k.some(x=>/^1 Linha parada/.test(x))&&pn.ln>=2&&/Linha 2[\s\S]*Falta de cimento/.test(pn.par), pn.k.join(' | ')+' · linhas '+pn.ln);
 await p.evaluate(()=>__T.go('paradas')); await H.dorme(1000);
 const pa=await p.evaluate(()=>({res:[...document.querySelectorAll('.mo-k')].map(k=>k.innerText.replace(/\n/g,' ')),h1:(document.querySelector('#view h1')||{}).innerText,btns:document.querySelectorAll('#view button').length}));
 ok('Paradas: resumo (1 agora, tempo parado, motivo) em cima da tela de hoje, que continua com os botões', pa.res.some(x=>/^1 Paradas agora/.test(x))&&pa.res.some(x=>/Motivo que mais para/.test(x))&&/Paradas/.test(pa.h1||'')&&pa.btns>3, pa.res.join(' | ')+' · botões '+pa.btns);
 await p.evaluate(()=>__T.go('prodind')); await H.dorme(1200);
 const ind=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Indicadores da produção abrem (meta do mês ou aviso de previsão), com tempo parado por motivo', /Indicadores da produção/.test(ind)&&(/Da meta do mês/.test(ind)||/Sem previsão/.test(ind)), ind.slice(0,160).replace(/\n/g,' | '));
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(1000);
 const pg=await p.evaluate(()=>({nova:!!document.querySelector('[data-act="ord-nova"],[data-act="nova-ordem"]')||/Nova ordem/.test(document.getElementById('view').innerText),prev:/Nova previsão/.test(document.getElementById('view').innerText),ran:/Ranchos/.test(document.getElementById('view').innerText)}));
 ok('Programação mantém Nova ordem, Nova previsão e Ranchos', pg.nova&&pg.prev&&pg.ran, JSON.stringify(pg));
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
