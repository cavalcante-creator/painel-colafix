const H=require('./harness'); const {seedManut}=require('./manut-seed');
module.exports=async function(vp,arq,extra,op){ op=op||{}; const {d}=seedManut(); const D=d.docs; const h=new Date(); const cp=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); const ago=m=>new Date(Date.now()-m*60000).toISOString();
 const LS=['Linha 1','Linha 2','Linha 3','Área líquida','Rejunte M1','Rejunte M2','Rejunte M3','Fixcol']; const prev={}, il={};
 LS.forEach((l,i)=>{ const c='IT'+(100+i); prev[c]=[40000,30000,20000,15000,8000,6000,5000,2500][i]; il[c]={d:'PRODUTO '+l.toUpperCase(),ln:[l]}; D['itens/'+c]={codigo:c,linhas:[l]};
   D['ordens/o'+i]={num:'o'+i,produto:c+' - PRODUTO',linha:l,data:h.toISOString().slice(0,10),turno:'Dia todo',total:5000,status:'aberta',criadaEm:ago(9000)};
   for(let j=0;j<6;j++) D['entregas/e'+i+'_'+j]={ordem:'o'+i,num:'o'+i,linha:l,qtd:Math.round(prev[c]/21*(0.6+0.15*(i%4))),em:ago(60*24*Math.min(j,h.getDate()-1)+30),por:'x'}; });
 D['pcpbase/prev']={mes:{[cp]:prev}}; const tt=new Date().toISOString(); D['silos/c1']={saldoKg:21000,medidoKg:21000,medidoEm:tt,atualizadoEm:tt,origem:'medicao'}; D['silos/c2']={saldoKg:9500,medidoKg:10000,medidoEm:tt,atualizadoEm:tt,origem:'consumo'}; D['silos/c3']={saldoKg:4000,medidoKg:4000,medidoEm:tt,atualizadoEm:tt,origem:'medicao'}; D['silos/a1']={saldoKg:42000,medidoKg:42000,medidoEm:tt,atualizadoEm:tt,origem:'medicao'}; D['pcpbase/itens']={l:il}; D['config/geral'].linhasOrdem=LS;
 if(op.seed) op.seed(D); d.users['tvfabrica@painel-colafix.app']={uid:'uTVF',pass:'tv1234',nome:'TV'}; D['perfis/uTVF']={nome:'TV',usuario:'tvfabrica'}; D['acessos/uTVF']={perfil:'tvtodas',mods:['tv','telas','cal','analise','producao','silos','manut'],locais:[],ativo:true};
 const B=await H.abrir({viewport:vp}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,op.user||'tvfabrica',op.pass||'tv1234'); await H.dorme(3000);
 await p.evaluate(()=>__T.go('tvapres')); await H.dorme(400); await p.click('[data-act="apr-abre"][data-v="ritmo"]'); await H.dorme(1500);
 const m=await p.evaluate(()=>({h:document.documentElement.scrollHeight,vh:innerHeight,w:document.documentElement.scrollWidth,vw:innerWidth,tiles:document.querySelectorAll('.rtv-t').length,
   fonte:[...document.querySelectorAll('.rtv-t .rtv-ln, .rtv-fig b, .rtv-kk b, .rtv-kk span, .rtv-fig span')].slice(0,5).map(e=>e.className+':'+getComputedStyle(e).fontSize)}));
 if(extra) await extra(p); await p.screenshot({path:arq}); await B.browser.close(); return m; };
if(require.main===module){ (async()=>{ for(const [w,hh] of [[1920,1080],[1366,768]]){ const m=await module.exports({width:w,height:hh},`/tmp/rtv-${w}.png`); console.log(w+'x'+hh, JSON.stringify(m)); } process.exit(0); })(); }
