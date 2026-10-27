/* Produção do ano (js/64, 27/10): meses × produto/linha, filtros de linha e produto, comparação com o ano anterior, Excel e PDF. */
const H=require('./harness'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const now=new Date(), ano=now.getFullYear(), pa=ano-1;
 D['pcpvendas/'+ano+'-01']={d:{RJ300:{'10':[1000,0]},AC100:{'10':[2000,0],'11':[500,0]},CH11:{'12':[300,0]}}};
 D['itens/CH11']={codigo:'CH11',descricao:'CHAPISCO ROLADO',linhas:['Fixcol']}; D['pcpbase/itens']={l:{CH11:{d:'CHAPISCO ROLADO',ln:['Linha 3'],a3:0,a30:0,sal:1}},atual:{}}; /* o Focco diz L3, mas a usuária acertou Fixcol nos Ajustes */
 D['pcpvendas/'+ano+'-03']={d:{RJ300:{'05':[400,0]},AC500:{'06':[1000,0]}}};
 D['pcpvendas/'+pa+'-01']={d:{RJ300:{'10':[700,0]}}};
 D['itens/RJ300']={codigo:'RJ300',descricao:'REJUNTE FLEX CINZA 5KG',linhas:['Linha 3']};
 D['itens/AC100']={codigo:'AC100',descricao:'ARGAMASSA AC1 20KG',linhas:['Linha 1']};
 D['itens/AC500']={codigo:'AC500',descricao:'ARGAMASSA AC3 20KG',linhas:['Linha 1','Linha 2']};
 D['config/geral'].linhasOrdem=['Linha 1','Linha 2','Linha 3','Fixcol'];
 D['config/geral'].ritmo={linhas:['Linha 1','Linha 2','Linha 3'],itens:{AC500:{d:{'Linha 1':50,'Linha 2':50}}},aj1410:{em:'x'}};
 D['pcpbase/vendas']={ate:ano+'-03-31',ini:ano+'-01-02',mensal:{}};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:1000},acceptDownloads:true}); const p=B.page; p.on('pageerror',e=>erros.push(e.message));
 try{ const lib=fs.readFileSync(require.resolve('xlsx/dist/xlsx.full.min.js'),'utf8'); await p.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\//,r=>r.fulfill({contentType:'text/javascript',body:lib})); }catch(e){}
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 const temAba=await p.evaluate(()=>{ __T.go('prodind'); return true; }); await H.dorme(800);
 const abas=await p.evaluate(()=>document.body.innerText.includes('Produção do ano'));
 ok('"Produção do ano" aparece em Produção › Relatórios', temAba&&abas);
 await p.evaluate(()=>__T.go('prodano')); await H.dorme(2500);
 const X=()=>p.evaluate(()=>{ const X=Painel.producaoAno.dados(); return X.rows?{rows:X.rows.map(o=>({k:o.k,m:o.m,t:o.tot})),mes:X.mes,tot:X.tot,ant:X.ant?X.ant.tot:null}:X; });
 let x=await X();
 ok('Por produto: AC100 2.500 em jan, RJ300 1.000 jan + 400 mar, AC500 1.000 em mar, CH11 300; total 5.200', x.tot===5200&&x.mes[0]===3800&&x.mes[2]===1400&&x.rows[0].k.startsWith('AC100'), JSON.stringify(x));
 await p.click('[data-act="pano-set"][data-k="ver"][data-v="linha"]'); await H.dorme(1200); x=await X();
 const L=k=>(x.rows.find(r=>r.k===k)||{}).t;
 ok('Por linha: L1 3.000 (AC100 + metade do AC500), L2 500, L3 1.400, Fixcol 300 (linha dos Ajustes vale antes do Focco)', L('Linha 1')===3000&&L('Linha 2')===500&&L('Linha 3')===1400&&L('Fixcol')===300, JSON.stringify(x.rows));
 await p.click('[data-act="pano-ln"][data-v="Linha 3"]'); await H.dorme(1000); await p.click('[data-act="pano-set"][data-k="ver"][data-v="produto"]'); await H.dorme(1000); x=await X();
 ok('Escolhendo a Linha 3: só o RJ300 (1.400)', x.tot===1400&&x.rows.length===1&&x.rows[0].k.startsWith('RJ300'), JSON.stringify(x.rows));
 await p.check('[data-pano="comp"]'); await H.dorme(2000); x=await X(); const t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Comparar com o ano anterior: '+pa+' = 700, coluna e variação +100%', x.ant===700&&new RegExp(String(pa)).test(t)&&/\+100%/.test(t), JSON.stringify(x)+' | '+(t.match(/.{0,60}100%.{0,40}/g)||[]).join(' ## '));
 await p.click('[data-act="pano-limpar"]'); await H.dorme(800); await p.fill('#pano-q','AC1'); await p.press('#pano-q','Enter'); await H.dorme(1500); x=await X();
 ok('Filtro de produto "AC1": só o AC100', x.rows.length===1&&x.rows[0].k.startsWith('AC100'), JSON.stringify(x.rows));
 ok('Mostra os dias com produção por mês do Extrato e avisa os meses sem Extrato', /Dias com produção no Extrato, por mês/.test(await p.evaluate(()=>document.getElementById('view').innerText)));
 await p.click('[data-act="pano-limpar"]'); await H.dorme(800);
 const SP=process.env.SHOTS||'/tmp'; await p.screenshot({path:SP+'/prodano.png',fullPage:true});
 if(process.env.JSPDF_REAL){ const baixa=async sel=>{ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click(sel)]); const f=SP+'/'+dl.suggestedFilename(); await dl.saveAs(f); return {n:dl.suggestedFilename(),tam:fs.statSync(f).size}; };
   let r=await baixa('[data-act="pano-pdf"]'); ok('PDF baixa', /^Producao-\d{4}.*\.pdf$/.test(r.n)&&r.tam>2000, JSON.stringify(r));
   r=await baixa('[data-act="pano-xls"]'); ok('Excel baixa', /^Producao-\d{4}.*\.xlsx$/.test(r.n)&&r.tam>1000, JSON.stringify(r));
   try{ const EJ=require('exceljs'); const wb=new EJ.Workbook(); await wb.xlsx.readFile(SP+'/'+r.n); const nomes=wb.worksheets.map(w=>w.name);
     const res=wb.getWorksheet('Resumo'), det=wb.getWorksheet('Detalhe'), pl=wb.getWorksheet('Por linha'); const txt=w=>{ const t=[]; w.eachRow(rw=>rw.eachCell(c=>{ const v=c.value; t.push(v&&v.formula?'='+v.formula:String(v)); })); return t.join(' | '); };
     ok('Excel com 3 abas: Resumo, Detalhe, Por linha', nomes.join()==='Resumo,Detalhe,Por linha', nomes.join());
     ok('Resumo: título, produzido 5.200 sc, toneladas, mês a mês e participação na fábrica', /PRODUÇÃO \d{4} · TODAS AS LINHAS/.test(txt(res))&&/Produzido no ano/i.test(txt(res))&&res.getRow(5).getCell(1).value===5200&&/Em toneladas/i.test(txt(res))&&/Mês a mês/i.test(txt(res))&&/Participação na fábrica/i.test(txt(res))&&/Como foi contado/i.test(txt(res))&&res.getImages().length>=2, txt(res).slice(0,700));
     ok('Detalhe: total com fórmula (SUBTOTAL), filtro e painéis congelados', /SUBTOTAL\(9,/.test(txt(det))&&det.autoFilter&&det.views[0].state==='frozen', txt(det).slice(0,500));
     ok('Por linha: Fixcol 300 e total da fábrica', /Fixcol/.test(txt(pl))&&/Fábrica \(total\)/.test(txt(pl)), txt(pl).slice(0,500)); }catch(e){ ok('Ler o Excel', false, e.message); } }
 await p.setViewportSize({width:390,height:840}); await H.dorme(800); ok('Celular: só a tabela rola de lado', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
