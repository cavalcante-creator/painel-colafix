const H=require('./harness'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,230):'')); };
(async()=>{ const hoje=new Date('2026-10-08T10:00:00'); /* quinta-feira: o teste não depende do dia em que roda */ const hs='2026-10-08';
 let {d}=H.seed((d)=>{ d.users['fernando@painel-colafix.app']={uid:'uFER',pass:'fer123',nome:'Fernando'}; d.docs['perfis/uFER']={nome:'Fernando',usuario:'fernando'};
  d.docs['acessos/uFER']={perfil:'consulta',mods:['silosver','cal'],locais:[],ativo:true};
  d.docs['ordens/5001'].data=hs; d.docs['ordens/5002'].data=hs; d.docs['ordens/5002'].produto='AC3009 - PRODUTO DA LINHA DOIS';
  d.docs['silos/c2']={saldoKg:9500,medidoKg:10000,medidoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString(),origem:'consumo'}; });
 // ---- dona: escolhe o cargo e a linha do Fernando ----
 let B=await H.abrir(); await B.ctx.clock.setFixedTime(hoje); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>{ __T.S().eq.aba='cargos'; __T.S().eq.maisCg=true; __T.go('acessos'); }); await H.dorme(400);
 ok('Cargo pronto "Silos e calendário (só consulta)" aparece em Equipe e cargos', /Silos e calendário \(só consulta\)/.test(await p.evaluate(()=>document.getElementById('view').innerText)));
 await p.evaluate(()=>{ __T.S().eq.aba='pessoas'; __T.go('acessos'); }); await H.dorme(400);
 await p.selectOption('select[data-eq-linhas="uFER"]','Linha 1'); await H.dorme(600);
 let srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); ok('Dona escolhe "Linha 1" para o calendário do Fernando', JSON.stringify(srv['acessos/uFER'].linhas)==='["Linha 1"]');
 await p.selectOption('select[data-eq-cargo="uFER"]','silosver'); await H.dorme(700); await p.selectOption('select[data-eq-cargo="uFER"]','consulta'); await H.dorme(900);
 srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 ok('Trocar o cargo não apaga a linha escolhida', srv['acessos/uFER'].perfil==='consulta'&&JSON.stringify(srv['acessos/uFER'].linhas)==='["Linha 1"]', JSON.stringify({p:srv['acessos/uFER'].perfil,l:srv['acessos/uFER'].linhas}));
 d.docs=srv; await B.browser.close();
 // ---- Fernando ----
 B=await H.abrir(); await B.ctx.clock.setFixedTime(hoje); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'fernando','fer123'); await H.dorme(4500);
 const nav=await p.evaluate(()=>document.getElementById('navlist').innerText.replace(/\n/g,'|'));
 ok('Fernando vê só Calendário (em Produção) e Nível dos silos no menu', /Produção/.test(nav)&&/Nível dos silos/.test(nav)&&!/Manutenção|Silos\|/.test(nav), nav);
 await p.evaluate(()=>__T.go('calendario')); await H.dorme(500);
 const cal=await p.evaluate(()=>({t:document.getElementById('view').innerText, chips:[...document.querySelectorAll('[data-act="c-linha"]')].map(b=>b.innerText), add:document.querySelectorAll('.cadd').length, arrasta:[...document.querySelectorAll('[draggable="true"]')].map(el=>{ const ev=new DragEvent('dragstart',{bubbles:true,cancelable:true}); el.dispatchEvent(ev); return ev.defaultPrevented; }), ro:!!document.querySelector('.calro')}));
 ok('Calendário mostra só a Linha 1 (título, linhas e ordens)', /Calendário · Linha 1/.test(cal.t)&&/5001/.test(cal.t)&&!/5002|LINHA DOIS/.test(cal.t)&&!cal.chips.includes('Linha 2'), 'chips: '+cal.chips.join(',')+' · tem 5001='+/5001/.test(cal.t)+' · tem 5002='+/5002/.test(cal.t));
 ok('Calendário só de consulta (sem botão de adicionar; arrastar é bloqueado)', cal.ro&&cal.add===0&&cal.arrasta.every(Boolean)&&/só visualização/.test(cal.t), 'adicionar='+cal.add+' · arrastos bloqueados='+cal.arrasta.join(','));
 await p.fill('#c-busca','5002'); await p.dispatchEvent('#c-busca','input'); await H.dorme(400);
 ok('Buscar a ordem de outra linha não mostra nada', !/LINHA DOIS/.test(await p.evaluate(()=>document.getElementById('view').innerText)));
 await p.fill('#c-busca',''); await p.dispatchEvent('#c-busca','input'); await H.dorme(200);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:10000}).catch(()=>null),p.click('[data-act="cal-html"]')]);
 let html=''; if(dl){ const f='/tmp/cal-fernando.html'; await dl.saveAs(f); html=fs.readFileSync(f,'utf8'); }
 ok('O calendário baixado (HTML) também só leva a Linha 1', html&&/Linha 1/.test(html)&&!/Linha 2/.test(html), dl?'arquivo '+html.length+' bytes':'sem download');
 await p.evaluate(()=>__T.go('silosver')); await H.dorme(300);
 ok('Nível dos silos funciona para ele', /9,5\s*t/.test(await p.evaluate(()=>document.getElementById('view').innerText)));
 const tent=[]; for(const v of ['programacao','geral','medicao','paradas','manch','ajustes']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(150); tent.push(v+'→'+await p.evaluate(()=>__T.S().view)); }
 ok('Não abre nenhuma outra tela', tent.every(x=>/→(silosver|calendario)$/.test(x)), tent.join(' '));
 const silosOK=await p.evaluate(()=>{ __T.go('silosver'); return true; });
 console.log('erros:', B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
