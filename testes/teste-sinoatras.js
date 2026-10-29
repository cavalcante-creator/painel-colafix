/* Sino do topo: ordem atrasada que já entregou tudo sai do aviso "Ordens atrasadas" (pedido de 29/10). */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const hj=new Date(); const iso=x=>new Date(hj.getTime()-hj.getTimezoneOffset()*6e4+x*864e5).toISOString().slice(0,10);
 D['ordens/5001'].data=iso(-3); D['ordens/5001'].ant=[{qtd:1000}];   // atrasada, mas já entregou tudo
 D['ordens/5002'].data=iso(-2);                                     // atrasada de verdade
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('calendario')); await H.dorme(1200);
 const sino=async()=>{ await p.click('#tp-sino'); await H.dorme(300); const r=await p.evaluate(()=>{ const b=document.querySelector('#tp-pop [data-tp="aviso"][data-v="atrasadas"] .tp-dot'); return b?+b.textContent:0; }); await p.keyboard.press('Escape'); await H.dorme(200); return r; };
 let n=await sino(); ok('Sino conta só a ordem que ainda falta produzir', n===1, n);
 await p.evaluate(()=>{ const o=__T.S().ordens.find(x=>x.num==='5002'); o.ant=[{qtd:1000}]; __T.go('calendario'); }); await H.dorme(500);
 n=await sino(); ok('Depois de entregar tudo, o aviso some do sino', n===0, n);
 const bad=await p.evaluate(()=>document.getElementById('tp-n')&&!document.getElementById('tp-n').hidden?document.getElementById('tp-n').textContent:''); console.log('número no sino:',bad||'(nenhum)');
 console.log('erros:',B.erros.filter(x=>!/404/.test(x)));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
