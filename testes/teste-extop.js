/* Extrato do Focco com o nº da ordem (27/10, "pode colocar no relatório, deixar só o concreto"):
   a importação guarda os sacos de cada ordem (op) e a Produção do ano usa a linha da ordem no painel. */
const H=require('./harness'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const ano=new Date().getFullYear();
 D['itens/AC0904']={codigo:'AC0904',descricao:'ARGAMASSA AC2 PLASTICA 20KG',linhas:['Linha 1','Linha 2','Linha 3']};
 D['ordens/op1']={num:'900001',linha:'Linha 3',produto:'AC0904 - ARGAMASSA AC2 PLASTICA 20KG',data:ano+'-03-04',status:'encerrada',total:1000,origem:'planilha'};
 D['ordens/op2']={num:'900002',linha:'Linha 1',produto:'AC0904 - ARGAMASSA AC2 PLASTICA 20KG',data:ano+'-03-09',status:'encerrada',total:1000,origem:'planilha'};
 D['config/geral'].linhasOrdem=['Linha 1','Linha 2','Linha 3']; D['config/geral'].ritmo={linhas:['Linha 1','Linha 2','Linha 3'],itens:{},aj1410:{em:'x'}};
 D['pcpbase/itens']={l:{},atual:{}};
 const td=x=>'<td><font>'+x+'</font></td>', lin=(a)=>'<TR>\r\n'+a.map(td).join('\r\n')+'</TR>\r\n';
 const H0=['LCTO','DT','NRO DOC','SIGLA','ENT SAI','QTDE','VALOR','COD ALMOX','COD ALMOX','CUSTO MED','VALOR MOVTO','PLAN','COD ITEM'];
 const R=[[1,'05/03/'+ano+' 00:00:00','900001','EPP','E','600','','','3','1','1','P01','AC0904'],[2,'05/03/'+ano+' 00:00:00','900002','EPP','E','300','','','3','1','1','P01','AC0904'],
   [3,'05/03/'+ano+' 00:00:00','777777','EPP','E','100','','','30','1','1','P01','AC0904'],[4,'10/03/'+ano+' 00:00:00','900001','EPP','E','250','','','30','1','1','P01','AC0904'],
   [5,'10/03/'+ano+' 00:00:00','192048','NFS','S','40','10','3','','1','1','P01','AC0904']];
 const html='<HTML><HEAD><TITLE>Gerador</TITLE></HEAD><BODY><b><center><h1>EXTRATO DE ITEM</h1></center></b><br><table border="1">'+lin(H0)+R.map(lin).join('')+'</table></BODY></HTML>';
 const arq='/tmp/claude-0/Extrato_teste.xls'; fs.mkdirSync('/tmp/claude-0',{recursive:true}); fs.writeFileSync(arq,html,'latin1');
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message));
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>{ try{ localStorage.removeItem('colafix.opLn'); }catch(e){} __T.go('anlbase'); }); await H.dorme(1500);
 await p.setInputFiles('#anl-arq',arq); await H.dorme(2500); if(process.env.DBG) console.log('IMP',await p.evaluate(()=>{ const c=document.getElementById('anl-imp-card'); return c?c.innerText.slice(0,600):'sem card · '+document.getElementById('view').innerText.slice(0,300); }));
 await p.click('[data-act="anl-gravar"]'); await H.dorme(3000);
 const doc=await p.evaluate(async a=>{ const g=await Painel.db().doc('pcpvendas/'+a+'-03').get(); return g.exists?g.data():null; },ano);
 const op=doc&&doc.op&&doc.op.AC0904;
 ok('Importação guarda os sacos por ordem (op): dia 05 = 900001:600, 900002:300, 777777:100; dia 10 = 900001:250', op&&op['05']&&op['05']['900001']===600&&op['05']['900002']===300&&op['05']['777777']===100&&op['10']['900001']===250, JSON.stringify(doc&&{d:doc.d,op:doc.op}));
 ok('Total do dia continua no d (EPP 1000 no dia 05, NFS 40 no dia 10)', doc&&doc.d.AC0904['05'][0]===1000&&doc.d.AC0904['10'][1]===40, JSON.stringify(doc&&doc.d));
 const X=async ls=>{ await p.evaluate(ls=>{ const A=Painel.producaoAno.estado(); Object.assign(A,{ano:new Date().getFullYear(),fonte:'focco',med:'sc',ver:'produto',ls,q:'',comp:false}); __T.go('prodano'); },ls);
   for(let i=0;i<20;i++){ const x=await p.evaluate(()=>{ const X=Painel.producaoAno.dados(); return X.rows?{tot:X.tot,fora:(X.R.semDiv||[]).map(o=>o.c+':'+o.v)}:null; }); if(x) return x; await H.dorme(500); } return null; };
 let x=await X(['Linha 3']); ok('Linha 3 = 850 (ordem 900001 nos dias 05 e 10); os 100 da ordem que não está no painel ficam de fora', x&&x.tot===850&&x.fora.join()==='AC0904:100', JSON.stringify(x));
 x=await X(['Linha 1']); ok('Linha 1 = 300 (ordem 900002)', x&&x.tot===300, JSON.stringify(x));
 x=await X(['Linha 2']); ok('Linha 2 = 0', x&&x.tot===0, JSON.stringify(x));
 const cache=await p.evaluate(()=>JSON.parse(localStorage.getItem('colafix.opLn')||'{}'));
 ok('Guarda no aparelho a linha das ordens (900001 → Linha 3) e a que não achou (777777)', cache['900001']&&cache['900001'].n==='Linha 3'&&cache['777777']&&cache['777777'].n==='', JSON.stringify(cache));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
