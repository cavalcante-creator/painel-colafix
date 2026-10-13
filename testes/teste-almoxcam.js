/* Celular do almox: quando a câmera não liga (bloqueada ou sem resposta) aparece o motivo e o botão "Ligar câmera" */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const ok=(n,c,d)=>console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,500):''));
const prep=()=>{ const {d}=seedManut(); d.users['celalmox@painel-colafix.app']={uid:'uCEL',pass:'cel123',nome:'Joana Almox'}; d.docs['perfis/uCEL']={nome:'Joana Almox',usuario:'celalmox'}; d.docs['acessos/uCEL']={perfil:'almoxcel',mods:['almoxcel'],locais:[],ativo:true}; return d; };
(async()=>{
 let B=await H.abrir({camera:'/tmp/folha.y4m',negarCamera:true,viewport:{width:390,height:844}}); let p=B.page; await H.preparar(p,prep()); await p.goto(H.BASE); await H.entrar(p,'celalmox','cel123');
 await p.waitForFunction(()=>window.__T&&__T.S().view==='mantotem',null,{timeout:12000}); await H.dorme(1500);
 let t=await p.evaluate(()=>document.querySelector('.tt').innerText);
 ok('Câmera bloqueada: mostra o motivo e o botão "Ligar câmera"', /bloqueada/.test(t)&&/Ligar câmera/.test(t), t.replace(/\n/g,' | '));
 await B.browser.close();
 B=await H.abrir({camera:'/tmp/folha.y4m',viewport:{width:390,height:844}}); p=B.page; await B.ctx.addInitScript(()=>{ window.__libera=null; navigator.mediaDevices.getUserMedia=()=>new Promise(()=>{}); });
 await H.preparar(p,prep()); await p.goto(H.BASE); await H.entrar(p,'celalmox','cel123'); await p.waitForFunction(()=>window.__T&&__T.S().view==='mantotem',null,{timeout:12000}); await H.dorme(1200);
 const t1=await p.evaluate(()=>document.querySelector('.tt').innerText); await H.dorme(9500); const t2=await p.evaluate(()=>document.querySelector('.tt').innerText);
 ok('Câmera sem resposta: "Ligando a câmera…" e, depois de 8 s, pede para tocar em "Ligar câmera" e permitir', /Ligando a câmera/.test(t1)&&/não ligou/.test(t2)&&/Permitir/.test(t2), t1.replace(/\n/g,' | ')+' || '+t2.replace(/\n/g,' | '));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
