/* Programação: filtro do rancho (Entregue · Separado · Não entregue). */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs, t=new Date().toISOString();
 Object.assign(D['ordens/5001'],{rdb:{sep:{em:t,nome:'Ana'},ent:{em:t,recebidoPor:'Bia'}}});
 Object.assign(D['ordens/5002'],{rdb:{sep:{em:t,nome:'Ana'}}});
 D['ordens/5003']=Object.assign({},D['ordens/5002'],{num:'5003',rdb:{}});
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(1200);
 const nums=()=>p.evaluate(()=>[...document.querySelectorAll('[data-act="o-abrir"]')].map(r=>r.dataset.id).sort().join(','));
 const bt=await p.evaluate(()=>[...document.querySelectorAll('[data-act="pr-ran"]')].map(b=>b.innerText.replace(/\s+/g,' ').trim()).join(' | '));
 ok('Filtro "Rancho" na Programação: Todos · Entregue · Separado · Não entregue, com as quantidades', /Todos 3/.test(bt)&&/Entregue 1/.test(bt)&&/Separado 1/.test(bt)&&/Não entregue 2/.test(bt), bt);
 await p.click('[data-act="pr-ran"][data-v="ent"]'); await H.dorme(600); let n=await nums(); ok('Entregue: só a 5001', n==='5001', n);
 await p.click('[data-act="pr-ran"][data-v="sep"]'); await H.dorme(600); n=await nums(); ok('Separado: só a 5002 (separada e ainda não entregue)', n==='5002', n);
 await p.click('[data-act="pr-ran"][data-v="nao"]'); await H.dorme(600); n=await nums(); ok('Não entregue: 5002 e 5003', n==='5002,5003', n);
 await p.click('[data-act="pr-ran"][data-v=""]'); await H.dorme(600); n=await nums(); ok('Todos volta as três', n==='5001,5002,5003', n);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x)));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
