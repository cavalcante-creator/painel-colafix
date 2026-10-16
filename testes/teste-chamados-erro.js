/* Computador de chamados: quando o Firebase não responde ou recusa, a tela mostra o motivo e libera para tentar de novo (não fica só carregando). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs, t=new Date().toISOString();
 D['crachas/ABCD2345']={codigo:'ABCD2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true,adesivo:'000123',criadoEm:t};
 d.users['chamados@painel-colafix.app']={uid:'uCH',pass:'ch1234',nome:'Chamados'}; D['perfis/uCH']={nome:'Computador de chamados',usuario:'chamados'}; D['acessos/uCH']={perfil:'chamados',mods:['tablet'],locais:[],ativo:true};
 const B=await H.abrir({viewport:{width:1600,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'chamados','ch1234'); await H.dorme(2500);
 const ate=async()=>{ await p.keyboard.type('000123',{delay:12}); await p.keyboard.press('Enter'); await H.dorme(900); await p.click('[data-act="cq-eq"]'); await H.dorme(300); await p.click('[data-act="cq-def"]'); await H.dorme(300); };
 // 1) o Firebase não responde (a trava do número da OS fica pendurada)
 await p.evaluate(()=>{ window.__cqTempo=1500; const db=__T.S().db, d0=db.doc.bind(db); db.doc=pth=>{ const r=d0(pth); if(/^chamados\/os-/.test(pth)) r.acquire=()=>new Promise(()=>{}); return r; }; window.__dbRestaura=()=>{ db.doc=d0; }; });
 await ate(); await p.click('[data-act="cq-imp"][data-v="parou"]'); await H.dorme(2600);
 let m=await p.evaluate(()=>({msg:(document.querySelector('.cq-msg')||{}).innerText||'',env:__T.S().tt.enviando,dis:!!document.querySelector('[data-act="cq-imp"][disabled]')}));
 ok('Firebase sem responder: em vez de só carregar, mostra o aviso e libera o botão', /não respondeu/.test(m.msg)&&!m.env&&!m.dis, JSON.stringify(m));
 const zera=async()=>{ await p.evaluate(()=>{ const T=__T.S().tt; T.recente={}; Object.assign(T,{fase:'espera',p:null,msg:''}); __T.go('mantotem'); }); await H.dorme(600); };
 // 2) regras antigas: a trava é recusada → o painel numera sem trava e abre o chamado
 await p.evaluate(()=>{ window.__dbRestaura(); const db=__T.S().db, d0=db.doc.bind(db); db.doc=pth=>{ const r=d0(pth); if(/^chamados\/os-/.test(pth)) r.acquire=async()=>{ const e=new Error('Missing or insufficient permissions.'); e.code='permission-denied'; throw e; }; return r; }; window.__dbRestaura=()=>{ db.doc=d0; }; });
 await p.click('[data-act="cq-imp"][data-v="parou"]'); await H.dorme(2500);
 let t2=await p.evaluate(()=>(document.querySelector('.cq-fim h1')||{}).innerText||'');
 ok('Regras antigas (trava recusada): o chamado abre mesmo assim, numerado sem trava', /Chamado aberto/.test(t2), t2);
 // 3) a própria gravação do chamado é recusada → a tela diz o motivo
 await p.evaluate(()=>{ window.__dbRestaura(); const db=__T.S().db, d0=db.doc.bind(db); db.doc=pth=>{ const r=d0(pth); if(/^chamados\/os-/.test(pth)){ r.set=async()=>{ const e=new Error('Missing or insufficient permissions.'); e.code='permission-denied'; throw e; }; } return r; }; window.__dbRestaura=()=>{ db.doc=d0; }; });
 await zera(); await ate(); await p.click('[data-act="cq-imp"][data-v="parou"]'); await H.dorme(2500);
 const m3=await p.evaluate(()=>({msg:(document.querySelector('.cq-msg')||{}).innerText||'',env:__T.S().tt.enviando}));
 ok('Gravação recusada: a tela diz o motivo (sem permissão) e libera para tentar de novo', /permiss/.test(m3.msg)&&!m3.env, JSON.stringify(m3));
 await p.evaluate(()=>window.__dbRestaura()); await zera();
 await p.evaluate(()=>{ window.__dbRestaura(); const T=__T.S().tt; T.recente={}; Object.assign(T,{fase:'espera',p:null,msg:''}); __T.go('mantotem'); }); await H.dorme(600);
 const bts=await p.evaluate(()=>[...document.querySelectorAll('.cq-tema .cq-sec')].map(b=>b.innerText));
 ok('Espera tem "Tela cheia" e "Sair"', bts.includes('Tela cheia')&&bts.includes('Sair'), bts.join(' · '));
 p.once('dialog',dl=>dl.accept()); await p.click('[data-act="cq-sair"]'); await H.dorme(2500);
 ok('"Sair" (com confirmação) encerra a sessão e volta para a entrada', await p.evaluate(()=>!!document.querySelector('#lg, .login, input[type=password]')));
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
