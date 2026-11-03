/* RH · Almoço/café: o café controlado como o almoço (03/11): escolha Almoço | Café na tela, por dia, justificar/corrigir, valor e desconto
   próprios do café, fechamento do mês e fechamento para a folha com o café. Nomes inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
const n=new Date(), hj=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'), m=hj.slice(0,7);
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{fim:'00:01',cafeAte:'00:01',valor:20,valorDesc:5}});
  D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ANA SOUZA'},'22222222222':{n:'BRUNO LIMA'},'33333333333':{n:'CARLA DIAS'}},
    dias:{[hj]:{'11111111111':{p:1,c:'07:20',a:'11:40'},'22222222222':{p:1,a:'12:00'},'33333333333':{p:1,c:'07:10'}}},imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept('teste do café')); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
  const abre=async()=>{ await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(700); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; },hj); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1000); };
  await abre();
  const t0=await p.evaluate(()=>document.querySelector('.alm-dt').innerText.replace(/\s+/g,' '));
  ok('Almoço continua como antes (2 almoçaram, 1 sem justificativa)', /2 almoçaram/.test(t0)&&/1 sem justificativa/.test(t0), t0);
  ok('Escolha Almoço | Café no alto da tela', await p.evaluate(()=>!!document.querySelector('.alm-ref [data-v="cafe"]')));
  await p.click('.alm-ref [data-v="cafe"]'); await H.dorme(800);
  const t1=await p.evaluate(()=>({dt:document.querySelector('.alm-dt').innerText.replace(/\s+/g,' '),nao:(document.querySelector('.alm-bl.nao')||{}).innerText||'',sim:(document.querySelector('.alm-v2s')||{}).innerText||'',k:(document.querySelector('.alm-v2k')||{}).innerText.replace(/\s+/g,' '),bars:[...document.querySelectorAll('.alm-fbar>div>b')].map(b=>b.textContent)}));
  ok('Café por dia: 2 tomaram café (Ana e Carla), Bruno sem justificativa', /2 tomaram café/.test(t1.dt)&&/1 sem justificativa/.test(t1.dt)&&/BRUNO|Bruno/i.test(t1.nao)&&/Ana/i.test(t1.sim)&&/Carla/i.test(t1.sim)&&!/almo[cç]/i.test(t1.dt), JSON.stringify(t1).slice(0,400));
  if(process.env.SHOT){ require('fs').mkdirSync('/tmp/sh',{recursive:true}); await p.screenshot({path:'/tmp/sh/cafectl.png'}); }
  ok('Folhas de assinatura continuam do almoço e do café', t1.bars.length===2&&/almoço/.test(t1.bars[0])&&/café/.test(t1.bars[1]), JSON.stringify(t1.bars));
  /* valor e desconto do café (Diretoria) */
  await p.evaluate(()=>__T.go('rhalmdir')); await H.dorme(1000);
  ok('Diretoria abre no café com os campos do café', await p.evaluate(()=>/Valor do café/.test(document.getElementById('view').innerText)&&!!document.querySelector('.alm-ref [data-v="cafe"][aria-pressed="true"]')));
  await p.fill('#alm-valor','4,50'); await p.fill('#alm-vdesc','3'); await p.click('[data-act="alm-valor"]'); await H.dorme(800);
  const cfg=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/config'].almoco);
  ok('Valor e desconto do café ficam separados do almoço', cfg.valorCafe===4.5&&cfg.valorDescCafe===3&&cfg.valor===20&&cfg.valorDesc===5, JSON.stringify(cfg));
  const fe=await p.evaluate(m=>{ const A=window.RHAlmoco; return A.fechamento(A._A.ctx,m); },m);
  ok('Fechamento: almoço e café com descontos próprios (Carla 1×5 no almoço; Bruno 1×3 no café)', fe&&fe.alm['33333333333'].sj===1&&fe.alm['33333333333'].desc===5&&fe.cafe['22222222222'].sj===1&&fe.cafe['22222222222'].desc===3&&fe.cafe['11111111111'].alm===1, JSON.stringify(fe&&{a:fe.alm,c:fe.cafe}).slice(0,400));
  /* corrigir o café do Bruno: só no café */
  await abre(); await p.click('.alm-bl.nao [data-act="alm-aj"][data-k="22222222222"]'); await H.dorme(900);
  const aj=await p.evaluate(m=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almocoaj/'+m],m);
  ok('Corrigir no café grava a chave do café (cafe:dia_cpf)', aj&&aj.aj&&aj.aj['cafe:'+hj+'_22222222222']&&aj.aj['cafe:'+hj+'_22222222222'].v==='sim'&&!aj.aj[hj+'_22222222222'], JSON.stringify(aj&&aj.aj));
  await p.evaluate(()=>window.RHAlmoco._A.aj); await H.dorme(800);
  const fe2=await p.evaluate(m=>{ const A=window.RHAlmoco; return A.fechamento(A._A.ctx,m); },m);
  ok('Depois da correção: Bruno sem desconto no café e o almoço não muda', fe2.cafe['22222222222'].sj===0&&fe2.alm['22222222222'].alm===1&&fe2.alm['33333333333'].sj===1, JSON.stringify(fe2&&{a:fe2.alm['22222222222'],c:fe2.cafe['22222222222']}));
  /* fechamento do mês no café */
  await p.click('[data-act="alm-vis"][data-v="mes"]'); await H.dorme(800);
  ok('Fechamento do mês no café (grade com o café)', await p.evaluate(()=>/caf[eé]/i.test(document.querySelector('.alm-tw')?document.getElementById('view').innerText:'')&&!/Almoços/.test((document.querySelector('.alm-tw')||{}).innerText||'')));
  /* fechamento para a folha */
  await p.evaluate(()=>__T.go('rhfech')); await H.dorme(2000);
  ok('Fechamento para a folha mostra o café', await p.evaluate(()=>/desconto do café/.test((document.querySelector('.rh-fech')||{}).innerText||'')));
  /* 03/11: com a lista do café, só quem está na folha do café conta no café */
  await p.evaluate(async()=>{ const db=window.Painel.db(); const g=await db.doc('rh/config').get(); const x=g.data()||{}; await db.doc('rh/config').set(Object.assign({},x,{cafe:Object.assign({},x.cafe||{},{lista:['Ana Souza','Bruno Lima']})})); });
  await H.dorme(800); await abre(); await p.click('.alm-ref [data-v="cafe"]').catch(()=>{}); await H.dorme(800);
  const t2=await p.evaluate(()=>document.getElementById('view').innerText);
  const t2d=await p.evaluate(()=>document.querySelector('.alm-dt').innerText.replace(/\s+/g,' '));
  ok('Café com lista: Carla (fora da folha do café) não aparece', !/CARLA|Carla/i.test(t2.split('Folha')[0]||t2)&&/2 tomaram café/.test(t2d)&&/0 sem justificativa/.test(t2d), t2d);
  const fe3=await p.evaluate(m=>window.RHAlmoco.fechamento(window.RHAlmoco._A.ctx,m),m);
  ok('Fechamento do café só com quem está na folha; almoço com todos', fe3&&!fe3.cafe['33333333333']&&fe3.cafe['11111111111']&&fe3.alm['33333333333'], JSON.stringify(fe3&&{c:Object.keys(fe3.cafe),a:Object.keys(fe3.alm)}));
  await p.click('.alm-ref [data-v="alm"]').catch(()=>{}); await H.dorme(600);
  ok('Almoço com a lista do café continua mostrando a Carla', /CARLA|Carla/i.test(await p.evaluate(()=>document.getElementById('view').innerText)));
  /* almoço também: com a lista do almoço (Ana e Carla), o Bruno sai do almoço */
  await p.evaluate(async()=>{ const db=window.Painel.db(); const g=await db.doc('rh/config').get(); const x=g.data()||{}; await db.doc('rh/config').set(Object.assign({},x,{almoco:Object.assign({},x.almoco||{},{listaFolha:['Ana Souza','Carla Dias']})})); });
  await H.dorme(800); await abre(); await p.click('.alm-ref [data-v="alm"]').catch(()=>{}); await H.dorme(800);
  const fe4=await p.evaluate(m=>window.RHAlmoco.fechamento(window.RHAlmoco._A.ctx,m),m);
  ok('Almoço com lista: só Ana e Carla no almoço; café segue a lista do café', fe4&&Object.keys(fe4.alm).sort().join()==='11111111111,33333333333'&&Object.keys(fe4.cafe).sort().join()==='11111111111,22222222222', JSON.stringify(fe4&&{a:Object.keys(fe4.alm),c:Object.keys(fe4.cafe)}));
  const t4=await p.evaluate(()=>document.querySelector('.alm-dt').innerText.replace(/\s+/g,' '));
  ok('Almoço por dia com lista: 1 almoçou (Ana), Carla sem justificativa', /1 almo/.test(t4)&&/1 sem justificativa/.test(t4), t4);
  console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
