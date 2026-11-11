/* Pagamento dos PJ (10/11): nome com uma letra diferente no Face ID, dia do fechamento (último dia útil) pago cheio com
   desconto automático na quinzena seguinte, e marcar pago em qualquer etapa. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Expedição'],pjPag:{ini:'08:00',fim:'18:00',intv:72}};
  D['rh/dados/funcionarios/f1']={nome:'PEDRO DE SOUZA NARCIZO TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',salario:4400,setor:'Expedição',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10'};
  D['rh/dados/funcionarios/f2']={nome:'ANA LIMA TESTE',tipo:'PJ',empresa:'NEXUS',cpf:'55566677788',cnpj:'11222333000181',salario:4400,setor:'Expedição',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10'};
  /* Face ID: o Pedro aparece com outro CPF e o nome com uma letra diferente (NARCISO) */
  const dO={}; ['26','27','28','29','30'].forEach(x=>{ dO['2026-10-'+x]={'99988877766':{p:1,a:1,t:['08:00:00 PORTARIA',(x==='30'?'15:00:00':'18:00:00')+' PORTARIA']},'55566677788':{p:1,a:1,t:['08:00:00 PORTARIA',(x==='30'?'14:00:00':'18:00:00')+' PORTARIA']}}; });
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias:dO,pessoas:{'99988877766':{n:'PEDRO DE SOUZA NARCISO TESTE',e:'ZENITH'},'55566677788':{n:'ANA LIMA TESTE',e:'NEXUS'}},imp:[]};
  const dN={}; ['03','04','05'].forEach(x=>{ dN['2026-11-'+x]={'99988877766':{p:1,a:1,t:['08:00:00 PORTARIA','18:00:00 PORTARIA']}}; });
  D['rh/dados/almoco/2026-11']={mes:'2026-11',dias:dN,pessoas:{'99988877766':{n:'PEDRO DE SOUZA NARCISO TESTE',e:'ZENITH'}},imp:[]};
  /* a quinzena 16–31/10 já foi fechada com o dia 30 pago cheio (8h48) para o Pedro */
  D['rh/dados/pjpag/2026-10-2']={pid:'2026-10-2',de:'2026-10-16',ate:'2026-10-31',pes:{f1:{st:'pago',fech:{cheio:{d:'2026-10-30',m:528,h:{ini:'08:00',fim:'18:00',intv:72,tol:5}},min:2640,vh:20,valor:880,bruto:880}}}};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  const gav=async(fid,per,tab)=>{ await p.evaluate(([f,pr,t])=>{ const J=window.RHPJPag._J; J.per=pr; J.aba='lista'; J.ab=f; J.tab=t||'horas'; __T.go('rhpjpag'); window.Painel.render(); },[fid,per,tab]); await H.dorme(1800); return p.evaluate(()=>(document.querySelector('.pjp-g')||{}).innerText||''); };
  let g=await gav('f1','2026-11-1');
  ok('Nome com uma letra diferente no Face ID (NARCIZO × NARCISO): liga a pessoa e conta os dias', /Ter 03\/11[\s\S]*08:00[\s\S]*18:00/.test(g)&&!/Ter 03\/11\s*sem passagem/.test(g), g.slice(0,400));
  ok('Quinzena 1 a 15/11: o fechamento é no último dia útil (sex 13/11), pago cheio', /Sex 13\/11[\s\S]*Dia do fechamento · pago o dia cheio \(8h48\)/.test(g), (g.match(/Sex 13\/11[^\n]*\n[^\n]*\n[^\n]*/)||[''])[0]);
  g=await gav('f2','2026-10-2');
  ok('No dia do fechamento (30/10) quem saiu às 14:00 recebe o dia cheio', /Sex 30\/10[\s\S]*Dia do fechamento/.test(g)&&/8h48/.test((g.match(/Sex 30\/10[\s\S]{0,200}/)||[''])[0]), (g.match(/Sex 30\/10[\s\S]{0,200}/)||[''])[0]);
  g=await gav('f1','2026-11-1','desc');
  ok('Na quinzena seguinte, desconto automático de quem saiu mais cedo no dia do fechamento (3h × R$ 20 = R$ 60)', /Saiu mais cedo no dia do fechamento \(30\/10\): 3h00/.test(g)&&/R\$\s?60,00/.test(g)&&/automático/.test(g), g.slice(0,600));
  await p.evaluate(()=>{ window.RHPJPag._J.ab=''; window.Painel.render(); }); await H.dorme(500);
  p.once("dialog",dg=>dg.accept()); await p.click('.pjp-lc [data-act="pjp-fech"][data-f="f1"]'); await H.dorme(1000);
  const tr=()=>p.evaluate(()=>{ const b=document.querySelector('.pjp-lc [data-f="f1"]'); return b?b.closest('tr').innerText:''; });
  ok('Com o valor fechado, o RH já pode "marcar pago" (sem esperar a nota)', /marcar pago/.test(await tr()), await tr());
  let S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs;
  ok('O fechamento guarda o dia pago cheio (para descontar depois)', S['rh/dados/pjpag/2026-11-1'].pes.f1.fech.cheio&&S['rh/dados/pjpag/2026-11-1'].pes.f1.fech.cheio.d==='2026-11-13'&&S['rh/dados/pjpag/2026-11-1'].pes.f1.fech.descs.some(z=>/Saiu mais cedo/.test(z.t)), JSON.stringify(S['rh/dados/pjpag/2026-11-1'].pes.f1.fech.cheio));
  await p.click('.pjp-lc [data-act="pjp-pago"][data-f="f1"]'); await H.dorme(1000);
  S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs; const x=S['rh/dados/pjpag/2026-11-1'].pes.f1;
  ok('"marcar pago" direto do valor fechado: fica Pago e guarda de onde veio', x.st==='pago'&&x.pago.de==='fechado'&&/Pago/.test(await tr()), JSON.stringify(x.pago));
  await p.click('.pjp-lc [data-act="pjp-pagox"][data-f="f1"]'); await H.dorme(1000);
  S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs;
  ok('"desfazer" volta para onde estava (valor fechado)', S['rh/dados/pjpag/2026-11-1'].pes.f1.st==='fechado');
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
