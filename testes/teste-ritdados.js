/* Confere os números do Previsto × Realizado contra uma conta feita à mão (mês de exemplo, hoje = 20/10/2026). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const cp='2026-10';
 delete D['ordens/5001']; delete D['ordens/5002'];
 D['pcpbase/prev']={mes:{[cp]:{'AC3001':30000}}}; D['pcpbase/itens']={l:{'AC3001':{d:'ARGAMASSA AC3 20KG',ln:['Linha 1']}}}; D['itens/AC3001'].linhas=['Linha 1'];
 const ord=(id,cod,data,st)=>({num:id,produto:cod+' - PRODUTO',linha:'Linha 1',data,turno:'Dia todo',total:5000,status:st||'encerrada',criadaEm:'2026-09-25T10:00:00.000Z'});
 D['ordens/old1']=ord('old1','AC3001','2026-10-01');                       // encerrada antiga (fica fora das 1.000 mais recentes)
 D['ordens/o2']=ord('o2','AC3001','2026-10-15','aberta');
 D['ordens/fx']=ord('fx','XX999','2026-10-16');                             // item fora da previsão
 for(let i=0;i<1000;i++){ const dia=2+(i%27); D['ordens/r'+i]=ord('r'+i,'AC3001','2026-'+(dia<=30?'10-'+String(dia).padStart(2,'0'):'11-0'+(dia-30)),'aberta'); D['ordens/r'+i].total=0; }
 const E=(id,ordem,em,qtd,extra)=>{ D['entregas/'+id]=Object.assign({ordem,num:ordem,linha:'Linha 1',qtd,em,por:'x'},extra||{}); };
 E('e1','old1','2026-10-01T13:00:00-03:00',1000);
 E('e2','o2','2026-10-05T13:00:00-03:00',500); E('e3','o2','2026-10-05T14:00:00-03:00',0,{anula:'e2'});   // anulado
 E('e4','o2','2026-10-12T10:00:00-03:00',300);                              // feriado → conta no dia útil anterior
 E('e5','o2','2026-10-15T10:00:00-03:00',2000);
 E('e6','fx','2026-10-16T10:00:00-03:00',200);                              // fora da previsão
 E('e7','o2','2026-10-19T23:30:00-03:00',400);                              // 23:30 (horário de Brasília)
 const esperado=1000+300+2000+200+400;
 const B=await H.abrir({timezoneId:'America/Sao_Paulo'}); await B.ctx.clock.setFixedTime(new Date('2026-10-20T10:00:00-03:00')); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.evaluate(()=>__T.go('anlrit')); let k=null; for(let i=0;i<40;i++){ await H.dorme(400); k=await p.evaluate(()=>__T.ritk('2026-10',{l:'Linha 1'})); if(k&&k.ra>=3500) break; }
 const carregadas=await p.evaluate(()=>!!__T.S().ordens.find(o=>o._id==='old1'));
 ok('Realizado da Linha 1 = soma à mão (inclui ordem encerrada antiga, feriado, 23:30 e fora da previsão; sem o anulado)', k&&k.ra===esperado, `painel ${k&&k.ra} · esperado ${esperado} · ordem antiga carregada: ${carregadas}`);
 ok('Meta do mês = previsão do item na linha (30.000)', k&&Math.round(k.T)===30000, k&&k.T);
 // dias úteis de outubro/2026 (seg–sex, sem o feriado 12/10) = 21; até 20/10 (com produção hoje? não) → 13 dias úteis
 ok('Dias úteis do mês (21) e até ontem (13), sem o feriado de 12/10', k&&k.n===21&&k.du===13, k&&(k.n+' / '+k.du+' · corte '+k.cut));
 const pa=30000*13/21, need=(30000-esperado)/(21-13);
 ok('"Deveria estar hoje" e "precisa por dia" conferem com a conta à mão', k&&Math.abs(k.pa-pa)<1&&Math.abs(k.need-need)<1, k&&(`deveria ${Math.round(k.pa)} (à mão ${Math.round(pa)}) · precisa ${Math.round(k.need)} (à mão ${Math.round(need)})`));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x)).slice(0,3)); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
