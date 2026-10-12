const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const ord=(num,linha,data)=>({num,produto:'AC3001 - ARGAMASSA AC3 20KG',linha,data,turno:'Dia todo',total:100,status:'aberta',criadaEm:'2026-10-01T10:00:00.000Z'});
(async()=>{ const base=()=>{ const {d}=seedManut(); const D=d.docs; delete D['ordens/5001']; delete D['ordens/5002'];
   D['ordens/7013']=ord('7013','Linha 1','2026-10-13'); D['ordens/7014']=ord('7014','Linha 2','2026-10-14');
   d.users['almox@painel-colafix.app']={uid:'uALX',pass:'alx123',nome:'Joana'}; D['perfis/uALX']={nome:'Joana',usuario:'almox'}; D['acessos/uALX']={perfil:'almoxpmx',mods:['premix','almox'],locais:['a3'],ativo:true}; return d; };
 const abrir=async(u,s)=>{ const B=await H.abrir(); await B.ctx.clock.setFixedTime(new Date('2026-10-09T10:00:00')); await H.preparar(B.page,base()); await B.page.goto(H.BASE); await H.entrar(B.page,u,s); await H.dorme(2800); return B; };
 const tem=(t,n)=>new RegExp('\\b'+n+'\\b').test(t);
 // sexta 09/10 · segunda 12/10 é feriado
 let B=await abrir('operador','ope123'); let p=B.page; await p.evaluate(()=>__T.go('diario')); await H.dorme(500);
 const lab=await p.evaluate(()=>[...document.querySelectorAll('[data-act="db-dia"]')].map(b=>b.innerText.replace(/\s+/g,' ').trim()));
 await p.click('[data-act="db-dia"]:nth-of-type(2)'); await H.dorme(400); let r=await p.evaluate(()=>({dia:__T.S().dbo.dia,t:document.getElementById('view').innerText}));
 ok('Produção, sexta: o 2º botão pula o fim de semana e o feriado (12/10) e vai para terça 13/10', r.dia==='2026-10-13'&&lab.some(l=>/Terça/.test(l))&&tem(r.t,'7013')&&!tem(r.t,'7014'), 'botões: '+lab.join(' | ')+' · dia '+r.dia);
 await B.browser.close();
 B=await abrir('almox','alx123'); p=B.page; await p.evaluate(()=>__T.go('diario')); await H.dorme(500);
 let b0=await p.evaluate(()=>(document.querySelector('.db-ent')||{}).innerText||'');
 await p.click('[data-act="db-dia"]:nth-of-type(2)'); await H.dorme(400); r=await p.evaluate(()=>({dia:__T.S().dbo.dia,b:(document.querySelector('.db-ent')||{}).innerText||'',t:document.getElementById('view').innerText}));
 ok('Almox, sexta: "Hoje" entrega a produção de terça 13/10; o 2º botão entrega a de quarta 14/10 (não repete a de terça)', /terça, 13\/10/.test(b0)&&r.dia==='2026-10-13'&&/quarta, 14\/10/.test(r.b)&&tem(r.t,'7014'), b0.split('\n')[0]+' → '+r.b.split('\n')[0]);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
