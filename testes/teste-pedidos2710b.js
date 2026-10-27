/* Pedidos de ajuste de 27/10 (2ª leva):
   1) Fila do almox: o "Separado" mostra o dia, não só a hora.
   2) Indicadores › Análise personalizada: produção pelo Extrato do Focco (EPP do item), com a linha vinda do cadastro do item. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10), hj=loc(now), ano=hj.slice(0,4);
 /* 1) fila: rancho separado ontem às 15:40 */
 const ont=new Date(now); ont.setDate(ont.getDate()-1); ont.setHours(15,40,0,0); const ontDm=loc(ont).slice(8,10)+'/'+loc(ont).slice(5,7);
 Object.assign(D['ordens/5002'],{data:hj,status:'aberta',rancho:'77001',rdb:{sep:{em:ont.toISOString(),nome:'Ana',por:'uDONA'}}});
 /* 2) Extrato do Focco: dois meses do ano; L3 só no item RJ300; AC100 na Linha 1; AC200 nas linhas 1 e 3 */
 const m1=ano+'-03', m2=ano+'-09';
 D['pcpvendas/'+m1]={d:{RJ300:{'05':[1000,900],'06':[500,0]},AC100:{'05':[2000,0]},AC200:{'10':[300,0]},AC500:{'11':[1000,0]},AC600:{'12':[400,0]}},em:now.toISOString()};
 D['pcpvendas/'+m2]={d:{RJ300:{'15':[700,0]},AC100:{'15':[100,0]}},em:now.toISOString()};
 D['pcpvendas/'+(+ano-1)+'-12']={d:{RJ300:{'15':[9999,0]}},em:now.toISOString()}; /* fora do ano */
 D['itens/RJ300']={codigo:'RJ300',descricao:'REJUNTE FLEX CINZA 5KG',linhas:['Linha 3']}; D['itens/AC100']={codigo:'AC100',descricao:'ARGAMASSA AC1 20KG',linhas:['Linha 1']}; D['itens/AC200']={codigo:'AC200',descricao:'ARGAMASSA AC2 20KG',linhas:['Linha 1','Linha 3']};
 D['itens/AC500']={codigo:'AC500',descricao:'ARGAMASSA AC3 20KG',linhas:['Linha 1','Linha 2','Linha 3']}; D['itens/AC600']={codigo:'AC600',descricao:'ARGAMASSA AC1 PLASTICA 20KG',linhas:['Linha 1','Linha 2','Linha 3']};
 D['itens/RJ300'].linhas=['Linha 1','Linha 3']; /* o cadastro diz que PODE ir em 2 linhas; o Focco diz onde é feito */
 D['pcpbase/itens']={l:{RJ300:{d:'REJUNTE FLEX CINZA 5KG',ln:['Linha 3'],a3:0,a30:0,sal:1},AC500:{d:'ARGAMASSA AC3 20KG',ln:['Linha 1','Linha 2']},AC600:{d:'ARGAMASSA AC1 PLASTICA 20KG',ln:['Linha 1','Linha 3']}},atual:{}};
 D['config/geral'].ritmo={linhas:['Linha 1','Linha 2','Linha 3'],itens:{AC500:{d:{'Linha 1':50,'Linha 2':50}},AC600:{d:{'Linha 1':100}}},aj1410:{em:'x'}};
 D['pcpbase/vendas']={ate:ano+'-09-20',ini:ano+'-01-05',mensal:{}};
 D['config/geral'].linhasOrdem=['Linha 1','Linha 2','Linha 3'];
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>{ __T.S().dbo.linha='todas'; __T.go('dbfila'); }); await H.dorme(1500);
 const sep=await p.evaluate(()=>{ const e=document.querySelector('.dbfsep'); return e?e.innerText:''; });
 ok('Fila do almox: "Separado" mostra o dia e a hora', new RegExp('Separado '+ontDm.replace('/','\\/')+' às 15:40').test(sep), sep);
 /* 2) análise pelo Focco */
 await p.evaluate(()=>__T.go('prodind')); await H.dorme(2000);
 ok('Pronta "Produzido no ano pelo Focco, por linha"', !!(await p.$('[data-act="pra-sug"]:has-text("Focco")')));
 await p.click('[data-act="pra-sug"]:has-text("Focco")'); await H.dorme(2500);
 const X=await p.evaluate(()=>{ const X=Painel.analiseProducao.resultado(); return X.R?{rows:X.R.rows,tot:X.R.tot}:null; });
 const lin=k=>((X&&X.rows.find(r=>r.k===k))||{}).v;
 ok('Total do ano pelo EPP (sem o mês do ano passado)', X&&X.tot===6000, JSON.stringify(X));
 ok('Por linha: L3 = 2.200 (RJ300 pela linha do Focco), L1 = 2.100 + 500 (AC500 pela % da Curva S), L2 = 500, AC200 sem divisão fica "Linha 1 / Linha 3"', lin('Linha 3')===2200&&lin('Linha 1')===2600&&lin('Linha 2')===500&&lin('Linha 1 / Linha 3')===700, JSON.stringify(X&&X.rows));
 const t=await p.evaluate(()=>document.getElementById('pra').innerText);
 ok('A tela diz que é pelo Extrato do Focco, até quando foi importado, os meses sem Extrato e de onde vem a linha', /pelo Extrato do Focco \(importado até 20\/09\)/.test(t)&&/Extrato do Focco importado vai até 20\/09/.test(t)&&/Dias com produção no Extrato, por mês:/.test(t)&&/Sem Extrato importado em jan\//.test(t)&&/A linha é a do item em Ajustes/.test(t), t.replace(/\n/g,' | ').slice(0,900));
 await p.click('[data-act="pra-ln"][data-v="Linha 3"]'); await H.dorme(1200);
 const X3=await p.evaluate(()=>{ const X=Painel.analiseProducao.resultado(); return X.R?{rows:X.R.rows,tot:X.R.tot}:null; });
 ok('Filtro Linha 3: só 2.200 (RJ300); o AC200, sem divisão, fica de fora e a tela avisa; o AC500 (dividido entre L1 e L2) não entra', X3&&X3.tot===2200, JSON.stringify(X3));
 const t3=await p.evaluate(()=>document.getElementById('pra').innerText); ok('Aviso: "700 sc de 2 itens ficaram de fora" (AC600: Focco L1/L3, Curva S só L1 = não dá para saber)', /700 sc de 2 itens ficaram de fora/.test(t3), t3.replace(/\n/g,' | ').slice(0,900));
 await p.selectOption('[data-pra="por"]','produto'); await H.dorme(1000);
 const t2=await p.evaluate(()=>document.getElementById('pra').innerText);
 ok('Por produto na Linha 3: RJ300 com o nome do cadastro', /RJ300 · REJUNTE FLEX CINZA/.test(t2)&&/2\.200 sc/.test(t2), t2.replace(/\n/g,' | ').slice(0,500));
 await p.selectOption('[data-pra="fonte"]',''); await H.dorme(1500);
 const Xp=await p.evaluate(()=>{ const X=Painel.analiseProducao.resultado(); return X.R?X.R.tot:null; });
 ok('Voltando para "Apontamentos do painel", não usa o Extrato', Xp!==2200, String(Xp));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
