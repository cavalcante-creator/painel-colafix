/* leituras do Firestore por login, com um banco de tamanho realista */
const H=require('./harness'); const {seedManut}=require('./manut-seed');
function bancoGrande(){ const {d}=seedManut(); const D=d.docs; const ago=n=>new Date(Date.now()-n*36e5).toISOString(); const L=['Linha 1','Linha 2','Fixcol'];
  for(let i=0;i<600;i++) D['ordens/'+(7000+i)]={num:String(7000+i),produto:'AC3001 - ARGAMASSA',linha:L[i%3],data:ago(i*5).slice(0,10),turno:'Dia todo',total:500,status:i<80?'aberta':'concluida',criadaEm:ago(i*5)};
  for(let i=0;i<1500;i++) D['entregas/e'+i]={ordem:String(7000+(i%600)),num:String(7000+(i%600)),qtd:50,em:ago(i),por:'x'};
  for(let i=0;i<900;i++) D['paradas/p'+i]={linha:L[i%3],motivo:'Outros',inicio:ago(i*2),fim:ago(i*2-1)};
  for(let i=0;i<700;i++) D['medicoes/m'+i]={em:ago(i*8),itens:{c1:10,c2:20},por:'x'};
  for(let i=0;i<300;i++) D['cargas/k'+i]={criadaEm:ago(i*20),qtd:30,etapas:{}};
  for(let i=0;i<500;i++) D['itens/I'+i]={codigo:'I'+i,kgCimento:5};
  for(let i=0;i<400;i++) D['previsoes/v'+i]={codigo:'I'+i,qtd:10,data:ago(i).slice(0,10),em:ago(i)};
  for(let i=0;i<400;i++) D['diario/d'+i]={em:ago(i*3),txt:'x'};
  for(let i=0;i<300;i++) D['ranchos/r'+i]={numero:i,criadoEm:ago(i*6)};
  for(let i=0;i<300;i++) D['chamados/os-'+String(i+1).padStart(5,'0')]={numero:i+1,linha:L[i%3],defeito:'x',status:i<10?'Aberta':'Concluída',criado:ago(i*10),nome:'x'};
  for(let i=0;i<500;i++) D['conferencias/c'+i]={em:ago(i*4),local:'a3'};
  for(let i=0;i<400;i++) D['auditorias/a'+i]={em:ago(i*5)};
  for(let i=0;i<300;i++) D['recebimentos/rc'+i]={em:ago(i*6)};
  for(let i=0;i<300;i++) D['pmxfichas/f'+i]={em:ago(i*7)};
  for(let i=0;i<300;i++) D['pmxbaixas/b'+i]={em:ago(i*7)};
  const add=(u,uid,ac)=>{ d.users[u+'@painel-colafix.app']={uid,pass:'x12345',nome:u}; D['perfis/'+uid]={nome:u,usuario:u}; D['acessos/'+uid]=Object.assign({locais:[],ativo:true},ac); };
  add('tablet','uTAB',{perfil:'tablet',mods:['tablet']}); add('fernando','uFER',{perfil:'consulta',mods:['silosver','cal'],linhas:['Linha 1']}); add('silos','uSV',{perfil:'silosver',mods:['silosver']});
  add('almox','uALX',{perfil:'conf',mods:['almox'],locais:['a3'],contar:true}); add('tvfab','uTVF',{perfil:'ver',mods:['tv','telas','cal']});
  d.users['tecnico@painel-colafix.app'].pass='x12345'; d.users['operador@painel-colafix.app'].pass='x12345'; d.users['iasmyn@painel-colafix.app'].pass='x12345';
  return d; }
(async()=>{ const raiz=process.env.RAIZ; const out=[];
  for(const [u,rot] of [['tablet','Tablet da parede'],['fernando','Fernando (silos + calendário)'],['silos','Silos (só consulta)'],['tecnico','Manutenção'],['almox','Almoxarifado'],['operador','Produção'],['tvfab','TV da fábrica'],['iasmyn','Administradora']]){
    const B=await H.abrir(); const p=B.page; await H.preparar(p,bancoGrande()); await p.goto(H.BASE); await H.entrar(p,u,'x12345'); await H.dorme(3500);
    const n=await p.evaluate(()=>window.__leit); out.push([rot,n]); await B.browser.close(); }
  console.log(JSON.stringify(out)); process.exit(0); })().catch(e=>{ console.error(e); process.exit(1); });
