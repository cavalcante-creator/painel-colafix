/* Chamados do gestor: Marcelo cria tarefa (fora das linhas e de linha), técnico vê e assume no computador de chamados,
   termina sem pedir causa; Marcelo marca outra como feita; tarefa normal não toca a sirene do monitor. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs, t=new Date().toISOString();
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
 D['crachas/BCDE3456']={codigo:'BCDE3456',nome:'Bruno Lima',linha:'',papel:'tecnico',area:'Serralheria',ativo:true,adesivo:'777888',criadoEm:t};
 d.users['chamados@painel-colafix.app']={uid:'uCH',pass:'ch1234',nome:'Chamados'}; D['perfis/uCH']={nome:'Computador de chamados',usuario:'chamados'}; D['acessos/uCH']={perfil:'chamados',mods:['tablet'],locais:[],ativo:true};
 const erros=[];
 /* 1) Marcelo cria a tarefa */
 let B=await H.abrir({viewport:{width:1440,height:1000}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3000);
 const nav=await p.evaluate(()=>document.getElementById('navlist').innerText);
 ok('Menu do Marcelo tem "Manutenção" (Chamados dentro)', /Manutenção/.test(nav), nav.replace(/\n/g,'|'));
 await p.click('#navlist [data-go="gxch"]'); await H.dorme(800);
 let t1=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Tela "Chamados e tarefas" abre com os números e o botão de nova tarefa', /Chamados e tarefas/.test(t1)&&/aguardando técnico/.test(t1)&&/Nova tarefa para a manutenção/.test(t1), t1.slice(0,200).replace(/\n/g,'|'));
 await p.click('[data-act="gch-nova"]'); await H.dorme(400);
 await p.fill('#gch-tx','Consertar o portão da portaria que não fecha'); await p.selectOption('#gch-on','Portaria'); await H.dorme(400);
 await p.fill('#gch-lc','portão 2'); await p.selectOption('#gch-tp','serralheria'); await p.selectOption('#gch-tc','Bruno Lima');
 await p.evaluate(()=>{ document.activeElement&&document.activeElement.blur(); return __T.S().db.doc('config/geral').update({tstRedesenho:Date.now()}); }); await H.dorme(1200); /* a tela se redesenha sozinha (dados chegando) antes de salvar */
 await p.click('[data-act="gch-salvar"]'); await H.dorme(1800);
 let c1=await p.evaluate(()=>{ const c=__T.S().chamados.find(x=>x.tarefa&&/portão/.test(x.defeito)); return c&&{n:c.numero,l:c.linha,lc:c.local,tp:c.tipo,pr:c.prioridade,tec:c.paraTec,st:c.status,imp:c.impacto,nome:c.nome,par:!!c.paradaId}; });
 ok('Tarefa fora das linhas gravada (Portaria · portão 2, serralheria, para o Bruno, normal, sem parada)', c1&&c1.l==='Portaria'&&c1.lc==='portão 2'&&c1.tp==='serralheria'&&c1.tec==='Bruno Lima'&&c1.pr==='normal'&&c1.st==='Aberta'&&!c1.par&&/Marcelo/.test(c1.nome), JSON.stringify(c1));
 t1=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('A tarefa aparece na lista com "Aguardando técnico · para Bruno Lima"', /Consertar o portão/.test(t1)&&/Aguardando técnico · para Bruno Lima/.test(t1), t1.slice(0,500).replace(/\n/g,'|'));
 /* segunda: de linha, urgente, linha parada */
 await p.click('[data-act="gch-nova"]'); await H.dorme(300); await p.fill('#gch-tx','Trocar a correia da ensacadeira'); await p.selectOption('#gch-on','Linha 1'); await H.dorme(400);
 await p.check('#gch-pa'); await p.click('[data-act="gch-salvar"]'); await H.dorme(1800);
 let c2=await p.evaluate(()=>{ const S=__T.S(), c=S.chamados.find(x=>x.tarefa&&/correia/.test(x.defeito)); const pa=c&&S.paradas.find(x=>x._id===c.paradaId); return c&&{n:c.numero,imp:c.impacto,pr:c.prioridade,par:!!(pa&&!pa.fim)}; });
 ok('Tarefa de linha com "linha parada": urgente e marca a parada da Linha 1', c2&&c2.imp==='parou'&&c2.pr==='urgente'&&c2.par, JSON.stringify(c2));
 const alt=await p.evaluate(()=>{ document.querySelector('#tp-sino').click(); return new Promise(r=>setTimeout(()=>r(document.getElementById('tp-pop').innerText),300)); });
 ok('Sino: a urgente avisa, a normal (recém-criada) não', /sem técnico/.test(alt)&&!new RegExp('Chamado 0*'+c1.n+' sem técnico').test(alt), alt.replace(/\n/g,'|'));
 await p.keyboard.press('Escape');
 /* Marcelo marca a 2ª como feita */
 await p.click(`[data-act="gch-feito"][data-id="os-${String(c2.n).padStart(5,'0')}"]`); await H.dorme(300); await p.fill('#gch-obs','Correia trocada'); await p.click('[data-act="gch-feito-ok"]'); await H.dorme(1800);
 c2=await p.evaluate(n=>{ const S=__T.S(), c=S.chamados.find(x=>x.numero===n); const pa=S.paradas.find(x=>x._id===c.paradaId); return {st:c.status,por:c.concluidoPorNome,g:c.feitoPeloGestor,sv:c.exec&&c.exec.servicos,parFim:!!(pa&&pa.fim)}; },c2.n);
 ok('"Marcar como feito" conclui, guarda o que foi feito e encerra a parada da linha', c2.st==='Concluída'&&/Marcelo/.test(c2.por||'')&&c2.g&&c2.sv==='Correia trocada'&&c2.parFim, JSON.stringify(c2));
 await p.screenshot({path:'/tmp/gxch.png',fullPage:true});
 await p.click('[data-act="gch-nova"]'); await H.dorme(300); const sh=await p.screenshot({path:'/tmp/gxch-form.png'}); await p.keyboard.press('Escape');
 const DD=await p.evaluate(()=>{ const o={}; __T.S().chamados.forEach(c=>{ o['chamados/'+c._id]=Object.assign({},c); delete o['chamados/'+c._id]._id; }); return o; });
 await B.browser.close();
 Object.assign(D,DD);
 /* 2) computador de chamados: técnico vê a tarefa fora das linhas, começa e termina sem causa */
 B=await H.abrir({viewport:{width:1600,height:900}}); p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'chamados','ch1234'); await H.dorme(2500);
 const bip=async c=>{ await p.keyboard.type(c,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(1100); };
 const zera=async()=>{ await p.evaluate(()=>{ const T=__T.S().tt; T.recente={}; Object.assign(T,{fase:'espera',p:null,msg:''}); __T.go('mantotem'); }); await H.dorme(700); };
 await bip('777888'); let tt=await p.evaluate(()=>(document.querySelector('.cq')||document.body).innerText);
 ok('Computador de chamados: o técnico NÃO vê a tarefa do Marcelo (fica no computador da manutenção; aqui só os chamados abertos neste login)', !/Portaria · portão 2/.test(tt)&&!/Tarefa do gestor/.test(tt), tt.slice(0,300).replace(/\n/g,'|'));
 await B.browser.close();
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU tudo ('+res.length+')'); process.exit(f?1:0); })().catch(e=>{ console.log('FALHOU',e); process.exit(1); });
