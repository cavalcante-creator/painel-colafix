/* Fase 3 das TVs: recados no rodapé, tempo por tela, rodízio inteligente, horário do calendário e Previsão mensal na TV. */
const run=require('./tv-cenario-8linhas'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{
 await run({width:1920,height:1080},'/tmp/f3.png',async p=>{ const dorme=ms=>new Promise(x=>setTimeout(x,ms));
  await p.keyboard.press('Escape'); await dorme(500); await p.evaluate(()=>__T.go('tvapres')); await dorme(600);
  ok('Telas de TV mostra a configuração nova (rodízio, tempo por tela, calendário, e onde publicar os avisos)', await p.evaluate(()=>!!document.querySelector('#tvn-cfg [data-act="tvn-inteli"]')&&!!document.querySelector('[data-tvn-vira]')&&/Avisos nas TVs/i.test(document.getElementById('tvn-cfg').innerText)&&!!document.querySelector('[data-act="av-novo"]')));
  await p.selectOption('[data-tvn-vira]','14'); await dorme(800);
  await p.evaluate(()=>{ __T.S().avTV=[{id:'x',t:'Reunião de segurança às 15:00',tipo:'seg'}]; }); const cfg=await p.evaluate(()=>({r:(__T.S().avTV||[]).map(x=>x.t),v:__T.S().cfg.tvVira}));
  ok('Aviso disponível e horário do calendário salvo na configuração', cfg.r[0]==='Reunião de segurança às 15:00'&&cfg.v===14, JSON.stringify(cfg));
  await p.click('[data-act="apr-abre"][data-v="tvfab"]'); await dorme(1500);
  ok('Recado aparece no rodapé da TV', await p.evaluate(()=>/Reunião de segurança/.test((document.querySelector('.tva')||{}).innerText||'')));
  await p.keyboard.press('Escape'); await dorme(600); await p.evaluate(()=>__T.go('tvapres')); await dorme(600);
  await p.selectOption('[data-tvn-seg="ritmo"]','5'); await dorme(300);
  ok('Tempo por tela guardado no aparelho', await p.evaluate(()=>JSON.parse(localStorage.getItem('colafix.aprSegs')||'{}').ritmo===5));
  // rodízio inteligente: Produção está crítica (parada aberta na Linha 2)
  await p.click('[data-act="apr-ini"]'); await dorme(1500);
  const passo=async()=>p.evaluate(()=>{ const A=__T.S().apres; return {k:A.lista[A.i].k,seg:A.seg}; });
  const sq=[await passo()]; for(let i=0;i<4;i++){ await p.keyboard.press('ArrowRight'); await dorme(900); sq.push(await passo()); }
  const ks=sq.map(x=>x.k+':'+x.seg).join(' → ');
  ok('Rodízio inteligente: as telas críticas (Produção com linha parada, Silos críticos) revezam intercaladas e com o dobro do tempo', sq[0].k==='tvfab'&&sq[1].k==='silos'&&sq[1].seg===60&&sq[2].k==='ritmo'&&sq[3].k==='tvfab'&&sq[3].seg===60&&!['tvfab','silos'].includes(sq[4].k), ks);
  ok('Tempo por tela: Previsto × Realizado com 5 s', sq[2].seg===5, ks);
  await p.keyboard.press('Escape'); await dorme(700); await p.evaluate(()=>__T.go('tvapres')); await dorme(500);
  await p.click('[data-act="apr-abre"][data-v="prevmes"]'); await dorme(1800);
  const pv=await p.evaluate(()=>({v:__T.S().view,n:document.querySelectorAll('.tvn-pr2:not(.th)').length,h:document.documentElement.scrollHeight,vh:innerHeight,t:(document.querySelector('.tvn-tt h1')||{}).innerText}));
  ok('Previsão mensal por item na TV: itens do mês, cabendo na tela', pv.v==='tvnprev'&&pv.n>0&&pv.h<=pv.vh+1, JSON.stringify(pv));
  await p.screenshot({path:'/tmp/tv-prev.png'});
 },{user:'iasmyn',pass:'senha123',seed:D=>{ D['paradas/px']={linha:'Linha 2',motivo:'falta de cimento',inicio:new Date(Date.now()-20*60000).toISOString()}; }}).catch(e=>console.log('ERRO',e.message));
 console.log(res.filter(r=>!r.ok).length?'':'ok'); process.exit(0); })();
