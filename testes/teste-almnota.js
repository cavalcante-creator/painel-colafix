/* RH · Almoço/café › Solicitado × nota (04/11): solicitado = pessoas da folha do dia (lista − marcados), nota digitada pelo RH. Nomes inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const n=new Date(), hj=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'), m=hj.slice(0,7);
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{listaFolha:['Ana Souza','Bruno Lima','Carla Dias','Terceiro - Davi']},cafe:{lista:['Ana Souza','Bruno Lima']}});
  D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ANA SOUZA'},'22222222222':{n:'BRUNO LIMA'}},dias:{[hj]:{'11111111111':{p:1,a:'11:40',c:'07:10'},'22222222222':{p:1,a:'12:00'}}},imp:[]};
  D['rh/dados/almocofolha/'+hj]={dia:hj,nv:{'Carla Dias':'Não veio'},tirar:{},emit:{em:hj+'T09:00:00Z',n:1,vs:{}}};
  const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; const erros=[]; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
  await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(900);
  ok('Sem aba própria (a nota é mensal)', await p.evaluate(()=>!document.querySelector('[data-act="alm-vis"][data-v="nota"]')));
  await p.click('[data-act="alm-vis"][data-v="mes"]'); await H.dorme(1500);
  const q=()=>p.evaluate(()=>{ const c=document.querySelector('.nt-card'); return c?[...c.querySelectorAll('.nt-l')].map(x=>x.innerText.replace(/\s+/g,' ')):null; });
  const q0=await q();
  ok('Fechamento do mês: quadro Solicitado × nota com almoço e café', q0&&q0.length===2&&/Almoço/.test(q0[0])&&/Café/.test(q0[1]), JSON.stringify(q0));
  const dd=await p.evaluate(h=>{ const t=[...document.querySelectorAll('.nt-dd tbody tr')].find(r=>r.cells[0].textContent===h.slice(8)+'/'+h.slice(5,7)); return t?[...t.cells].map(x=>x.textContent):null; },hj);
  ok('Dia a dia: hoje 3 almoços (4 na lista − Carla "Não veio") e 2 cafés', dd&&dd[1]==='3'&&/^2/.test(dd[2]), JSON.stringify(dd));
  const sa=await p.evaluate(()=>+document.querySelector('.nt-l .num').innerText);
  await p.fill('[data-ntc="ta"]',String(sa+1)); await p.press('[data-ntc="ta"]','Tab'); await H.dorme(1200);
  await p.fill('[data-ntc="nf"]','1234'); await p.press('[data-ntc="nf"]','Tab'); await H.dorme(1200);
  const q1=await q();
  ok('Nota com 1 almoço a mais: diferença +1', q1&&/Diferença \+1/i.test(q1[0])&&/1 a mais na nota/.test(q1[0]), JSON.stringify(q1));
  const doc=await p.evaluate(m=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almoconota/'+m],m);
  ok('Guardado em rh/dados/almoconota/<mês> (total do mês e nº da nota)', doc&&doc.tot.a===sa+1&&doc.nf==='1234', JSON.stringify(doc));
  if(process.env.SHOT){ require('fs').mkdirSync('/tmp/sh',{recursive:true}); await p.screenshot({path:'/tmp/sh/nota.png',fullPage:true}); }
  ok('Sem erros na página', !erros.length, erros.join(' | '));
  await B.fechar?.(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU '+f:'PASSOU tudo ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.log('FALHOU erro',e); process.exit(1); });
