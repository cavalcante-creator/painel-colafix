/* RH · Almoço pelo Face ID: importa o CSV do Control iD (dados inventados), conta almoço por dia, ajuste à mão, Excel. CSV real: ALMOCO_CSV=<arquivo> */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const ok=(n,c,d)=>console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):''));
const cab='Código,Hora,Nome do usuário,RG,CPF,Grupo,Empresa,Departamento,Empresa Visitada,Autorização,Detalhes,Matrícula,Dispositivo,Área,Operador';
const L=(nome,cpf,emp,d,h,disp,aut)=>`1000001,${d} ${h},${nome},,"${cpf}",REFEITÓRIO,${emp},Departamento Padrão,,${aut||'Autorizado'},,,${disp},${disp==='REFEITÓRIO'?'refeitorio':'PRODUÇÃO'},`;
const linhas=[cab,
 L('Ana Teste','11111111111','COLAFIX INDUSTRIA E COMERCIO LTDA','13/10/2026','07:40:00','Portaria Entrada'), L('Ana Teste','11111111111','COLAFIX INDUSTRIA E COMERCIO LTDA','13/10/2026','12:36:02','REFEITÓRIO'), L('Ana Teste','11111111111','COLAFIX INDUSTRIA E COMERCIO LTDA','13/10/2026','12:49:27','REFEITÓRIO'),
 L('Bruno Teste','22222222222','R. G. WEBER','13/10/2026','07:10:00','REFEITÓRIO'), L('Bruno Teste','22222222222','R. G. WEBER','13/10/2026','12:02:04','Saida estacionamento'), L('Bruno Teste','22222222222','R. G. WEBER','13/10/2026','13:14:25','Estacionamento Entrada'),
 L('Carla Teste','33333333333','','13/10/2026','12:20:00','REFEITÓRIO','Negado'), L('Carla Teste','33333333333','','13/10/2026','07:50:00','Portaria Entrada'),
 L('Ana Teste','11111111111','COLAFIX INDUSTRIA E COMERCIO LTDA','09/10/2026','12:34:45','REFEITÓRIO'), L('Bruno Teste','22222222222','R. G. WEBER','09/10/2026','11:58:00','REFEITÓRIO')];
const csv='/tmp/claude-almoco-teste.csv'; fs.writeFileSync(csv,Buffer.from(linhas.join('\r\n')+'\r\n','latin1'));
(async()=>{ const {d}=seedManut(); d.docs['rh/dados/funcionarios/f1']={nome:'ANA TESTE',cpf:'111.111.111-11',setor:'Produção',tipo:'CLT',status:'Ativo'};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().acs&&__T.S().acs.pronto&&window.RHAlmoco,null,{timeout:15000}); await H.dorme(800);
 await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(600); const t0=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Tela Almoço no RH, com o botão de importar do Face ID', /Almoço · outubro de 2026/.test(t0)&&/Importar do Face ID/.test(t0), t0.slice(0,160).replace(/\n/g,' | '));
 await p.setInputFiles('#alm-arq',process.env.ALMOCO_CSV||csv); await p.waitForFunction(()=>/almoços no mês/i.test(document.getElementById('view').innerText),null,{timeout:15000}); await H.dorme(500);
 const t1=await p.evaluate(()=>document.getElementById('view').innerText);
 if(process.env.ALMOCO_CSV){ const r=await p.evaluate(()=>{ const A=RHAlmoco._A, D=A.dados['2026-10']; return Object.fromEntries(Object.keys(D.dias).sort().map(d=>[d,Object.values(D.dias[d]).filter(x=>x.a).length])); }); console.log('REAL',JSON.stringify(r)); await p.screenshot({path:process.env.SHOT||'/tmp/claude-almoco.png'}); await p.click('[data-act="alm-vis"][data-v="dir"]'); await H.dorme(600); await p.screenshot({path:(process.env.SHOT||'/tmp/claude-almoco.png').replace('.png','-dir.png'),fullPage:true}); await p.click('[data-act="alm-vis"][data-v="dia"]'); await H.dorme(300); await p.fill('#alm-q','larissa'); await p.dispatchEvent('#alm-q','input'); await p.click('#view [data-b]:not([hidden]) [data-act="alm-pes"]'); await H.dorme(500); await p.screenshot({path:(process.env.SHOT||'/tmp/claude-almoco.png').replace('.png','-pes.png')}); await p.click('[data-act="alm-pesx"]'); await p.click('[data-act="alm-vis"][data-v="dir"]'); await H.dorme(300);
   const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('[data-act="alm-ppt"]')]); await dl.saveAs((process.env.SHOT||'/tmp/claude-almoco.png').replace('.png','.pptx')); if(process.env.JSPDF_REAL){ await p.fill('#alm-valor','18,50'); await p.click('[data-act="alm-valor"]'); await H.dorme(500); const [dp]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('[data-act="alm-pdf"]')]); await dp.saveAs((process.env.SHOT||'/tmp/claude-almoco.png').replace('.png','.pdf')); } }
 else {
 ok('13/10: Ana almoçou (12:36, nome do cadastro do RH), Bruno veio e não passou no refeitório (café às 07:10 não conta), Carla negada não conta', /1 almoçaram/.test(t1)&&/2 sem justificativa/.test(t1)&&/Ana Teste[\s\S]*12:36/.test(t1)&&/café 07:10/.test(t1), t1.replace(/\n/g,' | ').slice(0,600));
 let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almoco/2026-10']);
 ok('Guardado em rh/dados/almoco/2026-10 por dia e CPF', s&&s.dias['2026-10-13']['11111111111'].a==='12:36'&&!s.dias['2026-10-13']['22222222222'].a&&s.dias['2026-10-09']['22222222222'].a==='11:58', JSON.stringify(s&&s.dias).slice(0,200));
 await p.setInputFiles('#alm-arq',csv); await H.dorme(1200); s=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almoco/2026-10']);
 ok('Importar o mesmo arquivo de novo não duplica (só registra a importação)', Object.keys(s.dias).length===2&&s.imp.length===2, Object.keys(s.dias).join(','));
 p.once('dialog',dg=>dg.accept('almoçou sem passar o rosto')); await p.click('[data-act="alm-aj"][data-k="22222222222"]'); await H.dorme(800);
 const t2=await p.evaluate(()=>document.getElementById('view').innerText); const aj=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almocoaj/2026-10']);
 ok('Ajuste à mão: Bruno passa para "almoçou", com motivo e quem ajustou, e fica no histórico', /2 almoçaram/.test(t2)&&/1 sem justificativa/.test(t2)&&aj.aj['2026-10-13_22222222222'].v==='sim'&&aj.aj['2026-10-13_22222222222'].mot==='almoçou sem passar o rosto'&&aj.log.length===1, JSON.stringify(aj).slice(0,200));
 /* justificativa: Carla veio e não almoçou → justificar "Consulta ou atestado" */
 await p.click('[data-act="alm-jus"][data-k="33333333333"]'); await H.dorme(300); await p.click('[data-act="alm-jsalvar"]'); await H.dorme(200); const je=await p.evaluate(()=>(document.querySelector('.rh-modal .err')||{}).textContent||'');
 await p.click('[data-act="alm-jtipo"][data-v="Consulta ou atestado"]'); await H.dorme(150); await p.fill('#alm-jmot','dentista'); await p.click('[data-act="alm-jsalvar"]'); await H.dorme(700);
 const tj=await p.evaluate(()=>document.getElementById('view').innerText); const aj2=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almocoaj/2026-10'].aj['2026-10-13_33333333333']);
 ok('Justificar: pede o tipo; com "Consulta ou atestado · dentista" a Carla sai de "sem justificativa" e vai para Justificados', /Escolha o tipo/.test(je)&&aj2&&aj2.v==='just'&&aj2.tipo==='Consulta ou atestado'&&aj2.mot==='dentista'&&/0 sem justificativa/.test(tj)&&/1 justificados/.test(tj)&&/JUSTIFICADOS \(1\)[\s\S]*Carla Teste[\s\S]*Consulta ou atestado · dentista/.test(tj), JSON.stringify(aj2)+' | '+tj.slice(-400).replace(/\n/g,' | '));
 /* não almoça na empresa: Carla (outro dia sem almoço vira "não almoça aqui") */
 await p.click('[data-act="alm-pes"][data-k="33333333333"]'); await H.dorme(300); p.once('dialog',dg=>dg.accept('almoça em casa')); await p.click('[data-act="alm-fora"][data-v="1"]'); await H.dorme(700);
 const fo=await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('__srv')).docs['rh/config']; return c&&c.almoco&&c.almoco.fora&&c.almoco.fora['33333333333']; }); const tf=await p.evaluate(()=>(document.querySelector('.alm-pm')||{}).innerText||'');
 ok('Marcar "Não almoça na empresa" (com o motivo) e voltar a contar', fo&&fo.mot==='almoça em casa'&&/Não almoça na empresa\s*·\s*almoça em casa/.test(tf), JSON.stringify(fo)+' '+tf.slice(0,300).replace(/\n/g,' | '));
 await p.click('[data-act="alm-pesx"]'); await H.dorme(200);
 /* filtros: situação, empresa, setor */
 const nomes=()=>p.evaluate(()=>[...document.querySelectorAll('#view .alm-l .alm-nm')].filter(e=>!e.closest('[hidden]')).map(e=>e.textContent));
 await p.selectOption('#alm-sit','just'); await H.dorme(300); const f1=await nomes();
 await p.selectOption('#alm-sit',''); await p.selectOption('#alm-emp','R. G. WEBER'); await H.dorme(300); const f2=await nomes();
 await p.selectOption('#alm-emp','-'); await H.dorme(300); const f3=await nomes();
 await p.selectOption('#alm-emp',''); await H.dorme(200); const temSetor=await p.$('#alm-setor'); if(temSetor){ await p.selectOption('#alm-setor','Produção'); await H.dorme(300); } const f4=await nomes(); if(temSetor){ await p.selectOption('#alm-setor',''); await H.dorme(200); }
 ok('Filtros de nomes: situação (justificado), empresa (R. G. Weber / sem empresa) e setor (Produção)', f1.join()==='Carla Teste'&&f2.join()==='Bruno Teste'&&f3.join()==='Carla Teste'&&!!temSetor&&f4.join()==='Ana Teste', JSON.stringify({f1,f2,f3,f4}));
 const vis=()=>p.evaluate(()=>[...document.querySelectorAll('#view [data-b]')].filter(e=>!e.hidden).map(e=>e.querySelector('.alm-nm').textContent));
 await p.click('#alm-q'); await p.keyboard.type('teste ana',{delay:40}); await H.dorme(200); const v1=await vis(); const foco=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
 await p.fill('#alm-q','brúno'); await p.dispatchEvent('#alm-q','input'); await H.dorme(150); const v2=await vis();
 await p.fill('#alm-q','2222'); await p.dispatchEvent('#alm-q','input'); await H.dorme(150); const v3=await vis(); const qn=await p.evaluate(()=>document.getElementById('alm-qn').textContent);
 ok('Busca: palavras em qualquer ordem, sem acento, ou parte do CPF; o campo não perde o foco enquanto digita', v1.join()==='Ana Teste'&&foco==='alm-q'&&v2.join()==='Bruno Teste'&&v3.join()==='Bruno Teste'&&/1 encontrado/.test(qn), JSON.stringify({v1,v2,v3,foco,qn}));
 await p.fill('#alm-q',''); await p.dispatchEvent('#alm-q','input');
 await p.click('[data-act="alm-pes"][data-k="11111111111"]'); await H.dorme(400); const tm=await p.evaluate(()=>(document.querySelector('.alm-pm')||{}).innerText||'');
 ok('Clicar no nome abre o detalhe do mês com todas as passagens, chegada e tempo no refeitório', /Ana Teste/.test(tm)&&/Refeitório 12:36 → 12:49 \(13 min\)/.test(tm)&&/chegou 07:40/.test(tm)&&/07:40:00 Portaria Entrada/.test(tm)&&/2\s*almoços/.test(tm), tm.replace(/\n/g,' | ').slice(0,300));
 await p.click('[data-act="alm-pesx"]'); await H.dorme(200);
 await p.click('[data-act="alm-vis"][data-v="mes"]'); await H.dorme(400); const t3=await p.evaluate(()=>document.querySelector('.alm-t').innerText);
 ok('Mês (fechamento): grade por pessoa com total de almoços', /Ana Teste[\s\S]*✓/.test(t3)&&/Bruno Teste/.test(t3), t3.replace(/\n/g,' | ').slice(0,240));
 await p.click('[data-act="alm-vis"][data-v="dir"]'); await H.dorme(500); const t4=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Diretoria: gráfico por dia, por empresa, por dia da semana e custo', /Almoços por dia/.test(t4)&&/Por empresa/.test(t4)&&/Média por dia da semana/.test(t4)&&/Custo estimado/.test(t4), t4.slice(-300).replace(/\n/g,' | '));
 await p.fill('#alm-valor','18,50'); await p.click('[data-act="alm-valor"]'); await H.dorme(600); const t5=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Valor por refeição guardado e custo calculado (4 almoços × R$ 18,50)', /R\$\s?74,00/.test(t5), (t5.match(/Custo estimado.{0,120}/s)||[''])[0].replace(/\n/g,' | '));
 if(process.env.JSPDF_REAL){ const [dp]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('[data-act="alm-pdf"]')]); const fp='/tmp/claude-almoco.pdf'; await dp.saveAs(fp);
   const tx=require('child_process').execSync('pdftotext -layout '+fp+' -').toString(); ok('Relatório em PDF com os números, os nomes e o desconto (almoços × valor)', dp.suggestedFilename()==='Refeitorio-2026-10.pdf'&&/Almoços por pessoa e desconto/.test(tx)&&/Ana Teste[^\n]*R\$\s?37,00/.test(tx)&&/Total \(3 pessoas\)[^\n]*R\$\s?74,00/.test(tx), tx.split('\n').filter(l=>/Ana Teste|Total|Desconto/.test(l)).join(' | ')); }
 if(require('fs').existsSync(__dirname+'/node_modules/pptxgenjs')){ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('[data-act="alm-ppt"]')]); const f='/tmp/claude-almoco.pptx'; await dl.saveAs(f);
   const n=require('child_process').execSync('unzip -l '+f+' | grep -c "ppt/slides/slide[0-9]*.xml"').toString().trim(); ok('Baixa a apresentação em PowerPoint com 5 slides', dl.suggestedFilename()==='Refeitorio-2026-10.pptx'&&n==='5', dl.suggestedFilename()+' slides='+n); }
 await p.screenshot({path:'/tmp/claude-almoco-mes.png'}); }
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
