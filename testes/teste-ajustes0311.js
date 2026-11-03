/* Pedidos de ajuste da Juliana (02 e 03/11): Voltar dos comunicados volta para a vaga · link do celular para marcar entrevista ·
   "Todos os prazos" dentro de Minha agenda · Troca dos PJ com números, filtros, relatório e "não precisa trocar" · Gerar e imprimir em 3 passos ·
   afastado e horário diferente (aprendiz) não contam como falta em Quem está na empresa. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const FER=['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'];
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs; const n=new Date(), hj=iso(n);
 let kd=1; for(;kd<10;kd++){ const x=new Date(n); x.setDate(x.getDate()-kd); if(x.getDay()>0&&x.getDay()<6&&!FER.includes(iso(x).slice(5))) break; } const dx=new Date(n); dx.setDate(dx.getDate()-kd); const dd=iso(dx); /* último dia útil antes de hoje */
 d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 D['rh/config']={setores:['Linha 1','Expedição'],fichasDesde:'2000-01'}; D['rh/dados/funcoes/fn1']={nome:'Operador de produção',epis:[{nome:'Luva',ca:'111'}],uniformes:[{nome:'Camisa',tam:'G'}]};
 const add=(k,o)=>D['rh/dados/funcionarios/'+k]=Object.assign({setor:'Linha 1',funcao:'Operador de produção',empresa:'COLAFIX',tipo:'CLT',status:'Ativo',admissao:'2020-01-01'},o);
 add('a',{nome:'ANA PRESENTE',cpf:'11111111111'}); add('b',{nome:'BRUNO FALTOU',cpf:'22222222222'}); add('c',{nome:'CARLA AFASTADA',cpf:'33333333333'}); add('e',{nome:'EDU APRENDIZ',cpf:'44444444444'});
 /* PJ: um atrasado, um em dia, um que não precisa trocar */
 add('p1',{nome:'PEDRO PJ ATRASADO',cnpj:'11222333000181',tipo:'PJ',empresa:'ZENITH',admissao:'2020-01-01',ultimaTroca:iso(new Date(n.getFullYear(),n.getMonth()-4,1)),trocas:[{data:iso(new Date(n.getFullYear(),n.getMonth()-4,1)),obs:'troca teste'}]});
 add('p2',{nome:'PAULA PJ EM DIA',cnpj:'11222333000181',tipo:'PJ',empresa:'NEXUS',setor:'Expedição',ultimaTroca:hj,trocas:[{data:hj}]});
 add('p3',{nome:'PAULO SOCIO',cnpj:'11222333000181',tipo:'PJ',empresa:'ZENITH',admissao:'2019-01-01'});
 /* Face ID: 20 dias; Ana vem todo dia, Bruno vem menos hoje, Carla não vem há 20 dias, Edu não vem nunca no dia de hoje (folga) */
 const docs={};
 for(let k=20;k>=0;k--){ const x=new Date(n); x.setDate(x.getDate()-k); const ds=iso(x), m=ds.slice(0,7); docs[m]=docs[m]||{mes:m,dias:{},pessoas:{},imp:[{em:new Date().toISOString(),por:'Teste'}]};
   const dia={}; const vem=(cpf,nm)=>{ dia[cpf]={p:1,a:'11:40',t:['07:10:00 Portaria Entrada','11:40:00 REFEITÓRIO','17:30:00 Portaria Saída']}; docs[m].pessoas[cpf]={n:nm,e:'COLAFIX'}; };
   vem('11111111111','ANA PRESENTE'); if(k!==kd) vem('22222222222','BRUNO FALTOU'); if(k!==kd&&k%2===0) vem('44444444444','EDU APRENDIZ'); for(let z=0;z<5;z++) vem('5555555555'+z,'OUTRO '+z);
   docs[m].dias[ds]=dia; }
 Object.values(docs).forEach(x=>D['rh/dados/almoco/'+x.mes]=x);
 const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; p.on('dialog',x=>x.accept());
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3200);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), view=()=>p.evaluate(()=>document.getElementById('view').innerText);
 const col=async c=>Object.entries(await srv()).filter(([k])=>k.startsWith(c+'/')).map(([k,v])=>Object.assign({_id:k.split('/').pop()},v));

 /* 4 · Agenda dentro de Minha agenda */
 const nav=await p.evaluate(()=>document.getElementById('navlist').innerText);
 await p.evaluate(()=>__T.go('rhtarefas')); await H.dorme(700); const tar=await view();
 ok('Agenda: "Todos os prazos" fica em Minha agenda (saiu de Prazos) e Tarefas e calendário tem o atalho', /Todos os prazos/.test(await p.evaluate(()=>document.getElementById('navlist').innerText))&&/Ver todos os prazos/.test(tar), nav.replace(/\n/g,' | '));
 await p.click('[data-go="rhagenda"].rt-pzall'); await H.dorme(700); const ag=await view();
 ok('"Ver todos os prazos" abre a lista completa (30/60/90 dias)', /Todos os prazos/.test(ag)&&/Próximos 30 dias/.test(ag), ag.slice(0,160));

 /* 2 · Voltar dos comunicados volta para a vaga */
 await p.evaluate(()=>__T.go('rhvagas')); await H.dorme(800);
 await p.click('[data-act="rhv-vnova"]'); await H.dorme(300); await p.fill('#rhv-fn','Operador de produção'); await p.fill('#rhv-st','Linha 1'); await p.click('[data-act="rhv-vok"]'); await H.dorme(800);
 await p.click('[data-act="rhv-divulgar"]:not([data-soc])'); await H.dorme(800); const v1=await p.evaluate(()=>__T.S().view);
 const rot=await p.evaluate(()=>document.querySelector('[data-act="rc-volta"]').innerText); await p.click('[data-act="rc-volta"]'); await H.dorme(800);
 ok('Comunicados: o Voltar de um comunicado aberto pela vaga volta para Admissões e vagas', v1==='rhcom'&&/vaga/i.test(rot)&&await p.evaluate(()=>__T.S().view)==='rhvagas', v1+' '+rot);

 /* 3 · marcar entrevista pelo celular */
 await p.click('[data-act="rhv-entnovo"]'); await H.dorme(400);
 await p.fill('#rhv-en','Gabriela Teste'); await p.fill('#rhv-et','51999990000'); await p.fill('#rhv-elo','Colafix · portaria');
 const hs=await p.$$eval('[data-rhv-eh]',x=>x.map(y=>y.value)); await p.click('[data-act="rhv-entok"]'); await H.dorme(1200);
 let cs=await col('rh/dados/candidatos'); const cg=cs.find(x=>x.nome==='Gabriela Teste'); let S=await srv(); const cv=cg&&S['rh/dados/convites/'+cg.convEnt];
 const mbox=await p.evaluate(()=>{ const m=document.querySelector('.rh-mbox'); return m?m.innerText:''; });
 ok('Entrevista: cria o candidato (triagem) e o link do tipo entrevista com os horários e a vaga', hs.length===3&&cg&&cg.etapa==='triagem'&&cv&&cv.tipo==='ent'&&cv.horarios.length===3&&/Operador/.test(cv.vagaTit)&&/Link da entrevista/.test(mbox)&&/vaga de Operador de produção/.test(mbox), JSON.stringify({hs,cv}).slice(0,300));
 await p.click('[data-act="rh-convx"]'); await H.dorme(300);
 /* celular do candidato */
 const B2=await H.abrir({viewport:{width:390,height:844}}); const q=B2.page; await H.preparar(q,{docs:S,users:{}});
 await q.goto(H.BASE+'ficha.html?c='+cg.convEnt); await H.dorme(1200); const tela=await q.evaluate(()=>document.body.innerText);
 await q.fill('#nome','Gabriela Teste Souza'); await q.fill('#telefone','51999990000'); await q.selectOption('#escolaridade','Médio completo'); await q.fill('#experiencia','2 anos de auxiliar de produção');
 await q.click('.go'); await H.dorme(300); const er1=await q.evaluate(()=>document.getElementById('er').innerText);
 await q.check('input[name=hr]'); await q.check('#ok'); await q.click('.go'); await H.dorme(1500);
 const fim=await q.evaluate(()=>document.body.innerText), S2=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), fd=S2['rh/dados/fichascand/'+cg.convEnt];
 ok('Celular: mostra a vaga e os horários, pede para escolher, sem documentos; grava tipo ent sem CPF', /Vaga: Operador de produção/.test(tela)&&/Escolha o horário/.test(tela)&&!/Fotos dos documentos/.test(tela)&&/Escolha um horário/.test(er1)&&/Entrevista marcada/.test(fim)&&fd&&fd.tipo==='ent'&&fd.horario===hs[0]&&fd.cpf==='', JSON.stringify(fd).slice(0,240)+' | '+er1);
 await B2.browser.close();
 await p.evaluate(s=>{ const o=JSON.parse(localStorage.getItem('__srv')); o.docs=s; localStorage.setItem('__srv',JSON.stringify(o)); window.__mockReconnect&&window.__mockReconnect(); },S2); await H.dorme(1800);
 cs=await col('rh/dados/candidatos'); const cg2=cs.find(x=>x._id===cg._id); S=await srv(); const vv=await view();
 if(process.env.FOTOS) await p.screenshot({path:'/tmp/f-vaga.png'});
 ok('Chegou: o horário escolhido entra no candidato (etapa Entrevista), a resposta fica guardada e não vira ficha de admissão', cg2&&cg2.etapa==='entrevista'&&cg2.entrevista===hs[0]&&cg2.entResp&&/auxiliar/.test(cg2.entResp.experiencia)&&S['rh/dados/fichascand/'+cg.convEnt].usada===true&&/Escolheu o horário pelo celular/.test(vv)&&!/ficha pelo celular chegou/i.test(vv), JSON.stringify(cg2).slice(0,300));

 /* 5 · Troca dos PJ */
 await p.evaluate(()=>__T.go('rhpj')); await H.dorme(800); let pj=await view();
 ok('PJ: números (atrasadas, próximos 30 dias, em dia, não precisam trocar), filtros e PDF/Excel', /PJ em atividade/.test(pj)&&/trocas atrasadas/.test(pj)&&/não precisam trocar/.test(pj)&&await p.$('#rh-pjq')&&await p.$('[data-act="rh-pjxls"]')&&await p.$('[data-act="rh-pjpdf"]'), pj.slice(0,300).replace(/\n/g,' | '));
 await p.click('[data-act="rh-pjst"][data-v="atr"]'); await H.dorme(400); pj=await view();
 ok('Filtro "Atrasadas" mostra só quem está atrasado', /PEDRO PJ ATRASADO/.test(pj)&&!/PAULA PJ EM DIA/.test(pj), '');
 await p.click('[data-act="rh-pjst"][data-v="atr"]'); await H.dorme(300);
 await p.click('[data-act="rh-pjaj"][data-id="p3"]'); await H.dorme(400); await p.check('#rh-pjsem'); await p.fill('#rh-pjsemm','sócio'); await p.click('[data-act="rh-pjajok"]'); await H.dorme(900);
 S=await srv(); pj=await view(); await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(600); const ini=await view();
 ok('"Não precisa trocar": grava no cadastro, mostra a situação e sai dos avisos', S['rh/dados/funcionarios/p3'].pjSemTroca===true&&S['rh/dados/funcionarios/p3'].pjSemTrocaMot==='sócio'&&/Não precisa trocar[\s\S]*sócio/.test(pj)&&!/Troca do PJ: PAULO SOCIO/.test(ini), '');
 await p.evaluate(()=>__T.go('rhpj')); await H.dorme(500); await p.click('[data-act="rh-pjaba"][data-v="hist"]'); await H.dorme(400); pj=await view();
 if(process.env.FOTOS){ await p.click('[data-act="rh-pjaba"][data-v="lista"]'); await H.dorme(300); await p.screenshot({path:'/tmp/f-pj.png'}); await p.click('[data-act="rh-pjaba"][data-v="hist"]'); await H.dorme(300); }
 ok('Histórico de trocas do ano', /Histórico de trocas/.test(pj)&&/PAULA PJ EM DIA/.test(pj), '');
 await p.click('[data-act="rh-pjxls"]'); await H.dorme(1500); const xn=await p.evaluate(()=>window.__rrUltimoXls||'');
 ok('Excel da troca dos PJ', /Troca-dos-PJ/.test(xn), xn);

 /* 6 · Gerar e imprimir em 3 passos */
 await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(400); await p.click('[data-act="rh-fvgerar"]'); await H.dorme(2500); const fr=p.frames().find(f=>/rh-fichas/.test(f.url()));
 const g=await fr.evaluate(()=>({p:[...document.querySelectorAll('.fg-n')].map(x=>x.innerText.trim()),seg:[...document.querySelectorAll('.fg-seg button')].map(x=>x.innerText),imp:!document.getElementById('btn-imprimir').disabled,todos:getComputedStyle(document.getElementById('btn-gerar-todos')).display,drive:document.getElementById('card-drive').classList.contains('fechado'),fil:!document.querySelector('.fg-fil').open}));
 ok('Gerar e imprimir: 3 passos (mês, ficha, para quem), Imprimir já ativo, filtros e escaneadas recolhidos', g.p.length===3&&/Para quem/.test(g.p[2])&&g.seg.length===3&&g.imp&&g.todos==='none'&&g.drive&&g.fil, JSON.stringify(g));
 await fr.evaluate(()=>{ window.__imp=0; window.print=()=>{ window.__imp++; }; }); await fr.click('.fg-seg button[data-v="EPI"]'); await fr.click('#btn-imprimir'); await H.dorme(900);
 const gi=await fr.evaluate(()=>({imp:window.__imp,pg:document.querySelectorAll('#preview-wrap .ficha-page').length,tipo:document.getElementById('select-tipo-ficha').value}));
 ok('Imprimir gera as fichas e abre a impressão num toque (escolheu "Só EPI")', gi.imp===1&&gi.pg>=1&&gi.tipo==='EPI', JSON.stringify(gi));

 /* 7 · afastado e horário diferente */
 await p.evaluate(()=>__T.go('rhpres')); await H.dorme(1500);
 let doc=null; for(let i=0;i<40;i++){ doc=await p.evaluate(x=>__T.S().db.doc('presenca/'+x).get().then(g=>g.exists?g.data():null),dd); if(doc&&doc.f&&doc.f.length) break; await H.dorme(500); }
 const sr=x=>(doc.f||[]).filter(y=>y.m==='Sem registro').map(y=>y.n);
 const c0=doc&&(doc.f||[]).find(y=>/Carla/.test(y.n)); ok('Antes: Edu (aprendiz) aparece como falta e Carla (afastada) como "Fora do Face ID"', doc&&sr().length===2&&sr().some(x=>/Edu/.test(x))&&c0&&c0.m==='Sumiu', dd+' '+JSON.stringify(doc&&doc.f));
 await p.evaluate(()=>{ const R=window.__T&&__T.S(); }); const fdo=await p.$$eval('[data-act="rh-paj"]',x=>x.map(y=>y.dataset.k+':'+y.dataset.id));
 await p.click('[data-act="rh-paj"][data-k="afast"][data-id="c"]').catch(async()=>{ await p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.act='rh-paj'; b.dataset.k='afast'; b.dataset.id='c'; document.body.appendChild(b); b.click(); }); });
 await H.dorme(400); await p.fill('#rh-afi','2026-10-01'); await p.selectOption('#rh-afm','Auxílio-doença (INSS)'); await p.click('[data-act="rh-pajok"]'); await H.dorme(800);
 const wd=dx.getDay(), dias=[1,2,3,4,5,6,0].filter(x=>x!==wd).slice(0,3);
 await p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.act='rh-paj'; b.dataset.k='hor'; b.dataset.id='e'; document.body.appendChild(b); b.click(); }); await H.dorme(400);
 await p.$$eval('[data-rh-hd]',(xs,ds)=>xs.forEach(x=>{ x.checked=ds.includes(+x.dataset.rhHd); }),dias); await p.fill('#rh-hi','13:00'); await p.fill('#rh-hf','17:00'); await p.fill('#rh-ho','jovem aprendiz'); await p.click('[data-act="rh-pajok"]'); await H.dorme(900);
 S=await srv(); const fc=S['rh/dados/funcionarios/c'], fe=S['rh/dados/funcionarios/e'];
 ok('Afastado e horário diferente ficam no cadastro', fc.afast&&fc.afast.ini==='2026-10-01'&&/INSS/.test(fc.afast.mot)&&fe.horEsp&&fe.horEsp.ini==='13:00'&&fe.horEsp.dias.length===3&&fe.horEsp.obs==='jovem aprendiz'&&fe.jornada===undefined, JSON.stringify({a:fc.afast,h:fe.horEsp,fdo}));
 for(let i=0;i<50;i++){ await H.dorme(500); doc=await p.evaluate(x=>__T.S().db.doc('presenca/'+x).get().then(g=>g.exists?g.data():null),dd); const c=(doc.f||[]).find(y=>/Carla/.test(y.n)), e=(doc.f||[]).find(y=>/Edu/.test(y.n)); if(c&&c.m==='Afastado'&&e&&e.m==='Folga') break; }
 const c=(doc.f||[]).find(y=>/Carla/.test(y.n)), e=(doc.f||[]).find(y=>/Edu/.test(y.n));
 await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(300); await p.evaluate(()=>__T.go('rhpres')); await H.dorme(1200); const pv=await view();
 ok('Depois: Carla "Afastado" e Edu "Folga" (não trabalha nesse dia); só o Bruno fica como falta sem registro', c&&c.m==='Afastado'&&/INSS/.test(c.mt)&&e&&e.m==='Folga'&&sr().length===1&&/Bruno/.test(sr()[0]), JSON.stringify(doc.f));
 await p.evaluate(x=>{ __T.S().gxp=__T.S().gxp||{}; },dd); const temJ=/Afastados e horário diferente|Afastado|Folga/.test(pv); if(process.env.FOTOS){ await p.evaluate(x=>{ __T.S().gxp.dia=x; },dd); await p.evaluate(()=>__T.go('rhpres')); await H.dorme(1500); await p.screenshot({path:'/tmp/f-pres.png',fullPage:true}); }
 ok('A tela do RH mostra os botões "Está afastado" e "Horário diferente" no cartão de quem faltou', /Está afastado/.test(pv)&&/Horário diferente/.test(pv), pv.slice(0,200).replace(/\n/g,' | '));

 console.log('erros:',B.erros.filter(x=>!/404|cdnjs|fonts|net::/.test(x)).slice(0,5)); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error(e); process.exit(1); });
