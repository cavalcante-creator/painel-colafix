/* Visão do gestor: menu próprio (sem repetir módulos), Início novo e "Quem está na empresa"
   (o painel do RH publica presenca/{dia} SEM CPF; o gestor lê e filtra). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const n=new Date(), hj=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'), m=hj.slice(0,7);
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
 D['rh/dados/funcionarios/f1']={nome:'ANA SOUZA',cpf:'111.111.111-11',setor:'Linha 1',empresa:'COLAFIX',vinculo:'CLT',status:'Ativo',admissao:'2020-01-01'};
 D['rh/dados/funcionarios/f2']={nome:'BRUNO LIMA',cpf:'222.222.222-22',setor:'Manutenção',empresa:'COLAFIX',vinculo:'CLT',status:'Ativo',admissao:'2020-01-01'};
 D['rh/dados/funcionarios/f3']={nome:'CARLA DIAS',cpf:'333.333.333-33',setor:'Linha 2',empresa:'COLAFIX',vinculo:'CLT',status:'Ativo',admissao:'2020-01-01'};
 D['rh/dados/funcionarios/f4']={nome:'DIEGO ROCHA',cpf:'444.444.444-44',setor:'Linha 3',empresa:'ZENITH',vinculo:'PJ',status:'Ativo',admissao:'2020-01-01'};
 D['rh/dados/ferias/x1']={funcId:'f4',inicio:hj,fim:hj,status:'marcada'};
 D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ANA SOUZA',e:'FIXCOL INDUSTRIA E COMERCIO LTDA'},'22222222222':{n:'BRUNO LIMA'},'55555555555':{n:'IVAN MOTORISTA',e:'TRANSPORTES XYZ'}},
  dias:{[hj]:{'11111111111':{p:1,a:'11:40',t:['07:10:00 Estacionamento Entrada','07:12:00 Portaria Entrada','11:40:00 REFEITÓRIO']},
             '22222222222':{p:1,t:['08:20:00 Portaria Entrada','12:30:00 Portaria Saida']},
             '55555555555':{p:1,t:['06:40:00 Portaria Entrada']}}},imp:[{em:new Date().toISOString(),por:'Teste'}]};
 /* 1) administradora (tem o RH): o painel publica a presença sozinho */
 let B=await H.abrir({viewport:{width:1440,height:1000}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 let doc=null; for(let i=0;i<60&&!doc;i++){ await H.dorme(500); doc=await p.evaluate(x=>__T.S().db.doc('presenca/'+x).get().then(g=>g.exists?g.data():null),hj); }
 const js=JSON.stringify(doc||{});
 ok('O painel do RH publica presenca/'+hj+' sozinho, sem CPF', !!doc&&!/111\.?111|11111111111|22222222222|cpf/i.test(js), js.slice(0,200));
 const pa=doc&&doc.p.find(x=>x.n==='Ana Souza'), pb=doc&&doc.p.find(x=>x.n==='Bruno Lima'), pi=doc&&doc.p.find(x=>/Ivan/.test(x.n));
 ok('Ana: chegou 07:10, almoço 11:40, na empresa; Bruno: chegou 08:20 e saiu 12:30; motorista = Terceiros', pa&&pa.c==='07:10'&&pa.a==='11:40'&&!pa.sa&&pa.e==='Colafix'&&pb&&pb.sa===1&&pb.u==='12:30'&&pb.g[0]==='08:20-12:30'&&pi&&pi.e==='Terceiros', JSON.stringify({pa,pb,pi}));
 const fc=doc&&doc.f.find(x=>x.n==='Carla Dias'), fd=doc&&doc.f.find(x=>x.n==='Diego Rocha');
 ok('Não vieram: Carla sem registro e Diego de férias (Zenith)', fc&&fc.m==='Sem registro'&&fd&&fd.m==='Férias'&&fd.e==='Zenith', JSON.stringify(doc&&doc.f));
 const em1=doc&&doc.em; await H.dorme(22000); const em2=await p.evaluate(x=>__T.S().db.doc('presenca/'+x).get().then(g=>g.data().em),hj);
 ok('Sem mudança, não grava de novo', em1===em2, em1+' / '+em2);
 await B.browser.close();
 /* 2) Marcelo */
 D['presenca/'+hj]=doc;
 B=await H.abrir({viewport:{width:1440,height:1000}}); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3000);
 let nav=await p.evaluate(()=>({t:document.getElementById('navlist').innerText,lb:document.querySelector('.side .modulo').innerText,v:__T.S().view,tabs:getComputedStyle(document.querySelector('#view>nav.tabs')||document.body).display}));
 ok('Menu do Marcelo: só as telas da Visão do gestor (sem sistemas completos, sem repetir)', nav.v==='gxinicio'&&/VISÃO DO GESTOR/i.test(nav.lb)&&/Pessoas hoje/.test(nav.t)&&!/SISTEMAS COMPLETOS|Manutenção|Silos|Nível dos silos|Monitor do rancho|Telas de TV/i.test(nav.t)&&nav.t.split('\n').filter(x=>x==='Produção').length===1, nav.t.replace(/\n/g,'|'));
 ok('Na Visão do gestor as abas de cima somem (o menu é a lateral)', nav.tabs==='none', nav.tabs);
 let t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Início novo: saudação, meta do dia e "Pessoas hoje" com o Face ID', /Marcelo/.test(t)&&/Pessoas hoje/.test(t)&&/Na empresa agora/.test(t)&&/Precisa de você|Tudo em ordem/.test(t), t.slice(0,300).replace(/\n/g,'|'));
 await p.click('#navlist [data-go="gxpres"]'); await H.dorme(1200); t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Quem está na empresa: 3 vieram de 5, nomes, "Saiu 12:30", férias e sem registro', /Quem está na empresa/.test(t)&&/Ana Souza/.test(t)&&/Saiu 12:30/.test(t)&&/De férias/.test(t)&&/sem registro/i.test(t)&&/3\s*de 5/.test(t), t.slice(0,500).replace(/\n/g,'|'));
 const vis=()=>p.evaluate(()=>[...document.querySelectorAll('.gxp-row[data-b]')].filter(r=>!r.hidden).map(r=>r.querySelector('b').innerText));
 await p.click('.gxp-tab[data-v="f"]'); await H.dorme(300); let v=await vis();
 ok('Filtro "Não vieram" mostra Carla e Diego', v.length===2&&v.includes('Carla Dias')&&v.includes('Diego Rocha'), v.join(', '));
 await p.click('.gxp-tab[data-v="todos"]'); await p.fill('#gxp-q','manutencao'); await H.dorme(300); v=await vis();
 ok('Busca sem acento por setor acha Bruno', v.length===1&&v[0]==='Bruno Lima', v.join(', '));
 await p.setViewportSize({width:390,height:844}); await H.dorme(800); const lat=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 ok('Celular: sem rolagem para o lado', lat<=1, lat);
 const errs=(B.erros||[]).filter(x=>!/favicon|fonts\.g|Failed to load resource/i.test(x)); ok('Sem erros no console', !errs.length, errs.join(' | '));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
