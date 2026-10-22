const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 /* relógio fixo às 15h de hoje: o teste não depende da hora em que roda (perto da meia-noite os números de "hoje" mudam) */
 const AGORA=new Date(); AGORA.setHours(15,0,0,0); const hoje=AGORA; const hs=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0')+'-'+String(hoje.getDate()).padStart(2,'0'); const ago=m=>new Date(AGORA.getTime()-m*60000).toISOString();
 d.users['chefe@painel-colafix.app']={uid:'uCHEFE',pass:'chefe1',nome:'Roberto'}; D['perfis/uCHEFE']={nome:'Roberto',usuario:'chefe'}; D['acessos/uCHEFE']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
 D['ordens/5001'].data=hs; D['ordens/5002'].data=hs; D['ordens/5001'].total=1000;
 D['entregas/e1']={ordem:'5001',num:'5001',linha:'Linha 1',qtd:300,em:ago(90),por:'x'}; D['entregas/e2']={ordem:'5001',num:'5001',linha:'Linha 1',qtd:200,em:ago(30),por:'x'};
 D['entregas/e3']={ordem:'5002',num:'5002',linha:'Linha 2',qtd:150,em:ago(200),por:'x'};
 D['paradas/p1']={linha:'Linha 2',motivo:'Falta de cimento',inicio:ago(45)}; D['paradas/p2']={linha:'Linha 1',motivo:'Outros',inicio:ago(120),fim:ago(100)};
 D['chamados/os-00001']={numero:1,linha:'Linha 2',defeito:'Compressor desarmou',impacto:'parou',nome:'Ana',status:'Aberta',criado:ago(40),equip:'Compressor 01',equipId:'eqcmp'};
 D['chamados/os-00002']={numero:2,linha:'Linha 1',defeito:'Barulho',impacto:'reduziu',nome:'Ana',status:'Aguardando peça',criado:ago(300)};
 D['chamados/os-00003']={numero:3,linha:'Linha 1',defeito:'Sensor',impacto:'nao',nome:'Ana',status:'Concluída',criado:ago(500),concluidoEm:ago(60)};
 D['silos/c1']={saldoKg:6000,medidoKg:6000,medidoEm:ago(10),atualizadoEm:ago(10),origem:'medicao'}; D['silos/c2']={saldoKg:40000,medidoKg:40000,medidoEm:ago(10),atualizadoEm:ago(10),origem:'medicao'}; D['silos/c3']={saldoKg:20000,medidoKg:20000,medidoEm:ago(10),atualizadoEm:ago(10),origem:'medicao'};
 // administradora: cargo pronto
 let B=await H.abrir(); await B.ctx.clock.setFixedTime(AGORA); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>{ __T.S().eq.aba='cargos'; __T.go('acessos'); }); await H.dorme(400); const cg=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Cargo pronto "Gestor (acompanha e age)" é o primeiro da lista', /Gestor \(acompanha e age\)/.test(cg)&&cg.indexOf('Gestor (acompanha')<cg.indexOf('Almoxarifado'));
 await B.browser.close();
 // chefe
 B=await H.abrir(); await B.ctx.clock.setFixedTime(AGORA); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'chefe','chefe1'); await H.dorme(2500); for(let i=0;i<40&&!(await p.evaluate(()=>!!(window.__T&&__T.S().siloLido&&__T.S()._chamLido&&__T.S().ordens.length)));i++) await H.dorme(250); await H.dorme(400);
 const v0=await p.evaluate(()=>__T.S().view); await p.evaluate(()=>__T.go('gestao')); await H.dorme(500);
 const e=await p.evaluate(()=>({v:__T.S().view,nav:document.getElementById('navlist').innerText,t:document.getElementById('view').innerText}));
 ok('Chefe entra direto na Visão do gestor (Início novo) e a tela antiga está em TVs; menu com Gestor, Silos, Produção e Manutenção', v0==='gxinicio'&&e.v==='gestao'&&/Visão do gestor/.test(e.nav)&&/Silos/.test(e.nav)&&/Produção/.test(e.nav)&&/Manutenção/.test(e.nav), e.nav.replace(/\n/g,'|'));
 const t=e.t.replace(/\n/g,' | ');
 ok('Linhas agora: Linha 1 produzindo (ordem, 500 de 1.000) e Linha 2 parada (motivo e chamado)', /LINHA 1|Linha 1/.test(t)&&/Ordem 5001 · 500 de 1\.000 \(50%\)/.test(t)&&/Linha 2 \| Parada há 4\d min \| Falta de cimento · OS 00001 Aberta/.test(t), t.slice(t.indexOf('LINHAS AGORA'),t.indexOf('LINHAS AGORA')+260));
 ok('Produção de hoje: 650 un (Linha 1 500, Linha 2 150)', /PRODUÇÃO DE HOJE \| 650 un/.test(t)&&/Linha 1 \| 500/.test(t)&&/Linha 2 \| 150/.test(t), t.slice(t.indexOf('PRODUÇÃO DE HOJE'),t.indexOf('PRODUÇÃO DE HOJE')+120));
 ok('Paradas de hoje: tempo parado e "1 linha parada agora"', /PARADAS DE HOJE \| 1 h 05/.test(t)&&/1 linha\(s\) parada\(s\) agora/.test(t), t.slice(t.indexOf('PARADAS DE HOJE'),t.indexOf('PARADAS DE HOJE')+130));
 ok('Manutenção: 2 abertos, 1 com máquina parada, 1 aguardando peça, 1 concluído hoje, mais antigo', /MANUTENÇÃO \| 2 aberto/.test(t)&&/1 com máquina parada/.test(t)&&/1 aguardando peça/.test(t)&&/1 concluído\(s\) hoje/.test(t)&&/Mais antigo \| OS 00002/.test(t), t.slice(t.indexOf('MANUTENÇÃO'),t.indexOf('MANUTENÇÃO')+200));
 ok('Silos: 66,0 t de cimento, % e silo crítico (Silo Pequeno 20%)', /SILOS · CIMENTO \| 66,0 t/.test(t)&&/crítico: Silo Pequeno/.test(t), t.slice(t.indexOf('SILOS · CIMENTO'),t.indexOf('SILOS · CIMENTO')+160));
 const nav=[]; for(const [sel,v] of [['programacao','programacao'],['paradas','manch'],['manch','manch'],['geral','geral']]){ await p.evaluate(()=>__T.go('gestao')); await H.dorme(250); await p.click(`.gs-c[data-go="${sel==='paradas'?'manch':sel}"]`); await H.dorme(300); nav.push(v+':'+(await p.evaluate(()=>__T.S().view))); }
 ok('Cada quadro abre a tela completa', nav.every(x=>{ const [a,b]=x.split(':'); return a===b; }), nav.join(' '));
 await p.evaluate(()=>{ __T.S().man.cur=1; __T.go('manch'); }); await H.dorme(400);
 const pode=await p.evaluate(()=>document.querySelectorAll('#view [data-act="mm-assumir"],#view [data-act="man-st"]').length);
 await p.evaluate(()=>{ __T.S().siloSel='c1'; __T.go('silos'); }); await H.dorme(300); const med=await p.evaluate(()=>!!document.querySelector('[data-act="sm-abrir"]'));
 ok('Ele pode agir: atender chamado e registrar medição', pode>0&&med, `botões de atendimento=${pode} · medição=${med}`);
 await p.evaluate(()=>__T.go('gestao')); await H.dorme(300); await p.screenshot({path:'/tmp/gestor-pc.png',fullPage:true});
 await p.setViewportSize({width:390,height:844}); await H.dorme(400); const lg=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]); await p.screenshot({path:'/tmp/gestor-cel.png',fullPage:true});
 ok('No celular: sem rolagem lateral', lg[0]<=lg[1], lg.join('/'));
 // atualiza sozinho
 await p.evaluate(()=>{ const v=JSON.parse(localStorage.getItem('__srv')); v.docs['paradas/p1'].fim=new Date().toISOString(); /* (relógio fixo) */ localStorage.setItem('__srv',JSON.stringify(v)); window.__mockReconnect(); }); await H.dorme(800);
 ok('Atualiza sozinho (parada encerrada some de "parada agora")', !/linha\(s\) parada\(s\) agora/.test(await p.evaluate(()=>document.getElementById('view').innerText)));
 await p.setViewportSize({width:1280,height:800}); await p.evaluate(()=>__T.go('gestao')); await H.dorme(400);
 const tvs=await p.evaluate(()=>[...document.querySelectorAll('.gs-tvc > b')].map(b=>b.innerText));
 await H.dorme(700);
 const viv=await p.evaluate(()=>[...document.querySelectorAll('.gs-live')].map(b=>({k:b.dataset.k,len:b.innerText.length,esc:(b.querySelector('.gs-in')||{style:{}}).style.transform||''})));
 ok('Todas as TVs em destaque, ao vivo e em tamanho pequeno (a tela de verdade reduzida)', tvs.length===10&&['Produção do dia','Previsto × Realizado','Detalhamento do Previsto × Realizado','Previsão mensal por item','Indicadores da manutenção','Nível dos silos','Monitor do almoxarifado','Silos','Calendário da semana','Manutenção'].every(n=>tvs.includes(n))&&viv.length===10&&viv.every(v=>v.len>30&&/scale/.test(v.esc)), viv.map(v=>v.k+':'+v.len+':'+v.esc).join(' '));
 await p.evaluate(()=>{ const v=JSON.parse(localStorage.getItem('__srv')); v.docs['chamados/os-00077']={numero:77,linha:'Linha 1',defeito:'Correia arrebentou agora',impacto:'parou',nome:'Ana',status:'Aberta',criado:new Date().toISOString()}; localStorage.setItem('__srv',JSON.stringify(v)); window.__mockReconnect(); }); await H.dorme(900);
 ok('Miniatura da TV da manutenção atualiza sozinha', /Correia arrebentou|00077/.test(await p.evaluate(()=>(document.querySelector('.gs-live[data-k="manut"]')||{}).innerText||'')));
 await p.screenshot({path:'/tmp/gestor-tvs.png'});
 await p.click('.gs-tvc[data-k="manut"]',{position:{x:20,y:20}}); await H.dorme(600); const a1=await p.evaluate(()=>({on:__T.S().apres.on,v:__T.S().view,n:__T.S().apres.lista.length}));
 await p.keyboard.press('Escape'); await H.dorme(600); const a2=await p.evaluate(()=>({on:__T.S().apres.on,v:__T.S().view}));
 ok('Toque numa TV: abre só ela em tela cheia; Esc volta para o resumo', a1.on&&a1.v==='tvnman'&&a1.n===1&&!a2.on&&a2.v==='gestao', JSON.stringify([a1,a2]));
 await p.click('[data-act="gs-tv-todas"]'); await H.dorme(600); const a3=await p.evaluate(()=>({on:__T.S().apres.on,n:__T.S().apres.lista.length,v:__T.S().view}));
 await p.screenshot({path:'/tmp/gestor-tv-cheia.png'}); await p.keyboard.press('Escape'); await H.dorme(500);
 ok('"Passar todas as TVs" passa as 10 telas em sequência', a3.on&&a3.n===10, JSON.stringify(a3));
 await p.screenshot({path:'/tmp/gestor-pc2.png'});
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
