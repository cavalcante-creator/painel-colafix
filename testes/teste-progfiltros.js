/* Programação: filtros "Atrasadas" e "Família" (pedidos de 28/10). */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const hj=new Date(); const iso=x=>new Date(hj.getTime()-hj.getTimezoneOffset()*6e4+x*864e5).toISOString().slice(0,10);
 D['ordens/5001'].data=iso(-3);                      // atrasada
 D['ordens/5002'].data=iso(2);                       // no prazo
 D['ordens/5003']=Object.assign({},D['ordens/5002'],{num:'5003',produto:'RJ1001 - REJUNTE FLEXIVEL 1KG',data:iso(-1)}); // atrasada, outra família
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(1200);
 const nums=()=>p.evaluate(()=>[...document.querySelectorAll('[data-act="o-abrir"]')].map(r=>r.dataset.id).sort().join(','));
 const at=await p.evaluate(()=>{ const b=document.querySelector('[data-act="p29-atr"]'); return b?b.innerText.replace(/\s+/g,' ').trim():''; });
 ok('Botão "Atrasadas" com a quantidade', /Atrasadas 2/.test(at), at);
 const fo=await p.evaluate(()=>[...document.querySelectorAll('#p29-fam option')].map(o=>o.textContent).join(' | '));
 ok('Lista de famílias com a quantidade', /ARGAMASSA AC3 \(2\)/.test(fo)&&/REJUNTE FLEXIVEL \(1\)/.test(fo), fo);
 let n=await nums(); ok('Sem filtro: as três', n==='5001,5002,5003', n);
 await p.click('[data-act="p29-atr"]'); await H.dorme(600); n=await nums(); ok('Atrasadas: 5001 e 5003', n==='5001,5003', n);
 await p.selectOption('#p29-fam','ARGAMASSA AC3'); await H.dorme(600); n=await nums(); ok('Atrasadas + família argamassa: só a 5001', n==='5001', n);
 await p.click('[data-act="p29-atr"]'); await H.dorme(600); n=await nums(); ok('Só a família argamassa: 5001 e 5002', n==='5001,5002', n);
 const lf=await p.$('[data-act="o-limpar-filtros"]'); ok('Aparece "limpar filtros"', !!lf);
 if(lf){ await lf.click(); await H.dorme(600); } n=await nums(); ok('Limpar filtros volta as três', n==='5001,5002,5003', n);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x)));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
