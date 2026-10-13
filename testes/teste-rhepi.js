/* Planilha do EPI (COLFIX_Controle_EPI): Cadastros › Funções e EPIs › "Importar planilha do EPI" e Funcionários › Importar planilha
   com a aba Base Colaboradores. Precisa da biblioteca do Excel para montar a planilha de teste: npm i --no-save xlsx@0.18.5 */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
let XLSX; try{ XLSX=require('xlsx'); }catch(e){ console.log('FALHOU — falta a biblioteca: cd testes && npm i --no-save xlsx@0.18.5'); process.exit(1); }
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={};
  D['rh/dados/funcoes/fx1']={nome:'OPERADOR DE MÁQUINA',epis:[{nome:'Botina',ca:'CA 1'}],uniformes:[{nome:'CAMISETA',tam:'G'}]};
  /* planilha de teste no mesmo formato da planilha do EPI (dados inventados) */
  const decEpi="Recebi da empresa COLFIX, para meu uso obrigatório os EPI'S (equipamento de proteção individual) constante nessa ficha, o qual comprometo-me a utilizá-los corretamente de acordo com as instruções recebidas, NR-06.";
  const decUni="Recebi da empresa COLFIX, para meu uso obrigatório os uniformes constantes nessa ficha, o qual comprometo-me a utilizá-los corretamente de acordo com as instruções recebidas referentes ao uso correto e guarda.";
  const epiH=['Função']; for(let i=1;i<=12;i++){ epiH.push('EPI '+i); if(i<12) epiH.push('CA '+i); } epiH.push('Status');
  const linhaEpi=(f,its,st)=>{ const r=[f]; for(let i=0;i<12;i++){ const x=its[i]; r.push(x?x[0]:''); if(i<11) r.push(x?x[1]:''); } r.push(st); return r; };
  const muitos=[['Respirador PFF2','CA 39220'],['Luva nitrílica','CA 26742'],['Óculos','CA 11268'],['Protetor Auditivo','CA 5745'],['Botina','CA 13175'],['Capacete de Segurança',''],['Avental de raspa',''],['Mangotes de raspa',''],['Perneiras de raspa',''],['Luva de raspa',''],['Máscara de solda','']];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mês/Ano:','','Funcionário:'],[],['FICHA DE CONTROLE E ENTREGA DE UNIFORME','',"FICHA DE CONTROLE E ENTREGA DE EPI'S"],[decUni,'',decEpi]]),'Ficha (Modelo)');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Nome','CPF','Função','Setor','Data de admissão','Empresa','Status','Tipo'],
    ['ANA SOUZA','529.982.247-25','OPERADOR DE MÁQUINA','PRODUÇÃO','10/03/2024','COLFIX - CNPJ 08.813.381/0001-30','ATIVO','CLT'],
    ['PEDRO PJ',' 11.222.333/0001-81\n','SOLDADOR','MANUTENÇÃO','01/08/2026','NEXUS - CNPJ 67.927.237/0001-93','ATIVO','PJ'],
    ['JOSE SO CPF','111.444.777-35','SOLDADOR','MANUTENÇÃO','01/08/2026','NEXUS - CNPJ 67.927.237/0001-93','ATIVO','PJ']]),'Base Colaboradores');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([epiH,linhaEpi('OPERADOR DE MÁQUINA',[['Respirador PFF2','CA 39220'],['Botina','CA 13175']],'Cadastrado'),
    linhaEpi('SOLDADOR',muitos,'Cadastrado'),linhaEpi('ANALISTA DE PCP',[['Respirador PFF2','CA 39220'],['Cadastrar EPIs','']],'Cadastrar EPIs')]),'Base EPIs por Função');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Função','Uniforme 1','Tamanho','Uniforme 2','Tamanho','Uniforme 3','Tamanho','Uniforme 4','Tamanho','Uniforme 5','CA 5','Status'],
    ['OPERADOR DE MÁQUINA','CALÇA','','CAMISETA','','','','','','','',''],['SOLDADOR','CALÇA','','CAMISETA C/ REFLETIVO','','COLETE','','Cadastrar Uniformes','','','',''],['ANALISTA DE PCP','CAMISETA','Cadastrar Uniformes','','','','','','','','','']]),'Base Uniformes por Função');
  const arq='/tmp/teste-planilha-epi.xlsx'; XLSX.writeFile(wb,arq);
  const lib=fs.readFileSync(require.resolve('xlsx/dist/xlsx.full.min.js'),'utf8');
  const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; p.on('dialog',x=>x.accept());
  await p.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\//,r=>r.fulfill({contentType:'text/javascript',body:lib}));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2800);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), view=()=>p.evaluate(()=>document.getElementById('view').innerText);
  await p.evaluate(()=>__T.go('rhfuncoes')); await H.dorme(400);
  await p.setInputFiles('#rh-fimpf',arq); await H.dorme(1500); const pv=await view(); let s=await srv();
  ok('Prévia da planilha do EPI: novas, atualizadas, itens que não cabem na ficha e nada gravado ainda', /Importar planilha do EPI/.test(pv)&&/2 funções novas/.test(pv)&&/1 atualizada/.test(pv)&&/Não cabe na ficha \(máximo 9\): Luva de raspa, Máscara de solda/.test(pv)&&/Base Colaboradores/.test(pv)&&Object.keys(s).filter(k=>k.startsWith('rh/dados/funcoes/')).length===1, pv.slice(0,600).replace(/\n/g,' | '));
  await p.click('[data-act="rh-fimpok"]'); await H.dorme(1500); s=await srv();
  const fs_=Object.values(Object.fromEntries(Object.entries(s).filter(([k])=>k.startsWith('rh/dados/funcoes/')))); const op=s['rh/dados/funcoes/fx1'], sol=fs_.find(x=>x.nome==='SOLDADOR'), pcp=fs_.find(x=>x.nome==='ANALISTA DE PCP');
  ok('Grava as funções: EPI com CA, uniforme (tamanho que já existia continua), sem "Cadastrar…", máximo 9', fs_.length===3&&op.epis.length===2&&op.epis[0].ca==='CA 39220'&&op.uniformes.map(x=>x.nome+':'+(x.tam||'')).join()==='CALÇA:,CAMISETA:G'&&sol.epis.length===9&&sol.uniformes.length===3&&pcp.epis.length===1&&pcp.uniformes.length===1, JSON.stringify({op,sol:sol&&sol.epis.length,pcp}));
  ok('Declarações da ficha (EPI e uniforme) vêm da aba Ficha (Modelo)', s['rh/config'].declEpi===decEpi&&s['rh/config'].declUniforme===decUni, JSON.stringify(s['rh/config']).slice(0,200));
  /* a mesma planilha em Funcionários › Importar planilha: lê a aba Base Colaboradores */
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(400); await p.evaluate(()=>{ const b=document.querySelector('[data-act="rh-carga"]'); b&&b.click(); }); await H.dorme(400);
  await p.setInputFiles('#rh-cargaf',arq); await H.dorme(1500); const pc=await view();
  ok('Funcionários › Importar planilha lê a aba Base Colaboradores (Tipo, Empresa e Data de admissão; PJ só com CPF entra e avisa)', /PEDRO PJ/.test(pc)&&/Pessoa nova \(PJ · NEXUS\)/.test(pc)&&/ANA SOUZA/.test(pc)&&/JOSE SO CPF[^\n]*sem CNPJ, só CPF/.test(pc), pc.slice(0,600).replace(/\n/g,' | '));
  const e=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !e.length, e.join(' | '));
  const fl=res.filter(x=>!x.ok).length; console.log(fl?'FALHOU ('+fl+')':'PASSOU — '+res.length+' verificações'); process.exit(fl?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
