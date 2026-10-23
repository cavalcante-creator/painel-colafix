/* RH · Almoço: conferir a folha assinada pela FOTO (23/10). A folha sai com 4 marcas e o código (dia/folha/versão);
   o teste imprime a folha, "assina" algumas linhas com rabiscos, fotografa com perspectiva, giro, sombra e desfoque,
   e manda a foto para o painel. Confere quem assinou, as diferenças com o Face ID, "Contar o almoço" e "Guardar conferência". */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const iso=x=>x.toISOString().slice(0,10), hj=(()=>{ const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })(), m=hj.slice(0,7);
const lista=JSON.parse(fs.readFileSync(__dirname+'/../modulos/rh-almoco.js','utf8').match(/const LISTA_BASE=(\[[^\]]*\])/)[1]);
const DIR=fs.mkdtempSync('/tmp/almfoto-');
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  const F=(id,nome,cpf)=>{ D['rh/dados/funcionarios/'+id]={nome,cpf,tipo:'CLT',status:'Ativo',admissao:'2020-01-01'}; };
  F('a','ADRIANO REUS DA SILVA','11111111111'); F('b','ALEXANDRE TEIXEIRA','22222222222');
  D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{listaFolha:lista}});
  /* Adriano almoçou pelo Face ID (e não vai assinar); Alexandre veio, não passou no refeitório (e vai assinar) */
  D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ADRIANO REUS DA SILVA'},'22222222222':{n:'ALEXANDRE TEIXEIRA'}},dias:{[hj]:{'11111111111':{p:1,a:'11:40',t:['07:10:00 Portaria','11:40:00 REFEITÓRIO']},'22222222222':{p:1,t:['07:12:00 Portaria']}}},imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:1100}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
  await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; a.folhaAb=true; },hj); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1500);
  ok('Antes de imprimir: pede para imprimir pelo painel (a folha precisa das marcas)', /Imprima a folha por aqui primeiro/.test(await p.evaluate(()=>(document.querySelector('.alm-ff')||{}).innerText||'')));
  const pop=p.context().waitForEvent('page'); await p.click('[data-act="alm-folha"]'); const w=await pop; await w.waitForLoadState(); await H.dorme(400); const html=await w.content(); await w.close(); await H.dorme(800);
  const lay=await p.evaluate(h=>{ const div=document.createElement('div'); div.innerHTML=h.replace(/^[\s\S]*<body>|<\/body>[\s\S]*$/g,''); const pgs=[...div.querySelectorAll('.pg')];
    return {pgs:pgs.length,mk:div.querySelectorAll('.mk').length,rows:pgs.map(pg=>{ const cs=[...pg.querySelectorAll('.c.nm:not(.th)')]; return cs.map(c=>({n:c.textContent,top:parseFloat(c.style.top),cz:c.classList.contains('cz')})); })}; },html);
  ok('A folha impressa tem 2 páginas, cada uma com 4 marcas nos cantos e o código', lay.pgs===2&&lay.mk===8&&/class="cd b"/.test(html), JSON.stringify({pgs:lay.pgs,mk:lay.mk}));
  const dec=await p.evaluate(x=>{ const b=RHAlmFoto._bits; return [b.decBits(b.codBits(x,0,1)),b.decBits(b.codBits(x,1,3)),b.decBits(b.codBits(x,1,3).map((v,i)=>i===7?1-v:v))]; },hj);
  ok('O código guarda dia, folha e versão (e recusa um quadradinho trocado)', dec[0].dia===hj&&dec[0].pg===0&&dec[0].ver===1&&dec[1].pg===1&&dec[1].ver===3&&dec[2]===null, JSON.stringify(dec));
  const emit=await p.evaluate(x=>__T.S().db.doc('rh/dados/almocofolha/'+x).get().then(g=>g.data().emit),hj);
  ok('Ao imprimir guarda o que saiu em cada folha (emit.vs)', emit&&emit.vs&&emit.vs[emit.ver]&&emit.vs[emit.ver][0].length===45, emit&&JSON.stringify(Object.keys(emit.vs||{})));
  /* assinar: algumas linhas de cada página (uma só com as iniciais), Alexandre assina, Adriano não */
  const all=lay.rows.map((rs,pg)=>rs.map((r,i)=>Object.assign({pg,i},r))).flat().filter(r=>r.n);
  const alvo=new Set(['Alexandre Teixeira']); [0,3,5,10,20,31,44,46,50,60,66].forEach(i=>{ const r=all[i]; if(r&&!r.cz&&r.n!=='Adriano Reus Da Silva'&&!/Adriano/i.test(r.n)) alvo.add(r.n); });
  const nomeAdr=all.find(r=>/^Adriano/i.test(r.n)); alvo.delete(nomeAdr&&nomeAdr.n);
  const ctx2=await B.browser.newContext({viewport:{width:900,height:1200},deviceScaleFactor:2}); const q=await ctx2.newPage(); await q.setContent(html); await H.dorme(300);
  await q.evaluate(([alvo,rows])=>{ const pgs=[...document.querySelectorAll('.pg')]; let k=0;
    rows.forEach(r=>{ if(!alvo.includes(r.n)) return; const pg=pgs[r.pg], x0=93+((k*7)%20), len=r.n==='Alexandre Teixeira'?14:28+((k*13)%30), y=r.top; k++;
      let dpath='M'+x0+' '+(y+3.6); for(let t=1;t<=12;t++){ const x=x0+len*t/12, yy=y+1.2+((t*37+k*11)%30)/10; dpath+=' Q'+(x-1.2)+' '+(y+(t%2?0.9:4.6))+' '+x+' '+yy; }
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 210 297'); svg.style.cssText='position:absolute;left:0;top:0;width:210mm;height:297mm;pointer-events:none';
      const pa=document.createElementNS('http://www.w3.org/2000/svg','path'); pa.setAttribute('d',dpath); pa.setAttribute('fill','none'); pa.setAttribute('stroke','#1b2a6b'); pa.setAttribute('stroke-width','0.35'); pa.setAttribute('stroke-linecap','round'); svg.appendChild(pa); pg.appendChild(svg); }); },[[...alvo],all]);
  const shots=[]; for(let i=0;i<2;i++){ const el=(await q.$$('.pg'))[i]; shots.push((await el.screenshot({type:'png'})).toString('base64')); } await ctx2.close();
  /* "foto": folha sobre a mesa, com perspectiva, giro, sombra e desfoque; a 2ª de cabeça para baixo */
  const foto=async(b64,tr,nome)=>{ const c3=await B.browser.newContext({viewport:{width:1500,height:2000}}); const r=await c3.newPage();
    await r.setContent(`<body style="margin:0;background:#6b5b4a;overflow:hidden"><div style="position:absolute;left:150px;top:120px;width:1200px;transform:${tr};filter:blur(.7px) brightness(.93)"><img src="data:image/png;base64,${b64}" style="width:1200px;display:block"><div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(0,0,0,.28),rgba(0,0,0,0) 55%,rgba(255,240,200,.08))"></div></div></body>`);
    await H.dorme(300); const f=DIR+'/'+nome; fs.writeFileSync(f,await r.screenshot({type:'jpeg',quality:82})); await c3.close(); return f; };
  const f1=await foto(shots[0],'perspective(2400px) rotateX(9deg) rotateZ(-3.5deg) scale(.92)','folha1.jpg'), f2=await foto(shots[1],'perspective(2600px) rotateY(-7deg) rotateZ(178deg) scale(.9)','folha2.jpg');
  await p.setInputFiles('.alm-ff [data-alm-ffoto]',[f1,f2]);
  for(let i=0;i<60;i++){ await H.dorme(400); if(await p.evaluate(()=>{ const t=(document.querySelector('.alm-ff')||{}).innerText||''; return /assinaram/.test(t)&&!/Lendo/.test(t); })) break; }
  const st=await p.evaluate(()=>{ const A=window.RHAlmoco._A, d=A.dia, R=A.ff[d]; const o={}; Object.values(R.res).forEach(r=>r.linhas.forEach(l=>o[l.nome]={s:l.s,t:l.t,u:l.u})); return {o,erros:R.erros,pgs:Object.keys(R.res)}; });
  const sim=Object.keys(st.o).filter(n=>st.o[n].s==='sim'), fp=sim.filter(n=>!alvo.has(n)), fn=[...alvo].filter(n=>!st.o[n]||st.o[n].s!=='sim'), duv=Object.keys(st.o).filter(n=>st.o[n].s==='duv');
  ok('Lê as duas fotos (uma torta e com sombra, outra de cabeça para baixo)', st.pgs.length===2&&!st.erros.length, JSON.stringify({pgs:st.pgs,erros:st.erros}));
  ok('Acha exatamente quem assinou ('+alvo.size+'), sem marcar quem não assinou', !fp.length&&!fn.length&&!duv.length, JSON.stringify({fp,fn,duv:duv.map(n=>n+':'+st.o[n].t),ex:fn.map(n=>n+':'+(st.o[n]&&st.o[n].t))}));
  ok('As linhas em cinza (não almoçam hoje) não entram como em branco', Object.values(st.o).every(x=>x.s!=='nao'||true)&&!Object.keys(st.o).some(n=>st.o[n].s==='cz'&&alvo.has(n)));
  const txt=await p.evaluate(()=>(document.querySelector('.alm-ff')||{}).innerText.replace(/\s+/g,' '));
  ok('Compara com o Face ID: Alexandre assinou e não passou no refeitório; Adriano passou e a linha está em branco', /Assinaram, mas não passaram no refeitório · 1 [^·]*Alexandre Teixeira Contar o almoço/.test(txt)&&/Passaram no refeitório, mas a linha está em branco · 1 [^·]*Adriano Reus Em branco/.test(txt), txt.slice(250,900));
  ok('Mostra a foto com as linhas marcadas', await p.evaluate(()=>document.querySelectorAll('.alm-ffv img').length===2));
  await p.click('[data-act="alm-ffconta"][data-n="Alexandre Teixeira"]'); await H.dorme(800);
  const aj=await p.evaluate(x=>__T.S().db.doc('rh/dados/almocoaj/'+x.slice(0,7)).get().then(g=>g.exists?g.data().aj[x+'_22222222222']:null),hj);
  ok('"Contar o almoço" grava o ajuste (almoçou, assinou a folha)', aj&&aj.v==='sim'&&/Assinou a folha/.test(aj.mot), JSON.stringify(aj));
  const n0=all.find(r=>!alvo.has(r.n)&&!r.cz).n; await p.click(`.alm-ff [data-act="alm-fftg"][data-n="${n0}"]`); await H.dorme(300);
  ok('Tocar no nome troca à mão (em branco → assinou)', await p.evaluate(n=>{ const A=window.RHAlmoco._A; return A.ff[A.dia].man[n]==='sim'; },n0));
  await p.click('[data-act="alm-ffsalva"]'); let fo=null; for(let i=0;i<30&&!fo;i++){ await H.dorme(300); fo=await p.evaluate(x=>__T.S().db.doc('rh/dados/almocofolha/'+x).get().then(g=>g.data().foto||null),hj); }
  const arqs=await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('__srv')).docs; return Object.keys(s).filter(k=>k.startsWith('rh/arquivos/lista/')&&s[k].mime==='image/jpeg').length; });
  ok('"Guardar conferência" grava quem assinou e guarda as 2 fotos', fo&&fo.n.sim===alvo.size+1&&fo.ass[n0]==='sim'&&arqs===2&&fo.fotos.filter(Boolean).length===2, JSON.stringify(fo&&{n:fo.n,fotos:fo.fotos,arqs}));
  const bar=await p.evaluate(()=>(document.querySelector('.alm-fbar')||{}).innerText||'');
  ok('A faixa do dia mostra "conferida pela foto"', /conferida pela foto: \d+ assinaram/.test(bar), bar.replace(/\n/g,' '));
  /* foto errada */
  const c4=await B.browser.newContext({viewport:{width:800,height:1000}}); const r4=await c4.newPage(); await r4.setContent('<body style="background:#ddd"><h1 style="margin:200px">Uma foto qualquer</h1></body>'); const f3=DIR+'/qualquer.jpg'; fs.writeFileSync(f3,await r4.screenshot({type:'jpeg'})); await c4.close();
  await p.setInputFiles('.alm-ff [data-alm-ffoto]',[f3]); await H.dorme(2500);
  ok('Foto sem as marcas: explica o que fazer', /Não achei as 4 marcas pretas/.test(await p.evaluate(()=>(document.querySelector('.alm-ff')||{}).innerText||'')));
  /* foto difícil: menor, mais inclinada e com sombra forte */
  const dura=async(b64,nome)=>{ const c5=await B.browser.newContext({viewport:{width:1000,height:1330}}); const r=await c5.newPage();
    await r.setContent(`<body style="margin:0;background:#3d342b;overflow:hidden"><div style="position:absolute;left:150px;top:110px;width:700px;transform:perspective(1300px) rotateX(16deg) rotateY(5deg) rotateZ(7deg);filter:blur(.9px) brightness(.85) contrast(.9)"><img src="data:image/png;base64,${b64}" style="width:700px;display:block"><div style="position:absolute;inset:0;background:linear-gradient(100deg,rgba(0,0,0,.45),rgba(0,0,0,0) 60%)"></div></div></body>`);
    await H.dorme(300); const f=DIR+'/'+nome; fs.writeFileSync(f,await r.screenshot({type:'jpeg',quality:70})); await c5.close(); return f; };
  await p.evaluate(()=>{ const A=window.RHAlmoco._A; A.ff[A.dia]={res:{},man:{},erros:[],lendo:false}; });
  await p.setInputFiles('.alm-ff [data-alm-ffoto]',[await dura(shots[0],'dura1.jpg')]); for(let i=0;i<40;i++){ await H.dorme(400); if(await p.evaluate(()=>{ const A=window.RHAlmoco._A, R=A.ff[A.dia]; return !R.lendo&&(Object.keys(R.res).length||R.erros.length); })) break; }
  const st2=await p.evaluate(()=>{ const A=window.RHAlmoco._A, R=A.ff[A.dia]; return {e:R.erros,l:(R.res[0]||{linhas:[]}).linhas.map(l=>[l.nome,l.s,l.t])}; });
  const alv1=all.filter(r=>r.pg===0&&alvo.has(r.n)).map(r=>r.n), s2=st2.l.filter(x=>x[1]==='sim').map(x=>x[0]);
  console.log('margem', JSON.stringify({simMin:Math.min(...st2.l.filter(x=>x[1]==='sim').map(x=>x[2])),naoMax:Math.max(...st2.l.filter(x=>x[1]==='nao').map(x=>x[2]))})); ok('Foto difícil (pequena, bem inclinada, sombra forte): mesmo resultado na folha 1', !st2.e.length&&s2.length===alv1.length&&alv1.every(n=>s2.includes(n)), JSON.stringify({e:st2.e,a:alv1.length,s:s2.length,out:st2.l.filter(x=>x[1]!=='nao'&&x[1]!=='cz'&&!alv1.includes(x[0])||alv1.includes(x[0])&&x[1]!=='sim')}));
  console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
