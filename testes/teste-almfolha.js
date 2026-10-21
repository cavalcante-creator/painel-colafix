/* RH · Almoço: folha de assinatura no modelo do Excel. Sai NORMAL; pergunta se o CSV do Face ID foi importado; o RH confirma quem não veio;
   "Não almoçam hoje" = ausência programada + não almoça na empresa (já marcados); busca de pessoa; tirar da folha só no dia; editar depois de emitir. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const iso=x=>x.toISOString().slice(0,10), hj=iso(new Date()), m=hj.slice(0,7), lista=require('/tmp/lista-almoco.json'); /* aba 2010 da planilha do RH */
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 const F=(id,nome,cpf)=>{ D['rh/dados/funcionarios/'+id]={nome,cpf,tipo:'CLT',status:'Ativo',admissao:'2020-01-01'}; };
 F('a','ADRIANO REUS DA SILVA','11111111111'); F('b','ALEXANDRE TEIXEIRA','22222222222'); F('c','ANA MARIA RODRIGUES','33333333333'); F('i','IASMYN CAVALCANTE','44444444444'); F('s','ALISSON SANTOS','55555555555');
 D['rh/dados/ferias/f1']={funcId:'c',funcionario:'ANA MARIA RODRIGUES',inicio:hj,fim:hj,dias:1,status:'programada'};
 D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{listaFolha:lista,fora:{'55555555555':{em:new Date().toISOString(),por:'RH'}},
   ausencias:[{id:'au1',cpf:'44444444444',nome:'IASMYN CAVALCANTE',tipo:'semana',dias:[new Date(hj+'T12:00').getDay()],de:'2026-01-01'}]}});
 const outro=hj.slice(8)==='01'?addD(hj,1):m+'-01'; function addD(x,n){ const y=new Date(x+'T12:00'); y.setDate(y.getDate()+n); return iso(y); }
 D['rh/dados/almoco/'+m]={mes:m,pessoas:{'11111111111':{n:'ADRIANO REUS DA SILVA'},'22222222222':{n:'ALEXANDRE TEIXEIRA'}},dias:{[hj]:{'11111111111':{a:'11:40'}},[outro]:{'22222222222':{a:'11:50'}}},imp:[]};
 const B=await H.abrir({viewport:{width:1440,height:1100}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 const dia=async x=>{ await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; },x); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1000); const ab=await p.$('[data-act="alm-fabre"]'); if(ab&&!(await p.$('.alm-fm'))){ await ab.click(); await H.dorme(600); } };
 const card=()=>p.evaluate(()=>(document.querySelector('.alm-folha')||{}).innerText||'');
 const imprimir=async()=>{ const pop=p.context().waitForEvent('page'); await p.click('[data-act="alm-folha"]'); const w=await pop; await w.waitForLoadState(); await H.dorme(400);
   const t=await w.evaluate(()=>({h:[...document.querySelectorAll('thead th')].map(t=>t.innerText.trim()),rows:[...document.querySelectorAll('tbody tr')].map(r=>({c:[...r.children].map(td=>td.innerText.trim()),cz:r.classList.contains('cz')}))})); await w.close(); return t; };
 const row=(t,n)=>t.rows.find(r=>r.c[0]===n)||{c:[]}, tot=t=>+(/ - (\d+)$/.exec(t.h[0])||[])[1];
 await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; a.folhaAb=false; },hj); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1200);
 ok('Na tela do dia a folha fica FECHADA: só a faixa com o resumo e "Abrir a folha de assinatura"', await p.evaluate(()=>!!document.querySelector('.alm-fbar [data-act="alm-fabre"]')&&!document.querySelector('.alm-fm')&&!document.querySelector('.alm-folha')));
 await dia(hj); let c=await card();
 const pv=await p.evaluate(()=>({t:(document.querySelector('.alm-fmr')||{}).innerText||'',cz:document.querySelectorAll('.alm-pvt tr.cz').length,n:document.querySelectorAll('.alm-pvt tbody tr').length}));
 ok('Painel aberto: conferência à esquerda e "Como vai sair" (prévia no modelo do Excel) à direita', /Como vai sair/.test(pv.t)&&pv.n===67&&pv.cz===2, JSON.stringify({n:pv.n,cz:pv.cz}));
 ok('Lista fixa: os 67 nomes da aba 20/10', /Lista fixa \(67\)/.test(c), c.match(/Lista fixa \(\d+\)/)?.[0]);
 ok('"Não almoçam hoje": a Iasmyn (programada) e o Alisson (não almoça na empresa) juntos, já marcados', /Não almoçam hoje \(2\)/.test(c)&&await p.evaluate(()=>!!document.querySelector('[data-alm-fprog="Iasmyn Cavalcante"]:checked')&&!!document.querySelector('[data-alm-fprog="Alisson Santos"]:checked')), c.match(/Não almoçam hoje[^|]*/)?.[0]);
 ok('Com o Face ID: "Na lista, mas não passaram" com o Alexandre, sem nada marcado', /não passaram no Face ID/.test(c)&&/Alexandre Teixeira/.test(c)&&await p.evaluate(()=>!document.querySelector('[data-alm-fnv]:checked')));
 let t=await imprimir();
 ok('Folha NORMAL no modelo do Excel: só os 2 que não almoçam hoje em cinza; título = 67 − 2', t.h[1]==='Assinatura'&&tot(t)===lista.length-2&&t.rows.filter(r=>r.cz).map(r=>r.c[0]).sort().join()==='Alisson Santos,Iasmyn Cavalcante'&&row(t,'Alisson Santos').c[1]==='Não almoça na empresa'&&row(t,'Iasmyn Cavalcante').c[1]==='Não almoça (programado)'&&t.rows.slice(0,lista.length).map(r=>r.c[0]).join('|')===lista.join('|'), t.h[0]);
 await p.check('[data-alm-fnv="Alexandre Teixeira"]'); await H.dorme(600); await p.check('[data-alm-fnv="Ana Maria Rodrigues"]'); await H.dorme(600);
 await p.fill('#alm-fbusca','diego'); await H.dorme(300);
 const bus=await p.evaluate(()=>[...document.querySelectorAll('.alm-fbl b')].map(b=>b.innerText));
 ok('Procurar pessoa: digitando "diego" aparece só o Diego', bus.length===1&&bus[0]==='Diego Perfeito', JSON.stringify(bus));
 await p.click('[data-act="alm-fnvset"][data-n="Diego Perfeito"]'); await H.dorme(700);
 ok('O Diego (marcado pela busca) aparece em "Marcados por você", com Desfazer', /Marcados por você \(1\)/.test(await card())&&await p.evaluate(()=>!!document.querySelector('[data-act="alm-fnvx"][data-n="Diego Perfeito"]')));
 const salvo=await p.evaluate(async d=>{ const g=await __T.S().db.doc('rh/dados/almocofolha/'+d).get(); return g.exists?g.data().nv:null; },hj);
 ok('Alexandre (confirmado), Ana (férias) e Diego (pela busca) ficam guardados no dia', salvo&&salvo['Alexandre Teixeira']==='Não veio'&&salvo['Ana Maria Rodrigues']==='Férias'&&salvo['Diego Perfeito']==='Não veio', JSON.stringify(salvo));
 t=await imprimir();
 ok('Na folha: 5 em cinza (2 que não almoçam + 3 marcados); Adriano normal; título = 67 − 5', tot(t)===lista.length-5&&t.rows.filter(r=>r.cz).length===5&&row(t,'Adriano Reus').c[1]===''&&!row(t,'Adriano Reus').cz, t.h[0]);
 await p.fill('#alm-fbusca','tainan'); await H.dorme(300); await p.click('[data-act="alm-ftirar"][data-n="Terceiros - Tainan"]'); await H.dorme(700);
 t=await imprimir(); c=await card();
 ok('Tirar da folha deste dia (Tainan): não sai na impressão e aparece em "Tirados da folha"', !t.rows.some(r=>/Tainan/.test(r.c[0]))&&t.rows.length===lista.length-1+4&&/Tirados da folha deste dia \(1\)/.test(c), 'linhas '+t.rows.length);
 await p.click('[data-act="alm-fdev"][data-n="Terceiros - Tainan"]'); await H.dorme(600); t=await imprimir();
 ok('"Devolver" traz o Tainan de volta', t.rows.some(r=>r.c[0]==='Terceiros - Tainan'));
 await p.uncheck('[data-alm-fprog="Iasmyn Cavalcante"]'); await H.dorme(700); c=await card();
 ok('Editar depois de emitir (desmarcar a Iasmyn): avisa "alterada depois de emitida"', /Marcação alterada depois de emitida/.test(c)&&/Imprimir de novo/.test(c));
 t=await imprimir(); c=await card();
 ok('Reimprimir: a Iasmyn sai normal e o aviso some', !row(t,'Iasmyn Cavalcante').cz&&!/alterada depois de emitida/.test(c));
 await p.click('[data-act="alm-ffecha"]'); await H.dorme(400);
 ok('Fechar o painel volta para a faixa', await p.evaluate(()=>!document.querySelector('.alm-fm')&&!!document.querySelector('.alm-fbar')));
 await p.evaluate(()=>{ window.RHAlmoco._A.fol={}; }); await dia(hj);
 ok('Reabrindo a tela, as marcações do dia continuam', await p.evaluate(()=>!!document.querySelector('[data-alm-fnv="Alexandre Teixeira"]:checked')));
 { const el=await p.$('.alm-folha'); if(el) await el.screenshot({path:'/tmp/folha-quadro.png'}); }
 const sem=addD(outro,1)===hj?addD(hj,1):addD(outro,1); await dia(sem); c=await card();
 ok('Dia sem o CSV importado: pergunta se o Face ID já foi importado', /já foi importado\?/.test(c)&&/Importar o CSV agora/.test(c)&&/Emitir sem conferir/.test(c));
 await p.click('[data-act="alm-fsem"]'); await H.dorme(600); c=await card();
 ok('"Emitir sem conferir": busca de pessoa e imprimir', /Procurar pessoa na lista/.test(c)&&/Imprimir folha/.test(c));
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
