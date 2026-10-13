/* Telas numa janela separada (para arrastar para a segunda tela) e logo nas telas */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const ok=(n,c,d)=>console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):''));
const PASTA='/tmp/claude-0/-home-claude-painel-colafix/61589a4a-1eae-5b21-a43a-6eee19e482cd/scratchpad/';
(async()=>{ const {d}=seedManut(); const B=await H.abrir({viewport:{width:1440,height:860}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().acs&&__T.S().acs.pronto,null,{timeout:15000}); await H.dorme(600);
 const bts={}; for(const v of ['dbmon','tvfab','tvapres','manmon','linhatv','programacao']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(400); bts[v]=await p.evaluate(()=>{ const b=document.getElementById('jan-bt'); return b?b.dataset.v:''; }); }
 ok('Botão "Abrir em outra janela" nas telas de monitor/TV (e não nas outras)', bts.dbmon==='dbmon'&&bts.tvfab==='tvfab'&&bts.tvapres==='tvapres'&&bts.manmon==='manmon'&&bts.linhatv==='linhatv'&&!bts.programacao, JSON.stringify(bts));
 const lg={}; for(const v of ['manmon','linhatv']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(400); lg[v]=await p.evaluate(()=>!!document.querySelector('#view .mdlogo,#view .jan-logo')); }
 ok('Logo no painel da manutenção e na tela da linha', lg.manmon&&lg.linhatv, JSON.stringify(lg));
 for(const v of ['dbmon','manmon']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(400);
   const [w]=await Promise.all([B.ctx.waitForEvent('page'),p.click('#jan-bt')]); await w.waitForLoadState(); await w.waitForFunction(v=>window.__T&&__T.S().view===v,v,{timeout:20000}); await H.dorme(900);
   const r=await w.evaluate(()=>({url:location.search,side:getComputedStyle(document.querySelector('.side')||document.body).display,bt:!!document.getElementById('jan-bt'),t:document.getElementById('view').innerText.slice(0,60)}));
   await w.screenshot({path:PASTA+'jan_'+v+'.png'});
   await w.evaluate(()=>__T.go('programacao')); await H.dorme(300); const fica=await w.evaluate(()=>__T.S().view);
   ok('Janela de '+v+': abre direto na tela, sem menu, e não sai dela', r.side==='none'&&!r.bt&&fica===v, JSON.stringify(r)+' fica='+fica); await w.close(); }
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(300);
 ok('A janela principal continua livre para usar outras telas', await p.evaluate(()=>__T.S().view)==='programacao');
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
