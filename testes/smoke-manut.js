const H=require('./harness'); const {seedManut}=require('./manut-seed');
(async()=>{ const {browser,page,erros}=await H.abrir(); const {d}=seedManut(); await H.preparar(page,d); await page.goto(H.BASE); await H.entrar(page,'iasmyn','senha123'); await H.dorme(2000);
 await page.evaluate(()=>__T.salvar('entregas',{ordem:'5001',num:'5001',linha:'Linha 1',em:new Date().toISOString(),por:'x',qtd:1}));
 const out=[]; for(const v of ['manmon','manres','manch','manqr','manequip','manprev','manpecas','linhatv']){ const n=erros.length; await page.evaluate(v=>__T.go(v),v); await H.dorme(350); const r=await page.evaluate(()=>({v:__T.S().view,len:document.getElementById('view').innerText.length})); out.push(v+':'+(r.v===v?'ok':'→'+r.v)+'/'+r.len+(erros.length>n?' ERRO '+erros.slice(n).join('|'):'')); }
 await page.evaluate(()=>{ __T.S().mx.eqQr='eqmix1'; __T.go('manequip'); }); await H.dorme(300); out.push('qr-equip svg:'+await page.evaluate(()=>!!document.querySelector('.man-qr svg')));
 console.log(out.join('\n')); console.log('erros:',erros.filter(x=>!/404/.test(x))); await browser.close(); })();
