/* Pagamento dos PJ · Pedir nota pelo Conectwork (10/11): para os PJ da Zenith e da Nexus, "Pedir nota" manda a medição da quinzena
   da prestadora ao Conectwork (nome, horas, valor e CNPJ do PJ, nunca CPF); os outros continuam pelo link. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção']};
  const P=[['f1','JOAO PEREIRA TESTE','ZENITH','11122233344','12345678000190',5000],['f4','ANA SOUZA TESTE','ZENITH','22233344455','22345678000190',4400],['f2','MARIA OLIVEIRA TESTE','NEXUS','55566677788','11222333000181',4000],['f5','BRUNO LIMA TESTE','OUTRA','33344455566','33345678000190',3000],['f6','CARLA DIAS TESTE','COLAFIX','44455566677','44345678000190',3600]];
  P.forEach(([id,n,e,cpf,cnpj,s])=>{ D['rh/dados/funcionarios/'+id]={nome:n,tipo:'PJ',empresa:e,cpf,cnpj,salario:s,setor:'Produção',funcao:'Operador',status:'Ativo',admissao:'2025-01-10',telefone:'51999990000'}; });
  const dias={}; ['16','19','20','21','22'].forEach(x=>{ const k='2026-10-'+x; dias[k]={}; P.forEach(([id,n,e,cpf],i)=>{ dias[k][cpf]={p:1,a:1,t:['07:2'+i+':10 PORTARIA','17:2'+i+':00 PORTARIA']}; }); });
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias,pessoas:Object.fromEntries(P.map(([id,n,e,cpf])=>[cpf,{n,e}])),imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ window.open=(u)=>{ window.__abriu=(window.__abriu||[]).concat([u]); return {}; }; window.RHPJPag._J.per='2026-10-2'; window.RHPJPag._J.aba='lista'; __T.go('rhpjpag'); }); await H.dorme(2500);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  const linha=id=>p.evaluate(id=>{ const b=document.querySelector('.pjp-lc [data-f="'+id+'"]'); const tr=b&&b.closest('tr'); return tr?tr.innerText:''; },id);
  const so2=await p.evaluate(()=>[...document.querySelectorAll('.pjp-lc .pjp-nm')].map(b=>b.textContent.split(' ')[0]).sort().join(','));
  ok('Por padrão o Pagamento dos PJ só mostra os PJ da Zenith e da Nexus', so2==='Ana,Joao,Maria', so2);
  await p.evaluate(()=>window.Painel.db().doc('rh/config').set({pjPag:{emps:['ZENITH','NEXUS','OUTRA','COLAFIX']}},{merge:true})); await H.dorme(900);
  await p.evaluate(()=>window.Painel.render()); await H.dorme(400);
  const ler=u=>{ const t=u.split('#medicoes/importar/')[1], b64=t.replace(/-/g,'+').replace(/_/g,'/'), pad=b64+'==='.slice((b64.length+3)%4); return JSON.parse(decodeURIComponent(Array.from(Buffer.from(pad,'base64').toString('binary')).map(ch=>'%'+ch.charCodeAt(0).toString(16).padStart(2,'0')).join(''))); };
  await p.click('[data-act="pjp-fech"][data-f="f1"]'); await H.dorme(900);
  ok('PJ da Zenith com valor fechado: a linha leva à nota da Zenith (sem outro botão do Conectwork) e tem o link "nota separada"', /Ver na nota da Zenith/.test(await linha('f1'))&&/nota separada/.test(await linha('f1'))&&!/Pedir nota pelo Conectwork/.test(await linha('f1')), await linha('f1'));
  await p.click('[data-act="pjp-fech"][data-f="f5"]'); await H.dorme(900);
  ok('PJ de outra empresa continua com "Pedir nota" (link)', /Pedir nota/.test(await linha('f5'))&&!/Conectwork/.test(await linha('f5')));
  await p.click('[data-act="pjp-fech"][data-f="f6"]'); await H.dorme(900);
  ok('PJ que a Colafix paga direto: "Pedir nota" pelo link (não vai ao Conectwork)', /Pedir nota/.test(await linha('f6'))&&!/Conectwork/.test(await linha('f6')));
  const cwB=await p.evaluate(()=>(document.querySelector('.pjp-cw')||{}).innerText||''); ok('A Colafix não aparece no quadro do Conectwork', !(await p.$('#pjp-cw-COLAFIX'))&&!!(await p.$('#pjp-cw-ZENITH'))&&!/Colafix \(paga/.test(cwB), cwB.slice(0,200));
  await p.click('.pjp-lc [data-act="pjp-fin"][data-f="f6"]'); await H.dorme(700);
  const pv=await p.evaluate(()=>(document.getElementById('pjp-finpv')||{}).innerText||'');
  ok('E-mail ao financeiro da PJ paga direto: nota do próprio prestador para a Colafix e depósito na conta do prestador', /emitida para a COLAFIX/.test(pv)&&/Depositar na conta de cada prestador/.test(pv)&&!/Depositar em conta COLAFIX/.test(pv), pv.slice(0,300));
  await p.keyboard.press('Escape'); await H.dorme(300);
  await p.click('.pjp-lc [data-act="pjp-cwvai"][data-f="f1"]'); await H.dorme(700);
  let m=await p.evaluate(()=>{ const x=document.getElementById('pjp-cw-ZENITH'); return x?x.innerText:''; });
  ok('"Ver na nota da Zenith" leva ao quadro da Zenith: 1 pronto, 1 sem valor fechado, mandar o pronto ou fechar os que faltam', /1 pronto/.test(m)&&/1 sem valor fechado/.test(m)&&/Mandar o pronto agora/.test(m)&&/fechar o que falta e mandar todos/.test(m)&&!/Maria/.test(m), m.slice(0,400));
  if(process.env.SHOT) await p.screenshot({path:process.env.SHOT});
  await p.click('#pjp-cw-ZENITH [data-act="pjp-cwtodos"]'); await H.dorme(500);
  await p.click('#pjp-cw-ZENITH [data-act="pjp-cwped"]:not([data-so])'); await H.dorme(1800);
  const ab=await p.evaluate(()=>window.__abriu||[]), u=ab.filter(x=>/importar/.test(x)).pop()||''; let R=null; try{ R=ler(u); }catch(e){}
  ok('Manda ao Conectwork a medição da Zenith com os 2 PJ, horas, valor e o CNPJ de cada um (sem CPF)', R&&R.cnpj==='62944495000164'&&R.itens.length===2&&R.itens.every(i=>/^\d{14}$/.test(i.c)&&i.v>0)&&!/11122233344|22233344455/.test(JSON.stringify(R)), JSON.stringify(R));
  let S=await srv(), pes=S['rh/dados/pjpag/2026-10-2'].pes;
  ok('Os dois ficam "pedido pelo Conectwork" (o que faltava foi fechado antes) e a medição fica registrada', pes.f1.st==='pedido'&&pes.f1.ped.via==='conectwork'&&pes.f4.st==='pedido'&&pes.f4.fech&&pes.f4.ped.via==='conectwork'&&S['rh/dados/pjpag/2026-10-2'].cw.ZENITH.n===2, JSON.stringify({f1:pes.f1.st,f4:pes.f4.st}));
  ok('Na lista: "Pedido no Conectwork" e só o link "ver na nota da Zenith" (a nota é conferida no quadro da empresa)', /Pedido no Conectwork/.test(await linha('f1'))&&/ver na nota da Zenith/.test(await linha('f1'))&&!/Abrir o Conectwork/.test(await linha('f1'))&&!/nota conferida no Conectwork/.test(await linha('f1')), await linha('f1'));
  { const cwt=await p.evaluate(()=>(document.querySelector('.pjp-cw')||{}).innerText||''); ok('Por empresa: medição enviada, nota da Zenith para a Colafix, Colafix pagou e as notas dos MEIs no Conectwork', /Medição enviada ao Conectwork/.test(cwt)&&/Nota da Zenith para a Colafix/.test(cwt)&&/Colafix pagou a Zenith/.test(cwt)&&/Notas dos MEIs para a Zenith/.test(cwt), cwt.slice(0,500)); }
  if(process.env.SHOT2){ await p.evaluate(()=>document.querySelector('.pjp-cw').scrollIntoView()); await H.dorme(300); const bx=await p.evaluate(()=>{ const r=document.querySelector('.pjp-cw').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; }); await p.screenshot({path:process.env.SHOT2,clip:bx}); }
  await p.click('[data-act="pjp-cwnota"][data-e="ZENITH"]'); await H.dorme(1200); S=await srv();
  ok('"Nota conferida" da Zenith: os PJ da Zenith ficam com a nota conferida', S['rh/dados/pjpag/2026-10-2'].cw.ZENITH.nota&&S['rh/dados/pjpag/2026-10-2'].pes.f4.st==='conferida'&&S['rh/dados/pjpag/2026-10-2'].pes.f4.conf.via==='conectwork-empresa'&&/Nota da empresa conferida/.test(await linha('f4')), await linha('f4'));
  await p.click('[data-act="pjp-cwpago"][data-e="ZENITH"]'); await H.dorme(1200); S=await srv();
  ok('"Colafix pagou a Zenith": todos os PJ da Zenith ficam Pago à Zenith', S['rh/dados/pjpag/2026-10-2'].cw.ZENITH.pago&&S['rh/dados/pjpag/2026-10-2'].pes.f1.st==='pago'&&S['rh/dados/pjpag/2026-10-2'].pes.f4.pago.via==='empresa'&&/Pago à Zenith/.test(await linha('f4')), await linha('f4'));
  await p.click('[data-act="pjp-cwpagox"][data-e="ZENITH"]'); await H.dorme(1200); S=await srv();
  ok('Desfazer o pagamento da Zenith volta cada PJ para a etapa de antes', !S['rh/dados/pjpag/2026-10-2'].cw.ZENITH.pago&&S['rh/dados/pjpag/2026-10-2'].pes.f4.st==='conferida'&&S['rh/dados/pjpag/2026-10-2'].pes.f1.st==='conferida');
  await p.click('[data-act="pjp-fech"][data-f="f2"]'); await H.dorme(900);
  await p.evaluate(()=>{ window.RHPJPag._J.aba='pv'; window.Painel.render(); }); await H.dorme(500);
  const pp=await p.evaluate(()=>{ const e=document.querySelector('.pjp-ppl'); return e?e.innerText+' '+e.title:''; });
  ok('Próximo passo com Nexus e outra empresa: diz que Zenith e Nexus vão pelo Conectwork', /Zenith e Nexus pelo Conectwork/.test(pp)&&/Pedir nota aos 3/.test(pp), pp.replace(/\n/g,' | '));
  await p.click('.pjp-ppl [data-act="pjp-pedtodos"]'); await H.dorme(700);
  S=await srv(); m=await p.evaluate(()=>(document.getElementById('pjp-cw-NEXUS')||{}).innerText||'');
  ok('"Pedir nota aos 3": o da outra empresa recebe o link e a Nexus fica no quadro do Conectwork (1 pronto)', S['rh/dados/pjpag/2026-10-2'].pes.f5.st==='pedido'&&!S['rh/dados/pjpag/2026-10-2'].pes.f5.ped.via&&/pedidos de nota criados/.test(await p.evaluate(()=>document.body.innerText))&&/1 pronto/.test(m)&&/Maria|Mandar a nota da Nexus|Mandar o pronto/.test(m), m.slice(0,300));
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
