/* Começar ordem no posto (uma começa, a outra fecha; não fecha sozinha), apontamento vai para a conferência do PCP. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs, t=new Date().toISOString(), hj=(x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10))(new Date());
 D['crachas/ABCD2345']={codigo:'ABCD2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true,adesivo:'000123',criadoEm:t};
 D['config/geral'].paletes={'Linha 1':88,'Linha 2':88}; D['ordens/5001'].data=hj; D['ordens/5001'].total=200;
 D['ordens/5004']={num:'5004',produto:'AC3002 - ARGAMASSA AC2 20KG',linha:'Linha 1',data:hj,turno:'Dia todo',total:300,status:'aberta',criadaEm:t};
 d.users['posto@painel-colafix.app']={uid:'uPO',pass:'po1234',nome:'Posto'}; D['perfis/uPO']={nome:'Posto',usuario:'posto'}; D['acessos/uPO']={perfil:'posto',mods:['tablet'],locais:[],ativo:true};
 let B=await H.abrir({viewport:{width:1366,height:768}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'posto','po1234'); await H.dorme(3500);
 const bip=async c=>{ await p.keyboard.type(c,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(900); };
 const seg=n=>p.evaluate(n=>(__T.S().ordens.find(o=>String(o.num)===n)||{}).prodSeg||[],n);
 await bip('000123'); await p.keyboard.press('2'); await H.dorme(500); await bip('OP-5001'); await p.keyboard.press('Enter'); await H.dorme(1200);
 /* aponta 250 numa ordem de 200 (reprocesso): pode, com aviso */
 await p.focus('#po-av'); await p.keyboard.type('250',{delay:60}); await H.dorme(300); const tt=await p.evaluate(()=>document.querySelector('.po-tot').innerText); const dis=await p.evaluate(()=>document.querySelector('[data-act="po-ap-ok"]').disabled);
 ok('Passar do total (reprocesso) é permitido, com aviso', !dis&&/Passa do total da ordem em 50/.test(tt), tt.replace(/\n/g,' '));
 await p.keyboard.press('Enter'); await H.dorme(1200);
 let s1=await seg('5001'); ok('A ordem 5001 continua rodando depois de passar do total (não fecha sozinha)', s1.length===1&&!s1[0].fim, JSON.stringify(s1));
 await p.keyboard.press('Enter'); await H.dorme(500); await bip('000123'); await p.keyboard.press('2'); await H.dorme(500); await bip('OP-5004'); await H.dorme(300);
 const txt=await p.evaluate(()=>document.body.innerText); ok('Começar a 5004 avisa que a 5001 vai ser fechada', /Começar a ordem 5004 agora/.test(txt)&&/A ordem 5001[\s\S]*fechada/.test(txt), txt.slice(0,300).replace(/\n/g,'|'));
 await p.keyboard.press('Enter'); await H.dorme(1500); s1=await seg('5001'); const s4=await seg('5004');
 ok('Uma começa e a outra fecha: 5001 fechada ("começou a ordem 5004"), 5004 rodando', s1[0]&&s1[0].fim&&/5004/.test(s1[0].motivo)&&s4.length===1&&!s4[0].fim, JSON.stringify({s1,s4}));
 await p.click('[data-act="ot-fim"]'); await H.dorme(300); await p.click('[data-act="ot-fim"]'); await H.dorme(1200);
 const s4b=await seg('5004'); ok('"Terminar esta ordem" (dois cliques) fecha a 5004', s4b[0]&&s4b[0].fim&&s4b[0].fimPor==='Ana Souza', JSON.stringify(s4b));
 const srv=await p.evaluate(()=>localStorage.getItem('__srv')); await B.browser.close();
 /* PCP confere */
 B=await H.abrir({viewport:{width:1366,height:900}}); p=B.page; await H.preparar(p,JSON.parse(srv)); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3500);
 await p.evaluate(()=>__T.go('meudia')); await H.dorme(800); const md=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Meu dia do PCP avisa "1 apontamento do posto para conferir"', /1 apontamento do posto para conferir/.test(md), md.slice(0,300).replace(/\n/g,'|'));
 await p.evaluate(()=>__T.go('apconf')); await H.dorme(800); let v=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Tela "Conferir apontamentos": OP 5001, 250 esperando e "passa do total"', /Conferir apontamentos/.test(v)&&/OP 5001/.test(v)&&/Esperando: 250/.test(v)&&/passa do total/i.test(v), v.slice(0,400).replace(/\n/g,'|'));
 const id=await p.evaluate(()=>__T.S().apPend[0]._id); await p.fill('#ap-q-'+id,'210'); await p.click(`[data-act="ap-ok"][data-id="${id}"]`); await H.dorme(1500);
 const r=await p.evaluate(()=>({e:__T.S().entregas.filter(x=>x.origem==='posto').map(x=>({q:x.qtd,op:x.operador,obs:x.obs})),ap:JSON.parse(localStorage.getItem('__srv')).docs}));
 const apd=Object.entries(r.ap).filter(([k])=>k.startsWith('apontpend/')).map(([k,x])=>x);
 ok('Confirmar com quantidade corrigida (210) vira apontamento de verdade e marca o pendente como confirmado', r.e.some(x=>x.q===210&&x.op==='Ana Souza'&&/corrigida/.test(x.obs||''))&&apd.some(x=>x.status==='confirmado'&&x.qtdFinal===210), JSON.stringify({e:r.e,ap:apd.map(x=>x.status)}));
 v=await p.evaluate(()=>document.getElementById('view').innerText); ok('Depois de confirmar, não sobra nada para conferir', /Nada esperando conferência/.test(v));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
