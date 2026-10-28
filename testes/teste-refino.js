/* Refino visual: refino.css carregado e a escolha da letra em Ajustes (Archivo / Geist), guardada por aparelho. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,200):'')); };
(async()=>{ const {d}=seedManut(x=>x); const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 ok('refino.css carregado (números finos nos indicadores)', await p.evaluate(()=>[...document.styleSheets].some(s=>/refino\.css/.test(s.href||''))));
 await p.evaluate(()=>__T.go('ajustes')); await H.dorme(1000); await p.click('[data-act="aj-grupo"][data-v="aparencia"]'); await H.dorme(500);
 ok('Ajustes tem o assunto "Aparência" com a escolha da letra', await p.evaluate(()=>/Aparência/.test(document.getElementById('view').innerText)&&!!document.querySelector('[data-act="letra"][data-v="geist"]')));
 await p.click('[data-act="letra"][data-v="geist"]'); await H.dorme(400);
 ok('Escolher Geist aplica na hora e guarda no aparelho', await p.evaluate(()=>document.documentElement.dataset.letra==='geist'&&localStorage.getItem('colafix.letra')==='geist'));
 await p.reload(); await H.dorme(2500);
 ok('Depois de recarregar, continua Geist', await p.evaluate(()=>document.documentElement.dataset.letra==='geist'));
 await p.evaluate(()=>__T.go('ajustes')); await H.dorme(800); await p.click('[data-act="aj-grupo"][data-v="aparencia"]'); await H.dorme(400); await p.click('[data-act="letra"][data-v="archivo"]'); await H.dorme(400);
 ok('Voltar para Archivo', await p.evaluate(()=>document.documentElement.dataset.letra==='archivo'));
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
