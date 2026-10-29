/* Pedido de 29/10: Produção × Comercial no login do Marcelo (Visão do gestor › Produção). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao'],locais:[],ativo:true};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(4500);
 ok('Marcelo pode abrir Produção × Comercial', await p.evaluate(()=>__T.vo('anlcom'))===true);
 await p.evaluate(()=>__T.go('gxprod')); await H.dorme(1200);
 const ab=await p.evaluate(()=>[...document.querySelectorAll('.gxg-tabs .gxg-tb')].map(b=>b.innerText.trim()).join('|')); ok('Aba "Produção × Comercial" no grupo Produção', /Produção × Comercial/.test(ab), ab);
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('.gxg-tabs .gxg-tb')].find(x=>/Comercial/.test(x.innerText)); b&&b.click(); }); await H.dorme(1800);
 const v=await p.evaluate(()=>({v:__T.S().view,t:document.getElementById('view').innerText.slice(0,300),abas:!!document.querySelector('.gxg-tabs')}));
 ok('Abre a tela com as abas da Produção do gestor', v.v==='anlcom'&&/Produção × Comercial/.test(v.t)&&v.abas, JSON.stringify(v).slice(0,250));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
