/* Almoço: refeitório sem leitura no dia (leitor só com o café) → aviso e "Marcar o dia" → ninguém fica sem justificativa. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const dia={}, pes={};
 for(let i=0;i<8;i++){ const k=String(10000000000+i); dia[k]={p:1,t:['07:0'+i+':00 Portaria Entrada','12:1'+i+':00 Saida estacionamento']}; if(i<5){ dia[k].c='07:3'+i; dia[k].t.push('07:3'+i+':00 REFEITÓRIO'); } pes[k]={n:'Pessoa '+i,e:'COLAFIX'}; }
 D['rh/dados/almoco/2026-10']={mes:'2026-10',dias:{'2026-10-13':dia},pessoas:pes,imp:[]};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().acs&&__T.S().acs.pronto&&window.RHAlmoco,null,{timeout:15000}); await H.dorme(800);
 await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); const b=await p.$('[data-act="alm-dia"][data-v="2026-10-13"]'); if(b){ await b.click(); await H.dorme(500); }
 let t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Leitor do refeitório só com o café: aviso "O refeitório não registrou o almoço de 13/10" (só até 07:34)', /O refeitório não registrou o almoço de 13\/10/.test(t)&&/só tem passagens até 07:34/.test(t)&&/8 sem justificativa/.test(t), t.slice(0,600).replace(/\n/g,'|'));
 await p.click('[data-act="alm-semleit"][data-v="1"]'); await H.dorme(1000); t=await p.evaluate(()=>document.getElementById('view').innerText);
 const cf=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/config'].almoco.semLeitura);
 ok('Marcar o dia: todos viram justificados ("Refeitório sem leitura") e grava em rh/config.almoco.semLeitura', /0 sem justificativa/.test(t)&&/8 justificados/.test(t)&&/Refeitório sem leitura/.test(t)&&cf['2026-10-13']&&!cf['2026-10-13'].removido, JSON.stringify(cf));
 await p.click('[data-act="alm-semleit"][data-v="0"]'); await H.dorme(1000); t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Desfazer volta ao que era', /8 sem justificativa/.test(t), t.slice(0,300).replace(/\n/g,'|'));
 if(process.env.ALMOCO_CSV){ await p.setInputFiles('#alm-arq',process.env.ALMOCO_CSV); await H.dorme(3000); const b2=await p.$('[data-act="alm-dia"][data-v="2026-10-21"]'); if(b2){ await b2.click(); await H.dorme(800); }
   t=await p.evaluate(()=>document.getElementById('view').innerText); console.log('REAL 21/10:', (t.match(/O refeitório não registrou[^\n]*/)||['sem aviso'])[0]); }
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
