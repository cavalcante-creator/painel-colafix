/* "A medição manual não está atualizando os níveis do silo" (26/10, js/09 + js/58). */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ const {d}=H.seed(); const fut=new Date(Date.now()+3*3600e3).toISOString(), ant=new Date(Date.now()-3600e3).toISOString();
 /* c1: medição gravada por um aparelho com o relógio 3 h adiantado; c2: normal */
 d.docs['silos/c1']={saldoKg:20000,medidoKg:20000,medidoEm:fut,atualizadoEm:fut,origem:'medicao'};
 d.docs['silos/c2']={saldoKg:30000,medidoKg:30000,medidoEm:ant,atualizadoEm:ant,origem:'medicao'};
 const erros=[]; const {browser,page:p}=await H.abrir({viewport:{width:1440,height:950}}); p.on('pageerror',e=>erros.push(e.message)); p.on('dialog',x=>x.accept());
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 const kg=async s=>(((await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs)))['silos/'+s]||{}).saldoKg;
 const nova=async v=>{ await p.evaluate(()=>__T.go('medicao')); await H.dorme(500); await p.evaluate(v=>{ const S=__T.S(); Object.assign(S.med.v,v); },v); await p.evaluate(()=>{ const b=document.getElementById('m-salvar'); b.disabled=false; b.click(); }); await H.dorme(1800); };
 const av=()=>p.evaluate(()=>{ const b=document.getElementById('mdn-av'); return b?b.innerText:''; });
 await nova({c1:'12',c2:'25'});
 ok('Nova medição atualiza o nível mesmo com medição "no futuro" de outro aparelho (c1 12.000)', await kg('c1')===12000, String(await kg('c1')));
 ok('… e o silo normal (c2 25.000)', await kg('c2')===25000, String(await kg('c2')));
 ok('Sem aviso de "não mudou"', !(await av()));
 /* modo comparar ligado: a medição só é anotada → aviso com botões */
 await p.evaluate(()=>__T.S().db.doc('config/geral').set({siloComparar:true},{merge:true})); await H.dorme(800);
 await nova({c2:'22'});
 let t=await av(); ok('Modo comparar: nível não muda e aparece o aviso explicando', await kg('c2')===25000&&/não mudou/.test(t)&&/comparar/.test(t)&&/Silo Grande/.test(t), t.replace(/\n/g,' | '));
 await p.click('#mdn-av [data-act="mdn-usar"]'); await H.dorme(1500);
 ok('"Usar a medição como nível agora" acerta (22.000) e o aviso some', await kg('c2')===22000&&!(await av()), String(await kg('c2')));
 await nova({c2:'21'}); await p.click('#mdn-av [data-act="mdn-comp"]'); await H.dorme(900);
 const cmp=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['config/geral'].siloComparar);
 ok('"Desligar o modo comparar" grava siloComparar=false', cmp===false, String(cmp));
 await p.click('#mdn-av [data-act="mdn-usar"]'); await H.dorme(1200);
 await nova({c2:'19,5'}); ok('Depois de desligar, a medição seguinte já acerta (19.500)', await kg('c2')===19500&&!(await av()), String(await kg('c2')));
 /* cota de leituras acabou: a transação falha com resource-exhausted, a medição tem de acertar o nível mesmo assim */
 await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('__ctl')||'{}'); c.txErro='resource-exhausted'; localStorage.setItem('__ctl',JSON.stringify(c)); });
 await nova({c1:'7,5'}); const tela=await p.evaluate(()=>({kg:__T.S().siloSaldo.c1.saldoKg,av:(document.getElementById('silo-aviso')||{}).innerText||''}));
 ok('Cota do Firebase (resource-exhausted): nível acerta sem transação (7.500 no banco e na tela) e sem o aviso de erro', await kg('c1')===7500&&tela.kg===7500&&!/não foi atualizado/.test(tela.av), JSON.stringify(tela)+' banco='+(await kg('c1')));
 const mv=await p.evaluate(()=>Object.entries(JSON.parse(localStorage.getItem('__srv')).docs).filter(([k,v])=>k.startsWith('silomov/m_')&&v.semTransacao).length);
 ok('Movimento da medição registrado no histórico (semTransacao)', mv===1, String(mv));
 await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('__ctl')||'{}'); delete c.txErro; localStorage.setItem('__ctl',JSON.stringify(c)); });
 /* medição com hora informada mais antiga que a última continua só no histórico, mas agora avisa */
 await p.evaluate(()=>__T.go('medicao')); await H.dorme(400);
 const temHora=await p.evaluate(()=>!!document.querySelector('[data-act="hm-toggle-med"],[data-hm="med"],#hm-med'));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
