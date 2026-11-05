/* RH (05/11): mudar as datas da experiência e pôr data de fim do contrato (intermitente etc.) com aviso antes e no dia. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const iso=d=>d.toISOString().slice(0,10), dias=n=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return iso(d); };
const br=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/dados/funcionarios/f1']={nome:'LUCAS TESTE',cpf:'52998224725',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:dias(-13),funcao:'Operador de produção',setor:'Linha 1'};
  D['rh/dados/funcionarios/f2']={nome:'MARTA EXEMPLO',cpf:'11144477735',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:dias(-20),funcao:'Operador de produção',setor:'Linha 1'};
  D['rh/dados/funcoes/fc1']={nome:'Operador de produção',epis:[{nome:'Luva',ca:'1'}]};
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept());
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3500);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const view=()=>p.evaluate(()=>document.getElementById('view').innerText.replace(/ /g,' '));
  const erros=[]; p.on('pageerror',e=>erros.push(e.message));

  // 1) Funcionários: ficha ao lado com o botão "Mudar datas" na experiência
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(500); await p.click('[data-act="rh-fusel"][data-id="f1"]'); await H.dorme(400);
  await p.click('.rh-v2d [data-act="rh-przab"]'); await H.dorme(400);
  ok('Abre a janela "Prazo do contrato" na ficha da pessoa', !!(await p.$('.rh-v2d #rh-przf')), await view().then(v=>v.slice(0,200)));
  // experiência com datas mudadas
  await p.fill('#rh-przf1',dias(10)); await p.fill('#rh-przf2',dias(40)); await p.click('[data-act="rh-przok"]'); await H.dorme(700);
  let s=await srv(), e=s['rh/dados/funcionarios/f1'].exp||{};
  ok('Experiência: grava as datas mudadas à mão', e.fim1===dias(10)&&e.fim2===dias(40), JSON.stringify(e));
  await p.evaluate(()=>__T.go('rhexp')); await H.dorme(500);
  let l=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.rh-tf tbody tr')].find(x=>x.innerText.includes('LUCAS')); return r?r.innerText.replace(/\n/g,' '):''; });
  ok('Aba Experiência usa as datas novas', l.includes('1ª até '+br(dias(10)))&&l.includes('2ª até '+br(dias(40))), l);

  // 2) contrato intermitente com fim: Lucas passa a ter data para terminar
  await p.click('tr:has-text("LUCAS") [data-act="rh-przab"]'); await H.dorme(400);
  await p.check('input[name="rh-przmo"][value="fim"]'); await H.dorme(400);
  await p.selectOption('#rh-przt','Contrato intermitente'); await p.fill('#rh-przd',dias(3)); await p.fill('#rh-prza','5'); await p.fill('#rh-przo','convocação de teste');
  await p.click('[data-act="rh-przok"]'); await H.dorme(700); s=await srv(); const z=s['rh/dados/funcionarios/f1'].prazo||{};
  ok('Grava o fim do contrato (tipo, data, aviso, observação, histórico)', z.tipo==='Contrato intermitente'&&z.fim===dias(3)&&z.aviso===5&&z.obs==='convocação de teste'&&z.hist&&z.hist.length===1, JSON.stringify(z));
  let v=await view();
  ok('Sai da experiência e aparece em "Contratos com data para terminar"', !/LUCAS TESTE[^\n]*1ª até/.test(v)&&/Contratos com data para terminar[\s\S]*LUCAS TESTE[\s\S]*Contrato intermitente termina em 3 dias/.test(v), v.slice(0,600));
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(600); if(await p.$('[data-act="rh-iavt"]')){ await p.click('[data-act="rh-iavt"]'); await H.dorme(400); } v=await view();
  ok('Início avisa antes do fim', /Contrato intermitente: LUCAS TESTE/.test(v), v.slice(0,800));

  // 3) mudar a data (renovar) para hoje → "termina hoje"
  await p.evaluate(()=>__T.go('rhexp')); await H.dorme(400); await p.click('tr:has-text("LUCAS") [data-act="rh-przab"]'); await H.dorme(400);
  ok('Ao abrir de novo já vem "Contrato com data para terminar"', await p.isChecked('input[name="rh-przmo"][value="fim"]'));
  await p.fill('#rh-przd',dias(0)); await p.click('[data-act="rh-przok"]'); await H.dorme(700); s=await srv(); v=await view();
  ok('Mudou a data: histórico guarda a troca e mostra "termina hoje"', s['rh/dados/funcionarios/f1'].prazo.hist.length===2&&/Mudou o fim/.test(s['rh/dados/funcionarios/f1'].prazo.hist[1].t)&&/termina hoje/.test(v), JSON.stringify(s['rh/dados/funcionarios/f1'].prazo.hist));
  await p.evaluate(()=>__T.go('rhagenda')); await H.dorme(600); v=await view();
  ok('Agenda mostra o fim do contrato', /Fim do contrato de LUCAS TESTE/.test(v), v.slice(0,600));

  // 4) data longe (sem aviso ainda) e depois "Sem data"
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(400); await p.click('[data-act="rh-fusel"][data-id="f2"]'); await H.dorme(300);
  await p.click('.rh-v2d [data-act="rh-przab"]'); await H.dorme(300); await p.check('input[name="rh-przmo"][value="fim"]'); await H.dorme(300);
  await p.fill('#rh-przd',dias(60)); await p.click('[data-act="rh-przok"]'); await H.dorme(700); const fl=await p.evaluate(()=>document.querySelector('.rh-v2d').innerText);
  ok('Ficha da pessoa mostra "até dd/mm" quando falta mais que o aviso', /Contrato intermitente até /.test(fl)&&fl.includes(br(dias(60))), fl.slice(0,400));
  await p.click('.rh-v2d [data-act="rh-przab"]'); await H.dorme(300); await p.check('input[name="rh-przmo"][value="sem"]'); await H.dorme(300); await p.click('[data-act="rh-przok"]'); await H.dorme(700);
  s=await srv(); const fl2=await p.evaluate(()=>document.querySelector('.rh-v2d').innerText);
  ok('Sem data: prazo sai (fica no histórico) e a experiência volta', s['rh/dados/funcionarios/f2'].prazo.removido===true&&/Experiência 45 \+ 45/.test(fl2), fl2.slice(0,400));
  ok('Sem erros na página', !erros.length, erros.join(' | '));
  await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
