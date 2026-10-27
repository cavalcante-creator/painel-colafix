/* Pedidos de ajuste de 27/10:
   1) O que precisa produzir: filtrando uma linha, os itens ficam no grupo dela (não se misturam) e a linha aparece; ordenar pela coluna mantém os grupos.
   2) Indicadores › Análise personalizada: "Linha e produto" lista quais materiais vão em qual linha.
   3) Análise personalizada: escolher o mês de comparação. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{
 /* ---------- 1) O que precisa produzir ---------- */
 { const {d}=H.seed(); const D=d.docs; const now=new Date(), loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10); const hj=loc(now), cp=hj.slice(0,7), t=now.toISOString();
   const IT={AC0005:{d:'ARGAMASSA CINZA AC3 EMB PAPEL 20 KG',a3:500,seg:5808,ln:['Linha 1']},AC0007:{d:'ARGAMASSA BRANCA AC3 EMB PAPEL 20 KG',a3:300,seg:4000,ln:['Linha 1','Linha 2']},
     RJ0001:{d:'REJUNTE FLEX CINZA 5KG',a3:50,seg:900,ln:['Linha 2']}};
   const l={}; for(const c in IT) l[c]=Object.assign({sal:1,a30:0},IT[c]);
   D['pcpbase/itens']={l,atual:{SALDO:t},em:t}; D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={atual:t,l:[]};
   D['pcpbase/vendas']={mensal:{AC0005:{[cp]:[9000,8000]},AC0007:{[cp]:[6000,5000]},RJ0001:{[cp]:[900,800]}}};
   D['pcpbase/prev']={mes:{[cp]:{AC0005:40000,AC0007:20000,RJ0001:3000}},est:{[cp]:{AC0005:500,AC0007:300,RJ0001:50}}};
   D['config/geral'].linhasOrdem=['Linha 1','Linha 2'];
   const erros=[]; const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
   await p.evaluate(()=>{ __T.S().esw.sit='todas'; __T.go('anlest'); }); await H.dorme(1500);
   const grupos=()=>p.evaluate(()=>{ const o=[]; let g=null; document.querySelectorAll('table.anl-t tbody tr').forEach(tr=>{ if(tr.classList.contains('anl-gh')){ g=tr.querySelector('b').textContent; return; } if(tr.dataset.c) o.push({g,c:tr.dataset.c,t:tr.querySelector('td.pr').innerText}); }); return o; });
   let G=await grupos(); const g7=G.find(x=>x.c==='AC0007');
   ok('Todas as linhas: item feito em 2 linhas mostra as duas embaixo do nome', g7&&/Linha 1 · Linha 2/.test(g7.t), JSON.stringify(G));
   await p.click('[data-act="esw-ln"][data-v="Linha 2"]'); await H.dorme(1200); G=await grupos();
   ok('Filtrando a Linha 2: todos os itens ficam no grupo "Linha 2" (o AC0007 não vai para a Linha 1)', G.length===2&&G.every(x=>x.g==='Linha 2')&&G.some(x=>x.c==='AC0007')&&G.some(x=>x.c==='RJ0001'), JSON.stringify(G));
   await p.click('[data-act="esw-ln"][data-v=""]'); await H.dorme(800);
   await p.click('th[data-act="anl-esort"][data-k="sem"]'); await H.dorme(1200); G=await grupos();
   const gs=[...new Set(G.map(x=>x.g))];
   ok('Ordenando pela coluna "Até hoje na semana", os grupos por linha continuam (sem misturar)', gs.join('|')==='Linha 1|Linha 2'&&G.filter(x=>x.g==='Linha 1').length===2, JSON.stringify(G));
   ok('Sem erros no console (O que precisa produzir)', !erros.length, erros.join(' | '));
   await B.browser.close(); }

 /* ---------- 2 e 3) Análise personalizada ---------- */
 { const {d}=seedManut(); const D=d.docs; const h=new Date(); const cp=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); const ago=m=>new Date(Date.now()-m*60000).toISOString();
   const LS=['Linha 1','Linha 2']; const il={IT100:{d:'ARGAMASSA AC1 INTERNA 20KG',ln:['Linha 1']},IT101:{d:'ARGAMASSA AC3 PORCELANATO 20KG',ln:['Linha 2']},RJ200:{d:'REJUNTE FLEX CINZA 5KG',ln:['Linha 2']}};
   Object.keys(il).forEach((c,i)=>{ D['ordens/o'+i]={num:'70'+i,produto:c+' - '+il[c].d,linha:il[c].ln[0],data:h.toISOString().slice(0,10),turno:'Dia todo',total:9000,status:'aberta',criadaEm:ago(90000)};
     D['entregas/e'+i]={ordem:'o'+i,num:'70'+i,linha:il[c].ln[0],qtd:1000*(i+1),em:ago(30),por:'x'}; });
   /* o IT100 também rodou na Linha 2 */
   D['entregas/e9']={ordem:'o0',num:'700',linha:'Linha 2',qtd:400,em:ago(25),por:'x'};
   /* três meses atrás: para comparar */
   const m3=new Date(h.getFullYear(),h.getMonth()-3,10,12), cp3=m3.getFullYear()+'-'+String(m3.getMonth()+1).padStart(2,'0');
   D['entregas/v1']={ordem:'o1',num:'701',linha:'Linha 2',qtd:5000,em:m3.toISOString(),por:'x'};
   D['pcpbase/prev']={mes:{[cp]:{IT100:40000,IT101:30000,RJ200:8000}}}; D['pcpbase/itens']={l:il}; D['config/geral'].linhasOrdem=LS;
   const erros=[]; const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message));
   await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
   await p.evaluate(()=>__T.go('prodind')); await H.dorme(2500);
   const txt=()=>p.evaluate(()=>{ const e=document.getElementById('pra'); return e?e.innerText:''; });
   ok('"Separar por" tem "Linha e produto" e a pronta "Materiais de cada linha"', await p.$('[data-pra="por"] option[value="linprod"]')&&/Materiais de cada linha/.test(await txt()));
   await p.selectOption('[data-pra="por"]','linprod'); await H.dorme(1500);
   const gr=await p.evaluate(()=>{ const o=[]; let g=null; document.querySelectorAll('#pra .pra-bs > div').forEach(x=>{ if(x.classList.contains('pra-gh')){ g=x.querySelector('b').textContent; o.push({g,head:x.innerText}); } else o.push({g,item:x.querySelector('span').textContent}); }); return o; });
   const it=g=>gr.filter(x=>x.g===g&&x.item).map(x=>x.item.split(' ')[0]);
   ok('Linha e produto: cada linha com o seu cabeçalho e os materiais dela', JSON.stringify(it('Linha 1'))==='["IT100"]'&&it('Linha 2').length===3&&it('Linha 2').includes('IT100')&&it('Linha 2').includes('RJ200'), JSON.stringify(gr));
   ok('Cabeçalho da linha mostra quantos materiais e o total', gr.some(x=>x.head&&/Linha 2\s*3 materiais · 5\.400 sc/.test(x.head.replace(/\n/g,' '))), JSON.stringify(gr.filter(x=>x.head)));
   const xl=await p.evaluate(()=>{ const X=Painel.analiseProducao.resultado(); return X.R.rows.map(r=>r.k); });
   ok('Ordem da lista segue as linhas (Linha 1 antes da Linha 2)', xl[0].startsWith('Linha 1')&&xl.slice(1).every(k=>k.startsWith('Linha 2')), JSON.stringify(xl));
   /* 3) mês de comparação */
   ok('Seletor do mês de comparação fica desligado até marcar "Comparar com"', await p.$eval('[data-pra="compCp"]',e=>e.disabled));
   await p.check('[data-pra="comp"]'); await H.dorme(1500);
   ok('Marcado: o seletor liga e o padrão é o período anterior', await p.$eval('[data-pra="compCp"]',e=>!e.disabled&&e.value===''));
   await p.selectOption('[data-pra="por"]','linha'); await H.dorme(800);
   await p.selectOption('[data-pra="compCp"]',cp3); await H.dorme(3000);
   const X=await p.evaluate(()=>{ const X=Painel.analiseProducao.resultado(); return {a:X.A,ta:X.RA&&X.RA.tot,ant:X.ant}; }); const t=await txt();
   ok('Escolhendo um mês, compara com ele (período e total certos)', X.a&&X.a.de===cp3+'-01'&&X.ta===5000&&X.ant['Linha 2']===5000, JSON.stringify(X));
   ok('A tela diz com qual mês está comparando', /comparando com /.test(t)&&/Antes: 5\.000 sc/.test(t), t.replace(/\n/g,' | ').slice(0,500));
   ok('Sem erros no console (Análise personalizada)', !erros.length, erros.join(' | '));
   await B.browser.close(); }
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
