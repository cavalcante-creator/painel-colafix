/* Pagamento dos PJ · Conectwork num lugar só, junto ou nota separada (12/11/2026, "mandar o André para a Zenith e o valor dele
   entrar no total da nota da Zenith, ou mandar só dele"; "tem vários botões da Conectwork e confunde"). Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção']};
  const P=[['f1','JOAO PEREIRA TESTE','ZENITH','11122233344','12345678000190',5000],['f4','ANA SOUZA TESTE','ZENITH','22233344455','22345678000190',4400],['f7','RUI COSTA TESTE','ZENITH','33344455566','32345678000190',4000],['f8','LIA PRADO TESTE','ZENITH','44455566677','42345678000190',4000]];
  P.forEach(([id,n,e,cpf,cnpj,s])=>{ D['rh/dados/funcionarios/'+id]={nome:n,tipo:'PJ',empresa:e,cpf,cnpj,salario:s,setor:'Produção',funcao:'Operador',status:'Ativo',admissao:'2025-01-10',telefone:'51999990000'}; });
  const dias={}; ['16','19','20','21','22'].forEach(x=>{ const k='2026-10-'+x; dias[k]={}; P.forEach(([id,n,e,cpf],i)=>{ dias[k][cpf]={p:1,a:1,t:['07:2'+i+':10 PORTARIA','17:2'+i+':00 PORTARIA']}; }); });
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias,pessoas:Object.fromEntries(P.map(([id,n,e,cpf])=>[cpf,{n,e}])),imp:[]};
  /* a Lia já foi paga por fora (nota pelo link): fica fora da nota da Zenith */
  D['rh/dados/pjpag/2026-10-2']={pid:'2026-10-2',de:'2026-10-16',ate:'2026-10-31',pes:{f8:{st:'pago',fech:{valor:500,min:2400,vh:12.5},pago:{em:'2026-11-01T10:00:00Z',por:'RH',de:'conferida'}}}};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ window.open=(u)=>{ window.__abriu=(window.__abriu||[]).concat([u]); return {}; }; window.RHPJPag._J.per='2026-10-2'; window.RHPJPag._J.aba='lista'; __T.go('rhpjpag'); }); await H.dorme(2500);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  const ler=u=>{ const t=u.split('#medicoes/importar/')[1], b64=t.replace(/-/g,'+').replace(/_/g,'/'), pad=b64+'==='.slice((b64.length+3)%4); return JSON.parse(decodeURIComponent(Array.from(Buffer.from(pad,'base64').toString('binary')).map(ch=>'%'+ch.charCodeAt(0).toString(16).padStart(2,'0')).join(''))); };
  const ultimo=async()=>{ const ab=await p.evaluate(()=>window.__abriu||[]); const u=ab.filter(x=>/importar/.test(x)).pop()||''; try{ return ler(u); }catch(e){ return null; } };
  const pes=async()=>(await srv())['rh/dados/pjpag/2026-10-2'].pes;
  const card=()=>p.evaluate(()=>(document.getElementById('pjp-cw-ZENITH')||{}).innerText||'');
  const linhaF=id=>p.evaluate(id=>{ const b=document.querySelector('.pjp-lc [data-f="'+id+'"]'); const tr=b&&b.closest('tr'); return tr?tr.innerText:''; },id);

  // 1) só o Joao tem o valor: a linha leva ao quadro da Zenith; lá vai JUNTO só o pronto, os outros ficam para depois
  await p.click('[data-act="pjp-fech"][data-f="f1"]'); await H.dorme(900);
  const l1=await linhaF('f1');
  await p.click('.pjp-lc [data-act="pjp-cwvai"][data-f="f1"]'); await H.dorme(700);
  let m=await card();
  ok('Um lugar só: a linha tem "Ver na nota da Zenith" (sem botão do Conectwork) e o quadro da Zenith diz 1 pronto, 2 sem valor fechado; a Lia (paga por fora) fica fora',
    /Ver na nota da Zenith/.test(l1)&&!/Pedir nota pelo Conectwork/.test(l1)&&/1 pronto/.test(m)&&/2 sem valor fechado/.test(m)&&/Mandar o pronto agora/.test(m)&&/Fora da nota da Zenith: Lia/.test(m), JSON.stringify({l1,m:m.slice(0,500)}));
  await p.click('#pjp-cw-ZENITH [data-act="pjp-cwped"][data-so="f"]'); await H.dorme(1800);
  let R=await ultimo(), X=await pes();
  ok('"Mandar o pronto agora": vai a nota da Zenith só com o Joao; os outros continuam sem o valor fechado',
    R&&R.itens.length===1&&R.ref==='painel-rh:2026-10-2:ZENITH'&&!R.parte&&X.f1.st==='pedido'&&!X.f1.ped.sep&&!(X.f4&&X.f4.st)&&!(X.f7&&X.f7.st), JSON.stringify({R,X}));

  // 2) a Ana vai em nota SEPARADA (a Zenith faz uma nota só para ela)
  await p.evaluate(()=>{ const d=document.querySelector('#pjp-cw-ZENITH details.pjp-cwq'); if(d) d.open=true; }); await H.dorme(200);
  await p.click('#pjp-cw-ZENITH [data-act="pjp-cwsepr"][data-f="f4"]'); await H.dorme(700);
  m=await card();
  ok('"nota separada" passa a Ana para "Notas separadas" com "Fechar e mandar só Ana" (e sai da nota da Zenith)', /Notas separadas/.test(m)&&/Fechar e mandar só Ana/.test(m)&&/1 sem valor fechado/.test(m), m.slice(0,600));
  await p.click('#pjp-cw-ZENITH [data-act="pjp-cwsepm"][data-f="f4"]'); await H.dorme(1800);
  R=await ultimo(); X=await pes();
  ok('A nota separada vai só com a Ana, com a "parte" própria (outra medição no Conectwork), e fica marcada separada',
    R&&R.itens.length===1&&/^Ana/.test(R.itens[0].n)&&/^[a-z0-9]{3,30}$/.test(R.parte)&&R.ref==='painel-rh:2026-10-2:ZENITH:'+R.parte&&X.f4.st==='pedido'&&X.f4.ped.sep===true, JSON.stringify({R,f4:X.f4}));

  // 3) depois o Rui fecha (fecha a janela, fecha o valor e abre de novo pelo botão): mandar de novo vai com Joao + Rui
  await p.keyboard.press('Escape'); await H.dorme(300);
  await p.click('[data-act="pjp-fech"][data-f="f7"]'); await H.dorme(1000);
  const bt3=await p.evaluate(()=>{ const b=document.querySelector('[data-act="pjp-cwabre"]'); return b?b.innerText:''; }); await p.click('[data-act="pjp-cwabre"]'); await H.dorme(500);
  m=await card();
  ok('Botão "Conectwork · 1 para mandar" e, na janela, com o Rui fechado, o quadro avisa "tem valor novo" e mostra a Ana como nota separada enviada', /1 para mandar/.test(bt3)&&/tem valor novo/.test(m)&&/Mandar de novo \(atualiza a medição\)/.test(m)&&/enviada/.test(m), m.slice(0,600));
  await p.click('#pjp-cw-ZENITH [data-act="pjp-cwped"]'); await H.dorme(2200);
  R=await ultimo(); X=await pes();
  ok('"Mandar de novo": a nota da Zenith vai com Joao + Rui (atualiza a de antes), sem a Ana e sem a Lia',
    R&&R.itens.length===2&&R.ref==='painel-rh:2026-10-2:ZENITH'&&!R.itens.some(i=>/^(Ana|Lia)/.test(i.n))&&X.f7.st==='pedido'&&(await srv())['rh/dados/pjpag/2026-10-2'].cw.ZENITH.n===2, JSON.stringify(R));
  const l4=await linhaF('f4'), l7=await linhaF('f7');
  ok('Na lista: a Ana "Nota separada no Conectwork" com "Nota separada conferida"; o Rui só com o link para a nota da Zenith', /Nota separada no Conectwork/.test(l4)&&/Nota separada conferida/.test(l4)&&/ver na nota da Zenith/.test(l7)&&!/Abrir o Conectwork/.test(l7), JSON.stringify({l4,l7}));
  if(process.env.SHOT){ await p.evaluate(()=>document.getElementById('pjp-cw-ZENITH').scrollIntoView()); await H.dorme(300); await p.screenshot({path:process.env.SHOT}); }
  ok('Sem erros na página', !er.length, er.join(' | '));
  await B.browser.close(); console.log(res.filter(Boolean).length+' de '+res.length+' testes de pjpcwsep passaram.'); process.exit(res.every(Boolean)?0:1); })().catch(e=>{ console.error('ERRO NO TESTE',e); process.exit(1); });
