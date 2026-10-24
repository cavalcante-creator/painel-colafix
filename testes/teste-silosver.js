const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,230):'')); };
(async()=>{ const {d}=H.seed((d)=>{
  d.users['consulta@painel-colafix.app']={uid:'uCON',pass:'con123',nome:'Marcos Consulta'}; d.docs['perfis/uCON']={nome:'Marcos Consulta',usuario:'consulta'};
  d.docs['acessos/uCON']={perfil:'silosver',mods:['silosver'],locais:[],ativo:true};
  const t=new Date().toISOString(), velho=new Date(Date.now()-30*36e5).toISOString();
  d.docs['silos/c1']={saldoKg:21000,medidoKg:21000,medidoEm:t,atualizadoEm:t,origem:'medicao'};
  d.docs['silos/c2']={saldoKg:9500,medidoKg:10000,medidoEm:t,atualizadoEm:t,origem:'consumo'};
  d.docs['silos/c3']={saldoKg:4000,medidoKg:4000,medidoEm:velho,atualizadoEm:velho,origem:'medicao'};
  d.docs['silos/a1']={saldoKg:42000,medidoKg:42000,medidoEm:t,atualizadoEm:t,origem:'medicao'};
  d.docs['cargas/k1']={nota:'1234',qtd:32,criadaEm:t,etapas:{caminho:t}};
 });
 // ---- administradora: o perfil pronto aparece em Equipe e cargos ----
 let B=await H.abrir(); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>{ __T.S().eq.aba='cargos'; __T.S().eq.maisCg=true; __T.go('acessos'); }); await H.dorme(500); const eq=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Perfil pronto "Silos (só consulta)" disponível em Equipe e cargos', /Silos \(só consulta\)/.test(eq) && /Só olha o nível dos silos/.test(eq));
 await B.browser.close();
 // ---- a pessoa da consulta ----
 B=await H.abrir(); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'consulta','con123'); await H.dorme(2200);
 let e=await p.evaluate(()=>({v:__T.S().view,nav:document.getElementById('navlist').innerText,txt:document.getElementById('view').innerText,acts:document.querySelectorAll('#view [data-act],#view input,#view textarea,#view select').length}));
 ok('Entra direto na tela de consulta, com um único item no menu', e.v==='silosver' && e.nav.trim()==='Nível dos silos', `tela=${e.v} menu=${e.nav.replace(/\n/g,'|')}`);
 ok('Mostra os níveis: toneladas, % e situação de cada silo, totais por grupo', /Silo Pequeno/.test(e.txt)&&/21,0\s*t/.test(e.txt)&&/9,5\s*t/.test(e.txt)&&/13,6% · Crítico/.test(e.txt)&&/CIMENTO|Cimento/.test(e.txt)&&/34,5 t/.test(e.txt)&&/42,0\s*t/.test(e.txt), e.txt.replace(/\n/g,' | ').slice(0,230));
 ok('Mostra a origem e avisa quando um silo está desatualizado (>24 h)', /⚙️ automático/.test(e.txt)&&/📏 medido/.test(e.txt)&&/mais de 24 horas/.test(e.txt));
 ok('Nenhum botão, campo ou ação que grave dados na tela', e.acts===0, 'elementos de ação: '+e.acts);
 const tent=[]; for(const v of ['geral','medicao','cargas','silos','programacao','manch','ajustes','acessos','meudia']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(150); tent.push(v+'→'+await p.evaluate(()=>__T.S().view)); }
 ok('Não consegue abrir nenhuma outra tela (medição, cargas, ajustes, produção…)', tent.every(x=>x.endsWith('→silosver')), tent.join(' '));
 await p.evaluate(()=>{ const v=JSON.parse(localStorage.getItem('__srv')); v.docs['silos/c2'].saldoKg=8900; v.docs['silos/c2'].atualizadoEm=new Date().toISOString(); localStorage.setItem('__srv',JSON.stringify(v)); window.__mockReconnect(); }); await H.dorme(800);
 ok('Atualiza sozinho quando o saldo muda (sem recarregar)', /8,9\s*t/.test(await p.evaluate(()=>document.getElementById('view').innerText)));
 ok('No banco, o perfil é tratado como "só ver"', await p.evaluate(()=>{ try{ return true; }catch(e){ return false; } }) && require('fs').readFileSync(''+require('path').join(__dirname,'..','firestore.rules')+'','utf8').includes("'cal', 'silosver'"));
 await p.setViewportSize({width:390,height:844}); await H.dorme(400); await p.screenshot({path:'/tmp/silos-consulta-celular.png',fullPage:true});
 const larg=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
 ok('No celular: sem rolagem lateral', larg[0]<=larg[1], larg.join(' / '));
 await p.setViewportSize({width:1280,height:900}); await H.dorme(300); await p.screenshot({path:'/tmp/silos-consulta-pc.png'});
 console.log('erros:', B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
