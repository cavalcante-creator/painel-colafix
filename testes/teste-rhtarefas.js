/* 31/10: Minha agenda (RH): tarefas com checklist, repetição e calendário (Dia, Semana, Mês), prazos do painel no dia,
   só as próprias tarefas; Pedidos do pessoal (Novo → Fazendo → Pronto → Entregue), avisar no WhatsApp, virar tarefa, números e avisos. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; d.users['juliana@painel-colafix.app']={uid:'uJu',pass:'ju1234',nome:'Juliana'}; D['perfis/uJu']={nome:'Juliana',usuario:'juliana'}; D['acessos/uJu']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 const dd=k=>{ const x=new Date(); x.setDate(x.getDate()+k); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }, hj=dd(0);
 D['rh/dados/funcionarios/a']={nome:'ANA SOUZA',status:'Ativo',tipo:'CLT',empresa:'COLAFIX',setor:'Linha 1',funcao:'Operador',telefone:'(51) 98888-7777',admissao:'2020-01-01',nascimento:'1990-'+hj.slice(5)};
 D['rh/dados/tarefas/t0']={t:'Conferir atestados de ontem',data:dd(-1),feita:false,uid:'uJu',em:'2026-10-01T10:00:00Z',itens:[]};
 D['rh/dados/tarefas/tx']={t:'Tarefa de outra pessoa',data:hj,feita:false,uid:'uOutra',em:'2026-10-01T10:00:00Z',itens:[]};
 D['rh/dados/pedidos/p0']={quem:'Bruno Rocha',tipo:'Holerite',oque:'2ª via do holerite de setembro',canal:'WhatsApp',prazo:dd(-2),st:'novo',em:'2026-10-20T10:00:00Z'};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'juliana','ju1234'); await H.dorme(3000);
 const view=()=>p.evaluate(()=>document.getElementById('view').innerText), srv=async c=>Object.entries(await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs)).filter(([k])=>k.startsWith(c+'/')).map(([k,v])=>Object.assign({_id:k.split('/').pop()},v));
 let s=await view(); ok('Início avisa: tarefa atrasada e pedido atrasado', /1 tarefa atrasada/.test(s)&&/Pedido atrasado/.test(s)&&/Bruno Rocha · Holerite/.test(s));
 const nav=await p.evaluate(()=>document.getElementById('sidebar')?document.getElementById('sidebar').innerText:document.body.innerText); ok('Menu ganhou "Minha agenda"', /Minha agenda/.test(nav), '');
 await p.evaluate(()=>__T.go('rhtarefas')); await H.dorme(900); s=await view();
 ok('Dia de hoje: atrasada em cima, prazo do painel (aniversário) e só as próprias tarefas', /Atrasadas[\s\S]*Conferir atestados de ontem/.test(s)&&/Prazos do painel[\s\S]*Ana Souza|Prazos do painel[\s\S]*ANA SOUZA/i.test(s)&&!/Tarefa de outra pessoa/.test(s)&&/1 pedido do pessoal em aberto/.test(s), (s.match(/Prazos do painel[^\n]*\n[^\n]*/)||[''])[0]);
 await p.fill('#rt-rap','Ligar para a clínica'); await p.keyboard.press('Enter'); await H.dorme(700); s=await view();
 ok('Escrever e Enter cria a tarefa de hoje', /Para hoje[\s\S]*Ligar para a clínica/.test(s)&&/0 de 1 feitas/.test(s));
 let ts=await srv('rh/dados/tarefas'); const t1=ts.find(x=>x.t==='Ligar para a clínica'); await p.click(`[data-act="rt-ok"][data-id="${t1._id}"]`); await H.dorme(600); s=await view();
 ok('Concluir: risca, conta 1 de 1 e vai para Feitas', /1 de 1 feitas · tudo feito/.test(s)&&/Tudo feito neste dia/.test(s)&&/Feitas \(1\)/.test(s)&&(await srv('rh/dados/tarefas')).find(x=>x._id===t1._id).feita===true);
 await p.click('[data-act="rt-nova"]'); await H.dorme(400); await p.fill('#rt-ft','Fechar a folha'); await p.fill('#rt-fh','09:00'); await p.selectOption('#rt-fp','alta'); await p.selectOption('#rt-fr','util'); await p.fill('#rt-fn','Ana Souza'); await p.fill('#rt-fi','Conferir faltas\nConferir atestados\nMandar para a contabilidade'); await p.click('[data-act="rt-fok"]'); await H.dorme(700);
 s=await view(); ts=await srv('rh/dados/tarefas'); const t2=ts.find(x=>x.t==='Fechar a folha');
 ok('Tarefa completa: hora, importante, checklist, pessoa e repetição', t2&&t2.hora==='09:00'&&t2.prio==='alta'&&t2.itens.length===3&&t2.funcId==='a'&&t2.rep==='util'&&/09:00[\s\S]*Fechar a folha[\s\S]*importante[\s\S]*AS\s*Ana Souza[\s\S]*todo dia útil[\s\S]*0 de 3/.test(s), t2&&JSON.stringify({h:t2.hora,f:t2.funcId}));
 await p.check(`[data-rt-it="${t2._id}"][data-i="0"]`); await H.dorme(500); ok('Marcar item do checklist grava', (await srv('rh/dados/tarefas')).find(x=>x._id===t2._id).itens[0].ok===true&&/1 de 3/.test(await view()));
 await p.click(`[data-act="rt-ok"][data-id="${t2._id}"]`); await H.dorme(800); ts=await srv('rh/dados/tarefas'); const prox=ts.find(x=>x.t==='Fechar a folha'&&!x.feita);
 const pu=(()=>{ const x=new Date(); do x.setDate(x.getDate()+1); while(x.getDay()===0||x.getDay()===6); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); })();
 ok('Repetição: ao concluir, cria a próxima no próximo dia útil, com o checklist desmarcado', prox&&prox.data===pu&&prox.itens.every(i=>!i.ok)&&prox.serie===t2._id&&!('_id' in (D[prox._id]||{})), prox&&prox.data+' esperado '+pu);
 await p.click('[data-act="rt-vis"][data-v="semana"]'); await H.dorme(500); s=await view(); ok('Semana: os 7 dias com as tarefas', (await p.$$('.rt-wd')).length===7&&/Fechar a folha/.test(s));
 await p.click('[data-act="rt-vis"][data-v="mes"]'); await H.dorme(500); const cel=await p.evaluate(d=>{ const b=document.querySelector(`.rt-cd[data-v="${d}"]`); return b&&b.outerHTML; },pu);
 ok('Mês: o dia mostra a tarefa com a cor da categoria', /rt-cx"><i style="--c:[^"]+">Fechar a folha/.test(cel||''), (cel||'').slice(0,300));
 await p.click(`.rt-cd[data-v="${pu}"]`); await H.dorme(500); s=await view(); ok('Tocar no dia abre o dia', await p.evaluate(()=>RHTar._T.vis)==='dia'&&/Fechar a folha/.test(s)&&/Voltar para hoje/.test(s));
 /* cores originais */
 ok('Cores originais (azul do painel), sem seletor de cor', await p.evaluate(()=>document.querySelector('.rt-wrap').dataset.tema)==='petroleo'&&!(await p.$('[data-act="rt-tema"]')));
 /* layout B */
 ok('Layout B: calendário do mês fixo ao lado, com pedidos e prazos embaixo', !!(await p.$('.rt-bl .rt-mcal'))&&!!(await p.$('.rt-bl .rt-bx'))&&(await p.$$('.rt-md')).length===42);
 await p.click('[data-act="rt-hoje"]').catch(()=>{}); await H.dorme(400); await p.click('.rt-md.on+.rt-md'); await H.dorme(400); const amanha=await p.evaluate(()=>RHTar._T.dia); ok('Tocar num dia do calendário abre o dia ao lado', !!amanha&&/Amanhã/.test(await view()), amanha);
 await p.click('[data-act="rt-hoje"]'); await H.dorme(300);
 /* atrasadas: passar para hoje */
 await p.click('[data-act="rt-hoje"]').catch(()=>{}); await H.dorme(400); await p.click('[data-act="rt-passar"]'); await H.dorme(600);
 ok('"Passar para hoje": a atrasada vem para hoje', (await srv('rh/dados/tarefas')).find(x=>x._id==='t0').data===hj&&!/Atrasadas/.test(await view()));
 /* pedidos */
 await p.evaluate(()=>__T.go('rhpedidos')); await H.dorme(800); s=await view(); ok('Pedidos: números e o atrasado em destaque', /1\s*em aberto/.test(s)&&/1\s*atrasado\b/.test(s)&&!!(await p.$('.rt-pc.atr')));
 await p.click('[data-act="rt-pnovo"]'); await H.dorme(400); await p.fill('#rt-pq','Ana Souza'); await p.selectOption('#rt-pt','Declaração'); await p.selectOption('#rt-pc','Pessoalmente'); await p.fill('#rt-po','Declaração de vínculo para o banco'); await p.click('[data-act="rt-pok"]'); await H.dorme(700);
 let ps=await srv('rh/dados/pedidos'); const pa=ps.find(x=>x.quem==='Ana Souza'); s=await view();
 ok('Novo pedido: liga com o cadastro (setor, telefone) e prazo de 2 dias úteis', pa&&pa.funcId==='a'&&pa.setor==='Linha 1'&&pa.tel==='(51) 98888-7777'&&pa.st==='novo'&&pa.prazo>hj&&/Declaração de vínculo para o banco/.test(s), pa&&JSON.stringify({st:pa.st,prazo:pa.prazo}));
 await p.click(`[data-act="rt-ptar"][data-id="${pa._id}"]`); await H.dorme(700); ts=await srv('rh/dados/tarefas'); const tp=ts.find(x=>x.pedidoId===pa._id);
 ok('Virar tarefa: entra na agenda com o prazo do pedido e o pedido vira "Fazendo"', tp&&tp.data===pa.prazo&&/Declaração: Declaração de vínculo para o banco \(Ana Souza\)/.test(tp.t)&&(await srv('rh/dados/pedidos')).find(x=>x._id===pa._id).st==='fazendo', tp&&tp.t);
 await p.click(`[data-act="rt-pst"][data-id="${pa._id}"][data-v="pronto"]`); await H.dorme(600);
 await p.evaluate(()=>{ window.__abriu=''; window.open=u=>{ window.__abriu=u; return null; }; }); await p.click(`[data-act="rt-pwa"][data-id="${pa._id}"]`); await H.dorme(300); const wu=await p.evaluate(()=>decodeURIComponent(window.__abriu));
 ok('Pronto: "Avisar no WhatsApp" abre a conversa da pessoa com a mensagem', /^https:\/\/wa\.me\/5551988887777\?text=Olá, Ana! Aqui é do RH da Colafix\. O seu pedido \(Declaração de vínculo para o banco\) está pronto/.test(wu), wu.slice(0,140));
 await p.click(`[data-act="rt-pst"][data-id="${pa._id}"][data-v="entregue"]`); await H.dorme(800); ps=await srv('rh/dados/pedidos'); ts=await srv('rh/dados/tarefas'); s=await view();
 ok('Entregue: sai de Em aberto, conta no mês e conclui a tarefa ligada', ps.find(x=>x._id===pa._id).st==='entregue'&&!!ps.find(x=>x._id===pa._id).entregueEm&&ts.find(x=>x.pedidoId===pa._id).feita===true&&/1\s*entregues em/.test(s)&&ps.find(x=>x._id===pa._id).hist.length>=3);
 await p.click('[data-act="rt-pfil"][data-v="entregue"]'); await H.dorme(400); ok('Filtro Entregues', /Declaração de vínculo/.test(await view())&&!/2ª via do holerite/.test(await view()));
 /* celular */ await p.setViewportSize({width:390,height:844});
 for(const v of ['rhtarefas','rhpedidos']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(600); }
 await p.evaluate(()=>{ RHTar._T.vis='mes'; Painel.render(); }); await p.evaluate(()=>__T.go('rhtarefas')); await H.dorme(600);
 const w1=await p.evaluate(()=>document.documentElement.scrollWidth); await p.evaluate(()=>__T.go('rhpedidos')); await H.dorme(500); const w2=await p.evaluate(()=>document.documentElement.scrollWidth);
 ok('No celular: calendário e pedidos sem rolar para o lado', w1<=390&&w2<=390, w1+' / '+w2);
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
