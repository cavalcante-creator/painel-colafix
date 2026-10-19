/* Avisos por linha nas TVs: a produção publica em Telas de TV para uma linha; a faixa mostra a etiqueta da linha; TV de outra linha não mostra. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=seedManut(x=>x);
 let B=await H.abrir({viewport:{width:1500,height:950}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>__T.go('tvapres')); await H.dorme(1200);
 ok('Telas de TV tem o editor de avisos', await p.evaluate(()=>!!document.querySelector('[data-act="av-novo"]')));
 await p.click('[data-act="av-novo"]'); await H.dorme(300); await p.fill('#av-t','Troca de cor às 14h'); await p.click('[data-act="av-ln"][data-v="Linha 2"]'); await H.dorme(300); await p.click('[data-act="av-ok"]'); await H.dorme(1200);
 const salvo=await p.evaluate(()=>(__T.S().avTV||[]).map(a=>a.t+'|'+(a.linhas||[]).join(',')));
 ok('Aviso salvo só para a Linha 2', salvo.includes('Troca de cor às 14h|Linha 2'), salvo.join(' ; '));
 await p.click('[data-act="apr-abre"][data-v="tvfab"]'); await H.dorme(2000);
 const fx=await p.evaluate(()=>{ const t=document.querySelector('.tvb'); return {txt:t?t.innerText:'',et:t&&/LINHA 2/.test(t.querySelector('.tvb-tx small').innerText)?1:0}; });
 ok('Na TV, o aviso aparece com a etiqueta LINHA 2', /LINHA 2/.test(fx.txt)&&/Troca de cor/.test(fx.txt)&&fx.et>=1, fx.txt.replace(/\n/g,' ').slice(0,120));
 const dd=JSON.parse(JSON.stringify(d)); await B.browser.close();
 B=await H.abrir({viewport:{width:1500,height:950}}); p=B.page; await H.preparar(p,d); await p.goto(H.BASE+'?linhas=Linha%201'); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>{ __T.S().avTV=[{id:'x1',t:'Troca de cor às 14h',tipo:'info',linhas:['Linha 2']},{id:'x2',t:'Reunião geral às 15h',tipo:'seg',linhas:[]}]; }); await p.evaluate(()=>__T.go('tvapres')); await H.dorme(600);
 await p.click('[data-act="apr-abre"][data-v="tvfab"]'); await H.dorme(2000);
 const so=await p.evaluate(()=>{ const t=document.querySelector('.tvb'); return t?t.innerText:''; });
 ok('TV aberta só para a Linha 1: mostra o aviso geral e não o da Linha 2', /Reunião geral/.test(so)&&!/Troca de cor/.test(so), so.replace(/\n/g,' ').slice(0,120));
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
