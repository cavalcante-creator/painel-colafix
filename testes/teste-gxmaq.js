/* Pedido de 29/10: o Marcelo (Visão do gestor) cadastra máquinas e equipamentos da manutenção. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao'],locais:[],ativo:true};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(4500);
 ok('Marcelo (sem o módulo da manutenção) pode abrir Máquinas', await p.evaluate(()=>__T.vo('manequip'))===true);
 await p.evaluate(()=>__T.go('gxch')); await H.dorme(1200);
 const ab=await p.evaluate(()=>[...document.querySelectorAll('.gxg-tabs .gxg-tb')].map(b=>b.innerText.trim()).join('|'));
 ok('Aba "Máquinas" no grupo Manutenção do Marcelo', /Máquinas/.test(ab), ab);
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('.gxg-tabs .gxg-tb')].find(x=>/Máquinas/.test(x.innerText)); b&&b.click(); }); await H.dorme(1500);
 ok('Sem as abas de cima da Manutenção (só as do Marcelo)', await p.evaluate(()=>{ const n=document.querySelector('#view>nav.tabs'); return document.body.classList.contains('gx-mod')&&(!n||getComputedStyle(n).display==='none')&&!!document.querySelector('.gxg-tabs'); }));
 ok('Abre a tela de Máquinas com o formulário de novo equipamento', await p.evaluate(()=>__T.S().view)==='manequip'&&!!(await p.$('#mx-eqn-n')), await p.evaluate(()=>__T.S().view));
 const l=await p.evaluate(()=>{ const s=document.getElementById('mx-eqn-l'); return s&&s.options.length>1?s.options[1].value:''; });
 await p.selectOption('#mx-eqn-l',l); await p.fill('#mx-eqn-n','Misturador Teste'); await p.fill('#mx-eqn-t','MX-01'); await p.click('[data-act="mx-eq-novo"]'); await H.dorme(1500);
 const eq=await p.evaluate(()=>((JSON.parse(localStorage.getItem('__srv')).docs['config/manut']||{}).equips||[]).find(e=>e.nome==='Misturador Teste'));
 ok('Marcelo cadastra a máquina (config/manut.equips)', !!eq&&eq.linha===l, JSON.stringify(eq));
 const tx=await p.evaluate(()=>document.getElementById('view').innerText); ok('A máquina aparece na lista', /Misturador Teste/.test(tx));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
