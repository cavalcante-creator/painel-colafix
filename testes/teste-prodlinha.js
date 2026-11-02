/* Produção → Por linha: produção por linha num período (apontamentos vivos + arquivados, sem anulados), programado, paradas, PDF. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs, hj=new Date(), cp=hj.toISOString().slice(0,7), dia=n=>{ const x=new Date(hj); x.setDate(Math.max(1,hj.getDate()-n)); x.setHours(10,0,0,0); return x.toISOString(); };
 Object.keys(D).filter(k=>k.startsWith('entregas/')||k.startsWith('paradas/')).forEach(k=>delete D[k]);
 D['entregas/a1']={ordem:'5001',num:'5001',linha:'Linha 1',em:dia(0),qtd:600}; D['entregas/a2']={ordem:'5001',num:'5001',linha:'Linha 1',em:dia(1),qtd:400};
 D['entregas/a3']={ordem:'5002',num:'5002',linha:'Linha 2',em:dia(0),qtd:300}; D['entregas/a4']={ordem:'5001',num:'5001',linha:'Linha 1',em:dia(0),qtd:999}; D['entregas/a5']={ordem:'5001',num:'5001',linha:'Linha 1',em:dia(0),qtd:-999,anula:'a4'};
 D['entregasarq/'+cp]={l:[{_id:'v1',ordem:'5001',num:'5001',linha:'Linha 1',em:dia(2),qtd:200}],em:new Date().toISOString()};
 D['paradas/p1']={linha:'Linha 2',motivo:'Falta de embalagem',inicio:new Date(Date.now()-90*60000).toISOString(),fim:new Date(Date.now()-30*60000).toISOString()};
 const {browser,page:p}=await H.abrir({viewport:{width:1440,height:1000}}); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 ok('Produção tem a aba "Por linha"', await p.evaluate(()=>{ __T.go('prodlinhas'); return true; })&&await p.evaluate(()=>__T.S().view==='prodlinhas'));
 await H.dorme(2500);
 const cards=await p.evaluate(()=>[...document.querySelectorAll('.pl-card')].map(c=>c.innerText.replace(/\s+/g,' ')));
 ok('Linha 1 = 1.200 sacos (600 + 400 + 200 arquivado; o anulado não conta)', cards.some(c=>/^Linha 1 .*1\.200\s*sacos produzidos/.test(c)), JSON.stringify(cards).slice(0,240));
 ok('Linha 2 = 300 sacos, com 1h00 parado e o motivo', cards.some(c=>/^Linha 2 .*300\s*sacos produzidos.*1h00.*Falta de embalagem/.test(c)));
 const tot=await p.evaluate(()=>(document.querySelector('.pl-tot')||{}).innerText||'');
 ok('Total do período: 1.500 sacos', /Total produzido\s*1\.500/.test(tot), tot.replace(/\n/g,' | '));
 await p.click('[data-act="pl-per"][data-v="ontem"]'); await H.dorme(2500);
 const c2=await p.evaluate(()=>[...document.querySelectorAll('.pl-card')].map(c=>c.innerText.replace(/\s+/g,' ')));
 ok('Trocar o período (ontem): Linha 1 só com os 400 de ontem', hj.getDate()<=1||c2.some(c=>/^Linha 1 .*400\s*sacos produzidos/.test(c)), JSON.stringify(c2).slice(0,200));
 await p.click('[data-act="pl-per"][data-v="mes"]'); await H.dorme(2000);
 /* 02/11: PDF no padrão dos relatórios (jsPDF, baixa direto). Com o jsPDF de teste, os textos desenhados são guardados em window.__txt */
 await p.evaluate(()=>{ window.__txt=[]; const f=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t){ window.__txt.push(String(t)); return f.apply(this,arguments); }; });
 if(process.env.JSPDF_REAL){ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('[data-act="pl-pdf"]')]); const f='/tmp/'+dl.suggestedFilename(); await dl.saveAs(f); ok('PDF de verdade: '+f, require('fs').statSync(f).size>5000, require('fs').statSync(f).size); }
 else { await p.click('[data-act="pl-pdf"]'); await H.dorme(1500);
 const sv=await p.evaluate(()=>window.__pdfSalvo||[]), t=(await p.evaluate(()=>window.__txt||[])).join(' | ');
 ok('PDF baixado com o resumo por linha e o detalhe por produto e por dia', sv.some(n=>/^Producao por linha .*\.pdf$/.test(n))&&/Produção por linha/.test(t)&&/TOTAL PRODUZIDO \| 1\.500 sc/.test(t)&&/Linha 1 \| 1\.200/.test(t)&&/Total \| 1\.500/.test(t)&&/Por produto/.test(t)&&/Dia a dia/.test(t), JSON.stringify(sv)+' '+t.slice(0,300)); }
 await p.screenshot({path:'/tmp/prodlinha.png',fullPage:false});
 await browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
