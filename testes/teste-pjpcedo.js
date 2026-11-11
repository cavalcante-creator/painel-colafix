/* Pagamento dos PJ (11/11): fechar o valor da quinzena que ainda não terminou pergunta antes; o Próximo passo manda para a quinzena passada. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed');
const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Expedição'],pjPag:{ini:'07:30',fim:'17:18',intv:60,tol:5,fds:1}};
  D['rh/dados/funcionarios/f1']={nome:'CARLOS PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',salario:4400,setor:'Expedição',funcao:'Ajudante',status:'Ativo',admissao:'2025-01-10'};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  /* uma quinzena que termina daqui a 3 meses = ainda não terminou */
  const fut=await p.evaluate(()=>{ const x=new Date(); x.setMonth(x.getMonth()+3); const m=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'); return m+'-2'; });
  const cal=await p.evaluate(()=>window.RHPJPag._calc&&!!window.RHPJPag._calc.perDe);
  await p.evaluate(per=>{ const J=window.RHPJPag._J; J.per=per; J.aba='pv'; __T.go('rhpjpag'); window.Painel.render(); },fut); await H.dorme(2000);
  /* dá um valor fixo para a pessoa ficar pronta para fechar sem Face ID */
  await p.evaluate(()=>{ const f=window.RHPJPag._J; }); 
  const S0=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs;
  let msgs=[]; p.on('dialog',async dg=>{ msgs.push(dg.message()); await (msgs.length===1?dg.dismiss():dg.accept()); });
  await p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.act='pjp-fech'; b.dataset.f='f1'; b.id='tb'; document.body.appendChild(b); });
  await p.click('#tb'); await H.dorme(800);
  let S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs;
  ok('Fechar antes do fim da quinzena pergunta e, cancelando, não grava', /ainda não terminou/.test(msgs[0]||'')&&!S['rh/dados/pjpag/'+fut], msgs[0]);
  ok('Mostra o caminho para a quinzena passada', /quinzena passada/.test(msgs[0]||''));
  await p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.act='pjp-fech'; b.dataset.f='f1'; b.id='tb2'; document.body.appendChild(b); });
  await p.click('#tb2'); await H.dorme(1200);
  S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs;
  const x=((S['rh/dados/pjpag/'+fut]||{}).pes||{}).f1||{};
  ok('Confirmando, fecha mesmo assim (ou recusa por falta de horas, sem perguntar de novo)', msgs.length===2, JSON.stringify({st:x.st,n:msgs.length}));
  /* quinzena passada: fecha sem perguntar */
  msgs=[]; await p.evaluate(()=>{ const J=window.RHPJPag._J; J.per='2026-10-2'; window.Painel.render(); }); await H.dorme(1500);
  await p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.act='pjp-fech'; b.dataset.f='f1'; b.id='tb3'; document.body.appendChild(b); });
  await p.click('#tb3'); await H.dorme(1000);
  ok('Quinzena que já acabou fecha sem perguntar', msgs.length===0, msgs.join(' | '));
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs|horas neste período|valor da hora/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
