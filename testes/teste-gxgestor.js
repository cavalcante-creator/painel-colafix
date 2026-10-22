/* Login do gestor (js/29-gestor.js): Início, Produção, Relatório do dia/mês (toneladas e meta da Curva S),
   segurança, plano de ação, turnos, calendário de preventivas e PDF. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 const AGORA=new Date(); AGORA.setHours(15,0,0,0); const hs=AGORA.getFullYear()+'-'+String(AGORA.getMonth()+1).padStart(2,'0')+'-'+String(AGORA.getDate()).padStart(2,'0'), cp=hs.slice(0,7); const ago=m=>new Date(AGORA.getTime()-m*60000).toISOString();
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Maciel de Souza'}; D['perfis/uMAR']={nome:'Marcelo Maciel de Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
 D['ordens/5001'].data=hs; D['ordens/5001'].produto='IT100 - ARGAMASSA AC1 20KG'; D['ordens/5001'].total=1000; D['ordens/5002'].data=hs; D['ordens/5002'].produto='IT200 - ARGAMASSA AC2 25KG';
 D['pcpbase/prev']={mes:{[cp]:{IT100:21000,IT200:10500}}}; D['pcpbase/itens']={l:{IT100:{d:'ARGAMASSA AC1 20KG',ln:['Linha 1']},IT200:{d:'ARGAMASSA AC2 25KG',ln:['Linha 2']}}};
 D['entregas/e1']={ordem:'5001',num:'5001',linha:'Linha 1',qtd:300,em:ago(90),por:'x'}; D['entregas/e2']={ordem:'5001',num:'5001',linha:'Linha 1',qtd:200,em:ago(30),por:'x'};
 D['entregas/e3']={ordem:'5002',num:'5002',linha:'Linha 2',qtd:400,em:ago(200),por:'x'};
 D['paradas/p1']={linha:'Linha 2',motivo:'Falta de cimento',inicio:ago(45)}; D['paradas/p2']={linha:'Linha 1',motivo:'Outros',inicio:ago(120),fim:ago(90)}; D['paradas/p3']={linha:'Linha 1',motivo:'Setup',inicio:ago(80),fim:ago(60)};
 D['chamados/os-00001']={numero:1,linha:'Linha 2',defeito:'Compressor desarmou',impacto:'parou',nome:'Ana',status:'Aberta',criado:ago(40)};
 D['chamados/os-00003']={numero:3,linha:'Linha 1',defeito:'Sensor',impacto:'nao',nome:'Ana',status:'Concluída',criado:ago(500),concluidoEm:ago(60)};
 const B=await H.abrir({viewport:{width:1440,height:900}}); await B.ctx.clock.setFixedTime(AGORA); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(2500);
 for(let i=0;i<40&&!(await p.evaluate(()=>!!(window.__T&&__T.S()._chamLido&&__T.S().ordens.length&&__T.S().anl&&__T.S().anl.base&&__T.S().anl.base.prev)));i++) await H.dorme(250); await H.dorme(800);
 const tx=()=>p.evaluate(()=>document.getElementById('view').innerText);
 let e=await p.evaluate(()=>({v:__T.S().view,nav:document.getElementById('navlist').innerText+' || '+document.getElementById('view').innerText.slice(0,200)}));
 ok('Marcelo entra no Início novo; o menu da Visão do gestor tem Início, Produção, Relatórios, Plano de ação, Segurança, Preventivas, Turnos e TVs', e.v==='gxinicio'&&['Início','Produção','Relatórios','Plano de ação','Segurança','Preventivas','Turnos','TVs da fábrica'].every(x=>e.nav.includes(x))&&!/Relatório do mês/.test(e.nav), e.v+' | '+e.nav.replace(/\n/g,'|'));
 let t=await tx();
 ok('Início: "Precisa de você" com a Linha 2 parada e o chamado sem técnico', /Precisa de você/.test(t)&&/Linha 2 parada há/.test(t)&&/Chamado 00001 sem técnico/.test(t), t.slice(0,400).replace(/\n/g,'|'));
 /* 500 sacos de 20 kg + 400 de 25 kg = 10 t + 10 t = 20,0 t */
 ok('Início: produção até agora em toneladas pelo peso do saco (20,0 t)', /Produzido hoje\s*20,0 t/i.test(t), (t.match(/Produzido hoje[^\n]*\n[^\n]*/i)||[''])[0]);
 ok('Início: segurança ainda "Falta preencher"', /Falta preencher/.test(t));
 await p.evaluate(()=>__T.go('gxdia')); await H.dorme(900); t=await tx();
 ok('Relatório do dia: produção 20,0 t, 900 sacos e a meta do dia da Curva S', /Produção do dia\s*20,0 t/i.test(t)&&/900 sacos/.test(t)&&!/Meta do dia\s*—/i.test(t), (t.match(/Produção do dia[\s\S]{0,140}/i)||[''])[0].replace(/\n/g,'|'));
 ok('Relatório do dia: paradas sem o setup (Linha 2 aberta + 30 min da Linha 1) e a tabela por linha', /Setup \(setup, não conta\)|setup, não conta/.test(t)&&/Linha 1\s*10,0\s*500/.test(t)&&/Linha 2\s*10,0\s*400/.test(t), (t.match(/Linha 1\s*10,0[^\n]*/)||[''])[0]);
 ok('Relatório do dia: chamado 00001 na corretiva e a faixa dos dias anteriores', /00001/.test(t)&&/Dias anteriores/.test(t));
 /* PDF do dia abre a janela de impressão */
 const [pop]=await Promise.all([B.ctx.waitForEvent('page',{timeout:5000}).catch(()=>null),p.click('[data-act="gx-pdf-dia"]')]);
 let pt=''; if(pop){ await pop.waitForLoadState().catch(()=>{}); pt=await pop.evaluate(()=>document.body.innerText).catch(()=>''); await pop.close().catch(()=>{}); }
 ok('"Baixar PDF do dia" abre o relatório pronto para salvar em PDF', /Relatório do dia/.test(pt)&&/Produção por linha/.test(pt)&&!/Nova OS corretiva/.test(pt), pt.slice(0,200).replace(/\n/g,'|'));
 /* mês */
 await p.click('[data-go="gxmes"]'); await H.dorme(900); t=await tx();
 ok('Relatório do mês: produção do mês, curva S, por linha e paradas por causa', /Produção do mês/i.test(t)&&/Curva S do mês/.test(t)&&/Por linha/.test(t)&&/Paradas por causa/.test(t)&&/Falta de cimento/.test(t), [/Produção do mês/.test(t),/Curva S do mês/.test(t),/Por linha/.test(t),/Paradas por causa/.test(t),/Falta de cimento/.test(t)].join()+t.slice(t.indexOf('Paradas por causa'),t.indexOf('Paradas por causa')+300).replace(/\n/g,'|'));
 /* segurança */
 await p.evaluate(()=>__T.go('gxseg')); await H.dorme(600);
 await p.fill('#gx-s-oc','0'); await p.fill('#gx-s-pe','13'); await p.fill('#gx-s-de','1'); await p.fill('#gx-s-ob','Empilhadeira sem cinto'); await p.click('[data-act="gx-seg-salvar"]'); await H.dorme(900);
 const sg=await p.evaluate(h=>__T.S().gxSeg[h],hs);
 ok('Pessoas e segurança: salva o dia (13 pessoas, 1 desvio, observação)', sg&&sg.pessoas===13&&sg.desvios===1&&sg.ocorr===0&&/Empilhadeira/.test(sg.obs), JSON.stringify(sg));
 /* plano de ação */
 await p.evaluate(()=>__T.go('gxacoes')); await H.dorme(500); await p.click('[data-act="gx-ac-nova"]'); await H.dorme(400);
 await p.fill('#gx-af-o','Trocar sensor da ensacadeira L2'); await p.fill('#gx-af-q','Manutenção'); await p.fill('#gx-af-p','2000-01-01'); await p.click('[data-act="gx-ac-salvar"]'); await H.dorme(1200); t=await tx();
 ok('Plano de ação: nova ação aparece e, com prazo vencido, fica "Atrasada"', /Trocar sensor da ensacadeira L2/.test(t)&&/Atrasada/.test(t), t.slice(0,300).replace(/\n/g,'|'));
 const aid=await p.evaluate(()=>(__T.S().gxAcoes[0]||{})._id); await p.selectOption(`[data-gxac-st="${aid}"]`,'ok'); await H.dorme(900);
 const ac=await p.evaluate(id=>__T.S().gxAcoes.find(a=>a._id===id),aid);
 ok('Plano de ação: mudar a situação para Concluída grava', ac&&ac.st==='ok', JSON.stringify(ac));
 /* turnos */
 await p.evaluate(()=>__T.go('gxturnos')); await H.dorme(500); t=await tx();
 ok('Turnos: mostra o turno normal 07:30 às 18:00 (10 h 30)', /Turno normal/.test(t)&&/07:30 às 18:00/.test(t)&&/10 h 30/.test(t));
 await p.click('[data-act="gx-t-novo"]'); await H.dorme(300); await p.fill('#gx-t-n','Sábado hora extra'); await p.fill('#gx-t-i','07:30'); await p.fill('#gx-t-f','12:00'); await p.fill('#gx-t-v','0');
 for(const v of ['1','2','3','4','5']) await p.click(`[data-act="gx-t-dia"][data-v="${v}"]`); await p.click('[data-act="gx-t-dia"][data-v="6"]'); await H.dorme(200); await p.click('[data-act="gx-t-salvar"]'); await H.dorme(900);
 const tu=await p.evaluate(()=>__T.S().cfg.turnos);
 ok('Turnos: novo turno de sábado salvo junto com o normal', Array.isArray(tu)&&tu.length===2&&tu.some(x=>x.nome==='Sábado hora extra'&&x.dias.join()==='6'&&x.ini==='07:30'&&x.fim==='12:00'), JSON.stringify(tu));
 /* calendário de preventivas */
 await p.evaluate(()=>__T.go('gxcal')); await H.dorme(700); const dd=await p.evaluate(()=>{ const b=document.querySelector('[data-act="gx-cal-add"][data-d]'); return b&&b.dataset.d; });
 await p.click(`.gx-cg [data-act="gx-cal-add"][data-d="${hs}"]`).catch(()=>p.click('[data-act="gx-cal-add"]')); await H.dorme(400);
 await p.selectOption('#gx-pv-e','eqmix1'); await p.fill('#gx-pv-t','Lubrificar rolamentos'); await p.fill('#gx-pv-r','Equipe mecânica'); await p.click('[data-act="gx-cal-salvar"]'); await H.dorme(1500);
 const pv=await p.evaluate(()=>((__T.S().mx||{}).cfg||{}).prev||[]); t=await tx();
 ok('Calendário: agendar preventiva grava na lista de preventivas e aparece no dia', pv.some(x=>x.tarefa==='Lubrificar rolamentos'&&x.equip==='eqmix1'&&+x.freq===30&&x.resp==='Equipe mecânica')&&/Lubrificar rolamentos/.test(t), JSON.stringify(pv.map(x=>x.tarefa)));
 /* produção */
 await p.evaluate(()=>__T.go('gxprod')); await H.dorme(800); t=await tx();
 ok('Produção · visão do gestor: atenção, ritmo do mês, linhas, silos, diário, paradas e ordens atrasadas', ['O que precisa de atenção','Ritmo do mês','Todas as linhas','Silos','Diário de bordo','Paradas hoje','Ordens atrasadas'].every(x=>t.includes(x)), t.slice(0,300).replace(/\n/g,'|'));
 /* paradas, cadastros e e-mail (o que faltou) */
 await p.evaluate(()=>__T.go('gxpar')); await H.dorme(700); t=await tx();
 ok('Paradas: Pareto por causa, motivo e linha, horas por semana e a lista', /Por causa/.test(t)&&/Por motivo/.test(t)&&/Por linha/.test(t)&&/Horas paradas por semana/.test(t)&&/Falta de cimento/.test(t)&&!/\bSetup\b/.test((t.match(/Todas as paradas[\s\S]*/)||[''])[0]), t.slice(0,240).replace(/\n/g,'|'));
 await p.selectOption('[data-gxpar-c="p2"]','Operacional'); await H.dorme(700);
 ok('Paradas: classificar a causa grava na parada', await p.evaluate(()=>(__T.S().paradas.find(x=>x._id==='p2')||{}).causa==='Operacional'));
 await p.click('[data-act="gx-par-acao"][data-id="p1"]'); await H.dorme(400); const pre=await p.evaluate(()=>({t:(document.getElementById('gx-af-o')||{}).value,o:(document.getElementById('gx-af-g')||{}).value}));
 await p.click('[data-act="gx-ac-salvar"]'); await H.dorme(900);
 ok('Paradas: "Virar ação" abre a ação já preenchida (origem Parada) e salva no plano', /Falta de cimento na Linha 2/.test(pre.t)&&pre.o==='Parada'&&await p.evaluate(()=>__T.S().gxAcoes.some(a=>/Falta de cimento/.test(a.t)&&a.origem==='Parada')), JSON.stringify(pre));
 await p.evaluate(()=>__T.go('gxcad')); await H.dorme(500); await p.fill('#gx-cad-motivos','Falta de embalagem'); await p.click('[data-act="gx-cad-add"][data-k="motivos"]'); await H.dorme(700);
 await p.fill('#gx-cad-equipes','Equipe de solda'); await p.click('[data-act="gx-cad-add"][data-k="equipes"]'); await H.dorme(700);
 const cf=await p.evaluate(()=>({m:__T.S().cfg.motivos,e:__T.S().cfg.manEquipes}));
 ok('Cadastros: novo motivo de parada e nova equipe de manutenção salvos', cf.m.includes('Falta de embalagem')&&cf.e.includes('Equipe de solda')&&cf.e.includes('Equipe mecânica'), JSON.stringify(cf));
 await p.evaluate(()=>__T.go('gxdia')); await H.dorme(600);
 ok('Relatório do dia tem "Enviar por e-mail"', !!(await p.$('[data-act="gx-email"]')));
 const errs=(B.erros||[]).filter(x=>!/favicon|fonts\.g|Failed to load resource/i.test(x)); ok('Sem erros no console', !errs.length, errs.join(' | '));
 /* celular */
 await p.setViewportSize({width:390,height:800}); await p.evaluate(()=>__T.go('gxinicio')); await H.dorme(600);
 const lado=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2); ok('Celular: o Início não rola para o lado', !lado);
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
