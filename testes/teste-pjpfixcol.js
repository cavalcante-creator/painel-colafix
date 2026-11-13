/* Pagamento dos PJ (10/11): quem trabalha na Fixcol não passa no Face ID: cada dia da escala conta cheio e o RH marca "Faltou"
   quando o gestor avisar. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed');
const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Expedição','Fixcol'],setoresFilial:['Fixcol'],pjPag:{ini:'07:30',fim:'17:18',intv:60,tol:5}};
  D['rh/dados/funcionarios/f1']={nome:'CARLOS PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',salario:4400,setor:'Fixcol',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10'};
  D['rh/dados/funcionarios/f2']={nome:'BEATRIZ LIMA TESTE',tipo:'PJ',empresa:'NEXUS',cpf:'22233344455',cnpj:'98765432000110',salario:4400,setor:'Expedição',filial:'FIXCOL',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10'};
  D['rh/dados/funcionarios/f3']={nome:'DANIEL ROCHA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'33344455566',cnpj:'11222333000181',salario:4400,setor:'Expedição',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10'};
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias:{'2026-10-26':{'33344455566':{p:1,t:['07:30:00 PORTARIA','17:18:00 PORTARIA']}},'2026-10-28':{'11122233344':{p:1,t:['12:14:00 PORTARIA ENTRADA','17:59:00 PORTARIA SAIDA']}}},pessoas:{'33344455566':{n:'DANIEL ROCHA TESTE',e:'ZENITH'},'11122233344':{n:'CARLOS PEREIRA TESTE',e:'ZENITH'}},imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ const J=window.RHPJPag._J; J.per='2026-10-2'; J.aba='lista'; __T.go('rhpjpag'); window.Painel.render(); }); await H.dorme(2500);
  const lin=n=>p.evaluate(n=>{ const t=[...document.querySelectorAll('tr,.pjp-row,[data-r]')].map(x=>x.innerText).filter(x=>x.includes(n)); return t.sort((a,b)=>a.length-b.length)[0]||''; },n);
  let a=await lin('Carlos'); ok('Fixcol pelo setor: 11 dias da escala cheios (96h48) e R$ 1.936,00, sem "sem horas"', /1\.936,00/.test(a)&&!/Sem horas/.test(a), a);
  let b=await lin('Beatriz'); ok('Fixcol pelo cadastro (local de trabalho): também conta o dia cheio', /1\.936,00/.test(b)&&!/Sem horas/.test(b), b);
  let c3=await lin('Daniel'); ok('Quem não é da Fixcol continua pelo Face ID (1 dia)', /176,00/.test(c3), c3);
  await p.evaluate(()=>{ const J=window.RHPJPag._J; J.ab='f1'; J.tab='horas'; window.Painel.render(); }); await H.dorme(1200);
  let g=await p.evaluate(()=>(document.querySelector('.pjp-g')||{}).innerText||'');
  ok('A folha da pessoa explica: Fixcol, dia cheio e o botão Faltou', /Trabalha na Fixcol/.test(g)&&/Fixcol · sem Face ID · dia cheio/.test(g)&&/Faltou/.test(g), g.slice(0,400));
  await p.click('[data-act="pjp-dzero"][data-d="2026-10-27"]'); await H.dorme(1500);
  const S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs, x=((S['rh/dados/pjpag/2026-10-2']||{}).pes||{}).f1||{};
  ok('"Faltou" grava o dia 27 como não trabalhado com o motivo', x.aj&&x.aj['2026-10-27']&&x.aj['2026-10-27'].zero&&/gestor avisou/.test(x.aj['2026-10-27'].mot), JSON.stringify(x.aj));
  g=await p.evaluate(()=>(document.querySelector('.pjp-g')||{}).innerText||'');
  ok('Depois do Faltou: 10 dias cheios, R$ 1.760,00, com "desfazer"', /1\.760,00/.test(g)&&/desfazer/.test(g), (g.match(/Total a pagar[\s\S]{0,60}/)||[''])[0]);
  /* 13/11: dia em que a pessoa da Fixcol também passou no Face ID daqui */
  const l28=()=>p.evaluate(()=>{ const e=document.querySelector('.pjp-d[data-pjpd="2026-10-28"]'); return e?e.innerText:''; });
  let d28=await l28(); ok('Dia 28 (Fixcol + passou aqui): "Fixcol + Colafix no mesmo dia · confira", com "Dia cheio está certo" e Corrigir', /Fixcol \+ Colafix no mesmo dia · confira/.test(d28)&&/Dia cheio está certo/.test(d28)&&/Corrigir/.test(d28), d28);
  ok('O dia 28 conta em "Para conferir" e continua pago cheio (R$ 1.760,00)', /Para conferir\s*1/.test(g)&&/1\.760,00/.test(g), (g.match(/Para conferir\s*\d+/)||[''])[0]);
  await p.click('[data-act="pjp-dfix"][data-d="2026-10-28"]'); await H.dorme(1500);
  const S2=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs, x2=((S2['rh/dados/pjpag/2026-10-2']||{}).pes||{}).f1||{};
  d28=await l28(); ok('"Dia cheio está certo" grava a conferência e o dia vira "dia cheio conferido" com desfazer', x2.aj&&x2.aj['2026-10-28']&&x2.aj['2026-10-28'].okFix===true&&/dia cheio conferido/.test(d28)&&/desfazer/.test(d28)&&/conta 07:30–17:18 \(dia cheio\)/.test(d28), JSON.stringify(x2.aj&&x2.aj['2026-10-28'])+' · '+d28);
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
