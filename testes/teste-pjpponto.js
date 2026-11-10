/* Pagamento dos PJ (10/11): Face ID da entrada da fábrica (outro iDSecure). Vale ele; sem marcação no dia, vale o Face ID de sempre.
   Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'), path=require('path'), os=require('os');
const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Expedição'],pjPag:{ini:'07:30',fim:'17:18',intv:60,tol:5}};
  D['rh/dados/funcionarios/f1']={nome:'CARLOS PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',salario:4400,setor:'Expedição',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10'};
  const fid={}; ['26','27','28','29','30'].forEach(x=>{ fid['2026-10-'+x]={'11122233344':{p:1,t:['08:00:00 PORTARIA','12:00:00 REFEITORIO','18:00:00 PORTARIA']}}; });
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias:fid,pessoas:{'11122233344':{n:'CARLOS PEREIRA TESTE',e:'ZENITH'}},imp:[]};
  /* entrada da fábrica: 26 e 27 completos, 28 só a entrada, 29 sem marcação */
  D['rh/dados/ponto/2026-10']={mes:'2026-10',dias:{'2026-10-26':{'11122233344':{p:1,t:['07:29:00 ENTRADA FABRICA','17:20:00 ENTRADA FABRICA']}},'2026-10-27':{'11122233344':{p:1,t:['07:45:00 ENTRADA FABRICA','17:00:00 ENTRADA FABRICA']}},'2026-10-28':{'11122233344':{p:1,t:['07:40:00 ENTRADA FABRICA']}}},pessoas:{'11122233344':{n:'CARLOS PEREIRA TESTE',e:'ZENITH'}},imp:[{em:new Date().toISOString(),por:'Stefani RH',arq:'entrada.csv',de:'2026-10-26',ate:'2026-10-28',n:5}]};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ const J=window.RHPJPag._J; J.per='2026-10-2'; J.aba='lista'; __T.go('rhpjpag'); window.Painel.render(); }); await H.dorme(2500);
  const pas=dd=>p.evaluate(x=>{ const f={_id:'f1',nome:'CARLOS PEREIRA TESTE',cpf:'11122233344',empresa:'ZENITH',tipo:'PJ'}; const r=window.RHPJPag._calc.diaPas(f,x); return {src:r.src,hs:r.hs}; },dd);
  let r=await pas('2026-10-27'); ok('Dia com entrada e saída na entrada da fábrica: vale só ela (07:45–17:00), o Face ID de sempre fica de fora', r.src==='pto'&&r.hs.join()==='07:45,17:00', JSON.stringify(r));
  r=await pas('2026-10-28'); ok('Só a entrada marcada na fábrica: junta com o Face ID para achar a saída', r.src==='mix'&&r.hs[0]==='07:40'&&r.hs[r.hs.length-1]==='18:00', JSON.stringify(r));
  r=await pas('2026-10-29'); ok('Sem marcação na entrada da fábrica: vale o Face ID de sempre', r.src==='fid'&&r.hs[0]==='08:00'&&r.hs[r.hs.length-1]==='18:00', JSON.stringify(r));
  const bar=await p.evaluate(()=>(document.querySelector('.pjp-bar')||{}).innerText||'');
  ok('A barra mostra a situação da entrada da fábrica com "importar CSV"', /Entrada da fábrica/.test(bar)&&/importar CSV/.test(bar)&&/última passagem 28\/10 às 07:40/.test(bar), bar);
  await p.evaluate(()=>{ const J=window.RHPJPag._J; J.ab='f1'; J.tab='horas'; window.Painel.render(); }); await H.dorme(1200);
  const g=await p.evaluate(()=>(document.querySelector('.pjp-g')||{}).innerText||'');
  const lin=dia=>(g.match(new RegExp(dia+'[\\s\\S]{0,260}'))||[''])[0];
  ok('Na folha da pessoa cada dia diz de onde veio a hora', /Entrada da fábrica/.test(lin('Ter 27\\/10'))&&/Entrada da fábrica \+ Face ID/.test(lin('Qua 28\\/10'))&&/Face ID \(sem marcação na entrada\)/.test(lin('Qui 29\\/10')), [lin('Ter 27\\/10'),lin('Qui 29\\/10')].join(' || '));
  ok('Conta do dia 27 pela entrada da fábrica (07:45–17:00 − 1h = 8h15)', /8h15/.test(lin('Ter 27\\/10')), lin('Ter 27\\/10'));
  await p.evaluate(()=>{ window.RHPJPag._J.ab=''; window.Painel.render(); }); await H.dorme(600);
  /* importar o CSV da entrada (formato "Acessos Gerais" do iDSecure) */
  const csv='Código;Hora;Nome do usuário;RG;CPF;Grupo;Empresa;Departamento;Empresa Visitada;Autorização;Detalhes;Matrícula;Dispositivo;Área;Operador\n'+
    '1;30/10/2026 07:33:00;CARLOS PEREIRA TESTE;;111.222.333-44;;ZENITH;;;Autorizado;;;ENTRADA FABRICA;Portaria;\n'+
    '2;30/10/2026 17:22:00;CARLOS PEREIRA TESTE;;111.222.333-44;;ZENITH;;;Autorizado;;;ENTRADA FABRICA;Portaria;\n'+
    '3;30/10/2026 12:00:00;CARLOS PEREIRA TESTE;;111.222.333-44;;ZENITH;;;Negado;;;ENTRADA FABRICA;Portaria;\n';
  const arq=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'pto-')),'entrada.csv'); fs.writeFileSync(arq,csv);
  await p.setInputFiles('[data-pjp-pto]',arq); await H.dorme(2500);
  const S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs, P0=S['rh/dados/ponto/2026-10']||{};
  ok('Importar o CSV junta o dia novo e mantém os que já estavam (só os autorizados)', P0.dias&&P0.dias['2026-10-30']&&P0.dias['2026-10-30']['11122233344'].t.length===2&&P0.dias['2026-10-27']&&P0.imp.length===2, JSON.stringify(P0.dias&&P0.dias['2026-10-30']));
  r=await pas('2026-10-30'); ok('Depois de importar, o dia 30 passa a valer pela entrada da fábrica', r.src==='pto'&&r.hs.join()==='07:33,17:22', JSON.stringify(r));
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
