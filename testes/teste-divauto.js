/* 14/10: Curva S — ajuste único automático (dona) entre as linhas (últimos 60 dias) × divisão configurada.
   Dados parecidos com os da fábrica: AC0003 configurado 50/50 mas só roda na Linha 1; RE0067 (cadastro M1+M2) só roda na M1. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed((d)=>{ const D=d.docs; const h=new Date(); const cp=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); const ago=dd=>new Date(Date.now()-dd*864e5).toISOString();
  const L=['Linha 1','Linha 2','Rejunte M1','Rejunte M2'];
  Object.assign(D['config/geral'],{linhas:L,linhasOrdem:L,capacidade:{'Linha 1':7500,'Linha 2':7500,'Rejunte M1':300,'Rejunte M2':300},
    ritmo:{linhas:L,itens:{AC0003:{d:{'Linha 1':50,'Linha 2':50}},AB0001:{d:{'Linha 2':100}}},jornada:528,aj1410:undefined}});
  D['pcpbase/prev']={mes:{[cp]:{AC0003:30000,AB0001:10000,RE0067:2000,RE0074:1500}}};
  D['pcpbase/itens']={l:{AC0003:{d:'ARGAMASSA CINZA AC2 EMB PAPEL 20 KG'},AB0001:{d:'ARGAMASSA BRANCA AC3 EMB PLASTICA 20 KG'},RE0067:{d:'REJUNTE FLEXIVEL CINZA 1 KG'},RE0074:{d:'REJUNTE FLEXIVEL BRANCO 1 KG'}}};
  D['itens/RE0067']={codigo:'RE0067',linhas:['Rejunte M1','Rejunte M2']}; D['itens/RE0074']={codigo:'RE0074',linhas:['Rejunte M1','Rejunte M2']};
  const O=(id,prod,l)=>{ D['ordens/'+id]={num:id,produto:prod,linha:l,data:h.toISOString().slice(0,10),turno:'Dia todo',total:5000,status:'aberta',criadaEm:ago(10)}; };
  O('7001','AC0003 - ARGAMASSA CINZA AC2 EMB PAPEL 20 KG','Linha 1'); O('7002','AB0001 - ARGAMASSA BRANCA AC3 EMB PLASTICA 20 KG','Linha 2');
  O('7003','RE0067 - REJUNTE FLEXIVEL CINZA 1 KG','Rejunte M1'); O('7004','RE0074 - REJUNTE FLEXIVEL BRANCO 1 KG','Rejunte M2');
  for(let i=0;i<5;i++){ D['entregas/a'+i]={ordem:'7001',num:'7001',linha:'Linha 1',qtd:900,em:ago(i+0.2),por:'x'}; D['entregas/b'+i]={ordem:'7002',num:'7002',linha:'Linha 2',qtd:500,em:ago(i+0.2),por:'x'};
    D['entregas/c'+i]={ordem:'7003',num:'7003',linha:'Rejunte M1',qtd:100,em:ago(i+0.2),por:'x'}; D['entregas/e'+i]={ordem:'7004',num:'7004',linha:'Rejunte M2',qtd:80,em:ago(i+0.2),por:'x'}; }
  /* entrega antiga (fora dos 60 dias) não conta */
  D['entregas/velha']={ordem:'7001',num:'7001',linha:'Linha 2',qtd:9000,em:ago(80),por:'x'};
 });
 const B=await H.abrir({viewport:{width:1400,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE);
 await p.evaluate(()=>{ window.__pls=[]; });
 await H.entrar(p,'iasmyn','senha123'); await H.dorme(1500);
 await p.evaluate(()=>{ const S=__T.S(), db=S.db, d0=db.doc.bind(db); db.doc=pa=>{ const r=d0(pa); if(pa==='config/geral'){ const u=r.update.bind(r); r.update=x=>{ window.__pls.push(JSON.parse(JSON.stringify(x))); return u(x); }; } return r; }; });
 await H.dorme(9000);
 const pl=await p.evaluate(()=>window.__pls);
 const r=(pl[0]||{}).ritmo||{};
 ok('Sozinho, no painel da dona: AC0003 vira 100% Linha 1', JSON.stringify((r.itens||{}).AC0003)==='{"d":{"Linha 1":100}}', JSON.stringify(r.itens));
 ok('AB0001 (já batia) não muda', JSON.stringify((r.itens||{}).AB0001)==='{"d":{"Linha 2":100}}');
 ok('Guarda o que era antes, para desfazer', r.aj1410&&JSON.stringify(r.aj1410.antes.AC0003)==='{"Linha 1":50,"Linha 2":50}'&&r.aj1410.itens.join()==='AC0003', JSON.stringify(r.aj1410));
 await H.dorme(11000); const n2=await p.evaluate(()=>window.__pls.length);
 ok('Faz uma vez só', n2===1, n2+' gravações');
 const er=B.erros.filter(x=>!/404/.test(x)); ok('Sem erro de JavaScript', !er.length, er.join(' | '));
 await B.browser.close(); console.log(res.every(x=>x.ok)?'\nTUDO PASSOU':'\nALGO FALHOU'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
