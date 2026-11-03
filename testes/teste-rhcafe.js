/* RH · Folha do café (03/11): lista fixa em grupos (título em MAIÚSCULAS), "Não veio" no dia, impressão no modelo da planilha
   (título verde, Nome | Assinatura, grupos) com as marcas para a foto, e conferência pela foto comparando com o café do Face ID.
   Nomes inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const hj=(()=>{ const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })(), m=hj.slice(0,7), brH=hj.slice(8)+'/'+hj.slice(5,7)+'/'+hj.slice(0,4);
const DIR=fs.mkdtempSync('/tmp/rhcafe-');
const PRIM=['Ana','Bruno','Carla','Diego','Elaine','Fabio','Gilson','Helena','Igor','Joana','Kleber','Lara','Mauro','Nadia','Otavio','Paula','Quirino','Rita','Sergio','Tania'], SOB=['Alves','Borges','Costa','Dutra','Esteves','Farias','Gomes','Hora','Ilha','Jardim'];
const G1=PRIM.slice(0,6).map((p,i)=>p+' '+SOB[i]), G2=PRIM.slice(6,20).map((p,i)=>p+' '+SOB[i%10]), MOT=['Motorista - Ulisses','Motorista - Valter'], TER=PRIM.map((p,i)=>'Terceiro - '+p+' '+SOB[(i+3)%10]);
const TXT=['ADM / EXPEDIÇÃO',...G1,'PROD/ALMOX/MANUT',...G2,'MOTORISTAS',...MOT,'TERCEIRIZADOS',...TER].join('\n'), TOT=G1.length+G2.length+MOT.length+TER.length;
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  /* Face ID: Ana passou no refeitório de manhã (café) e não vai assinar; Bruno veio sem passar no café e vai assinar */
  D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ANA ALVES'},'22222222222':{n:'BRUNO BORGES'}},dias:{[hj]:{'11111111111':{p:1,c:'07:20',t:['07:10:00 Portaria','07:20:00 REFEITÓRIO']},'22222222222':{p:1,t:['07:12:00 Portaria']}}},imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:1100}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
  await p.evaluate(()=>__T.go('rhcafe')); await H.dorme(1000);
  ok('Folha do café sem lista: pede para montar a lista', /Ainda não tem a lista do café/.test(await p.evaluate(()=>document.getElementById('view').innerText)));
  await p.click('#view [data-act="cf-ed"]'); await H.dorme(300); await p.fill('#cf-ta',TXT); await H.dorme(200);
  const cont=await p.evaluate(()=>document.getElementById('cf-edn').innerText);
  await p.click('[data-act="cf-eds"]'); await H.dorme(800);
  const cfg=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/config'].cafe);
  ok('Lista: MAIÚSCULAS viram grupos; salva em rh/config.cafe.linhas', cont==='4 grupos · '+TOT+' nomes'&&cfg&&cfg.linhas.length===TOT+4, cont+' · '+(cfg&&cfg.linhas.length));
  await p.click(`[data-cf-nv="${G2[2]}"]`); await H.dorme(600);
  const nv=await p.evaluate(x=>__T.S().db.doc('rh/dados/cafefolha/'+x).get().then(g=>g.exists?g.data().nv:null),hj);
  ok('"Não veio" fica guardado no dia', nv&&nv[G2[2]]==='Não veio', JSON.stringify(nv));
  ok('Antes de imprimir: a foto pede para imprimir pelo painel', /Imprima a folha por aqui primeiro/.test(await p.evaluate(()=>(document.querySelector('.cf-ff')||{}).innerText||'')));
  const pop=p.context().waitForEvent('page'); await p.click('[data-act="cf-imp"]'); const w=await pop; await w.waitForLoadState(); await H.dorme(400); const html=await w.content(); await w.close(); await H.dorme(800);
  const lay=await p.evaluate(h=>{ const div=document.createElement('div'); div.innerHTML=h.replace(/^[\s\S]*<body>|<\/body>[\s\S]*$/g,''); const pgs=[...div.querySelectorAll('.pg')];
    return {pgs:pgs.length,mk:div.querySelectorAll('.mk').length,tt:(div.querySelector('.c.tt')||{}).textContent,gr:[...div.querySelectorAll('.c.gr')].map(x=>x.textContent),hd:div.querySelectorAll('.c.hd').length,cz:[...div.querySelectorAll('.c.nm.cz')].map(x=>x.textContent),
      rows:pgs.map(pg=>[...pg.querySelectorAll('.c.nm:not(.th)')].map(c=>({n:c.textContent,top:parseFloat(c.style.top),cz:c.classList.contains('cz')})))}; },html);
  ok('Folha no modelo da planilha: título "CAFÉ - dia - N", Nome | Assinatura, os 4 grupos, "Não veio" em cinza', lay.tt==='CAFÉ - '+brH+' - '+(TOT-1)&&lay.gr.join('|')==='ADM / EXPEDIÇÃO|PROD/ALMOX/MANUT|MOTORISTAS|TERCEIRIZADOS'&&lay.hd===lay.pgs*2&&lay.cz.join()===G2[2], JSON.stringify({tt:lay.tt,gr:lay.gr,hd:lay.hd,cz:lay.cz}));
  ok('Sai com as marcas pretas e o código em cada página', lay.mk===lay.pgs*4&&lay.pgs===2&&/class="cd b"/.test(html), JSON.stringify({pgs:lay.pgs,mk:lay.mk}));
  if(process.env.SHOT){ await p.screenshot({path:'/tmp/sh/cafe-tela.png',fullPage:true}); const c9=await B.browser.newContext({viewport:{width:800,height:1131}}); const q9=await c9.newPage(); await q9.setContent(html); await H.dorme(300); await q9.screenshot({path:'/tmp/sh/cafe-folha.png'}); await c9.close(); }
  /* assinar algumas linhas e fotografar */
  const all=lay.rows.map((rs,pg)=>rs.map((r,i)=>Object.assign({pg},r))).flat().filter(r=>r.n);
  const alvo=new Set(['Bruno Borges',G1[3],G2[0],G2[8],MOT[1],TER[2],TER[15]]);
  const ctx2=await B.browser.newContext({viewport:{width:900,height:1200},deviceScaleFactor:2}); const q=await ctx2.newPage(); await q.setContent(html); await H.dorme(300);
  await q.evaluate(([alvo,rows])=>{ const pgs=[...document.querySelectorAll('.pg')]; let k=0;
    rows.forEach(r=>{ if(!alvo.includes(r.n)) return; const pg=pgs[r.pg], x0=96+((k*7)%30), len=24+((k*13)%30), y=r.top; k++;
      let dp='M'+x0+' '+(y+3.6); for(let t=1;t<=12;t++){ const x=x0+len*t/12, yy=y+1.2+((t*37+k*11)%30)/10; dp+=' Q'+(x-1.2)+' '+(y+(t%2?0.9:4.6))+' '+x+' '+yy; }
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 210 297'); svg.style.cssText='position:absolute;left:0;top:0;width:210mm;height:297mm';
      const pa=document.createElementNS('http://www.w3.org/2000/svg','path'); pa.setAttribute('d',dp); pa.setAttribute('fill','none'); pa.setAttribute('stroke','#1b2a6b'); pa.setAttribute('stroke-width','0.35'); svg.appendChild(pa); pg.appendChild(svg); }); },[[...alvo],all]);
  const shots=[]; for(let i=0;i<2;i++){ const el=(await q.$$('.pg'))[i]; shots.push((await el.screenshot({type:'png'})).toString('base64')); } await ctx2.close();
  const foto=async(b64,tr,nome)=>{ const c3=await B.browser.newContext({viewport:{width:1500,height:2000}}); const r=await c3.newPage();
    await r.setContent(`<body style="margin:0;background:#6b5b4a;overflow:hidden"><div style="position:absolute;left:150px;top:120px;width:1200px;transform:${tr};filter:blur(.6px) brightness(.94)"><img src="data:image/png;base64,${b64}" style="width:1200px;display:block"></div></body>`);
    await H.dorme(300); const f=DIR+'/'+nome; fs.writeFileSync(f,await r.screenshot({type:'jpeg',quality:82})); await c3.close(); return f; };
  const f1=await foto(shots[0],'perspective(2400px) rotateX(8deg) rotateZ(-3deg) scale(.92)','cafe1.jpg'), f2=await foto(shots[1],'rotateZ(179deg) scale(.9)','cafe2.jpg');
  await p.setInputFiles('.cf-ff [data-cf-foto]',[f1,f2]);
  for(let i=0;i<60;i++){ await H.dorme(400); if(await p.evaluate(()=>{ const t=(document.querySelector('.cf-ff')||{}).innerText||''; return /assinaram/.test(t)&&!/Lendo/.test(t); })) break; }
  const st=await p.evaluate(()=>{ const C=window.RHCafe._C, R=C.ff[C.dia]; const o={}; Object.values(R.res).forEach(r=>r.linhas.forEach(l=>o[l.nome]=l.s)); return {o,erros:R.erros,pgs:Object.keys(R.res)}; });
  const sim=Object.keys(st.o).filter(n=>st.o[n]==='sim'), fp=sim.filter(n=>!alvo.has(n)), fn=[...alvo].filter(n=>st.o[n]!=='sim');
  ok('Lê as duas fotos (uma torta, outra de cabeça para baixo) e acha exatamente quem assinou ('+alvo.size+')', st.pgs.length===2&&!st.erros.length&&!fp.length&&!fn.length, JSON.stringify({pgs:st.pgs,erros:st.erros,fp,fn}));
  const txt=await p.evaluate(()=>(document.querySelector('.cf-ff')||{}).innerText.replace(/\s+/g,' '));
  ok('Compara com o café do Face ID: Bruno assinou sem passar no refeitório; Ana passou e a linha está em branco', /Assinaram, mas não passaram no refeitório de manhã · 1 .*Bruno Borges/.test(txt)&&/Passaram no refeitório de manhã, mas a linha está em branco · 1 .*Ana Alves/.test(txt), txt.slice(200,900));
  await p.click('[data-act="cf-ffsalva"]'); let fo=null; for(let i=0;i<30&&!fo;i++){ await H.dorme(300); fo=await p.evaluate(x=>__T.S().db.doc('rh/dados/cafefolha/'+x).get().then(g=>g.data().foto||null),hj); }
  ok('"Guardar conferência" grava quem assinou e as fotos', fo&&fo.n.sim===alvo.size&&fo.fotos.filter(Boolean).length===2, JSON.stringify(fo&&{n:fo.n,fotos:fo.fotos.length}));
  /* a foto do café na tela do almoço é recusada */
  await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(600); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; a.folhaAb=true; },hj); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1200);
  const pop2=p.context().waitForEvent('page'); await p.click('[data-act="alm-folha"]'); const w2=await pop2; await w2.waitForLoadState(); await w2.close(); await H.dorme(800);
  await p.setInputFiles('.alm-ff [data-alm-ffoto]',[f1]); for(let i=0;i<40;i++){ await H.dorme(400); if(await p.evaluate(()=>/folha do café/.test((document.querySelector('.alm-ff')||{}).innerText||''))) break; }
  ok('Foto da folha do café mandada no Almoço: avisa que é a folha do café', await p.evaluate(()=>/folha do café/.test((document.querySelector('.alm-ff')||{}).innerText||'')));
  console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
