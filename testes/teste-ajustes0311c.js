/* Pedidos de 03/11 (3ª leva): Painel × sistema só com material de linha, famílias pelo código no "O que precisa produzir",
   busca na lista de férias e cadastrar a função direto em Funcionários. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const hj=loc(now), cp=hj.slice(0,7), ontem=loc(new Date(now.getTime()-864e5)), t=now.toISOString();
  const IT={AC0005:'ARGAMASSA CINZA AC3 EMB PAPEL 20 KG',RA0001:'REJUNTE ACRILICO BRANCO 1KG',RS0002:'REJUNTE SILICONIZADO CINZA 1KG',RF0003:'REJUNTE FLEX CINZA 5KG',
    RE0004:'ARGAMASSA EXPORTACAO 20 KG',IP0005:'IMPERMEABILIZANTE 18 KG',CL0006:'COLA BRANCA 1KG',MP0001:'PREMIX AC3',AC0090:'ARGAMASSA ENSACADA GRANEL',NV0001:'NIVELADOR 20 KG'};
  const l={}; for(const c in IT) l[c]={d:IT[c],sal:1,a3:100,a30:0,ln:['Linha 1']};
  D['pcpbase/itens']={l,atual:{SALDO:t},em:t}; D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={atual:t,l:[]};
  const diario={}; ['AC0005','MP0001','AC0090','NV0001','RA0001'].forEach(c=>diario[c]={[ontem]:[500,0]});
  D['pcpbase/vendas']={ate:ontem,diario,mensal:Object.fromEntries(Object.keys(IT).map(c=>[c,{[cp]:[1000,800]}]))};
  D['pcpbase/prev']={mes:{[cp]:Object.fromEntries(Object.keys(IT).map(c=>[c,2000]))},est:{[cp]:Object.fromEntries(Object.keys(IT).map(c=>[c,300]))}};
  const P=[['ANA SOUZA','52998224725','Ajudante','Expedição'],['BRUNO ROCHA','60759545077','Operador','Linha 1'],['CARLA DIAS','11144477735','Analista','PCP']];
  P.forEach((x,i)=>D['rh/dados/funcionarios/p'+i]={nome:x[0],cpf:x[1],funcao:x[2],setor:x[3],tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2023-0'+(i+2)+'-10'});
  D['rh/config']=Object.assign({},D['rh/config']||{},{fichasDesde:'2000-01'});
  const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; await H.preparar(p,d);
  await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
  /* 1: Painel × sistema */
  await p.evaluate(()=>{ __T.S().anl.aptSo=false; __T.go('anlapt'); }); await H.dorme(1500);
  const ap=await p.evaluate(()=>[...document.querySelectorAll('table.anl-mt tbody th b')].map(b=>b.innerText).sort().join(','));
  ok('Painel × sistema: só material de linha (sem premix, ensacado e nivelador)', ap==='AC0005,RA0001', ap);
  /* 2: famílias */
  await p.evaluate(()=>__T.go('anlest')); await H.dorme(1800);
  const fo=await p.evaluate(()=>[...document.querySelectorAll('select[data-esw="fam"] option')].map(o=>o.value+'='+o.textContent).join('|'));
  ok('O que precisa produzir: família separa RA, RS, RF, RE, IP e CL pelo código', ['RA=RA · Rejunte acrílico','RS=RS · Rejunte siliconizado','RF=RF · Rejunte flexível','RE=RE · Exportação','IP=IP · Impermeabilizante','CL=CL · Cola'].every(x=>fo.includes(x)), fo);
  await p.selectOption('[data-esw="sit"]','todas'); await H.dorme(600); await p.selectOption('select[data-esw="fam"]','AC3'); await H.dorme(900);
  const fa=await p.evaluate(()=>[...document.querySelectorAll('table.anl-t tr[data-c]')].map(tr=>tr.dataset.c).join(','));
  ok('AC3 continua pela descrição (sem pegar os RE de exportação)', fa.includes('AC0005')&&!fa.includes('RE0004'), fa);
  await p.selectOption('select[data-esw="fam"]','RS'); await H.dorme(900);
  const fx=await p.evaluate(()=>[...document.querySelectorAll('table.anl-t tr[data-c]')].map(tr=>tr.dataset.c).join(','));
  ok('Filtrar a família RS mostra só o siliconizado', fx==='RS0002', fx);
  /* 3: busca nas férias */
  await p.evaluate(()=>{ __T.go('rhferias'); }); await H.dorme(900);
  await p.evaluate(()=>{ const b=document.querySelector('[data-act="rh-pzfil"][data-v="todos"]'); if(b) b.click(); }); await H.dorme(700);
  const tem=await p.$('#rh-ferq'); ok('Férias: tem o campo de procurar', !!tem);
  if(tem){ await p.fill('#rh-ferq','bruno'); await H.dorme(300);
    const v=await p.evaluate(()=>[...document.querySelectorAll('.rh-v2ft tr[data-b]')].filter(r=>!r.hidden).map(r=>r.querySelector('b').innerText).join(','));
    ok('Procurar "bruno" deixa só a pessoa certa, sem redesenhar', v==='BRUNO ROCHA'&&await p.evaluate(()=>document.activeElement&&document.activeElement.id==='rh-ferq'), v);
    await p.fill('#rh-ferq','pcp'); await H.dorme(300);
    const v2=await p.evaluate(()=>[...document.querySelectorAll('.rh-v2ft tr[data-b]')].filter(r=>!r.hidden).map(r=>r.querySelector('b').innerText).join(','));
    ok('Procura também pelo setor', v2==='CARLA DIAS', v2);
    await p.fill('#rh-ferq','zzzz'); await H.dorme(300);
    ok('Sem resultado mostra "Ninguém encontrado"', await p.evaluate(()=>{ const e=document.getElementById('rh-ferv'); return e&&!e.hidden&&/Ninguém encontrado/.test(e.innerText); }));
    await p.fill('#rh-ferq',''); }
  /* 4: cadastrar função em Funcionários */
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(900);
  await p.click('.rh-fhead [data-act="rh-fnaqui"]'); await H.dorme(600);
  const md=await p.evaluate(()=>!!document.querySelector('.rh-ffm')&&__T.S().view==='rhfunc');
  ok('Funcionários: "Cadastrar função" abre a janela da função na própria tela', md);
  if(md){ await p.fill('[data-rh-ff="nome"]','Soldador'); await p.click('[data-act="rh-fsalvar"]'); await H.dorme(900);
    const sv=await p.evaluate(()=>({ok:Object.keys(window.__docs||{}).length>=0,view:__T.S().view,modal:!!document.querySelector('.rh-ffm')}));
    const salvo=await p.evaluate(async()=>{ const s=await __T.S().db.collection('rh/dados/funcoes').get(); return s.docs.map(x=>x.data().nome).join(','); }).catch(e=>'erro '+e);
    ok('Salvar grava a função e continua em Funcionários', /Soldador/.test(salvo)&&sv.view==='rhfunc'&&!sv.modal, salvo+' '+JSON.stringify(sv)); }
  /* no formulário da pessoa */
  await p.evaluate(()=>{ const b=document.querySelector('[data-act="rh-admnova"]'); if(b) b.click(); }); await H.dorme(800);
  const temLnk=await p.$('[data-act="rh-fnaqui"][data-de="f"]');
  ok('Formulário da pessoa: link "+ função nova" ao lado do campo Função', !!temLnk);
  if(temLnk){ await p.fill('[data-rh-f="funcao"]','Pintor'); await p.click('[data-act="rh-fnaqui"][data-de="f"]'); await H.dorme(600);
    const nm=await p.evaluate(()=>(document.querySelector('[data-rh-ff="nome"]')||{}).value);
    ok('A janela já vem com o nome digitado', nm==='Pintor', nm);
    await p.click('[data-act="rh-fsalvar"]'); await H.dorme(900);
    const fv=await p.evaluate(()=>(document.querySelector('[data-rh-f="funcao"]')||{}).value);
    ok('Depois de salvar, volta ao formulário com a função preenchida', fv==='Pintor', fv); }
  const n=res.filter(r=>r.ok).length; console.log(n===res.length?`PASSOU tudo (${n})`:`FALHOU ${res.length-n} de ${res.length}`); await B.browser.close(); process.exit(n===res.length?0:1);
})().catch(e=>{ console.log('FALHOU erro',e); process.exit(1); });
