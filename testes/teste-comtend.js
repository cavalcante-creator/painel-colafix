/* Produção × Comercial · parte 5 (js/78): previsão × venda mês a mês. Dados inventados: 4 meses fechados com a venda caindo e a previsão parada.
   AC0005: previsão 8.000 todo mês, vendeu 8.000 → 6.500 → 5.500 → 4.500 (previsão parada). AC0030: previsão 2.000, vendeu ~2.000 (normal).
   RE0003 (exportação) e M00010 (ensacado) ficam fora. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
 const hj=loc(now), cp=hj.slice(0,7), t=now.toISOString();
 const mes=k=>{ const y=+cp.slice(0,4), m=+cp.slice(5,7)-k; const dt=new Date(y,m-1,1); return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0'); };
 const m4=mes(4), m3=mes(3), m2=mes(2), m1=mes(1);
 const l={AC0005:{d:'ARGAMASSA CINZA AC3 20 KG',a3:9000,a30:0,sal:1,trep:6,ln:['Linha 1']},AC0030:{d:'ARGAMASSA POZOSUL AC1 20 KG',a3:1400,a30:0,sal:1,trep:5,ln:['Linha 2']},
   RE0003:{d:'PASTINA SILICONIZADA BEIGE 10X1 KG UY',a3:150,a30:0,sal:1,ln:['Linha 1']},M00010:{d:'ENSACADO REJUNTE BRANCO',a3:100,a30:0,sal:1,ln:['Rejunte M1']}};
 D['pcpbase/itens']={l,atual:{SALDO:t},em:t}; D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={atual:t,l:[]};
 const v=(a,b,c,dd,e)=>({[m4]:[0,a],[m3]:[0,b],[m2]:[0,c],[m1]:[0,dd],[cp]:[0,e]});
 D['pcpbase/vendas']={mensal:{AC0005:v(8000,6500,5500,4500,300),AC0030:v(2000,2100,1900,2000,150),RE0003:v(900,900,900,900,0),M00010:v(500,500,500,500,0)}};
 const pr=o=>Object.assign({AC0005:8000,AC0030:2000,M00010:600},o||{});
 D['pcpbase/prev']={mes:{[m4]:pr(),[m3]:pr(),[m2]:pr(),[m1]:pr(),[cp]:pr()},est:{},mesEm:{}};
 const B=await H.abrir({viewport:{width:1440,height:1000},acceptDownloads:true}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('anlcom')); await H.dorme(1800);
 const txt=()=>p.evaluate(()=>document.getElementById('view').innerText);
 let s=await txt();
 const T=await p.evaluate(()=>{ const x=Painel.comercial.tendencia(); return {meses:x.meses.map(m=>m.m+':'+m.prev+':'+m.vend+':'+m.fechado),a:x.a&&x.a.m,b:x.b&&x.b.m,varV:x.varV,varP:x.varP,vendMed:x.vendMed,cmp:x.cmp,pct3:x.pct3,
   lista:x.lista.map(r=>r.c+':'+Math.round(r.acima)+':'+r.parada+':'+r.n),paradas:x.paradas.map(r=>r.c),cods:x.itens.map(r=>r.c).sort()}; });
 ok('Seção 5 aparece na tela: "A venda caiu e a previsão não mudou", com gráfico e as duas tabelas', /A VENDA CAIU E A PREVISÃO NÃO MUDOU/i.test(s)&&/Mês a mês/.test(s)&&/Itens com a previsão acima da venda/.test(s)&&await p.$('.ct-ch .ct-b.v'), s.slice(s.search(/A VENDA CAIU/i),s.search(/A VENDA CAIU/i)+300));
 ok('Meses: 4 fechados + o atual (em andamento), previsão 10.000 por mês (sem exportação nem ensacado)', T.meses.length===5&&T.meses.slice(0,4).every(z=>/:10000:/.test(z)&&/:true$/.test(z))&&/:false$/.test(T.meses[4])&&!T.cods.includes('RE0003')&&!T.cods.includes('M00010'), JSON.stringify(T.meses)+' '+T.cods);
 ok('Venda caiu 35% (10.000 → 6.500) e a previsão ficou igual (0%)', T.a===m4&&T.b===m1&&Math.abs(T.varV+0.35)<1e-9&&T.varP===0&&/a venda caiu 35% \(de 10\.000 para 6\.500\) e a previsão não mudou/.test(s), JSON.stringify([T.varV,T.varP]));
 ok('Previsão do mês atual (10.000) é 33% acima da venda média dos últimos 3 meses (7.500)', T.vendMed===7500&&Math.abs(T.cmp-1/3)<1e-9&&/33% acima da venda média dos últimos 3 meses \(7\.500\)/.test(s), JSON.stringify([T.vendMed,T.cmp]));
 ok('Vendido ÷ previsto nos últimos 3 meses = 22.500 ÷ 30.000 = 75%', Math.abs(T.pct3-22500/30000)<1e-9&&/75%/.test(s), T.pct3);
 ok('AC0005: previsão parada (5 meses igual, vendeu 77%), 2.500 acima da venda média; AC0030 não entra', T.lista.join(',')==='AC0005:2500:true:5'&&T.paradas.join(',')==='AC0005'&&/previsão parada/.test(s)&&/igual há 5 meses/.test(s), JSON.stringify(T.lista));
 /* filtro da tela vale aqui também */
 await p.selectOption('[data-cmf="ln"]','Linha 2'); await H.dorme(800);
 const F=await p.evaluate(()=>{ const x=Painel.comercial.tendencia(); return {prev:x.meses[0].prev,vend:x.meses[0].vend,lista:x.lista.length}; });
 ok('Filtro Linha 2: só o AC0030 (previsão 2.000, vendido 2.000, nenhum item acima)', F.prev===2000&&F.vend===2000&&F.lista===0, JSON.stringify(F));
 await p.click('[data-act="cm-limpar"]'); await H.dorme(600);
 /* sem mês fechado com previsão: a seção não quebra */
 const Z=await p.evaluate(()=>{ const B=Painel.comercial.S().anl.base, guard=B.prev.mes; const k=Object.keys(guard).sort().pop(); B.prev.mes={[k]:guard[k]}; const f=Painel.comercial.tendFrase(); B.prev.mes=guard; return f; });
 ok('Só o mês atual com previsão: a frase avisa que ainda não há mês fechado para comparar', /Ainda não há mês fechado com previsão/.test(Z), Z);
 /* PDF */
 await p.selectOption('#cm-mes',m1); await H.dorme(1500);
 const pdf=await p.evaluate(async()=>{ try{ await Painel.comercial.pdf(); return 'ok'; }catch(e){ return 'erro: '+e.message; } });
 ok('PDF do mês gera sem erro, com a parte 5', pdf==='ok', pdf);
 if(process.env.JSPDF_REAL){ const fs=require('fs'); const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('[data-act="cm-pdf"]')]); const f='/tmp/'+dl.suggestedFilename(); await dl.saveAs(f); ok('PDF de verdade: '+f, fs.statSync(f).size>8000, fs.statSync(f).size); }
 await p.selectOption('#cm-mes',cp); await H.dorme(1200);
 await p.evaluate(()=>{ const e=[...document.querySelectorAll('.cm-q')].find(x=>/VENDA CAIU/.test(x.innerText)); e&&e.scrollIntoView(); }); await H.dorme(300);
 await p.screenshot({path:'/tmp/ct-tela.png'});
 await p.setViewportSize({width:390,height:844}); await H.dorme(800);
 const lado=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 ok('Celular (390 px): a página não rola para o lado', !lado);
 const er=B.erros.filter(x=>!/404/.test(x)); ok('Sem erro de script', !er.length, er.join(' | '));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
