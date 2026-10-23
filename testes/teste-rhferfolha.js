/* RH: importar o relatório "Programação de férias" do sistema de folha (linhas do PDF real) e usar nos prazos. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
const LINHAS=fs.readFileSync(__dirname+'/dados-ferias-folha.txt','utf8').split('\n');
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 const F=(id,nome,adm)=>{ D['rh/dados/funcionarios/'+id]={nome,tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:adm,setor:'Produção',funcao:'Operador'}; };
 F('f1','Adriano Reus Silveira','2013-08-29'); F('f2','Paulo Roberto Saraiva de Campos','2013-03-08'); F('f3','Fabio Vanderlei da Silva Scoto','2023-10-17'); F('f4','Mateus Mendes da Silva','2025-06-02'); F('f5','Luis Gelci Moreira de Moraes','2003-10-01'); F('f6','Pessoa Fora do Relatorio','2020-01-10');
 F('f7','EDUARDO TEIXEIRA RICHTER','2024-10-16'); D['rh/dados/funcionarios/f7'].origem='folha'; F('f8','EDUARDO TEIXEIRA RITCHER','2024-10-16'); F('f9','VOLMIR FIGUEIRO','2023-10-16');
 const B=await H.abrir({viewport:{width:1500,height:950}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>__T.go('rhferias')); await H.dorme(1500);
 ok('Férias e prazos mostra "Importar relatório de férias (PDF)"', await p.evaluate(()=>!!document.getElementById('rh-ffi-file')));
 await p.evaluate(l=>window.rhFolhaPreviaLinhas(l),LINHAS); await H.dorme(800);
 const prev=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Conferência: 7 de 38 encontrados (Volmir "FIGUEIRO" reconhecido pela admissão) no cadastro, lista quem não foi encontrado', /7 de 38 funcionário/.test(prev)&&/não encontrado\(s\) no cadastro/.test(prev)&&/SIDNEI/.test(prev), (prev.match(/CONFERÊNCIA[^\n]*/)||[''])[0]);
 await p.click('[data-act="rh-ffi-ok"]'); await H.dorme(2500);
 const r=await p.evaluate(()=>({f3:window.rhFerDbg('f3'),f4:window.rhFerDbg('f4'),f5:window.rhFerDbg('f5'),f2:window.rhFerDbg('f2'),f6:window.rhFerDbg('f6'),
   prog:(__T.S().db,null)}));
 ok('Fábio: período da folha (15/06/2026 a 14/06/2027) com 24 dias por causa das faltas', r.f3&&r.f3.periodos[0].ini==='2026-06-15'&&r.f3.periodos[0].saldo===24, JSON.stringify(r.f3&&r.f3.periodos[0]));
 ok('Mateus: já gozou 15 → saldo 15 e limite da folha (18/05/2027)', r.f4&&r.f4.periodos[0].saldo===15&&r.f4.periodos[0].lim==='2027-05-18', JSON.stringify(r.f4&&r.f4.periodos[0]));
 ok('Luís Gelci (afastado 178 dias): não aparece como prazo vencido, e sim "afastado · conferir na folha"', r.f5&&/Afastado 178/.test(r.f5.sit.t), JSON.stringify(r.f5&&r.f5.sit));
 ok('Paulo Roberto: as férias programadas na folha (01/10/2026, 30 dias) descontam o saldo do período', r.f2&&r.f2.periodos[0].saldo===0, JSON.stringify(r.f2&&r.f2.periodos[0]));
 ok('Quem não está no relatório: cálculo pela admissão, com o limite para gozo (24 meses − 30 dias)', r.f6&&r.f6.periodos[0].ini==='2020-01-10'&&r.f6.periodos[0].lim==='2021-12-11', JSON.stringify(r.f6&&r.f6.periodos[0]));
 const marcadas=async()=>p.evaluate(()=>[...document.querySelectorAll('#view table tbody tr, #view .rh-v2fmi')].filter(tr=>/Paulo Roberto/i.test(tr.innerText)&&/01\/10\/2026/.test(tr.innerText)).length);
 const n1=await marcadas(); await p.evaluate(l=>window.rhFolhaPreviaLinhas(l),LINHAS); await H.dorme(600); await p.click('[data-act="rh-ffi-ok"]'); await H.dorme(2500); const n2=await marcadas();
 ok('Férias do Paulo aparecem em "Férias marcadas" e reimportar não duplica', n1===1&&n2===1, n1+' → '+n2);
 // cadastrar os não encontrados direto da conferência (desmarcando um)
 await p.evaluate(l=>window.rhFolhaPreviaLinhas(l),LINHAS); await H.dorme(600);
 const nNao=await p.evaluate(()=>document.querySelectorAll('[data-ffi-cad]').length);
 await p.uncheck('[data-ffi-cad="0"]'); await H.dorme(300); const rot=await p.evaluate(()=>document.querySelector('[data-act="rh-ffi-cad"]').innerText);
 await p.click('[data-act="rh-ffi-cad"]'); await H.dorme(3000);
 const conf=await p.evaluate(()=>(document.getElementById('view').innerText.match(/CONFERÊNCIA[^\n]*/)||[''])[0]);
 ok('Cadastra os não encontrados marcados (com a admissão do relatório) e refaz a conferência', nNao===31&&/Cadastrar 30 no RH/.test(rot)&&/37 de 38/.test(conf), nNao+' · '+rot+' · '+conf);
 // Eduardo em dobro: aviso e "Juntar"
 await p.evaluate(()=>{ const b=document.querySelector('[data-act="rh-ffi-x"]'); if(b) b.click(); }); await H.dorme(500);
 const dupTxt=await p.evaluate(()=>(document.getElementById('view').innerText.match(/Possíveis cadastros em dobro[^\n]*\n?[^\n]*/)||[''])[0]);
 p.once('dialog',dl=>dl.accept()); await p.click('[data-act="rh-junta"][data-ant="f8"]'); await H.dorme(2500);
 const j=await p.evaluate(()=>({f8:window.rhFerDbg('f8'),f7:window.rhFerDbg('f7')}));
 ok('Eduardo em dobro: aparece o aviso e "Juntar" deixa um cadastro só, com o período da folha (16/10/2025, limite 16/09/2027)', /cadastros em dobro/.test(dupTxt)&&!j.f7&&j.f8&&j.f8.periodos[0].ini==='2025-10-16'&&j.f8.periodos[0].lim==='2027-09-16', dupTxt.replace(/\n/g,' ')+' · '+JSON.stringify(j.f8&&j.f8.periodos[0]));
 await p.screenshot({path:'/tmp/rh-ferias-folha.png',fullPage:false}); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
