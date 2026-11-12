/* Pagamento dos PJ · Pedir nota pelo Conectwork, junto ou separada (12/11/2026, "mandar o André para a Zenith e o valor dele
   entrar no total da nota da Zenith, ou mandar só dele e a Zenith fazer um valor só para ele"). Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção']};
  const P=[['f1','JOAO PEREIRA TESTE','ZENITH','11122233344','12345678000190',5000],['f4','ANA SOUZA TESTE','ZENITH','22233344455','22345678000190',4400],['f7','RUI COSTA TESTE','ZENITH','33344455566','32345678000190',4000]];
  P.forEach(([id,n,e,cpf,cnpj,s])=>{ D['rh/dados/funcionarios/'+id]={nome:n,tipo:'PJ',empresa:e,cpf,cnpj,salario:s,setor:'Produção',funcao:'Operador',status:'Ativo',admissao:'2025-01-10',telefone:'51999990000'}; });
  const dias={}; ['16','19','20','21','22'].forEach(x=>{ const k='2026-10-'+x; dias[k]={}; P.forEach(([id,n,e,cpf],i)=>{ dias[k][cpf]={p:1,a:1,t:['07:2'+i+':10 PORTARIA','17:2'+i+':00 PORTARIA']}; }); });
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias,pessoas:Object.fromEntries(P.map(([id,n,e,cpf])=>[cpf,{n,e}])),imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ window.open=(u)=>{ window.__abriu=(window.__abriu||[]).concat([u]); return {}; }; window.RHPJPag._J.per='2026-10-2'; window.RHPJPag._J.aba='lista'; __T.go('rhpjpag'); }); await H.dorme(2500);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  const ler=u=>{ const t=u.split('#medicoes/importar/')[1], b64=t.replace(/-/g,'+').replace(/_/g,'/'), pad=b64+'==='.slice((b64.length+3)%4); return JSON.parse(decodeURIComponent(Array.from(Buffer.from(pad,'base64').toString('binary')).map(ch=>'%'+ch.charCodeAt(0).toString(16).padStart(2,'0')).join(''))); };
  const ultimo=async()=>{ const ab=await p.evaluate(()=>window.__abriu||[]); const u=ab.filter(x=>/importar/.test(x)).pop()||''; try{ return ler(u); }catch(e){ return null; } };
  const modal=()=>p.evaluate(()=>{ const x=document.querySelector('[aria-label="Pedir nota pelo Conectwork"]'); return x?x.innerText:''; });
  const pes=async()=>(await srv())['rh/dados/pjpag/2026-10-2'].pes;

  // 1) só o Joao tem o valor: vai JUNTO na nota da Zenith agora; os outros ficam para depois
  await p.click('[data-act="pjp-fech"][data-f="f1"]'); await H.dorme(900);
  await p.click('.pjp-lc [data-act="pjp-ped"][data-f="f1"]'); await H.dorme(700);
  let m=await modal();
  ok('A janela mostra cada PJ da Zenith com "Junto na nota da Zenith" ou "Nota separada" e oferece mandar só o fechado agora',
    (await p.$$('[data-pjp-cwsep]')).length===3&&/Mandar só o fechado agora/.test(m)&&/Fechar os 2 e mandar todos/.test(m), m.slice(0,500));
  await p.click('[data-act="pjp-cwped"][data-so="f"]'); await H.dorme(1800);
  let R=await ultimo(), X=await pes();
  ok('"Mandar só o fechado agora": vai a medição da Zenith só com o Joao; os outros continuam sem o valor fechado',
    R&&R.itens.length===1&&R.ref==='painel-rh:2026-10-2:ZENITH'&&!R.parte&&X.f1.st==='pedido'&&!X.f1.ped.sep&&!(X.f4&&X.f4.st)&&!(X.f7&&X.f7.st), JSON.stringify({R,X}));

  // 2) a Ana vai em nota SEPARADA (a Zenith faz uma nota só para ela)
  await p.selectOption('[data-pjp-cwsep="f4"]','1'); await H.dorme(400);
  m=await modal();
  ok('Escolher "Nota separada" para a Ana mostra "Fechar e mandar só Ana" e tira ela da nota da Zenith', /Fechar e mandar só Ana/.test(m)&&/Nota da Zenith \(junto\) · 2 PJ/.test(m), m.slice(0,600));
  await p.click('[data-act="pjp-cwsepm"][data-f="f4"]'); await H.dorme(1800);
  R=await ultimo(); X=await pes();
  ok('A nota separada vai só com a Ana, com a "parte" própria (outra medição no Conectwork), e fica marcada separada',
    R&&R.itens.length===1&&/^Ana/.test(R.itens[0].n)&&/^[a-z0-9]{3,30}$/.test(R.parte)&&R.ref==='painel-rh:2026-10-2:ZENITH:'+R.parte&&X.f4.st==='pedido'&&X.f4.ped.sep===true, JSON.stringify({R,f4:X.f4}));

  // 3) depois o Rui fecha e a nota da Zenith vai de novo, com Joao + Rui (a Ana não entra: é separada)
  m=await modal();
  ok('Na janela a Ana aparece como "Nota separada enviada"', /Nota separada enviada/.test(m), m.slice(0,600));
  await p.click('[data-act="pjp-cwped"]:not([data-so])'); await H.dorme(2200);
  R=await ultimo(); X=await pes();
  ok('"Mandar de novo": a medição da Zenith vai com Joao + Rui (atualiza a de antes), sem a Ana',
    R&&R.itens.length===2&&R.ref==='painel-rh:2026-10-2:ZENITH'&&!R.itens.some(i=>/^Ana/.test(i.n))&&X.f7.st==='pedido'&&(await srv())['rh/dados/pjpag/2026-10-2'].cw.ZENITH.n===2, JSON.stringify(R));
  await p.keyboard.press('Escape'); await H.dorme(300);
  const l4=await p.evaluate(()=>{ const b=document.querySelector('.pjp-lc [data-f="f4"]'); const tr=b&&b.closest('tr'); return tr?tr.innerText:''; });
  ok('Na lista a Ana aparece "Nota separada no Conectwork"', /Nota separada no Conectwork/.test(l4), l4);
  ok('Sem erros na página', !er.length, er.join(' | '));
  await B.browser.close(); console.log(res.filter(Boolean).length+' de '+res.length+' testes de pjpcwsep passaram.'); process.exit(res.every(Boolean)?0:1); })().catch(e=>{ console.error('ERRO NO TESTE',e); process.exit(1); });
