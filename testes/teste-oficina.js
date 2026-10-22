/* Computador da manutenção (oficina): alarme, aceitar/para depois/devolver, começar, feito em parte, falta peça → pedido de peça,
   entrar junto na preventiva, quadro da semana, trava do Sair; Marcelo vê e marca o pedido de peça. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const crypto=require('crypto'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs, agora=Date.now(), iso=m=>new Date(agora-m*6e4).toISOString(), loc=m=>new Date(agora-m*6e4-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
 D['crachas/BCDE3456']={codigo:'BCDE3456',nome:'Bruno Lima',linha:'',papel:'tecnico',area:'Mecânica',ativo:true,adesivo:'777888',criadoEm:iso(999)};
 D['crachas/CDEF4567']={codigo:'CDEF4567',nome:'Carlos Souza',linha:'',papel:'tecnico',area:'Elétrica',ativo:true,adesivo:'555666',criadoEm:iso(999)};
 D['crachas/DEFG5678']={codigo:'DEFG5678',nome:'Ana Operadora',linha:'Linha 1',papel:'operador',ativo:true,adesivo:'444333',criadoEm:iso(999)};
 D['config/geral']=Object.assign(D['config/geral']||{},{travaSenha:{s:'sal',h:crypto.createHash('sha256').update('sal|1234abc').digest('hex'),em:iso(60)}});
 D['chamados/os-00031']={numero:31,linha:'Linha 2',equip:'Ensacadeira',defeito:'Mecânico',tipo:'mecanico',impacto:'parou',nome:'Ana',status:'Aberta',criado:iso(2),quando:loc(2)};
 D['chamados/os-00032']={numero:32,linha:'Portaria',local:'portão 2',defeito:'Portão não fecha',tipo:'serralheria',impacto:'nao',prioridade:'urgente',tarefa:true,origem:'gestor',nome:'Marcelo Souza',status:'Aberta',criado:iso(1),quando:loc(1)};
 D['chamados/os-00033']={numero:33,linha:'Pátio',local:'portão de carga',defeito:'Lubrificar trilho do portão',tipo:'mecanico',impacto:'nao',prioridade:'normal',tarefa:true,origem:'gestor',paraTec:'Bruno Lima',prazo:new Date(agora+3*864e5).toISOString().slice(0,10),nome:'Marcelo Souza',status:'Aberta',criado:iso(90),quando:loc(90)};
 D['chamados/os-00034']={numero:34,linha:'Linha 1',defeito:'PREVENTIVA: Filtros de manga - Linha 1 · Semanal · Automação (2 itens)',impacto:'nao',nome:'Plano preventivo',status:'Em execução',criado:iso(200),quando:loc(200),prevId:'rot-r1',rotId:'r1',chkItens:[{id:'t1',t:'Limpar mangas',a:'Filtro'},{id:'t2',t:'Ver pressão',a:'Filtro'}],chk:{t1:{s:'ok'}},exec:{tipo:'Preventiva',tecnico:'Carlos Souza',inicio:loc(30)}};
 d.users['oficina@painel-colafix.app']={uid:'uOF',pass:'of1234',nome:'Oficina'}; D['perfis/uOF']={nome:'Computador da manutenção',usuario:'oficina'}; D['acessos/uOF']={perfil:'oficina',mods:['tablet'],locais:[],ativo:true};
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
 const erros=[];
 let B=await H.abrir({viewport:{width:1600,height:900}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'oficina','of1234'); await H.dorme(3500);
 const txt=()=>p.evaluate(()=>(document.querySelector('.cq')||document.body).innerText);
 const bip=async c=>{ await p.evaluate(()=>{ __T.S().tt.recente={}; }); await p.keyboard.type(c,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(1100); };
 let s=await p.evaluate(()=>({v:__T.S().view,ov:(document.querySelector('.of-ov')||{}).innerText||'',cls:(document.querySelector('.of-ov')||{}).className||''}));
 ok('Login da oficina abre direto na tela da manutenção com o alarme do chamado novo da linha', s.v==='mantotem'&&/CHAMADO NOVO DA LINHA/.test(s.ov)&&/LINHA 2 · PAROU COMPLETA/.test(s.ov)&&/lin/.test(s.cls), JSON.stringify(s).slice(0,300));
 await p.click('[data-act="of-sil"]'); await H.dorme(1400);
 ok('Silenciar tira o alarme', !(await p.$('.of-ov')));
 await p.evaluate(()=>__T.S().db.doc('chamados/os-00035').set({numero:35,linha:'Prédio / escritório',defeito:'Ar-condicionado da sala do PCP pingando',tipo:'eletrico',impacto:'nao',prioridade:'urgente',tarefa:true,origem:'gestor',nome:'Marcelo Souza',status:'Aberta',criado:new Date().toISOString()})); await H.dorme(2000);
 s=await p.evaluate(()=>({ov:(document.querySelector('.of-ov')||{}).innerText||'',cls:(document.querySelector('.of-ov')||{}).className||''}));
 ok('Tarefa urgente nova do Marcelo toca o alarme âmbar', /TAREFA URGENTE DO MARCELO/.test(s.ov)&&/Prédio/.test(s.ov)&&/tar/.test(s.cls), s.ov.slice(0,200));
 await p.screenshot({path:'/tmp/of-alarme.png'});
 await p.click('[data-act="of-sil"]'); await H.dorme(1400);
 let t=await txt(); const temOv=await p.$('.of-ov');
 ok('Espera: três colunas (linhas · do Marcelo + preventivas · quem faz o quê) e o convite do crachá', !temOv&&/Chamados das linhas/.test(t)&&/Do Marcelo · para aceitar/.test(t)&&/Preventivas de hoje/.test(t)&&/Quem está fazendo o quê/.test(t)&&/Passe seu crachá/.test(t)&&/Carlos · Elétrica/.test(t), t.slice(0,600).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/of-espera.png'});
 await bip('444333'); t=await txt(); s=await p.evaluate(()=>__T.S().tt.fase);
 ok('Crachá de operador não entra (vai para o posto da linha)', s==='espera'&&/posto da linha/.test(t), s);
 await bip('777888'); s=await p.evaluate(()=>__T.S().tt.fase); t=await txt();
 ok('Bruno passa o crachá: tela dele com Para você aceitar, Comigo, Preventivas e Chamados das linhas', s==='oftec'&&/Para você aceitar/.test(t)&&/Portão não fecha/.test(t)&&/Lubrificar trilho/.test(t)&&/Comigo/.test(t)&&/Entrar junto/.test(t)&&/Pedir peça/.test(t), t.slice(0,600).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/of-tec.png'});
 /* aceitar para depois */
 await p.click('[data-act="of-ver"][data-n="33"]'); await H.dorme(400); await p.click('[data-act="of-ad"]'); await H.dorme(1300);
 let c=await p.evaluate(()=>{ const c=__T.S().chamados.find(x=>x.numero===33); return {ac:c.exec&&c.exec.aceito,st:c.status,f:__T.S().tt.fase}; }); t=await txt();
 ok('"Aceitar para depois": fica com o Bruno (aceito) e aparece em Comigo com "Começar agora"', c.ac&&c.ac.nome==='Bruno Lima'&&c.st==='Aberta'&&c.f==='oftec'&&!!(await p.$('[data-act="of-comecar"][data-n="33"]')), JSON.stringify(c));
 /* devolver a urgente */
 await p.click('[data-act="of-ver"][data-n="32"]'); await H.dorme(400); await p.click('[data-act="of-nao"]'); await H.dorme(300);
 await p.click('[data-act="of-mot"][data-v="Falta peça ou material"]'); await H.dorme(300); await p.fill('#of-dobs','sem roldana'); await p.click('[data-act="of-dev-ok"]'); await H.dorme(1300);
 c=await p.evaluate(()=>{ const c=__T.S().chamados.find(x=>x.numero===32); return {dv:c.devolvidas,f:__T.S().tt.fase}; });
 ok('"Não consigo" + motivo devolve para o Marcelo (devolvidas com motivo e explicação)', c.dv&&c.dv[0].nome==='Bruno Lima'&&c.dv[0].mot==='Falta peça ou material'&&c.dv[0].obs==='sem roldana'&&c.f==='ofok', JSON.stringify(c));
 await p.keyboard.press('Escape'); await H.dorme(400);
 /* começar, feito em parte, falta peça */
 await p.click('[data-act="of-comecar"][data-n="33"]'); await H.dorme(1500);
 c=await p.evaluate(()=>{ const c=__T.S().chamados.find(x=>x.numero===33); return {st:c.status,tec:c.exec&&c.exec.tecnico}; });
 ok('"Começar agora": em execução com o Bruno', c.st==='Em execução'&&c.tec==='Bruno Lima', JSON.stringify(c));
 await p.click('[data-act="of-term"][data-n="33"]'); await H.dorme(300); await p.click('[data-act="of-tr"][data-v="parte"]'); await H.dorme(200); await p.fill('#of-tobs','limpei o trilho'); await p.click('[data-act="of-term-ok"]'); await H.dorme(1300);
 c=await p.evaluate(()=>{ const c=__T.S().chamados.find(x=>x.numero===33); return {st:c.status,pt:c.exec&&c.exec.partes}; });
 ok('"Feito em parte": anota e continua em execução', c.st==='Em execução'&&c.pt&&c.pt[0].obs==='limpei o trilho', JSON.stringify(c));
 await p.keyboard.press('Escape'); await H.dorme(300);
 await p.click('[data-act="of-term"][data-n="33"]'); await H.dorme(300); await p.click('[data-act="of-tr"][data-v="peca"]'); await H.dorme(200); await p.fill('#of-tobs','Graxa de lítio'); await p.click('[data-act="of-term-ok"]'); await H.dorme(500);
 s=await p.evaluate(()=>({f:__T.S().tt.fase,t:(document.getElementById('of-pt')||{}).value,o:(document.getElementById('of-po')||{}).value}));
 ok('"Falta peça" abre o pedido de peça já com a peça e a OS escolhidas', s.f==='ofpeca'&&s.t==='Graxa de lítio'&&s.o==='33', JSON.stringify(s));
 await p.fill('#of-pq','1 balde'); await p.click('[data-act="of-urg"][data-v="hoje"]'); await H.dorme(200); await p.click('[data-act="of-peca-ok"]'); await H.dorme(1500);
 c=await p.evaluate(()=>{ const S=__T.S(), pp=(S.pedpecas||[])[0], c=S.chamados.find(x=>x.numero===33); return {pp:pp&&{t:pp.t,q:pp.qtd,os:pp.os,u:pp.urg,st:pp.status,por:pp.porNome},ep:c.esperaPeca&&c.esperaPeca.t,f:S.tt.fase}; });
 ok('Pedido de peça gravado (texto, quantidade, OS, urgente, enviado) e a OS fica "esperando peça"', c.pp&&c.pp.t==='Graxa de lítio'&&c.pp.q==='1 balde'&&c.pp.os===33&&c.pp.u==='hoje'&&c.pp.st==='enviado'&&c.pp.por==='Bruno Lima'&&c.ep==='Graxa de lítio'&&c.f==='ofok', JSON.stringify(c));
 await p.keyboard.press('Escape'); await H.dorme(300);
 /* entrar junto na preventiva */
 await p.click('[data-act="of-junto"][data-n="34"]'); await H.dorme(1300);
 c=await p.evaluate(()=>{ const c=__T.S().chamados.find(x=>x.numero===34); return {e:c.exec,f:__T.S().tt.fase}; });
 ok('"Entrar junto (2º técnico)" na preventiva do Carlos', c.e.tecnico==='Carlos Souza'&&c.e.ajudante&&c.e.ajudante.nome==='Bruno Lima'&&c.f==='oftec', JSON.stringify(c));
 t=await txt(); ok('A preventiva vai para "Comigo" com "Fazer o checklist"', !!(await p.$('[data-act="cq-terminar"][data-n="34"]')), t.slice(0,300));
 /* quadro da semana */
 await p.click('[data-act="of-sem"]'); await H.dorme(500); t=await txt(); const nd=await p.$$eval('.of-sd',x=>x.length);
 ok('Quadro da semana: 5 dias, filtros e a tarefa com prazo', nd===5&&/Hoje ·/.test(t)&&/Só os meus/.test(t)&&/Sem ninguém/.test(t), nd+' '+t.slice(0,300).replace(/\n/g,'|'));
 await p.click('[data-act="of-sf"][data-v="todos"]'); await H.dorme(300); t=await txt(); ok('Filtro "Todos" mostra a tarefa do pátio no dia do prazo', /Lubrificar trilho/.test(t), t.slice(0,400).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/of-semana.png'});
 await p.keyboard.press('Escape'); await H.dorme(300); await p.keyboard.press('Escape'); await H.dorme(500);
 s=await p.evaluate(()=>__T.S().tt.fase); ok('Esc volta para a fila', s==='espera', s);
 /* trava */
 await p.click('[data-act="cq-sair"]'); await H.dorme(500); const tr=await p.evaluate(()=>!!document.getElementById('trava-m'));
 ok('Sair pede a senha de administrador (computador travado)', tr);
 await p.click('.trava-x'); await H.dorme(300);
 const srv=await p.evaluate(()=>localStorage.getItem('__srv')); await B.browser.close();
 /* Marcelo */
 B=await H.abrir({viewport:{width:1440,height:1000}}); p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,JSON.parse(srv)); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3500);
 const nav=await p.evaluate(()=>document.getElementById('navlist').innerText);
 ok('Menu do Marcelo tem "Pedidos de peça"', /Pedidos de peça/.test(nav), nav.replace(/\n/g,'|'));
 const alt=await p.evaluate(()=>{ document.querySelector('#tp-sino').click(); return new Promise(r=>setTimeout(()=>r(document.getElementById('tp-pop').innerText),300)); });
 ok('Sino: peça urgente e tarefa devolvida', /Peça urgente: Graxa de lítio/.test(alt)&&/devolvida por Bruno Lima/.test(alt), alt.replace(/\n/g,'|'));
 await p.keyboard.press('Escape');
 await p.click('#navlist [data-go="gxpec"]'); await H.dorme(1200); t=await p.evaluate(()=>document.getElementById('view').innerText);
 let pp=await p.evaluate(()=>(__T.S().pedpecas||[])[0]);
 ok('Tela "Pedidos de peça" mostra o pedido e marca como visto', /Graxa de lítio/.test(t)&&/Bruno Lima/.test(t)&&pp.status==='visto', pp&&pp.status);
 await p.click(`[data-act="gpc-st"][data-v="comprado"]`); await H.dorme(300); await p.fill('#gpc-prev','2026-12-01'); await p.click('[data-act="gpc-ok"]'); await H.dorme(1200);
 pp=await p.evaluate(()=>(__T.S().pedpecas||[])[0]);
 ok('"Comprado" com a data de chegada', pp.status==='comprado'&&pp.prev==='2026-12-01', JSON.stringify({st:pp.status,prev:pp.prev}));
 await p.screenshot({path:'/tmp/of-gxpec.png',fullPage:true});
 await p.click('#navlist [data-go="gxch"]'); await H.dorme(800); t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Chamados do Marcelo: "Devolvida por Bruno Lima: Falta peça ou material"', /Devolvida por Bruno Lima: Falta peça ou material/.test(t), t.slice(0,600).replace(/\n/g,'|'));
 await B.browser.close();
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU tudo ('+res.length+')'); process.exit(f?1:0); })().catch(e=>{ console.log('FALHOU',e); process.exit(1); });
