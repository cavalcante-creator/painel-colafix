/* Pedidos de 26/10 (tarde): (1) administradora sem o aviso "ninguém assumiu o chamado"; (2) janela da ordem não fecha
   com clique que começa dentro, e o leitor no nº da complementar só preenche. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs, velho=new Date(Date.now()-3*3600e3).toISOString();
 D['chamados/os-00011']={numero:11,linha:'Linha 2',equip:'Ensacadeira',defeito:'x',impacto:'parou',nome:'Ana',status:'Aberta',criado:velho};
 d.users['manut@painel-colafix.app']={uid:'uMN',pass:'mn1234',nome:'Bruno Manut'}; D['perfis/uMN']={nome:'Bruno Manut',usuario:'manut'}; D['acessos/uMN']={perfil:'manut',mods:['manut'],locais:[],ativo:true};
 let B=await H.abrir({viewport:{width:1366,height:720}}); let p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(4000);
 await p.evaluate(()=>__T.go('programacao')); await H.dorme(23000);
 let t=await p.evaluate(()=>(document.getElementById('toast')||{}).innerText||''); let s=await p.evaluate(()=>{ document.getElementById('tp-sino').click(); return new Promise(r=>setTimeout(()=>{ const x=(document.querySelector('.tp-pop')||{}).innerText||''; document.getElementById('tp-sino').click(); r(x); },400)); });
 ok('Administradora: sem o aviso "ninguém assumiu" (toast e sino)', !/ninguém assumiu/.test(t)&&!/sem atendimento/i.test(s), t+' | '+s.replace(/\n/g,' ').slice(0,200));
 await p.evaluate(()=>{ const S=__T.S(); const o=S.ordens.find(x=>String(x.num)==='5001'); S.ord.aberta=o._id; S.ord.painel='entrega'; __T.go('programacao'); }); await H.dorme(800);
 await p.focus('#o-av'); await p.keyboard.type('50',{delay:40}); await H.dorme(300);
 /* clique que começa no link e termina no fundo da janela */
 const L=await p.evaluate(()=>{ const b=document.querySelector('[data-act="o-comp-tudo"]').getBoundingClientRect(); return {x:b.x+10,y:b.y+b.height/2}; });
 await p.mouse.move(L.x,L.y); await p.mouse.down(); await p.mouse.move(5,5,{steps:3}); await p.mouse.up(); await H.dorme(500);
 ok('Clique que começa dentro e solta no fundo não fecha a janela', await p.evaluate(()=>!!document.querySelector('.omodal')));
 await p.click('[data-act="o-comp-tudo"]'); await H.dorme(500);
 ok('"Lançar em ordem complementar" abre os campos e a janela continua', await p.evaluate(()=>!!document.querySelector('.omodal .compbox')));
 await p.focus('[data-comp="0"][data-k="n"]'); await p.keyboard.type('OP-5002',{delay:12}); await p.keyboard.press('Enter'); await H.dorme(700);
 const r=await p.evaluate(()=>({m:!!document.querySelector('.omodal'),ab:__T.S().ord.aberta,v:document.querySelector('[data-comp="0"][data-k="n"]').value,n:__T.S().ord.f.comp[0].n}));
 ok('Leitor no nº da complementar: preenche 5002 e fica na ordem 5001', r.m&&r.ab==='5001'&&r.v==='5002'&&r.n==='5002', JSON.stringify(r));
 await p.mouse.click(5,5); await H.dorme(500); ok('Clique no fundo (começa e termina fora) ainda fecha', await p.evaluate(()=>!document.querySelector('.omodal')));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close();
 B=await H.abrir({viewport:{width:1366,height:720}}); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'manut','mn1234'); await H.dorme(4000);
 const xs=await p.evaluate(()=>{ document.getElementById('tp-sino').click(); return new Promise(r=>setTimeout(()=>r((document.querySelector('.tp-pop')||{}).innerText||''),400)); });
 ok('A manutenção continua com o aviso de chamado sem atendimento', /sem atendimento/i.test(xs), xs.replace(/\n/g,' ').slice(0,200));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
