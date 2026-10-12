const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ let {d}=H.seed((d)=>{ d.users['fernando@painel-colafix.app']={uid:'uFER',pass:'fer123',nome:'Fernando'}; d.docs['perfis/uFER']={nome:'Fernando',usuario:'fernando'}; d.docs['acessos/uFER']={perfil:'consulta',mods:['silosver','cal'],linhas:['Linha 1'],ativo:true};
   d.docs['config/geral'].siloConsumo={'Linha 1':'c2','Linha 2':'c1'}; });
 const B=await H.abrir(); const p=B.page; const env=[]; let falhar=0;
 await B.ctx.route('https://ntfy.sh/**',async r=>{ if(r.request().method()==='OPTIONS') return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST'}});
   if(falhar>0){ falhar--; return r.abort('internetdisconnected'); } env.push(JSON.parse(r.request().postData()||'{}')); return r.fulfill({status:200,headers:{'access-control-allow-origin':'*'},body:'{}'}); });
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 const ir=async sid=>{ await p.evaluate(sid=>{ __T.S().siloSel=sid; __T.go('silos'); },sid); await H.dorme(300); };
 await ir('c2'); await p.click('[data-act="av-novo"]'); await H.dorme(600);
 let srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const av=srv['config/geral'].avisos;
 ok('Administradora cria o tópico e liga os avisos (tópico longo e aleatório, QR e instruções na tela)', av&&av.ativo&&/^colafix-silos-[a-z2-9]{9}$/.test(av.topico)&&/App Store/.test(await p.evaluate(()=>document.getElementById('view').innerText))&&await p.evaluate(()=>!!document.querySelector('.av-top svg')), av&&av.topico);
 await p.click('[data-act="av-teste"]'); await H.dorme(500);
 ok('Aviso de teste vai para o tópico certo', env.length===1&&env[0].topic===av.topico&&/Teste/.test(env[0].title), JSON.stringify(env[0]));
 // medição 📏
 await ir('c2'); await p.click('[data-act="sm-abrir"]'); await p.fill('#sm-kg','8000'); await p.click('[data-act="sm-salvar"]'); await H.dorme(900);
 const m1=env[1]; ok('Medição pelo 📏 gera UM aviso com silo, toneladas, % e situação', env.length===2&&/Medição dos silos/.test(m1.title)&&/Silo Grande: 8,0 t \(11,4% · Crítico\)/.test(m1.message)&&/Medido por Iasmyn/.test(m1.message)&&m1.priority===4&&!!m1.click, m1&&(m1.title+' | '+m1.message.replace(/\n/g,' / ')));
 // "Nova medição" com 3 silos
 await p.evaluate(()=>__T.go('medicao')); await H.dorme(400);
 await p.evaluate(()=>{ const S=__T.S(); S.med.v.c1='10'; S.med.v.c2='20'; S.med.v.c3='15'; }); await p.evaluate(()=>{ const b=document.getElementById('m-salvar'); b.disabled=false; b.click(); }); await H.dorme(1200);
 const m2=env[2]; ok('"Nova medição" com vários silos gera UM aviso com todos', env.length===3&&(m2.message.match(/ t \(/g)||[]).length===3, m2&&m2.message.replace(/\n/g,' / '));
 // crítico pelo consumo: Silo Pequeno 10 t de 30 (33%) → consome 3 t → 7 t (23%, abaixo de 25%)
 await p.evaluate(()=>__T.salvar('entregas',{ordem:'5002',num:'5002',linha:'Linha 2',em:new Date().toISOString(),por:'x',qtd:600})); await H.dorme(900);
 await p.evaluate(()=>__T.salvar('entregas',{ordem:'5002',num:'5002',linha:'Linha 2',em:new Date().toISOString(),por:'x',qtd:100})); await H.dorme(900);
 const cr=env.filter(x=>/Silo crítico/.test(x.title));
 ok('Silo que fica crítico pelo consumo gera aviso urgente, só uma vez ao cruzar o limite', cr.length===1&&/Silo Pequeno: 7,0 t/.test(cr[0].message)&&cr[0].priority===5, cr[0]&&(cr[0].title+' | '+cr[0].message.replace(/\n/g,' / ')));
 // sem internet: guarda e reenvia
 falhar=1; const n0=env.length; await p.click('[data-act="av-teste"]').catch(async()=>{ await ir('c2'); await p.click('[data-act="av-teste"]'); }); await H.dorme(600);
 const fila=await p.evaluate(()=>JSON.parse(localStorage.getItem('painel.avisos.fila')||'[]').length);
 await H.dorme(31500);
 ok('Sem internet: o aviso fica guardado e é reenviado sozinho', fila===1&&env.length===n0+1&&await p.evaluate(()=>JSON.parse(localStorage.getItem('painel.avisos.fila')||'[]').length)===0, 'na fila='+fila+' · reenviados='+(env.length-n0));
 // desligado: não envia
 await ir('c2'); await p.uncheck('#av-ativo'); await H.dorme(500); const n1=env.length;
 await p.click('[data-act="sm-abrir"]'); await p.fill('#sm-kg','7000'); await p.click('[data-act="sm-salvar"]'); await H.dorme(900);
 ok('Avisos desligados: nada é enviado', env.length===n1);
 await p.evaluate(()=>{ __T.S(); }); await ir('c2'); await p.check('#av-ativo'); await H.dorme(500);
 srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); await B.browser.close();
 // Fernando vê como assinar
 const F=await H.abrir(); await H.preparar(F.page,srv); await F.page.goto(H.BASE); await H.entrar(F.page,'fernando','fer123'); await H.dorme(2000);
 await F.page.evaluate(()=>__T.go('silosver')); await H.dorme(300); const tf=await F.page.evaluate(()=>document.getElementById('view').innerText);
 ok('Fernando vê, na tela dele, como assinar os avisos no iPhone (sem poder mudar a configuração)', /RECEBER AVISOS NO CELULAR/.test(tf)&&tf.includes(av.topico)&&/App Store/.test(tf)&&!(await F.page.$('#av-ativo')), '');
 console.log('erros:',[...B.erros,...F.erros].filter(x=>!/404|internetdisconnected|Failed to fetch|ERR_INTERNET/.test(x)));
 await F.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
