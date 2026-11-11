/* Pagamento dos PJ (11/11): desconfiar de entrada → saída → entrada no meio do dia. Dados inventados (horários da foto). */
const H=require('./harness'); const {seedManut}=require('./manut-seed');
const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Expedição'],pjPag:{ini:'08:00',fim:'18:00',intv:72,tol:5,fds:1}};
  D['rh/dados/funcionarios/f1']={nome:'CARLOS PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',setor:'Expedição',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10',pjPag:{vh:20}};
  const E='ESTACIONAMENTO ENT', Sd='SAIDA ESTACIONAMENTO';
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias:{
    '2026-10-20':{'11122233344':{p:1,t:['07:21:00 '+E,'07:30:00 '+Sd,'07:49:00 '+E,'07:50:00 '+E,'15:55:00 '+Sd,'16:09:00 '+E,'18:00:00 '+Sd]}},
    '2026-10-21':{'11122233344':{p:1,t:['07:58:00 '+E,'12:00:00 '+Sd,'13:10:00 '+E,'18:01:00 '+Sd]}},
    '2026-10-22':{'11122233344':{p:1,t:['08:00:00 '+E,'17:00:00 '+E]}},
    '2026-10-23':{'11122233344':{p:1,t:['08:06:00 PORTARIA ENTRADA','09:11:00 '+Sd,'09:17:00 '+E,'09:17:30 '+Sd,'11:55:00 REFEITORIO','12:08:00 REFEITORIO','12:12:00 PORTARIA SAIDA','13:09:00 PORTARIA ENTRADA','14:40:00 '+Sd,'14:40:30 '+E,'18:00:00 PORTARIA SAIDA']}}},pessoas:{'11122233344':{n:'CARLOS PEREIRA TESTE',e:'ZENITH'}},imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ const J=window.RHPJPag._J; J.per='2026-10-2'; J.aba='lista'; J.ab='f1'; J.tab='horas'; __T.go('rhpjpag'); window.Painel.render(); }); await H.dorme(2500);
  const dia=k=>p.evaluate(k=>{ const t=(document.querySelector('.pjp-g')||{}).innerText||''; return (t.match(new RegExp(k+'[\\s\\S]{0,420}'))||[''])[0].split(/\n(?=(Seg|Ter|Qua|Qui|Sex|Sáb|Dom) \d)/)[0].replace(/\n/g,' | '); },k);
  let x=await dia('Ter 20\\/10');
  ok('Saiu e voltou 2× no meio do dia: avisa com os horários e o tempo fora (33 min)', /Saiu e voltou 2×/.test(x)&&/07:30–07:49/.test(x)&&/15:55–16:09/.test(x)&&/0h33|33 ?min/.test(x)&&/9h27/.test(x), x);
  x=await dia('Qua 21\\/10'); ok('Saída e volta no almoço (12:00 às 13:10) não é desconfiança', !/Saiu e voltou/.test(x)&&!/falta/.test(x), x);
  x=await dia('Qui 22\\/10'); ok('Dia que termina numa entrada: "falta a saída?"', /termina numa entrada/.test(x), x);
  const pc=await p.evaluate(()=>(document.querySelector('.pjp-mini')||{}).innerText||''); ok('Os 3 dias entram em "Para conferir"', /PARA CONFERIR\s*3/i.test(pc), pc.replace(/\n/g,' | '));
  await p.click('[data-act=pjp-spd][data-d="2026-10-20"]'); await H.dorme(1200);
  x=await dia('Ter 20\\/10'); ok('"Descontar 0h33": o dia passa para 8h54 e fica marcado descontado', /8h54/.test(x)&&/descontado/.test(x)&&/desfazer/.test(x), x);
  await p.click('[data-act=pjp-spok][data-d="2026-10-22"]'); await H.dorme(1200);
  const pc2=await p.evaluate(()=>(document.querySelector('.pjp-mini')||{}).innerText||''); ok('Depois de conferir dois, "Para conferir" fica só o da foto (1)', /PARA CONFERIR\s*1/i.test(pc2), pc2.replace(/\n/g,' | '));
  const S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs, aj=((((S['rh/dados/pjpag/2026-10-2']||{}).pes||{}).f1)||{}).aj||{};
  ok('Grava descF no dia descontado e okFora no conferido', aj['2026-10-20']&&aj['2026-10-20'].descF===33&&aj['2026-10-22']&&aj['2026-10-22'].okFora===true, JSON.stringify(aj));
  x=await dia('Sex 23\\/10'); ok('Dia da foto: só a saída 09:11–09:17 conta (o 09:17 de novo e o 14:40 são o portão; 12:12–13:09 é o almoço)', /Saiu e voltou · 0h06 fora \(09:11–09:17\)/.test(x)&&!/3h5/.test(x), x);
  ok('A linha do dia mostra entrou → saiu e as passagens recolhidas', /ENTROU\s*08:06/i.test(x)&&/SAIU\s*18:00/i.test(x)&&/ver as 11 passagens/.test(x)&&await p.evaluate(()=>!!document.querySelector('[data-pjpd="2026-10-23"] .pg-bar i.sx')), x);
  const cal=await p.evaluate(()=>{ const c=document.querySelector('.pjp-cal'); return c?{n:c.querySelectorAll('[data-act=pjp-dcal][data-v^="2026"]').length,c23:(c.querySelector('[data-v="2026-10-23"]')||{}).className||'',c26:(c.querySelector('[data-v="2026-10-26"]')||{}).className||'',c24:(c.querySelector('[data-v="2026-10-24"]')||{}).className||''}:null; });
  ok('Procurar o dia em calendário: 16 dias, na cor da situação (23 para conferir, 26 sem passagem, 24 fim de semana)', cal&&cal.n===16&&/\bcf\b/.test(cal.c23)&&/\bsm\b/.test(cal.c26)&&/\bfd\b/.test(cal.c24), JSON.stringify(cal));
  await p.click('[data-act=pjp-dcal][data-v="2026-10-23"]'); await H.dorme(400);
  let vs=await p.evaluate(()=>[...document.querySelectorAll('.pjp-dl [data-pjpd]')].filter(e=>!e.hidden).map(e=>e.dataset.pjpd));
  ok('Tocar no dia 23 mostra só esse dia', vs.join()==='2026-10-23', vs.join());
  await p.click('.pjp-calh [data-act=pjp-dcal][data-v=""]'); await H.dorme(300); vs=await p.evaluate(()=>[...document.querySelectorAll('.pjp-dl [data-pjpd]')].filter(e=>!e.hidden).length);
  ok('"ver todos os dias" volta a lista inteira', vs===16, vs);
  await p.click('[data-act=pjp-dk][data-v=sai]'); await H.dorme(300); vs=await p.evaluate(()=>[...document.querySelectorAll('.pjp-dl [data-pjpd]')].filter(e=>!e.hidden).map(e=>e.dataset.pjpd));
  ok('Filtro "Saiu no meio" mostra os dias com saída e volta', vs.join()==='2026-10-20,2026-10-23', vs.join());
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
