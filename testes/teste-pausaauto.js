/* Pausa automática pelo turno (23/10): ordem esquecida rodando desde ontem é pausada no almoço e no fim do expediente
   e volta sozinha; pausa feita pelo operador não é mexida; o tempo da ordem conta só o expediente. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
const loc=(dia,h)=>new Date(dia+'T'+h+':00').toISOString(), ds=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
(async()=>{ const {d}=seedManut(); const D=d.docs, t=new Date().toISOString(), n=new Date(), hj=ds(n), on=new Date(n); on.setDate(on.getDate()-1); const ont=ds(on), an=new Date(n); an.setDate(an.getDate()-2); const ant=ds(an);
 D['config/geral'].turnos=[{id:'t1',nome:'Normal',ini:'07:30',fim:'17:30',intv:60,almIni:'11:30',dias:[0,1,2,3,4,5,6],linhas:[]}];
 D['config/geral'].feriados=[]; D['config/feriados']={lista:[],tirados:[ont,hj,ant]};
 D['crachas/ABCD2345']={codigo:'ABCD2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true,adesivo:'000123',criadoEm:t};
 D['ordens/5001'].data=ont; D['ordens/5001'].linha='Linha 1'; D['ordens/5001'].prodSeg=[{ini:loc(ont,'07:40'),por:'Ana'}];
 D['ordens/5004']={num:'5004',produto:'AC3002 - ARGAMASSA AC2 20KG',linha:'Linha 2',data:ont,turno:'Dia todo',total:300,status:'aberta',criadaEm:t,prodSeg:[{ini:loc(ont,'08:00'),por:'Ana',fim:loc(ont,'09:00'),pausa:'Café',fimPor:'Ana',motivo:'pausa: Café'}]};
 d.users['posto@painel-colafix.app']={uid:'uPO',pass:'po1234',nome:'Posto'}; D['perfis/uPO']={nome:'Posto',usuario:'posto'}; D['acessos/uPO']={perfil:'posto',mods:['tablet'],locais:[],ativo:true};
 const B=await H.abrir({viewport:{width:1366,height:768}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'posto','po1234'); await H.dorme(9000);
 const seg=x=>p.evaluate(x=>(__T.S().ordens.find(o=>String(o.num)===x)||{}).prodSeg||[],x);
 const s1=await seg('5001'), hm=iso=>{ const x=new Date(iso); return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0'); };
 const txt=s1.map(s=>hm(s.ini)+'-'+(s.fim?hm(s.fim)+'('+(s.pausa||'')+')':'aberto')).join(' | ');
 ok('Ordem esquecida rodando desde ontem: pausa no almoço, volta, pausa no fim do expediente', s1.length>=3&&hm(s1[0].fim)==='11:30'&&s1[0].pausa==='Almoço'&&s1[0].auto&&hm(s1[1].ini)==='12:30'&&hm(s1[1].fim)==='17:30'&&s1[1].pausa==='Fim do expediente', txt);
 const agora=n.getHours()*60+n.getMinutes(), hoje=s1.slice(2);
 const esp=agora<450?0:agora<690?1:agora<750?1:2;
 ok('Hoje: volta sozinha às 07:30 (e pausa/volta no almoço conforme a hora agora)', esp===0?hoje.length===0:hm(hoje[0].ini)==='07:30'&&hoje[0].auto&&(esp===1||(hm(hoje[0].fim)==='11:30'&&hoje[1]&&hm(hoje[1].ini)==='12:30')), txt+' · agora '+agora);
 const s4=await seg('5004'); ok('Pausa feita pelo operador (Café) não volta sozinha', s4.length===1&&s4[0].pausa==='Café'&&!s4[0].auto, JSON.stringify(s4));
 const tot=s1.reduce((a,s)=>a+((s.fim?new Date(s.fim):new Date())-new Date(s.ini))/6e4,0);
 ok('Tempo da ordem de ontem conta só o expediente (07:40–11:30 + 12:30–17:30 = 8 h 50)', Math.round(((new Date(s1[0].fim)-new Date(s1[0].ini))+(new Date(s1[1].fim)-new Date(s1[1].ini)))/6e4)===530, Math.round(tot));
 /* roda de novo: não muda nada (mesmo resultado) */
 await H.dorme(31000); const s1b=await seg('5001'); ok('Rodar de novo não duplica nada', JSON.stringify(s1b.map(s=>[s.ini,s.fim]))===JSON.stringify(s1.map(s=>[s.ini,s.fim]))||s1b.length===s1.length+ (agora>=690&&agora<691?1:0), s1b.length+' x '+s1.length);
 /* tela do posto mostra a pausa automática */
 const bip=async c=>{ await p.keyboard.type(c,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(900); }; await bip('000123'); await p.keyboard.press('5'); await H.dorme(700);
 const t5=await p.evaluate(()=>(document.querySelector('.cq')||document.body).innerText.replace(/\n/g,'|'));
 ok('Tela "Começar / pausar" explica a pausa automática e o próximo horário', /Pausa automática pelo turno/.test(t5)&&/Próximo:/.test(t5), t5.slice(0,400));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
