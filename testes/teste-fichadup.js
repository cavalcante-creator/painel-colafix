/* 03/11 "as folhas de EPI do mês estão saindo repetidas": cadastro repetido (mesmo CPF ou mesmo nome) sai uma vez só e a tela avisa. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 D['rh/config']={fichasDesde:'2000-01'};
 D['rh/dados/funcoes/f1']={nome:'Mecânico',epis:[{nome:'Luva',ca:'111'}],uniformes:[{nome:'Camisa',tam:'G'}]};
 [['a','ANA MECANICA','52998224725'],['b','BRUNO SOUZA','11144477735'],['b2','BRUNO SOUZA LIMA','11144477735'],['c','CARLA DIAS','39053344705'],['c2','CARLA DIAS','']].forEach(([k,n,c])=>{ D['rh/dados/funcionarios/'+k]={nome:n,cpf:c,funcao:'Mecânico',setor:'Geral',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2024-01-10'}; });
 const B=await H.abrir({viewport:{width:1366,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2800);
 await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(1500);
 const tela=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Fichas do mês avisa os 2 cadastros repetidos (Bruno pelo CPF, Carla pelo nome)', /2 pessoas estão com o cadastro repetido/.test(tela)&&/BRUNO SOUZA = BRUNO SOUZA LIMA/.test(tela)&&/CARLA DIAS = CARLA DIAS/.test(tela), (tela.match(/[^\n]*cadastro repetido[^\n]*/)||[''])[0]);
 await p.click('[data-act="rh-fimptodas"]'); await H.dorme(3500);
 const fr=p.frames().find(f=>/rh-fichas/.test(f.url()));
 const r=await fr.evaluate(()=>({sets:[...document.querySelectorAll('#preview-wrap .ficha-set')].map(s=>s.querySelector('.set-label').textContent.split(' — ')[0]),cont:document.getElementById('preview-count').innerText}));
 ok('"Imprimir as fichas do mês": uma ficha por pessoa (3), sem repetir', r.sets.length===3&&new Set(r.sets).size===3, JSON.stringify(r.sets));
 ok('A prévia diz quantos cadastros repetidos saíram uma vez só', /2 cadastro\(s\) repetido\(s\)/.test(r.cont), r.cont);
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
