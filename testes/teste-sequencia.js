/* Pedido 2 (24/10): Calendário → "Sugerir sequência" junta produtos parecidos no mesmo dia e linha. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs, t=new Date().toISOString();
 const loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10); const h=new Date(); h.setDate(h.getDate()+((8-h.getDay())%7||7)); const seg=loc(h); /* segunda que vem */
 Object.keys(D).filter(k=>k.startsWith('ordens/')).forEach(k=>delete D[k]);
 [['7001','AC3001 - ARGAMASSA AC3 20KG'],['7002','RJ1001 - REJUNTE FLEXIVEL CINZA 5KG'],['7003','AC3002 - ARGAMASSA AC3 CINZA 20KG'],['7004','RJ1002 - REJUNTE FLEXIVEL BRANCO 5KG']].forEach(([n,pr],i)=>{ D['ordens/'+n]={num:n,produto:pr,linha:'Linha 1',data:seg,turno:'Dia todo',total:500,status:'aberta',criadaEm:t,seq:i+1}; });
 D['ordens/7005']={num:'7005',produto:'AC3001 - ARGAMASSA AC3 20KG',linha:'Linha 2',data:seg,turno:'Dia todo',total:500,status:'aberta',criadaEm:t,seq:1};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
 await p.evaluate(sg=>{ __T.S().cal.ini=sg; __T.go('calendario'); },seg); await H.dorme(900);
 ok('Calendário tem o botão "Sugerir sequência"', !!(await p.$('[data-act="sq-abre"]')));
 await p.click('[data-act="sq-abre"]'); await H.dorme(600); let s=await p.evaluate(()=>(document.querySelector('.sq-box')||{}).innerText||'');
 ok('Sugestão: Linha 1 com "3 trocas de produto → 1" e a Linha 2 (uma ordem) fora', /Linha 1/.test(s)&&/3 trocas de produto → 1/.test(s)&&!/Linha 2/.test(s), s.slice(0,300).replace(/\n/g,' | '));
 const ordem=await p.evaluate(()=>[...document.querySelectorAll('.sq-g>div:last-child li b')].map(b=>b.textContent));
 ok('Sugerido: AC3001, AC3002, RJ1001, RJ1002 (argamassas juntas, depois os rejuntes)', ordem.join(',')==='AC3001,AC3002,RJ1001,RJ1002', ordem.join(','));
 await p.click('[data-act="sq-ok"]'); await H.dorme(1500);
 const ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const sq=['7001','7003','7002','7004'].map(n=>ds['ordens/'+n].seq);
 ok('Aplicar grava a sequência 1, 2, 3, 4 nessa ordem', sq.join(',')==='1,2,3,4', sq.join(','));
 s=await p.evaluate(()=>(document.querySelector('.sq-box')||{}).innerText||''); ok('Depois de aplicar: "a sequência desta semana já está boa"', /já está boa/.test(s), s.slice(0,160));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
