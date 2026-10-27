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
 D['pcpvendas/'+m1]={d:{RJ300:{'05':[1000,900],'06':[500,0]},AC100:{'05':[2000,0]},AC200:{'10':[300,0]}},em:now.toISOString()};
 D['pcpvendas/'+m2]={d:{RJ300:{'15':[700,0]},AC100:{'15':[100,0]}},em:now.toISOString()};
 D['pcpvendas/'+(+ano-1)+'-12']={d:{RJ300:{'15':[9999,0]}},em:now.toISOString()}; /* fora do ano */
 D['itens/RJ300']={codigo:'RJ300',descricao:'REJUNTE FLEX CINZA 5KG',linhas:['Linha 3']}; D['itens/AC100']={codigo:'AC100',descricao:'ARGAMASSA AC1 20KG',linhas:['Linha 1']}; D['itens/AC200']={codigo:'AC200',descricao:'ARGAMASSA AC2 20KG',linhas:['Linha 1','Linha 3']};
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
 ok('Total do ano pelo EPP (sem o mês do ano passado)', X&&X.tot===4600, JSON.stringify(X));
 ok('Por linha: Linha 3 = 2.200 (RJ300), Linha 1 = 2.100, "Linha 1 / Linha 3" = 300', lin('Linha 3')===2200&&lin('Linha 1')===2100&&lin('Linha 1 / Linha 3')===300, JSON.stringify(X&&X.rows));
 const t=await p.evaluate(()=>document.getElementById('pra').innerText);
 ok('A tela diz que é pelo Extrato do Focco e até quando foi importado, e explica a linha', /pelo Extrato do Focco \(importado até 20\/09\)/.test(t)&&/Extrato do Focco importado vai até 20\/09/.test(t)&&/linhas juntas/.test(t), t.replace(/\n/g,' | ').slice(0,700));
 await p.click('[data-act="pra-ln"][data-v="Linha 3"]'); await H.dorme(1200);
 const X3=await p.evaluate(()=>{ const X=Painel.analiseProducao.resultado(); return X.R?{rows:X.R.rows,tot:X.R.tot}:null; });
 ok('Filtro Linha 3: 2.500 (RJ300 + o item que também é feito na Linha 3)', X3&&X3.tot===2500, JSON.stringify(X3));
 await p.selectOption('[data-pra="por"]','produto'); await H.dorme(1000);
 const t2=await p.evaluate(()=>document.getElementById('pra').innerText);
 ok('Por produto na Linha 3: RJ300 com o nome do cadastro', /RJ300 · REJUNTE FLEX CINZA/.test(t2)&&/2\.200 sc/.test(t2), t2.replace(/\n/g,' | ').slice(0,500));
 await p.selectOption('[data-pra="fonte"]',''); await H.dorme(1500);
 const Xp=await p.evaluate(()=>{ const X=Painel.analiseProducao.resultado(); return X.R?X.R.tot:null; });
 ok('Voltando para "Apontamentos do painel", não usa o Extrato', Xp!==2500, String(Xp));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
