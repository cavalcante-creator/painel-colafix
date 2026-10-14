/* Pedido de 13/10 (noite): Cadastros com cara de sistema (menu, tabelas com busca), catálogo de EPIs (CA e validade, aviso),
   função com CBO/setor/descrição, mais de 9 EPIs (até 15), copiar de outra função, renomear função e setor (muda nas pessoas),
   Terceirizados dentro de Funcionários, Cadastros por último, "Ausência no almoço" no Início. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const somaDias=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Linha 1','Expedição'],fichasDesde:'2000-01'};
  D['rh/dados/funcionarios/f1']={nome:'ANA SOUZA',cpf:'52998224725',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',setor:'Linha 1',funcao:'Operador'};
  D['rh/dados/funcionarios/f2']={nome:'BRUNO LIMA',cpf:'11144477735',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',setor:'Expedição',funcao:'Operador'};
  D['rh/dados/funcoes/fo1']={nome:'Operador',epis:[{nome:'Luva de vaqueta',ca:'111'},{nome:'Óculos de proteção',ca:'222'}],uniformes:[{nome:'Camisa',tam:''}]};
  D['rh/dados/funcoes/fo2']={nome:'Mecânico',epis:[{nome:'Luva de vaqueta',ca:'111'},{nome:'Protetor auricular',ca:'333'}],uniformes:[{nome:'Calça',tam:''}]};
  D['rh/dados/terceiros/t1']={nome:'Limpeza Já',empresa:'Limpeza Já Ltda',servico:'Limpeza',inicio:'2026-01-01',fim:'2027-01-01',status:'Ativo'};
  const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; p.on('dialog',x=>x.accept(x.type()==='prompt'?(p.__resp||''):undefined));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2800);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), view=()=>p.evaluate(()=>document.getElementById('view').innerText);
  const nav=await p.evaluate(()=>[...document.querySelectorAll('#navlist [data-go]')].map(b=>b.textContent.trim()).join('|'));
  ok('Menu do RH: Terceirizados saiu do menu (fica dentro de Funcionários) e Cadastros é o último', nav==='Início|Agenda|Funcionários|Fichas do mês|Documentos e contratos|Férias e prazos|Almoço|Cadastros', nav);
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(300); await p.click('[data-act="rh-fview"][data-v="terc"]'); await H.dorme(300); const vt=await view();
  await p.evaluate(()=>__T.go('rhterc')); await H.dorme(400); const vw=await p.evaluate(()=>__T.S().view);
  ok('Funcionários › aba Terceirizados mostra os terceirizados; o atalho antigo (rhterc) cai nessa aba', /Limpeza Já/.test(vt)&&/Novo terceirizado/.test(vt)&&vw==='rhfunc', vw+' | '+vt.slice(0,200).replace(/\n/g,' | '));
  await p.click('[data-act="rh-fview"][data-v="lista"]'); await H.dorme(200);
  /* Início: botão Ausência no almoço */
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(400); await p.click('[data-act="rh-almaus"]'); await H.dorme(600);
  const au=await p.evaluate(()=>({v:__T.S().view,m:!!document.querySelector('[aria-label="Ausência no almoço"]'),ops:[...document.querySelectorAll('#alm-auk option')].map(o=>o.textContent)}));
  ok('Início do RH: botão "Ausência no almoço" abre a janela na tela Almoço, com as pessoas do cadastro', au.v==='rhalmoco'&&au.m&&au.ops.includes('Ana Souza'), JSON.stringify(au));
  await p.click('[data-act="alm-ausx"]'); await H.dorme(200);
  /* Cadastros */
  await p.evaluate(()=>__T.go('rhfuncoes')); await H.dorme(400);
  const menu=await p.evaluate(()=>[...document.querySelectorAll('.rh-cadn .rh-cn span')].map(e=>e.textContent).join('|'));
  ok('Cadastros: menu à esquerda (Funções, Setores, EPIs, Feriados, Textos das fichas, Configurações) e funções em tabela', menu==='Funções|Setores|EPIs|Feriados|Textos das fichas|Configurações'&&!!(await p.$('.rh-cadc table.rh-ct')), menu);
  await p.fill('[data-cadq]','protetor'); await p.dispatchEvent('[data-cadq]','input'); await H.dorme(150);
  const vis=await p.evaluate(()=>[...document.querySelectorAll('.rh-cadc [data-b]')].filter(r=>!r.hidden).map(r=>r.querySelector('.rh-nm').textContent));
  ok('Busca nos cadastros filtra pelo EPI dentro da função, sem redesenhar', vis.join()==='Mecânico'&&await p.evaluate(()=>document.activeElement&&document.activeElement.matches('[data-cadq]')), vis.join());
  await p.fill('[data-cadq]',''); await p.dispatchEvent('[data-cadq]','input');
  /* EPIs */
  await p.click('[data-act="rh-cad"][data-v="epis"]'); await H.dorme(300); const ve=await view();
  await p.click('[data-act="rh-epiall"]'); await H.dorme(900); let s=await srv(); const cat=Object.keys(s).filter(k=>k.startsWith('rh/dados/epis/')).map(k=>s[k]);
  ok('EPIs: avisa os EPIs das funções fora do catálogo e "Trazer para o catálogo" cria 3 (com o CA)', /ainda não estão no catálogo/.test(ve)&&cat.length===3&&cat.find(x=>x.nome==='Luva de vaqueta').ca==='111', JSON.stringify(cat.map(x=>x.nome+':'+x.ca)));
  const luva=Object.keys(s).find(k=>k.startsWith('rh/dados/epis/')&&s[k].nome==='Luva de vaqueta').split('/').pop();
  await p.click(`[data-act="rh-epied"][data-id="${luva}"]`); await H.dorme(300); await p.fill('[data-rh-fe="ca"]','999'); await p.fill('[data-rh-fe="validade"]',somaDias(5)); await p.selectOption('[data-rh-fe="tipo"]','Mãos e braços'); await p.click('[data-act="rh-episalvar"]'); await H.dorme(1200);
  s=await srv(); const ve2=await view();
  ok('Mudar o CA no catálogo atualiza as 2 funções que usam a luva; validade perto mostra "Vence em 5 dias" e conta no menu', s['rh/dados/funcoes/fo1'].epis[0].ca==='999'&&s['rh/dados/funcoes/fo2'].epis[0].ca==='999'&&/Vence em 5 dias/.test(ve2)&&/EPIs\s*1/.test(ve2), JSON.stringify(s['rh/dados/funcoes/fo1'].epis)+' | '+ve2.slice(0,300).replace(/\n/g,' | '));
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(400); const vi=await view();
  ok('O CA vencendo aparece em "Precisa de você" no Início', /CA do EPI: Luva de vaqueta/.test(vi), (vi.match(/Precisa de você[\s\S]{0,300}/)||[''])[0].replace(/\n/g,' | '));
  /* Função: CBO, setor, mais de 9 EPIs, CA pela lista, copiar */
  await p.evaluate(()=>__T.go('rhfuncoes')); await H.dorme(300); await p.click('[data-act="rh-cad"][data-v="funcoes"]'); await H.dorme(300);
  await p.click('.rh-cadh [data-act="rh-fnovo"]'); await H.dorme(300);
  await p.fill('[data-rh-ff="nome"]','Soldador'); await p.fill('[data-rh-ff="cbo"]','7243-15'); await p.selectOption('[data-rh-ff="setor"]','Linha 1');
  await p.fill('[data-rh-it="epis"][data-i="0"][data-c="nome"]','Luva de vaqueta'); await p.dispatchEvent('[data-rh-it="epis"][data-i="0"][data-c="nome"]','change'); await H.dorme(100);
  const caAuto=await p.inputValue('[data-rh-it="epis"][data-i="0"][data-c="ca"]');
  for(let i=1;i<12;i++){ await p.click('[data-act="rh-itadd"][data-k="epis"]'); await H.dorme(120); await p.fill(`[data-rh-it="epis"][data-i="${i}"][data-c="nome"]`,'EPI extra '+i); }
  await p.selectOption('#rh-ffcopia','fo2'); await p.click('[data-act="rh-ffcopia"]'); await H.dorme(300);
  const nEp=await p.evaluate(()=>[...document.querySelectorAll('[data-rh-it="epis"][data-c="nome"]')].filter(x=>x.value).length);
  await p.click('[data-act="rh-fsalvar"]'); await H.dorme(900); s=await srv(); const sol=Object.values(s).find(x=>x&&x.nome==='Soldador');
  ok('Nova função com CBO e setor; o CA vem sozinho do catálogo; passa de 9 EPIs (13) e copia o que falta de outra função', caAuto==='999'&&sol&&sol.cbo==='7243-15'&&sol.setor==='Linha 1'&&sol.epis.length===13&&sol.epis.some(e=>e.nome==='Protetor auricular')&&sol.uniformes.some(u=>u.nome==='Calça')&&nEp===13, JSON.stringify(sol&&{cbo:sol.cbo,setor:sol.setor,n:sol.epis.length,u:sol.uniformes})+' caAuto='+caAuto);
  /* a ficha do mês recebe os 13 EPIs (até 15 colunas) */
  const pl=await p.evaluate(async()=>{ const r=await window.RHAPI.getDadosPlanilha(); const h=r.epi[0], l=r.epi.find(x=>x[0]==='Soldador'); return {cols:h.length,n:l.filter((x,i)=>i%2===1&&x).length}; });
  ok('A ficha recebe até 15 EPIs por função', pl.cols===31&&pl.n===13, JSON.stringify(pl));
  /* tirar uma linha */
  const solId=Object.keys(s).find(k=>s[k]&&s[k].nome==='Soldador').split('/').pop();
  await p.click(`[data-act="rh-fed"][data-id="${solId}"]`); await H.dorme(300); await p.click('[data-act="rh-itrem"][data-k="epis"][data-i="1"]'); await H.dorme(200);
  const rem=await p.evaluate(()=>[...document.querySelectorAll('[data-rh-it="epis"][data-c="nome"]')].map(x=>x.value).filter(Boolean));
  ok('Botão × tira o EPI da lista (sem perder o resto)', rem.length===12&&!rem.includes('EPI extra 1')&&rem[0]==='Luva de vaqueta', rem.slice(0,4).join());
  await p.click('[data-act="rh-ffx"]'); await H.dorme(200);
  /* renomear função: muda no cadastro das pessoas */
  await p.click('[data-act="rh-fed"][data-id="fo1"]'); await H.dorme(300); await p.fill('[data-rh-ff="nome"]','Operador de máquina'); await p.click('[data-act="rh-fsalvar"]'); await H.dorme(900); s=await srv();
  ok('Renomear a função muda a função das 2 pessoas', s['rh/dados/funcoes/fo1'].nome==='Operador de máquina'&&s['rh/dados/funcionarios/f1'].funcao==='Operador de máquina'&&s['rh/dados/funcionarios/f2'].funcao==='Operador de máquina', s['rh/dados/funcionarios/f1'].funcao);
  /* setores: renomear */
  await p.click('[data-act="rh-cad"][data-v="setores"]'); await H.dorme(300); p.__resp='Linha 01'; await p.click('[data-act="rh-setren"][data-v="Linha 1"]'); await H.dorme(900); s=await srv();
  ok('Setores em tabela; renomear o setor muda no cadastro das pessoas', JSON.stringify(s['rh/config'].setores.slice().sort())==='["Expedição","Linha 01"]'&&s['rh/dados/funcionarios/f1'].setor==='Linha 01', JSON.stringify(s['rh/config'].setores)+' '+s['rh/dados/funcionarios/f1'].setor);
  /* textos das fichas */
  await p.click('[data-act="rh-cad"][data-v="textos"]'); await H.dorme(300); await p.fill('#rh-de','Declaro que recebi os EPIs.'); await p.click('[data-act="rh-decl"]'); await H.dorme(500); s=await srv();
  ok('Textos das fichas têm a própria tela', s['rh/config'].declEpi==='Declaro que recebi os EPIs.');
  /* celular */
  await p.setViewportSize({width:390,height:844}); await p.click('[data-act="rh-cad"][data-v="funcoes"]').catch(()=>{}); await H.dorme(400);
  const lat=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok('No celular os cadastros não têm rolagem para o lado', lat<=1, 'sobra '+lat+'px');
  console.log('erros:',JSON.stringify(B.erros.filter(e=>!/404|Failed to load resource/.test(e))));
  console.log(res.every(x=>x.ok)?'PASSOU (todos)':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); })();
