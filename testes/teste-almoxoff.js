/* Celular do almox sem internet: não trava em "Salvando…", guarda no celular e avisa */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const ok=(n,c,d)=>console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):''));
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['celalmox@painel-colafix.app']={uid:'uCEL',pass:'cel123',nome:'Joana Almox'}; D['perfis/uCEL']={nome:'Joana Almox',usuario:'celalmox'}; D['acessos/uCEL']={perfil:'almoxcel',mods:['almoxcel'],locais:[],ativo:true};
 D['ordens/5001'].rancho='123456'; D['ranchos/123456']={numero:'123456',criadoEm:new Date().toISOString(),ordens:[{num:'5001'}],itens:[{c:'MP001',d:'Cimento',um:'kg',q:500}]};
 D['crachas/ANAS2345']={codigo:'ANAS2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true};
 const B=await H.abrir({viewport:{width:390,height:844}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'celalmox','cel123');
 await p.waitForFunction(()=>window.__T&&__T.S().view==='mantotem',null,{timeout:12000}); await H.dorme(800);
 /* sem internet: o banco simulado não responde (como o Firestore offline: a gravação fica na fila do celular) */
 await B.ctx.setOffline(true); await p.evaluate(()=>{ const db=__T.S().db, d0=db.doc.bind(db); db.doc=pth=>{ const r=d0(pth); if(/^ordens\//.test(pth)) r.update=()=>new Promise(()=>{}); return r; }; window.dispatchEvent(new Event('offline')); });
 const tela=()=>p.evaluate(()=>(document.querySelector('.tt')||{}).innerText||'');
 await H.dorme(300); const t0=await tela();
 await p.fill('#tt-rnum','123456'); await p.click('[data-act="tt-rnum"]'); await H.dorme(400);
 await p.keyboard.type('CXANAS2345',{delay:8}); await p.keyboard.press('Enter'); await H.dorme(500);
 await p.click('[data-act="cf-ok"][data-i="0"]'); await p.click('[data-act="cf-salvar"]'); await H.dorme(1200); const t1=await tela();
 ok('Sem internet: avisa no topo e a conferência não trava (segue para quem recebe, com 1 registro guardado)', /Sem internet/.test(t0)&&/crachá de quem vai receber/.test(t1)&&/1 registro guardado no celular/.test(t1), t1.replace(/\n/g,' | ').slice(0,260));
 console.log('erros:',B.erros.filter(x=>!/404|ERR_INTERNET|net::/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
