/* Pagamento dos PJ lê o Conectwork (14/11/2026, "o painel saber o que aconteceu no Conectwork"): com o painel ligado,
   a medição que chegou, a nota da empresa conferida e o pagamento à empresa são marcados sozinhos. Conectwork simulado. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção'],conectworkMei:['ZENITH']};
  D['rh/dados/funcionarios/f1']={nome:'JOAO PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',cnpj:'12345678000190',salario:5000,setor:'Produção',funcao:'Operador',status:'Ativo',admissao:'2025-01-10'};
  D['rh/dados/pjpag/2026-10-2']={pid:'2026-10-2',de:'2026-10-16',ate:'2026-10-31',cw:{ZENITH:{em:'2026-11-01T10:00:00Z',por:'Stefani RH',total:250000,n:1}},
    pes:{f1:{st:'pedido',fech:{valor:250000,em:'2026-11-01T09:00:00Z',por:'Stefani RH'},ped:{via:'conectwork',em:'2026-11-01T10:00:00Z',emp:'ZENITH'}}}};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await p.addInitScript(()=>{ const E={on:true,email:'rh@colafix.teste',empresaId:'colafix',empresaNome:'Colafix',erro:'',resOk:true,res:{}};
    window.__sit={'2026-10-2:ZENITH':{id:'c1_2026-10-2',periodo:'2026-10-2',emp:'ZENITH',parte:'',med:{status:'aprovada',valor:250000},esp:{status:'nota_ok',valor:250000},tit:{status:'liberado',liquidado:false}}};
    window.__CwPonteFake={estado:()=>E,ligar(){},conectar:async()=>{},google:async()=>{},sair:async()=>{},resultados:()=>E.res,ouvir(){},sincronizar:async()=>({novos:0,mudados:0}),
      situacao:async pids=>{ window.__sitPids=pids; return JSON.parse(JSON.stringify(window.__sit)); }}; });
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ window.RHPJPag._J.per='2026-10-2'; window.RHPJPag._J.aba='lista'; __T.go('rhpjpag'); }); await H.dorme(2500);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  let S=await srv(), doc=S['rh/dados/pjpag/2026-10-2'];
  ok('Lê a quinzena no Conectwork e marca sozinho: medição chegou e nota da Zenith conferida (sem tocar em nada)', doc.cw.ZENITH.conf&&doc.cw.ZENITH.conf.via==='conectwork-auto'&&doc.cw.ZENITH.nota&&doc.pes.f1.st==='conferida'&&!doc.cw.ZENITH.pago, JSON.stringify(doc.cw));
  await p.click('[data-act="pjp-cwabre"]'); await H.dorme(600);
  const t=await p.evaluate(()=>(document.querySelector('[data-cwsit="ZENITH"]')||{}).innerText||'');
  ok('A janela do Conectwork mostra a situação de lá (medição aprovada, nota conferida, pagamento liberado)', /medição aprovada/.test(t)&&/nota conferida/.test(t)&&/liberado/.test(t), t);
  ok('"Agendado" ou "liberado" não vira pago', S['rh/dados/pjpag/2026-10-2'].pes.f1.st!=='pago');
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{ window.__sit['2026-10-2:ZENITH'].tit={status:'liquidado',liquidado:true}; window.RHPJPag._J.cwSitBusy=false; }); 
  await p.evaluate(()=>{ __T.go('rhinicio'); }); await H.dorme(400); await p.evaluate(()=>{ __T.go('rhpjpag'); }); await H.dorme(2000);
  S=await srv(); doc=S['rh/dados/pjpag/2026-10-2'];
  ok('Com o pagamento confirmado no Conectwork, a Zenith e o PJ ficam pagos', doc.cw.ZENITH.pago&&doc.pes.f1.st==='pago'&&doc.pes.f1.pago.via==='empresa', JSON.stringify(doc.pes.f1));
  ok('Sem erros na página', !er.length, er.join(' | '));
  await B.browser.close(); console.log(res.filter(Boolean).length+' de '+res.length+' testes de cwsit passaram.'); process.exit(res.every(Boolean)?0:1); })().catch(e=>{ console.error('ERRO NO TESTE',e); process.exit(1); });
