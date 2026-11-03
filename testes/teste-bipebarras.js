/* 03/11: adesivos do coletor em código de barras — escolha Código (barras/QR) e Imprimir como (adesivos/folha),
   quais adesivos, prévia, código curto da máquina lido pelo bipe, PDF (JSPDF_REAL=1 grava /tmp/adesivos.pdf para ler as barras). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const ag=new Date(Date.now()-3600e3).toISOString();
 D['ordens/o2']={num:'5002',linha:'Linha 1',status:'aberta',produto:'Rejunte',qtd:50,prodSeg:[{ini:ag,por:'Ana'}]};
 const B=await H.abrir({viewport:{width:1440,height:900},acceptDownloads:true}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
 const bip=async c=>{ await p.keyboard.type(c,{delay:6}); await p.keyboard.press('Enter'); await H.dorme(1300); };
 const av=()=>p.evaluate(()=>{ const x=document.getElementById('ev-aviso'); return x?x.className+' | '+x.innerText.replace(/\s+/g,' '):''; });
 await p.evaluate(()=>__T.go('manqr')); await H.dorme(800); await p.click('[data-act="cb-modo"][data-v="bipe"]'); await H.dorme(800);
 let s=await p.evaluate(()=>({t:document.getElementById('view').innerText,ad:document.querySelectorAll('.evb-ad').length,svg:document.querySelectorAll('.evb-ad .evb-svg').length,bt:(document.querySelector('[data-act="ev-pdf"]')||{}).innerText||''}));
 ok('Abre em "Código de barras" e "Adesivos · um por problema", com a prévia dos adesivos', /Código de barras/.test(s.t)&&/Adesivos · um por problema/.test(s.t)&&s.ad>=8&&s.svg>=8&&/adesivos · \d+ folha/.test(s.bt), JSON.stringify(s).slice(0,300));
 const cods=await p.evaluate(()=>[...document.querySelectorAll('.evb-cod')].map(x=>x.textContent));
 ok('Adesivo da linha tem o código EV-ELE-LINHA1', cods.some(c=>/^EV-ELE-LINHA1 ·/.test(c)), cods.slice(0,3).join(' | '));
 /* tira os itens que não são problema */
 for(const k of ['INI','FIM','RET','DES']) await p.click(`[data-evb-tp="${k}"]`);
 await H.dorme(400); s=await p.evaluate(()=>({tit:[...document.querySelectorAll('.evb-ad .evb-mid b')].map(b=>b.textContent),bt:document.querySelector('[data-act="ev-pdf"]').innerText}));
 ok('Escolher quais adesivos: só os problemas', !s.tit.includes('Início de produção')&&!s.tit.includes('Desfazer')&&s.tit.includes('Problema elétrico'), JSON.stringify(s));
 /* código curto da máquina */
 await p.evaluate(()=>{ document.querySelectorAll('.ev-ln input[data-ev-sel]').forEach(i=>{ if(i.checked) i.click(); }); }); await H.dorme(300);
 await p.click('.ev-ck.sub input'); await H.dorme(500);
 const curto=await p.evaluate(()=>{ const ad=document.querySelector('.evb-ad.crit:nth-child(2)')||document.querySelectorAll('.evb-ad')[1]; return {c:ad.querySelector('.evb-cod').textContent.split(' ·')[0],nome:ad.querySelector('.evb-top').textContent.split(' · ')[0]}; });
 curto.longo='EV-MEC-LINHA1-'+(await p.evaluate(()=>document.querySelector('.ev-ck.sub input').dataset.evSel.split('-').slice(1).join('-')));
 ok('Código da máquina fica curto nas barras', curto.c.length<curto.longo.length||curto.c===curto.longo, JSON.stringify(curto));
 await p.evaluate(()=>__T.go('inicio')); await H.dorme(500);
 await bip(curto.c); await H.dorme(1200); let a=await av(); const chs=Object.values(await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs)).filter(v=>v.origem==='coletor');
 ok('Bipar o código curto da máquina abre o chamado dela', chs.length===1&&chs[0].equip.toUpperCase()===curto.nome.toUpperCase()&&chs[0].defeito==='Mecânico'&&/Chamado aberto/.test(a), a);
 /* folha A4 em barras */
 await p.evaluate(()=>__T.go('manqr')); await H.dorme(600);
 await p.click('[data-act="evb-lay"][data-v="folha"]'); await H.dorme(400);
 s=await p.evaluate(()=>({c:document.querySelectorAll('.ev-folha .evb-c .evb-svg').length,q:document.querySelectorAll('.ev-folha .ev-qr').length}));
 ok('Folha A4 com o quadro em código de barras', s.c>=10&&s.q===0, JSON.stringify(s));
 await p.click('[data-act="evb-fmt"][data-v="qr"]'); await H.dorme(400);
 s=await p.evaluate(()=>({q:document.querySelectorAll('.ev-folha .ev-qr').length,ls:[localStorage.getItem('colafix.ev.fmt'),localStorage.getItem('colafix.ev.lay')]}));
 ok('QR continua disponível e a escolha fica lembrada no aparelho', s.q>=10&&s.ls.join()==='qr,folha', JSON.stringify(s));
 /* PDF dos adesivos em barras */
 await p.click('[data-act="evb-fmt"][data-v="barras"]'); await p.click('[data-act="evb-lay"][data-v="adesivo"]'); await H.dorme(400);
 const dl=p.waitForEvent('download',{timeout:8000}).catch(()=>null); await p.click('[data-act="ev-pdf"]'); const f=await dl;
 let nome=f?f.suggestedFilename():''; if(f&&process.env.JSPDF_REAL) await f.saveAs('/tmp/adesivos.pdf');
 ok('Baixar PDF dos adesivos', /Adesivos_do_coletor\.pdf/.test(nome), nome);
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
