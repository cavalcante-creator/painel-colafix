/* Visão do gestor › Pessoas › Saídas no expediente (10/11): quem passou na saída e voltou durante o horário de trabalho.
   Usa presenca/{dia} (sem CPF). Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const hoje=new Date(), ont=new Date(hoje); ont.setDate(ont.getDate()-1); const hj=iso(hoje), on=iso(ont);
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
  D['config/geral']=Object.assign({},D['config/geral']||{},{turnos:[{id:'t1',nome:'Geral',ini:'07:30',fim:'17:30',intv:60,almIni:'11:30',dias:[0,1,2,3,4,5,6],linhas:[]}]});
  D['presenca/'+on]={dia:on,exp:true,p:[
    {n:'Ana Teste',s:'Linha 1',e:'Colafix',c:'07:25',u:'17:35',g:['07:25-09:10','09:22-11:35','12:30-15:00','15:15-17:35']},   /* 2 saídas (12+15 min) + almoço (fica de fora) */
    {n:'Bruno Teste',s:'Expedição',e:'Zenith',c:'07:30',u:'17:30',g:['07:30-08:00','08:10-09:00','09:10-10:00','10:12-11:00','11:15-17:30']}, /* 4 saídas = vermelho */
    {n:'Carla Teste',s:'Linha 2',e:'Nexus',c:'07:30',u:'17:30',g:['07:30-10:00','10:02-12:10','13:00-17:30']},  /* 2 min e saída dentro do almoço: não contam */
    {n:'Diego Teste',s:'Almox',e:'Colafix',c:'07:00',u:'18:30',g:['07:00-07:20','07:40-18:00','18:10-18:30']}],f:[]};  /* fora do horário: não conta */
  D['presenca/'+hj]={dia:hj,exp:true,p:[{n:'Ana Teste',s:'Linha 1',e:'Colafix',c:'07:25',u:'09:00',sa:1,g:['07:25-08:00','08:20-09:00']}],f:[]};
  const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3000);
  const calc=await p.evaluate(on=>{ const S=__T.S(); return window.Painel.saidas.calc(S.gxPres.docs.filter(x=>x.dia===on)).map(r=>({n:r.n,q:r.q,min:r.min,tom:r.tom,alm:r.sai.filter(x=>x.alm).length})); },on);
  const A=calc.find(r=>r.n==='Ana Teste'), Bt=calc.find(r=>r.n==='Bruno Teste');
  ok('Almoço 12:00–13:15 não conta: Ana 3 saídas, 52 min (11:35–12:30 conta só os 25 min antes do almoço)', A&&A.q===3&&A.min===52&&A.alm===0, JSON.stringify(A));
  ok('4 saídas = vermelho', Bt&&Bt.q===4&&Bt.tom==='crit', JSON.stringify(Bt));
  ok('Saída de 2 min e saída fora do horário não contam', !calc.some(r=>r.n==='Carla Teste'||r.n==='Diego Teste'), JSON.stringify(calc.map(r=>r.n)));
  const ag=await p.evaluate(()=>{ const T=window.Painel.saidas.turno('2026-11-10'); return window.Painel.saidas.saidas({g:['07:25-08:00','08:20-09:00']},'2026-11-10',T,10*60); });
  ok('Saiu e ainda não voltou, no expediente: "fora agora" com o tempo até agora', ag.length===2&&ag[1].agora&&ag[1].min===60&&ag[0].min===20, JSON.stringify(ag));
  const al=await p.evaluate(()=>{ const T=window.Painel.saidas.turno('2026-11-10'); return [T.aIni,T.aFim]; });
  ok('Almoço que não conta: 12:00 às 13:15', al[0]===720&&al[1]===795, JSON.stringify(al));
  await p.evaluate(()=>__T.go('gxsai')); await H.dorme(1500);
  const lat=await p.evaluate(()=>[...document.querySelectorAll('#navlist .gxg-si')].map(x=>x.innerText.trim()));
  ok('No menu do Marcelo: Pessoas › Saídas no expediente', lat.includes('Saídas no expediente'), lat.join('|'));
  let v=await p.evaluate(()=>document.getElementById('view').innerText);
  const mn=hoje.getHours()*60+hoje.getMinutes(), noExp=mn>=9*60+3&&mn<17*60+30; /* "fora agora" só durante o expediente */
  ok('Hoje: '+(noExp?'Ana está fora agora (saiu 09:00)':'fora do expediente, ninguém "fora agora"'), noExp?(/Fora agora\s*1/.test(v)&&/fora desde 09:00/.test(v)):(!/fora desde/.test(v)&&/08:00–08:20 · 20 min/.test(v)), v.slice(0,700));
  await p.evaluate(on=>{ const b=document.querySelector(`[data-act="sx-dia"][data-v="${on}"]`); b&&b.click(); },on); await H.dorme(800);
  v=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Ontem: lista com quem saiu, horários e tempo fora', /Ana Teste[\s\S]*Bruno Teste/.test(v)&&/09:10–09:22 · 12 min/.test(v)&&/11:35–12:30 · 25 min \(sem o almoço\)/.test(v)&&!/Carla Teste/.test(v), v.slice(v.indexOf('Fora agora')>0?v.indexOf('Pessoas que'):300,1600));
  await p.fill('#sx-q','ana'); await H.dorme(300);
  const vis=await p.evaluate(()=>[...document.querySelectorAll('.sx-lista .sx-p')].filter(t=>!t.hidden).map(t=>t.querySelector('.sx-nm').innerText));
  ok('Busca filtra sem redesenhar', vis.length===1&&vis[0]==='Ana Teste', vis.join(','));
  await p.click('[data-act="sx-per"][data-v="sem"]'); await H.dorme(600);
  v=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Últimos 7 dias: soma por pessoa', /Ana Teste[\s\S]*em 2 dias/.test(v), v.slice(0,700));
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
