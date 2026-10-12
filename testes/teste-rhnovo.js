/* RH no visual do exemplo (12/10): Início, Fichas do mês (lista e por setor), anexar assinada, gerar e imprimir,
   Documentos e contratos (modelo com campos, salário por extenso, Word, histórico, guardar no cadastro) e menu na lateral. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
function semear(d){ const D=d.docs, m=H_mes();
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  const F=[['ANA SOUZA','52998224725','Operadora de produção','Linha 1','CLT','COLAFIX','Ativo'],['CARLOS LIMA','11144477735','Operador de produção','Linha 2','CLT','COLAFIX','Ativo'],
    ['JOANA PEREIRA','39053344705','Almoxarife','Almoxarifado','CLT','COLAFIX','Férias'],['PEDRO ALVES','86288366757','Mecânico','Manutenção','PJ','NEXUS','Ativo'],
    ['MARIA COSTA','74682489070','Operadora de produção','Linha 1','CLT','COLAFIX','Ativo'],['BRUNO ROCHA','60759545077','Operador de produção','Linha 1','CLT','COLAFIX','Ativo'],
    ['DIEGO MARTINS','28625587041','Operador de produção','Linha 2','CLT','COLAFIX','Ativo'],['RAFAEL NUNES','04589523061','Mecânico','Manutenção','CLT','COLAFIX','Afastado'],
    ['ELAINE DIAS','85361713047','Auxiliar administrativo','Administrativo','CLT','COLAFIX','Ativo'],['ZECA ANTIGO','21887536034','Almoxarife','Almoxarifado','CLT','COLAFIX','Desligado']];
  F.forEach((f,i)=>D['rh/dados/funcionarios/f'+i]={nome:f[0],cpf:f[1],funcao:f[2],setor:f[3],tipo:f[4],empresa:f[5],status:f[6],admissao:'2024-03-10'});
  D['rh/dados/funcoes/fc0']={nome:'Operadora de produção',epis:[{nome:'Luva de proteção',ca:'12345'}],uniformes:[{nome:'Camisa'}]};
  D['rh/dados/funcoes/fc1']={nome:'Operador de produção',epis:[{nome:'Luva de proteção',ca:'12345'}],uniformes:[{nome:'Camisa'}]};
  D['rh/dados/funcoes/fc2']={nome:'Almoxarife',epis:[{nome:'Luva de proteção',ca:'12345'}],uniformes:[{nome:'Camisa'}]};
  D['rh/dados/funcoes/fc3']={nome:'Auxiliar administrativo',epis:[{nome:'Protetor auricular',ca:'11223'}],uniformes:[{nome:'Camisa'}]};
  const dd=k=>{ const x=new Date(); x.setDate(x.getDate()+k); return x.toISOString().slice(0,10); };
  D['rh/dados/terceiros/t1']={nome:'LIMPA TUDO LTDA',empresa:'Limpa Tudo',fim:dd(-2),status:'Ativo',aviso:30};
  D['rh/dados/terceiros/t2']={nome:'SEGURA VIGILÂNCIA',empresa:'Segura',fim:dd(9),status:'Ativo',aviso:30};
  D['rh/dados/terceiros/t3']={nome:'ANTIGO LTDA',empresa:'X',fim:dd(-90),status:'Encerrado'};
  D['rh/dados/fichasmes/'+m]={mes:m,impressas:{f0:{em:m+'-01T10:00:00Z'},f6:{em:m+'-01T10:00:00Z'}},assinadas:{f1:{em:m+'-08T10:00:00Z',url:'https://exemplo.invalid/a.pdf'},f4:{em:m+'-07T10:00:00Z',url:'x'},f8:{em:m+'-07T10:00:00Z',url:'x'}}};
  return m; }
function H_mes(){ const x=new Date(); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'); }
(async()=>{ const {d}=seedManut(); const M=semear(d);
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const view=()=>p.evaluate(()=>document.getElementById('view').innerText);
  const espera=async(f,ms,pg)=>{ const t0=Date.now(); while(Date.now()-t0<(ms||10000)){ if(await (pg||p).evaluate(f).catch(()=>false)) return true; await H.dorme(200); } return false; };

  // ---- Início
  const v0=await view(); const nav=await p.evaluate(()=>[...document.querySelectorAll('#navlist [data-go]')].map(b=>b.innerText.trim()).join('|'));
  ok('Quem só tem RH vê as 6 telas do exemplo na lateral e abre no Início', nav==='Início|Agenda|Funcionários|Fichas do mês|Documentos e contratos|Férias e prazos|Funções e EPIs|Terceirizados'&&/(Bom dia|Boa tarde|Boa noite), Paula/.test(v0), nav);
  ok('Início: 7 em atividade, 1 de férias, 1 afastado, 2 terceirizados (sem contar desligado e encerrado)', /7\s*em atividade/.test(v0)&&/1\s*de férias/.test(v0)&&/1\s*afastado/.test(v0)&&/2\s*terceirizados/.test(v0), v0.replace(/\n/g,' ').slice(0,200));
  ok('Início: fichas do mês 3 assinadas · 2 falta assinar · 4 não geradas', /3\s*assinadas e anexadas/.test(v0)&&/2\s*impressas, falta assinar/.test(v0)&&/4\s*ainda não geradas/.test(v0));
  ok('Avisos: contrato vencido, contrato vencendo e função sem EPI (com quantas pessoas)', /Vencido\s*Contrato: LIMPA TUDO LTDA\s*venceu há 2 dias/.test(v0)&&/Contrato: SEGURA VIGILÂNCIA\s*vence em 9 dias/.test(v0)&&/Função "Mecânico" sem EPI cadastrado\s*a ficha de 2 pessoas sai sem itens/.test(v0)&&!/ANTIGO/.test(v0));
  await p.click('.rh-av:has-text("Mecânico") [data-act="rh-fsemepi"]'); await H.dorme(300);
  const fe=await p.evaluate(()=>({v:__T.S().view,n:(document.querySelector('[data-rh-ff="nome"]')||{}).value}));
  ok('"Resolver" abre a função Mecânico para cadastrar os EPIs', fe.v==='rhfuncoes'&&fe.n==='Mecânico', JSON.stringify(fe));

  // ---- Fichas do mês, lista
  await p.evaluate(()=>__T.go('rhinicio')); await p.click('.head [data-act="rh-fabrir"]'); await H.dorme(400);
  const v1=await view(); const sit=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.rh-tf tbody tr')].map(r=>[r.querySelector('b').innerText,r.querySelector('.pill').innerText])));
  ok('Fichas do mês: contagens nos filtros e situação certa de cada um', /Todas · 9/.test(v1)&&/Não geradas · 4/.test(v1)&&/Falta assinar · 2/.test(v1)&&/Assinadas · 3/.test(v1)
    &&sit['ANA SOUZA']==='Falta assinar'&&/^Assinada · 08\//.test(sit['CARLOS LIMA'])&&sit['JOANA PEREIRA']==='Não gerada'&&sit['PEDRO ALVES']==='Função sem EPI'&&!sit['ZECA ANTIGO'], JSON.stringify(sit));
  await p.click('[data-act="rh-fchip"][data-v="imp"]'); const soImp=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr b')].map(b=>b.innerText).join(','));
  await p.click('[data-act="rh-fchip"][data-v="todas"]'); await p.fill('#rh-fq','111.444'); await H.dorme(700); const porCpf=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr b')].map(b=>b.innerText).join(','));
  await p.fill('#rh-fq',''); await H.dorme(700);
  ok('Filtro "Falta assinar" e busca por CPF', soImp==='ANA SOUZA,DIEGO MARTINS'&&porCpf==='CARLOS LIMA', soImp+' | '+porCpf);
  const temPrev=await espera(()=>{ const f=document.querySelector('.rh-pv iframe'); return f&&f.contentDocument&&/Ficha de Controle e Entrega de Uniforme/.test(f.contentDocument.body.innerText); },15000);
  await p.click('.rh-tf tr:has-text("ANA SOUZA")'); await H.dorme(300);
  const pv=await espera(()=>{ const f=document.querySelector('.rh-pv iframe'); return f&&/ANA SOUZA/.test(f.contentDocument.body.innerText)&&/529\.982\.247-25/.test(f.contentDocument.body.innerText); },8000);
  const pvTit=await p.evaluate(()=>document.querySelector('.rh-pvc').innerText);
  ok('Prévia ao lado: a ficha de verdade (mesmo modelo de hoje) de quem foi clicado', temPrev&&pv&&/Ficha de Ana Souza/.test(pvTit)&&/gerada em 01\/\d\d · impressa/.test(pvTit), pvTit.replace(/\n/g,' ').slice(0,120));

  // anexar assinada (Ana)
  await p.setInputFiles('[data-rh-anx="f0"] >> nth=0','foto-a.png').catch(async()=>{ await p.setInputFiles('.rh-tf input[data-rh-anx="f0"]','foto-a.png'); });
  const ass=await espera(()=>{ const r=[...document.querySelectorAll('.rh-tf tbody tr')].find(x=>/ANA SOUZA/.test(x.innerText)); return r&&/Assinada/.test(r.innerText); },8000);
  let s=await srv(); const fm=s['rh/dados/fichasmes/'+M]; const arq=Object.entries(s).find(([k,v])=>k.startsWith('rh/arquivos/lista/')&&v.tipo==='escaneada');
  ok('Anexar assinada: guarda o arquivo com o nome do funcionário e o mês, e a Ana passa a "Assinada"', ass&&fm.assinadas.f0&&/^ANA SOUZA - /.test(arq&&arq[1].nome)&&fm.assinadas.f1, arq&&arq[1].nome);

  // gerar para quem não tem (Bruno) → impressa
  await p.click('.rh-tf tr:has-text("BRUNO ROCHA") [data-act="rh-fger"]');
  const fr0=await espera(()=>__T.S().view==='rhfichas'&&!!document.getElementById('rh-fr-slot'),5000); let fr=null;
  for(let i=0;i<40&&!fr;i++){ fr=p.frames().find(f=>/rh-fichas/.test(f.url())); await H.dorme(200); }
  const gerou=fr&&await espera(()=>/BRUNO ROCHA/.test((document.getElementById('preview-wrap')||{}).innerText||''),15000,fr);
  const so1=fr&&await fr.evaluate(()=>document.querySelectorAll('#preview-wrap .ficha-set').length);
  await fr.evaluate(()=>window.dispatchEvent(new Event('beforeprint'))); await H.dorme(600); s=await srv();
  ok('"Gerar" abre Gerar e imprimir com a ficha só dessa pessoa; ao imprimir fica "Falta assinar"', fr0&&gerou&&so1===1&&s['rh/dados/fichasmes/'+M].impressas.f5&&s['rh/dados/fichasmes/'+M].impressas.f0, 'fichas na prévia: '+so1);
  await p.click('[data-act="rh-fvmes"]'); await H.dorme(300);
  const v2=await view(); ok('Voltando à lista: Bruno "Falta assinar", contagem atualizada', /Falta assinar · 2/.test(v2)&&/Assinadas · 4/.test(v2)&&/Não geradas · 3/.test(v2), (v2.match(/Todas[^\n]*\n?[^\n]*/)||[''])[0]);
  // gerar as que faltam (3: Joana, Pedro e Rafael; função sem EPI pede confirmação, aceita)
  await p.click('[data-act="rh-ffaltam"]'); const nfal=await espera(()=>document.querySelectorAll('#preview-wrap .ficha-set').length===3,15000,fr);
  const nomes=await fr.evaluate(()=>[...document.querySelectorAll('#preview-wrap .set-label')].map(x=>x.innerText.split(' — ')[0]).join(','));
  ok('"Gerar as 3 que faltam" gera exatamente quem falta', nfal&&nomes==='JOANA PEREIRA,PEDRO ALVES,RAFAEL NUNES', nomes);
  const fil=await fr.evaluate(()=>!!document.querySelector('.filtros-tit')&&!!document.querySelector('.acoes-linha #btn-gerar-todos')&&getComputedStyle(document.querySelector('.app-header')).display==='none');
  ok('Gerar e imprimir no visual do exemplo (sem o cabeçalho antigo, filtros e botões embaixo)', fil);
  await p.click('[data-act="rh-fvmes"]'); await H.dorme(300);

  // ---- por setor
  await p.click('[data-act="rh-fmodo"][data-v="setor"]'); await H.dorme(300);
  const sets=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.rh-set')].map(c=>[c.querySelector('h2').innerText,c.querySelector('.rh-ch span').innerText])));
  const lsm=await p.evaluate(()=>localStorage.getItem('rh.fichas.modo'));
  ok('Por setor: um cartão por setor com "N de M assinadas" e "todas assinadas"; a escolha fica lembrada', sets['Administrativo']==='todas assinadas'&&sets['Linha 1']==='2 de 3 assinadas'&&sets['Manutenção']==='0 de 2 assinadas'&&lsm==='setor', JSON.stringify(sets));
  await p.click('.rh-set:has-text("Linha 2") [data-act="rh-fsetor"]'); await H.dorme(300);
  const l2=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr b')].map(b=>b.innerText).join(','));
  ok('"Abrir Linha 2" volta para a lista só daquele setor', l2==='DIEGO MARTINS,CARLOS LIMA', l2);

  // ---- documentos e contratos
  await p.evaluate(()=>__T.go('rhdocs')); await p.click('[data-act="rh-dnovo"]'); await p.fill('#rh-dnome','Contrato de trabalho · CLT'); await p.selectOption('#rh-dvale','CLT');
  await p.click('#rh-ed'); await p.keyboard.type('Contrato de '); await p.click('[data-act="rh-dtk"][data-k="NOME"]'); await p.keyboard.type(', CPF {CPF}, função '); await p.click('[data-act="rh-dtk"][data-k="FUNCAO"]');
  await p.keyboard.type('. Salário '); await p.click('[data-act="rh-dtk"][data-k="SALARIO"]'); await p.keyboard.type(' ('); await p.click('[data-act="rh-dtk"][data-k="SALARIO_EXTENSO"]'); await p.keyboard.type('), jornada '); await p.click('[data-act="rh-dtk"][data-k="JORNADA"]'); await p.keyboard.type('. Empresa '); await p.click('[data-act="rh-dtk"][data-k="EMPRESA"]');
  await p.click('[data-act="rh-dsalvar"]'); await H.dorme(600); s=await srv(); const md=Object.values(s).find(x=>x&&x.nome==='Contrato de trabalho · CLT');
  const linhasEd=await p.evaluate(()=>document.querySelectorAll('#rh-ed p, #rh-ed div').length);
  ok('Modelo salvo com os campos (inclusive {CPF} digitado à mão) e sem quebrar linha a cada campo', md&&md.vale==='CLT'&&['NOME','CPF','FUNCAO','SALARIO','SALARIO_EXTENSO','JORNADA','EMPRESA'].every(k=>md.html.includes('data-k="'+k+'"'))&&!/contenteditable|​/.test(md.html)&&linhasEd<=1, md&&md.html.slice(0,160));
  await p.click('[data-act="rh-dprev"]'); const pex=await p.evaluate(()=>document.querySelector('.rh-modal .rh-page').innerText); await p.click('.rh-modal .lnk[data-act="rh-dprevx"]');
  ok('"Ver com dados de exemplo" mostra o texto preenchido', /MARIA DA SILVA/.test(pex)&&/dois mil, cento e cinquenta reais/.test(pex), pex.slice(0,120));
  await p.click('[data-act="rh-dv"][data-v="gerar"]'); await p.selectOption('#rh-dgf','f0'); await H.dorme(300);
  const faltam=await p.evaluate(()=>[...document.querySelectorAll('[data-rh-dx]')].map(x=>x.dataset.rhDx).sort().join(','));
  const ext=async v=>{ await p.fill('[data-rh-dx="salario"]',v); await H.dorme(800); return p.evaluate(()=>{ const t=document.querySelector('.rh-pageg').innerText; return (t.match(/\(([^)]*)\)/)||['',''])[1]; }); };
  const e1=await ext('1.000.000,00'), e2=await ext('1.001,01'), e3=await ext('2100'), e4=await ext('2.150,00');
  ok('Salário por extenso certo', e1==='um milhão de reais'&&e2==='mil e um reais e um centavo'&&e3==='dois mil e cem reais'&&e4==='dois mil, cento e cinquenta reais', [e1,e2,e3,e4].join(' | '));
  await p.fill('[data-rh-dx="jornada"]','44 horas semanais'); await H.dorme(800);
  const doc=await p.evaluate(()=>document.querySelector('.rh-pageg').innerText.replace(/\u00a0/g,' '));
  ok('Gerar contrato: pede só o que falta no cadastro e mostra o documento preenchido', faltam==='jornada,salario'&&/ANA SOUZA, CPF 529\.982\.247-25, função Operadora de produção\. Salário R\$ 2\.150,00/.test(doc)&&/COLFIX INDUSTRIA E COMERCIO LTDA - EPP/.test(doc), doc.slice(0,200));
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.click('[data-act="rh-dgo"][data-v="word"]')]); await H.dorme(800);
  const word=dl?fs.readFileSync(await dl.path(),'utf8'):''; s=await srv(); const dg=Object.values(s).filter(x=>x&&x.modelo==='Contrato de trabalho · CLT'&&x.funcId==='f0');
  ok('Baixar em Word: arquivo .doc com o texto preenchido, sem os realces da tela', dl&&dl.suggestedFilename()==='Contrato de trabalho - CLT - ANA SOUZA.doc'&&/dois mil, cento e cinquenta reais/.test(word)&&!/rh-v|rh-tk/.test(word), dl&&dl.suggestedFilename());
  ok('Histórico (quem gerou e quando) e salário/jornada guardados no cadastro', dg.length===1&&dg[0].porNome==='Paula RH'&&s['rh/dados/funcionarios/f0'].salario===2150&&s['rh/dados/funcionarios/f0'].jornada==='44 horas semanais', JSON.stringify(dg.map(x=>x.acao)));
  const ainda=await p.evaluate(()=>document.querySelectorAll('[data-rh-dx]').length);
  await p.setInputFiles('input[data-rh-danx]','foto-a.png'); await espera(()=>!!document.querySelector('[data-act="rh-dver"]'),8000); s=await srv();
  ok('Depois de guardar não pede mais os dados; anexar o assinado fica no histórico', ainda===0&&Object.values(s).some(x=>x&&x.assinado&&/\(assinado\)\.png$/.test(x.assinado.nome)), 'campos pedidos depois: '+ainda);
  await p.evaluate(()=>__T.go('rhfunc')); await p.click('tr:has-text("ANA SOUZA") [data-act="rh-ed"]'); await H.dorme(300);
  const ff=await p.evaluate(()=>({sal:document.querySelector('[data-rh-f="salario"]').value,docs:document.querySelector('.rh-docs').innerText}));
  ok('Cadastro mostra salário e os documentos gerados', ff.sal==='R$ 2.150,00'&&/Contrato de trabalho · CLT/.test(ff.docs)&&/Ver assinado/.test(ff.docs), JSON.stringify(ff).slice(0,160));
  console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); const errosRH=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close();
  ok('Nenhum erro de JavaScript', !errosRH.length, errosRH.join(' | '));

  // ---- a dona (vários módulos) continua com o menu de módulos e as abas
  const C=await H.abrir({viewport:{width:1440,height:900}}); await H.preparar(C.page,d); await C.page.goto(H.BASE); await H.entrar(C.page,'iasmyn','senha123'); await H.dorme(2500);
  await C.page.evaluate(()=>__T.go('rhinicio')); await H.dorme(500);
  const dn=await C.page.evaluate(()=>({solo:document.body.classList.contains('rh-solo'),abas:[...document.querySelectorAll('#view nav.tabs .tab')].map(t=>t.innerText.trim()).join('|'),mods:document.querySelectorAll('#navlist [data-mod]').length}));
  ok('A dona continua com a lista de módulos e as abas do RH em cima', !dn.solo&&dn.mods>2&&dn.abas==='Início|Agenda|Funcionários|Fichas do mês|Documentos e contratos|Férias e prazos|Funções e EPIs|Terceirizados', JSON.stringify(dn));
  await C.browser.close();
  const f=res.filter(x=>!x.ok).length; console.log(f?f+' FALHOU':'TODOS PASSARAM'); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
