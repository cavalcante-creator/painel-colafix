/* 05/11: "deixe tudo conectado — quando desliga a pessoa pode tirar ela da lista": quem saiu não entra na folha do almoço/café,
   o editor da lista mostra os desligados com "Tirar da lista" e desligar a pessoa no RH tira o nome das duas listas. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const iso=x=>x.toISOString().slice(0,10), hj=iso(new Date()), lista=require('./lista-ficticia.json');
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  D['rh/dados/funcionarios/a']={nome:'ALBERTO RAMOS DA SILVA',cpf:'11111111111',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2020-01-01',funcao:'Operador',setor:'Linha 1'};
  D['rh/dados/funcionarios/g']={nome:'GILSON FARIAS',cpf:'22222222222',tipo:'CLT',empresa:'COLAFIX',status:'Desligado',desligamento:'2026-10-01',admissao:'2020-01-01'};
  D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{listaFolha:lista},cafe:{lista:['Alberto Ramos','Gilson Farias','Augusto Teles']}});
  D['rh/dados/almoco/'+hj.slice(0,7)]={mes:hj.slice(0,7),pessoas:{'11111111111':{n:'ALBERTO RAMOS DA SILVA'}},dias:{[hj]:{'11111111111':{a:'11:40',p:1,t:['11:40:00 REFEITÓRIO']}}},imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:1100}}); const p=B.page; p.on('dialog',x=>x.accept()); const erros=[]; p.on('pageerror',e=>erros.push(e.message));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
  await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.vis='dia'; a.dia=x; },hj); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(1000);
  await p.click('[data-act="alm-fabre"]'); await H.dorme(700);
  const pv=await p.evaluate(()=>[...document.querySelectorAll('.alm-pvt tbody tr td:first-child')].map(t=>t.innerText.trim()));
  ok('Quem já foi desligado (Gilson) não sai na folha, mesmo ainda na lista fixa', pv.length===66&&!pv.includes('Gilson Farias')&&pv.includes('Alberto Ramos'), pv.length);
  await p.click('[data-act="alm-flista"]'); await H.dorme(500);
  const ed=await p.evaluate(()=>({t:document.querySelector('.alm-fl').innerText, g:[...document.querySelectorAll('.alm-flin')].find(x=>x.dataset.v==='Gilson Farias').closest('.alm-flr').innerText}));
  ok('Editor: o Gilson aparece "Desligado em 01/10/2026 · não sai na folha" e o aviso com o botão para tirar', /Desligado em 01\/10\/2026/.test(ed.g)&&/1 pessoa desligada continua na lista/.test(ed.t), ed.g);
  await p.click('[data-act="alm-fl-tirasai"]'); await H.dorme(400); await p.click('[data-act="alm-flsalva"]'); await H.dorme(900);
  let cfg=await p.evaluate(()=>window.RHAlmoco._A.ctx.R.cfg);
  ok('"Tirar da lista" + Salvar: a lista fixa fica sem o Gilson (66 nomes)', cfg.almoco.listaFolha.length===66&&!cfg.almoco.listaFolha.includes('Gilson Farias'));
  // desligar o Alberto pelo RH
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(600); await p.evaluate(()=>document.querySelector('[data-act="rh-deslnovo"]').click()); await H.dorme(500);
  await p.selectOption('#rh-desf','a'); await H.dorme(500);
  await p.fill('#rh-desd',hj); await p.click('[data-act="rh-deslsalvar"]'); await H.dorme(1500);
  const sv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/config']);
  ok('Desligar no RH tira o nome das listas do almoço e do café', !sv.almoco.listaFolha.includes('Alberto Ramos')&&sv.almoco.listaFolha.length===65&&JSON.stringify(sv.cafe.lista)==='["Gilson Farias","Augusto Teles"]', JSON.stringify(sv.cafe.lista));
  ok('Fica registrado quem saiu da lista e por quê', (sv.almoco.listaTirados||[]).some(x=>x.n==='Alberto Ramos Da Silva'&&/Desligado/.test(x.mot)), JSON.stringify(sv.almoco.listaTirados));
  ok('Sem erros na página', !erros.length, erros.join(' | '));
  await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
