/* Telas de TV mais legíveis: encaixe sem cortar, letras maiores no Previsto × Realizado, rodízio com 5/10 s e começar sozinha. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
function base(){ const {d}=seedManut(); const D=d.docs; const h=new Date(); const cp=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); const ago=m=>new Date(Date.now()-m*60000).toISOString();
 const LS=['Linha 1','Linha 2','Linha 3','Área líquida','Rejunte M1','Rejunte M2','Rejunte M3','Fixcol']; const prev={}, il={};
 LS.forEach((l,i)=>{ const c='IT'+(100+i); prev[c]=[40000,30000,20000,15000,8000,6000,5000,2500][i]; il[c]={d:'PRODUTO '+l.toUpperCase(),ln:[l]}; D['itens/'+c]={codigo:c,linhas:[l]};
   D['ordens/o'+i]={num:'o'+i,produto:c+' - PRODUTO',linha:l,data:h.toISOString().slice(0,10),turno:'Dia todo',total:5000,status:'aberta',criadaEm:ago(9000)};
   for(let j=0;j<6;j++) D['entregas/e'+i+'_'+j]={ordem:'o'+i,num:'o'+i,linha:l,qtd:Math.round(prev[c]/21*(0.6+0.15*(i%4))),em:ago(60*24*Math.min(j,h.getDate()-1)+30),por:'x'}; });
 D['pcpbase/prev']={mes:{[cp]:prev}}; D['pcpbase/itens']={l:il}; D['config/geral'].linhasOrdem=LS;
 d.users['tvfabrica@painel-colafix.app']={uid:'uTVF',pass:'tv1234',nome:'TV'}; D['perfis/uTVF']={nome:'TV',usuario:'tvfabrica'}; D['acessos/uTVF']={perfil:'tvtodas',mods:['tv','telas','cal','analise','producao','silos','manut'],locais:[],ativo:true}; return d; }
(async()=>{ const d=base();
 for(const vp of [{width:1920,height:1080},{width:1366,height:768}]){ const B=await H.abrir({viewport:vp}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tvfabrica','tv1234'); await H.dorme(3000);
   await p.evaluate(()=>__T.go('tvapres')); await H.dorme(400); await p.click('[data-act="apr-abre"][data-v="ritmo"]'); await H.dorme(1800);
   const m=await p.evaluate(()=>{ const t=[...document.querySelectorAll('.rtv-t')]; const sobra=t.filter(x=>x.scrollHeight>x.clientHeight+2||x.scrollWidth>x.clientWidth+2).length;
     return {h:document.documentElement.scrollHeight,vh:innerHeight,w:document.documentElement.scrollWidth,vw:innerWidth,n:t.length,sobra,nome:parseFloat(getComputedStyle(document.querySelector('.rtv-ln')).fontSize)*(+document.getElementById('view').style.zoom||1),
       num:parseFloat(getComputedStyle(document.querySelector('.rtv-fig b')).fontSize)*(+document.getElementById('view').style.zoom||1),miudo:!!document.querySelector('.rtv-pl')&&getComputedStyle(document.querySelector('.rtv-pl')).display!=='none',sub:!!document.querySelector('.navsub')&&getComputedStyle(document.querySelector('.navsub')).display!=='none',meta:(document.querySelector('.rtv-fig span')||{}).innerText}; });
   ok(`TV ${vp.width}×${vp.height}: Previsto × Realizado cabe inteiro, quadros sem texto sobrando, sem letras miúdas nem submenu`, m.h<=m.vh+1&&m.w<=m.vw+1&&m.n>=8&&m.sobra===0&&!m.miudo&&!m.sub&&/^meta /.test(m.meta||''), JSON.stringify(m));
   await B.browser.close(); }
 const B=await H.abrir({viewport:{width:1920,height:1080}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tvfabrica','tv1234'); await H.dorme(3000);
 await p.evaluate(()=>__T.go('tvapres')); await H.dorme(400);
 const segs=await p.evaluate(()=>[...document.querySelectorAll('[data-act="apr-seg"]')].map(b=>b.innerText));
 ok('Rodízio tem 5 s e 10 s', segs.includes('5 s')&&segs.includes('10 s'), segs.join(' · '));
 await p.click('[data-act="apr-seg"][data-v="5"]'); await p.check('[data-act="apr-auto"]'); await H.dorme(300);
 await p.reload(); await H.dorme(5500);
 const a=await p.evaluate(()=>({on:__T.S().apres.on,seg:__T.S().apres.seg,v:__T.S().view}));
 ok('"Começar a passar sozinha": ao abrir de novo, já entra passando as telas, com 5 s', a.on&&a.seg===5, JSON.stringify(a));
 const v1=a.v; await H.dorme(5600); const v2=await p.evaluate(()=>__T.S().view);
 ok('Troca de tela a cada 5 s', v1!==v2, v1+' → '+v2);
 await p.keyboard.press('Escape'); await H.dorme(600); await p.evaluate(()=>{ __T.S().apres.on&&document.querySelector('[data-act="apr-sair"]')&&document.querySelector('[data-act="apr-sair"]').click(); }); await H.dorme(400);
 await p.evaluate(()=>{ localStorage.setItem('colafix.apresAuto','0'); __T.go('tvapres'); }); await H.dorme(400);
 const temOp=await p.evaluate(()=>!!document.querySelector('[data-act="tv-escuro"]')); await p.check('[data-act="tv-escuro"]'); await H.dorme(300);
 const fora=await p.evaluate(()=>document.documentElement.getAttribute('data-theme'));
 await p.click('[data-act="apr-abre"][data-v="ritmo"]'); await H.dorme(1800);
 const dentro=await p.evaluate(()=>({tema:document.documentElement.getAttribute('data-theme'),card:getComputedStyle(document.querySelector('.rtv-t')).backgroundColor,logo:getComputedStyle(document.querySelector('.rtv-logo')||document.body).backgroundColor}));
 ok('"Fundo escuro na TV": só no modo TV; quadros escuros e logo com fundo branco', temOp&&fora!=='dark'&&dentro.tema==='dark'&&/rgb\((2[0-9]|1[0-9]), (2[0-9]|3[0-9]|4[0-9]), (3[0-9]|4[0-9])\)/.test(dentro.card)&&dentro.logo==='rgb(255, 255, 255)', JSON.stringify({fora,...dentro}));
 await p.keyboard.press('Escape'); await H.dorme(900); const depois=await p.evaluate(()=>document.documentElement.getAttribute('data-theme'));
 ok('Ao sair do modo TV, o painel volta ao normal', depois!=='dark', String(depois));
 await p.evaluate(()=>__T.go('tvapres')); await H.dorme(400); const tem=await p.evaluate(()=>{ const b=document.querySelector('[data-act="apr-abre"][data-v="silosver"]'); return !!b; });
 await p.click('[data-act="apr-abre"][data-v="silosver"]'); await H.dorme(1800);
 const sv=await p.evaluate(()=>({v:__T.S().view,h:document.documentElement.scrollHeight,vh:innerHeight,t:(document.getElementById('view').innerText||'').slice(0,80)}));
 ok('"Nível dos silos" (só consulta) está nas Telas de TV e cabe inteira na TV', tem&&sv.v==='silosver'&&sv.h<=sv.vh+1&&/Nível dos silos/.test(sv.t), JSON.stringify(sv));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
