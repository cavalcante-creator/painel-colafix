/* Monitor do rancho em janela separada (para arrastar para a segunda tela) */
const H=require('./harness'); const ok=(n,c,d)=>console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):''));
(async()=>{ const {d}=H.seed(); const B=await H.abrir(); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().acs&&__T.S().acs.pronto,null,{timeout:15000}); await H.dorme(600);
 await p.evaluate(()=>__T.go('dbmon')); await H.dorme(500);
 const tem=await p.$('[data-act="jan-mon"]'); ok('O monitor tem o botão "Abrir em outra janela"', !!tem);
 const [w]=await Promise.all([B.ctx.waitForEvent('page'),p.click('[data-act="jan-mon"]')]);
 await w.waitForLoadState(); await w.waitForFunction(()=>window.__T&&__T.S().view==='dbmon',null,{timeout:20000}); await H.dorme(800);
 const r=await w.evaluate(()=>({url:location.search,side:getComputedStyle(document.querySelector('.side')||document.body).display,t:document.getElementById('view').innerText.slice(0,80),btn:!!document.querySelector('[data-act="jan-mon"]')&&getComputedStyle(document.querySelector('[data-act="jan-mon"]')).display!=='none',ls:localStorage.getItem('colafix.monitor')}));
 ok('A janela nova abre direto no monitor, sem o menu, logada com a mesma conta', /janela=monitor/.test(r.url)&&r.side==='none'&&/Ranchos/.test(r.t)&&!r.btn, JSON.stringify(r));
 await w.evaluate(()=>__T.go('programacao')); await H.dorme(300); const v=await w.evaluate(()=>__T.S().view);
 ok('A janela do monitor continua no monitor', v==='dbmon', v);
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(300); const v2=await p.evaluate(()=>__T.S().view);
 ok('A janela principal continua livre para usar outras telas', v2==='programacao', v2);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
