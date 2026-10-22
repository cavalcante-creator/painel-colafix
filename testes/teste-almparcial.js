/* Almoço: dia gravado pela metade (só a manhã) → aviso; importar o dia inteiro JUNTA as passagens e o almoço aparece. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const cab='Código,Hora,Nome do usuário,RG,CPF,Grupo,Empresa,Departamento,Empresa Visitada,Autorização,Detalhes,Matrícula,Dispositivo,Área,Operador';
const L=(nome,cpf,d,h,disp)=>`1,${d} ${h},${nome},,"${cpf}",G,COLAFIX,Dep,,Autorizado,,,${disp},a,`;
/* arquivo do dia inteiro, SEM as passagens da manhã que já estavam (prova que junta) */
const csv='/tmp/claude-almoco-parcial.csv'; fs.writeFileSync(csv,Buffer.from([cab,L('Ana Teste','11111111111','13/10/2026','12:31:00','REFEITÓRIO'),L('Bruno Teste','22222222222','13/10/2026','11:50:00','REFEITÓRIO'),L('Bruno Teste','22222222222','13/10/2026','17:30:00','Portaria Saida')].join('\r\n')+'\r\n','latin1'));
(async()=>{ const {d}=seedManut(); const D=d.docs;
 D['rh/dados/almoco/2026-10']={mes:'2026-10',dias:{'2026-10-13':{'11111111111':{p:1,c:'07:12',t:['07:12:00 REFEITÓRIO']},'22222222222':{p:1,t:['07:40:00 Portaria Entrada']},'33333333333':{p:1,t:['08:05:00 Portaria Entrada']}}},pessoas:{'11111111111':{n:'Ana Teste',e:'COLAFIX'},'22222222222':{n:'Bruno Teste',e:'COLAFIX'},'33333333333':{n:'Carla Teste',e:'COLAFIX'}},imp:[{em:'2026-10-13T11:20:00.000Z',por:'Robô Face ID',auto:true,de:'2026-10-13',ate:'2026-10-13',n:3}]};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123');
 await p.waitForFunction(()=>window.__T&&__T.S().acs&&__T.S().acs.pronto&&window.RHAlmoco,null,{timeout:15000}); await H.dorme(800);
 await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800); await p.evaluate(()=>{ RHAlmoco._A.mes='2026-10'; RHAlmoco._A.dia='2026-10-13'; __T.render(); }).catch(()=>{}); await H.dorme(400);
 const b=await p.$('[data-act="alm-dia"][data-v="2026-10-13"]'); if(b){ await b.click(); await H.dorme(500); }
 let t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Dia só com a manhã: aviso "Os acessos de 13/10 só vão até 08:05" dizendo que foi o robô', /só vão até 08:05/.test(t)&&/robô do Face ID/.test(t)&&/0 almoçaram/.test(t), t.slice(0,500).replace(/\n/g,'|'));
 await p.setInputFiles('#alm-arq',csv); await H.dorme(1800);
 const s=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/dados/almoco/2026-10'].dias['2026-10-13']);
 ok('Importar o dia inteiro junta com o que já estava: Ana almoçou 12:31 e o café 07:12 continua; Bruno 11:50; Carla continua presente', s['11111111111'].a==='12:31'&&s['11111111111'].c==='07:12'&&s['11111111111'].t.length===2&&s['22222222222'].a==='11:50'&&s['22222222222'].t.length===3&&!!s['33333333333'], JSON.stringify(s));
 await p.evaluate(()=>{ RHAlmoco._A.dia='2026-10-13'; }); const b2=await p.$('[data-act="alm-dia"][data-v="2026-10-13"]'); if(b2){ await b2.click(); await H.dorme(500); }
 t=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Depois de importar: 2 almoçaram e o aviso some', /2 almoçaram/.test(t)&&!/só vão até/.test(t), t.slice(0,300).replace(/\n/g,'|'));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
