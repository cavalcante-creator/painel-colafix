/* Produção × Comercial › Como foi o dia (js/82). Dados inventados no vendas.diario. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const t=new Date().toISOString();
 const loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
 const dias=[]; let x=new Date(); x.setDate(x.getDate()-3); while(dias.length<26){ const w=x.getDay(); if(w&&w!==6) dias.unshift(loc(x)); x.setDate(x.getDate()-1); }
 const dd=dias[dias.length-1], ref=dias.slice(0,-1);
 const diario={AC0005:{},AC0030:{},NV0001:{}};
 ref.forEach(z=>{ diario.AC0005[z]=[300,100]; diario.AC0030[z]=[0,200]; diario.NV0001[z]=[0,50]; });
 diario.AC0005[dd]=[0,400]; diario.AC0030[dd]=[150,210]; diario.NV0001[dd]=[0,900];
 const l={AC0005:{d:'ARGAMASSA CINZA AC3 20 KG',a3:5000,sal:1,ln:['Linha 1']},AC0030:{d:'ARGAMASSA POZOSUL AC1 20 KG',a3:1400,sal:1,ln:['Linha 2']},NV0001:{d:'NIVELADOR DE PISO 20 KG',a3:300,sal:1}};
 D['pcpbase/itens']={l,atual:{SALDO:t},em:t}; D['pcpbase/meta']={em:t,hist:[]};
 D['pcpbase/vendas']={mensal:{},diario,ate:dd,ini:dias[0]};
 D['pcpbase/prev']={mes:{},est:{}};
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('dialog',z=>z.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('anlcom')); await H.dorme(1200);
 ok('"Como foi o dia" está no grupo Mês da Análise, ao lado do Produção × Comercial', await p.evaluate(()=>{ const t=[...document.querySelectorAll('button,a')].map(b=>b.innerText.trim()); const i=t.indexOf('Produção × Comercial'); return i>=0&&t[i+1]==='Como foi o dia'; }));
 await p.evaluate(()=>__T.go('anlcomdia')); await H.dorme(1000);
 const txt=()=>p.evaluate(()=>document.getElementById('view').innerText);
 let s=await txt();
 ok('Abre "Como foi o dia" no último dia do Extrato', /Como foi o dia/.test(s)&&await p.$eval('#cmd-dia',e=>e.value)===dd, await p.$eval('#cmd-dia',e=>e.value)+' '+dd);
 ok('Frase diz que AC3 saiu mais que o normal (400, normal 100)', /Saiu mais que o normal: AC3 \(400 sc, normal 100\)/.test(s), s.slice(0,600));
 const X=await p.evaluate(dd=>{ const r=Painel.comercialDia.calc(dd); return {fams:r.fams.map(f=>[f.k,Math.round(f.s),Math.round(f.ns),f.sitS,Math.round(f.e),Math.round(f.ne)]),nv:r.its.some(i=>i.c==='NV0001'),ref:r.ref.length}; },dd);
 ok('Conta por família: AC3 saiu 400 × normal 100 (acima), entrou 0 × 300; AC1 210 × 200 (normal)', JSON.stringify(X.fams)==='[["AC1",210,200,"",150,0],["AC3",400,100,"acima",0,300]]', JSON.stringify(X));
 ok('Nivelador fica de fora', !X.nv);
 ok('Normal = média de dias úteis antes do dia', X.ref>=20, X.ref);
 await p.click('[data-act="cmd-fab"][data-v="AC3"]'); await H.dorme(500); s=await txt();
 ok('Tocar na família mostra os itens', /AC0005/.test(s)); if(process.env.SHOT) { await p.evaluate(()=>window.scrollTo(0,0)); await p.screenshot({path:'/tmp/comdia.png'}); }
 await p.click('[data-act="cmd-un"][data-v="t"]'); await H.dorme(500); s=await txt();
 ok('Toneladas: AC3 saiu 8 t', /AC3 \(8 t, normal 2\)/.test(s), s.slice(0,500));
 await p.click('[data-act="cmd-dmv"][data-v="-1"]'); await H.dorme(500);
 ok('‹ volta para o dia útil anterior', await p.$eval('#cmd-dia',e=>e.value)===ref[ref.length-1]);
 await p.click('[data-act="cmd-dmv"][data-v="1"]'); await p.click('[data-act="cmd-dmv"][data-v="1"]'); await H.dorme(500);
 await p.evaluate(()=>{ const i=document.getElementById('cmd-dia'); i.value=i.max; i.dispatchEvent(new Event('change',{bubbles:true})); }); await H.dorme(500); s=await txt();
 ok('Dia depois do Extrato avisa para importar', /O Extrato importado vai até/.test(s), s.slice(0,400));
 const vm=await p.evaluate(()=>{ const v=document.getElementById('view'); return v.scrollWidth<=v.clientWidth+2; }); ok('Sem rolagem lateral', vm);
 const er=await p.evaluate(()=>window.__erros||[]); ok('Sem erros na página', !er.length, JSON.stringify(er));
 await B.browser.close(); const f=res.filter(r=>!r.ok).length; console.log(f?'FALHOU '+f:'PASSOU tudo ('+res.length+')'); process.exit(f?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
