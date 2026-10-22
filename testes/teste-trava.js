/* Computador de chamados/posto travado (senha de administrador para sair) e 2º técnico no mesmo chamado. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs, t=new Date().toISOString();
 D['crachas/BCDE3456']={codigo:'BCDE3456',nome:'Bruno Lima',linha:'',papel:'tecnico',ativo:true,adesivo:'777888',criadoEm:t};
 D['crachas/CDEF4567']={codigo:'CDEF4567',nome:'Carlos Souza',linha:'',papel:'tecnico',ativo:true,adesivo:'555666',criadoEm:t};
 D['chamados/os-00020']={numero:20,linha:'Linha 1',defeito:'Mecânico',tipo:'mecanico',impacto:'parou',nome:'Ana',status:'Em execução',criado:new Date(Date.now()-30*6e4).toISOString(),exec:{tecnico:'Bruno Lima',inicio:new Date(Date.now()-20*6e4-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16)}};
 d.users['posto@painel-colafix.app']={uid:'uPO',pass:'po1234',nome:'Posto'}; D['perfis/uPO']={nome:'Posto',usuario:'posto'}; D['acessos/uPO']={perfil:'posto',mods:['tablet'],locais:[],ativo:true};
 /* 1) a administradora define a senha em Manutenção › Configurações */
 let B=await H.abrir({viewport:{width:1366,height:768}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('mancfg')); await H.dorme(600); await p.fill('#trava-n','1234abc'); await p.click('[data-act="trava-salvar"]'); await H.dorme(1000);
 const ts=await p.evaluate(()=>__T.S().cfg.travaSenha); ok('Configurações da manutenção: senha de administrador salva (só o resumo, não a senha)', ts&&ts.h&&ts.h.length===64&&!JSON.stringify(ts).includes('1234abc'), JSON.stringify(ts));
 const srv=await p.evaluate(()=>localStorage.getItem('__srv')); await B.browser.close();
 /* 2) posto: Sair pede a senha */
 B=await H.abrir({viewport:{width:1366,height:768}}); p=B.page; await H.preparar(p,JSON.parse(srv)); await p.goto(H.BASE); await H.entrar(p,'posto','po1234'); await H.dorme(3500);
 const bip=async c=>{ await p.keyboard.type(c,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(900); };
 await p.click('[data-act="po-sair"]'); await H.dorme(500); let m=await p.evaluate(()=>!!document.getElementById('trava-m'));
 ok('Posto travado: "Sair" abre "Computador travado" pedindo a senha de administrador', m);
 await p.fill('#trava-s','errada'); await p.keyboard.press('Enter'); await H.dorme(600); const er=await p.evaluate(()=>(document.querySelector('.trava-e')||{}).textContent);
 const ainda=await p.evaluate(()=>__T.S().view); ok('Senha errada: não sai', /Senha errada/.test(er)&&ainda==='mantotem', er+' '+ainda);
 await p.click('.trava-x'); await H.dorme(300);
 /* 3) 2º técnico */
 await bip('555666'); let s=await p.evaluate(()=>({f:__T.S().tt.fase,t:document.body.innerText}));
 ok('Outro técnico bipa: o chamado do Bruno mostra "Entrar junto (2º técnico)"', s.f==='potec'&&!!(await p.$('[data-act="cq-junto"][data-n="20"]')), s.f);
 await p.click('[data-act="cq-junto"][data-n="20"]'); await H.dorme(1500);
 const ex=await p.evaluate(()=>(__T.S().chamados.find(c=>c.numero===20)||{}).exec); s=await p.evaluate(()=>document.body.innerText);
 ok('Grava o 2º técnico e a espera mostra "Sendo arrumada · Bruno Lima e Carlos Souza"', ex&&ex.tecnico==='Bruno Lima'&&ex.ajudante&&ex.ajudante.nome==='Carlos Souza'&&/Bruno Lima e Carlos Souza/.test(s), JSON.stringify(ex));
 await p.evaluate(()=>{ __T.S().tt.recente={}; }); await bip('555666'); const j2=!!(await p.$('[data-act="cq-junto"]')); s=await p.evaluate(()=>document.body.innerText);
 ok('Com dois técnicos, não aparece mais "Entrar junto" e o chamado diz COM BRUNO LIMA E CARLOS SOUZA', !j2&&/COM BRUNO LIMA E CARLOS SOUZA|COM VOCÊ/.test(s), s.slice(0,300).replace(/\n/g,'|'));
 await p.keyboard.press('Escape'); await H.dorme(500);
 await p.click('[data-act="po-sair"]'); await H.dorme(400); await p.fill('#trava-s','1234abc'); await p.keyboard.press('Enter'); await H.dorme(2500);
 const login=await p.evaluate(()=>!!document.querySelector('input[type="password"]')&&!(window.__T&&__T.S().uid));
 ok('Senha certa: sai da conta', login);
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
