/* "Travar este aparelho" (23/10): em qualquer login, sair do painel (menu do usuário), sair do rodízio das TVs e fechar a janela pedem a senha. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut();
  let B=await H.abrir({viewport:{width:1366,height:768}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
  /* sem senha definida: avisa */
  await p.click('.quem'); await H.dorme(300); await p.click('#pf-menu [data-m="travaap"]'); await H.dorme(400);
  ok('Sem a senha de administrador definida, explica onde definir', await p.evaluate(()=>/Manutenção › Configurações/.test((document.getElementById('toast')||{}).innerText||'')&&!document.getElementById('trava-m')));
  await p.evaluate(()=>__T.go('mancfg')); await H.dorme(600); await p.fill('#trava-n','1234abc'); await p.click('[data-act="trava-salvar"]'); await H.dorme(1000);
  ok('Configurações explicam o "Travar este aparelho"', /Travar este aparelho/.test(await p.evaluate(()=>document.querySelector('.trava-cfg').innerText)));
  const srv=await p.evaluate(()=>localStorage.getItem('__srv')); await B.browser.close();
  /* login da TV */
  B=await H.abrir({viewport:{width:1366,height:768}}); p=B.page; await H.preparar(p,JSON.parse(srv)); await p.goto(H.BASE); await H.entrar(p,'tv','tv1234'); await H.dorme(3000);
  await p.click('.quem'); await H.dorme(300); const tx=await p.evaluate(()=>(document.querySelector('#pf-menu [data-m="travaap"]')||{}).textContent);
  ok('Menu do usuário tem "Travar este aparelho"', /Travar este aparelho/.test(tx||''), tx);
  await p.click('#pf-menu [data-m="travaap"]'); await H.dorme(300); await p.fill('#trava-s','errada'); await p.keyboard.press('Enter'); await H.dorme(500);
  ok('Para travar pede a senha (errada não trava)', await p.evaluate(()=>/Senha errada/.test(document.querySelector('.trava-e').textContent)&&localStorage.getItem('colafix.travaAparelho')!=='1'));
  await p.fill('#trava-s','1234abc'); await p.keyboard.press('Enter'); await H.dorme(500);
  ok('Senha certa: aparelho travado (guardado no aparelho)', await p.evaluate(()=>localStorage.getItem('colafix.travaAparelho')==='1'&&document.body.classList.contains('trava-ap')));
  await p.click('.quem'); await H.dorme(300); await p.click('#pf-menu [data-m="sair"]'); await H.dorme(500);
  ok('Travado: "Sair" do menu do usuário pede a senha e não sai', await p.evaluate(()=>!!document.getElementById('trava-m')&&!!document.querySelector('.quem')));
  await p.click('.trava-x'); await H.dorme(300);
  /* rodízio das TVs */
  await p.evaluate(()=>{ __T.S().apres.sel=new Proxy({},{get:()=>true}); }); await p.evaluate(()=>__T.go('apres')).catch(()=>{}); await H.dorme(600);
  const ini=await p.$('[data-act="apr-ini"]'); if(ini){ await ini.click(); await H.dorme(1200); }
  const on=await p.evaluate(()=>!!(__T.S().apres&&__T.S().apres.on));
  if(on){ await p.keyboard.press('Escape'); await H.dorme(500); const r1=await p.evaluate(()=>({m:!!document.getElementById('trava-m'),on:__T.S().apres.on}));
    ok('Rodízio das TVs: Esc pede a senha e continua passando', r1.m&&r1.on, JSON.stringify(r1));
    await p.fill('#trava-s','1234abc'); await p.keyboard.press('Enter'); await H.dorme(600);
    ok('Com a senha, sai do rodízio', await p.evaluate(()=>!__T.S().apres.on)); }
  else ok('Rodízio das TVs abriu para testar', false, 'não abriu');
  /* destravar */
  await p.click('.quem'); await H.dorme(300); ok('No aparelho travado o menu mostra "Destravar este aparelho"', /Destravar/.test(await p.evaluate(()=>document.querySelector('#pf-menu [data-m="travaap"]').textContent)));
  await p.click('#pf-menu [data-m="travaap"]'); await H.dorme(300); await p.fill('#trava-s','1234abc'); await p.keyboard.press('Enter'); await H.dorme(500);
  await p.click('.quem'); await H.dorme(300); const sem=await p.evaluate(()=>localStorage.getItem('colafix.travaAparelho')!=='1'&&/Travar este aparelho/.test(document.querySelector('#pf-menu [data-m="travaap"]').textContent)); await p.keyboard.press('Escape'); await p.mouse.click(5,300); await H.dorme(200);
  ok('Destravado com a senha', sem);
  /* fechar a janela (travado de novo) */
  await p.evaluate(()=>localStorage.setItem('colafix.travaAparelho','1'));
  let pergunta=false; p.on('dialog',async x=>{ if(x.type()==='beforeunload'){ pergunta=true; await x.dismiss(); } else await x.accept(); });
  await p.mouse.click(5,300); await p.close({runBeforeUnload:true}); await H.dorme(800);
  ok('Fechar a janela travada: o navegador pergunta antes de sair', pergunta);
  console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
