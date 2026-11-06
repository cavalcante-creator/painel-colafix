/* RH · Folha do café (03/11): o MESMO código da folha do almoço (rh-almoco.js, tipo 'cafe'): faixa em Almoço/café › Por dia,
   janela igual, lista fixa com o mesmo editor, conferência pelo Face ID, impressão no mesmo modelo (CAFÉ - dia - N) com as marcas
   (páginas 4–7 no código) e conferência pela foto comparando com o café do Face ID. Nomes inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const hj=(()=>{ const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })(), m=hj.slice(0,7), brH=hj.slice(8)+'/'+hj.slice(5,7)+'/'+hj.slice(0,4);
const ont=(()=>{ const n=new Date(hj+'T12:00:00'); n.setDate(n.getDate()-1); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })();
const DIR=fs.mkdtempSync('/tmp/rhcafe-');
const PRIM=['Ana','Bruno','Carla','Diego','Elaine','Fabio','Gilson','Helena','Igor','Joana','Kleber','Lara','Mauro','Nadia','Otavio','Paula','Quirino','Rita','Sergio','Tania'], SOB=['Alves','Borges','Costa','Dutra','Esteves','Farias','Gomes','Hora','Ilha','Jardim'];
const G1=PRIM.slice(0,6).map((p,i)=>p+' '+SOB[i]), G2=PRIM.slice(6,20).map((p,i)=>p+' '+SOB[i%10]), MOT=['Motorista - Ulisses','Motorista - Valter'], TER=PRIM.map((p,i)=>'Terceiro - '+p+' '+SOB[(i+3)%10]);
const NOMES=[...G1,...G2,...MOT,...TER], TOT=NOMES.length;
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  /* Face ID: Ana passou no refeitório de manhã (café); Bruno veio sem passar no café; Carla tem Face ID no mês mas não veio hoje */
  D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ANA ALVES'},'22222222222':{n:'BRUNO BORGES'},'33333333333':{n:'CARLA COSTA'}},dias:{[hj]:{'11111111111':{p:1,c:'07:20',t:['07:10:00 Portaria','07:20:00 REFEITÓRIO']},'22222222222':{p:1,t:['07:12:00 Portaria']}}},imp:[]};
  /* a lista antiga do café (com títulos de grupo em MAIÚSCULAS) vira a lista fixa sem os títulos */
  D['rh/config']=Object.assign(D['rh/config']||{},{cafe:{linhas:['ADM / EXPEDIÇÃO','Ana Alves','PROD/ALMOX/MANUT','Gilson Alves','MOTORISTAS','Motorista - Ulisses']}});
  const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
  const dia=async x=>{ await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; },x); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1000); };
  await dia(hj);
  const bars=await p.evaluate(()=>[...document.querySelectorAll('.alm-fbar>div>b')].map(b=>b.textContent));
  ok('Almoço/café › Por dia tem as duas faixas iguais: almoço e café', bars.length===2&&/almoço/.test(bars[0])&&/café/.test(bars[1]), JSON.stringify(bars));
  { const f=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); let px=new Date(hj+'T12:00:00'); do{ px.setDate(px.getDate()+1); }while([0,6].includes(px.getDay())); px=f(px); const brp=px.slice(8)+'/'+px.slice(5,7)+'/'+px.slice(0,4);
    const cb=await p.evaluate(()=>(document.querySelector('.cf-bar')||{}).innerText||'');
    ok('06/11: a faixa do café mostra a folha do PRÓXIMO DIA ÚTIL ('+brp+'), feita no dia anterior, com "Conferir a de hoje"', cb.includes('Folha do café para ')&&cb.includes(brp)&&/Conferir a de hoje/.test(cb), cb.replace(/\n/g,' | ').slice(0,160));
    await p.click('.cf-bar [data-act="alm-fabre"]'); await H.dorme(700);
    const popP=p.context().waitForEvent('page'); await p.click('.alm-fmr [data-act="alm-folha"]'); const wP=await popP; await wP.waitForLoadState(); await H.dorme(400); const htP=await wP.content(); await wP.close(); await H.dorme(600);
    const emP=await p.evaluate(x=>__T.S().db.doc('rh/dados/cafefolha/'+x).get().then(g=>g.exists&&!!(g.data().emit)),px);
    ok('A folha de '+brp+' imprime com "CAFÉ - '+brp+'" e fica guardada no dia dela (cafefolha/'+px+')', htP.includes('CAFÉ - '+brp)&&emP, String(emP));
    await p.click('.alm-fm [data-act="alm-ffecha"]'); await H.dorme(400);
    await p.click('.cf-bar [data-act="alm-cafedia"][data-v="hoje"]'); await H.dorme(500);
    ok('"Conferir a de hoje" volta para a folha do dia (conferência), com "Preparar a de …"', /Folha do café de hoje/.test(await p.evaluate(()=>(document.querySelector('.cf-bar')||{}).innerText||''))); }
  await p.click('.cf-bar [data-act="alm-fabre"]'); await H.dorme(700);
  ok('Abre a mesma janela do almoço, agora do café', await p.evaluate(()=>{ const m=document.querySelector('.alm-fm'); return !!m&&/café/.test(m.getAttribute('aria-label'))&&!!m.querySelector('.alm-fml .alm-folha')&&!!m.querySelector('.alm-fmr #alm-fmk'); }));
  ok('Lista antiga do café vem sem os títulos dos grupos', await p.evaluate(()=>/Lista fixa \(3\)/.test(document.querySelector('.alm-fm').innerText)));
  /* lista fixa com o mesmo editor do almoço */
  await p.click('.alm-fm [data-act="alm-flista"]'); await H.dorme(400);
  ok('Lista fixa do café usa o mesmo editor (acrescentar com tipo, colar do Excel, procurar no cadastro)', await p.evaluate(()=>!!document.querySelector('.alm-fm #alm-fltp')&&!!document.querySelector('.alm-fm [data-act="alm-fl-colar"]')&&!!document.querySelector('.alm-fm [data-act="alm-fl-vin"]')));
  await p.click('[data-act="alm-fl-colar"]'); await H.dorme(300); await p.fill('#alm-flt',NOMES.join('\n')); await p.click('[data-act="alm-fl-poe"]'); await H.dorme(300);
  await p.fill('#alm-fltp ~ #alm-flnovo','Wagner Teste').catch(()=>{}); await p.selectOption('#alm-fltp','Terceiro - '); await p.fill('#alm-flnovo','Wagner Teste'); await p.click('[data-act="alm-fl-add"]'); await H.dorme(300);
  await p.click('[data-act="alm-fl-x"][data-i="'+TOT+'"]'); await H.dorme(300);
  await p.click('[data-act="alm-flsalva"]'); await H.dorme(800);
  const cfg=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/config']);
  ok('Salva em rh/config.cafe.lista e não mexe na lista do almoço', cfg.cafe&&cfg.cafe.lista&&cfg.cafe.lista.length===TOT&&!((cfg.almoco||{}).listaFolha||[]).includes('Terceiro - Tania Costa'), (cfg.cafe&&cfg.cafe.lista||[]).length);
  await p.click('.alm-fm [data-act="alm-flista"]'); await H.dorme(400);
  const cf1=await p.evaluate(()=>document.querySelector('.alm-fm .alm-folha').innerText.replace(/\s+/g,' '));
  ok('Conferência pelo Face ID: Carla não passou (desmarcada)', /Na lista, mas não passaram no Face ID em \S+ \(1\) .*Carla Costa/.test(cf1)&&!(await p.evaluate(()=>document.querySelector('[data-alm-fnv="Carla Costa"]').checked)), cf1.slice(0,300));
  await p.click('[data-alm-fnv="Carla Costa"]'); await H.dorme(500);
  await p.fill('#alm-fbusca',G2[2].split(' ')[0]); await H.dorme(300); await p.click(`#alm-fres [data-act="alm-fnvset"][data-n="${G2[2]}"]`); await H.dorme(600);
  await p.fill('#alm-fbusca','Tania Costa'); await H.dorme(300); await p.click(`#alm-fres [data-act="alm-ftirar"][data-n="${TER[19]}"]`); await H.dorme(600);
  const cf2=await p.evaluate(()=>document.querySelector('.alm-fm .alm-folha').innerText.replace(/\s+/g,' '));
  ok('Busca: "Não veio" e "Tirar desta folha"', /Marcados por você \(1\)/.test(cf2)&&/Tirados da folha deste dia \(1\)/.test(cf2), cf2.slice(-400));
  const db=await p.evaluate(x=>Promise.all(['cafefolha','almocofolha'].map(c=>__T.S().db.doc('rh/dados/'+c+'/'+x).get().then(g=>g.exists?g.data():null))),hj);
  ok('Marcações do café ficam em rh/dados/cafefolha (o almoço não muda)', db[0]&&db[0].nv['Carla Costa']==='Não veio'&&db[0].nv[G2[2]]&&db[0].tirar[TER[19]]&&!(db[1]&&db[1].nv&&db[1].nv['Carla Costa']), JSON.stringify(db));
  ok('Prévia "Como vai sair" com o título CAFÉ', await p.evaluate(x=>document.querySelector('.alm-fmr th').textContent===x,'CAFÉ - '+brH+' - '+(TOT-3)));
  const pop=p.context().waitForEvent('page'); await p.click('.alm-fmr [data-act="alm-folha"]'); const w=await pop; await w.waitForLoadState(); await H.dorme(400); const html=await w.content(); await w.close(); await H.dorme(800);
  const lay=await p.evaluate(h=>{ const div=document.createElement('div'); div.innerHTML=h.replace(/^[\s\S]*<body>|<\/body>[\s\S]*$/g,''); const pgs=[...div.querySelectorAll('.pg')];
    return {pgs:pgs.length,mk:div.querySelectorAll('.mk').length,tt:[...div.querySelectorAll('.th.nm')].map(x=>x.textContent)[0],gr:div.querySelectorAll('.c.gr').length,cz:[...div.querySelectorAll('.c.nm.cz')].map(x=>x.textContent),
      rows:pgs.map(pg=>[...pg.querySelectorAll('.c.nm:not(.th)')].map(c=>({n:c.textContent,top:parseFloat(c.style.top),cz:c.classList.contains('cz')})))}; },html);
  ok('Folha impressa igual à do almoço: "CAFÉ - dia - N", Nome | Assinatura, sem grupos, marcados em cinza, tirado fora', lay.tt==='CAFÉ - '+brH+' - '+(TOT-3)&&!lay.gr&&lay.cz.join()==='Carla Costa,'+G2[2]&&!lay.rows.flat().some(r=>r.n===TER[19]), JSON.stringify({tt:lay.tt,gr:lay.gr,cz:lay.cz}));
  ok('Sai com as marcas pretas e o código em cada página', lay.mk===lay.pgs*4&&lay.pgs>=1&&/class="cd b"/.test(html), JSON.stringify({pgs:lay.pgs,mk:lay.mk}));
  if(process.env.SHOT){ fs.mkdirSync('/tmp/sh',{recursive:true}); await p.screenshot({path:'/tmp/sh/cafe-tela.png'}); const c9=await B.browser.newContext({viewport:{width:800,height:1131}}); const q9=await c9.newPage(); await q9.setContent(html); await H.dorme(300); await q9.screenshot({path:'/tmp/sh/cafe-folha.png'}); await c9.close(); }
  /* assinar algumas linhas e fotografar */
  const all=lay.rows.map((rs,pg)=>rs.map(r=>Object.assign({pg},r))).flat().filter(r=>r.n&&!r.cz);
  const alvo=new Set(['Bruno Borges',G1[3],G2[0],G2[8],MOT[1],TER[2],TER[15]]);
  const ctx2=await B.browser.newContext({viewport:{width:900,height:1200},deviceScaleFactor:2}); const q=await ctx2.newPage(); await q.setContent(html); await H.dorme(300);
  await q.evaluate(([alvo,rows])=>{ const pgs=[...document.querySelectorAll('.pg')]; let k=0;
    rows.forEach(r=>{ if(!alvo.includes(r.n)) return; const pg=pgs[r.pg], x0=96+((k*7)%30), len=24+((k*13)%30), y=r.top; k++;
      let dp='M'+x0+' '+(y+3.6); for(let t=1;t<=12;t++){ const x=x0+len*t/12, yy=y+1.2+((t*37+k*11)%30)/10; dp+=' Q'+(x-1.2)+' '+(y+(t%2?0.9:4.6))+' '+x+' '+yy; }
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 210 297'); svg.style.cssText='position:absolute;left:0;top:0;width:210mm;height:297mm';
      const pa=document.createElementNS('http://www.w3.org/2000/svg','path'); pa.setAttribute('d',dp); pa.setAttribute('fill','none'); pa.setAttribute('stroke','#1b2a6b'); pa.setAttribute('stroke-width','0.35'); svg.appendChild(pa); pg.appendChild(svg); }); },[[...alvo],all]);
  const shots=[]; for(let i=0;i<lay.pgs;i++){ const el=(await q.$$('.pg'))[i]; shots.push((await el.screenshot({type:'png'})).toString('base64')); } await ctx2.close();
  const foto=async(b64,tr,nome)=>{ const c3=await B.browser.newContext({viewport:{width:1500,height:2000}}); const r=await c3.newPage();
    await r.setContent(`<body style="margin:0;background:#6b5b4a;overflow:hidden"><div style="position:absolute;left:150px;top:120px;width:1200px;transform:${tr};filter:blur(.6px) brightness(.94)"><img src="data:image/png;base64,${b64}" style="width:1200px;display:block"></div></body>`);
    await H.dorme(300); const f=DIR+'/'+nome; fs.writeFileSync(f,await r.screenshot({type:'jpeg',quality:82})); await c3.close(); return f; };
  const fotos=[]; for(let i=0;i<shots.length;i++) fotos.push(await foto(shots[i],i%2?'rotateZ(179deg) scale(.9)':'perspective(2400px) rotateX(8deg) rotateZ(-3deg) scale(.92)','cafe'+i+'.jpg'));
  await p.setInputFiles('.alm-fm .alm-ff [data-alm-ffoto]',fotos);
  for(let i=0;i<60;i++){ await H.dorme(400); if(await p.evaluate(()=>{ const t=(document.querySelector('.alm-fm .alm-ff')||{}).innerText||''; return /assinaram/.test(t)&&!/Lendo/.test(t); })) break; }
  const st=await p.evaluate(x=>{ const R=window.RHAlmoco._A.ff[x]; const o={}; Object.values(R.res).forEach(r=>r.linhas.forEach(l=>o[l.nome]=l.s)); return {o,erros:R.erros,pgs:Object.keys(R.res),fk:window.RHAlmoco._fk()}; },hj);
  const sim=Object.keys(st.o).filter(n=>st.o[n]==='sim'), fp=sim.filter(n=>!alvo.has(n)), fn=[...alvo].filter(n=>st.o[n]!=='sim');
  ok('Lê as fotos da folha do café e acha exatamente quem assinou ('+alvo.size+')', st.fk==='cafe'&&st.pgs.length===lay.pgs&&!st.erros.length&&!fp.length&&!fn.length, JSON.stringify({fk:st.fk,pgs:st.pgs,erros:st.erros,fp,fn}));
  const txt=await p.evaluate(()=>document.querySelector('.alm-fm .alm-ff').innerText.replace(/\s+/g,' '));
  ok('Compara com o café do Face ID: Bruno assinou sem passar no refeitório; Ana passou e a linha está em branco', /Assinaram, mas não passaram no refeitório de manhã · 1 .*Bruno Borges/.test(txt)&&/Passaram no refeitório de manhã, mas a linha está em branco · 1 .*Ana Alves/.test(txt)&&!/Contar o almoço/.test(txt), txt.slice(0,600));
  await p.click('.alm-fm [data-act="alm-ffsalva"]'); let fo=null; for(let i=0;i<30&&!fo;i++){ await H.dorme(300); fo=await p.evaluate(x=>__T.S().db.doc('rh/dados/cafefolha/'+x).get().then(g=>g.data().foto||null),hj); }
  ok('"Guardar conferência" grava no dia do café', fo&&fo.n.sim===alvo.size&&fo.fotos.filter(Boolean).length===lay.pgs, JSON.stringify(fo&&{n:fo.n,fotos:fo.fotos.length}));
  await p.click('.alm-fm [data-act="alm-fnvx"][data-n="'+G2[2]+'"]'); await H.dorme(600);
  ok('Mudou depois de imprimir: avisa para imprimir de novo', /Marcação alterada depois de emitida/.test(await p.evaluate(()=>document.querySelector('.alm-fm').innerText)));
  /* a foto do café na folha do almoço é recusada */
  await p.click('.alm-fm [data-act="alm-ffecha"]'); await H.dorme(400);
  await p.click('.alm-fbar:not(.cf-bar) [data-act="alm-fabre"]'); await H.dorme(700);
  ok('Folha do almoço continua com a lista e o título do almoço', await p.evaluate(()=>/almoço/.test(document.querySelector('.alm-fm').getAttribute('aria-label'))&&/^ALMOÇO - /.test(document.querySelector('.alm-fmr th').textContent)));
  const pop2=p.context().waitForEvent('page'); await p.click('.alm-fmr [data-act="alm-folha"]'); const w2=await pop2; await w2.waitForLoadState(); await w2.close(); await H.dorme(800);
  await p.setInputFiles('.alm-fm .alm-ff [data-alm-ffoto]',[fotos[0]]); for(let i=0;i<40;i++){ await H.dorme(400); if(await p.evaluate(()=>/folha do café/.test((document.querySelector('.alm-fm .alm-ff')||{}).innerText||''))) break; }
  ok('Foto da folha do café mandada na folha do almoço: avisa que é a do café', await p.evaluate(()=>/folha do café/.test((document.querySelector('.alm-fm .alm-ff')||{}).innerText||'')));
  await p.click('.alm-fm [data-act="alm-ffecha"]'); await H.dorme(400);
  /* dia sem Face ID */
  await dia(ont); await p.click('.cf-bar [data-act="alm-fabre"]'); await H.dorme(700);
  const q1=await p.evaluate(()=>document.querySelector('.alm-fm .alm-folha').innerText.replace(/\s+/g,' '));
  await p.click('.alm-fm [data-act="alm-fsem"]'); await H.dorme(600); const q2=await p.evaluate(()=>document.querySelector('.alm-fm .alm-folha').innerText.replace(/\s+/g,' '));
  ok('Dia sem Face ID: pergunta se o CSV foi importado; "Emitir sem conferir" segue', /CSV do Face ID de .* já foi importado/.test(q1)&&!/já foi importado/.test(q2), q1.slice(0,160)+' || '+q2.slice(0,160));
  await p.evaluate(()=>__T.go('rhcafe')); await H.dorme(1200);
  ok('Link antigo "Folha do café" abre o Almoço/café', await p.evaluate(()=>!!document.querySelector('.cf-bar')));
  console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
