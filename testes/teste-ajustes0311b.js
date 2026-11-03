/* Pedidos de 03/11 (2ª leva): Documentos abre em "Gerar contrato", campos ao lado da prévia, função com só a 1ª letra maiúscula,
   Fechamento da folha em PDF, Pontualidade com colunas alinhadas e PowerPoint da diretoria que tenta outro endereço quando o 1º falha. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const tk=k=>`<span class="rh-tk" data-k="${k}"></span>`;
const n=new Date(), ant=new Date(n.getFullYear(),n.getMonth()-1,1), m=ant.getFullYear()+'-'+String(ant.getMonth()+1).padStart(2,'0');
const uteis=[]; for(let i=1;i<=28&&uteis.length<4;i++){ const x=new Date(ant.getFullYear(),ant.getMonth(),i); if(x.getDay()>0&&x.getDay()<6) uteis.push(m+'-'+String(i).padStart(2,'0')); }
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  const P=[['ANA SOUZA','52998224725','AUXILIAR DE PRODUÇÃO'],['BRUNO ROCHA','60759545077','Operador de Empilhadeira'],['CARLA DIAS','11144477735','analista de pcp ii'],['DIEGO LIMA','39053344705','Ajudante'],['ELAINE MOURA','74682489070','Ajudante'],['FABIO REIS','86288366757','Ajudante']];
  P.forEach((x,i)=>D['rh/dados/funcionarios/p'+i]={nome:x[0],cpf:x[1],funcao:x[2],setor:'Expedição',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2024-01-10'});
  D['rh/config']=Object.assign({},D['rh/config']||{},{fichasDesde:'2000-01',almoco:{valor:20,valorDesc:10,ponto:{ini:'07:30',fim:'17:30',tol:10}}});
  D['rh/dados/modelos/m1']={nome:'Contrato de experiência',vale:'CLT',html:`<p>${tk('NOME')} ${tk('SALARIO')} ${tk('ENDERECO')} <span class="rh-tq" data-q="Nome da testemunha"></span></p>`};
  const dias={}; uteis.forEach((dd,j)=>{ dias[dd]={}; P.forEach((x,i)=>{ const ch=i===0&&j<2?'08:05:00':'07:20:00'; dias[dd][x[1]]={p:1,a:'11:40',t:[ch+' Portaria Entrada','11:40:00 REFEITÓRIO','17:35:00 Portaria SAÍDA']}; }); });
  D['rh/dados/almoco/'+m]={mes:m,pessoas:Object.fromEntries(P.map(x=>[x[1],{n:x[0],e:'COLAFIX'}])),dias,imp:[]};
  const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; await H.preparar(p,d);
  /* PowerPoint: o 1º endereço (cdnjs) falha; o 2º (jsDelivr) responde */
  const pj=__dirname+'/node_modules/pptxgenjs/dist/pptxgen.bundle.js', temPpt=fs.existsSync(pj); let pedidos=[];
  await p.route('**/*pptxgen*',r=>{ const u=r.request().url(); pedidos.push(u); if(/cdnjs/.test(u)) return r.abort(); if(temPpt) return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(pj,'utf8')}); return r.abort(); });
  await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
  /* 1 e 2: Documentos */
  await p.evaluate(()=>__T.go('rhdocs')); await H.dorme(800);
  const t1=await p.evaluate(()=>({h:(document.querySelector('#view h1,#view h2')||{}).innerText,seg:[...document.querySelectorAll('[data-act="rh-dv"]')].map(b=>b.innerText+':'+b.getAttribute('aria-pressed')).join(',')}));
  ok('Documentos e contratos abre direto em "Gerar contrato" (Modelos fica na 2ª aba)', /Gerar contrato/.test(t1.h)&&/^Gerar contrato:true,Modelos:false$/.test(t1.seg), JSON.stringify(t1));
  await p.click('[data-act="rh-dgpick"][data-id="p0"]'); await H.dorme(600); await p.click('[data-act="rh-dgmod"][data-id="m1"]'); await H.dorme(600);
  const lay=await p.evaluate(()=>{ const fl=document.querySelector('.rh-dgfl'), pv=document.querySelector('.rh-dgpv'); if(!fl||!pv) return null; const a=fl.getBoundingClientRect(), b=pv.getBoundingClientRect();
    const ins=[...fl.querySelectorAll('input.txt')].map(x=>x.getBoundingClientRect()); const sob=ins.some((r,i)=>ins.some((q,j)=>i!==j&&r.top<q.bottom-1&&q.top<r.bottom-1&&r.left<q.right-1&&q.left<r.right-1));
    return {lado:a.right<=b.left+1,fl:Math.round(a.width),pv:Math.round(b.width),n:ins.length,sob,cort:ins.some(r=>r.right>a.right+1)}; });
  ok('Gerar contrato: campos numa coluna ao lado da prévia, sem campo em cima de outro nem cortado', lay&&lay.lado&&lay.n>=3&&!lay.sob&&!lay.cort&&lay.pv>lay.fl, JSON.stringify(lay));
  /* 3: funções */
  await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(1000); const fx=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Fichas do mês: funções com só a 1ª letra maiúscula (Auxiliar de produção, Operador de empilhadeira, Analista de PCP II)', /Auxiliar de produção/.test(fx)&&/Operador de empilhadeira/.test(fx)&&/Analista de PCP II/.test(fx)&&!/AUXILIAR DE PRODUÇÃO/.test(fx), (fx.match(/(Auxiliar|AUXILIAR|Operador|Analista|analista)[^\n·]*/g)||[]).join(' | '));
  /* 5: Pontualidade */
  await p.evaluate(x=>{ window.RHAlmoco._A.mes=x; },m); for(let i=0;i<20;i++){ await p.evaluate(()=>__T.go('rhpont')); await H.dorme(500); if(await p.evaluate(()=>!!document.querySelector('.alm-ptab'))) break; }
  const al=await p.evaluate(()=>{ const t=document.querySelector('.alm-ptab'); if(!t) return null; const th=[...t.querySelectorAll('thead th')], tr=t.querySelector('tbody tr'); const td=[...tr.children];
    return {n:th.length===td.length,al:th.every((h,i)=>Math.abs(h.getBoundingClientRect().left-td[i].getBoundingClientRect().left)<2&&Math.abs(h.getBoundingClientRect().width-td[i].getBoundingClientRect().width)<2),kpiAlm:/Almoços no mês/i.test(document.getElementById('view').innerText),txt:tr.innerText.replace(/\s+/g,' ')}; });
  if(!al) console.log('VIEW',(await p.evaluate(()=>document.getElementById('view').innerText)).replace(/\n/g,' | ').slice(0,600));
  ok('Pontualidade: cabeçalho alinhado com as colunas e sem os números do almoço no topo', al&&al.n&&al.al&&!al.kpiAlm, JSON.stringify(al));
  /* 4: Fechamento em PDF */
  await p.evaluate(()=>__T.go('rhfech')); await H.dorme(500); await p.click('[data-act="rh-relmes"][data-v="-1"]');
  for(let i=0;i<40;i++){ if(await p.evaluate(()=>!!document.querySelector('[data-act="rh-fechpdf"]'))) break; await H.dorme(250); }
  const [dp]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('[data-act="rh-fechpdf"]')]);
  ok('Fechamento da folha tem "Baixar PDF" e baixa o PDF do mês', dp&&dp.suggestedFilename()==='Fechamento-folha-'+m+'.pdf', dp?dp.suggestedFilename():await p.evaluate(()=>(document.getElementById('toast')||{}).innerText));
  /* 6: PowerPoint */
  if(temPpt){ await p.evaluate(()=>__T.go('rhalmdir')); await H.dorme(1200);
    const [dl]=await Promise.all([p.waitForEvent('download',{timeout:40000}).catch(()=>null),p.click('[data-act="alm-ppt"]')]);
    ok('PowerPoint da diretoria: com o 1º endereço do gerador fora do ar, tenta o próximo e baixa', dl&&dl.suggestedFilename()==='Refeitorio-'+m+'.pptx'&&pedidos.some(u=>/cdnjs/.test(u))&&pedidos.some(u=>/jsdelivr/.test(u)), (dl?dl.suggestedFilename():'sem download')+' · '+pedidos.map(u=>u.split('/')[2]).join(','));
  } else console.log('(sem node_modules/pptxgenjs: PowerPoint não testado)');
  console.log('erros:',B.erros.filter(x=>!/404|pptxgen|ERR_FAILED/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
