const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ const {d}=seedManut(); d.docs['ordens/5001'].rancho='123456'; d.docs['ordens/5002'].rancho='123456';
 // 1) celular sem login
 let B=await H.abrir({viewport:{width:390,height:844}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE+'?rancho=123456'); await H.dorme(1500);
 const t=await p.evaluate(()=>(document.getElementById('lg')||{}).innerText||''); await p.screenshot({path:'/tmp/rancho-qr.png'});
 await p.fill('#rr-n','Marcos Linha 1'); await p.dblclick('#lg .lg-go'); await H.dorme(1200);
 const fim=await p.evaluate(()=>(document.getElementById('lg')||{}).innerText||''); let srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')));
 const recs=Object.entries(srv.docs).filter(([k])=>k.startsWith('rancrec/'));
 ok('Sem login: tela do rancho, nome e "Recebi o rancho" cria UM aviso', /RANCHO/.test(t)&&/123456/.test(t)&&/Recebimento registrado/.test(fim)&&recs.length===1&&recs[0][1].status==='novo'&&recs[0][1].nome==='Marcos Linha 1', t.replace(/\n/g,' | ').slice(0,120));
 await B.browser.close();
 srv.docs['rancrec/r-999999-x1']={rancho:'999999',nome:'Teste',em:new Date().toISOString(),status:'novo',origem:'qr'}; // rancho que não existe
 // 2) painel do diário aplica
 B=await H.abrir(); p=B.page; await H.preparar(p,srv); await p.goto(H.BASE); await H.entrar(p,'operador','ope123'); await H.dorme(6000);
 srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')));
 const o1=srv.docs['ordens/5001'], o2=srv.docs['ordens/5002'], rr=srv.docs[recs[0][0]];
 const h1=(o1.hist||[]).filter(h=>/recebido na linha por Marcos/.test(h.o)).length;
 ok('Painel do diário aplica: as 2 ordens do rancho ficam "entregue na linha" com o nome de quem recebeu', o1.rdb&&o1.rdb.ent&&o1.rdb.ent.nome==='Marcos Linha 1'&&o2.rdb&&o2.rdb.ent&&rr.status==='feito'&&rr.ordens===2&&h1===1, JSON.stringify({ent1:o1.rdb&&o1.rdb.ent,status:rr.status,ordens:rr.ordens,hist:h1}));
 ok('Rancho que não existe no painel fica aguardando (sem erro)', srv.docs['rancrec/r-999999-x1'].status==='novo');
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
