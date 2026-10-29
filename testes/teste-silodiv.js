/* Receber no silo: dividir a nota "Em toneladas" e "Completar o menor" (pedido de 28/10). */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const t=new Date().toISOString();
 d.docs['silos/c1']={saldoKg:20000,atualizadoEm:t,origem:'medicao'}; d.docs['silos/c2']={saldoKg:10000,atualizadoEm:t,origem:'medicao'};
 const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const kg=async s=>((await srv())['silos/'+s]||{}).saldoKg;
 const abre=async()=>{ await p.evaluate(()=>__T.go('silorec')); await H.dorme(600); const nv=await p.$('[data-act="sr-novo"]'); if(nv){ await nv.click(); await H.dorme(300); }
   if(!(await p.$('[data-act="sr-silo"]'))){ await p.click('[data-act="sr-mat"][data-v="Cimento"]'); await H.dorme(250); }
   for(const id of await p.evaluate(()=>[...document.querySelectorAll('[data-act="sr-silo"][aria-pressed="true"]')].map(b=>b.dataset.v))){ await p.click(`[data-act="sr-silo"][data-v="${id}"]`); await H.dorme(150); }
   await p.click('[data-act="sr-silo"][data-v="c1"]'); await H.dorme(200); await p.click('[data-act="sr-silo"][data-v="c2"]'); await H.dorme(250); };
 await abre();
 const bts=await p.evaluate(()=>[...document.querySelectorAll('[data-act="sr-div"]')].map(b=>b.innerText.trim()).join(' | '));
 ok('Opções de divisão com "Em toneladas" e "Completar o menor"', /Em toneladas/.test(bts)&&/Completar o menor/.test(bts), bts);
 // completar o menor: Silo Pequeno (30 t) tem 20 t → cabe 10 t; o resto (20 t) vai para o Silo Grande
 await p.click('[data-act="sr-div"][data-v="encher"]'); await H.dorme(250);
 await p.fill('#sr-nf','111'); await p.fill('#sr-q','30'); await p.click('[data-act="sr-un"][data-v="t"]'); await H.dorme(300);
 const pre=await p.evaluate(()=>(document.querySelector('.srx-res')||{}).innerText||'');
 ok('Prévia: 10.000 kg no Silo Pequeno + 20.000 kg no Silo Grande', /10\.000 kg no Silo Pequeno/.test(pre)&&/20\.000 kg no Silo Grande/.test(pre), pre.replace(/\n/g,' | '));
 await p.click('[data-act="sr-ok"]'); await H.dorme(1300);
 ok('Gravou: Silo Pequeno cheio (30.000) e Silo Grande 30.000', await kg('c1')===30000&&await kg('c2')===30000, (await kg('c1'))+' / '+(await kg('c2')));
 // em toneladas: 4 t no Pequeno?? já está cheio — usa o Grande primeiro: escolhe c1 e c2, digita 5 t no c1, resto no c2
 await abre(); await p.click('[data-act="sr-div"][data-v="ton"]'); await H.dorme(250);
 await p.fill('[data-sr-ton="c1"]','5'); await p.fill('#sr-nf','222'); await p.fill('#sr-q','12'); await p.click('[data-act="sr-un"][data-v="t"]'); await H.dorme(300);
 const pre2=await p.evaluate(()=>(document.querySelector('.srx-res')||{}).innerText||'');
 ok('Em toneladas: 5 t no Pequeno e o resto (7 t) no Grande', /5\.000 kg no Silo Pequeno/.test(pre2)&&/7\.000 kg no Silo Grande/.test(pre2), pre2.replace(/\n/g,' | '));
 await p.fill('[data-sr-ton="c1"]','15'); await p.click('[data-act="sr-ok"]'); await H.dorme(800);
 ok('Toneladas acima da nota não gravam', await kg('c1')===30000, String(await kg('c1')));
 await p.fill('[data-sr-ton="c1"]','5'); await p.click('[data-act="sr-un"][data-v="t"]'); await H.dorme(200); await p.click('[data-act="sr-ok"]'); await H.dorme(1300);
 ok('Gravou: +5 t no Pequeno (35.000) e +7 t no Grande (37.000)', await kg('c1')===35000&&await kg('c2')===37000, (await kg('c1'))+' / '+(await kg('c2')));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x)));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
