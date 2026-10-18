/* RH: exames (ASO) e treinamentos (NRs) com vencimento: aba em Férias e prazos, registro no cadastro, sugestão do vencimento. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const dd=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 D['rh/dados/funcionarios/a']={nome:'ANA SOUZA',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2020-03-01',setor:'Produção',funcao:'Operadora',
   qualif:[{id:'q1',tipo:'ASO',data:dd(-370),validade:dd(-5)},{id:'q2',tipo:'NR-35',data:dd(-700),validade:dd(10)},{id:'q3',tipo:'NR-10',data:dd(-30),validade:dd(700)}]};
 D['rh/dados/funcionarios/b']={nome:'BRUNO LIMA',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2019-05-10',setor:'Produção',funcao:'Operador'};
 const B=await H.abrir({viewport:{width:1500,height:950}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>__T.go('rhferias')); await H.dorme(1000);
 const aba=await p.evaluate(()=>{ const b=document.querySelector('[data-act="rh-pzv"][data-v="nr"]'); return b?b.innerText:''; });
 ok('Férias e prazos ganhou a aba "Exames e NRs" com quantos precisam de atenção', /Exames e NRs · 2/.test(aba), aba);
 await p.click('[data-act="rh-pzv"][data-v="nr"]'); await H.dorme(700);
 const t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Lista: ASO vencido e NR-35 vencendo em 10 dias (a NR-10 em dia não aparece) e aviso de quem não tem ASO', /ASO periódico[\s\S]*Vencido há 5 dias/.test(t)&&/NR-35[\s\S]*Vence em 10 dias/.test(t)&&!/NR-10/.test(t)&&/sem ASO registrado: Bruno/.test(t), t.slice(t.indexOf('Precisam'),t.indexOf('Precisam')+260).replace(/\n/g,' | '));
 await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(800);
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('#view [data-act]')].find(x=>/BRUNO/.test(x.closest('tr')?x.closest('tr').innerText:'')&&/Editar/.test(x.innerText)); if(b) b.click(); }); await H.dorme(900);
 await p.click('[data-act="rh-qnovo"][data-f="b"]'); await H.dorme(400); await p.selectOption('#rh-q-tipo','NR-11'); await H.dorme(400);
 const val=await p.evaluate(()=>document.getElementById('rh-q-val').value);
 const hoje=dd(0); const esp=(()=>{ const x=new Date(hoje+'T12:00:00'); x.setMonth(x.getMonth()+12); x.setDate(x.getDate()-1); return x.toISOString().slice(0,10); })();
 ok('Ao escolher NR-11, sugere o vencimento (12 meses depois)', val===esp, val+' (esperado '+esp+')');
 await p.click('[data-act="rh-qok"]'); await H.dorme(1200);
 const q=await p.evaluate(async()=>{ const g=await __T.S().db.doc('rh/dados/funcionarios/b').get(); return (g.data().qualif||[]).map(x=>x.tipo+':'+x.validade); });
 ok('Registro salvo no cadastro e listado em "Exames e treinamentos"', q.length===1&&q[0].startsWith('NR-11:')&&await p.evaluate(()=>/NR-11 · empilhadeira/.test(document.getElementById('view').innerText)), q.join(','));
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
