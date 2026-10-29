/* Pedido de 29/10: cadastrar as máquinas a partir da planilha do plano preventivo (código do ativo = TAG). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao'],locais:[],ativo:true};
 D['config/manutplano']=Object.assign({},D['config/manutplano']||{},{ativos:[{cod:'L1-MIS-01',nome:'Misturador 1',area:'Linha 1'},{cod:'L1-FM-01',nome:'Filtro de manga 1 (Linha 1)',area:'Filtros de manga - Linha 1'},{cod:'DSA-MOE-01',nome:'Moega de areia',area:'Descarga de areia'},{cod:'L2-ELV-01',nome:'Elevador de canecas (Linha 2)',area:'Linha 2'}],tarefas:(D['config/manutplano']||{}).tarefas||[]});
 const eq=(D['config/manut']||{}).equips||[]; D['config/manut']=Object.assign({},D['config/manut']||{},{equips:eq.concat([{id:'eqx',linha:'Linha 2',nome:'Elevador de canecas',tag:'',ativo:true}])});
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(4500);
 ok('Linha a partir da área', await p.evaluate(()=>[Painel.maqPlano.linha('Filtros de manga - Linha 1'),Painel.maqPlano.linha('Descarga de areia'),Painel.maqPlano.nome('Filtro de manga 1 (Linha 1)')].join('|'))==='Linha 1|Descarga de areia|Filtro de manga 1');
 await p.evaluate(()=>{ __T.S().pp&&(__T.S().pp.sub=false); __T.go('gxcal'); }); await H.dorme(1500); await p.evaluate(()=>__T.go('manequip')); await H.dorme(1500);
 const bt=await p.evaluate(()=>(document.querySelector('[data-act="mq-plano"]')||{}).innerText||''); ok('Quadro "Máquinas da planilha do plano" com "Trazer as 4 do plano preventivo"', /Trazer as 4/.test(bt), bt);
 ok('Tem também "Escolher a planilha"', !!(await p.$('#mq-arq')));
 if(bt) await p.click('[data-act="mq-plano"]'); await H.dorme(600);
 const pv=await p.evaluate(()=>(document.querySelector('.mq-c')||{}).innerText||''); ok('Prévia: 3 novas e 1 ganha a TAG (Elevador de canecas da Linha 2 já existia)', /3\s*novas/.test(pv.replace(/\n/g,' '))&&/1\s*já cadastradas, ganham a TAG/.test(pv.replace(/\n/g,' ')), pv.replace(/\n/g,' | ').slice(0,300));
 await p.click('[data-act="mq-ok"]'); await H.dorme(1500);
 const eqs=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['config/manut'].equips);
 ok('Cadastrou com linha, nome e TAG', eqs.some(e=>e.tag==='L1-FM-01'&&e.linha==='Linha 1'&&e.nome==='Filtro de manga 1')&&eqs.some(e=>e.tag==='DSA-MOE-01'&&e.linha==='Descarga de areia')&&eqs.find(e=>e.id==='eqx').tag==='L2-ELV-01', JSON.stringify(eqs.slice(-4)));
 await p.click('[data-act="mq-plano"]'); await H.dorme(600); const pv2=await p.evaluate(()=>(document.querySelector('.mq-c')||{}).innerText||''); ok('Trazer de novo não repete (todas já cadastradas)', /Todas as máquinas da planilha já estão cadastradas/.test(pv2), pv2.slice(0,200));
 ok('Sem erros', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
