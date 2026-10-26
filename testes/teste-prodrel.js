/* Relatório do mês da produção em PDF de verdade + Análise personalizada (js/57, 26/10). JSPDF_REAL=1 grava os PDFs em SHOTS. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const SP=process.env.SHOTS||'/tmp';
(async()=>{ const {d}=seedManut(); const D=d.docs; const h=new Date(); const cp=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); const ago=m=>new Date(Date.now()-m*60000).toISOString();
 const LS=['Linha 1','Linha 2']; const prev={IT100:40000,IT101:30000,RJ200:8000}, il={IT100:{d:'ARGAMASSA AC1 INTERNA 20KG',ln:['Linha 1']},IT101:{d:'ARGAMASSA AC3 PORCELANATO 20KG',ln:['Linha 2']},RJ200:{d:'REJUNTE FLEX CINZA 5KG',ln:['Linha 2']}};
 Object.keys(prev).forEach((c,i)=>{ D['itens/'+c]={codigo:c,linhas:il[c].ln}; D['ordens/o'+i]={num:'70'+i,produto:c+' - '+il[c].d,linha:il[c].ln[0],data:h.toISOString().slice(0,10),turno:'Dia todo',total:9000,status:'aberta',criadaEm:ago(90000)};
   for(let j=0;j<8;j++) D['entregas/e'+i+'_'+j]={ordem:'o'+i,num:'70'+i,linha:il[c].ln[0],qtd:500+100*i+10*j,em:ago(60*24*Math.min(j,h.getDate()-1)+30),por:'x'}; });
 D['entregas/x1']={ordem:'o0',num:'700',linha:'Linha 1',qtd:300,em:ago(40),por:'x'}; D['entregas/x2']={anula:'x1',ordem:'o0',linha:'Linha 1',qtd:-300,em:ago(39),por:'x'};
 D['pcpbase/prev']={mes:{[cp]:prev}}; D['pcpbase/itens']={l:il}; D['config/geral'].linhasOrdem=LS;
 D['paradas/p1']={linha:'Linha 2',motivo:'Falta de cimento',inicio:ago(300),fim:ago(240)}; D['paradas/p2']={linha:'Linha 1',motivo:'Setup',inicio:ago(500),fim:ago(470)}; D['paradas/p3']={linha:'Linha 1',motivo:'Manutenção',inicio:ago(800),fim:ago(710)};
 D['perdas/q1']={ordem:'o1',linha:'Linha 2',qtd:12,em:ago(100)};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:950},acceptDownloads:true}); const p=B.page; p.on('pageerror',e=>erros.push(e.message));
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
 await p.evaluate(()=>__T.go('prodind')); await H.dorme(2500);
 const txt=()=>p.evaluate(()=>{ const e=document.getElementById('pra'); return e?e.innerText:''; });
 let t=await txt(); ok('Indicadores têm o quadro "Análise personalizada"', /Análise personalizada/.test(t), t.slice(0,120));
 ok('Padrão: produção por produto no mês, com os 3 produtos e o total sem o apontamento anulado', /IT100/.test(t)&&/IT101/.test(t)&&/RJ200/.test(t)&&/Total/.test(t), t.replace(/\n/g,' | ').slice(0,500));
 const tot=await p.evaluate(()=>{ const s=__T.S(); const X=Painel.analiseProducao.resultado(); return X.R?Math.round(X.R.tot):null; });
 const esp=Object.keys(D).filter(k=>/^entregas\/e/.test(k)&&String(D[k].em).slice(0,7)===cp).reduce((a,k)=>a+D[k].qtd,0);
 ok('Total confere com a conta feita à mão (anulado fora)', tot===esp, tot+' × '+esp);
 await p.selectOption('[data-pra="med"]','par'); await H.dorme(1500); t=await txt();
 ok('Tempo parado por motivo, sem o setup', /Falta de cimento/.test(t)&&/Manutenção/.test(t)&&!/Setup/.test(t.split('Resultado')[0].split('Linhas:')[1]||'')&&/2 h 30|2,5 h/.test(t), t.replace(/\n/g,' | ').slice(0,400));
 await p.click('[data-act="pra-ln"][data-v="Linha 1"]'); await H.dorme(1200); t=await txt(); ok('Filtro de linha: só Linha 1', /Manutenção/.test(t)&&!/Falta de cimento/.test(t), t.replace(/\n/g,' | ').slice(0,300));
 await p.click('[data-act="pra-sug"][data-i="1"]'); await H.dorme(2500); t=await txt(); ok('Pronta "Toneladas por semana"', /semana de/.test(t)&&/ t/.test(t)&&/últimos 30 dias/.test(t), t.replace(/\n/g,' | ').slice(0,300));
 await p.click('[data-act="pra-sug"][data-i="0"]'); await H.dorme(1500); if(!(await p.isChecked('[data-pra="comp"]'))){ await p.check('[data-pra="comp"]'); await H.dorme(1500); }
 await p.click('[data-act="pra-salvar"]'); await H.dorme(400); await p.fill('#pra-nome','Por produto'); await p.click('[data-act="pra-salvar-ok"]'); await H.dorme(1200);
 const sv=await p.evaluate(()=>__T.S().db.doc('perfis/'+__T.S().uid).get().then(g=>g.data().prodAnalises));
 ok('Salvar análise grava no perfil, marcada para o relatório do mês', sv&&sv.length===1&&sv[0].nome==='Por produto'&&sv[0].noMes===true, JSON.stringify(sv));
 t=await txt(); ok('Análise salva aparece em "Salvas"', /Salvas:\s*Por produto/.test(t.replace(/\n/g,' ')), '');
 const baixa=async sel=>{ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click(sel)]); const f=SP+'/'+dl.suggestedFilename(); await dl.saveAs(f); return {n:dl.suggestedFilename(),tam:fs.statSync(f).size,f}; };
 let r=await baixa('[data-act="pd-pdf"]'); ok('Relatório do mês baixa um PDF (sem janela de impressão)', /^Relatorio-producao-\d{4}-\d{2}\.pdf$/.test(r.n)&&r.tam>3000, JSON.stringify(r));
 if(process.env.JSPDF_REAL){ const b=fs.readFileSync(r.f,'latin1'); const pg=(b.match(/\/Type\s*\/Page[^s]/g)||[]).length; ok('PDF do mês com 2+ páginas (números, gráficos, linhas, paradas e a análise salva)', pg>=2, pg+' páginas'); }
 r=await baixa('[data-act="pra-pdf"]'); ok('PDF da análise', /^Analise-producao-.*\.pdf$/.test(r.n)&&r.tam>2000, JSON.stringify(r));
 r=await baixa('[data-act="pra-xls"]'); ok('Excel/planilha da análise', /^Analise-producao-.*\.(xlsx|csv)$/.test(r.n)&&r.tam>50, JSON.stringify(r));
 await p.screenshot({path:SP+'/prodrel.png',fullPage:true});
 await p.setViewportSize({width:390,height:840}); await H.dorme(800); const lat=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1); ok('Celular: sem rolagem lateral', lat);
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
