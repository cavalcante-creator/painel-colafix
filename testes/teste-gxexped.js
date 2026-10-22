/* Paradas do gestor contam só o horário de expediente (turnos), e passando de 1 dia de expediente mostram "N dias e H h". */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const addD=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return loc(d); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
 D['config/geral'].turnos=[{id:'t1',nome:'Turno normal',ini:'07:30',fim:'18:00',intv:0,dias:[1,2,3,4,5],linhas:[]}];
 /* segunda de 1 a 2 semanas atrás (sem feriado nacional fixo no meio) */
 const FER=['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'], fer=x=>FER.includes(x.slice(5));
 let seg=addD(loc(new Date()),-8); while(new Date(seg+'T12:00:00').getDay()!==1||[seg,addD(seg,1),addD(seg,2),addD(seg,-3)].some(fer)) seg=addD(seg,-1);
 const ter=addD(seg,1), qua=addD(seg,2), sex=addD(seg,-3), iso=(dd,hm)=>new Date(dd+'T'+hm+':00').toISOString();
 D['paradas/pA']={linha:'Linha 1',motivo:'Quebra da ensacadeira',inicio:iso(seg,'16:00'),fim:iso(qua,'09:00'),por:'uDONA'};
 D['paradas/pB']={linha:'Linha 2',motivo:'Falta de cimento',inicio:iso(sex,'17:00'),fim:iso(seg,'08:00'),por:'uDONA'};
 const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; const er=[]; p.on('pageerror',e=>er.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3000);
 await p.click('#navlist [data-go="gxpar"]'); await H.dorme(800); await p.click('[data-act="gx-par-n"][data-v="30"]'); await H.dorme(800);
 const linhas=await p.evaluate(()=>[...document.querySelectorAll('.gx-tb tbody tr')].map(r=>[...r.cells].map(c=>c.innerText.trim())));
 const la=linhas.find(r=>/Quebra da ensacadeira/.test(r.join('|'))), lb=linhas.find(r=>/Falta de cimento/.test(r.join('|')));
 ok('Parada de segunda 16:00 a quarta 09:00: só o expediente (2 h + 10h30 + 1h30 = 14 h) → "1 dia e 3 h 30"', la&&la.includes('1 dia e 3 h 30'), JSON.stringify(la));
 ok('Parada de sexta 17:00 a segunda 08:00: fim de semana não conta → "1 h 30"', lb&&lb.includes('1 h 30'), JSON.stringify(lb));
 const tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Tempo parado total = 15 h 30 de expediente → "1 dia e 5 h 00", com a explicação', /1 dia e 5 h 00/.test(tx)&&/só no expediente/.test(tx), tx.slice(0,400).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/gx-exped.png',fullPage:true});
 /* relatório do dia da terça: a parada da Linha 1 ocupa o turno inteiro (10h30 = 1 dia), disponibilidade 0% */
 await p.evaluate(t=>{ __T.S().gx.dia=t; __T.go('gxdia'); },ter); await H.dorme(1200);
 const t2=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Relatório da terça: Linha 1 parada o dia todo = "1 dia" e disponibilidade 0%', /1 dia\b/.test(t2)&&/Linha 1[\s\S]{0,40}0,0%/.test(t2), t2.slice(0,900).replace(/\n/g,'|'));
 ok('Sem erros no console', !er.length, er.join(' | '));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU tudo ('+res.length+')'); process.exit(f?1:0); })().catch(e=>{ console.log('FALHOU',e); process.exit(1); });
