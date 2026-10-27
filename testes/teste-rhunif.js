/* Pedido de 27/10: RH › Uniformes — a administradora registra a entrega de uniforme, o painel abre o e-mail pronto para o RH
   e o RH vê a entrega para lançar na ficha (aviso no Meu dia do RH, "Lancei na ficha"). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 D['rh/config']={setores:['Manutenção','Linha 1']};
 D['rh/dados/funcoes/fn1']={nome:'Mecânico',epis:[],uniformes:[{nome:'Camiseta',tam:'GG'},{nome:'Calça',tam:'44'}]};
 D['rh/dados/funcionarios/f1']={nome:'CARLOS RANNAN DA SILVA',setor:'Manutenção',funcao:'Mecânico',status:'Ativo',tipo:'CLT',empresa:'COLAFIX'};
 D['rh/dados/funcionarios/f2']={nome:'CARLA SOUZA',setor:'Linha 1',funcao:'Operador',status:'Ativo',tipo:'CLT',empresa:'COLAFIX'};
 const erros=[]; let B=await H.abrir({viewport:{width:1440,height:950}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message));
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), col=async c=>Object.entries(await srv()).filter(([k])=>k.startsWith(c+'/')).map(([k,v])=>Object.assign({_k:k},v));
 const view=()=>p.evaluate(()=>document.getElementById('view').innerText);
 /* ação rápida (+) e tela */
 await p.click('#tp-mais'); await H.dorme(500); const temAcao=!!(await p.$('[data-tp="acao"][data-v="unif"]'));
 ok('Ações rápidas (+) têm "Entregar uniforme"', temAcao);
 await p.click('[data-tp="acao"][data-v="unif"]'); await H.dorme(1200);
 ok('Abre a tela Uniformes do RH com o formulário', await p.evaluate(()=>__T.S().view==='rhunif'&&!!document.getElementById('rhu-pn')));
 ok('Sem e-mails guardados: o campo "E-mails do RH" já vem aberto', !!(await p.$('#rhu-mp')));
 await p.fill('#rhu-mp','stefani@colafix.com; departamentopessoal@colafix.com'); await p.fill('#rhu-mc','marcelo@colafix.com'); await p.click('[data-act="rhu-cfgok"]'); await H.dorme(700);
 const cfg=(await srv())['rh/config']; ok('Guarda os e-mails do RH em rh/config.unifEmail', cfg&&cfg.unifEmail&&cfg.unifEmail.para==='stefani@colafix.com; departamentopessoal@colafix.com'&&cfg.unifEmail.cc==='marcelo@colafix.com', JSON.stringify(cfg&&cfg.unifEmail));
 await p.fill('#rhu-pn','carlos ran'); await H.dorme(300);
 const sug=await p.$$eval('[data-act="rhu-pick"]',bs=>bs.map(b=>b.innerText));
 ok('Busca a pessoa no cadastro do RH enquanto digita', sug.length===1&&/Carlos Rannan/.test(sug[0])&&/Manutenção/.test(sug[0]), JSON.stringify(sug));
 await p.click('[data-act="rhu-pick"]'); await H.dorme(500);
 ok('Escolhendo: setor vem do cadastro e aparecem as peças da função', (await p.inputValue('#rhu-st'))==='Manutenção'&&(await p.$$('[data-act="rhu-addu"]')).length===2);
 await p.click('[data-act="rhu-addu"][data-i="0"]'); await H.dorme(400);
 await p.click('[data-act="rhu-per"][data-v="Manhã"]'); await H.dorme(300); await p.fill('#rhu-sol','10102'); await H.dorme(200); await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/rhunif-form.png'});
 const pv=await p.$eval('#rhu-pvt',e=>e.textContent), hj=await p.evaluate(()=>__T.S().view&&Painel.hojeStr()), hjBr=hj.slice(8,10)+'/'+hj.slice(5,7)+'/'+hj.slice(0,4);
 const esp=['Funcionário: Carlos Rannan da Silva','Setor: Manutenção','Data da entrega: '+hjBr+' - Manhã','Itens entregues:','Camiseta GG - 1 un','Solicitação registrada no sistema: Nº 10102'].join('\n');
 ok('Prévia do e-mail igual ao modelo de hoje', pv===esp, JSON.stringify(pv));
 await p.click('[data-act="rhu-ok"][data-v="mail"]'); await H.dorme(1200);
 const us=await col('rh/dados/uniformes'), u=us[0];
 ok('Grava a entrega para o RH (pessoa, setor, período, itens, nº da solicitação, quem entregou, para conferir)', us.length===1&&u.nome==='Carlos Rannan da Silva'&&u.fid==='f1'&&u.setor==='Manutenção'&&u.per==='Manhã'&&u.itens.length===1&&u.itens[0].t==='Camiseta'&&u.itens[0].tam==='GG'&&u.itens[0].qtd===1&&u.sol==='10102'&&u.st==='novo'&&!!u.porNome&&!!u.emailEm, JSON.stringify(us));
 const mail=await p.evaluate(()=>window.__rhuUltimoMail||'');
 const dec=decodeURIComponent(mail);
 ok('Abre o e-mail para o RH: para, cópia, assunto e o mesmo texto', /^mailto:stefani@colafix\.com;departamentopessoal@colafix\.com\?/.test(mail)&&/cc=marcelo@colafix\.com/.test(mail)&&dec.includes('subject=Entrega de uniforme - Carlos Rannan da Silva - '+hjBr)&&dec.includes(esp), mail.slice(0,300));
 let s=await view(); ok('Lista "Para o RH lançar (1)" com a entrega', /Para o RH lançar \(1\)/.test(s)&&/Carlos Rannan da Silva/.test(s)&&/Camiseta GG - 1 un/.test(s)&&/RH ainda não lançou/.test(s), s.slice(0,400).replace(/\n/g,' | '));
 /* nome fora do cadastro (terceiro) + validação */
 await p.click('[data-act="rhu-novo"]'); await H.dorme(500); await p.click('[data-act="rhu-ok"][data-v="so"]'); await H.dorme(300);
 ok('Sem nome não grava', (await col('rh/dados/uniformes')).length===1);
 await p.fill('#rhu-pn','Terceiro João Teste'); await H.dorme(200); await p.fill('#rhu-st','Expedição'); await p.fill('[data-rhu-i="0"][data-k="t"]','Calça'); await p.fill('[data-rhu-i="0"][data-k="tam"]','g'); await p.fill('[data-rhu-i="0"][data-k="qtd"]','2');
 await p.click('[data-act="rhu-ok"][data-v="so"]'); await H.dorme(900);
 const u2=(await col('rh/dados/uniformes')).find(x=>/João/.test(x.nome));
 ok('Pessoa fora do cadastro entra com o nome digitado; "Só registrar" não abre e-mail', u2&&u2.fid===''&&u2.itens[0].tam==='G'&&u2.itens[0].qtd===2&&!u2.emailEm, JSON.stringify(u2));
 ok('Sem erros no console (administradora)', !erros.length, erros.join(' | ')); await B.browser.close();
 /* RH */
 B=await H.abrir({viewport:{width:1440,height:950}}); p=B.page; p.on('pageerror',e=>erros.push(e.message));
 const d2=JSON.parse(JSON.stringify(d)); /* o servidor simulado é por navegador: leva o que foi gravado */
 await H.preparar(p,d2); await p.goto(H.BASE);
 await p.evaluate(x=>{ const s=JSON.parse(localStorage.getItem('__srv')||'null'); },null);
 await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
 /* grava as duas entregas no servidor deste navegador */
 await p.evaluate(async us=>{ for(const x of us){ const id=x._k.split('/').pop(); const o=Object.assign({},x); delete o._k; await __T.S().db.doc('rh/dados/uniformes/'+id).set(o); } },us.concat([u2]));
 await H.dorme(1500);
 await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(1200); const av=await view();
 ok('RH: "Precisa de você" no Início avisa "2 entregas de uniforme para lançar na ficha"', /2 entregas de uniforme para lançar na ficha/.test(av), av.slice(0,600).replace(/\n/g,' | '));
 await p.click('#navlist .gxg-gr[data-go="rhfichas"]').catch(()=>{}); await H.dorme(700);
 const sub=await p.evaluate(()=>[...document.querySelectorAll('#navlist .gxg-si')].map(b=>b.dataset.go));
 ok('Menu do RH: Uniformes dentro de Documentos', sub.includes('rhunif'), sub.join(','));
 await p.evaluate(()=>__T.go('rhunif')); await H.dorme(900);
 const id1=us[0]._k.split('/').pop(); await p.click(`[data-act="rhu-lanc"][data-id="${id1}"]`); await H.dorme(900);
 const x1=(await p.evaluate(id=>__T.S().db.doc('rh/dados/uniformes/'+id).get().then(g=>g.data()),id1));
 s=await view(); ok('"Lancei na ficha" marca lançado (quem e quando) e sai da lista do RH', x1.st==='lancado'&&/Stefani/.test(x1.lancPor||'')&&/Para o RH lançar \(1\)/.test(s), JSON.stringify(x1)+' | '+s.slice(0,200).replace(/\n/g,' | '));
 await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/rhunif-rh.png'});
 ok('Sem erros no console (RH)', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
