/* Pedido de 07/11: RH › Pagamento dos PJ › "Enviar ao Conectwork". Manda a medição da quinzena de cada prestadora
   (só os PJ com valor fechado; nome, horas e valor; sem CPF) para o Conectwork por link. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,500):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção','Manutenção']};
  D['rh/dados/funcionarios/f1']={nome:'JOAO PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',salario:5000,setor:'Produção',status:'Ativo',admissao:'2025-01-10'};
  D['rh/dados/funcionarios/f4']={nome:'ANA LUZ TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'22233344455',salario:4000,setor:'Produção',status:'Ativo',admissao:'2025-01-10'};
  D['rh/dados/funcionarios/f2']={nome:'MARIA OLIVEIRA TESTE',tipo:'PJ',empresa:'NEXUS',cpf:'55566677788',setor:'Manutenção',status:'Ativo',admissao:'2025-02-01',pjPag:{vh:28.41}};
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias:{},pessoas:{},imp:[]};
  D['rh/dados/pjpag/2026-10-2']={pid:'2026-10-2',de:'2026-10-16',ate:'2026-10-31',pes:{f1:{st:'fechado',fech:{min:5808,vh:22.7272,fixo:false,bruto:2200,desc:50,valor:2150,dias:[],em:'2026-11-01T10:00:00.000Z',por:'uRH'}}}};
  const erros=[]; let B=await H.abrir({viewport:{width:1440,height:950}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  await p.evaluate(()=>{ window.__abriu=[]; window.open=(u)=>{ window.__abriu.push(u); return null; }; window.RHPJPag._J.per='2026-10-2'; __T.go('rhpjpag'); }); await H.dorme(1800);
  const temBt=await p.$('[data-act="pjp-cw"]');
  ok('Botão "Enviar ao Conectwork" na barra do Pagamento dos PJ', !!temBt);
  await p.click('[data-act="pjp-cw"]'); await H.dorme(600);
  const m=await p.evaluate(()=>document.getElementById('pjp-cwl').innerText);
  ok('A janela mostra cada prestadora: Zenith com 1 PJ fechado (R$ 2.150,00) e quem fica de fora; Nexus sem nenhum fechado e sem botão',
    /ZENITH[\s\S]*1 PJ com valor fechado[\s\S]*2\.150,00/.test(m)&&/Ficam de fora[\s\S]*Ana Luz Teste/i.test(m)&&/NEXUS[\s\S]*0 PJ com valor fechado/.test(m)&&(await p.$$('[data-act="pjp-cwenv"]')).length===1, m.replace(/\n/g,' | '));
  await p.click('[data-act="pjp-cwenv"]'); await H.dorme(900);
  const url=await p.evaluate(()=>window.__abriu[0]||'');
  const pl=url.split('#medicoes/importar/')[1]||''; let r={};
  try{ r=JSON.parse(Buffer.from(pl.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8')); }catch(e){}
  ok('Abre o Conectwork com o resumo no link: período, CNPJ da Zenith, total em centavos, nome e horas do PJ',
    url.startsWith('https://cavalcante-creator.github.io/conectwork-app/#medicoes/importar/')&&r.v===1&&r.periodo==='2026-10-2'&&r.cnpj==='62944495000164'&&r.nome==='ZENITH'&&r.total===215000
    &&r.itens.length===1&&r.itens[0].n==='Joao Pereira Teste'&&r.itens[0].h===96.8&&r.itens[0].v===215000&&r.ref==='2026-10-2:ZENITH', JSON.stringify(r));
  ok('Nada de CPF nem do CNPJ do PJ no link', !/11122233344|22233344455|12345678000190/.test(JSON.stringify(r)));
  const S=await srv(), cw=(S['rh/dados/pjpag/2026-10-2'].cw||{}).ZENITH;
  const m2=await p.evaluate(()=>document.getElementById('pjp-cwl').innerText);
  ok('Registra o envio (quem, quando, quantos e o total) e a janela mostra "Já enviado" com "Enviar de novo"', cw&&cw.n===1&&cw.total===215000&&cw.por==='Stefani RH'&&/Já enviado/.test(m2)&&/Enviar de novo/.test(m2), JSON.stringify(cw));
  ok('Sem erros de JavaScript', !erros.length, erros.join(' | '));
  await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(`\n${res.length-f} de ${res.length} testes passaram.`); console.log(f?'FALHOU':'PASSOU'); process.exit(f?1:0);
})().catch(e=>{ console.error('ERRO',e); console.log('FALHOU'); process.exit(1); });
