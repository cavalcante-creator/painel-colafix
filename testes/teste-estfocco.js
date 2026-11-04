/* Estoque × Focco (js/80): por que o Focco fica acima do físico. Dados inventados.
   X1: contou 400, Focco 500; vendeu 60 entre a foto do saldo e a contagem → falta de verdade 40; 30 rasgados → "Rasgados".
   X2: contou 200, Focco 300; ordem 9001 com 150 no Focco e 50 no painel → "Focco apontou mais".
   X3: bateu. X4: falta 70 sem explicação, em 2 contagens → "Faltam sempre". */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
 const dia=k=>loc(new Date(now.getTime()-k*864e5)), t=now.toISOString(), iso=(k,h)=>new Date(dia(k)+'T'+h+':00').toISOString();
 const d10=dia(10), d9=dia(9), d8=dia(8), d7=dia(7), d5=dia(5), d20=dia(20);
 D['pcpbase/itens']={l:{X1:{d:'ARGAMASSA X1 20 KG',a3:500,a30:0},X2:{d:'ARGAMASSA X2 20 KG',a3:300,a30:0},X3:{d:'REJUNTE X3 1 KG',a3:100,a30:0},X4:{d:'ARGAMASSA X4 20 KG',a3:120,a30:0}},atual:{SALDO:t},em:t};
 D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={atual:t,l:[]}; D['pcpbase/prev']={mes:{},est:{},mesEm:{}};
 D['pcpbase/vendas']={ate:dia(1),mensal:{},diario:{X1:{[d9]:[0,40],[d8]:[0,20],[d7]:[0,500]}}};
 D['pcpsnap/'+d10]={data:d10,em:iso(10,'08:00'),s:{},d:[],p:{}};
 D['pcpsnap/'+d20]={data:d20,em:iso(20,'08:00'),s:{},d:[],p:{}};
 const it=(c,s,r)=>({almox3:c,almox30:0,total:c,saldoSistema3:s,saldoSistema30:0,qtdRasgada:r||0});
 D['conferencias/C1']={numero:'C1',local:'Todos',em:iso(7,'10:00'),dia:d7,itens:{X1:it(400,500,30),X2:it(200,300),X3:it(100,100),X4:it(50,120)}};
 D['conferencias/C0']={numero:'C0',local:'Almox 3',em:iso(15,'10:00'),dia:dia(15),itens:{X4:it(60,130)}};
 const cp=d5.slice(0,7); D['pcpvendas/'+cp]={d:{},op:{X2:{[d5.slice(8)]:{'9001':150}}}};
 D['entregas/e9001']={ordem:'o9001',num:'9001',linha:'Linha 1',qtd:50,em:iso(5,'14:00'),por:'uDONA'};
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('anlxf')); await H.dorme(2500); await p.evaluate(()=>__T.go('anlxf')); await H.dorme(800);
 const s=await p.evaluate(()=>document.getElementById('view').innerText);
 const X=await p.evaluate(()=>{ const x=Painel.estoqueFocco.calc(); if(!x) return null; const r={}; x.rows.forEach(z=>r[z.c]={dif:z.u.dif,real:z.u.real,sai:z.u.sai,lei:z.lei[0],rep:z.rep,n:z.n,mais:z.mais}); return {r,T:x.T,ords:x.ords.map(o=>o.n+':'+o.dif)}; });
 ok('Tela "Estoque × Focco" abre em Análise PCP › Sistema', /Estoque × Focco/.test(s)&&await p.evaluate(()=>[...document.querySelectorAll('a,button')].some(b=>/Estoque × Focco/.test(b.innerText)&&!b.closest('#view .head'))), s.slice(0,200));
 ok('X1: Focco 500, contou 400 (−100); vendeu 60 depois da foto do saldo (dias 9 e 8; o dia da contagem fica de fora) → falta de verdade 40, leitura "Rasgados"', X&&X.r.X1.dif===-100&&X.r.X1.sai===60&&X.r.X1.real===-40&&/Rasgados/.test(X.r.X1.lei), JSON.stringify(X&&X.r.X1));
 ok('X2: ordem 9001 com 150 no Focco e 50 no painel → +100, leitura "Focco apontou mais que o painel"', X&&X.ords.join(',')==='9001:100'&&X.r.X2.mais===100&&/Focco apontou mais/.test(X.r.X2.lei), JSON.stringify([X&&X.ords,X&&X.r.X2]));
 ok('X3 bateu; X4 sem explicação, com falta em 2 de 2 contagens', X&&X.r.X3.lei==='Bateu'&&/Sem explicação/.test(X.r.X4.lei)&&X.r.X4.rep===2&&X.r.X4.n===2, JSON.stringify(X&&[X.r.X3,X.r.X4]));
 ok('Totais: faltou 270 na contagem, 60 era só o horário, 210 de verdade (X1 40, X2 100, X4 70), 1 item falta sempre', X&&X.T.falta===270&&X.T.hor===60&&X.T.real===210&&X.T.sempre===1&&X.T.rasg===30&&X.T.mais===100&&X.T.sem===80, JSON.stringify(X&&X.T));
 ok('Frase e quadros na tela', /3 itens ficaram abaixo do Focco \(270 a menos no físico\)/.test(s)&&/60 disso é só o horário/.test(s)&&/De onde vem a falta de verdade/.test(s)&&/ORDENS COM MAIS PRODUÇÃO NO FOCCO/i.test(s), s.slice(s.indexOf('Nas contagens'),s.indexOf('Nas contagens')+300));
 await p.click('[data-act="xf-ab"][data-v="X4"]'); await H.dorme(500);
 const h=await p.evaluate(()=>(document.querySelector('.xf-h')||{}).innerText||'');
 ok('Tocar no item mostra todas as contagens dele', /Contagens de X4/.test(h)&&(h.match(/\n/g)||[]).length>=3, h.replace(/\n/g,' | '));
 await p.click('[data-act="xf-so"][data-v="todos"]'); await H.dorme(400);
 const n=await p.evaluate(()=>document.querySelectorAll('.xf-tr').length);
 ok('"Todos contados" mostra os 4 itens', n===4, n);
 await p.screenshot({path:'/tmp/xf.png',fullPage:true});
 await p.setViewportSize({width:390,height:844}); await H.dorme(600); const lado=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 ok('Celular: a página não rola para o lado', !lado);
 const er=B.erros.filter(x=>!/404/.test(x)); ok('Sem erro de script', !er.length, er.join(' | '));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
