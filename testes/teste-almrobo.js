/* Almoço: aviso do robô do Face ID (funcionando / equipamento fora / parado) */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,200):'')); };
(async()=>{ for(const [cen,dado,re] of [['funcionando',{ultima:new Date().toISOString(),ok:true,passagens:312,dispositivos:{}},/Face ID automático: última leitura às \d\d:\d\d \(312 passagens\)/],
   ['equipamento fora',{ultima:new Date().toISOString(),ok:false,passagens:200,dispositivos:{'REFEITÓRIO':{ok:false,erro:'x'},'Portaria Entrada':{ok:true}}},/com problema — fora do ar: REFEITÓRIO/],
   ['parado',{ultima:new Date(Date.now()-3*3600e3).toISOString(),ok:true,passagens:10,dispositivos:{}},/Robô do Face ID parado/]]){
   const {d}=seedManut(x=>x); d.docs['rh/dados/robo/faceid']=dado;
   const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
   await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1800);
   const t=await p.evaluate(()=>(document.querySelector('.alm-robo')||{}).innerText||'');
   ok('Aviso do robô — '+cen, re.test(t), t); await B.browser.close(); }
 process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
