/* RH · Almoço/café › Solicitado × nota (04/11): solicitado = pessoas da folha do dia (lista − marcados), nota digitada pelo RH. Nomes inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const n=new Date(), hj=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'), m=hj.slice(0,7);
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{listaFolha:['Ana Souza','Bruno Lima','Carla Dias','Terceiro - Davi']},cafe:{lista:['Ana Souza','Bruno Lima']}});
  D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ANA SOUZA'},'22222222222':{n:'BRUNO LIMA'}},dias:{[hj]:{'11111111111':{p:1,a:'11:40',c:'07:10'},'22222222222':{p:1,a:'12:00'}}},imp:[]};
  D['rh/dados/almocofolha/'+hj]={dia:hj,nv:{'Carla Dias':'Não veio'},tirar:{},emit:{em:hj+'T09:00:00Z',n:1,vs:{}}};
  const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; const erros=[]; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
  await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(900);
  ok('Aba "Solicitado × nota" no Almoço/café', await p.evaluate(()=>!!document.querySelector('[data-act="alm-vis"][data-v="nota"]')));
  await p.click('[data-act="alm-vis"][data-v="nota"]'); await H.dorme(1500);
  const lin=()=>p.evaluate(h=>{ const i=document.querySelector(`[data-nt="${h}|a"]`); if(!i) return null; const tds=[...i.closest('tr').querySelectorAll('td')].map(x=>x.innerText.trim()); return tds; },hj);
  const r0=await lin();
  ok('Hoje: almoço solicitado 3 (4 na lista − Carla "Não veio"), café 2', r0&&r0[1]==='3'&&/^2/.test(r0[4]), JSON.stringify(r0));
  await p.fill(`[data-nt="${hj}|a"]`,'4'); await p.press(`[data-nt="${hj}|a"]`,'Enter'); await H.dorme(400);
  await p.fill(`[data-nt="${hj}|c"]`,'2'); await p.press(`[data-nt="${hj}|c"]`,'Tab'); await H.dorme(1500);
  const r1=await lin();
  ok('Nota com 4 almoços: diferença +1 em vermelho; café 2 bate', r1&&r1[3]==='+1'&&/bate/.test(r1[6]), JSON.stringify(r1));
  const doc=await p.evaluate(m=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almoconota/'+m],m);
  ok('Guardado em rh/dados/almoconota/<mês>', doc&&doc.dias[hj].a===4&&doc.dias[hj].c===2, JSON.stringify(doc));
  const k=await p.evaluate(()=>document.querySelector('.nt-k').innerText.replace(/\s+/g,' '));
  ok('Quadros: almoços na nota e diferença', /Almoços na nota 4/i.test(k)&&/1 a mais na nota · nos 1 dia com nota/i.test(k)&&/Diferença no café 0/i.test(k), k);
  await p.click('[data-act="alm-ntpdf"]'); await H.dorme(2500);
  ok('Baixa o PDF', await p.evaluate(()=>/Almoco-cafe-nota/.test(window.__rrUltimoPdf||'')), await p.evaluate(()=>window.__rrUltimoPdf));
  if(process.env.SHOT){ require('fs').mkdirSync('/tmp/sh',{recursive:true}); await p.screenshot({path:'/tmp/sh/nota.png',fullPage:true}); }
  ok('Sem erros na página', !erros.length, erros.join(' | '));
  await B.fechar?.(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU '+f:'PASSOU tudo ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.log('FALHOU erro',e); process.exit(1); });
