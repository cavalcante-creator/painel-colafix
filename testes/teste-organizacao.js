/* Organização dos módulos (pedidos de 13/10): Produção só com Programação/Calendário/Indicadores; diário, fila e monitor no Almoxarifado
   (fila primeiro); TV da fábrica em Telas de TV; Tela da linha e Paradas no módulo "Tablet da produção". Quem tinha acesso continua tendo. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs;
  d.users['linha@painel-colafix.app']={uid:'uLIN',pass:'linha1',nome:'Linha'}; D['perfis/uLIN']={nome:'Linha',usuario:'linha'}; D['acessos/uLIN']={perfil:'linha',mods:['paradas'],locais:[],ativo:true};
  d.users['alm@painel-colafix.app']={uid:'uALM',pass:'alm123',nome:'Almox'}; D['perfis/uALM']={nome:'Almox',usuario:'alm'}; D['acessos/uALM']={perfil:'outro',mods:['premix'],locais:[],ativo:true};
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept());
  const entra=async(u,s)=>{ await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,u,s); await H.dorme(2600); };
  const abas=()=>p.evaluate(()=>[...document.querySelectorAll('.tabs .tab')].map(b=>b.dataset.go));
  await entra('iasmyn','senha123');
  await p.evaluate(()=>__T.go('programacao')); await H.dorme(300); const prod=await abas();
  await p.evaluate(()=>__T.go('dbfila')); await H.dorme(400); const alm=await abas(); const tf=await p.evaluate(()=>document.querySelector('#view h1').innerText);
  await p.evaluate(()=>__T.go('tvapres')); await H.dorme(300); const tel=await abas();
  await p.evaluate(()=>__T.go('linhatv')); await H.dorme(300); const tab=await abas();
  ok('Produção só com Programação, Calendário e Indicadores', JSON.stringify(prod)===JSON.stringify(['programacao','calendario','indicadores']), JSON.stringify(prod));
  ok('Almoxarifado começa pela Fila do almox, depois Diário e Monitor', alm[0]==='dbfila'&&alm[1]==='diario'&&alm[2]==='dbmon'&&alm.includes('pmxfichas')&&tf==='Fila do almox', JSON.stringify(alm)+' '+tf);
  ok('TV da fábrica em Telas de TV; Tela da linha e Paradas no Tablet da produção', tel.includes('tvfab')&&JSON.stringify(tab)===JSON.stringify(['linhatv','paradas']), JSON.stringify(tel)+' '+JSON.stringify(tab));
  /* quem pede a fila (Meu dia, painéis) ainda chama go('diario'): cai na Fila; a aba Diário abre o diário completo */
  await p.evaluate(()=>{ __T.go('meudia'); __T.S().dbo.modo='fila'; __T.go('diario'); }); await H.dorme(300); const v1=await p.evaluate(()=>__T.S().view);
  await p.click('.tabs .tab[data-go="diario"]'); await H.dorme(400); const v2=await p.evaluate(()=>[__T.S().view,__T.S().dbo.modo,document.querySelector('#view h1').innerText]);
  ok('go("diario") com a fila pedida abre a Fila; a aba Diário abre o diário completo', v1==='dbfila'&&v2[0]==='diario'&&v2[1]==='tabela'&&/Diário de bordo/.test(v2[2]), v1+' '+JSON.stringify(v2));
  const pr=await p.evaluate(()=>{ const o=(__T.S().ordens||[]).find(x=>x.status==='aberta'&&x.linha); return !!o; });
  /* João (Produção) continua com o diário, a fila e o monitor (agora no Almoxarifado) */
  await entra('joao','joao123'); const j=await p.evaluate(()=>({d:__T.vo('diario'),f:__T.vo('dbfila'),m:__T.vo('dbmon'),tv:__T.vo('tvfab'),pa:__T.vo('paradas'),menu:[...document.querySelectorAll('#navlist [data-mod]')].map(b=>b.dataset.mod)}));
  ok('Produção continua vendo diário, fila, monitor e TV da fábrica (não vê mais Paradas nem o Tablet da produção)', j.d&&j.f&&j.m&&j.tv&&!j.pa&&j.menu.includes('premix')&&!j.menu.includes('tabprod'), JSON.stringify(j));
  /* almox (só Almoxarifado) vê a fila */
  await entra('alm','alm123'); const a=await p.evaluate(()=>({f:__T.vo('dbfila'),d:__T.vo('diario'),p:__T.vo('programacao'),v:__T.S().view}));
  ok('Almox vê a Fila e o Diário, sem a Programação', a.f&&a.d&&!a.p, JSON.stringify(a));
  /* computador da linha (cargo "Tela da linha"): continua só com a tela da linha */
  await entra('linha','linha1'); const l=await p.evaluate(()=>({v:__T.S().view,ltv:__T.vo('linhatv'),menu:[...document.querySelectorAll('#navlist [data-mod]')].map(b=>b.dataset.mod)}));
  ok('Computador da linha continua abrindo na Tela da linha (agora no Tablet da produção)', l.ltv&&l.v==='linhatv'&&l.menu.includes('tabprod')&&!l.menu.includes('producao'), JSON.stringify(l));
  const e=B.erros.filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !e.length, e.join(' | '));
  const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU — '+res.length+' verificações'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
