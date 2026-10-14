/* Inventário (pedidos de 14/10, dentro do layout original): folhas em PDF, recebimento com vários itens,
   "Acertar no sistema" na Auditoria e o aviso de item que diverge em 3 contagens seguidas. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs;
  const it=(cod,desc,locais)=>({codigo:cod,descricao:desc,ativo:true,linhas:[],almox:{locais,grupos:['COLAFIX'],un:null,conv:null}});
  [['AC0001','ARGAMASSA AC1 20 KG'],['AC0002','ARGAMASSA AC2 20 KG'],['AC0003','ARGAMASSA AC3 20 KG'],['RE0101','REJUNTE BRANCO 1 KG']].forEach(([c,n])=>D['itens/'+c]=it(c,n,c[0]==='R'?['rej']:['a3','a30']));
  D['pcpbase/itens']={em:'2026-10-13T08:00:00.000Z',atual:{},l:{AC0001:{a3:100,a30:50},AC0002:{a3:20,a30:0}}};
  /* AC0002: 3 contagens seguidas acima do sistema; AC0001: só a última com diferença pequena (1 saco) */
  for(let k=0;k<3;k++) D['conferencias/C-'+k]={numero:'C-'+k,em:new Date(Date.now()-(k+1)*864e5).toISOString(),dia:'2026-10-1'+(3-k),local:'Almox 3',origem:'programa',porNome:'Carla',
    itens:{AC0002:{nome:'ARGAMASSA AC2 20 KG',almox3:30+k,almox30:0,total:30+k,pal3:0,sac3:30+k,saldoSistema3:20,saldoSistema30:0},AC0001:{nome:'ARGAMASSA AC1 20 KG',almox3:k?100:101,almox30:0,saldoSistema3:100,saldoSistema30:50}}};
  d.users['sis@painel-colafix.app']={uid:'uSIS',pass:'sis123',nome:'Sara'}; D['perfis/uSIS']={nome:'Sara',usuario:'sis'}; D['acessos/uSIS']={perfil:'supsis',mods:['almox'],locais:['a3','a30','rej','sep','a1','a2'],contar:true,receber:true,auditar:true,verAud:true,ativo:true};
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept());
  const docs=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  const frame=async()=>{ for(let i=0;i<40;i++){ const f=p.frames().find(x=>x.url().includes('inventario/index.html')); if(f){ const pr=await f.evaluate(()=>typeof USUARIO_LOGADO!=='undefined'&&!!USUARIO_LOGADO&&document.getElementById('appLoading').style.display==='none').catch(()=>false); if(pr) return f; } await H.dorme(250); } return null; };
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);

  /* aviso no Meu dia (antes de abrir o programa) */
  const av=await p.evaluate(()=>{ const S=__T.S(); const xs=[]; S.avisosMod.forEach(f=>{ try{ (f()||[]).forEach(a=>xs.push(a)); }catch(e){} }); return xs.filter(a=>a.rotulo==='Inventário'); });
  ok('Meu dia: aviso de item que dá diferença em 3 contagens seguidas (só o AC0002)', av.length===1&&/1 item dá diferença em toda contagem/.test(av[0].titulo)&&/AC0002 \(Almox 3\)/.test(av[0].texto)&&!/AC0001/.test(av[0].texto), JSON.stringify(av));

  await p.evaluate(()=>__T.go('inventario')); const f=await frame();
  await f.evaluate(()=>{ window.open=()=>null; });
  ok('O layout da contagem não mudou (seleção de itens e "Iniciar Conferência")', await f.evaluate(()=>{ const s=document.getElementById('confSelCard'); return !!s&&s.offsetParent!==null&&!!document.getElementById('btnIniciarConf'); }));

  /* folha da lista de contagem: itens marcados, separados por local, respeitando o almoxarifado escolhido */
  await f.evaluate(()=>{ confToggleItem('AC0001'); confToggleItem('RE0101'); window.__ultimaFolha=null; gerarPDFListaContagem(); }); await H.dorme(1500);
  const fl=await f.evaluate(()=>window.__ultimaFolha);
  ok('Imprimir Lista de Contagem gera o PDF (baixado direto)', fl&&/^Lista_de_contagem_LC-/.test(fl.nome)&&fl.tam>1000, JSON.stringify(fl));
  await f.evaluate(()=>{ window.__ultimaFolha=null; gerarPDFConferencia('C-0'); }); await H.dorme(1500);
  const fc=await f.evaluate(()=>window.__ultimaFolha);
  ok('Gerar PDF da conferência (com saldo e diferença para quem audita)', fc&&fc.nome==='Conferencia_C-0.pdf', JSON.stringify(fc));

  /* recebimento com vários itens no mesmo formulário */
  await f.evaluate(()=>confMudarModo('recebimento')); await H.dorme(400);
  const pegar=async(c,q,lista)=>{ await f.evaluate(c=>buscarItemRecebimento(c),c); await H.dorme(200); await f.evaluate(()=>document.querySelector('#recebResultados [onclick]').click()); await f.fill('#recebQtd',q); if(lista){ await f.click('#btnRecebPorLista'); await H.dorme(200); } };
  await pegar('AC0003','960',true); await pegar('RE0101','35',true); await pegar('AC0003','40',true); await pegar('AC0001','232',false);
  const ls=await f.evaluate(()=>({n:RECEB_LISTA.length,q:RECEB_LISTA.map(x=>x.cod+':'+x.quantidade).join(','),b:document.querySelector('#recebCardBody .brow .btn-primary').textContent}));
  ok('"+ Pôr na lista" junta os itens (mesmo item soma) e o botão mostra quantos', ls.n===2&&ls.q==='AC0003:1000,RE0101:35'&&/2 itens/.test(ls.b), JSON.stringify(ls));
  await f.fill('#recebObs','veio da plataforma'); await f.evaluate(()=>salvarRecebimento()); await H.dorme(1500);
  let ds=await docs(); const rec=Object.entries(ds).filter(([k,v])=>k.startsWith('recebimentos/')&&v.grupo).map(([k,v])=>v).sort((a,b)=>a.idx-b.idx);
  ok('Registrar grava um recebimento por item, com o mesmo grupo (o item que estava no formulário entra junto)', rec.length===3&&new Set(rec.map(r=>r.grupo)).size===1&&rec.map(r=>r.cod+':'+r.quantidade).join(',')==='AC0003:1000,RE0101:35,AC0001:232'&&rec.every(r=>r.grupoN===3&&r.observacao==='veio da plataforma'&&r.por&&r.dia), JSON.stringify(rec.map(r=>[r.id,r.cod,r.quantidade,r.grupoN])));
  const h=await f.evaluate(()=>{ const rows=[...document.querySelectorAll('#recebHistorico > div')]; return {n:rows.length,t:rows[0]&&rows[0].innerText,pdf:!!document.querySelector('#recebHistorico .receb-pdf'),lista:RECEB_LISTA.length}; });
  ok('Histórico: o recebimento aparece numa linha só, com os itens e o comprovante em PDF', h.n===1&&/3 itens/.test(h.t)&&/AC0003/.test(h.t)&&/RE0101/.test(h.t)&&h.pdf&&h.lista===0, JSON.stringify(h).slice(0,300));
  await f.evaluate(()=>{ window.__ultimaFolha=null; document.querySelector('#recebHistorico .receb-pdf').click(); }); await H.dorme(1500);
  const fr=await f.evaluate(()=>window.__ultimaFolha);
  ok('Comprovante de recebimento em PDF', fr&&/^Recebimento_REC-/.test(fr.nome), JSON.stringify(fr));
  const g=rec[0].grupo; await f.evaluate(g=>marcarRecebimentoApontado(g),g); await H.dorme(1200);
  ds=await docs(); const ap=Object.values(ds).filter(v=>v&&v.grupo===g);
  ok('Marcar como apontado aponta todos os itens do recebimento', ap.length===3&&ap.every(r=>r.apontado===true&&r.apontadoPor), JSON.stringify(ap.map(r=>[r.cod,r.apontado])));
  /* um item só: igual a antes */
  await pegar('AC0002','10',false); await f.evaluate(()=>salvarRecebimento()); await H.dorme(1200);
  ds=await docs(); const um=Object.values(ds).find(v=>v&&v.cod==='AC0002'&&v.quantidade===10);
  ok('Recebimento de um item só continua igual', um&&!um.grupo, JSON.stringify(um));

  /* Acertar no sistema */
  await f.evaluate(()=>confMudarModo('auditoria')); await H.dorme(800);
  const a1=await f.evaluate(()=>({t:(document.getElementById('acWrap')||{}).innerText||'',l:invAcertarLista().map(x=>x.cod+'|'+x.lbl+'|'+x.dif+'|'+x.seg)}));
  ok('Auditoria: "Acertar no sistema" lista a última contagem com diferença (tolerância zero = qualquer diferença)', a1.l.length===2&&a1.l.includes('AC0002|Almox 3|10|3')&&a1.l.includes('AC0001|Almox 3|1|1')&&/1 diverge toda contagem/.test(a1.t), JSON.stringify(a1.l));
  await f.click('#acWrap [data-aca="tol"]'); await H.dorme(200); await f.fill('#acTolSc','5'); await f.click('#acWrap [data-aca="tolok"]'); await H.dorme(1200);
  ds=await docs(); const a2=await f.evaluate(()=>invAcertarLista().map(x=>x.cod));
  ok('Mudar a tolerância grava no painel e tira a diferença pequena', ds['config/geral'].invTol&&ds['config/geral'].invTol.sc===5&&a2.join()==='AC0002', JSON.stringify([ds['config/geral'].invTol,a2]));
  await f.evaluate(()=>{ window.__ultimaFolha=null; document.querySelector('#acWrap [data-aca="pdf"]').click(); }); await H.dorme(1500);
  const fa=await f.evaluate(()=>window.__ultimaFolha);
  ok('"Acertar no sistema" exporta em PDF', fa&&/^Acertar_no_sistema_/.test(fa.nome), JSON.stringify(fa));

  /* conferente não vê o cartão */
  const e=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !e.length, e.join(' | '));
  const fl2=res.filter(x=>!x.ok).length; console.log(fl2?'FALHOU ('+fl2+')':'PASSOU — '+res.length+' verificações'); process.exit(fl2?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
