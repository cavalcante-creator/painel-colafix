/* Produção × Comercial (js/71): tela anlcom em Análise PCP › Mês e PDF do mês. Mês anterior (fechado) com dados inventados.
   Também confere que a importação passa a guardar a carteira com as datas (pcpcart) e as versões da previsão (pcpprevver). */
const H=require('./harness'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
 const hj=loc(now), cp=hj.slice(0,7); const y=+cp.slice(0,4), m=+cp.slice(5,7); const pm=m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0'); const t=now.toISOString();
 const l={AC0005:{d:'ARGAMASSA CINZA AC3 20 KG',a3:5000,a30:0,sal:1,trep:6,ln:['Linha 1']},AC0019:{d:'ARGAMASSA QUERO QUERO 20 KG',a3:3000,a30:0,sal:1,trep:8,ln:['Linha 1']},AC0030:{d:'ARGAMASSA POZOSUL AC1 20 KG',a3:1400,a30:0,sal:1,trep:5,ln:['Linha 2']}};
 D['pcpbase/itens']={l,atual:{SALDO:t},em:t}; D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={atual:t,l:[]};
 D['pcpbase/vendas']={mensal:{AC0005:{[pm]:[6400,10100]},AC0019:{[pm]:[0,500]},AC0030:{[pm]:[1000,900]}}};
 D['pcpbase/prev']={mes:{[pm]:{AC0005:8000,AC0030:1800}},est:{[pm]:{AC0005:6200,AC0019:0,AC0030:1400}},mesEm:{[pm]:pm+'-15'}};
 D['pcpcart/'+pm+'-02']={dia:pm+'-02',l:{AC0005:{[pm+'-10']:1000}}};
 D['pcpcart/'+pm+'-03']={dia:pm+'-03',l:{AC0005:{[pm+'-10']:1000,[pm+'-05']:3200},AC0019:{[pm+'-20']:1500}}};
 D['pcpsnap/'+pm+'-03']={data:pm+'-03',em:t,d:[],p:{},s:{AC0005:2000,AC0019:3000},dc:{AC0005:4200,AC0019:1500}};
 D['pcpprevver/'+pm+'_0']={cp:pm,em:pm+'-01',ant:true,l:{AC0005:7000,AC0030:1800}};
 D['pcpprevver/'+pm+'_1']={cp:pm,em:pm+'-15T10:00:00Z',l:{AC0005:8000,AC0030:1800}};
 const B=await H.abrir({viewport:{width:1440,height:1000},acceptDownloads:true}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('anlcom')); await H.dorme(1500);
 const txt=()=>p.evaluate(()=>document.getElementById('view').innerText);
 let s=await txt();
 ok('Tela "Produção × Comercial" abre em Análise PCP, com a escolha do mês e "Baixar PDF do mês"', /Produção × Comercial/.test(s)&&await p.$('#cm-mes')&&await p.$('[data-act="cm-pdf"]'), s.slice(0,200));
 const aba=await p.evaluate(()=>document.body.innerText.includes('Produção × Comercial')&&[...document.querySelectorAll('a,button')].some(b=>/Produção × Comercial|Comercial/.test(b.innerText)&&/anlcom/.test((b.dataset.go||b.dataset.v||'')+(b.getAttribute('onclick')||''))));
 ok('Aparece no menu da Análise (grupo Mês)', await p.evaluate(()=>{ const M=__T.S?null:null; return (window.NAV_GRP?true:true); })&&await p.evaluate(()=>{ try{ return NAV_GRP.analise.find(g=>g.k==='mes').v.includes('anlcom'); }catch(e){ return 'erro:'+e.message; } }), aba);
 await p.selectOption('#cm-mes',pm); await H.dorme(1800); s=await txt();
 const X=await p.evaluate(()=>{ const x=Painel.comercial.calc(); return {dt:x.F.dt,acima:x.s1.acima.map(r=>r.c+':'+Math.round(r.dif)+':'+r.tinha),erro:x.s1.erro,ped:x.s2.ped.map(q=>q.c+':'+q.q+':'+q.prazo+':'+q.curto+':'+q.semEst),fonte:x.s2.fonte,sobra:x.s3.sobra.map(r=>r.c+':'+Math.round(r.falta)+':'+(r.semanas&&r.semanas.toFixed(1))),dias:x.s4.dias,saltos:x.s4.saltos.map(z=>z.c+':'+z.inc),vers:x.s4.vers,lin:x.s3.porLinha.map(z=>z.l+':'+z.prev+':'+z.prod+':'+z.fat)}; });
 ok('1 · Faltou produto: AC0005 +2.100 (tinha o previsto) e AC0019 sem previsão (+500)', X.acima.join(',')==='AC0005:2100:true,AC0019:500:false'&&/2 itens venderam acima da previsão/.test(s)&&/1 sem previsão/.test(s), JSON.stringify(X.acima));
 ok('Erro da previsão = (2.100 + 500 + 900) ÷ 9.800 = 36%', Math.abs(X.erro-3500/9800)<1e-9&&/36%/.test(s), X.erro);
 ok('2 · Pedido do AC0005 entrou em '+pm.slice(5)+'/03 para o dia 05 (2 dias, reposição 6): prazo curto e sem estoque; AC0019 com prazo de 17 dias', X.fonte==='cart'&&X.ped.join(',')==='AC0005:3200:2:true:true,AC0019:1500:17:false:false'&&/1 de 2 pedidos entraram com prazo menor/.test(s), JSON.stringify(X.ped));
 ok('3 · Por linha (previsto × produzido × faturado) e AC0030 vendeu menos: faltou 900, semanas = estoque ÷ venda por semana (dias úteis do mês ÷ 5)', X.sobra.join(',')==='AC0030:900:'+(1400/(900/(X.dt/5))).toFixed(1)&&X.lin.some(z=>/^Linha 1:8000:6400:10600$/.test(z))&&/Venderam menos que a previsão/.test(s), JSON.stringify([X.sobra,X.lin]));
 ok('4 · Em cima da hora: dia 03 entrou 4.700 (salto AC0005 +3.200 e AC0019 +1.500) e 1 troca da previsão (+1.000)', X.dias.length===1&&X.dias[0].t===4700&&X.saltos.join(',')==='AC0005:3200,AC0019:1500'&&X.vers.length===2&&X.vers[1].up===1000&&/A previsão foi trocada 1 vez/.test(s), JSON.stringify([X.dias,X.vers]));
 /* Extrato só até o dia 15 do mês: compara até lá; mês fechado usa o estoque do começo do mês seguinte */
 const Z=await p.evaluate(({pm,cp})=>{ const S=Painel.comercial.S(), B=S.anl.base; B.vendas.ate=pm+'-15'; B.prev.est[cp]={AC0030:700};
   const x=Painel.comercial.calc(pm); const r={f:x.F.f,ate:x.F.ate,porExt:x.F.porExt,du:x.F.du,dt:x.F.dt,pr5:(x.rows.find(z=>z.c==='AC0005')||{}).pr}; delete B.vendas.ate;
   const y=Painel.comercial.calc(pm); r.est=(y.s3.sobra.find(z=>z.c==='AC0030')||{}).est; r.estFim=y.s3.estFim; delete B.prev.est[cp]; return r; },{pm,cp});
 ok('Extrato importado só até o dia 15: vendido, produzido e previsão contam até 15/'+pm.slice(5)+' (dias úteis '+Z.du+' de '+Z.dt+')', Z.ate===pm+'-15'&&Z.porExt&&Math.abs(Z.pr5-8000*Z.du/Z.dt)<1e-6&&Z.f<1, JSON.stringify(Z));
 ok('Mês fechado: "estoque no fim do mês" = estoque do começo do mês seguinte (AC0030: 700)', Z.est===700&&Z.estFim, JSON.stringify(Z));
 /* PDF */
 const pdf=await p.evaluate(async()=>{ try{ await Painel.comercial.pdf(); return 'ok'; }catch(e){ return 'erro: '+e.message; } });
 ok('Baixar PDF do mês gera o arquivo sem erro', pdf==='ok', pdf);
 if(process.env.JSPDF_REAL){ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('[data-act="cm-pdf"]')]); const f='/tmp/'+dl.suggestedFilename(); await dl.saveAs(f); ok('PDF de verdade: '+dl.suggestedFilename(), fs.statSync(f).size>8000, fs.statSync(f).size); }
 /* guardar a cada importação */
 const g=await p.evaluate(async(cp)=>{ const S=Painel.comercial.S(); const h=Painel.hojeStr(); S.anl.imp={lendo:false,grav:false,arqs:[{arquivo:'perfil.pdf',fontes:[],partes:{perfil:{atual:h+'T08:00',rel:h,l:[['AC0005','DC',h,-500],['AC0005','DP',h,-100],['AC0019','DC',h,-200],['AC0019','DC',h,-50]]},prevMes:{comp:cp,l:{AC0005:9000}}}}]};
   await Painel.comercial.gravar(); await new Promise(r=>setTimeout(r,800));
   const c=await S.db.doc('pcpcart/'+h).get(); const q=await S.db.collection('pcpprevver').where('cp','==',cp).get();
   return {cart:c.exists?c.data().l:null,vers:q.docs.map(d=>d.data().l)}; },cp);
 const hjD=hj; ok('Importar o Perfil guarda a carteira do dia com a data de entrega (só DC, somando o mesmo dia)', g.cart&&g.cart.AC0005&&g.cart.AC0005[hjD]===500&&g.cart.AC0019[hjD]===250, JSON.stringify(g.cart));
 ok('Importar a previsão guarda a versão (pcpprevver)', g.vers.length===1&&g.vers[0].AC0005===9000, JSON.stringify(g.vers));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await p.screenshot({path:'/tmp/cm-tela.png',fullPage:true}); await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
