/* RH · Férias e prazos (12/10): férias dos CLT pela admissão (em partes), "já tirou", aviso de férias gerado direto da tela,
   campo perguntado nos modelos, troca dos PJ a cada 3 meses da última troca, avisos 15 dias antes no Início e no Meu dia. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const iso=d=>d.toISOString().slice(0,10), hoje=()=>{ const d=new Date(); d.setHours(12,0,0,0); return d; };
const dias=n=>{ const d=hoje(); d.setDate(d.getDate()+n); return iso(d); }, meses=(m,n)=>{ const d=hoje(); d.setMonth(d.getMonth()+m); d.setDate(d.getDate()+(n||0)); return iso(d); };
const br=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  const F={f0:['ANA SOUZA','52998224725','CLT',meses(-24,39)] /* limite para gozo = admissão + 24 meses − 30 dias → daqui a 9 dias */,f1:['CARLOS LIMA','11144477735','CLT',meses(-25)],f2:['BRUNO ROCHA','60759545077','CLT',meses(-6)],
    f3:['PEDRO ALVES','86288366757','PJ',meses(-3,10)],f4:['RAFAEL NUNES','04589523061','PJ',meses(-12)],f5:['JOAO PJ','28625587041','PJ',meses(-4)]};
  Object.entries(F).forEach(([k,[n,c,t,a]])=>D['rh/dados/funcionarios/'+k]={nome:n,cpf:c,tipo:t,empresa:t==='PJ'?'NEXUS':'COLAFIX',status:'Ativo',admissao:a,funcao:'Operador de produção',setor:'Linha 1'});
  D['rh/dados/funcionarios/f4'].ultimaTroca=meses(-2);
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; let resposta='';
  p.on('dialog',x=>x.type()==='prompt'?x.accept(resposta):x.accept());
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const view=()=>p.evaluate(()=>document.getElementById('view').innerText.replace(/ /g,' '));
  const toast=()=>p.evaluate(()=>{ const t=document.getElementById('toast'); return t&&!t.hidden?t.innerText:''; });
  const espera=async(f,ms)=>{ const t0=Date.now(); while(Date.now()-t0<(ms||8000)){ if(await p.evaluate(f).catch(()=>false)) return true; await H.dorme(200); } return false; };

  const v0=await view(); const nav=await p.evaluate(()=>[...document.querySelectorAll('#navlist [data-go]')].map(b=>b.innerText.trim()).join('|'));
  ok('Menu ganhou "Férias e prazos"', nav==='Início|Agenda|Funcionários|Pessoas na empresa|Fichas do mês|Documentos e contratos|Férias e prazos|Almoço|Cadastros', nav);
  ok('Início avisa: férias perto do prazo e vencida, troca do PJ perto e atrasada (e não a que está em dia)',
    /(Atenção|Vencido)\s*Férias: ANA SOUZA\s*(conceder até|passou do dia de avisar)/i.test(v0)&&/Vencido\s*Férias: CARLOS LIMA\s*o prazo para conceder venceu/.test(v0)&&/Atenção\s*Troca do PJ: PEDRO ALVES\s*próxima troca/.test(v0)&&/Atrasada\s*Troca do PJ: JOAO PJ/.test(v0)&&!/BRUNO ROCHA|RAFAEL NUNES/.test(v0), v0.replace(/\n/g,' | ').slice(300,700));

  // férias
  await p.click('.rh-av:has-text("Férias: ANA SOUZA") [data-act="rh-pzabrir"]'); await H.dorme(300);
  const v1=await view(); const sit=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.rh-tf tbody tr')].map(r=>[r.querySelector('b').innerText,r.querySelector('.pill').innerText])));
  ok('Férias (CLT): só quem precisa de atenção, com o prazo certo (inclui "passou do dia de avisar")', /^(Conceder em até 9 dias|Passou do dia de avisar)/.test(sit['ANA SOUZA']||'')&&/^Prazo vencido há/.test(sit['CARLOS LIMA'])&&!sit['BRUNO ROCHA']&&!sit['PEDRO ALVES'], JSON.stringify(sit));
  await p.click('[data-act="rh-pzfil"][data-v="todos"]'); const bruno=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr')].find(r=>/BRUNO/.test(r.innerText)).innerText);
  ok('"Todos os CLT": quem está em aquisição aparece em dia', /em aquisição/.test(bruno)&&/Em dia/.test(bruno), bruno.replace(/\n/g,' '));
  await p.click('tr:has-text("ANA SOUZA") [data-act="rh-fernova"]'); await H.dorme(200);
  await p.fill('#rh-feri',dias(5)); await p.dispatchEvent('#rh-feri','change'); await H.dorme(200); await p.click('[data-act="rh-ferdias"][data-v="10"]'); await H.dorme(200);
  const prev=await p.evaluate(()=>document.querySelector('.rh-form').innerText);
  await p.click('[data-act="rh-fersalvar"]'); await H.dorme(500); let s=await srv(); const fe1=Object.values(s).find(x=>x&&x.funcId==='f0'&&x.dias===10);
  ok('Marcar 10 dias: mostra quando termina e volta, e grava certo', fe1&&fe1.inicio===dias(5)&&fe1.fim===dias(14)&&fe1.retorno===dias(15)&&new RegExp('Termina em '+br(dias(14))).test(prev), JSON.stringify(fe1&&{i:fe1.inicio,f:fe1.fim,r:fe1.retorno}));
  await p.click('tr:has-text("ANA SOUZA") [data-act="rh-fernova"]'); await H.dorme(200); await p.fill('#rh-feri',dias(8)); await p.dispatchEvent('#rh-feri','change'); await p.fill('#rh-ferd','20'); await p.click('[data-act="rh-fersalvar"]'); await H.dorme(300); const t1=await toast();
  await p.fill('#rh-feri',dias(20)); await p.dispatchEvent('#rh-feri','change'); await p.fill('#rh-ferd','25'); await p.click('[data-act="rh-fersalvar"]'); await H.dorme(300); const t2=await toast();
  await p.fill('#rh-ferd','20'); await p.click('[data-act="rh-fersalvar"]'); await H.dorme(600); s=await srv();
  const fsAna=Object.values(s).filter(x=>x&&x.funcId==='f0'&&x.status==='marcada');
  ok('Férias em partes (10 + 20): recusa datas sobrepostas e mais dias do que faltam', /Já tem férias marcadas/.test(t1)&&/faltam só 20 dias/.test(t2)&&fsAna.length===2&&fsAna.reduce((a,x)=>a+x.dias,0)===30, t1+' | '+t2);
  await p.click('[data-act="rh-pzfil"][data-v="todos"]').catch(()=>{}); await H.dorme(200);
  const ana2=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr')].find(r=>/ANA SOUZA/.test(r.innerText)).querySelector('.pill').innerText);
  ok('Com os 30 dias marcados, a Ana sai do aviso de prazo', ana2==='Em dia', ana2);
  // já tirou
  await p.click('tr:has-text("CARLOS LIMA") [data-act="rh-ferant"]'); await H.dorme(600); s=await srv();
  const ant=Object.values(s).find(x=>x&&x.funcId==='f1'&&x.anterior); const car=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr')].find(r=>/CARLOS/.test(r.innerText)).querySelector('.pill').innerText);
  ok('"Já tirou" registra o período como tirado antes do painel e o vencido some', ant&&ant.dias===30&&!/vencido/i.test(car), car);

  // modelo de aviso de férias com campo perguntado
  await p.evaluate(()=>__T.go('rhdocs')); await p.click('[data-act="rh-dnovo"]'); await p.fill('#rh-dnome','Aviso de férias'); await p.selectOption('#rh-dvale','CLT');
  await p.click('#rh-ed'); await p.keyboard.type('Comunicamos a '); await p.click('[data-act="rh-dtk"][data-k="NOME"]'); await p.keyboard.type(' as férias de '); await p.click('[data-act="rh-dtk"][data-k="FERIAS_INICIO"]');
  await p.keyboard.type(' a '); await p.click('[data-act="rh-dtk"][data-k="FERIAS_FIM"]'); await p.keyboard.type(', volta em '); await p.click('[data-act="rh-dtk"][data-k="FERIAS_RETORNO"]'); await p.keyboard.type(', período '); await p.click('[data-act="rh-dtk"][data-k="PERIODO_AQUISITIVO"]');
  await p.keyboard.type('. Aviso dado em '); resposta='Data do aviso'; await p.click('[data-act="rh-dfmt"][data-v="pergunta"]'); await H.dorme(200); await p.keyboard.type('. Obs.: {?Observação do RH}');
  await p.click('[data-act="rh-dsalvar"]'); await H.dorme(600); s=await srv(); const md=Object.values(s).find(x=>x&&x.nome==='Aviso de férias');
  ok('Campo perguntado: pelo botão e digitado como {?pergunta} (como vem do Word)', md&&/class="rh-tq" data-q="Data do aviso"/.test(md.html)&&/class="rh-tq" data-q="Observação do RH"/.test(md.html)&&/data-k="FERIAS_INICIO"/.test(md.html), md&&md.html.slice(-260));
  // gerar o aviso direto das férias marcadas
  await p.evaluate(()=>__T.go('rhferias')); await H.dorme(300); const av0=await p.evaluate(()=>document.querySelectorAll('[data-act="rh-dgfer"]').length);
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(200); const v2=await view();
  ok('Férias começando em até 15 dias sem aviso: avisa no Início e mostra "Gerar aviso"', av0===2&&/Aviso de férias: ANA SOUZA\s*as férias começam em/.test(v2), 'botões: '+av0);
  await p.evaluate(()=>__T.go('rhferias')); await H.dorme(200); await p.click('.rh-v2fmi:has-text("'+br(dias(5))+'") [data-act="rh-dgfer"]'); await H.dorme(500);
  const g=await p.evaluate(()=>({v:__T.S().view,m:(document.querySelector('.rh-v2dm.sel b')||{}).textContent,f:(document.getElementById('rh-dgfe')||{selectedOptions:[{text:''}]}).selectedOptions[0].text,q:[...document.querySelectorAll('[data-rh-dq]')].map(x=>x.type),doc:document.querySelector('.rh-pageg').innerText.replace(/ /g,' ')}));
  ok('"Gerar aviso" abre o documento com o modelo, as férias certas e as perguntas (data vira calendário)', g.v==='rhdocs'&&g.m==='Aviso de férias'&&g.f.startsWith(br(dias(5)))&&g.q.join(',')==='date,text'&&new RegExp('ANA SOUZA as férias de '+br(dias(5))+' a '+br(dias(14))+', volta em '+br(dias(15))).test(g.doc)&&/\[Data do aviso\]/.test(g.doc), g.doc.slice(0,200));
  await p.click('[data-act="rh-dgo"][data-v="word"]'); await H.dorme(300); const t3=await toast();
  await p.fill('[data-rh-dq="0"]',dias(0)); await p.fill('[data-rh-dq="1"]','Gozo em casa'); await H.dorme(800);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.click('[data-act="rh-dgo"][data-v="word"]')]); await H.dorme(600);
  const word=dl?fs.readFileSync(await dl.path(),'utf8'):''; s=await srv(); const dg=Object.values(s).find(x=>x&&x.modelo==='Aviso de férias');
  ok('Sem responder as perguntas não gera; respondendo, o Word sai com a data formatada e o histórico guarda férias e respostas', /Responda: Data do aviso · Observação do RH/.test(t3)&&new RegExp('Aviso dado em '+br(dias(0))+'\\. Obs\\.: Gozo em casa').test(word.replace(/&nbsp;| /g,' '))&&dg&&dg.feriasId&&dg.respostas['Data do aviso']===dias(0), t3);
  await p.evaluate(()=>__T.go('rhferias')); await H.dorme(300); const gerado=await p.evaluate(()=>[...document.querySelectorAll('.card')].find(c=>/Já marcadas/.test(c.innerText)).innerText);
  ok('Depois de gerado, a férias mostra "Gerado" e sai do aviso', /Aviso gerado/.test(gerado)&&(await p.evaluate(()=>document.querySelectorAll('[data-act="rh-dgfer"]').length))===1);
  await p.click('.rh-v2fmi:has-text("'+br(dias(20))+'") [data-act="rh-fercanc"]'); await H.dorme(500); s=await srv();
  ok('Desmarcar férias guarda como cancelada (não apaga)', Object.values(s).some(x=>x&&x.funcId==='f0'&&x.status==='cancelada'&&x.canceladaPor==='Paula RH'));

  // PJ
  await p.click('[data-act="rh-pzv"][data-v="pj"]'); await H.dorme(200);
  const pj=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.rh-tf tbody tr')].map(r=>[r.querySelector('b').innerText,r.innerText.replace(/\n/g,' ')])));
  ok('Troca dos PJ: conta da última troca ou, sem troca, da admissão', /última troca/.test(pj['RAFAEL NUNES'])&&/Em dia/.test(pj['RAFAEL NUNES'])&&/admissão/.test(pj['PEDRO ALVES'])&&/Troca em 10 dias/.test(pj['PEDRO ALVES'])&&/Troca atrasada/.test(pj['JOAO PJ']), JSON.stringify(pj).slice(0,240));
  await p.click('tr:has-text("JOAO PJ") [data-act="rh-pjtroca"]'); await H.dorme(200); await p.fill('#rh-pjd',dias(3)); await p.dispatchEvent('#rh-pjd','change'); await p.click('[data-act="rh-pjsalvar"]'); await H.dorme(300); const t4=await toast();
  await p.fill('#rh-pjd',dias(0)); await p.dispatchEvent('#rh-pjd','change'); await p.fill('#rh-pjo','contrato novo'); await p.click('[data-act="rh-pjsalvar"]'); await H.dorme(600); s=await srv(); const jo=s['rh/dados/funcionarios/f5'];
  const jl=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr')].find(r=>/JOAO PJ/.test(r.innerText)).innerText.replace(/\n/g,' '));
  ok('Registrar troca: não aceita data futura, guarda o histórico e a próxima fica 3 meses depois', /não pode ser no futuro/.test(t4)&&jo.ultimaTroca===dias(0)&&jo.trocas.length===1&&jo.trocas[0].obs==='contrato novo'&&new RegExp(br(meses(3))).test(jl)&&/Em dia/.test(jl), jl);
  const errosRH=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !errosRH.length, errosRH.join(' | '));

  // Meu dia da dona não mostra os avisos do RH (pedido de 13/10)
  const C=await H.abrir({viewport:{width:1440,height:900}}); await H.preparar(C.page,d); await C.page.goto(H.BASE); await H.entrar(C.page,'iasmyn','senha123'); await H.dorme(3000);
  await C.page.evaluate(()=>__T.go('meudia')); await H.dorme(800); const md2=await C.page.evaluate(()=>document.getElementById('view').innerText);
  ok('Meu dia (dona) não mostra os avisos de férias e troca do PJ (ficam no Início do RH)', !/Férias: ANA SOUZA|Troca do PJ: PEDRO ALVES/.test(md2), (md2.match(/AVISOS[\s\S]{0,300}/)||[''])[0].replace(/\n/g,' | '));
  await C.browser.close();
  const f=res.filter(x=>!x.ok).length; console.log(f?f+' FALHOU':'TODOS PASSARAM'); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
