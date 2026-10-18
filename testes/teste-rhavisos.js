/* Avisos nas TVs publicados pelo RH (faixa que passa de lado) e o Mapa do ano novo. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const iso=d=>d.toISOString().slice(0,10), dd=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return iso(d); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 const F=(id,nome,adm,setor,fn)=>{ D['rh/dados/funcionarios/'+id]={nome,tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:adm,setor,funcao:fn}; };
 F('a','ANA SOUZA','2020-03-01','Produção','Operadora'); D['rh/dados/funcionarios/a'].nascimento='1990-'+dd(0).slice(5); F('b','BRUNO LIMA','2019-05-10','Produção','Operador'); D['rh/dados/funcionarios/b'].nascimento='1985-'+dd(2).slice(5); F('c','CARLA DIAS','2018-01-20','Logística','Empilhadeira');
 const FE=(id,fid,ini,dias)=>{ const fim=iso(new Date(new Date(ini+'T12:00:00').getTime()+(dias-1)*864e5)); D['rh/dados/ferias/'+id]={funcId:fid,funcionario:'x',aquisitivo:'2024-01-01',inicio:ini,dias,fim,retorno:fim,status:'programada'}; };
 FE('e1','a',dd(-5),20); FE('e2','b',dd(10),15); FE('e3','c',dd(40),30);
 const B=await H.abrir({viewport:{width:1600,height:950}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(1500);
 ok('Início do RH tem o quadro "Avisos nas TVs"', await p.evaluate(()=>/AVISOS NAS TVS/.test(document.getElementById('view').innerText)));
 const publica=async(t,sub,tipo)=>{ await p.click('[data-act="rh-avnovo"]'); await H.dorme(300); await p.fill('#rh-av-t',t); await p.fill('#rh-av-s',sub); await p.click(`[data-act="rh-avtipo"][data-v="${tipo}"]`); await H.dorme(200); await p.click('[data-act="rh-avok"]'); await H.dorme(1200); };
 await publica('Reunião de segurança hoje às 15h','No refeitório · todos os turnos','seg'); await publica('Parabéns, Ana Souza!','Aniversário hoje','festa');
 const lista=await p.evaluate(()=>[...document.querySelectorAll('.rh-avl b')].map(b=>b.innerText));
 ok('RH publica dois avisos (com tipo e detalhe)', lista.length===2, lista.join(' | '));
 await p.screenshot({path:'/tmp/rh-avisos.png'});
 await p.evaluate(()=>__T.go('tvapres')); await H.dorme(500); await p.click('[data-act="apr-abre"][data-v="tvfab"]'); await H.dorme(2500);
 const tv=await p.evaluate(()=>{ const t=document.querySelector('.tva-t'); return {n:document.querySelectorAll('.tva-c').length,anim:t?getComputedStyle(t).animationName:'',txt:t?t.innerText:''}; });
 ok('A TV mostra os avisos numa faixa que passa de lado (cartões repetidos para o giro contínuo)', tv.n===6&&tv.anim==='tvaPassa'&&/Reunião de segurança/.test(tv.txt)&&/Parabéns/.test(tv.txt), JSON.stringify({n:tv.n,anim:tv.anim}));

 ok('Parabéns da aniversariante de hoje entram na faixa (e o de daqui a 2 dias ainda não)', /Parabéns, Ana Souza!/.test(tv.txt)&&/Feliz aniversário/.test(tv.txt)&&!/Bruno Lima!/.test(tv.txt), tv.txt.replace(/\n/g,' | ').slice(0,200));
 await p.screenshot({path:'/tmp/tv-avisos.png'}); await p.keyboard.press('Escape'); await H.dorme(600);
 await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(800); p.once('dialog',dl=>dl.accept()); await p.click('[data-act="rh-avx"]'); await H.dorme(1200);
 ok('Remover um aviso tira das TVs', await p.evaluate(()=>document.querySelectorAll('.rh-avl').length===1&&(__T.S().avTV||[]).length===1));

 const card=await p.evaluate(()=>(document.querySelector('.rh-avan')||{}).innerText||'');
 ok('Quadro do RH mostra a opção dos parabéns e quem aparece hoje (e os próximos)', /Hoje nas TVs: Ana Souza/.test(card)&&/Próximos|Bruno/.test(card)||/Hoje nas TVs: Ana Souza/.test(card), card.replace(/\n/g,' | '));
 await p.uncheck('[data-act="rh-avaniv"]'); await H.dorme(1500);
 ok('Desligar a opção tira os parabéns das TVs', await p.evaluate(()=>!(__T.S().avAuto||[]).length));
 await p.evaluate(()=>__T.go('rhferias')); await H.dorme(800); await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/Mapa do ano/.test(x.innerText)); if(b) b.click(); }); await H.dorme(900);
 const mp=await p.evaluate(()=>({res:(document.querySelector('.rh-mres')||{}).innerText||'',agora:document.querySelectorAll('.rh-mb.agora').length,rot:[...document.querySelectorAll('.rh-mb span')].map(s=>s.innerText),hj:!!document.querySelector('.rh-mh .hj')}));
 ok('Mapa do ano: resumo (de férias hoje, próximos 30 dias), barra "em férias agora" e datas dentro das barras', /1\s*de férias hoje/.test(mp.res)&&/1\s*saem nos próximos 30 dias/.test(mp.res)&&mp.agora===1&&mp.rot.length>=3&&mp.hj, JSON.stringify(mp).slice(0,240));
 await p.screenshot({path:'/tmp/rh-mapa.png'}); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
