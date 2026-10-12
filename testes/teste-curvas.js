const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const h=new Date(); const cp=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); const ago=m=>new Date(Date.now()-m*60000).toISOString();
 D['pcpbase/prev']={mes:{[cp]:{'AC3001':40000,'AC3009':30000}}};
 D['pcpbase/itens']={l:{'AC3001':{d:'ARGAMASSA AC3 20KG',ln:['Linha 1']},'AC3009':{d:'ARGAMASSA AC3 FLEX 20KG',ln:['Linha 2']}}};
 D['itens/AC3009']={codigo:'AC3009',kgCimento:5,linhas:['Linha 2']}; D['itens/AC3001'].linhas=['Linha 1'];
 D['ordens/5001'].produto='AC3001 - ARGAMASSA AC3 20KG'; D['ordens/5002'].produto='AC3009 - ARGAMASSA AC3 FLEX 20KG';
 for(let i=0;i<10;i++){ D['entregas/a'+i]={ordem:'5001',num:'5001',linha:'Linha 1',qtd:900,em:ago(60*24*i+30),por:'x'}; D['entregas/b'+i]={ordem:'5002',num:'5002',linha:'Linha 2',qtd:700,em:ago(60*24*i+40),por:'x'}; }
 d.users['tvfabrica@painel-colafix.app']={uid:'uTVF',pass:'tv1234',nome:'TV'}; D['perfis/uTVF']={nome:'TV',usuario:'tvfabrica'}; D['acessos/uTVF']={perfil:'tvtodas',mods:['tv','telas','cal','analise','producao','silos','manut'],locais:[],ativo:true};
 const B=await H.abrir({viewport:{width:1920,height:1080}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tvfabrica','tv1234'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('anlrit')); await H.dorme(800);
 const n=await p.evaluate(()=>({svg:!!document.querySelector('svg.rit-cv'),t:(document.querySelector('.rit-cvn')||{}).innerText||''}));
 ok('Curva S aparece na tela Previsto × Realizado', n.svg, 'mostrando: '+n.t);
 await p.evaluate(()=>__T.go('tvapres')); await H.dorme(300); await p.click('[data-act="apr-abre"][data-v="ritmo"]'); await H.dorme(900);
 const a=await p.evaluate(()=>({svg:!!document.querySelector('svg.rit-cv'),t:(document.querySelector('.rit-cvn')||{}).innerText||'',v:__T.S().view}));
 const ta=[a.t]; for(let i=0;i<3;i++){ await H.dorme(10500); ta.push(await p.evaluate(()=>(document.querySelector('.rit-cvn')||{}).innerText||'')); }
 ok('Na TV em tela cheia: aparece e troca sozinha a cada 10 s', a.svg&&new Set(ta).size>1, ta.join(' → '));
 await p.keyboard.press('Escape'); await H.dorme(500);
 await p.evaluate(()=>{ const S=__T.S(); S.split.lay='2'; S.split.slots=['ritmo','tvfab']; __T.go('tvsplit'); }); await H.dorme(900);
 const ts=[await p.evaluate(()=>{ const x=document.querySelector('.sp .rit-cvn'); return (!!document.querySelector('.sp svg.rit-cv'))+':'+(x?x.innerText:''); })];
 for(let i=0;i<3;i++){ await H.dorme(10500); ts.push(await p.evaluate(()=>{ const x=document.querySelector('.sp .rit-cvn'); return (!!document.querySelector('.sp svg.rit-cv'))+':'+(x?x.innerText:''); })); }
 await p.screenshot({path:'/tmp/curva-split.png'});
 ok('Na tela dividida: aparece e troca sozinha a cada 10 s', ts.every(x=>x.startsWith('true'))&&ts.every((x,i)=>i===0||x!==ts[i-1]), ts.join(' → '));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
