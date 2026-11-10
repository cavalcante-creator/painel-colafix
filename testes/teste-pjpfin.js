/* Pagamento dos PJ · E-mail ao financeiro (10/11): o painel monta o e-mail que o RH escrevia à mão (valor de cada PJ, total por empresa,
   "a nota fiscal será …", a folha de cada um e "Depositar em conta …"), copia e abre o Outlook com para/cópia/assunto. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={setores:['Produção']};
  const P=[['f1','JOAO PEREIRA TESTE','ZENITH','11122233344',5000,'Ativo',''],['f2','MARIA OLIVEIRA TESTE','NEXUS','55566677788',4000,'Ativo',''],['f3','PEDRO ALVES TESTE','ZENITH','22233344455',4400,'Desligado','2026-10-27']];
  P.forEach(([id,n,e,cpf,s,st,dl],i)=>{ D['rh/dados/funcionarios/'+id]=Object.assign({nome:n,tipo:'PJ',empresa:e,cpf,cnpj:'1234567800019'+i,salario:s,setor:'Produção',funcao:'Operador',status:st,admissao:'2025-01-10'},dl?{desligamento:dl}:{}); });
  const dias={}; ['16','19','20','21','22','23','26','27'].forEach(x=>{ const k='2026-10-'+x; dias[k]={}; P.forEach(([id,n,e,cpf],i)=>{ dias[k][cpf]={p:1,a:1,t:['07:2'+i+':10 PORTARIA','12:01:00 REFEITÓRIO','17:2'+i+':00 PORTARIA']}; }); });
  D['rh/dados/almoco/2026-10']={mes:'2026-10',dias,pessoas:Object.fromEntries(P.map(([id,n,e,cpf])=>[cpf,{n,e}])),imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  await p.evaluate(()=>{ window.RHPJPag._J.per='2026-10-2'; window.RHPJPag._J.aba='lista'; __T.go('rhpjpag'); }); await H.dorme(2500);
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  ok('Botão "E-mail ao financeiro" em Todos os PJ', await p.$('.pjp-lt1 [data-act="pjp-fin"]'));
  await p.click('.pjp-lt1 [data-act="pjp-fin"]'); await H.dorme(700);
  let m=await p.evaluate(()=>{ const x=document.querySelector('.pjp-fin'); return x?{mot:document.getElementById('pjp-fmot').value,sel:[...x.querySelectorAll('[data-pjp-fsel]')].filter(c=>c.checked).map(c=>c.dataset.pjpFsel).join(','),pv:document.getElementById('pjp-finpv').innerText}:null; });
  ok('Abre a janela com os 3 PJ marcados e, como tem um desligado, o motivo "desligado antes da data habitual"', m&&m.sel==='f1,f2,f3'&&m.mot==='desl', JSON.stringify(m&&{mot:m.mot,sel:m.sel}));
  ok('Prévia como o e-mail do RH: valor, ENVIAR TOTAL, nota fiscal e depósito por empresa, desligamento, folha e assinatura',
    /devido ser desligado antes da data de pagamento habitual/.test(m.pv)&&/ENVIAR TOTAL DE R\$/.test(m.pv)&&/a nota fiscal será ZENITH/.test(m.pv)&&/a nota fiscal será NEXUS/.test(m.pv)&&/Depositar em conta ZENITH/.test(m.pv)&&/Depositar em conta NEXUS/.test(m.pv)&&/Total a Pagar/.test(m.pv)&&/Conversão Decimal/.test(m.pv)&&/Gestão de Pessoas/.test(m.pv)&&/Stefani RH/.test(m.pv), m.pv.slice(0,300));
  await p.uncheck('[data-pjp-fsel="f2"]'); await H.dorme(500);
  m=await p.evaluate(()=>document.getElementById('pjp-finpv').innerText);
  ok('Desmarcar tira a pessoa e a empresa do e-mail', !/NEXUS/.test(m)&&!/Maria/.test(m)&&/Pedro/.test(m), m.slice(0,200));
  await p.selectOption('#pjp-fmot','quinzena'); await H.dorme(400); m=await p.evaluate(()=>document.getElementById('pjp-finpv').innerText);
  ok('Motivo "pagamento da quinzena" tira a frase do desligamento', !/desligado antes/.test(m));
  await p.evaluate(()=>{ window.open=(u)=>{ window.__abriu=u; return {}; }; }); await p.click('[data-act="pjp-finok"]'); await H.dorme(800);
  ok('Sem e-mail em "Para" não abre o Outlook', await p.$('.pjp-fin'));
  await p.fill('#pjp-fpara','financeiro@exemplo.com.br'); await p.fill('#pjp-fcc','rh@exemplo.com.br'); await p.click('[data-act="pjp-finok"]'); await H.dorme(1500);
  const F=await p.evaluate(()=>window.__pjpFin);
  ok('Copiar e abrir o Outlook: link do Outlook com para, cópia e assunto', F&&/outlook\.office\.com\/mail\/deeplink\/compose\?to=financeiro%40exemplo\.com\.br&cc=rh%40exemplo\.com\.br&subject=Pagamento%20PJ/.test(F.url), F&&F.url);
  ok('A janela do Outlook abre direto no endereço do e-mail (não em branco)', await p.evaluate(()=>window.__abriu)===(F&&F.url), await p.evaluate(()=>window.__abriu));
  await H.dorme(800);
  const bd=decodeURIComponent(((F&&F.url||'').split('&body=')[1]||''));
  ok('O e-mail já vai escrito no Outlook (corpo no link): valor, total, nota, dias e depósito', /Olá,/.test(bd)&&/ENVIAR TOTAL DE R\$/.test(bd)&&/a nota fiscal será ZENITH/.test(bd)&&/16\/10 sex/.test(bd)&&/Depositar em conta ZENITH/.test(bd)&&/Gestão de Pessoas/.test(bd)&&F.url.length<=7800, bd.slice(0,300));
  const S=await srv(), pes=(S['rh/dados/pjpag/2026-10-2']||{}).pes||{};
  ok('Guarda para/cópia e marca nas pessoas que o e-mail foi feito', ((S['rh/config'].pjPag||{}).finEmail||{}).para==='financeiro@exemplo.com.br'&&pes.f1&&pes.f1.fin&&pes.f3&&pes.f3.fin&&!(pes.f2&&pes.f2.fin), JSON.stringify(S['rh/config'].pjPag));
  await p.click('.pjp-lt1 [data-act="pjp-fin"]'); await H.dorme(600);
  ok('Na próxima vez, o "Para" já vem preenchido', await p.inputValue('#pjp-fpara')==='financeiro@exemplo.com.br');
  if(process.env.SHOT){ await p.screenshot({path:process.env.SHOT}); }
  const e2=er.concat(B.erros||[]).filter(x=>!/404|cdnjs/.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); await B.browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });
