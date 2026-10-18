/* Inventário · modo fácil (um por vez + recebimento). (cenário de teste-inventario.js) Inventário = o programa "Gestão de Almoxarifado" dentro do painel (pedido de 13/10).
   Quem só tem o Inventário vê o programa em tela cheia; os outros, dentro do painel. Os dados vão para o banco do painel. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs;
  const it=(cod,desc,locais,grupos)=>({codigo:cod,descricao:desc,ativo:true,linhas:[],almox:{locais,grupos:grupos||['COLAFIX'],un:null,conv:null}});
  D['itens/AC0001']=Object.assign(it('AC0001','ARGAMASSA AC1 20 KG',['a3','a30']),{linhas:['Linha 1']}); D['config/geral'].paletes={'Linha 1':96}; /* múltiplo de palete da configuração */ D['itens/AC0002']=it('AC0002','ARGAMASSA AC2 20 KG',['a3','a30']); D['itens/RJ0001']=it('RJ0001','REJUNTE CINZA 1 KG',['rej'],['BAUTECH']);
  D['pcpbase/itens']={em:'2026-10-13T08:00:00.000Z',atual:{},l:{AC0001:{a3:100,a30:50,d:'ARGAMASSA AC1 20 KG'},AC0002:{a3:20,a30:0,d:'ARGAMASSA AC2 20 KG'}}};
  D['conferencias/CONF-1-1']={numero:'CONF-1-1',em:new Date(Date.now()-3600e3).toISOString(),dia:'2026-10-13',por:null,porNome:'CONFERENTE',local:'Almox 3',origem:'planilha',itens:{AC0002:{nome:'ARGAMASSA AC2 20 KG',almox3:30,almox30:0,total:30,pal3:0,sac3:30,pal30:0,sac30:0},XX9999:{nome:'ITEM FORA DO CADASTRO',almox3:12,almox30:0,total:12}}};
  d.users['conf@painel-colafix.app']={uid:'uCONF',pass:'conf123',nome:'Carla'}; D['perfis/uCONF']={nome:'Carla',usuario:'conf'}; D['acessos/uCONF']={perfil:'conf',mods:['almox'],locais:['a3'],contar:true,receber:true,ativo:true};
  d.users['sis@painel-colafix.app']={uid:'uSIS',pass:'sis123',nome:'Sara'}; D['perfis/uSIS']={nome:'Sara',usuario:'sis'}; D['acessos/uSIS']={perfil:'supsis',mods:['almox'],locais:['a3','a30','rej','sep','a1','a2'],contar:true,receber:true,auditar:true,verAud:true,ativo:true};
  const B=await H.abrir({viewport:{width:800,height:1280}}); const p=B.page; p.on('dialog',x=>x.accept());
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'conf','conf123'); await H.dorme(2500);
  const frame=async()=>{ for(let i=0;i<60;i++){ const f=p.frames().find(x=>x.url().includes('inventario/index.html')); if(f&&await f.evaluate(()=>typeof USUARIO_LOGADO!=='undefined'&&!!USUARIO_LOGADO&&!!document.getElementById('confItemSelList')).catch(()=>false)) return f; await H.dorme(250); } return null; };
  let f=await frame(); await H.dorme(1200);
  const tec=async k=>{ await f.click(`#fcConta .fc-tec [data-k="${k}"], #fcRec .fc-tec [data-k="${k}"]`); await H.dorme(120); };
  await f.evaluate(()=>{ confToggleItem('AC0001'); confToggleItem('AC0002'); confIniciarConferencia(); }); await H.dorme(500);
  await f.click('#invBar [data-a="um"]'); await H.dorme(400);
  let t=await f.evaluate(()=>(document.getElementById('fcConta')||{}).innerText||'');
  ok('Contagem "um por vez": item em tela cheia (Item 1 de 2 · AC0001) com Paletes e Sacos e teclado grande', /Item 1 de 2/.test(t)&&/AC0001/.test(t)&&/PALETES|Paletes/i.test(t)&&/SACOS|Sacos/i.test(t)&&await f.evaluate(()=>document.querySelectorAll('#fcConta .fc-tec button').length===12), t.replace(/\n/g,' | ').slice(0,160));
  await tec('2'); await f.click('#fcConta [data-a="campo"][data-id="confMain_sac3_AC0001"]'); await H.dorme(150); await tec('7');
  const c1=await f.evaluate(()=>({c:CONFERENCIAS.AC0001,tot:(document.querySelector('#fcConta .fc-tot')||{}).innerText||''}));
  ok('Teclado grande: 2 paletes + 7 sacos = 199 (mesma conta da conferência)', c1.c&&c1.c.pal3===2&&c1.c.sac3===7&&c1.c.total3===199&&/199/.test(c1.tot), JSON.stringify(c1).slice(0,200));
  await p.screenshot({path:'/tmp/fc-conta.png'}); await f.click('#fcConta [data-a="prox"]'); await H.dorme(250); await f.click('#fcConta [data-a="zero"]'); await H.dorme(250);
  const z=await f.evaluate(()=>(CONFERENCIAS.AC0002||{}).confirmadoZero);
  ok('"Não tem nenhum (zero)" confirma o zero do item', !!z, String(z));
  await f.click('#fcConta [data-a="rev"]'); await H.dorme(250); t=await f.evaluate(()=>(document.getElementById('fcConta')||{}).innerText||'');
  ok('"Revisar e salvar": 2 de 2 contados, com o total de cada um', /2 de 2 contados/.test(t)&&/199/.test(t)&&/zero confirmado/.test(t), t.replace(/\n/g,' | ').slice(0,200));
  await f.click('#fcConta [data-a="salvar"]'); await H.dorme(3500); await f.evaluate(()=>{ const x=document.getElementById('invRec'); if(x) x.remove(); });
  const cf=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('__srv')).docs).filter(v=>v&&v.origem==='programa'&&v.itens&&v.itens.AC0001).map(v=>v.itens.AC0001.almox3));
  ok('Salvar: a conferência vai para o banco com 199 do AC0001', cf.includes(199), JSON.stringify(cf));
  /* recebimento */
  await f.evaluate(()=>{ try{ confMudarModo('recebimento'); }catch(e){} }); await H.dorme(1200);
  const tem=await f.evaluate(()=>!!document.getElementById('fcRecBtn'));
  if(tem){ await f.click('#fcRecBtn'); await H.dorme(300); await f.fill('#fcRq','AC0001'); await H.dorme(250); await f.click('#fcRec [data-a="item"][data-c="AC0001"]'); await H.dorme(250);
    await tec('1'); await f.click('#fcRec [data-a="rcampo"][data-v="sac"]'); await H.dorme(120); await tec('5'); }
  const r1=await f.evaluate(()=>(document.getElementById('fcRec')||{}).innerText||'');
  ok('Recebimento fácil: botão grande, busca, 1 palete + 5 sacos = 101 sc', tem&&/Registrar 101/.test(r1), r1.replace(/\n/g,' | ').slice(0,200));
  await p.screenshot({path:'/tmp/fc-rec2.png'}); if(tem){ await f.click('#fcRec [data-a="registra"]'); await H.dorme(800); }
  const r2=await f.evaluate(()=>({t:(document.getElementById('fcRec')||{}).innerText||'',r:(RECEBIMENTOS[0]||{})}));
  ok('Registrar: recebimento gravado (101 sc de AC0001) e tela de "Recebido · Receber outro item"', r2.r.cod==='AC0001'&&r2.r.quantidade===101&&/Recebido/.test(r2.t)&&/Receber outro item/.test(r2.t), JSON.stringify({cod:r2.r.cod,q:r2.r.quantidade}));
  await p.screenshot({path:'/tmp/fc-rec.png'});
  await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
