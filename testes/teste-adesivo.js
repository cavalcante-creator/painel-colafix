/* Crachá de adesivo da empresa lido pelo coletor: cadastro do código, recusa de repetido, leitura no teste e no tablet da parede. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const coletor=async(p,cod)=>{ await p.keyboard.type(cod,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(900); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs, t=new Date().toISOString();
 D['crachas/ABCD2345']={codigo:'ABCD2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true,criadoEm:t};
 D['crachas/BCDE3456']={codigo:'BCDE3456',nome:'Bruno Lima',linha:'',papel:'tecnico',ativo:true,criadoEm:t};
 D['crachas/CDEF4567']={codigo:'CDEF4567',nome:'Carla Dias',linha:'Linha 2',papel:'operador',ativo:false,adesivo:'555666',criadoEm:t};
 d.users['tablet@painel-colafix.app']={uid:'uTAB',pass:'tab123',nome:'Tablet'}; D['perfis/uTAB']={nome:'Tablet da parede',usuario:'tablet'}; D['acessos/uTAB']={perfil:'linha',mods:['paradas'],locais:[],ativo:true};
 let B=await H.abrir(); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>__T.go('mancrachas')); await H.dorme(1200);
 ok('Tela de crachás mostra o campo "Adesivo" em cada crachá', await p.evaluate(()=>document.querySelectorAll('[data-cr-ad]').length===3));
 await p.click('[data-cr-ad="ABCD2345"]'); await coletor(p,'000123');
 let ad=await p.evaluate(()=>__T.S().cr.lista.find(c=>c._id==='ABCD2345').adesivo);
 ok('Passando o adesivo no coletor dentro do campo, o código fica ligado ao crachá da Ana', ad==='000123', ad);
 await p.click('[data-cr-ad="BCDE3456"]'); await coletor(p,'000123');
 ad=await p.evaluate(()=>__T.S().cr.lista.find(c=>c._id==='BCDE3456').adesivo||'');
 ok('O mesmo adesivo não pode ficar em duas pessoas', ad==='', ad);
 await p.click('[data-cr-ad="BCDE3456"]'); await coletor(p,'777888');
 await p.evaluate(()=>document.activeElement&&document.activeElement.blur()); await H.dorme(300);
 await coletor(p,'000123'); const teste=await p.evaluate(()=>(__T.S().cr.teste||{}).txt||'');
 ok('Testando a leitura: o coletor lê o adesivo e reconhece a Ana', /Ana Souza/.test(teste), teste);
 await B.browser.close();
 // ---------- tablet/computador da parede (cada navegador de teste começa com o banco do cenário) ----------
 D['crachas/ABCD2345'].adesivo='000123'; D['crachas/BCDE3456'].adesivo='777888';
 for(const [cod,quem,esperado] of [['000123','Ana Souza','abre'],['777888','Bruno Lima','abre'],['555666','Carla Dias','recusa']]){
   B=await H.abrir(); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tablet','tab123'); await H.dorme(1800);
   await p.evaluate(()=>__T.go('mantotem')); await H.dorme(1500); await coletor(p,cod); await H.dorme(600);
   const tt=await p.evaluate(()=>{ const T=__T.S().tt; return {fase:T.fase,nome:T.p&&T.p.nome,papel:T.p&&T.p.papel,txt:(document.getElementById('view').innerText||'').slice(0,160).replace(/\n/g,' | ')}; });
   if(esperado==='abre') ok(`Tablet da parede: adesivo ${cod} pelo coletor identifica ${quem}`, tt.fase!=='espera'&&tt.nome===quem, JSON.stringify(tt));
   else ok('Tablet da parede: adesivo de crachá desativado é recusado', tt.nome!==quem||tt.fase==='espera', JSON.stringify(tt));
   if(cod==='777888'){ ok('Técnico pelo adesivo vê os chamados (Cheguei/Terminei)', tt.papel==='tecnico', tt.papel); }
   await B.browser.close(); }

 B=await H.abrir(); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tablet','tab123'); await H.dorme(1800);
 await p.evaluate(()=>__T.go('mantotem')); await H.dorme(1500); await p.evaluate(()=>{ window.__toasts=[]; const o=window.toast; });
 await p.keyboard.type('999000',{delay:12}); await p.keyboard.press('Enter'); await H.dorme(700);
 const msg=await p.evaluate(()=>{ const m=document.body.innerText.match(/O coletor leu[^\n]*/); return m?m[0]:''; });
 ok('Diagnóstico: no tablet, código bipado que não é crachá mostra o que foi lido', /999000/.test(msg)&&/não é um crachá cadastrado/.test(msg), msg||'(nada na tela)');
 await B.browser.close();
 // coletor que "digita" por códigos Alt (não gera teclas normais): o texto entra direto no campo
 B=await H.abrir(); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tablet','tab123'); await H.dorme(1800);
 await p.evaluate(()=>__T.go('mantotem')); await H.dorme(1500);
 const foco=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
 await p.keyboard.insertText('000123'); await p.keyboard.press('Enter'); await H.dorme(1200);
 const tt=await p.evaluate(()=>{ const T=__T.S().tt; return {fase:T.fase,nome:T.p&&T.p.nome}; });
 ok('Coletor em modo "códigos Alt" (texto sem teclas): o campo de captura recebe e identifica a Ana', foco==='cr-cap'&&tt.nome==='Ana Souza'&&tt.fase!=='espera', JSON.stringify({foco,...tt}));
 await B.browser.close();
 for(const [modo,fim] of [['sem nada no fim',null],['terminando com Tab','Tab']]){
   B=await H.abrir(); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tablet','tab123'); await H.dorme(1800);
   await p.evaluate(()=>__T.go('mantotem')); await H.dorme(1500); await p.keyboard.type('777888',{delay:12}); if(fim) await p.keyboard.press(fim); await H.dorme(1300);
   const r=await p.evaluate(()=>{ const T=__T.S().tt; return {fase:T.fase,nome:T.p&&T.p.nome}; });
   ok('Coletor '+modo+': identifica o Bruno', r.nome==='Bruno Lima', JSON.stringify(r)); await B.browser.close(); }
 B=await H.abrir(); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>__T.go('mancrachas')); await H.dorme(1200); await p.click('#cr-tst-in'); await p.keyboard.type('000123',{delay:12}); await p.keyboard.press('Enter'); await H.dorme(500);
 const out=await p.evaluate(()=>(document.getElementById('cr-tst-out')||{}).innerText||'');
 ok('Teste do coletor mostra o que chegou (texto, teclas, fim, modo, de quem é)', /"000123"/.test(out)&&/Teclas:\s*6/.test(out)&&/Enter/.test(out)&&/teclas normais/.test(out)&&/Ana Souza/.test(out), out.replace(/\n/g,' | '));
 await B.browser.close();
 console.log(res.filter(r=>!r.ok).length?'':'tudo ok'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
