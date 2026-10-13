/* Diário/monitor do rancho (pedido de 13/10): rancho já entregue num dia anterior não volta quando a ordem é reprogramada ou continua */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const ok=(n,c,d)=>console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):''));
const ord=(num,linha,data,rancho,x)=>Object.assign({num,produto:'AC3001 - ARGAMASSA AC3 20KG',linha,data,turno:'Dia todo',total:100,status:'aberta',criadaEm:'2026-10-01T10:00:00.000Z',rancho},x||{});
(async()=>{ const {d}=seedManut(); const D=d.docs; delete D['ordens/5001']; delete D['ordens/5002'];
 const ont='2026-10-12T15:00:00.000Z', hoje='2026-10-13T12:00:00.000Z';
 D['ordens/8001']=ord('8001','Linha 1','2026-10-12','880001',{continuaEm:'2026-10-13',rdb:{sep:{em:ont},ent:{em:ont,nome:'Ana'}}});   /* reprogramada: rancho entregue ontem */
 D['ordens/8002']=ord('8002','Linha 1','2026-10-12','880002',{rdb:{sep:{em:ont}}});                                                 /* de ontem, não entregue */
 D['ordens/8003']=ord('8003','Linha 2','2026-10-13','880003',{rdb:{sep:{em:hoje},ent:{em:hoje}}});                                  /* de hoje, entregue hoje */
 D['ordens/8004']=ord('8004','Linha 2','2026-10-12','880004',{continuaEm:'2026-10-13',rdb:{sep:{em:ont},ent:{em:ont},conf:{em:ont,falta:true,itens:[{c:'MP1',q:'5 kg'}]}}}); /* a menos, complemento pendente */
 D['ordens/8005']=ord('8005','Linha 1','2026-10-13','880005');                                                                       /* de hoje, ainda não entregue */
 ['880001','880002','880003','880004','880005'].forEach(n=>D['ranchos/'+n]={numero:n,criadoEm:ont,ordens:[{num:'80'+n.slice(-2)}]});
 const B=await H.abrir(); await B.ctx.clock.setFixedTime(new Date('2026-10-13T14:00:00')); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().ordens&&__T.S().ordens.length>=5,null,{timeout:15000}); await H.dorme(500);
 const tem=(t,n)=>new RegExp('\\b'+n+'\\b').test(t);
 for(const v of ['diario','dbmon']){ await p.evaluate(v=>{ __T.go(v); __T.S().dbo.dia='2026-10-13'; },v); await p.evaluate(()=>__T.go(__T.S().view)); await H.dorme(500);
   const t=await p.evaluate(()=>document.getElementById('view').innerText);
   ok(v+': esconde a reprogramada já entregue ontem (8001) e mostra a não entregue (8002), as de hoje (8003, 8005) e a que veio a menos (8004)', !tem(t,'8001')&&tem(t,'8002')&&tem(t,'8003')&&tem(t,'8004')&&tem(t,'8005'), t.replace(/\n/g,' | ').slice(0,300)); }
 await p.evaluate(()=>{ __T.go('diario'); __T.S().dbo.modo='tabela'; __T.S().dbo.q='8001'; }); await p.evaluate(()=>__T.go('diario')); await H.dorme(400);
 ok('Buscando o número, a reprogramada ainda aparece', tem(await p.evaluate(()=>document.getElementById('view').innerText),'8001'));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
