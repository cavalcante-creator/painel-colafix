/* Pedido de 04/11: RH › Pagamento dos PJ — horas pelo Face ID (mesma conta da planilha "Horas trabalhadas Zenith/NEXUS"),
   o RH fecha o valor, pede a nota por link (nota.html, sem login), o PJ manda o XML e o painel confere. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
const xml=(o)=>`<?xml version="1.0" encoding="UTF-8"?><NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infNFSe Id="NFS1"><xLocEmi>Gravataí</xLocEmi><nNFSe>${o.num}</nNFSe>
<emit><CNPJ>${o.prest}</CNPJ><xNome>${o.nomeP}</xNome></emit><valores><vLiq>${o.valor}</vLiq></valores><DPS versao="1.00"><infDPS Id="DPS1"><dhEmi>2026-11-01T10:00:00-03:00</dhEmi><dCompet>2026-10-31</dCompet>
<prest><CNPJ>${o.prest}</CNPJ></prest><toma><CNPJ>${o.toma}</CNPJ><xNome>Tomador</xNome></toma><serv><cServ><xDescServ>Prestação de serviços</xDescServ></cServ></serv>
<valores><vServPrest><vServ>${o.valor}</vServ></vServPrest></valores></infDPS></DPS></infNFSe></NFSe>`;
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção','Manutenção']};
  D['rh/dados/funcionarios/f1']={nome:'JOAO PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',salario:5000,setor:'Produção',funcao:'Operador',status:'Ativo',telefone:'(51) 99999-0000',admissao:'2025-01-10'};
  D['rh/dados/funcionarios/f2']={nome:'MARIA OLIVEIRA TESTE',tipo:'PJ',empresa:'NEXUS',cpf:'55566677788',setor:'Manutenção',funcao:'Mecânica',status:'Ativo',telefone:'51988887777',admissao:'2025-02-01',pjPag:{vh:28.41,ini:'08:00',fim:'18:00',intv:72}};
  D['rh/dados/uniformes/u1']={nome:'Joao Pereira Teste',fid:'f1',setor:'Produção',data:'2026-10-20',itens:[{t:'Camisa',tam:'G',qtd:2}],desc:{nao:false,v:50},parc:{n:1,ini:'2026-10-31',hist:[]},st:'lancado',em:'2026-10-20T10:00:00.000Z',por:'uRH'};
  D['rh/dados/funcionarios/f3']={nome:'CARLOS CLT TESTE',tipo:'CLT',empresa:'COLAFIX',cpf:'99988877766',status:'Ativo'};
  const dias={}, uteis=['16','19','20','21','22','23','26','27','28','29','30'];
  uteis.forEach(x=>{ const k='2026-10-'+x; dias[k]={'11122233344':{p:1,a:1,t:x==='21'?['07:30:00 PORTARIA']:['07:28:10 PORTARIA','12:01:00 REFEITÓRIO','17:20:00 PORTARIA']},'55566677788':{p:1,a:0,t:['08:03:00 PORTARIA','17:58:00 PORTARIA']}}; });
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias,pessoas:{'11122233344':{n:'JOAO PEREIRA TESTE',e:'ZENITH'},'55566677788':{n:'MARIA OLIVEIRA TESTE',e:'NEXUS'}},imp:[]};
  const erros=[]; let B=await H.abrir({viewport:{width:1440,height:950}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), view=()=>p.evaluate(()=>document.getElementById('view').innerText);
  /* a conta do dia, igual à planilha */
  const cd=await p.evaluate(()=>{ const f=window.RHPJPag._calc.contaDia; return [f('07:28','17:20',{ini:'07:30',fim:'17:18',intv:60,tol:5}).m,f('07:40','17:18',{ini:'07:30',fim:'17:18',intv:60,tol:5}).m,f('07:20','17:18',{ini:'07:30',fim:'17:18',intv:60,tol:5}).m,f('07:20','17:18',{ini:'07:30',fim:'17:18',intv:60,tol:5,dentro:true}).m,f('07:30','',{ini:'07:30',fim:'17:18',intv:60,tol:5}).m]; });
  ok('Conta do dia como a planilha (tolerância de 5 min encaixa no horário; fora dela vale a hora real; menos o intervalo)', JSON.stringify(cd)==='[528,518,538,528,0]', JSON.stringify(cd));
  const pr=await p.evaluate(()=>{ const c=window.RHPJPag._calc; return [c.perDe('2026-10-2').de,c.perDe('2026-10-2').ate,c.perDe('2026-11-1').ate,c.perMove('2026-10-2',1),c.perMove('2026-10-1',-1)]; });
  ok('Quinzenas: 16 ao fim do mês, 1 a 15, e a navegação', JSON.stringify(pr)==='["2026-10-16","2026-10-31","2026-11-15","2026-11-1","2026-09-2"]', JSON.stringify(pr));
  /* menu */
  const menu=await p.evaluate(()=>{ const b=document.querySelector('#navlist .gxg-gr[data-go="rhrelmes"]'); if(b) b.click(); return new Promise(r=>setTimeout(()=>r([...document.querySelectorAll('#navlist .gxg-si')].map(x=>x.dataset.go)),500)); });
  ok('Menu do RH: "Pagamento dos PJ" em Relatórios', menu.includes('rhpjpag'), menu.join(','));
  await p.evaluate(()=>{ window.RHPJPag._J.per='2026-10-2'; __T.go('rhpjpag'); }); await H.dorme(1800);
  let s=await view();
  ok('Lista só os PJ, com as horas do Face ID e o valor (salário ÷ 220 = R$ 22,73/h)', /Joao Pereira Teste/.test(s)&&/Maria Oliveira Teste/.test(s)&&!/Carlos Clt/i.test(s)&&/88h00/.test(s)&&/R\$\s?2\.000,00/.test(s)&&/96h48/.test(s)&&/R\$\s?2\.750,09/.test(s), s.replace(/\n/g,' | ').slice(0,900));
  ok('Avisa o dia com só uma passagem', /1 dia para conferir/.test(s));
  await p.click('[data-act="pjp-ab"][data-f="f1"]'); await H.dorme(700);
  const gv=await p.evaluate(()=>{ const g=document.querySelector('.pjp-g'); return g?g.innerText:''; });
  ok('Tocar no nome abre a gaveta da pessoa com os dias, a passagem do Face ID e o dia para corrigir', /Joao Pereira Teste/.test(gv)&&/Horas/.test(gv)&&/Regras desta pessoa/.test(gv)&&/07:28[\s\S]*12:01[\s\S]*17:20/.test(gv)&&/Só uma passagem/.test(gv)&&/Corrigir/.test(gv), gv.replace(/\n/g,' | ').slice(0,500));
  await p.click('[data-act="pjp-dcor"][data-d="2026-10-21"]'); await H.dorme(500);
  await p.fill('#pjp-cs','17:18'); await p.fill('#pjp-cm','Esqueceu de passar no Face ID'); await p.click('[data-act="pjp-dsalva"]'); await H.dorme(900);
  /* descontos: uniforme para confirmar + outro desconto */
  await p.click('[data-act="pjp-tab"][data-v="desc"]'); await H.dorme(600);
  let gd=await p.evaluate(()=>document.querySelector('.pjp-g').innerText);
  ok('Aba Descontos: mostra a parcela do uniforme da quinzena para o RH confirmar (ainda não conta)', /Descontos \(1\)/.test(gd)&&/Uniforme · entrega de 20\/10\/2026/.test(gd)&&/2× Camisa G/.test(gd)&&/Descontar/.test(gd)&&/Para confirmar\s*1/i.test(gd), gd.replace(/\n/g,' | ').slice(0,500));
  let fe0=await p.evaluate(()=>{ const b=document.querySelector('.pjp-g [data-act="pjp-fech"]'); if(b) b.click(); return new Promise(r=>setTimeout(()=>r(document.getElementById('toast')?document.getElementById('toast').innerText:''),700)); });
  ok('Não deixa fechar o valor com o uniforme sem confirmar', /confirme o desconto do uniforme/i.test(fe0), fe0);
  await p.click('[data-act="pjp-uok"]'); await H.dorme(1000);
  await p.fill('#pjp-dxt','Vale / adiantamento'); await p.fill('#pjp-dxv','30,5'); await p.click('[data-act="pjp-dxadd"]'); await H.dorme(900);
  gd=await p.evaluate(()=>document.querySelector('.pjp-g').innerText); let Su=await srv();
  ok('Confirmar o uniforme grava a parcela na entrega e outro desconto entra na conta (aceita vírgula)', /Vai descontar/.test(gd)&&/Vale \/ adiantamento/.test(gd)&&/R\$\s?80,50/.test(gd)&&Su['rh/dados/uniformes/u1'].parc.hist.some(h=>h.q==='2026-10-31'&&h.st==='ok'&&h.v===50)&&Su['rh/dados/pjpag/2026-10-2'].pes.f1.dsc.x[0].v===30.5, gd.replace(/\n/g,' | ').slice(0,500));
  await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/rhpjpag-descontos.png'});
  await p.click('[data-act="pjp-dxx"]'); await H.dorme(900);
  /* feriado: marcar, pagar o dia e tirar */
  await p.click('[data-act="pjp-tab"][data-v="horas"]'); await H.dorme(500);
  await p.click('[data-act="pjp-dcor"][data-d="2026-10-17"]'); await H.dorme(400); await p.fill('#pjp-cm','Dia do Teste'); await p.click('[data-act="pjp-dfer"]'); await H.dorme(900);
  await p.click('[data-act="pjp-dferp"][data-v="1"][data-d="2026-10-17"]'); await H.dorme(900);
  let gf=await p.evaluate(()=>document.querySelector('.pjp-g').innerText);
  ok('Marcar feriado e pagar o dia (conta as horas da escala)', /Feriado · Dia do Teste/.test(gf)&&/feriado pago \(8h48\)/.test(gf)&&/105h36/.test(gf), gf.replace(/\n/g,' | ').slice(0,600));
  await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/rhpjpag-feriado.png'});
  await p.click('[data-act="pjp-dferx"][data-d="2026-10-17"]'); await H.dorme(900);
  s=await p.evaluate(()=>document.querySelector('.pjp-g').innerText); let S=await srv(), doc=S['rh/dados/pjpag/2026-10-2'];
  ok('Corrigir o dia (com motivo) e lançar desconto: refaz a conta (96h48 × 22,7272… − 50 = 2.150,00)', /corrigido · Esqueceu de passar/.test(s)&&/96h48/.test(s)&&/R\$\s?2\.150,00/.test(s)&&doc&&doc.pes.f1.aj['2026-10-21'].s==='17:18'&&doc.pes.f1.aj['2026-10-21'].mot==='Esqueceu de passar no Face ID'&&!doc.pes.f1.desc&&!(doc.pes.f1.dsc.x||[]).length, s.replace(/\n/g,' | ').slice(0,400));
  /* regras desta pessoa */
  await p.click('[data-act="pjp-tab"][data-v="regras"]'); await H.dorme(500);
  await p.fill('#pjp-rtol','10'); await p.click('[data-pjp-dw="6"] + span'); await H.dorme(100); await p.fill('#pjp-rob','Trabalha sábado de manhã'); await p.click('[data-act="pjp-psalva"]'); await H.dorme(900);
  S=await srv(); const rg=S['rh/dados/funcionarios/f1'].pjPag||{};
  ok('Regras desta pessoa ficam no cadastro (tolerância, dias de trabalho, observação)', rg.tol===10&&JSON.stringify(rg.dias)==='[1,2,3,4,5,6]'&&rg.obs==='Trabalha sábado de manhã', JSON.stringify(rg));
  await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/rhpjpag-gaveta.png'});
  await p.click('[data-act="pjp-gx"]',{timeout:4000}); await H.dorme(500);
  s=await view(); ok('Lista com o valor novo', /96h48[\s\S]*R\$\s?2\.150,00/.test(s), s.replace(/\n/g,' | ').slice(0,300));
  /* filtros */
  await p.selectOption('#pjp-emp','NEXUS'); await H.dorme(500); s=await view();
  ok('Filtro por empresa', /Maria Oliveira/.test(s)&&!/Joao Pereira/.test(s));
  await p.click('[data-act="pjp-flimpa"]'); await H.dorme(500);
  /* Excel igual à planilha */
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:15000}).catch(()=>null),p.click('[data-act="pjp-xls"]')]); await H.dorme(800);
  const xl=await p.evaluate(()=>window.__pjpUltimoXls||''); let xinfo='';
  if(dl){ try{ const fp='/tmp/pjp-teste.xlsx'; await dl.saveAs(fp); const EJ=require('exceljs'), wb=new EJ.Workbook(); await wb.xlsx.readFile(fp); const ws=wb.getWorksheet('Horas Trabalhadas Zenith');
      let tit='',hd='',fD='',tot=null; ws.eachRow(r=>{ const a=String(r.getCell(1).value||''); if(/JOAO PEREIRA/.test(a)) tit=String(r.getCell(3).value); if(r.getCell(1).value==='Dia'&&!hd) hd=[1,2,3,4,5,6,7].map(k=>r.getCell(k).value).join('|'); if(!fD&&r.getCell(4).value&&r.getCell(4).value.formula) fD=r.getCell(4).value.formula; if(r.getCell(5).value==='Total a Pagar') tot=r.getCell(6).value; });
      xinfo=JSON.stringify({abas:wb.worksheets.map(w=>w.name),tit,hd,fD,tot}); }catch(e){ xinfo='erro '+e.message; } }
  ok('Excel no formato da planilha: aba por empresa, bloco por pessoa, colunas e fórmulas da planilha, total a pagar', /Pagamento-PJ-2026-10-2\.xlsx/.test(xl)&&/"Resumo","Horas Trabalhadas Zenith","NEXUS"/.test(xinfo)&&/Horário: 07:30hr às 17:18hr/.test(xinfo)&&/Dia\|Entrada\|Saída\|Entrada Tolerância Ajustada\|Saída Tolerância Ajustada\|Total de Horas/.test(xinfo)&&/TIME\(7,20,0\)/.test(xinfo)&&/"result":2150/.test(xinfo), xinfo.slice(0,500));
  await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/rhpjpag.png',fullPage:true});
  await p.click('[data-act="pjp-fech"][data-f="f1"]'); await H.dorme(900); S=await srv(); doc=S['rh/dados/pjpag/2026-10-2'];
  ok('Fechar valor guarda o valor e os dias', doc.pes.f1.st==='fechado'&&doc.pes.f1.fech.valor===2150&&doc.pes.f1.fech.min===5808&&doc.pes.f1.fech.dias.length===16, JSON.stringify(doc.pes.f1.fech).slice(0,200));
  await p.click('[data-act="pjp-ped"][data-f="f1"]'); await H.dorme(1200); S=await srv();
  const pk=Object.keys(S).find(k=>k.startsWith('rh/dados/pjnotaped/')), ped=S[pk], tok=pk.split('/').pop();
  const wa=await p.$eval('[data-act="pjp-wa"]',a=>a.href).catch(()=>''), lk=await p.evaluate(()=>(document.querySelector('.pjp-mod .lk')||{}).textContent||'');
  ok('Pedir nota: cria o pedido (valor, empresa, CNPJ, dias) e abre o WhatsApp do PJ com a mensagem e o link', ped&&ped.valor===2150&&ped.tomador.cnpj==='62.944.495/0001-64'&&/ZENITH/.test(ped.tomador.nome)&&ped.dias.length===11&&/nota\.html\?c=[a-z0-9]{20}$/.test(lk)
    &&/^https:\/\/wa\.me\/5551999990000\?text=/.test(wa)&&/R\$\s2\.150,00/.test(decodeURIComponent(wa))&&decodeURIComponent(wa).includes('nota.html?c='+tok)&&S['rh/dados/pjpag/2026-10-2'].pes.f1.st==='pedido', JSON.stringify({wa:decodeURIComponent(wa).slice(0,300),lk}));
  await p.click('[data-act="pjp-modx"]'); await H.dorme(300);
  /* o celular do PJ (outro aparelho: banco copiado) */
  const B2=await H.abrir({viewport:{width:390,height:844}}); const q=B2.page; await H.preparar(q,{docs:S,users:{}}); await q.goto(H.BASE+'nota.html?c='+tok); await H.dorme(1300);
  const tela=await q.evaluate(()=>document.body.innerText);
  ok('Link do PJ abre sem login com o valor, as horas, o desconto e os dados para emitir', /Olá, Joao!/.test(tela)&&/R\$\s?2\.150,00/.test(tela)&&/96h48/.test(tela)&&/Desconto/.test(tela)&&/62\.944\.495\/0001-64/.test(tela)&&/ZENITH/.test(tela), tela.replace(/\n/g,' | ').slice(0,500));
  await q.setInputFiles('#arq',{name:'nota15.xml',mimeType:'text/xml',buffer:Buffer.from(xml({num:15,prest:'12345678000190',nomeP:'JOAO',toma:'62944495000164',valor:'2150'}))}); await H.dorme(700);
  const chk=await q.evaluate(()=>document.getElementById('chk').innerText), nn=await q.inputValue('#num');
  ok('Lê o XML no próprio celular e mostra que confere', /confere com o pedido/.test(chk)&&nn==='15', chk);
  await q.click('#env'); await H.dorme(1500); const fim=await q.evaluate(()=>document.body.innerText), S2=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  ok('PJ manda a nota: "Nota enviada" e o envio fica guardado', /Nota enviada/.test(fim)&&S2['rh/dados/pjnotaenv/'+tok]&&S2['rh/dados/pjnotaenv/'+tok].fid==='f1'&&S2['rh/dados/pjnotaenv/'+tok].d.length>100, fim.slice(0,200));
  await B2.browser.close();
  /* chega no RH */
  await p.evaluate(s=>{ const o=JSON.parse(localStorage.getItem('__srv')); o.docs=s; localStorage.setItem('__srv',JSON.stringify(o)); window.__mockReconnect&&window.__mockReconnect(); },S2); await H.dorme(2000);
  S=await srv(); doc=S['rh/dados/pjpag/2026-10-2']; s=await view();
  ok('No RH: a nota chega, o painel lê o XML e diz que bate; o link deixa de valer', doc.pes.f1.st==='chegou'&&doc.pes.f1.nota.conf==='ok'&&doc.pes.f1.nota.num==='15'&&doc.pes.f1.nota.valor===2150&&S[pk].usado===true&&/Nota chegou/.test(s), JSON.stringify(doc.pes.f1.nota).slice(0,300));
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(900); await p.click('[data-act="rh-iavt"]').catch(()=>{}); await H.dorme(500); const ini=await view();
  ok('Início do RH avisa a nota para conferir', /nota de PJ chegou para conferir/.test(ini), ini.replace(/\n/g,' | ').slice(0,300));
  await p.evaluate(()=>__T.go('rhpjpag')); await H.dorme(900);
  await p.click('[data-act="pjp-nok"][data-f="f1"]'); await H.dorme(700); await p.click('[data-act="pjp-pago"][data-f="f1"]'); await H.dorme(700); S=await srv();
  ok('Está certa → conferida; Marcar pago → pago (com histórico)', S['rh/dados/pjpag/2026-10-2'].pes.f1.st==='pago'&&S['rh/dados/pjpag/2026-10-2'].pes.f1.hist.length>=5);
  /* a outra PJ: fechar todos, pedir, nota com diferença */
  await p.click('[data-act="pjp-fech"][data-f="f2"]'); await H.dorme(1000); await p.click('[data-act="pjp-ped"][data-f="f2"]'); await H.dorme(1100); S=await srv();
  const pk2=Object.keys(S).find(k=>k.startsWith('rh/dados/pjnotaped/')&&S[k].fid==='f2'), tok2=pk2.split('/').pop(); await p.click('[data-act="pjp-modx"]'); await H.dorme(200);
  const B3=await H.abrir({viewport:{width:390,height:844}}); const q3=B3.page; await H.preparar(q3,{docs:S,users:{}}); await q3.goto(H.BASE+'nota.html?c='+tok2); await H.dorme(1200);
  await q3.setInputFiles('#arq',{name:'n.xml',mimeType:'text/xml',buffer:Buffer.from(xml({num:7,prest:'98765432000155',nomeP:'MARIA',toma:'08813381000130',valor:'2700.00'}))}); await H.dorme(600);
  const chk3=await q3.evaluate(()=>document.getElementById('chk').innerText);
  await q3.click('#env'); await H.dorme(1400); const S3=await q3.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); await B3.browser.close();
  ok('Celular avisa valor diferente e CNPJ errado antes de mandar', /valor da nota[\s\S]*diferente/i.test(chk3)&&/outro CNPJ/.test(chk3), chk3);
  await p.evaluate(s=>{ const o=JSON.parse(localStorage.getItem('__srv')); o.docs=s; localStorage.setItem('__srv',JSON.stringify(o)); window.__mockReconnect&&window.__mockReconnect(); },S3); await H.dorme(2000);
  S=await srv(); const n2=S['rh/dados/pjpag/2026-10-2'].pes.f2.nota;
  ok('No RH a nota com problema fica marcada com o que está errado', n2&&n2.conf==='dif'&&n2.probs.some(x=>/Valor da nota/.test(x))&&n2.probs.some(x=>/outro CNPJ/.test(x)), JSON.stringify(n2&&n2.probs));
  await p.click('[data-act="pjp-nnao"][data-f="f2"]'); await H.dorme(400); await p.fill('#pjp-nmot','CNPJ errado'); await p.click('[data-act="pjp-nnaook"]'); await H.dorme(700); S=await srv();
  ok('Pedir outra: volta para fechado e guarda o motivo', S['rh/dados/pjpag/2026-10-2'].pes.f2.st==='fechado'&&/CNPJ errado/.test(JSON.stringify(S['rh/dados/pjpag/2026-10-2'].pes.f2.hist)));
  await p.click('[data-act="pjp-pdf"]'); await H.dorme(1500); const pdfN=await p.evaluate(()=>window.__rrUltimoPdf||'');
  ok('Baixar PDF', /Pagamento-PJ-2026-10-2\.pdf/.test(pdfN), pdfN);
  /* leitores que contam (05/11): passagem no refeitório depois da saída não pode virar a saída */
  await p.evaluate(()=>{ const D=window.RHAlmoco._A.dados['2026-10'], x=D.dias['2026-10-22']['55566677788']; x.t.push('18:30:00 REFEITÓRIO'); x.ar={'08:03:00':'Produção','17:58:00':'Produção','18:30:00':'Refeitório'}; window.Painel.render(); });
  await p.click('[data-act="pjp-ab"][data-f="f2"]'); await H.dorme(600);
  const c0=await p.evaluate(()=>[...document.querySelectorAll('.pjp-chips span')].filter(x=>/^18:30/.test(x.textContent)).map(x=>x.className+'|'+x.textContent).join(','));
  ok('Sem escolher leitores: todas as passagens contam (18:30 do refeitório vira a saída) e cada uma mostra o leitor', /^pe\|18:30Refeit/i.test(c0), c0);
  await p.keyboard.press('Escape'); await H.dorme(400); await p.click('[data-act="pjp-cfg"]'); await H.dorme(500);
  const cx=await p.evaluate(()=>[...document.querySelectorAll('[data-pjp-clt]')].map(i=>i.dataset.pjpClt).join(','));
  ok('Configurar mostra os leitores do mês (áreas e dispositivos)', /PRODUCAO/.test(cx)&&/REFEITORIO/.test(cx)&&/PORTARIA/.test(cx), cx);
  await p.check('[data-pjp-clt="PRODUCAO"]'); await p.check('[data-pjp-clt="PORTARIA"]'); await p.click('[data-act="pjp-cfgok"]'); await H.dorme(900);
  const SL=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/config'].pjPag.leit);
  await p.click('[data-act="pjp-ab"][data-f="f2"]'); await H.dorme(600);
  const c1=await p.evaluate(()=>{ const sp=[...document.querySelectorAll('.pjp-chips span')]; return sp.filter(x=>/^(18:30|17:58)/.test(x.textContent)).map(x=>x.className+'|'+x.textContent.slice(0,5)).join(','); });
  ok('Com Produção e Portaria escolhidos: o refeitório fica riscado e a saída volta a ser 17:58', Array.isArray(SL)&&SL.includes('PRODUCAO')&&/pe\|17:58/.test(c1)&&/fo\|18:30/.test(c1), JSON.stringify(SL)+' '+c1);
  await p.click('[data-act="pjp-tab"][data-v="regras"]'); await H.dorme(500);
  await p.check('input[name="pjp-rlm"][value="sel"]'); await p.uncheck('[data-pjp-rlt="PRODUCAO"]').catch(()=>{}); await p.uncheck('[data-pjp-rlt="PORTARIA"]').catch(()=>{}); await p.check('[data-pjp-rlt="REFEITORIO"]');
  await p.click('[data-act="pjp-psalva"]'); await H.dorme(800);
  const F2=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/funcionarios/f2'].pjPag.leit);
  ok('Regra só desta pessoa: guarda os leitores dela no cadastro', JSON.stringify(F2)==='["REFEITORIO"]', JSON.stringify(F2));
  /* Enviar ao Conectwork (07/11): a medição da quinzena por prestadora, no link, sem CPF */
  await p.keyboard.press('Escape'); await H.dorme(300);
  await p.evaluate(()=>{ window.open=()=>null; window.RHPJPag._J.per='2026-10-2'; window.RHPJPag._J.ab=''; __T.go('rhpjpag'); }); await H.dorme(1500);
  const cwB=await p.evaluate(()=>{ const x=document.querySelector('.pjp-cw'); return x?x.innerText:''; });
  for(let i=0;i<2&&!(await p.evaluate(()=>window.__pjpUltimoCw));i++){ await p.click('[data-act="pjp-cw"][data-e="ZENITH"]'); await H.dorme(700); }
  const cwU=await p.evaluate(()=>window.__pjpUltimoCw||'');
  /* lê o link do mesmo jeito que o Conectwork (modulos/medicoes.js, lerResumo) */
  const cwR=await p.evaluate(u=>{ try{ const t=u.split('#medicoes/importar/')[1], b64=t.replace(/-/g,'+').replace(/_/g,'/'), pad=b64+'==='.slice((b64.length+3)%4);
    return JSON.parse(decodeURIComponent(Array.from(atob(pad)).map(ch=>'%'+ch.charCodeAt(0).toString(16).padStart(2,'0')).join(''))); }catch(e){ return null; } },cwU);
  const cwS=(await srv())['rh/dados/pjpag/2026-10-2'];
  ok('Enviar ao Conectwork: um botão por prestadora; o link leva período, CNPJ da prestadora, nome, horas e valor de cada PJ (sem CPF) e fica registrado',
    /Zenith/.test(cwB)&&/Nexus/.test(cwB)&&!/Colafix/i.test(cwB)&&/^https:\/\/conectwork\.com\.br\/#medicoes\/importar\//.test(cwU)&&!/11122233344|55566677788/.test(cwU)&&!/11122233344/.test(JSON.stringify(cwR))
    &&cwR&&cwR.v===1&&cwR.periodo==='2026-10-2'&&cwR.cnpj==='62944495000164'&&cwR.itens.length===1&&cwR.itens[0].n==='Joao Pereira Teste'&&Number.isInteger(cwR.itens[0].v)&&cwR.itens[0].v>0&&cwR.total===cwR.itens[0].v&&typeof cwR.itens[0].h==='number'
    &&cwS&&cwS.cw&&cwS.cw.ZENITH&&cwS.cw.ZENITH.total===cwR.total&&cwS.cw.ZENITH.n===1, JSON.stringify({cwB:cwB.slice(0,200),cwR,cw:cwS&&cwS.cw}));
  const cwB2=await p.evaluate(()=>{ const x=document.querySelector('.pjp-cw'); return x?x.innerText:''; });
  ok('Depois de enviar, mostra quando e por quem e o botão vira "Enviar de novo"', /Enviado em \d{2}\/\d{2} às \d{2}:\d{2} por Stefani RH/.test(cwB2)&&/Enviar de novo/.test(cwB2), cwB2.slice(0,300));
  const e=erros.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e.length, e.join(' | ')); await B.browser.close();
  const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU — '+res.length+' verificações'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
