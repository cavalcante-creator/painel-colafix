const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,250):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['tablet@painel-colafix.app']={uid:'uTAB',pass:'tab123',nome:'Tablet'}; D['perfis/uTAB']={nome:'Tablet',usuario:'tablet'}; D['acessos/uTAB']={perfil:'tablet',mods:['tablet'],locais:[],ativo:true};
 d.users['almox@painel-colafix.app']={uid:'uALX',pass:'alx123',nome:'Joana'}; D['perfis/uALX']={nome:'Joana',usuario:'almox'}; D['acessos/uALX']={perfil:'almoxpmx',mods:['premix','almox'],locais:['a3'],ativo:true};
 D['ordens/5001'].rancho='123456'; D['ordens/5002'].rancho='123456'; D['ordens/5001'].total=1000;
 D['ranchos/123456']={numero:'123456',criadoEm:new Date().toISOString(),ordens:[{num:'5001'},{num:'5002'}],itens:[{c:'MP001',d:'Cimento CP-II',um:'kg',q:500},{c:'MP002',d:'Areia fina',um:'kg',q:1200}]};
 D['entregas/e0']={ordem:'5001',num:'5001',linha:'Linha 1',qtd:300,em:new Date(Date.now()-3600e3).toISOString(),por:'x'};
 D['crachas/ANAS2345']={codigo:'ANAS2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true};
 const B=await H.abrir({camera:'/tmp/folha.y4m',decodificador:true,viewport:{width:1280,height:800}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'tablet','tab123');
 const espera=async(f,ms)=>{ const t0=Date.now(); while(Date.now()-t0<(ms||15000)){ if(await p.evaluate(f).catch(()=>false)) return true; await H.dorme(200); } return false; };
 const tela=()=>p.evaluate(()=>(document.querySelector('.tt')||{}).innerText||''); const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 const viu=await espera(()=>window.__T&&__T.S().tt.fase==='ordem',25000); const t0=await tela();
 ok('A câmera lê a folha e, com 2 ordens no rancho, pergunta qual ordem', viu&&/Qual ordem\?/.test(t0)&&/5001/.test(t0)&&/5002/.test(t0), t0.replace(/\n/g,' | ').slice(0,160));
 await p.click('[data-act="tt-hub-o"]:has-text("5001")'); await H.dorme(300); const t1=await tela(); const dis=await p.evaluate(()=>document.querySelector('[data-act="tt-ap"]').disabled);
 ok('Tela da ordem: produto, programado / já apontado / falta, e pede o crachá antes de liberar as ações', /ORDEM 5001/.test(t1)&&/1\.000\s*programado/.test(t1)&&/300\s*já apontado/.test(t1)&&/700\s*falta/.test(t1)&&/Passe o seu crachá/.test(t1)&&dis, t1.replace(/\n/g,' | ').slice(0,220));
 await p.keyboard.type('CXANAS2345',{delay:8}); await p.keyboard.press('Enter'); await H.dorme(500);
 ok('Crachá libera "Apontar produção", "Pedir material" e "Conferir rancho"', await p.evaluate(()=>!document.querySelector('[data-act="tt-ap"]').disabled&&!document.querySelector('[data-act="tt-pm"]').disabled&&!!document.querySelector('[data-act="tt-cf"]'))&&/Operador: Ana Souza/.test(await tela()));
 // apontar
 await p.click('[data-act="tt-ap"]'); await H.dorme(200); const temPal=await p.$('[data-act="tt-pal"][data-v="1"]');
 for(const k of ['8','0','0']) await p.click(`[data-act="tt-kp"][data-k="${k}"]`); const bloq=await p.evaluate(()=>document.querySelector('[data-act="tt-ap-ok"]').disabled); const aviso=/Passa do que falta/.test(await tela());
 await p.click('[data-act="tt-kp"][data-k="C"]'); if(temPal) await p.click('[data-act="tt-pal"][data-v="1"]'); for(const k of ['5','0']) await p.click(`[data-act="tt-kp"][data-k="${k}"]`); await H.dorme(200);
 const tot=await p.evaluate(()=>document.querySelector('.tt-tot b').innerText); await p.dblclick('[data-act="tt-ap-ok"]'); await espera(()=>__T.S().tt.fase==='apok',6000);
 let s=await srv(); const ens=Object.values(s).filter(x=>x&&x.origem==='tablet'&&x.ordem==='5001'); const t2=await tela();
 ok('Apontar: recusa quando passa do que falta; grava como no computador (ordem, linha, qtd, paletes, operador e crachá), sem duplicar', bloq&&aviso&&ens.length===1&&ens[0].qtd>=50&&ens[0].operador==='Ana Souza'&&ens[0].cracha==='ANAS2345'&&ens[0].linha==='Linha 1'&&/Apontado: \+/.test(t2), `total na tela ${tot} · gravado ${JSON.stringify(ens[0])}`);
 // pedir material
 await p.click('[data-act="tt-hub"]'); await H.dorme(200); await p.click('[data-act="tt-pm"]'); await H.dorme(200); await p.click('[data-act="tt-pmi"][data-c="MP002"]'); await H.dorme(150);
 for(const k of ['2','0','0']) await p.click(`[data-act="tt-kp"][data-k="${k}"]`); await p.check('#tt-pm-urg'); await H.dorme(150); await p.click('[data-act="tt-pm-ok"]'); await espera(()=>__T.S().tt.fase==='pmok',6000);
 s=await srv(); const pm=Object.values(s).find(x=>x&&x.status==='aberto'&&x.item);
 ok('Pedir material: escolhe o item do rancho, quantidade e urgência; o pedido vai para o almoxarifado', pm&&/MP002/.test(pm.item)&&pm.qtd===200&&pm.um==='kg'&&pm.urgente===true&&pm.porNome==='Ana Souza'&&pm.linha==='Linha 1', JSON.stringify(pm));
 await p.click('[data-act="tt-hub"]'); await H.dorme(300); const t3=await tela();
 ok('A tela da ordem mostra o material já pedido', /Material já pedido: MP002/.test(t3));
 // conferir rancho a partir da ordem (já identificado)
 await p.click('[data-act="tt-cf"]'); await H.dorme(500); const t4=await tela();
 ok('"Conferir rancho" abre a conferência item a item já com o operador identificado', /Confira os itens/.test(t4)&&/Conferindo: Ana Souza/.test(t4), t4.replace(/\n/g,' | ').slice(0,140));
 await p.click('[data-act="tt-voltar"]'); await H.dorme(300); await p.evaluate(()=>{ __T.S().tt.recente={}; });
 await p.keyboard.type('OP-5002',{delay:8}); await p.keyboard.press('Enter'); await H.dorme(500); const t5=await tela();
 ok('Coletor com OP- (folha sem rancho) abre direto a ordem', /ORDEM 5002/.test(t5), t5.slice(0,80));
 const banco=await srv(); await B.browser.close();
 // almoxarifado vê e atende
 const A=await H.abrir(); await H.preparar(A.page,{users:d.users,docs:banco}); await A.page.goto(H.BASE); await H.entrar(A.page,'almox','alx123'); await H.dorme(3500);
 await A.page.evaluate(()=>__T.go('diario')); await H.dorme(500); const td=await A.page.evaluate(()=>(document.querySelector('.pm-card')||{}).innerText||'');
 await A.page.click('[data-act="pm-ok"]'); await H.dorme(700); const at=await A.page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('__srv')).docs).find(x=>x&&x.item&&x.status));
 ok('Almoxarifado vê o pedido urgente no topo do diário e marca como atendido', /PEDIDOS DE MATERIAL/.test(td)&&/URGENTE/.test(td)&&/MP002/.test(td)&&/Ana Souza/.test(td)&&at.status==='atendido'&&at.atendidoNome==='Joana', td.replace(/\n/g,' | ').slice(0,180));
 console.log('erros:',[...B.erros,...A.erros].filter(x=>!/404/.test(x))); await A.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
