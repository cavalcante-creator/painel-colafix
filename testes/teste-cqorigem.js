/* 03/11: na espera do posto e do computador de chamados, cada linha só mostra os chamados abertos na linha
   (posto, chamados, coletor, QR…), não os abertos pelo pessoal da manutenção no painel, tarefas do gestor e preventivas. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
async function caso(login,pass,perfil,chs){ const {d}=seedManut(); const D=d.docs; const ag=new Date(Date.now()-30*60e3).toISOString();
  d.users[login+'@painel-colafix.app']={uid:'uX',pass,nome:'Teste'}; D['perfis/uX']={nome:'Teste',usuario:login}; D['acessos/uX']={perfil,mods:['tablet'],locais:[],ativo:true};
  chs.forEach((c,i)=>{ D['chamados/c'+i]=Object.assign({numero:String(20+i),status:'Aberta',criado:ag,quando:ag.slice(0,16),defeito:'Mecânico',impacto:'parou',nome:'X',equip:''},c); });
  const B=await H.abrir({viewport:{width:1600,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,login,pass); await H.dorme(3000);
  const t=await p.evaluate(()=>[...document.querySelectorAll('.cq-ln')].map(x=>x.innerText.replace(/\s+/g,' ')));
  await B.browser.close(); return t; }
(async()=>{
  /* posto: L1 tem chamado aberto à mão na manutenção e tarefa do gestor; L2 tem chamado do posto */
  let t=await caso('posto','po1234','posto',[{linha:'Linha 1',origem:'painel'},{linha:'Linha 1',origem:'gestor',tarefa:true},{linha:'Linha 2',origem:'posto'}]);
  const l1=t.find(x=>/^Linha 1/.test(x))||'', l2=t.find(x=>/^Linha 2/.test(x))||'';
  ok('Posto: chamado da manutenção e tarefa do gestor não aparecem na linha', !/Chamado 0002[01]/.test(l1)&&!/aguardando manutenção/.test(l1), l1);
  ok('Posto: chamado aberto no posto continua aparecendo', /Chamado 00022/.test(l2), l2);
  /* computador de chamados */
  t=await caso('chamados','ch1234','chamados',[{linha:'Linha 1',origem:'painel'},{linha:'Linha 2',origem:'coletor'}]);
  const c1=t.find(x=>/^Linha 1/.test(x))||'', c2=t.find(x=>/^Linha 2/.test(x))||'';
  ok('Chamados: linha só com chamado da manutenção aparece funcionando', /Funcionando/.test(c1), c1);
  ok('Chamados: chamado do bipe do coletor aparece (máquina parada)', /Máquina parada/.test(c2)&&/OS 00021/.test(c2), c2);
  console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
