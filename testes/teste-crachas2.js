/* Crachás (js/35-crachas.js): especialidade, editar sem trocar o código, apagar e nome inteiro na impressão. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 D['crachas/CXAAA1']={codigo:'CXAAA1',nome:'CARLOS ALESSANDRO DA SILVA - MECANICA',linha:'*',papel:'tecnico',ativo:true};
 D['crachas/CXBBB2']={codigo:'CXBBB2',nome:'Adriano Reus',linha:'Linha 1',papel:'operador',ativo:true};
 const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1500);
 await p.evaluate(()=>__T.go('mancrachas')); await H.dorme(1500);
 /* novo técnico com especialidade */
 await p.fill('#cr-nome','Pedro Moreno'); await p.selectOption('#cr-linha','*'); await p.selectOption('#cr-papel','tecnico'); await H.dorme(200); await p.selectOption('#crx-area','Elétrica'); await p.click('[data-act="cr-add"]'); await H.dorme(1500);
 let L=await p.evaluate(()=>__T.S().cr.lista.map(c=>({n:c.nome,a:c.area||'',id:c._id})));
 const pe=L.find(x=>x.n==='Pedro Moreno'); ok('Novo crachá de técnico grava a especialidade (Elétrica)', pe&&pe.a==='Elétrica', JSON.stringify(L));
 let t=await p.evaluate(()=>document.getElementById('view').innerText); ok('A lista mostra a especialidade', /Elétrica/.test(t));
 /* editar: separa a área do nome */
 await p.click('[data-act="crx-ed"][data-id="CXAAA1"]'); await H.dorme(500);
 const ed=await p.evaluate(()=>({n:document.getElementById('crx-n').value,a:document.getElementById('crx-ea').value,dica:!!document.querySelector('.crx-dica')}));
 ok('Editar sugere tirar a especialidade do nome (nome sem "- MECANICA", especialidade Mecânica)', ed.n==='CARLOS ALESSANDRO DA SILVA'&&ed.a==='Mecânica'&&ed.dica, JSON.stringify(ed));
 await p.click('[data-act="crx-ed-ok"]'); await H.dorme(1200);
 const c1=await p.evaluate(()=>__T.S().db.doc('crachas/CXAAA1').get().then(g=>g.data()));
 ok('Salvar mantém o código e grava nome e especialidade', c1&&c1.codigo==='CXAAA1'&&c1.nome==='CARLOS ALESSANDRO DA SILVA'&&c1.area==='Mecânica'&&c1.ativo!==false, JSON.stringify(c1));
 /* apagar */
 await p.click('[data-act="crx-apagar"][data-id="CXBBB2"]'); await H.dorme(300); t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Apagar pede confirmação', /Apagar de vez\?/.test(t));
 await p.click('[data-act="crx-apagar-ok"][data-id="CXBBB2"]'); await H.dorme(1200);
 const ex=await p.evaluate(()=>__T.S().db.doc('crachas/CXBBB2').get().then(g=>g.exists));
 ok('Crachá apagado de vez (some do banco e da lista)', !ex&&!(await p.evaluate(()=>document.getElementById('view').innerText)).includes('Adriano Reus'));
 /* impressão: nome longo inteiro */
 await p.evaluate(()=>{ window.__txt=[]; const J=window.jspdf.jsPDF, t0=J.prototype.text; J.prototype.text=function(s){ window.__txt.push([].concat(s).join(' | ')); return t0.apply(this,arguments); }; });
 const [dl0]=await Promise.all([p.waitForEvent('download',{timeout:15000}).catch(()=>null),p.click('[data-act="cr-pdf-todos"]')]); await H.dorme(500); if(dl0&&process.env.CRACHA_PDF){ await dl0.saveAs(process.env.CRACHA_PDF); console.log('PDF salvo'); }
 const tx=await p.evaluate(()=>window.__txt);
 ok('Impressão: nome inteiro (sem cortar) e a especialidade embaixo', tx.some(s=>/CARLOS ALESSANDRO/.test(s)&&/SILVA/.test(s))&&tx.includes('Mecânica')&&tx.includes('Elétrica'), tx.slice(0,14).join(' / '));
 const errs=(B.erros||[]).filter(x=>!/favicon|fonts\.g|Failed to load resource/i.test(x)); ok('Sem erros no console', !errs.length, errs.join(' | '));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
