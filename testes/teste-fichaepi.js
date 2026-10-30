/* 30/10 "só quem usa EPI pode ter a folha de EPI": a folha de EPI só sai para quem tem EPI na função
   (função marcada "não usa EPI" ou sem EPI cadastrado = só a folha de uniforme; no frente e verso, verso em branco). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 D['rh/config']={fichasDesde:'2000-01'};
 D['rh/dados/funcoes/f1']={nome:'Mecânico',epis:[{nome:'Luva',ca:'111'}],uniformes:[{nome:'Camisa',tam:'G'}]};
 D['rh/dados/funcoes/f2']={nome:'Administrativo',naoUsaEpi:true,epis:[{nome:'Luva',ca:'111'}],uniformes:[{nome:'Camisa',tam:'M'}]}; /* EPI esquecido na lista, mas marcado "não usa" */
 D['rh/dados/funcoes/f3']={nome:'Vendedor',epis:[],uniformes:[{nome:'Camisa',tam:'P'}]};
 const pes=[['a','ANA MECANICA','Mecânico','52998224725'],['b','BRUNO ADM','Administrativo','11144477735'],['c','CARLA VENDAS','Vendedor','39053344705']];
 pes.forEach(([k,n,f,c])=>{ D['rh/dados/funcionarios/'+k]={nome:n,cpf:c,funcao:f,setor:'Geral',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2024-01-10'}; });
 const B=await H.abrir({viewport:{width:1366,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2800);
 await p.evaluate(()=>__T.go('rhfichas')); await p.click('[data-act="rh-fvgerar"]'); await H.dorme(2500); const fr=p.frames().find(f=>/rh-fichas/.test(f.url()));
 const gera=async(tipo,verso)=>{ await fr.evaluate(([t,v])=>{ const s=document.getElementById('select-tipo-ficha'); s.value=t; s.dispatchEvent(new Event('change')); const c=document.getElementById('chk-verso-branco'); if(c){ c.checked=v; c.dispatchEvent(new Event('change')); } const f=document.getElementById('select-funcionario'); f.value='__TODOS__'; f.dispatchEvent(new Event('change')); },[tipo,verso]);
   await fr.click('#btn-gerar-todos'); await H.dorme(900);
   return fr.evaluate(()=>{ const sets=[...document.querySelectorAll('#preview-wrap .ficha-set')].map(s=>({n:s.querySelector('.set-label').textContent.split(' — ')[0],uni:!!s.querySelector('.page-uniforme'),epi:!!s.querySelector('.page-epi'),br:!!s.querySelector('.page-branco')})); return {sets,cont:document.getElementById('preview-count').innerText}; }); };
 const de=(r,n)=>r.sets.find(s=>s.n===n)||{};
 let r=await gera('AMBAS',true);
 ok('Uniforme + EPI: só a Ana (usa EPI) tem a folha de EPI', de(r,'ANA MECANICA').epi&&!de(r,'BRUNO ADM').epi&&!de(r,'CARLA VENDAS').epi&&r.sets.every(s=>s.uni), JSON.stringify(r.sets));
 ok('Frente e verso: quem não usa EPI tem o verso em branco; conta 6 páginas e avisa', de(r,'BRUNO ADM').br&&de(r,'CARLA VENDAS').br&&!de(r,'ANA MECANICA').br&&/6\s*página/.test(r.cont)&&/2 sem folha de EPI/.test(r.cont), r.cont);
 r=await gera('AMBAS',false); ok('Sem frente e verso: 4 páginas, sem verso em branco', r.sets.every(s=>!s.br)&&/4\s*página/.test(r.cont), r.cont);
 r=await gera('EPI',true); ok('Só EPI: sai só a Ana; os outros ficam de fora', r.sets.length===1&&r.sets[0].n==='ANA MECANICA'&&r.sets[0].epi&&/1\s*página/.test(r.cont)&&/2 não usa/.test(r.cont), JSON.stringify(r));
 r=await gera('UNIFORME',true); ok('Só uniforme: os 3, sem EPI', r.sets.length===3&&r.sets.every(s=>s.uni&&!s.epi&&!s.br), JSON.stringify(r.sets));
 const pv=await fr.evaluate(()=>({b:FICHAS.previa('BRUNO ADM','2026-10','epi'),a:!!FICHAS.previa('ANA MECANICA','2026-10','epi')}));
 ok('Prévia da página do EPI: não existe para quem não usa EPI', pv.b===null&&pv.a, JSON.stringify({b:pv.b&&'tem',a:pv.a}));
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
