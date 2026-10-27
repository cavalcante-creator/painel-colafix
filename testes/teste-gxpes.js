/* Quem está na empresa (23/10): tocar no nome abre o detalhe da pessoa; quem está ativo no cadastro mas não passa no
   Face ID há mais de 2 semanas vai para "Fora do Face ID" (não conta como "Não veio"); o RH pode registrar o desligamento dali. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const n=new Date(), hj=iso(n);
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  const P=[['ANA SOUZA','11111111111'],['BRUNO LIMA','22222222222'],['CARLA DIAS','33333333333'],['DIEGO ROCHA','44444444444'],['ELAINE MOURA','55555555555'],['FABIO REIS','66666666666']];
  P.forEach((x,i)=>D['rh/dados/funcionarios/f'+i]={nome:x[0],cpf:x[1],setor:'Linha '+(i%3+1),empresa:'COLAFIX',tipo:'CLT',status:'Ativo',admissao:'2020-01-01'});
  D['rh/dados/funcionarios/fx']={nome:'GILSON SAIU',cpf:'77777777777',setor:'Expedição',empresa:'COLAFIX',tipo:'CLT',status:'Ativo',admissao:'2020-01-01'};
  D['rh/dados/funcionarios/fz']={nome:'HELENA FILIAL',cpf:'88888888888',setor:'SECAGEM FIXCOL',empresa:'ZENITH',tipo:'PJ',status:'Ativo',admissao:'2020-01-01'};
  D['rh/dados/funcionarios/fd']={nome:'IVO DESLIGADO',cpf:'99999999999',setor:'Expedição',empresa:'COLAFIX',tipo:'CLT',status:'Desligado',admissao:'2020-01-01'};
  D['rh/dados/funcionarios/fa']={nome:'JOAO AFASTADO',cpf:'10101010101',setor:'Expedição',empresa:'COLAFIX',tipo:'CLT',status:'Afastado',admissao:'2020-01-01'};
  D['rh/dados/funcionarios/fl']={nome:'LUCAS DE OLIVEIRA NARCIZO',cpf:'12121212121',setor:'Expedição',empresa:'ZENITH',tipo:'PJ',status:'Ativo',admissao:'2020-01-01'};
  /* 20 dias para trás: todos passam (Gilson só até 18 dias atrás); hoje Fabio não veio */
  const docs={};
  for(let k=20;k>=0;k--){ const x=new Date(n); x.setDate(x.getDate()-k); const ds=iso(x), m=ds.slice(0,7); docs[m]=docs[m]||{mes:m,dias:{},pessoas:{},imp:[{em:new Date().toISOString(),por:'Teste'}]};
    const dia={}; P.forEach((p,i)=>{ if(k===0&&i===5) return; dia[p[1]]={p:1,a:'11:4'+i,t:['07:1'+i+':00 Portaria Entrada','11:4'+i+':00 REFEITÓRIO','17:3'+i+':00 Portaria Saída']}; docs[m].pessoas[p[1]]={n:p[0],e:'COLAFIX'}; });
    dia['nome:LUCAS DE OLIVEIRA NARCISO']={p:1,t:['07:25:00 Portaria Entrada']}; docs[m].pessoas['nome:LUCAS DE OLIVEIRA NARCISO']={n:'LUCAS DE OLIVEIRA NARCISO',e:'ZENITH'};
    if(k>=18){ dia['77777777777']={p:1,t:['07:20:00 Portaria Entrada']}; docs[m].pessoas['77777777777']={n:'GILSON SAIU',e:'COLAFIX'}; }
    docs[m].dias[ds]=dia; }
  Object.values(docs).forEach(x=>D['rh/dados/almoco/'+x.mes]=x);
  const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
  let doc=null; for(let i=0;i<60;i++){ await H.dorme(500); doc=await p.evaluate(x=>__T.S().db.doc('presenca/'+x).get().then(g=>g.exists?g.data():null),hj); if(doc&&doc.f&&doc.f.length>=2) break; }
  const fg=doc&&doc.f.find(x=>/Gilson/.test(x.n)), ff=doc&&doc.f.find(x=>/Fabio/.test(x.n));
  ok('Quem não passa no Face ID há mais de 2 semanas vira "Sumiu" (com a última passagem); quem faltou hoje continua "Sem registro"', fg&&fg.m==='Sumiu'&&/^\d{4}-\d{2}-\d{2}$/.test(fg.u)&&ff&&ff.m==='Sem registro', JSON.stringify(doc&&doc.f));
  const lu=doc?doc.p.concat(doc.f).filter(x=>/Lucas/.test(x.n)):[];
  ok('Nome do Face ID com grafia diferente do cadastro (Narciso × Narcizo) é a mesma pessoa: uma vez só, presente, com o setor', lu.length===1&&!lu[0].m&&/Expedi/.test(lu[0].s), JSON.stringify(lu));
  await p.evaluate(()=>__T.go('gxpres')); await H.dorme(1500);
  ok('Desligado e afastado não aparecem em "não vieram"', doc&&!doc.f.some(x=>/Ivo|Joao/.test(x.n)), JSON.stringify(doc&&doc.f.map(x=>x.n)));
  const tabs=await p.evaluate(()=>[...document.querySelectorAll('.gxp-tab')].map(b=>b.innerText.replace(/\s+/g,' ')).join(' | '));
  ok('"Não vieram" conta só o Fabio; aba "Fora do Face ID" com o Gilson', /Não vieram 1/.test(tabs)&&/Fora do Face ID 2/.test(tabs), tabs);
  await p.click('.gxp-tab[data-v="sumiu"]'); await H.dorme(300);
  const vis=await p.evaluate(()=>[...document.querySelectorAll('.gxp-row[data-b]')].filter(r=>!r.hidden).map(r=>r.innerText.replace(/\s+/g,' ')).join(' || '));
  ok('Na aba aparece "Não passa no Face ID desde …"', /Gilson Saiu/.test(vis)&&/Não passa no Face ID desde/.test(vis)&&!/Fabio/.test(vis), vis.slice(0,200));
  await p.click('.gxp-tab[data-v="todos"]'); await p.click('[data-act="gxp-pes"][data-n="Ana Souza"]'); await H.dorme(500);
  const md=await p.evaluate(()=>(document.querySelector('.gxp-mdb')||{}).innerText||'');
  ok('Tocar no nome abre o detalhe: dias que veio, chegada, almoço e saída de cada dia', /Ana Souza/.test(md)&&/dias que veio/.test(md)&&/chegou 07:10/.test(md)&&/almoço 11:40/.test(md)&&/saiu 17:30/.test(md), md.replace(/\n/g,' | ').slice(0,260));
  await p.keyboard.press('Escape'); await H.dorme(300); ok('Esc fecha o detalhe', await p.evaluate(()=>!document.querySelector('.gxp-md')));
  /* tela do RH */
  await p.evaluate(()=>__T.go('rhpres')); await H.dorme(1500);
  const lado=await p.evaluate(()=>[...document.querySelectorAll('.rh-v2pc')].map(c=>c.innerText.replace(/\s+/g,' ')).join(' || '));
  ok('RH: cartão "Fora do Face ID" com o Gilson e "Faltou sem registro" só com o Fabio', /Fora do Face ID · 2/.test(lado)&&/Gilson Saiu/.test(lado)&&/Faltou sem registro · 1/.test(lado), lado.slice(0,300));
  await p.click('.rh-v2pc [data-act="rh-presfil"][data-id="fz"]'); await H.dorme(800);
  const fz=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/funcionarios/fz'].filial);
  let saiu=false; for(let i=0;i<60&&!saiu;i++){ await H.dorme(500); saiu=await p.evaluate(x=>__T.S().db.doc('presenca/'+x).get().then(g=>!(g.data().f||[]).some(y=>/Helena/.test(y.n))),hj); }
  ok('"Trabalha na Fixcol" grava filial no cadastro e a pessoa sai da presença daqui', fz==='FIXCOL'&&saiu, fz);
  await p.evaluate(()=>__T.go('rhpres')); await H.dorme(1200);
  await p.click('[data-act="gxp-pes"][data-n="Gilson Saiu"]'); await H.dorme(400);
  const md2=await p.evaluate(()=>(document.querySelector('.gxp-mdb')||{}).innerText||'');
  ok('No RH o detalhe avisa e oferece "Registrar desligamento"', /Continua ativo no cadastro do RH/.test(md2)&&await p.evaluate(()=>!!document.querySelector('.gxp-mdb [data-act="rh-presdesl"]')), md2.replace(/\n/g,' | ').slice(0,200));
  await p.click('.gxp-mdb [data-act="rh-presdesl"]'); await H.dorme(800);
  const st=await p.evaluate(()=>({v:__T.S().view,f:!!document.getElementById('rh-desm')||/desligamento/i.test((document.querySelector('.rh-form')||{}).innerText||'')}));
  ok('"Registrar desligamento" abre o desligamento da pessoa em Funcionários', st.v==='rhfunc'&&st.f, JSON.stringify(st));
  console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
