/* Almoço: durante o horário do almoço de hoje, quem veio e ainda não passou no refeitório = "ainda não almoçou" (não "sem justificativa"). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,220):'')); };
const n=new Date(), hj=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'), m=hj.slice(0,7);
(async()=>{ for(const [cen,fim] of [['almoço em andamento','23:59'],['almoço encerrado','00:01']]){
   const {d}=seedManut(x=>x); const D=d.docs;
   D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{fim}});
   D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ANA SOUZA'},'22222222222':{n:'BRUNO LIMA'},'33333333333':{n:'CARLA DIAS'}},dias:{[hj]:{'11111111111':{p:1,a:'11:40'},'22222222222':{p:1},'33333333333':{p:1}}},imp:[]};
   const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
   await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; a.folhaAb=false; },hj); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1200);
   const r=await p.evaluate(()=>({top:(document.querySelector('.alm-dt')||{}).innerText||'',pend:!!document.querySelector('.alm-bl.pend'),aviso:!!document.querySelector('.alm-emcurso'),tile:([...document.querySelectorAll('.alm-dias button')].pop()||{}).innerText||''}));
   if(fim==='23:59') ok('Almoço em andamento: 1 almoçou até agora, 2 ainda não almoçaram, 0 sem justificativa (e o aviso)', /1 almoçaram até agora/.test(r.top)&&/2 ainda não almoçaram/.test(r.top)&&!/sem justificativa/.test(r.top)&&r.pend&&r.aviso&&/\n0$|\s0$/.test(r.tile.trim())===false?true:/2 ainda não almoçaram/.test(r.top)&&r.pend&&r.aviso&&!/sem justificativa/.test(r.top), r.top.replace(/\n/g,' | ').slice(0,200)+' · dia: '+r.tile.replace(/\n/g,' '));
   else ok('Almoço encerrado: os 2 viram "sem justificativa", sem o aviso', /2 sem justificativa/.test(r.top)&&!r.pend&&!r.aviso, r.top.replace(/\n/g,' | ').slice(0,200));
   const sj=await p.evaluate(()=>{ const t=([...document.querySelectorAll('.alm-dias button')].pop()||{}).innerText||''; return t.trim().split(/\s+/); });
   ok('Quadradinho do dia ('+cen+'): '+(fim==='23:59'?'não conta ninguém como sem justificativa':'conta os 2 sem justificativa'), fim==='23:59'?!sj.includes('2'):sj.includes('2'), JSON.stringify(sj));
   await B.browser.close(); }
 process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
