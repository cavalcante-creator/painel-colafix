/* Abertura animada (js/abertura.js): aparece na 1ª abertura da sessão, some sozinha em ~2,7 s, não bloqueia o clique,
   não volta na mesma sessão, não aparece em TV (?tela=) nem com "reduzir movimento". Fotos em /tmp/sh/abertura-*.png. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[];
const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,200):'')); };
const semRobo=()=>Object.defineProperty(navigator,'webdriver',{get:()=>false});   // o painel esconde a abertura dos testes automáticos
(async()=>{ fs.mkdirSync('/tmp/sh',{recursive:true}); const {d}=seedManut(x=>x);
 let B=await H.abrir({viewport:{width:1280,height:800}}); let p=B.page; await B.ctx.addInitScript(semRobo); await H.preparar(p,d);
 await p.goto(H.BASE); await H.dorme(150);
 ok('Na 1ª abertura aparece por cima de tudo, com a logo da Colafix em duas partes (Cola e fix) e o V pequeno', await p.evaluate(()=>{ const a=document.getElementById('abertura'); return !!a&&getComputedStyle(a).position==='fixed'&&!!a.querySelector('.ab-cola')&&!!a.querySelector('.ab-fix')&&!!a.querySelector('.ab-v')&&/Painel de Operação/.test(a.innerText); }));
 ok('Não bloqueia o clique (pointer-events: none)', await p.evaluate(()=>getComputedStyle(document.getElementById('abertura')).pointerEvents==='none'));
 await H.dorme(250); const imgs=await p.evaluate(()=>[...document.querySelectorAll('#abertura img')].map(i=>i.complete&&i.naturalWidth>0));
 ok('As três imagens carregaram', imgs.length===3&&imgs.every(Boolean), JSON.stringify(imgs));
 for(const [ms,n] of [[500,'1'],[1300,'2'],[1900,'3']]){ await H.dorme(Math.max(0,ms-(n==='1'?400:n==='2'?500:1300))); await p.screenshot({path:'/tmp/sh/abertura-'+n+'.png'}); }
 await H.dorme(1100);
 ok('Some sozinha depois da animação', await p.evaluate(()=>!document.getElementById('abertura')));
 ok('A tela de entrar está lá embaixo, pronta', await p.evaluate(()=>!!document.querySelector('input[type="password"]')));
 await p.reload(); await H.dorme(300);
 ok('Na mesma sessão não aparece de novo', await p.evaluate(()=>!document.getElementById('abertura')));
 await B.browser.close();
 /* TV e "reduzir movimento" */
 B=await H.abrir({viewport:{width:1280,height:800}}); p=B.page; await B.ctx.addInitScript(semRobo); await H.preparar(p,d);
 await p.goto(H.BASE+(H.BASE.includes('?')?'&':'?')+'tela=silos'); await H.dorme(200);
 ok('Na TV (?tela=) não aparece', await p.evaluate(()=>!document.getElementById('abertura')));
 await B.browser.close();
 B=await H.abrir({viewport:{width:1280,height:800},ctx:{reducedMotion:'reduce'}}); p=B.page; await B.ctx.addInitScript(semRobo); await H.preparar(p,d);
 await p.goto(H.BASE); await H.dorme(200);
 ok('Com "reduzir movimento" não aparece', await p.evaluate(()=>!document.getElementById('abertura')));
 await B.browser.close();
 /* escuro + celular, só para a foto */
 B=await H.abrir({viewport:{width:390,height:844},ctx:{colorScheme:'dark'}}); p=B.page; await B.ctx.addInitScript(semRobo); await H.preparar(p,d);
 await p.goto(H.BASE); await H.dorme(1700); await p.screenshot({path:'/tmp/sh/abertura-escuro-cel.png'});
 ok('No escuro usa o fundo escuro e a logo com o "fix" branco', await p.evaluate(()=>{ const a=document.getElementById('abertura'); return !!a&&a.classList.contains('ab-esc')&&/logo-fix-escuro/.test(a.querySelector('.ab-fix').src); }));
 await B.browser.close();
 const f=res.filter(r=>!r.ok); console.log(f.length?`FALHOU (${f.length})`:`PASSOU (${res.length})`); process.exit(f.length?1:0);
})().catch(e=>{ console.error('ERRO',e); process.exit(1); });
