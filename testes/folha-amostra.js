/* Gera uma Folha de Produção de verdade (JSPDF_REAL=1) para conferir o layout e a leitura do QR: node folha-amostra.js <saida.pdf> */
const H=require('./harness'); const fs=require('fs');
(async()=>{ const {d}=H.seed(); d.docs['ordens/5001'].rancho='4471230'; d.docs['ranchos/4471230']={numero:'4471230',criadoEm:new Date().toISOString(),ordens:[{num:'5001'}]};
 const B=await H.abrir({viewport:{width:1280,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().ordens&&__T.S().ordens.length,null,{timeout:15000}); await H.dorme(800);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.act='fp-ordem'; b.dataset.id='5001'; document.body.appendChild(b); b.click(); })]);
 await dl.saveAs(process.argv[2]); console.log('ok',process.argv[2],'erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
