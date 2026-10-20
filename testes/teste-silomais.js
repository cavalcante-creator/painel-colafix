/* Silos: linha com 2 silos (%), comparação medição manual × automático, recebimento pela nota, desfazer em vários silos. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=H.seed(); d.docs['itens/AC3001'].kgAreia=14;
 const {browser,page:p}=await H.abrir({viewport:{width:1440,height:1000}}); await H.preparar(p,d); p.on('dialog',x=>x.accept()); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const kg=async s=>((await srv())['silos/'+s]||{}).saldoKg;
 const ir=async sid=>{ await p.evaluate(sid=>{ __T.S().siloSel=sid; __T.go('silos'); },sid); await H.dorme(700); };
 const medir=async(sid,v,viaQuadro)=>{ await ir(sid); if(viaQuadro) await p.click(`[data-act="sa-medir"][data-sa-sel="${sid}"]`); else await p.click('[data-act="sm-abrir"]'); await H.dorme(300); await p.fill('#sm-kg',String(v)); await p.click('[data-act="sm-salvar"]'); await H.dorme(900); };
 await ir('c2');
 const linhas=await p.evaluate(()=>[...new Set([...document.querySelectorAll('[data-act="smf-nao"]')].map(b=>b.dataset.l))]);
 for(const l of linhas){ if(l==='Linha 1') continue; for(const m of ['cim','are']){ const on=await p.evaluate(([m,l])=>{ const b=document.querySelector(`[data-act="smf-nao"][data-m="${m}"][data-l="${l}"]`); return b&&b.getAttribute('aria-pressed')==='true'; },[m,l]); if(!on){ await p.click(`[data-act="smf-nao"][data-m="${m}"][data-l="${l}"]`); await H.dorme(150); } } }
 await p.click('[data-act="smf-tg"][data-m="cim"][data-l="Linha 1"][data-sid="c1"]'); await H.dorme(150); await p.click('[data-act="smf-tg"][data-m="cim"][data-l="Linha 1"][data-sid="c2"]'); await H.dorme(150);
 await p.click('[data-act="smf-tg"][data-m="are"][data-l="Linha 1"][data-sid="a1"]'); await H.dorme(150); await p.click('[data-act="smf-ok"]'); await H.dorme(800);
 const g=(await srv())['config/geral'];
 ok('Editor: Linha 1 com cimento de 2 silos (50/50) e areia do Silo Verde', Array.isArray(g.siloConsumo['Linha 1'])&&g.siloConsumo['Linha 1'].length===2&&g.siloConsumo['Linha 1'].every(x=>x.pct===50)&&g.siloConsumoAreia['Linha 1']==='a1', JSON.stringify({c:g.siloConsumo['Linha 1'],a:g.siloConsumoAreia['Linha 1']}));
 await medir('c1',5000,true); await medir('c2',10000,true); await medir('a1',30000,true);
 ok('Saldos de partida: 5.000 / 10.000 / 30.000', await kg('c1')===5000&&await kg('c2')===10000&&await kg('a1')===30000, [await kg('c1'),await kg('c2'),await kg('a1')].join(' / '));
 await p.evaluate(()=>__T.salvar('entregas',{ordem:'5001',num:'5001',linha:'Linha 1',em:new Date().toISOString(),por:__T.S().uid,qtd:100})); await H.dorme(2200);
 ok('Apontar 100 sacos: cimento dividido 250 + 250 (4.750 / 9.750) e areia −1.400 (28.600)', await kg('c1')===4750&&await kg('c2')===9750&&await kg('a1')===28600, [await kg('c1'),await kg('c2'),await kg('a1')].join(' / '));
 await medir('c2',9600,false);
 const cmp=await p.evaluate(()=>(document.querySelector('.smc')||{}).innerText||'');
 ok('Comparação: medição manual de 9.600 NÃO muda o automático (9.750) e mostra a diferença (−150 kg)', await kg('c2')===9750&&/9\.600 kg/.test(cmp)&&/−150 kg/.test(cmp), cmp.replace(/\n/g,' | ').slice(0,220));
 await p.click('[data-act="smc-usar"]'); await H.dorme(1000);
 ok('"Usar a medição como saldo" ajusta o automático para 9.600', await kg('c2')===9600, String(await kg('c2')));
 await p.evaluate(()=>__T.go('silorec')); await H.dorme(700); await p.click('[data-act="sr-mat"][data-v="Cimento"]'); await H.dorme(200); await p.click('[data-act="sr-silo"][data-v="c1"]'); await H.dorme(300);
 await p.fill('#sr-nf','12345'); await p.fill('#sr-q','30'); await p.click('[data-act="sr-ok"]'); await H.dorme(1200);
 const okt=await p.evaluate(()=>(document.querySelector('.srx-ok')||{}).innerText||''); const mv=Object.values(await srv()).find(x=>x&&x.tipo==='entrada');
 ok('Receber no silo: NF 12345, 30 t no Silo Pequeno → 34.750 kg, com a nota no histórico', await kg('c1')===34750&&mv&&mv.nf==='12345'&&mv.deltaKg===30000&&/Recebido/.test(okt), okt.replace(/\n/g,' | ')+' · '+(await kg('c1')));
 const ent=await p.evaluate(()=>{ const ds=JSON.parse(localStorage.getItem('__srv')).docs; return Object.keys(ds).filter(k=>k.startsWith('entregas/')&&ds[k].qtd===100).map(k=>k.slice(9))[0]; });
 await p.evaluate(id=>__T.salvar('entregas',{ordem:'5001',num:'5001',anula:id,em:new Date().toISOString(),por:__T.S().uid,qtd:0}),ent); await H.dorme(2200);
 ok('Desfazer: devolve 250 ao Silo Pequeno (35.000), mantém o Grande ajustado pela medição (9.600) e devolve a areia (30.000)', await kg('c1')===35000&&await kg('c2')===9600&&await kg('a1')===30000, [await kg('c1'),await kg('c2'),await kg('a1')].join(' / '));
 const rec=async(nf,t,sids,pct)=>{ await p.evaluate(()=>__T.go('silorec')); await H.dorme(500); const nv=await p.$('[data-act="sr-novo"]'); if(nv){ await nv.click(); await H.dorme(300); }
   if(!(await p.$('[data-act="sr-silo"]'))){ await p.click('[data-act="sr-mat"][data-v="Cimento"]'); await H.dorme(200); }
   for(const id of await p.evaluate(()=>[...document.querySelectorAll('[data-act="sr-silo"][aria-pressed="true"]')].map(b=>b.dataset.v))) { await p.click(`[data-act="sr-silo"][data-v="${id}"]`); await H.dorme(150); }
   for(const id of sids){ await p.click(`[data-act="sr-silo"][data-v="${id}"]`); await H.dorme(200); }
   if(pct){ await p.click('[data-act="sr-div"][data-v="outra"]'); await H.dorme(200); for(const [id,v] of Object.entries(pct)) await p.fill(`[data-sr-pct="${id}"]`,String(v)); }
   await p.fill('#sr-nf',nf); await p.fill('#sr-q',String(t)); await p.click('[data-act="sr-un"][data-v="t"]'); await H.dorme(250);
   const prev=await p.evaluate(()=>(document.querySelector('.srx-res')||{}).innerText||''); await p.click('[data-act="sr-ok"]'); await H.dorme(1200); return prev; };
 const a1=await kg('c1'), a2=await kg('c2');
 const pv=await rec('777',20,['c1','c2']);
 ok('Nota de 20 t "meio a meio": mostra 10.000 + 10.000 antes de registrar e sobe 10.000 kg em cada silo', /10\.000 kg no Silo Pequeno/.test(pv)&&/10\.000 kg no Silo Grande/.test(pv)&&await kg('c1')===a1+10000&&await kg('c2')===a2+10000, pv.replace(/\n/g,' ')+' · '+(await kg('c1'))+' / '+(await kg('c2')));
 const b1=await kg('c1'), b2=await kg('c2');
 await rec('778',10,['c1','c2'],{c1:70,c2:30});
 ok('Nota de 10 t "outra divisão" 70/30: +7.000 e +3.000', await kg('c1')===b1+7000&&await kg('c2')===b2+3000, (await kg('c1')-b1)+' / '+(await kg('c2')-b2));
 const gr=Object.values(await srv()).filter(x=>x&&x.tipo==='entrada'&&x.nf==='777');
 ok('A mesma nota fica ligada aos dois silos no histórico (mesmo grupo)', gr.length===2&&gr[0].grupo===gr[1].grupo&&gr.every(x=>x.totalKg===20000), JSON.stringify(gr.map(x=>[x.silo,x.deltaKg,x.grupo])));
 await browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
