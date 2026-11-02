/* 02/11: pedidos de ajuste 1–8.
   RH (Juliana): sem barra de abas repetida no computador (fica no celular); Terceirizados fora do menu; Início mais curto (abas "Mais");
   férias: tirar o dono do controle e voltar; Gerar contrato com nome e função sem encavalar; Fichas: imprimir o mês todo num botão,
   mês que vem e o quadro do fim do mês.
   Produção: apontamentos antecipados em evidência (Programação, apontamento em lote, Já descontei). O PDF por linha está no teste-prodlinha. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
function banco(){ const {d}=seedManut(); const D=d.docs; d.users['juliana@painel-colafix.app']={uid:'uJu',pass:'ju1234',nome:'Juliana'}; D['perfis/uJu']={nome:'Juliana',usuario:'juliana'}; D['acessos/uJu']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/dados/funcionarios/a']={nome:'ANA SOUZA',status:'Ativo',tipo:'CLT',empresa:'COLAFIX',setor:'Linha 1',funcao:'Operador de Máquina',admissao:'2021-01-10'};
  D['rh/dados/funcionarios/b']={nome:'GABRIELA TORRES DA SILVA',status:'Ativo',tipo:'CLT',empresa:'COLAFIX',setor:'Expedição',funcao:'Motorista Operador de Empilhadeira de Grande Porte',admissao:'2022-03-10'};
  D['rh/dados/funcionarios/c']={nome:'BRUNO ROCHA',status:'Ativo',tipo:'PJ',empresa:'ZENITH',setor:'Linha 2',funcao:'Mecânico',admissao:'2023-01-10'};
  D['rh/dados/funcionarios/fx']={nome:'FRANCISCO DONO',status:'Ativo',tipo:'CLT',empresa:'COLAFIX',setor:'Diretoria',funcao:'Diretor',admissao:'2010-03-01'};
  D['rh/dados/funcoes/f1']={nome:'Operador de Máquina',epis:[{nome:'Luva',ca:'123'}],uniforme:[{nome:'Camisa'}]};
  D['rh/dados/modelos/m1']={nome:'Contrato de experiência',vale:'CLT',html:'<p>Contrato de <span class="rh-tk" data-k="NOME">NOME</span></p>'};
  for(let i=0;i<9;i++) D['rh/dados/ferias/z'+i]={funcId:'a',aquisitivo:'2099-01-01',dias:1,status:'cancelada'};
  return d; }
(async()=>{ let B=await H.abrir({viewport:{width:1440,height:900}}), p=B.page; p.on('dialog',x=>x.accept()); let d=banco(); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'juliana','ju1234'); await H.dorme(3000);
  const view=()=>p.evaluate(()=>document.getElementById('view').innerText), srv=k=>p.evaluate(k=>JSON.parse(localStorage.getItem('__srv')).docs[k],k);
  /* 3 · barra de abas repetida */
  await p.evaluate(()=>__T.go('rhtarefas')); await H.dorme(900);
  let s=await p.evaluate(()=>{ const t=document.querySelector('#view .gxg-tabs'); return {tem:!!t,vis:t?getComputedStyle(t).display!=='none':false,lat:[...document.querySelectorAll('#navlist .gxg-si')].map(b=>b.innerText.trim())}; });
  ok('Minha agenda (computador): a barra de abas de cima some; as abas ficam na lateral', s.tem&&!s.vis&&s.lat.includes('Tarefas e calendário')&&s.lat.includes('Pedidos do pessoal'), JSON.stringify(s));
  /* 5 · Terceirizados fora do menu */
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(900);
  s=await p.evaluate(()=>document.getElementById('navlist').innerText);
  ok('Pessoas: sem "Terceirizados" na lateral (nem solto no fim do menu)', /Funcionários/.test(s)&&!/Terceirizados/.test(s), s.replace(/\n/g,'|'));
  /* 4 · Início mais curto */
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(1000);
  s=await p.evaluate(()=>({h:document.documentElement.scrollHeight,t:document.getElementById('view').innerText,av:document.querySelectorAll('#view .rh-av').length}));
  ok('Início: "Mais" com abas fechadas, sem perguntas/atalhos/avisos das TVs abertos, no máximo 4 avisos', /Mais\s*Avisos nas TVs\s*Aniversários do mês\s*Perguntas rápidas\s*Atalhos/.test(s.t)&&!/Quem faz aniversário em/.test(s.t)&&!/Ficha pelo celular/.test(s.t)&&s.av<=4, 'altura '+s.h+' avisos '+s.av);
  await p.click('[data-act="rh-itab"][data-v="atl"]'); await H.dorme(600); s=await view();
  ok('Aba Atalhos abre os atalhos (sem Terceirizados)', /Ficha pelo celular/.test(s)&&/Relatório do mês/.test(s)&&!/Terceirizados/.test(s));
  await p.click('[data-act="rh-itab"][data-v="perg"]'); await H.dorme(600); s=await view();
  ok('Aba Perguntas rápidas troca o conteúdo', /Quem faz aniversário em/.test(s)&&!/Ficha pelo celular/.test(s));
  await p.click('[data-act="rh-itab"][data-v="perg"]'); await H.dorme(600); s=await view();
  ok('Tocar de novo fecha', !/Quem faz aniversário em/.test(s));
  const nAv=await p.evaluate(()=>document.querySelectorAll('[data-act="rh-iavt"]').length);
  if(nAv){ await p.click('[data-act="rh-iavt"]'); await H.dorme(500); }
  ok('"Ver todos" mostra todos os avisos', !nAv||await p.evaluate(()=>document.querySelectorAll('#view .rh-av').length>4));
  /* 6 · férias: tirar o dono */
  await p.evaluate(()=>{ __T.go('rhferias'); }); await H.dorme(1000);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/^Férias \(CLT\)/.test(x.innerText.trim())); b&&b.click(); }); await H.dorme(600);
  s=await view(); ok('Férias: o dono aparece vencido e tem "Não controlar"', /FRANCISCO DONO/.test(s)&&!!(await p.$('[data-act="rh-semfer"][data-id="fx"]')));
  await p.click('[data-act="rh-semfer"][data-id="fx"]'); await H.dorme(900); s=await view(); let fx=await srv('rh/dados/funcionarios/fx');
  ok('"Não controlar": grava semFerias e ele sai da lista (fica embaixo, com "voltar")', fx.semFerias===true&&!!fx.semFeriasEm&&/Fora do controle de férias:\s*Francisco Dono/.test(s)&&!/FRANCISCO DONO/.test(s), JSON.stringify(fx).slice(0,160));
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(800); s=await view();
  ok('Funcionários: o dono não aparece mais com "Férias vencidas"', !/FRANCISCO DONO[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Férias vencidas/.test(s));
  await p.evaluate(()=>__T.go('rhferias')); await H.dorme(800); await p.click('[data-act="rh-comfer"][data-id="fx"]'); await H.dorme(800); fx=await srv('rh/dados/funcionarios/fx'); s=await view();
  ok('"voltar" põe de volta no controle', fx.semFerias===false&&/FRANCISCO DONO/.test(s));
  /* 7 · Gerar contrato */
  await p.evaluate(()=>__T.go('rhdocs')); await H.dorme(700); await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Gerar contrato').click()); await H.dorme(800);
  s=await p.evaluate(()=>[...document.querySelectorAll('.rh-v2dp')].map(b=>{ const r=b.getBoundingClientRect(), xs=[...b.children].map(c=>c.getBoundingClientRect()); return {h:r.height,cabe:xs.every(c=>c.top>=r.top-0.5&&c.bottom<=r.bottom+0.5),linhas:b.children.length}; }));
  ok('Gerar contrato (uma pessoa): nome, função e setor em linhas separadas, dentro do quadro de cada pessoa', s.length>=4&&s.every(x=>x.cabe&&x.linhas===3&&x.h>=52), JSON.stringify(s.slice(0,3)));
  await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Várias pessoas').click()); await H.dorme(800);
  s=await p.evaluate(()=>[...document.querySelectorAll('.rh-lfp')].map(l=>{ const r=l.getBoundingClientRect(), b=l.querySelector('b'), sm=l.querySelector('small'); return {cabe:b&&sm&&b.getBoundingClientRect().bottom<=sm.getBoundingClientRect().top+1&&sm.getBoundingClientRect().bottom<=r.bottom+1,t:l.innerText.replace(/\n/g,' / ')}; }));
  ok('Várias pessoas: nome em cima e "função · setor" embaixo, sem encavalar', s.length>=3&&s.every(x=>x.cabe)&&s.some(x=>/GABRIELA TORRES DA SILVA \/ Motorista Operador/.test(x.t)), JSON.stringify(s.slice(0,2)));
  /* 8 · Fichas: um botão para imprimir o mês, mês que vem */
  await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(1200); s=await p.evaluate(()=>document.querySelector('#view .head').innerText);
  ok('Fichas: botão principal "Imprimir as fichas de <mês>", "Mais opções" e o mês que vem', /Imprimir as fichas de/.test(s)&&/Mais opções/.test(s)&&/›/.test(s)&&!/Gerar e imprimir/.test(s), s.replace(/\n/g,'|'));
  const m0=await p.evaluate(()=>document.querySelector('#view h1').innerText); await p.click('[data-act="rh-fmes"][data-v="1"]'); await H.dorme(800);
  const m1=await p.evaluate(()=>document.querySelector('#view h1').innerText);
  ok('Dá para ir ao mês que vem', m1!==m0&&!(await p.$('[data-act="rh-fmes"][data-v="1"]')), m0+' → '+m1);
  await p.screenshot({path:'/tmp/aj0211-fichas.png'});
  ok('Sem erros de JavaScript (RH)', !B.erros.filter(e=>!/404|Failed to load/.test(e)).length, B.erros.filter(e=>!/404|Failed to load/.test(e)).join(' | '));
  await B.browser.close();
  /* fim do mês: quadro "Fichas de <mês que vem>" */
  B=await H.abrir({viewport:{width:1440,height:900}}); p=B.page; await B.ctx.clock.setFixedTime(new Date('2026-11-25T10:00:00-03:00')); d=banco(); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'juliana','ju1234'); await H.dorme(3000);
  await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(1200); s=await view();
  ok('Últimos 10 dias do mês: quadro "Fichas de dezembro" com o botão de imprimir e a dica da impressora', /FIM DO MÊS\s*Fichas de dezembro/i.test(s)&&/Imprimir as fichas de dezembro/.test(s)&&/Paisagem/.test(s), (s.match(/FIM DO MÊS[^]*?setor/i)||[''])[0].replace(/\n/g,'|'));
  await p.evaluate(()=>{ window.__prep=null; }); await p.click('.rh-fprox [data-act="rh-fimpprox"]:not([data-setor])'); await H.dorme(1500);
  s=await p.evaluate(()=>({v:__T.S().view,h:document.querySelector('#view h1').innerText,back:(document.querySelector('[data-act="rh-fvmes"]')||{}).innerText||''}));
  ok('Imprimir as fichas de dezembro: abre o gerador já em dezembro', s.v==='rhfichas'&&/Gerar e imprimir/.test(s.h)&&/dezembro/.test(s.back), JSON.stringify(s));
  await B.browser.close();
  /* 2 · antecipados */
  { const {d:dd}=H.seed(); const D=dd.docs; const iso=(h,m,k)=>{ const x=new Date(); x.setDate(x.getDate()+(k||0)); x.setHours(h,m,0,0); return x.toISOString(); }, hj=new Date().toISOString().slice(0,10);
    D['ordens/5001'].data=D['ordens/5002'].data=hj;
    D['entregas/e1']={ordem:'5001',num:'5001',linha:'Linha 1',em:iso(23,50),registradoEm:iso(0,5),antecipado:true,por:'uDONA',qtd:120,avulso:120};
    D['entregas/e2']={ordem:'5002',num:'5002',linha:'Linha 2',em:iso(12,0,-1),registradoEm:iso(10,0,-1),antecipado:true,por:'uDONA',qtd:80,avulso:80};
    D['entregas/e3']={ordem:'5002',num:'5002',linha:'Linha 2',em:iso(12,0,-20),registradoEm:iso(10,0,-20),antecipado:true,por:'uDONA',qtd:70,avulso:70};
    D['entregas/e4']={ordem:'5001',num:'5001',linha:'Linha 1',em:iso(12,0,-1),registradoEm:iso(10,0,-1),antecipado:true,por:'uDONA',qtd:30,avulso:30};
    D['entregas/e5']={ordem:'5001',num:'5001',linha:'Linha 1',em:iso(12,0,-1),qtd:0,anula:'e4',por:'uDONA'};
    B=await H.abrir({viewport:{width:1440,height:900}}); p=B.page; await H.preparar(p,dd); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
    await p.evaluate(()=>__T.go('programacao')); await H.dorme(1200);
    s=await p.evaluate(()=>{ const c=document.querySelector('.atc-card'); return c?{t:c.innerText,antes:!!(c.compareDocumentPosition(document.querySelector('.pfil'))&Node.DOCUMENT_POSITION_FOLLOWING),n:c.querySelectorAll('.atc-r').length}:null; });
    ok('Programação: quadro "antecipados para descontar" em cima dos filtros, com os 2 da semana (sem o antigo e sem o anulado)', s&&s.n===2&&s.antes&&/2 apontamentos antecipados para descontar/.test(s.t)&&/Ordem 5002/.test(s.t)&&/Ordem 5001/.test(s.t)&&/200 sc/.test(s.t)&&!/\n70\n/.test(s.t), s&&s.t.replace(/\n/g,'|').slice(0,300));
    ok('O que já passou do horário da folha aparece como "a folha já chegou"', /a folha já chegou/.test(s.t)&&/aguardando a folha/.test(s.t));
    const av=await p.evaluate(()=>{ try{ return document.body.innerText; }catch(e){ return ''; } });
    await p.click('[data-act="md-apt-abrir"]'); await H.dorme(700);
    await p.click('[data-act="md-apt-todas"]'); await H.dorme(500); await p.click('[data-act="md-apt-seguir"]'); await H.dorme(800);
    s=await p.evaluate(()=>[...document.querySelectorAll('.atc-apt')].map(x=>x.innerText.replace(/\s+/g,' ')));
    ok('Lançar apontamento: aviso "Antecipado … desconte da quantidade da folha" nas ordens com antecipado', s.length===2&&s.some(x=>/Antecipado 120/.test(x))&&s.some(x=>/Antecipado 80/.test(x)), JSON.stringify(s));
    await p.click('.atc-card [data-act="atc-ok"][data-id="e2"]'); await H.dorme(900);
    const e2=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['entregas/e2']); s=await p.evaluate(()=>{ const c=document.querySelector('.atc-card'); return c?c.innerText:''; });
    ok('"Já descontei": grava descontadoEm (sem apagar a entrega) e sai do quadro', !!e2&&!!e2.descontadoEm&&e2.qtd===80&&/1 apontamento antecipado para descontar/.test(s)&&!/Ordem 5002/.test(s), JSON.stringify(e2).slice(0,200));
    await p.click('.atc-apt [data-act="atc-ok"]'); await H.dorme(900);
    ok('"Já descontei" no apontamento em lote também tira o lembrete', !(await p.$('.atc-card'))&&!(await p.$('.atc-apt')));
    ok('Sem erros de JavaScript (produção)', !B.erros.filter(e=>!/404|Failed to load/.test(e)).length, B.erros.filter(e=>!/404|Failed to load/.test(e)).join(' | '));
    await B.browser.close(); }
  /* celular: a barra de abas do RH continua (lá não tem lateral) */
  B=await H.abrir({viewport:{width:390,height:844}}); p=B.page; d=banco(); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'juliana','ju1234'); await H.dorme(3000);
  await p.evaluate(()=>__T.go('rhtarefas')); await H.dorme(900); s=await p.evaluate(()=>{ const t=document.querySelector('#view .gxg-tabs'); return t?getComputedStyle(t).display:'—'; });
  ok('Celular: a barra de abas do RH continua aparecendo', s!=='none'&&s!=='—', s); await B.browser.close();
  const f=res.filter(r=>!r.ok); console.log(f.length?'FALHOU ('+f.length+')':'PASSOU tudo ('+res.length+')'); process.exit(f.length?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
