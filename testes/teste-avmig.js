/* Recado antigo das TVs (config/geral.tvRecados) vira aviso do quadro (editável); tamanho do aviso na TV (Pequeno/Médio/Grande). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 D['config/geral']=Object.assign({},D['config/geral']||{},{tvRecados:[{t:'Almoço especial na sexta: churrasco',ate:''}]});
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(6000);
 const q=await p.evaluate(async()=>{ const g=await __T.S().db.doc('config/geral').get(); return {cards:[...document.querySelectorAll('.avx-c .avx-tx b')].map(b=>b.innerText),antigos:(g.data().tvRecados||[]).length}; });
 ok('O recado antigo do almoço aparece no quadro de avisos (e sai do sistema antigo)', q.cards.includes('Almoço especial na sexta: churrasco')&&q.antigos===0, JSON.stringify(q));
 await p.click('[data-act="rh-aved"]'); await H.dorme(400); await p.click('[data-act="rh-avtam"][data-v="g"]'); await H.dorme(400);
 const pv=await p.evaluate(()=>{ const t=document.querySelector('.avx-pvz .tvb'); return t?t.className:''; });
 ok('Formulário tem "Tamanho na TV" e a prévia mostra a faixa grande', /tam-g/.test(pv)&&/alt-g/.test(pv), pv);
 await p.click('[data-act="rh-avok"]'); await H.dorme(1200);
 const sv=await p.evaluate(()=>((__T.S().avTV||[]).find(a=>/churrasco/.test(a.t))||{}).tam);
 ok('Editar e salvar grava o tamanho Grande', sv==='g', String(sv));
 await p.evaluate(()=>__T.go('tvapres')); await H.dorme(600); await p.click('[data-act="apr-abre"][data-v="tvfab"]'); await H.dorme(2500);
 const tv=await p.evaluate(()=>{ const t=document.querySelector('.tvb'); return t?{c:t.className,n:+t.dataset.n,txt:t.querySelector('.tvb-tx b').innerText,fs:getComputedStyle(t.querySelector('.tvb-tx b')).fontSize}:null; });
 ok('Na TV: faixa grande (letra 66 px) e o recado aparece uma vez só', tv&&/tam-g/.test(tv.c)&&tv.fs==='66px'&&tv.n===1&&/churrasco/.test(tv.txt), JSON.stringify(tv));
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
