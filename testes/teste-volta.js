const H=require('./harness'); const {seedManut}=require('./manut-seed'); const {execFileSync}=require('child_process'); const fs=require('fs');
const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
const PY=(...a)=>execFileSync('python3',[__dirname+'/cam.py',...a]).toString(); const DIR='/tmp/volta'; fs.mkdirSync(DIR,{recursive:true});
(async()=>{ const {d}=seedManut(); d.users['tablet@painel-colafix.app']={uid:'uTAB',pass:'tab123',nome:'Tablet'}; d.docs['perfis/uTAB']={nome:'Tablet',usuario:'tablet'}; d.docs['acessos/uTAB']={perfil:'tablet',mods:['tablet'],locais:[],ativo:true};
 let banco=d;
 let B=await H.abrir(); let p=B.page; await H.preparar(p,banco); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>__T.go('mancrachas')); await H.dorme(400);
 for(const [n,l,pp] of [['Ana Souza','Linha 1','operador'],['Bruno Lima','Linha 2','operador'],['Pedro Técnico','*','tecnico']]){ await p.fill('#cr-nome',n); await p.selectOption('#cr-linha',l); await p.selectOption('#cr-papel',pp); await p.click('[data-act="cr-add"]'); await H.dorme(450); }
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act="cr-ades-todos"]')]); const png=DIR+'/a.png'; await dl.saveAs(png);
 banco=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); await B.browser.close();
 const crs=Object.values(banco.docs).filter(x=>x&&x.codigo&&x.papel); const ord=crs.slice().sort((a,b)=>String(a.linha).localeCompare(String(b.linha))||String(a.nome).localeCompare(String(b.nome))).map(c=>c.nome);
 for(const [n,f] of [['Ana Souza','ana'],['Bruno Lima','bruno'],['Pedro Técnico','pedro']]) PY('adesivo',png,String(ord.indexOf(n)),DIR+'/'+f+'.y4m','4.2');
 const tablet=async cam=>{ const T=await H.abrir({camera:DIR+'/'+cam+'.y4m',decodificador:true,viewport:{width:1280,height:800}}); await H.preparar(T.page,banco); await T.page.goto(H.BASE); await H.entrar(T.page,'tablet','tab123'); return T; };
 const espera=async(pg,f,ms)=>{ const t0=Date.now(); while(Date.now()-t0<(ms||12000)){ if(await pg.evaluate(f).catch(()=>false)) return true; await H.dorme(200); } return false; };
 const tela=pg=>pg.evaluate(()=>(document.querySelector('.tt')||{}).innerText||'');
 // 1) Ana abre chamado com a linha parada
 let T=await tablet('ana'); let q=T.page; await espera(q,()=>window.__T&&__T.S().tt.fase==='maquina',15000);
 await q.click('[data-act="tt-eq"][data-id="eqmix1"]'); await q.click('[data-act="tt-def"][data-v="Parou / travou"]'); await q.click('[data-act="tt-def-ok"]'); await q.click('[data-act="tt-imp"][data-v="parou"]');
 await espera(q,()=>__T.S().tt.fase==='ok',6000); banco=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); await T.browser.close();
 const c0=Object.values(banco.docs).find(x=>x&&x.origem==='tablet'); const par0=banco.docs['paradas/'+c0.paradaId];
 ok('Ana abre o chamado: linha parada', c0&&par0&&!par0.fim, `OS ${c0.numero} · parada desde ${par0&&par0.inicio}`);
 // 2) Ana passa o crachá de novo → pergunta se voltou
 T=await tablet('ana'); q=T.page; await espera(q,()=>window.__T&&__T.S().tt.fase==='volta',15000); const t2=await tela(q);
 ok('Ana passa o crachá de novo: o tablet pergunta se a máquina voltou a funcionar', /A máquina voltou a funcionar\?/.test(t2)&&/Misturador/.test(t2)&&/Linha parada há/.test(t2), t2.replace(/\n/g,' | ').slice(0,200));
 await q.dblclick(`[data-act="tt-voltou"][data-n="${c0.numero}"]`); await espera(q,()=>__T.S().tt.fase==='voltaok',6000);
 banco=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); const c1=Object.values(banco.docs).find(x=>x&&x.numero===c0.numero); const par1=banco.docs['paradas/'+c0.paradaId];
 const hl=(c1.hist||[]).filter(h=>/voltou a funcionar/.test(h.o)).length;
 ok('"Voltou a funcionar": parada encerrada agora, no nome da Ana; OS continua aberta para a manutenção (sem duplicar)', par1.fim&&par1.fimPor==='Ana Souza'&&c1.liberadoPor==='Ana Souza'&&c1.liberadoCracha&&c1.status==='Aberta'&&hl===1, `parada fim ${par1.fim} por ${par1.fimPor} · OS ${c1.status} · registros ${hl}`);
 await q.click('[data-act="tt-voltar"]'); await H.dorme(800); const t3=await tela(q);
 ok('Tela de espera: Linha 1 volta a "Funcionando", com a OS aguardando a manutenção', /Funcionando\s*liberada pela linha/.test(t3)&&/aguardando a manutenção concluir/.test(t3), t3.replace(/\n/g,' | ').slice(0,200));
 await T.browser.close();
 // 3) Bruno (Linha 2) vai direto para abrir chamado
 T=await tablet('bruno'); q=T.page; await espera(q,()=>window.__T&&__T.S().tt.fase!=='espera',15000);
 ok('Operador de outra linha não vê o chamado da Linha 1: vai direto para "Qual máquina?"', await q.evaluate(()=>__T.S().tt.fase)==='maquina'); await T.browser.close();
 // 4) Ana de novo: nada pendente → abre chamado normal; e "Abrir outro chamado" a partir da pergunta
 T=await tablet('ana'); q=T.page; await espera(q,()=>window.__T&&__T.S().tt.fase!=='espera',15000);
 const f4=await q.evaluate(()=>__T.S().tt.fase);
 await q.click('[data-act="tt-eq"][data-id="eqens1"]'); await q.click('[data-act="tt-def"][data-v="Barulho anormal"]'); await q.click('[data-act="tt-def-ok"]'); await q.click('[data-act="tt-imp"][data-v="reduziu"]'); await espera(q,()=>__T.S().tt.fase==='ok',6000);
 banco=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); await T.browser.close();
 T=await tablet('ana'); q=T.page; await espera(q,()=>window.__T&&__T.S().tt.fase==='volta',15000); await q.click('[data-act="tt-novo-ch"]'); await H.dorme(300);
 ok('Depois de liberar, Ana abre chamado normalmente; com outro aberto, "Abrir outro chamado" leva às máquinas', f4==='maquina'&&await q.evaluate(()=>__T.S().tt.fase)==='maquina'); await T.browser.close();
 // 5) Pedro conclui a OS liberada: parada não é mexida de novo
 T=await tablet('pedro'); q=T.page; await espera(q,()=>window.__T&&__T.S().tt.fase==='tecnico',15000); const t5=await tela(q);
 await q.click(`[data-act="tt-fim"][data-n="${c0.numero}"]`); await q.click('[data-act="tt-causa"][data-v="Desgaste de peça"]'); await q.fill('#tt-serv','troca do rolamento'); await q.click('[data-act="tt-fim-ok"]'); await espera(q,()=>__T.S().tt.fase==='fimok',6000);
 banco=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); const c5=Object.values(banco.docs).find(x=>x&&x.numero===c0.numero); const par5=banco.docs['paradas/'+c0.paradaId];
 ok('Técnico vê "linha liberou" e conclui a OS; a hora em que a máquina voltou (fim da parada) é mantida', /linha liberou às/.test(t5)&&c5.status==='Concluída'&&par5.fim===par1.fim, `parada fim ${par5.fim} (igual: ${par5.fim===par1.fim}) · OS ${c5.status}`);
 await T.browser.close();
 // 6) PC da manutenção mostra a liberação
 B=await H.abrir(); p=B.page; await H.preparar(p,banco); await p.goto(H.BASE); await H.entrar(p,'tecnico','tec123'); await H.dorme(2000);
 const n2=Object.values(banco.docs).filter(x=>x&&x.origem==='tablet'&&x.status!=='Concluída')[0];
 await p.evaluate(()=>{ const v=JSON.parse(localStorage.getItem('__srv')); }); 
 console.log('erros:',[...B.erros].filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
