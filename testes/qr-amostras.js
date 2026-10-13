/* Gera os PDFs de verdade com QR (folha, crachás, adesivos, QR das linhas, QR dos equipamentos): JSPDF_REAL=1 node qr-amostras.js <pasta> */
const H=require('./harness'); const {seedManut}=require('./manut-seed');
(async()=>{ const out=process.argv[2]; const {d}=seedManut(); const D=d.docs;
 D['ordens/5001'].rancho='4471230'; D['ranchos/4471230']={numero:'4471230',criadoEm:new Date().toISOString(),ordens:[{num:'5001'}]};
 D['crachas/ANAS2345']={codigo:'ANAS2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true};
 D['crachas/PEDR6789']={codigo:'PEDR6789',nome:'Pedro Técnico',linha:'*',papel:'tecnico',ativo:true};
 const B=await H.abrir({viewport:{width:1280,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().ordens&&__T.S().ordens.length,null,{timeout:15000}); await H.dorme(800);
 const baixa=async(nome,act,id,view)=>{ if(view){ await p.evaluate(v=>__T.go(v),view); await H.dorme(800); }
   const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.evaluate(([a,i])=>{ const b=document.createElement('button'); b.dataset.act=a; if(i!=null) b.dataset.id=i; document.body.appendChild(b); b.click(); },[act,id])]);
   await dl.saveAs(out+'/'+nome+'.pdf'); console.log('ok',nome); };
 await baixa('folha','fp-ordem','5001');
 await baixa('crachas','cr-pdf-todos',null,'mancrachas');
 await baixa('adesivos','cr-ades-todos',null,'mancrachas');
 await baixa('linhas','man-qr-imp',null,'manqr');
 await baixa('equipamentos','mx-eq-qrpdf','',null);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
