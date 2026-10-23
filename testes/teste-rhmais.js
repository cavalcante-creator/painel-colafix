/* RH (12/10, 3ª parte): contrato de experiência 45+45, desligamento em um passo (direto, pelo documento e marcado para
   o futuro), documentos dos terceirizados com validade e aniversários / tempo de casa. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const iso=d=>d.toISOString().slice(0,10), dias=n=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return iso(d); };
const anos=(a,dd)=>{ const d=new Date(); d.setHours(12,0,0,0); d.setFullYear(d.getFullYear()+a); if(dd!=null) d.setDate(dd); return iso(d); };
const br=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
(async()=>{ const {d}=seedManut(); const D=d.docs, M=dias(0).slice(0,7);
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  const F={f0:['ANA SOUZA','52998224725',dias(-35)],f1:['CARLOS LIMA','11144477735',dias(-50)],f2:['BRUNO ROCHA','60759545077',dias(-80)],f3:['MARIA COSTA','74682489070',anos(-2)],
    f4:['ELAINE DIAS','85361713047',anos(-5,1)],f6:['DIEGO MARTINS','28625587041',anos(-1)]};
  Object.entries(F).forEach(([k,[n,c,a]])=>D['rh/dados/funcionarios/'+k]={nome:n,cpf:c,tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:a,funcao:'Operador de produção',setor:'Linha 1'});
  D['rh/dados/funcionarios/f2'].exp={status:'prorrogado'}; D['rh/dados/funcionarios/f4'].nascimento=anos(-36).slice(0,4)+dias(0).slice(4);
  D['rh/dados/funcionarios/f5']={nome:'ZECA ANTIGO',cpf:'21887536034',tipo:'CLT',empresa:'COLAFIX',status:'Desligado',desligamento:dias(-40),admissao:anos(-3),funcao:'Operador de produção',setor:'Linha 1'};
  Object.assign(D['rh/dados/funcionarios/f6'],{desligAgendado:true,desligamento:dias(-1),desligMotivo:'Pedido de demissão'});
  D['rh/dados/funcoes/fc1']={nome:'Operador de produção',epis:[{nome:'Luva',ca:'1'}],uniformes:[{nome:'Camisa'}]};
  D['rh/dados/terceiros/t1']={nome:'LIMPA TUDO LTDA',empresa:'Limpa Tudo',fim:dias(200),status:'Ativo',aviso:30,docs:[{id:'d1',nome:'ASO',validade:dias(5)},{id:'d2',nome:'Certidão negativa de débitos',validade:dias(-3)},{id:'d3',nome:'Seguro de vida',validade:dias(200)}]};
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; let resposta=''; p.on('dialog',x=>x.type()==='prompt'?x.accept(resposta):x.accept());
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3500);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const view=()=>p.evaluate(()=>document.getElementById('view').innerText.replace(/ /g,' '));
  const linha=async(nome)=>p.evaluate(n=>{ const r=[...document.querySelectorAll('.rh-tf tbody tr')].find(x=>x.innerText.includes(n)); return r?r.innerText.replace(/\n/g,' '):''; },nome);

  let s=await srv();
  ok('Desligamento marcado para ontem vira "Desligado" sozinho ao abrir', s['rh/dados/funcionarios/f6'].status==='Desligado'&&s['rh/dados/funcionarios/f6'].desligAgendado===false);
  const v0=await view();
  ok('Início: avisos da experiência (vencendo e vencida) e dos documentos do terceirizado', /Atenção\s*Experiência: ANA SOUZA\s*1ª etapa termina em 9 dias/.test(v0)&&/Vencido\s*Experiência: CARLOS LIMA\s*1ª etapa venceu há 6 dias/.test(v0)&&/Experiência: BRUNO ROCHA\s*experiência termina em 9 dias/.test(v0)
    &&/Vencido\s*Documento: Certidão negativa de débitos · LIMPA TUDO LTDA/.test(v0)&&/Atenção\s*Documento: ASO · LIMPA TUDO LTDA\s*vence em 5 dias/.test(v0)&&!/Seguro de vida/.test(v0)&&!/Experiência: MARIA/.test(v0), v0.replace(/\n/g,' | ').slice(250,900));
  ok('Início: aniversariante de hoje e 5 anos de casa', /Aniversários de/.test(v0)&&/ANIVERSARIANTES[\s\S]*Elaine Dias[\s\S]*36 anos · hoje/.test(v0)&&/TEMPO DE CASA[\s\S]*Elaine Dias\s*5 anos de casa/.test(v0), (v0.match(/Aniversários de[\s\S]{0,200}/)||[''])[0].replace(/\n/g,' | '));

  // experiência
  await p.click('.rh-av:has-text("Experiência: ANA") [data-act="rh-pzabrir"]'); await H.dorme(300);
  const lA=await linha('ANA SOUZA'), lC=await linha('CARLOS LIMA'), lM=await linha('MARIA COSTA');
  ok('Aba Experiência: etapas certas (45 e 90 dias) e quem já passou não aparece', new RegExp('1ª até '+br(dias(9))).test(lA)&&new RegExp('2ª até '+br(dias(54))).test(lA)&&/1ª etapa venceu há 6 dias/.test(lC)&&!lM, lA+' | '+lC);
  await p.click('tr:has-text("ANA SOUZA") [data-act="rh-expprorr"]'); await H.dorme(600); s=await srv(); const lA2=await linha('ANA SOUZA');
  ok('Prorrogar: passa para a 2ª etapa', s['rh/dados/funcionarios/f0'].exp.status==='prorrogado'&&new RegExp('2ª etapa até '+br(dias(54))).test(lA2), lA2);
  await p.click('tr:has-text("BRUNO ROCHA") [data-act="rh-expefet"]'); await H.dorme(600); s=await srv();
  ok('Efetivar: sai da lista de experiência', s['rh/dados/funcionarios/f2'].exp.status==='efetivado'&&!(await linha('BRUNO ROCHA')));
  await p.click('tr:has-text("CARLOS LIMA") [data-act="rh-desl"]'); await H.dorme(300);
  const mot=await p.inputValue('#rh-desm'); await p.click('[data-act="rh-deslsalvar"]'); await H.dorme(600); s=await srv(); const c=s['rh/dados/funcionarios/f1'];
  ok('Desligar da experiência: motivo sugerido, fica Desligado hoje e sai da lista', mot==='Término do contrato de experiência'&&c.status==='Desligado'&&c.desligamento===dias(0)&&c.desligMotivo===mot&&c.exp.status==='desligado'&&!(await linha('CARLOS LIMA')), mot);
  await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(500); const fichas=await p.evaluate(()=>[...document.querySelectorAll('.rh-tf tbody tr b')].map(b=>b.innerText));
  const dados=await p.evaluate(()=>window.RHAPI.getDadosPlanilha().then(x=>x.colaboradores.filter(r=>/CARLOS|ZECA/.test(r[0])).map(r=>r[0]+':'+r[6])));
  ok('Quem saiu este mês continua nas fichas do mês; quem saiu antes, não', fichas.includes('CARLOS LIMA')&&!fichas.includes('ZECA ANTIGO')&&dados.includes('CARLOS LIMA:Ativo')&&dados.includes('ZECA ANTIGO:Inativo'), JSON.stringify(dados));

  // desligamento pelo documento (aviso trabalhado: data no futuro)
  await p.evaluate(()=>__T.go('rhdocs')); await p.click('[data-act="rh-dnovo"]'); await p.fill('#rh-dnome','Aviso de demissão trabalhado'); await H.dorme(100);
  await p.click('#rh-ed'); await p.keyboard.type('Comunicamos a '); await p.click('[data-act="rh-dtk"][data-k="NOME"]'); await p.keyboard.type(' o aviso. Último dia: {?Último dia de trabalho}.');
  const ck=await p.isChecked('#rh-ddesl').catch(()=>null);
  await p.click('[data-act="rh-dsalvar"]'); await H.dorme(600); s=await srv(); const md=Object.values(s).find(x=>x&&x.nome==='Aviso de demissão trabalhado');
  ok('Modelo de demissão já vem marcado como "desliga o funcionário"', ck===true&&md&&md.desliga===true, 'marcado: '+ck);
  await p.click('[data-act="rh-dv"][data-v="gerar"]'); await p.click('[data-act="rh-dgpick"][data-id="f3"]'); await H.dorme(300); await p.fill('[data-rh-dq="0"]',dias(30)); await H.dorme(800);
  const dd=await p.inputValue('#rh-dgdd'), aviso=await p.evaluate(()=>document.querySelector('.rh-v2d3').innerText);
  await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.click('[data-act="rh-dgo"][data-v="word"]')]); await H.dorme(700); s=await srv(); const ma=s['rh/dados/funcionarios/f3'];
  ok('Gerando o aviso: data do desligamento vem da resposta; no futuro fica marcado e a pessoa continua ativa', dd===dias(30)&&/Continua ativo até essa data/.test(aviso)&&ma.status==='Ativo'&&ma.desligAgendado===true&&ma.desligamento===dias(30)&&ma.desligMotivo==='Aviso de demissão trabalhado', JSON.stringify({st:ma.status,ag:ma.desligAgendado,d:ma.desligamento}));
  const ainda=await p.evaluate(()=>[...document.querySelectorAll('[data-act="rh-dgpick"] b')].map(o=>o.textContent).join('|'));
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(300); await p.click('[data-act="rh-fusel"][data-id="f3"]'); await H.dorme(300); const lf=await p.evaluate(()=>document.querySelector('.rh-v2d').innerText.replace(/\n/g,' '));
  ok('Funcionários mostra "sai em"; a pessoa continua na lista do documento', new RegExp('Sai em\\s*'+br(dias(30))).test(lf)&&/MARIA COSTA/.test(ainda), lf);
  await p.click('.rh-v2d [data-act="rh-ed"]'); await H.dorme(200); await p.click('[data-act="rh-desagx"]'); await H.dorme(600); s=await srv();
  ok('"Cancelar desligamento" tira a marcação', s['rh/dados/funcionarios/f3'].desligAgendado===false&&!s['rh/dados/funcionarios/f3'].desligamento);
  // desligar direto pelo cadastro, hoje
  await p.click('[data-act="rh-desl"]'); await H.dorme(300); await p.fill('#rh-desm','Pedido de demissão'); await p.click('[data-act="rh-deslsalvar"]'); await H.dorme(600); s=await srv();
  ok('Desligar pelo cadastro: Desligado hoje, com motivo', s['rh/dados/funcionarios/f3'].status==='Desligado'&&s['rh/dados/funcionarios/f3'].desligMotivo==='Pedido de demissão');

  // terceirizados: documentos
  await p.evaluate(()=>__T.go('rhterc')); await H.dorme(300); const lt=await p.evaluate(()=>[...document.querySelectorAll('.rh-t tbody tr')][0].innerText.replace(/\n/g,' '));
  ok('Terceirizados: mostra documento vencido e o botão Documentos (3)', /1 documento vencido/.test(lt)&&/Documentos \(3\)/.test(lt), lt);
  await p.click('[data-act="rh-tdoc"]'); await H.dorme(300); await p.fill('#rh-tdn','Treinamento NR-35'); await p.fill('#rh-tdv',dias(100)); await p.setInputFiles('#rh-tdf','foto-a.png');
  await p.click('[data-act="rh-tdadd"]'); await H.dorme(900); s=await srv(); let t=s['rh/dados/terceiros/t1'];
  const nr=t.docs.find(x=>x.nome==='Treinamento NR-35'); const arq=Object.values(s).find(x=>x&&x.tipo==='documento'&&/Treinamento NR-35 - LIMPA TUDO LTDA\.png/.test(x.nome||''));
  ok('Adicionar documento com validade e arquivo', nr&&nr.validade===dias(100)&&nr.arquivo&&/rhfile=/.test(nr.arquivo.url)&&arq, nr&&JSON.stringify(nr.arquivo));
  await p.click('.rh-dl:has-text("Certidão negativa") [data-act="rh-tdrem"]'); await H.dorme(600); s=await srv(); t=s['rh/dados/terceiros/t1'];
  await p.click('[data-act="rh-tdocx"]'); await H.dorme(200); const lt2=await p.evaluate(()=>[...document.querySelectorAll('.rh-t tbody tr')][0].innerText.replace(/\n/g,' '));
  ok('"Tirar" guarda como removido (não apaga) e o aviso de vencido some', t.docs.find(x=>x.id==='d2').removido===true&&t.docs.length===4&&/1 documento vencendo/.test(lt2)&&/Documentos \(3\)/.test(lt2), lt2);
  await p.setInputFiles('input[data-rh-tdanx]','foto-b.png').catch(()=>{});
  const errosRH=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !errosRH.length, errosRH.join(' | '));
  const f=res.filter(x=>!x.ok).length; console.log(f?f+' FALHOU':'TODOS PASSARAM'); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
