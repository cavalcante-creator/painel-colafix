/* Inventário = o programa "Gestão de Almoxarifado" dentro do painel (pedido de 13/10).
   Quem só tem o Inventário vê o programa em tela cheia; os outros, dentro do painel. Os dados vão para o banco do painel. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs;
  const it=(cod,desc,locais,grupos)=>({codigo:cod,descricao:desc,ativo:true,linhas:[],almox:{locais,grupos:grupos||['COLAFIX'],un:null,conv:null}});
  D['itens/AC0001']=Object.assign(it('AC0001','ARGAMASSA AC1 20 KG',['a3','a30']),{linhas:['Linha 1']}); D['config/geral'].paletes={'Linha 1':96}; /* múltiplo de palete da configuração */ D['itens/AC0002']=it('AC0002','ARGAMASSA AC2 20 KG',['a3','a30']); D['itens/RJ0001']=it('RJ0001','REJUNTE CINZA 1 KG',['rej'],['BAUTECH']);
  D['pcpbase/itens']={em:'2026-10-13T08:00:00.000Z',atual:{},l:{AC0001:{a3:100,a30:50,d:'ARGAMASSA AC1 20 KG'},AC0002:{a3:20,a30:0,d:'ARGAMASSA AC2 20 KG'}}};
  D['conferencias/CONF-1-1']={numero:'CONF-1-1',em:new Date(Date.now()-3600e3).toISOString(),dia:'2026-10-13',por:null,porNome:'CONFERENTE',local:'Almox 3',origem:'planilha',itens:{AC0002:{nome:'ARGAMASSA AC2 20 KG',almox3:30,almox30:0,total:30,pal3:0,sac3:30,pal30:0,sac30:0},XX9999:{nome:'ITEM FORA DO CADASTRO',almox3:12,almox30:0,total:12}}};
  d.users['conf@painel-colafix.app']={uid:'uCONF',pass:'conf123',nome:'Carla'}; D['perfis/uCONF']={nome:'Carla',usuario:'conf'}; D['acessos/uCONF']={perfil:'conf',mods:['almox'],locais:['a3'],contar:true,receber:true,ativo:true};
  d.users['sis@painel-colafix.app']={uid:'uSIS',pass:'sis123',nome:'Sara'}; D['perfis/uSIS']={nome:'Sara',usuario:'sis'}; D['acessos/uSIS']={perfil:'supsis',mods:['almox'],locais:['a3','a30','rej','sep','a1','a2'],contar:true,receber:true,auditar:true,verAud:true,ativo:true};
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept());
  const entra=async(u,s)=>{ await H.preparar(p,d); await p.goto(H.BASE); await p.evaluate(()=>{ try{ localStorage.setItem('inv.layout','antigo'); }catch(e){} }); /* este teste cobre o layout antigo; o novo está no teste-invnovo */ await H.entrar(p,u,s); await H.dorme(2500); };
  const frame=async()=>{ for(let i=0;i<40;i++){ const f=p.frames().find(x=>x.url().includes('inventario/index.html')); if(f){ const pr=await f.evaluate(()=>typeof USUARIO_LOGADO!=='undefined'&&!!USUARIO_LOGADO&&document.getElementById('appLoading').style.display==='none').catch(()=>false); if(pr) return f; } await H.dorme(250); } return null; };
  const docs=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  const vis=(f,id)=>f.evaluate(id=>{ const e=document.getElementById(id); return !!e&&e.offsetParent!==null; },id);

  /* 1) PCP: dentro do painel, com tudo */
  await entra('iasmyn','senha123');
  const menu=await p.evaluate(()=>{ const M=__T.S(); return [__T.vo('inventario'),window.Painel&&!!window.Painel.inv]; });
  await p.evaluate(()=>__T.go('inventario')); let f=await frame();
  const a=f&&await f.evaluate(()=>({perf:perfil().label,itens:CONF_ITEMS.length,conf:CONF_HISTORICO.length,saldo:(ITEMS.find(i=>i.cod==='AC0001')||{}).saldo3}));
  const sairOc=f&&!(await f.evaluate(()=>{ const b=document.querySelector('.topbar button[onclick^="logout"]'); return b&&b.offsetParent!==null; }));
  const solo1=await p.evaluate(()=>document.body.classList.contains('inv-solo'));
  const tr=f&&await vis(f,'tab-transf-group');
  ok('PCP abre o programa dentro do painel (Administrador, só Conferência — sem Transferências —, itens do cadastro, saldo do sistema e conferências do banco)', menu[0]&&menu[1]&&a&&a.perf==='Administrador'&&a.itens===3&&a.conf===1&&a.saldo===100&&!solo1&&!tr&&sairOc, JSON.stringify({menu,a,solo1,tr,sairOc}));
  const hx=f&&await f.evaluate(()=>{ const c=[...document.querySelectorAll('.conf-detail-content')].find(x=>x.parentElement.innerText.includes('CONF-1-1')); if(!c) return null; c.parentElement.click(); return {d:c.style.display,t:c.innerText}; });
  ok('Histórico: abrir a conferência lista os itens, inclusive item fora do cadastro (conferências antigas)', hx&&hx.d==='block'&&/AC0002/.test(hx.t)&&/XX9999/.test(hx.t)&&/12 sc/.test(hx.t), JSON.stringify(hx).slice(0,300));
  await p.evaluate(()=>__T.go('alxaud')); await H.dorme(3200);
  const aud=await p.evaluate(()=>__T.S().view)==='inventario'&&await f.evaluate(()=>document.getElementById('pg-divergencias').classList.contains('active'));
  ok('Atalho antigo da auditoria (Meu dia) abre o programa na Auditoria', aud);

  /* 2) Conferente (só Inventário): programa em tela cheia, como antes */
  await entra('conf','conf123'); f=await frame();
  const s=await p.evaluate(()=>{ const fr=document.querySelector('.inv-frx'); const r=fr&&fr.getBoundingClientRect(); return {solo:document.body.classList.contains('inv-solo'),w:r&&r.width,h:r&&r.height,nav:!!document.querySelector('#navlist')&&document.querySelector('#navlist').offsetParent!==null}; });
  const c=f&&await f.evaluate(()=>({perf:perfil().label,abas:perfil().abas,a3:confPerm().podeContarAlmox3,a30:confPerm().podeContarAlmox30,nome:USUARIO_LOGADO.nome}));
  const tabs=f&&[await vis(f,'tab-transf-group'),await vis(f,'btnModoAuditoria'),await vis(f,'btnModoRecebimento')];
  ok('Conferente vê só o programa, em tela cheia, com o perfil Conferente (Almox 3)', s.solo&&s.w===1440&&s.h===900&&!s.nav&&c&&c.perf==='Conferente'&&c.a3&&!c.a30&&c.nome==='Carla'&&tabs&&!tabs[0]&&!tabs[1]&&tabs[2], JSON.stringify({s,c,tabs}));

  /* contagem → salva no banco do painel */
  await f.evaluate(()=>{ confToggleItem('AC0001'); confIniciarConferencia(); }); await H.dorme(400);
  await f.fill('input[oninput*="\'AC0001\'"][oninput*="\'pal3\'"]','2'); await f.fill('input[oninput*="\'AC0001\'"][oninput*="\'sac3\'"]','7'); await H.dorme(200);
  const spp=await f.evaluate(()=>[getSacsPorPal('AC0001'),getSacsPorPal('AC0002'),fmtQty(199,'AC0001')]);
  const ppIn=await f.$$eval('[data-pp="AC0001"]',xs=>xs.map(x=>x.value)); /* a pessoa muda o palete só nesta contagem: 100 */
  await f.fill('[data-pp="AC0001"] >> nth=0','100'); await f.dispatchEvent('[data-pp="AC0001"] >> nth=0','change'); await H.dorme(200);
  const ppDep=await f.$$eval('[data-pp="AC0001"]',xs=>xs.map(x=>x.value)); const tot=await f.evaluate(()=>document.getElementById('totalFisico3_AC0001').textContent);
  await f.click('#btnSalvarConf'); await H.dorme(1500);
  let ds=await docs(); const cf=Object.entries(ds).filter(([k,v])=>k.startsWith('conferencias/')&&v.origem==='programa').map(([k,v])=>v)[0];
  ok('Contagem salva no banco do painel (conferencias) com quem contou e o palete da configuração (96), que a pessoa pode mudar na contagem (2 paletes de 100 + 7 = 207)', cf&&cf.por==='uCONF'&&cf.porNome==='Carla'&&cf.itens.AC0001&&cf.itens.AC0001.almox3===207&&cf.itens.AC0001.pal3===2&&cf.itens.AC0001.pp===100&&spp[0]===96&&spp[1]===88&&ppIn[0]==='96'&&ppDep.every(v=>v==='100')&&/207/.test(tot)&&cf.itens.AC0001.saldoSistema3===100&&/^\d{2}\/\d{2}\/\d{4} /.test(cf.dataHora)&&cf.em, JSON.stringify([spp,ppIn,ppDep,tot])+' '+JSON.stringify(cf).slice(0,300));
  const hist=await f.evaluate(()=>CONF_HISTORICO.length);
  ok('A contagem aparece no histórico do programa', hist===2, hist);

  /* recebimento */
  await f.evaluate(()=>{ confMudarModo('recebimento'); }); await H.dorme(200);
  await f.evaluate(()=>{ buscarItemRecebimento('AC0002'); }); await H.dorme(300);
  await f.evaluate(()=>{ const b=document.querySelector('#recebResultados [onclick]'); b&&b.click(); }); await H.dorme(200);
  await f.fill('#recebQtd','40'); await f.evaluate(()=>salvarRecebimento()); await H.dorme(1200);
  ds=await docs(); const rc=Object.values(ds).find(v=>v&&v.cod==='AC0002'&&v.quantidade===40);
  ok('Recebimento registrado no banco do painel', rc&&rc.por==='uCONF'&&rc.origem==='programa'&&/^\d{4}-\d{2}-\d{2}$/.test(rc.dia), JSON.stringify(rc));
  const sair=await f.evaluate(()=>{ const b=document.querySelector('.topbar button[onclick^="logout"]'); return !!b&&b.offsetParent!==null; });
  ok('No programa em tela cheia o botão Sair continua (sai do painel)', sair);

  /* 3) Supervisor Sistema: auditoria (abrir, validar com divergência) */
  await entra('sis','sis123'); f=await frame();
  const ss=f&&await f.evaluate(()=>({perf:perfil().label,pode:podeAuditarEstoque()}));
  const num=cf&&cf.numero; const key=num+'_AC0001_almox3';
  await f.evaluate(k=>abrirAuditoriaItem(k),key); await H.dorme(1000);
  ds=await docs(); const fila=ds['alxfila/'+num+'_AC0001_a3'];
  await f.evaluate(()=>{ AUDITORIA_HISTORICO=AUDITORIA_HISTORICO; });
  const sal=await f.evaluate(([n])=>{ _auditAtual={auditKey:n+'_AC0001_almox3',numConf:n,local:'Almox 3',cod:'AC0001',nome:'ARGAMASSA AC1 20 KG',saldoFisico:7};
    _salvarRegistroAuditoria(_montarRegistroAuditoria({total:100,empresa1:60,empresa9:40},true,{motivo:'Erro de contagem',observacao:'teste',status:'Em Investigação'})); return 1; },[num]); await H.dorme(1200);
  ds=await docs(); const au=ds['auditorias/'+num+'_AC0001_a3'];
  ok('Supervisor Sistema audita: auditoria aberta e divergência gravadas no painel (mesma chave das telas do painel)', ss&&ss.perf==='Supervisor Sistema'&&ss.pode&&fila&&fila.estado==='aberta'&&au&&au.resultado==='Divergência'&&au.loc==='a3'&&au.key===num+'_AC0001_a3'&&au.por==='uSIS'&&au.auditKey===key, JSON.stringify({ss,fila,au}).slice(0,400));
  const vis2=await p.evaluate(k=>{ const a=__T.S().alx.auditorias.find(x=>x._id===k); return !!a; },num+'_AC0001_a3');
  ok('O painel enxerga a auditoria (avisos do Meu dia continuam funcionando)', vis2);
  /* outra pessoa grava: aparece no programa sozinho */
  await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('__srv')); s.docs['conferencias/CONF-9-9']={numero:'CONF-9-9',em:new Date().toISOString(),dia:'2026-10-13',por:'uCONF',local:'Almox 3',origem:'painel',itens:{AC0002:{nome:'ARGAMASSA AC2 20 KG',almox3:5,almox30:0,total:5,pal3:0,sac3:5,pal30:0,sac30:0}}}; localStorage.setItem('__srv',JSON.stringify(s)); window.__mockReconnect(); });
  await H.dorme(4000); const nova=await f.evaluate(()=>{ const c=CONF_HISTORICO.find(x=>x.numero==='CONF-9-9'); return c&&c.nomeUsuario; });
  ok('Conferência gravada por outra pessoa aparece no programa sozinha, com o nome', nova==='Carla', nova);

  const e=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !e.length, e.join(' | '));
  const fl=res.filter(x=>!x.ok).length; console.log(fl?'FALHOU ('+fl+')':'PASSOU — '+res.length+' verificações'); process.exit(fl?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
