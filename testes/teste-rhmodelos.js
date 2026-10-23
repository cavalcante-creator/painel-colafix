/* Modelos de documento (13/10): importar vários arquivos do Word de uma vez (cada um vira um modelo já salvo),
   campo {RAZAO_PJ} (MEI: 8 primeiros números do CNPJ + nome) e CNPJ certo da Zenith (62.944.495/0001-64).
   Precisa da biblioteca do Word para ler o .docx: npm i --no-save mammoth@1.6.0 (traz o jszip, usado para montar os arquivos de teste). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
let JSZip; try{ JSZip=require('jszip'); require.resolve('mammoth/mammoth.browser.min.js'); }catch(e){ console.log('FALHOU — falta a biblioteca: cd testes && npm i --no-save mammoth@1.6.0'); process.exit(1); }
const docx=async(paras,arq)=>{ const z=new JSZip(); const x=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paras.map(p=>'<w:p><w:r><w:t xml:space="preserve">'+x(p)+'</w:t></w:r></w:p>').join('')+'</w:body></w:document>');
  fs.writeFileSync(arq,await z.generateAsync({type:'nodebuffer'})); return arq; };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={}; D['rh/dados/funcionarios/pj1']={nome:'ROGER TESTE',cpf:'',cnpj:'11222333000181',tipo:'PJ',empresa:'ZENITH',status:'Ativo',funcao:'Apoio',setor:'Produção',admissao:'2026-09-01'};
  D['rh/dados/modelos/mj']={nome:'Aviso pr├®vio - presta├º├úo de servi├ºos',vale:'CLT',html:'<p>x</p>'}; /* nome estragado pelo .zip no Windows */
  D['rh/dados/modelos/ja']={nome:'Termo de ciência - uso de celular',vale:'TODOS',html:'<p>antigo</p>'};
  const a1=await docx(['NOTIFICAÇÃO RESCISÃO CONTRATO DE PRESTAÇÃO DE SERVIÇOS','A empresa {RAZAO_PJ}, inscrita no CNPJ nº {CNPJ_PJ}, NOTIFICA a ZENITH SOLUÇÕES INDUSTRIAIS LTDA, referente aos serviços de {?Serviço do contrato}, com término em {DESLIGAMENTO}.','Gravataí, {DATA_HOJE}.'],'/tmp/Notificação de rescisão - teste.docx');
  const a2=await docx(['TERMO DE CIÊNCIA','Eu, {NOME}, CNPJ {CNPJ_PJ}, contratado pela {EMPRESA}.'],'/tmp/Termo de ciência - uso de celular.docx');
  const a6=await docx(['TERMO','Eu, {NOME}, CNPJ {CNPJ_PJ}, contratado pela {EMPRESA}.'],'/tmp/Termo PJ teste.docx');
  const a3=await docx(['DECLARAÇÃO','{NOME} será admitido em {ADMISSAO}.'],'/tmp/Declaracao_Inicio_Servicos.docx');
  const a4=await docx(['CONTRATO NEXUS','NEXUS MANUTENÇÕES LTDA contrata {RAZAO_PJ}, CNPJ {CNPJ_PJ}.'],'/tmp/Contrato Nexus teste.docx');
  const a5=await docx(['AVISO PRÉVIO','{EMPRESA} avisa o EMPREGADO {NOME}, CTPS {?CTPS}.'],'/tmp/Aviso previo teste (desligamento).docx');
  const a7=await docx(['TESTE','{NOME}'],'/tmp/Comunicado de dispensa - Notifica├º├úo.docx');
  const lib=fs.readFileSync(require.resolve('mammoth/mammoth.browser.min.js'),'utf8');
  const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; p.on('dialog',x=>x.accept());
  await p.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/mammoth\//,r=>r.fulfill({contentType:'text/javascript',body:lib}));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2800);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), view=()=>p.evaluate(()=>document.getElementById('view').innerText);
  await p.evaluate(()=>__T.go('rhdocs')); await H.dorme(300); await p.click('[data-act="rh-dv"][data-v="modelos"]').catch(()=>{}); await H.dorme(300);
  await p.setInputFiles('#rh-docx',[a1,a2,a3,a4,a5,a6,a7].map(f=>({name:require('path').basename(f),mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:fs.readFileSync(f)}))); await H.dorme(2500); const toast=await p.evaluate(()=>document.getElementById('toast').innerText);
  let s=await srv(); const ms=Object.entries(s).filter(([k])=>k.startsWith('rh/dados/modelos/')).map(([,v])=>v);
  const not=ms.find(x=>/Notificação de rescisão/.test(x.nome)), dec=ms.find(x=>/Declaracao Inicio Servicos/.test(x.nome)), cel=ms.filter(x=>/celular/.test(x.nome));
  ok('Vários arquivos do Word de uma vez: cada um vira um modelo salvo (o que já existia com o mesmo nome fica como está)', ms.length===8&&not&&dec&&cel.length===1&&cel[0].html==='<p>antigo</p>'&&/6 modelos cadastrados/.test(toast)&&/já existiam: Termo de ciência/.test(toast), toast+' '+JSON.stringify(ms.map(x=>x.nome)));
  ok('Campos e perguntas reconhecidos; Zenith, Nexus e CLT reconhecidos pelo texto; rescisão e desligamento oferecem desligar', not&&/data-k="RAZAO_PJ"/.test(not.html)&&/data-k="CNPJ_PJ"/.test(not.html)&&/data-q="Serviço do contrato"/.test(not.html)&&not.vale==='ZENITH'&&not.desliga===true&&dec.vale==='TODOS'&&!dec.desliga&&ms.find(x=>/Nexus/.test(x.nome)).vale==='NEXUS'&&ms.find(x=>/Aviso previo/.test(x.nome)).vale==='CLT'&&ms.find(x=>/Aviso previo/.test(x.nome)).desliga===true&&ms.find(x=>/Termo PJ/.test(x.nome)).vale==='PJ', not&&JSON.stringify({vale:not.vale,desliga:not.desliga,html:not.html.slice(0,200)}));
  ok('Nomes estragados pelo .zip no Windows voltam ao certo (o que já estava salvo e o que é importado)', ms.some(x=>x.nome==='Aviso prévio - prestação de serviços')&&ms.some(x=>x.nome==='Comunicado de dispensa - Notificação')&&!ms.some(x=>/├/.test(x.nome)), JSON.stringify(ms.map(x=>x.nome)));
  /* gerar para o PJ: {RAZAO_PJ} = 8 primeiros números do CNPJ + nome */
  await p.click('[data-act="rh-dv"][data-v="gerar"]'); await H.dorme(200); await p.click('[data-act="rh-dgpick"][data-id="pj1"]'); await H.dorme(300);
  const mid=await p.evaluate(()=>{ const o=[...document.querySelectorAll('[data-act="rh-dgmod"]')].find(x=>/Notificação de rescisão/.test(x.textContent)); return o&&o.dataset.id; }); if(mid){ await p.click('[data-act="rh-dgmod"][data-id="'+mid+'"]'); await H.dorme(500); }
  const pg=await p.evaluate(()=>{ const e=document.querySelector('.rh-pageg'); return e?e.innerText:''; });
  ok('No documento gerado: razão social do MEI ("11.222.333 ROGER TESTE") e o CNPJ do PJ', /A empresa 11\.222\.333 ROGER TESTE, inscrita no CNPJ nº 11\.222\.333\/0001-81/.test(pg), pg.slice(0,200));
  const fic=fs.readFileSync(__dirname+'/../modulos/rh-fichas.html','utf8'), rh=fs.readFileSync(__dirname+'/../modulos/rh.js','utf8');
  ok('CNPJ da Zenith certo (62.944.495/0001-64) no RH e na ficha', /62\.944\.495\/0001-64/.test(rh)&&!/62\.944\.495\/0001-93/.test(rh.replace(/\/\*[^*]*\*\//g,''))&&/62944495000164/.test(fic)&&!/0001-93", nome:"ZENITH/.test(fic));
  const e=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !e.length, e.join(' | '));
  const fl=res.filter(x=>!x.ok).length; console.log(fl?'FALHOU ('+fl+')':'PASSOU — '+res.length+' verificações'); process.exit(fl?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
