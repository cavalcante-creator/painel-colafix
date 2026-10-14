/* 14/10: Curva S — divisão real entre as linhas (últimos 60 dias) × divisão configurada.
   Dados parecidos com os da fábrica: AC0003 configurado 50/50 mas só roda na Linha 1; RE0067 (cadastro M1+M2) só roda na M1. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed((d)=>{ const D=d.docs; const h=new Date(); const cp=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); const ago=dd=>new Date(Date.now()-dd*864e5).toISOString();
  const L=['Linha 1','Linha 2','Rejunte M1','Rejunte M2'];
  Object.assign(D['config/geral'],{linhas:L,linhasOrdem:L,capacidade:{'Linha 1':7500,'Linha 2':7500,'Rejunte M1':300,'Rejunte M2':300},
    ritmo:{linhas:L,itens:{AC0003:{d:{'Linha 1':50,'Linha 2':50}},AB0001:{d:{'Linha 2':100}}},jornada:528}});
  D['pcpbase/prev']={mes:{[cp]:{AC0003:30000,AB0001:10000,RE0067:2000,RE0074:1500}}};
  D['pcpbase/itens']={l:{AC0003:{d:'ARGAMASSA CINZA AC2 EMB PAPEL 20 KG'},AB0001:{d:'ARGAMASSA BRANCA AC3 EMB PLASTICA 20 KG'},RE0067:{d:'REJUNTE FLEXIVEL CINZA 1 KG'},RE0074:{d:'REJUNTE FLEXIVEL BRANCO 1 KG'}}};
  D['itens/RE0067']={codigo:'RE0067',linhas:['Rejunte M1','Rejunte M2']}; D['itens/RE0074']={codigo:'RE0074',linhas:['Rejunte M1','Rejunte M2']};
  const O=(id,prod,l)=>{ D['ordens/'+id]={num:id,produto:prod,linha:l,data:h.toISOString().slice(0,10),turno:'Dia todo',total:5000,status:'aberta',criadaEm:ago(10)}; };
  O('7001','AC0003 - ARGAMASSA CINZA AC2 EMB PAPEL 20 KG','Linha 1'); O('7002','AB0001 - ARGAMASSA BRANCA AC3 EMB PLASTICA 20 KG','Linha 2');
  O('7003','RE0067 - REJUNTE FLEXIVEL CINZA 1 KG','Rejunte M1'); O('7004','RE0074 - REJUNTE FLEXIVEL BRANCO 1 KG','Rejunte M2');
  for(let i=0;i<5;i++){ D['entregas/a'+i]={ordem:'7001',num:'7001',linha:'Linha 1',qtd:900,em:ago(i+0.2),por:'x'}; D['entregas/b'+i]={ordem:'7002',num:'7002',linha:'Linha 2',qtd:500,em:ago(i+0.2),por:'x'};
    D['entregas/c'+i]={ordem:'7003',num:'7003',linha:'Rejunte M1',qtd:100,em:ago(i+0.2),por:'x'}; D['entregas/e'+i]={ordem:'7004',num:'7004',linha:'Rejunte M2',qtd:80,em:ago(i+0.2),por:'x'}; }
  /* entrega antiga (fora dos 60 dias) não conta */
  D['entregas/velha']={ordem:'7001',num:'7001',linha:'Linha 2',qtd:9000,em:ago(80),por:'x'};
 });
 const cp=new Date().toISOString().slice(0,7);
 const B=await H.abrir({viewport:{width:1600,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('anlrit')); await H.dorme(900);
 let r=await p.evaluate(c=>__T.rit(c),cp); const it=c=>(r.its||[]).find(x=>x.c===c)||{};
 ok('AC0003 configurado 50/50 mas real 100% Linha 1: diferença de 50 pontos', it('AC0003').dvF==='cfg'&&it('AC0003').dif===50, JSON.stringify(it('AC0003')));
 ok('Entrega com mais de 60 dias não entra na divisão real', it('AC0003').dif===50);
 ok('RE0067 sem % configurada usa a divisão real (100% Rejunte M1), não 50/50 do cadastro', it('RE0067').dvF==='real'&&Math.round((it('RE0067').dv||{})['Rejunte M1']*100)===100, JSON.stringify(it('RE0067')));
 ok('RE0074 sem % configurada usa a real (100% Rejunte M2)', it('RE0074').dvF==='real'&&Math.round((it('RE0074').dv||{})['Rejunte M2']*100)===100, JSON.stringify(it('RE0074')));
 ok('Aviso de divisão diferente do real aparece', r.al.some(t=>/Divisão entre as linhas diferente/.test(t)&&/AC0003/.test(t)), r.al.join(' | '));
 ok('AB0001 (configurado 100% L2, real L2) não aparece no aviso', !r.al.some(t=>/AB0001 \(configurado/.test(t)));
 const antes=Object.fromEntries(r.meta);
 /* abre o Configurar e usa o real */
 await p.click('[data-act="rit-opc"]'); await H.dorme(300); await p.click('[data-act="rit-cfg"]'); await H.dorme(600);
 const cf=await p.evaluate(()=>({btn:(document.querySelector('[data-act="rit-cfg-realtodos"]')||{}).innerText||'',dif:[...document.querySelectorAll('.rit-cfgt tr.rit-dif')].map(t=>t.innerText.split('\n')[0]),
   real:[...document.querySelectorAll('.rit-cfgt tr')].map(t=>t.innerText.replace(/\s+/g,' ')).filter(t=>/RE0067/.test(t))[0]||''}));
 ok('Configurar mostra a coluna real e marca o item que não bate', /Usar o real nos 1/.test(cf.btn)&&cf.dif.some(x=>/AC0003/.test(x)), JSON.stringify(cf));
 ok('Item automático mostra que está usando a divisão real', /automático · pela divisão real/.test(cf.real)&&/M1 100%/.test(cf.real), cf.real);
 await p.screenshot({path:'/tmp/divreal-cfg.png',fullPage:false});
 await p.click('[data-act="rit-cfg-realtodos"]'); await H.dorme(400);
 const ed=await p.evaluate(()=>JSON.stringify(__T.S().rit.ed.itens.AC0003));
 ok('"Usar o real" troca AC0003 para 100% Linha 1', ed==='{"d":{"Linha 1":100},"f":1}', ed);
 /* o Firestore de verdade troca o campo ritmo inteiro no update; o simulado mistura os mapas. Guardamos o que foi enviado e usamos ele. */
 await p.evaluate(()=>{ const S=__T.S(), db=S.db, d0=db.doc.bind(db); db.doc=pa=>{ const r=d0(pa); if(pa==='config/geral'){ const u=r.update.bind(r); r.update=x=>{ window.__pl=JSON.parse(JSON.stringify(x)); return u(x); }; } return r; }; });
 await p.click('[data-act="rit-cfg-ok"]'); await H.dorme(1200);
 await p.evaluate(()=>{ const S=__T.S(); if(window.__pl) S.cfg.ritmo=window.__pl.ritmo; S.anl._c=null; });
 const sv=await p.evaluate(()=>JSON.stringify((window.__pl||{ritmo:{itens:{}}}).ritmo.itens.AC0003));
 ok('Salvo no banco (config/geral.ritmo)', sv==='{"d":{"Linha 1":100}}', sv);
 r=await p.evaluate(c=>__T.rit(c),cp); const depois=Object.fromEntries(r.meta);
 ok('Meta da Linha 2 cai (perde metade do AC0003) e a da Linha 1 sobe; total igual', depois['Linha 2']<antes['Linha 2']&&depois['Linha 1']>antes['Linha 1']&&Math.abs((depois['Linha 1']+depois['Linha 2'])-(antes['Linha 1']+antes['Linha 2']))<=2, JSON.stringify({antes,depois}));
 ok('Depois de salvar, o aviso some', !r.al.some(t=>/Divisão entre as linhas diferente/.test(t)), r.al.join(' | '));
 /* celular: o Configurar não estoura a tela */
 await p.setViewportSize({width:390,height:844}); await p.click('[data-act="rit-cfg"]').catch(()=>{}); await H.dorme(600);
 const lat=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 ok('No celular a página não rola para o lado', lat<=2, 'sobra '+lat+'px');
 const er=B.erros.filter(x=>!/404/.test(x)); ok('Sem erro de JavaScript', !er.length, er.join(' | '));
 await B.browser.close(); console.log(res.every(x=>x.ok)?'\nTUDO PASSOU':'\nALGO FALHOU'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
