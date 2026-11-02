/* 30/10 "só quem usa EPI pode ter a folha de EPI": a folha de EPI só sai para quem tem EPI na função
   (função marcada "não usa EPI" ou sem EPI cadastrado = sem ficha nenhuma, nem a de uniforme). */
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
 const gera=async tipo=>{ await fr.evaluate(t=>{ const s=document.getElementById('select-tipo-ficha'); s.value=t; s.dispatchEvent(new Event('change')); const f=document.getElementById('select-funcionario'); f.value='__TODOS__'; f.dispatchEvent(new Event('change')); },tipo);
   await fr.click('#btn-gerar-todos'); await H.dorme(900);
   return fr.evaluate(()=>{ const sets=[...document.querySelectorAll('#preview-wrap .ficha-set')].map(s=>({n:s.querySelector('.set-label').textContent.split(' — ')[0],uni:!!s.querySelector('.page-uniforme'),epi:!!s.querySelector('.page-epi'),br:!!s.querySelector('.page-branco')})); return {sets,cont:document.getElementById('preview-count').innerText}; }); };
 const de=(r,n)=>r.sets.find(s=>s.n===n)||{};
 let r=await gera('AMBAS');
 ok('Uniforme + EPI: só a Ana (usa EPI) tem ficha; quem não usa fica sem ficha nenhuma, nem a de uniforme', r.sets.length===1&&de(r,'ANA MECANICA').epi&&de(r,'ANA MECANICA').uni, JSON.stringify(r.sets));
 ok('Conta 2 páginas e avisa "2 não usa(m) EPI e fica(m) sem ficha"', /2\s*página/.test(r.cont)&&/2 não usa\(m\) EPI e fica\(m\) sem ficha/.test(r.cont), r.cont);
 r=await gera('EPI'); ok('Só EPI: só a Ana', r.sets.length===1&&r.sets[0].n==='ANA MECANICA'&&r.sets[0].epi&&/1\s*página/.test(r.cont), r.cont);
 r=await gera('UNIFORME'); ok('Só uniforme: também só a Ana', r.sets.length===1&&r.sets[0].n==='ANA MECANICA'&&r.sets[0].uni&&!r.sets[0].epi, JSON.stringify(r.sets));
 const pv=await fr.evaluate(()=>({b:FICHAS.previa('BRUNO ADM','2026-10'),c:FICHAS.previa('CARLA VENDAS','2026-10','epi'),a:!!FICHAS.previa('ANA MECANICA','2026-10','epi')}));
 ok('Prévia: não existe ficha para quem não usa EPI', pv.b===null&&pv.c===null&&pv.a, JSON.stringify({b:!!pv.b,c:!!pv.c,a:pv.a}));
 await p.evaluate(()=>__T.go('rhfichas')); await p.click('[data-act="rh-fvmes"]').catch(()=>{}); await H.dorme(1200); const sm=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Fichas do mês: Bruno e Carla aparecem como "Não usa EPI" (não contam como pendentes)', (sm.match(/Não usa EPI/gi)||[]).length>=2&&!/Função sem EPI/.test(sm), (sm.match(/[^\n]*(BRUNO|CARLA)[^\n]*/gi)||[]).join(' | ').slice(0,200));
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
