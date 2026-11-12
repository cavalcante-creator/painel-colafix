/* Ponte com o Conectwork (12/11/2026, fila automática): ligado uma vez, os PJ das prestadoras vão sozinhos para a fila do
   Conectwork (sem CPF); o resultado volta e o convite pronto vai pelo WhatsApp. Conectwork simulado (window.__CwPonteFake). Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção'],conectworkMei:['ZENITH']};
  const P=[['f1','JOAO PEREIRA TESTE','12345678000190','joao@teste.com'],['f4','ANA SOUZA TESTE','22345678000190',''],['f7','RUI COSTA TESTE','32345678000190','rui@teste.com'],['f9','SEM CNPJ TESTE','','']];
  P.forEach(([id,n,cnpj,email])=>{ D['rh/dados/funcionarios/'+id]={nome:n,tipo:'PJ',empresa:'ZENITH',cpf:'111222333'+id.slice(1).padStart(2,'0'),cnpj,email,salario:4000,setor:'Produção',funcao:'Operador',status:'Ativo',admissao:'2025-01-10',telefone:'51999990000'}; });
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await p.addInitScript(()=>{ const E={on:true,email:'rh@colafix.teste',empresaId:'colafix',empresaNome:'Colafix',erro:'',resOk:true,res:{'12345678000190':{st:'feito',email:'joao@teste.com',res:{convite:'tok1',conviteEmail:'joao@teste.com'}},'22345678000190':{st:'pendente'}}}; const fns=new Set();
    window.__ptEnv=[]; window.__CwPonteFake={estado:()=>E,ligar(){},conectar:async()=>{},google:async()=>{},sair:async()=>{ E.on=false; },resultados:()=>E.res,ouvir(fn){ fns.add(fn); },
      async sincronizar(its){ window.__ptEnv.push(its); let n=0,m=0; its.forEach(x=>{ const r=E.res[x.cnpjNum]; if(!r){ n++; E.res[x.cnpjNum]={st:'pendente'}; } else if(r.email!==undefined&&r.email!==x.email){ m++; } }); return {novos:n,mudados:m}; }}; });
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ window.open=(u)=>{ window.__abriu=(window.__abriu||[]).concat([u]); return {}; }; window.RHPJPag._J.per='2026-10-2'; window.RHPJPag._J.aba='lista'; __T.go('rhpjpag'); }); await H.dorme(2500);
  const env=await p.evaluate(()=>window.__ptEnv);
  const it=(env[0]||[]);
  ok('Com a ponte ligada, os PJ da Zenith com CNPJ vão sozinhos para a fila (sem CPF; o sem CNPJ fica de fora)', it.length===3&&it.some(x=>x.cnpjNum==='32345678000190'&&x.email==='rui@teste.com'&&x.prestadora==='Zenith')&&!JSON.stringify(env).includes('11122233'), JSON.stringify(env).slice(0,400));
  await p.click('[data-act="pjp-cwabre"]'); await H.dorme(500); await p.click('[data-act="pjp-cwconv"]'); await H.dorme(600);
  const t=await p.evaluate(()=>document.querySelector('.pjp-cwm').innerText);
  ok('"Convidar os PJ" mostra "Painel ligado ao Conectwork" e a situação de cada um (pronto · na fila)', /Painel ligado ao Conectwork/.test(t)&&/pronto no Conectwork · mande o convite/.test(t)&&/na fila/.test(t), t.slice(0,700));
  await p.click('[data-act="pjp-cwconvw"][data-f="f1"]'); await H.dorme(800);
  const u=await p.evaluate(()=>window.__pjpUltimoConv||'');
  ok('O WhatsApp do Joao leva o convite pronto (convite/?c=tok1) e o e-mail dele', /convite%2F%3Fc%3Dtok1/.test(u)&&/joao%40teste\.com/.test(u), u.slice(0,300));
  ok('Sem erros na página', !er.length, er.join(' | '));
  await B.browser.close(); console.log(res.filter(Boolean).length+' de '+res.length+' testes de cwponte passaram.'); process.exit(res.every(Boolean)?0:1); })().catch(e=>{ console.error('ERRO NO TESTE',e); process.exit(1); });
