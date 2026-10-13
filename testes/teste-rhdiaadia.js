/* RH · dia a dia (12/10, 4ª parte): Agenda + arquivo do Outlook, relatório do mês, busca e ficha completa da pessoa,
   admissão em um passo, documentos em lote e planilha de carga inicial. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const iso=d=>d.toISOString().slice(0,10), dias=n=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return iso(d); };
const anos=(a,n)=>{ const d=new Date(); d.setHours(12,0,0,0); d.setFullYear(d.getFullYear()+a); d.setDate(d.getDate()+(n||0)); return iso(d); };
const br=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4), M=dias(0).slice(0,7);
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  const F={f0:['ANA SOUZA','52998224725','CLT',dias(-35),'Linha 1'],f1:['CARLOS LIMA','11144477735','CLT',anos(-2,-40),'Linha 1'],f2:['MARIA COSTA','74682489070','CLT',anos(-5,3),'Linha 1'],
    f3:['PEDRO ALVES','86288366757','PJ',dias(-80),'Manutenção'],f4:['ELAINE DIAS','85361713047','CLT',dias(-2),'Administrativo'],f5:['JOAO NOVO','28625587041','PJ',anos(-3),'Manutenção']};
  Object.entries(F).forEach(([k,[n,c,t,a,st]])=>D['rh/dados/funcionarios/'+k]={nome:n,cpf:c,tipo:t,empresa:t==='PJ'?'NEXUS':'COLAFIX',status:'Ativo',admissao:a,funcao:'Operador de produção',setor:st});
  Object.assign(D['rh/dados/funcionarios/f2'],{nascimento:anos(-30,6),salario:2150});
  Object.assign(D['rh/dados/funcionarios/f5'],{desligAgendado:true,desligamento:dias(25),desligMotivo:'Fim do contrato (PJ)',ultimaTroca:dias(-10)});
  [0,1,2,3].forEach(k=>D['rh/dados/ferias/ant'+k]={funcId:'f2',funcionario:'MARIA COSTA',aquisitivo:anos(-5+k,3),aquisitivoFim:anos(-4+k,2),dias:30,anterior:true,status:'tirada'});
  D['rh/dados/funcionarios/f9']={nome:'ZECA SAIU',cpf:'21887536034',tipo:'CLT',empresa:'COLAFIX',status:'Desligado',desligamento:dias(0),desligMotivo:'Acordo',admissao:anos(-4),funcao:'X',setor:'Linha 1'};
  D['rh/dados/ferias/x1']={funcId:'f2',funcionario:'MARIA COSTA',aquisitivo:anos(-1,3),aquisitivoFim:dias(2),inicio:dias(4),dias:10,fim:dias(13),retorno:dias(14),status:'marcada'};
  D['rh/dados/terceiros/t1']={nome:'LIMPA TUDO LTDA',empresa:'Limpa Tudo',fim:dias(20),status:'Ativo',aviso:30,docs:[{id:'d1',nome:'ASO',validade:dias(8)}]};
  D['rh/dados/funcoes/fc1']={nome:'Operador de produção',epis:[{nome:'Luva',ca:'1'}],uniformes:[{nome:'Camisa'}]};
  D['rh/dados/modelos/m1']={nome:'Contrato de experiência',vale:'CLT',html:'<p>Contrato de <span class="rh-tk" data-k="NOME"></span>.</p>'};
  D['rh/dados/modelos/m2']={nome:'Comunicado coletivo',vale:'TODOS',html:'<p>Prezado(a) <span class="rh-tk" data-k="NOME"></span>, reunião em <span class="rh-tq" data-q="Data da reunião"></span>.</p>'};
  D['rh/dados/modelos/m3']={nome:'Reajuste',vale:'CLT',html:'<p><span class="rh-tk" data-k="NOME"></span>: salário <span class="rh-tk" data-k="SALARIO"></span>.</p>'};
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3200);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const view=()=>p.evaluate(()=>document.getElementById('view').innerText.replace(/ /g,' '));
  const baixa=async(sel)=>{ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.click(sel)]); return dl?{nome:dl.suggestedFilename(),txt:fs.readFileSync(await dl.path(),'utf8'),path:await dl.path()}:null; };
  const nav=await p.evaluate(()=>[...document.querySelectorAll('#navlist [data-go]')].map(b=>b.innerText.trim()).join('|'));
  ok('Menu ganhou a Agenda logo depois do Início', nav==='Início|Agenda|Funcionários|Fichas do mês|Documentos e contratos|Férias e prazos|Cadastros|Terceirizados', nav);

  // agenda
  await p.evaluate(()=>__T.go('rhagenda')); await H.dorme(400); const ag=await view();
  ok('Agenda: férias marcadas (sem aviso), experiência, PJ, desligamento marcado, terceirizado, documento e aniversário, em ordem de data',
    new RegExp('Começam as férias de MARIA COSTA[\\s\\S]*aviso de férias ainda não gerado').test(ag)&&/Fim da 1ª etapa da experiência de ANA SOUZA/.test(ag)&&/Troca do PJ PEDRO ALVES/.test(ag)&&/Último dia de JOAO NOVO/.test(ag)
    &&/Fim do contrato de LIMPA TUDO LTDA/.test(ag)&&/Vence ASO de LIMPA TUDO LTDA/.test(ag)&&/Aniversário de Maria Costa\s*30 anos/.test(ag)&&ag.indexOf('Começam as férias de MARIA')<ag.indexOf('Vence ASO')&&ag.indexOf('Vence ASO')<ag.indexOf('Fim do contrato de LIMPA'), ag.replace(/\n/g,' | ').slice(0,400));
  ok('Agenda: "Já passou da data" mostra o prazo de férias vencido', /Já passou da data \(1\)[\s\S]*Prazo para dar as férias de CARLOS LIMA/.test(ag)&&!/Prazo para dar as férias de MARIA/.test(ag.split('Já passou')[1].split('Hoje')[0]||''), (ag.match(/Já passou[\s\S]{0,160}/)||[''])[0].replace(/\n/g,' | '));
  const n30=(ag.match(/Abrir/g)||[]).length; await p.click('[data-act="rh-agdias"][data-v="90"]'); await H.dorme(200); const ag90=await view();
  ok('"Próximos 90 dias" mostra mais coisas (ex.: 5 anos de casa e fim da experiência)', (ag90.match(/Abrir/g)||[]).length>n30&&/5 anos de casa de Maria Costa/.test(ag90)&&/Fim da experiência de ANA SOUZA/.test(ag90), n30+' → '+(ag90.match(/Abrir/g)||[]).length);
  const ics=await baixa('[data-act="rh-ics"]'); const ev=(ics&&ics.txt.match(/BEGIN:VEVENT/g)||[]).length, longas=ics?ics.txt.split('\r\n').filter(l=>Buffer.byteLength(l)>75).length:-1;
  ok('"Mandar para o Outlook": arquivo .ics com um evento por compromisso, dia inteiro, lembrete na véspera e linhas dentro do padrão',
    ics&&ics.nome==='Agenda-RH-Colafix.ics'&&/^BEGIN:VCALENDAR\r\n/.test(ics.txt)&&ev>=8&&new RegExp('DTSTART;VALUE=DATE:'+dias(4).replace(/-/g,'')).test(ics.txt)&&/TRIGGER:-PT15H/.test(ics.txt)&&longas===0&&/SUMMARY:RH · Começam as férias de MARIA COSTA/.test(ics.txt), ics&&(ev+' eventos, '+longas+' linhas longas'));

  // relatório do mês
  await p.click('[data-act="rh-agv"][data-v="rel"]'); await H.dorme(300); const rel=await view();
  ok('Relatório do mês: admissão, desligamentos (inclusive o marcado), férias do mês e quadro', /Admissões · 1[\s\S]*ELAINE DIAS/.test(rel)&&/Desligamentos · 1[\s\S]*ZECA SAIU[\s\S]*Acordo/.test(rel)&&/Férias · 1[\s\S]*MARIA COSTA/.test(rel)&&/no quadro no fim do mês/.test(rel), rel.replace(/\n/g,' | ').slice(0,300));
  const xls=await baixa('[data-act="rh-relxls"]');
  ok('Relatório: baixa a planilha (sem a biblioteca do Excel, sai em CSV) com as seções', xls&&/^Relatorio-RH-\d{4}-\d{2}\.(xlsx|csv)$/.test(xls.nome)&&(xls.nome.endsWith('.xlsx')||(/"Admissões"/.test(xls.txt)&&/ELAINE DIAS/.test(xls.txt))), xls&&xls.nome);
  await p.click('[data-act="rh-relimp"]'); await H.dorme(500); const imp=await p.evaluate(()=>{ const f=[...document.querySelectorAll('iframe[aria-hidden="true"]')].pop(); return f?f.contentDocument.body.innerText:''; });
  ok('Relatório: versão para imprimir / salvar PDF', /Relatório do RH ·/.test(imp)&&/ZECA SAIU/.test(imp), imp.slice(0,80));

  // busca e ficha da pessoa
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(200); await p.fill('#rh-bus','mari'); await H.dorme(700);
  await p.click('.rh-busi:has-text("MARIA COSTA")'); await H.dorme(400); const fi=await view();
  ok('Busca no Início abre a ficha completa: dados, prazos, fichas, férias e documentos', /RH · FUNCIONÁRIO\s*MARIA COSTA/.test(fi)&&/4 anos e 11 meses de casa/.test(fi)&&/Salário\s*R\$ 2\.150,00/.test(fi)&&/Prazos/.test(fi)&&/Fichas de EPI e uniforme/.test(fi)&&new RegExp(br(dias(4))+' a '+br(dias(13))).test(fi)&&/DOCUMENTOS/.test(fi), fi.replace(/\n/g,' | ').slice(0,260));
  await p.click('[data-act="rh-pessx"]'); await H.dorme(200); await p.click('.rh-nm:has-text("ANA SOUZA")'); await H.dorme(300); const fa=await view();
  ok('Na lista de Funcionários, o nome abre a ficha (com a experiência)', /RH · FUNCIONÁRIO\s*ANA SOUZA/.test(fa)&&/Experiência[\s\S]*1ª etapa termina em/.test(fa), fa.slice(0,120));

  // admissão em um passo
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(200); await p.click('[data-act="rh-admnova"]'); await H.dorme(300);
  const tit=await p.evaluate(()=>document.querySelector('.rh-form h2').innerText);
  await p.fill('[data-rh-f="nome"]','Bruna Nova'); await p.fill('[data-rh-f="cpf"]','12345678909'); await p.fill('[data-rh-f="funcao"]','Operador de produção'); await p.fill('[data-rh-f="setor"]','Linha 2');
  await p.click('[data-act="rh-salvar"]'); await H.dorme(300); await H.dorme(600); let s=await srv(); const bru=Object.entries(s).find(([k,v])=>k.startsWith('rh/dados/funcionarios/')&&v.nome==='BRUNA NOVA');
  const adm=await p.evaluate(()=>(document.querySelector('.rh-form')||{}).innerText||'');
  ok('Nova admissão: cadastro e depois o roteiro (documentos, contrato, ficha do mês)', /Nova admissão · cadastro/.test(tit)&&bru&&bru[1].admRoteiro===true&&bru[1].admissao===dias(0)&&/NOVA ADMISSÃO\s*BRUNA NOVA/.test(adm)&&/Documentos entregues · 0 de 9/.test(adm)&&/Contrato de experiência/.test(adm)&&/Ficha de EPI e uniforme de/.test(adm), adm.replace(/\n/g,' | ').slice(0,260));
  await p.check('[data-rh-admdoc="RG"]'); await H.dorme(400); await p.check('[data-rh-admdoc="CPF"]'); await H.dorme(500); s=await srv(); const ent=s[bru[0]].admEntregues.map(x=>x.nome).join(',');
  await p.uncheck('[data-rh-admdoc="RG"]'); await H.dorme(500); s=await srv(); const ent2=s[bru[0]].admEntregues.map(x=>x.nome).join(',');
  ok('Marcar e desmarcar documento entregue grava na hora', ent==='RG,CPF'&&ent2==='CPF', ent+' → '+ent2);
  await p.click('[data-act="rh-adml"]'); await p.fill('#rh-admlista','RG\nCPF\nCTPS'); await p.click('[data-act="rh-admls"]'); await H.dorme(500); s=await srv();
  const adm2=await p.evaluate(()=>document.querySelector('.rh-form').innerText);
  ok('A lista de documentos da admissão pode ser mudada', JSON.stringify(s['rh/config'].docsAdmissao)==='["RG","CPF","CTPS"]'&&/Documentos entregues · 1 de 3/.test(adm2));
  await p.click('[data-act="rh-admx"]'); await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(300); const v3=await view();
  ok('Início avisa a admissão com documentos faltando', /Admissão: BRUNA NOVA\s*falta entregar 2 documentos: RG, CTPS/.test(v3), (v3.match(/Admissão: BRUNA[^\n]*\n?[^\n]*/)||[''])[0]);
  await p.click('.rh-av:has-text("Admissão: BRUNA") [data-act="rh-admabrir"]'); await H.dorme(300); await p.click('[data-act="rh-admcontr"]'); await H.dorme(400);
  const gc=await p.evaluate(()=>({v:__T.S().view,f:document.getElementById('rh-dgf').selectedOptions[0].text,m:document.getElementById('rh-dgm').selectedOptions[0].text}));
  ok('"Gerar contrato" da admissão já abre com a pessoa e o contrato de experiência', gc.v==='rhdocs'&&gc.f==='BRUNA NOVA'&&gc.m==='Contrato de experiência', JSON.stringify(gc));

  // documentos em lote
  await p.click('[data-act="rh-dlote"][data-v="1"]'); await H.dorme(200); await p.selectOption('#rh-lm','m2'); await H.dorme(200); await p.selectOption('#rh-ls','Linha 1'); await H.dorme(200);
  await p.click('[data-act="rh-ltodos"]'); await H.dorme(200); const nsel=await p.evaluate(()=>document.querySelectorAll('[data-rh-lf]:checked').length);
  const dis=await p.evaluate(()=>document.querySelector('[data-act="rh-lgo"][data-v="word"]').disabled);
  await p.click('[data-act="rh-lgo"][data-v="word"]',{force:true}).catch(()=>{}); await p.fill('[data-rh-dq="0"]',dias(7)); await H.dorme(800);
  const w=await baixa('[data-act="rh-lgo"][data-v="word"]'); s=await srv(); const dgs=Object.values(s).filter(x=>x&&x.modelo==='Comunicado coletivo');
  ok('Várias pessoas: marca o setor inteiro, uma resposta vale para todos, um documento por pessoa (página nova) e histórico de cada uma',
    nsel===3&&w&&/Comunicado coletivo - 3 pessoas\.doc/.test(w.nome)&&['ANA SOUZA','CARLOS LIMA','MARIA COSTA'].every(n=>w.txt.includes(n))&&(w.txt.match(/page-break-before:always/g)||[]).length===2&&w.txt.includes('reunião em '+br(dias(7)))&&dgs.length===3, w&&w.nome+' · histórico: '+dgs.length);
  await p.selectOption('#rh-lm','m3'); await H.dorme(300); await p.click('[data-act="rh-ltodos"]'); await H.dorme(300);
  const prob=await p.evaluate(()=>({t:(document.querySelector('.rh-gg .banner')||{}).innerText||'',d:document.querySelector('[data-act="rh-lgo"][data-v="word"]').disabled}));
  ok('Várias pessoas: avisa quem está sem o dado do modelo (salário) e não deixa gerar', /Complete antes:[\s\S]*ANA SOUZA \(salário\)/.test(prob.t)&&!/MARIA COSTA \(/.test(prob.t)&&prob.d, prob.t);

  // planilha de carga inicial
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(200); await p.click('[data-act="rh-pessx"]').catch(()=>{}); await p.click('[data-act="rh-carga"]'); await H.dorme(300);
  const pl=await baixa('[data-act="rh-cargabaixar"]');
  ok('Importar planilha: baixa a planilha com todos os ativos (sem a biblioteca do Excel, em CSV)', pl&&/^Carga-RH-Colafix\.(xlsx|csv)$/.test(pl.nome)&&(pl.nome.endsWith('.xlsx')||(/"Código \(não mexer\)"/.test(pl.txt)&&/ANA SOUZA/.test(pl.txt)&&!/ZECA SAIU/.test(pl.txt))), pl&&pl.nome);
  const linhas=pl.txt.replace(/^﻿/,'').split('\r\n').map(l=>l.split(';').map(c=>c.replace(/^"|"$/g,'').replace(/""/g,'"')));
  const cab=linhas[0], ci=n=>cab.indexOf(n), set=(nome,col,v)=>{ const r=linhas.find(x=>x[ci('Nome')]===nome); r[ci(col)]=v; };
  set('CARLOS LIMA','Nascimento','15/03/1990'); set('CARLOS LIMA','Salário','2.300,50'); set('CARLOS LIMA','Férias tiradas até o período que terminou em',br(anos(-1,-41)));
  set('PEDRO ALVES','PJ: data da última troca',br(dias(-20))); set('ANA SOUZA','Experiência (prorrogado ou efetivado)','Efetivado'); set('ANA SOUZA','Nascimento','31/02/1990');
  fs.writeFileSync('/tmp/carga-teste.csv','﻿'+linhas.map(r=>r.map(c=>'"'+c.replace(/"/g,'""')+'"').join(';')).join('\r\n'));
  await p.setInputFiles('#rh-cargaf','/tmp/carga-teste.csv'); await H.dorme(800); const pv=await p.evaluate(()=>document.querySelector('.rh-form').innerText);
  ok('Prévia da carga: mostra o que muda e as datas erradas, antes de gravar', /CARLOS LIMA\s*Nascimento, Salário, Férias: 1 período tirado/.test(pv)&&/PEDRO ALVES\s*PJ: data da última troca/.test(pv)&&/ANA SOUZA\s*Experiência: efetivado\s*Nascimento: 31\/02\/1990/.test(pv), pv.replace(/\n/g,' | ').slice(0,400));
  await p.click('[data-act="rh-cargaok"]'); await H.dorme(1200); s=await srv(); const c=s['rh/dados/funcionarios/f1'], pe=s['rh/dados/funcionarios/f3'], an=s['rh/dados/funcionarios/f0'];
  const fc=Object.values(s).filter(x=>x&&x.funcId==='f1'&&x.anterior&&x.origem==='carga');
  ok('Gravar a carga: atualiza só o que veio preenchido, marca as férias já tiradas e não mexe no resto', c.nascimento==='1990-03-15'&&c.salario===2300.5&&fc.length===1&&pe.ultimaTroca===dias(-20)&&an.exp.status==='efetivado'&&!an.nascimento&&an.nome==='ANA SOUZA'&&s['rh/dados/funcionarios/f2'].salario===2150, JSON.stringify({nasc:c.nascimento,sal:c.salario,fer:fc.length,troca:pe.ultimaTroca}));
  const errosRH=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !errosRH.length, errosRH.join(' | '));
  const f=res.filter(x=>!x.ok).length; console.log(f?f+' FALHOU':'TODOS PASSARAM'); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
