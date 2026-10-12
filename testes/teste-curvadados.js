/* confere os números da Curva S com uma conta feita por fora, a partir dos dados brutos */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const pad=n=>String(n).padStart(2,'0'); const iso=(d)=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
(async()=>{ const {d}=seedManut(); const D=d.docs; const hoje=new Date(); const cp=hoje.getFullYear()+'-'+pad(hoje.getMonth()+1); const ant=new Date(hoje.getFullYear(),hoje.getMonth()-1,15);
 D['pcpbase/prev']={mes:{[cp]:{'AC3001':40000,'AC3009':30000}}};
 D['pcpbase/itens']={l:{'AC3001':{d:'ARGAMASSA AC3 20KG',ln:['Linha 1']},'AC3009':{d:'ARGAMASSA AC3 FLEX 20KG',ln:['Linha 2']}}};
 D['itens/AC3009']={codigo:'AC3009',kgCimento:5,linhas:['Linha 2']}; D['itens/AC3001'].linhas=['Linha 1']; D['itens/RJ0001']={codigo:'RJ0001',linhas:['Linha 1']};
 D['ordens/5001'].produto='AC3001 - ARGAMASSA AC3 20KG'; D['ordens/5002'].produto='AC3009 - ARGAMASSA AC3 FLEX 20KG';
 D['ordens/5003']={num:'5003',produto:'RJ0001 - REJUNTE ESPECIAL 5KG',linha:'Linha 1',data:iso(hoje),turno:'Dia todo',total:300,status:'aberta',criadaEm:new Date().toISOString()};
 // 1.300 apontamentos no mês na Linha 1 (10 sacos cada), espalhados do dia 1 até agora
 const ini=new Date(hoje.getFullYear(),hoje.getMonth(),1,7,0,0).getTime(), fim=Date.now()-60000; let n=0;
 for(let i=0;i<1300;i++){ const t=new Date(ini+(fim-ini)*i/1299); D['entregas/L1_'+i]={ordem:'5001',num:'5001',linha:'Linha 1',qtd:10,em:t.toISOString(),por:'x'}; n++; }
 for(let i=0;i<40;i++){ const t=new Date(ini+(fim-ini)*i/39); D['entregas/L2_'+i]={ordem:'5002',num:'5002',linha:'Linha 2',qtd:100,em:t.toISOString(),por:'x'}; }
 D['entregas/anu1']={ordem:'5002',num:'5002',anula:'L2_5',qtd:0,em:new Date().toISOString(),por:'x'};        // anula 100 sacos
 D['entregas/fora1']={ordem:'5003',num:'5003',linha:'Linha 1',qtd:250,em:new Date(Date.now()-3600e3).toISOString(),por:'x'}; // item sem previsão
 for(let i=0;i<30;i++) D['entregas/ant'+i]={ordem:'5001',num:'5001',linha:'Linha 1',qtd:999,em:new Date(ant.getTime()+i*3600e3).toISOString(),por:'x'}; // mês passado: não conta
 d.users['tvfabrica@painel-colafix.app']={uid:'uTVF',pass:'tv1234',nome:'TV'}; D['perfis/uTVF']={nome:'TV',usuario:'tvfabrica'}; D['acessos/uTVF']={perfil:'tvtodas',mods:['tv','telas','cal','analise','producao','silos','manut'],locais:[],ativo:true};
 const B=await H.abrir({viewport:{width:1600,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3500);
 // conta independente
 const fer=await p.evaluate(()=>__T.fer());
 const util=s=>{ const w=new Date(s+'T12:00:00').getDay(); return w!==0&&(w!==6||fer.sab)&&!fer.f.includes(s); };
 const ult=new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate(); const dias=[]; for(let i=1;i<=ult;i++){ const s=cp+'-'+pad(i); if(util(s)) dias.push(s); }
 const hs=iso(hoje); let cut=null; dias.forEach(x=>{ if(x<hs||(x===hs)) cut=x; }); // há produção hoje
 const T=70000, nd=dias.length, metaAte=T*dias.filter(x=>x<=cut).length/nd;
 let ap=0, apMeta=0; Object.entries(D).filter(([k])=>k.startsWith('entregas/')).forEach(([k,e])=>{ if(e.anula) return; if(k==='entregas/L2_5') return; const dd=iso(new Date(e.em)); if(dd.slice(0,7)!==cp) return; ap+=e.qtd; if(e.ordem!=='5003') apMeta+=e.qtd; });
 const rest=dias.filter(x=>x>cut).length;
 console.log(`conta por fora: ${nd} dias úteis, até hoje ${dias.filter(x=>x<=cut).length} · meta mês ${T} · meta até hoje ${Math.round(metaAte)} · apontado (todos) ${ap} · apontado (só itens da meta) ${apMeta} · restam ${rest} dias`);
 await p.evaluate(()=>{ __T.S().rit.auto=false; __T.S().rit.curva=''; __T.go('anlrit'); }); await H.dorme(2500);
 const tela=await p.evaluate(()=>{ const o={}; document.querySelectorAll('.rit-cvk').forEach(k=>{ o[k.querySelector('span').textContent.trim().toLowerCase()]=k.querySelector('b').innerText; }); o.vista=(document.querySelector('.rit-cvn')||{}).innerText; return o; });
 const num=s=>+String(s||'').replace(/[^\d,-]/g,'').replace(',','.');
 console.log('tela:',JSON.stringify(tela));
 const metaOk=Math.abs(num(tela['meta até hoje'])-Math.round(metaAte))<=1;
 ok('Meta até hoje confere com a conta por fora', metaOk, `tela ${tela['meta até hoje']} · conta ${Math.round(metaAte)}`);
 ok('Apontado do mês: todos os 1.300+ apontamentos entram (nada some pelo limite de 1.000)', num(tela['apontado'])===apMeta||num(tela['apontado'])===ap, `tela ${tela['apontado']} · conta ${ap} (com item fora da meta) / ${apMeta} (só itens da meta)`);
 ok('Regra combinada: itens fora da previsão contam no apontado (e aparecem listados à parte)', num(tela['apontado'])===ap, `tela ${tela['apontado']} · esperado ${ap}`);
 const precisa=Math.round(Math.max(0,T-ap)/rest), dev=ap-Math.round(metaAte);
 ok('Desvio e "Precisa por dia" conferem', Math.abs(num(tela['desvio'])-dev)<=1&&Math.abs(num(tela['precisa por dia'])-precisa)<=1, `desvio tela ${tela['desvio']} / conta ${dev} · precisa tela ${tela['precisa por dia']} / conta ${precisa}`);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
