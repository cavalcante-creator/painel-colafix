/* RH · Pontualidade pelo Face ID (Almoço › Pontualidade) e Fechamento do mês para a folha (Agenda › Relatório do mês).
   Mês anterior, 6 pessoas, 4 dias úteis: Ana chega atrasada 2 dias e sai cedo 1; Bruno falta 1 dia; Carla não almoça 1 dia (desconto R$ 10). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
const n=new Date(), ant=new Date(n.getFullYear(),n.getMonth()-1,1), m=ant.getFullYear()+'-'+String(ant.getMonth()+1).padStart(2,'0');
const uteis=[]; for(let i=1;i<=28&&uteis.length<4;i++){ const x=new Date(ant.getFullYear(),ant.getMonth(),i); if(x.getDay()>0&&x.getDay()<6) uteis.push(m+'-'+String(i).padStart(2,'0')); }
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  const P=[['ANA SOUZA','52998224725'],['BRUNO ROCHA','60759545077'],['CARLA DIAS','11144477735'],['DIEGO LIMA','39053344705'],['ELAINE MOURA','74682489070'],['FABIO REIS','86288366757']];
  P.forEach((x,i)=>D['rh/dados/funcionarios/p'+i]={nome:x[0],cpf:x[1],funcao:'Operador',setor:'Expedição',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2024-01-10'});
  D['rh/config']=Object.assign({},D['rh/config']||{},{almoco:{valorDesc:10,ponto:{ini:'07:30',fim:'17:30',tol:10}}});
  D['rh/dados/ocorrencias/o1']={funcId:'p0',data:uteis[1],tipo:'Advertência escrita',motivo:'Atrasos'};
  const dias={}; uteis.forEach((dd,j)=>{ dias[dd]={}; P.forEach((x,i)=>{ if(i===1&&j===2) return; /* Bruno falta no 3º dia */
      const ch=i===0&&j<2?'08:05:00':'07:20:00', sai=i===0&&j===3?'15:00:00':'17:35:00', alm=!(i===2&&j===0);
      dias[dd][x[1]]={p:1,a:alm?'11:40':undefined,t:[ch+' Portaria Entrada'].concat(alm?['11:40:00 REFEITÓRIO']:[]).concat([sai+' Portaria SAÍDA'])}; if(!alm) delete dias[dd][x[1]].a; }); });
  D['rh/dados/almoco/'+m]={mes:m,pessoas:Object.fromEntries(P.map(x=>[x[1],{n:x[0],e:'COLAFIX'}])),dias,imp:[]};
  const B=await H.abrir({viewport:{width:1440,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
  /* Pontualidade */
  await p.evaluate(x=>{ const a=window.RHAlmoco._A; a.mes=x; a.vis='pont'; },m); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(2000); await p.evaluate(()=>__T.go('rhalmoco')); await H.dorme(800);
  const lin=await p.evaluate(()=>[...document.querySelectorAll('.alm-pt tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ').trim()));
  const ana=lin.find(x=>/Ana Souza/.test(x))||'', bru=lin.find(x=>/Bruno Rocha/.test(x))||'';
  ok('Pontualidade: Ana com 2 atrasos (70 min) e 1 saída antes; Bruno com 1 falta; quem está em dia não aparece', /Ana Souza .* 2 · 70 min 1 — 4/.test(ana)&&/Bruno Rocha .* — — 1 3/.test(bru)&&!lin.some(x=>/Diego Lima/.test(x)), lin.join(' || '));
  await p.click('[data-act="alm-pab"]:has-text("Ana Souza")'); await H.dorme(300); const det=await p.evaluate(()=>(document.querySelector('.alm-pdet')||{}).innerText||'');
  ok('"Ver dias" mostra o dia a dia (chegou 08:05, horário 07:30, +35 min; saiu 15:00)', /chegou 08:05/.test(det)&&/\+35 min/.test(det)&&/saiu 15:00/.test(det), det.replace(/\n/g,' | ').slice(0,200));
  ok('Quem tem 3+ atrasos ou falta ganha o botão Ocorrência', await p.evaluate(()=>!!document.querySelector('.alm-pt [data-act="rh-presoc"][data-id="p1"]')));
  /* horário padrão */
  await p.click('[data-act="alm-pcfg"] >> nth=0'); await H.dorme(200); await p.fill('#alm-pini','08:30'); await p.click('[data-act="alm-pcfgok"]'); await H.dorme(800);
  const cf=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['rh/config'].almoco.ponto); const lin2=await p.evaluate(()=>[...document.querySelectorAll('.alm-pt tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ').trim()).join(' || '));
  ok('Mudar o horário padrão grava em rh/config.almoco.ponto e recalcula (entrada 08:30: ninguém atrasado)', cf.ini==='08:30'&&cf.tol===10&&!/\d+ · \d+ min/.test(lin2), JSON.stringify(cf)+' · '+lin2.slice(0,160));
  await p.click('[data-act="alm-pcfg"] >> nth=0'); await H.dorme(200); await p.fill('#alm-pini','07:30'); await p.click('[data-act="alm-pcfgok"]'); await H.dorme(800);
  /* Fechamento */
  await p.evaluate(()=>__T.go('rhagenda')); await H.dorme(300); await p.click('[data-act="rh-agv"][data-v="rel"]'); await H.dorme(300); await p.click('[data-act="rh-relmes"][data-v="-1"]');
  const pronto=await (async()=>{ for(let i=0;i<40;i++){ if(await p.evaluate(()=>!!document.querySelector('[data-act="rh-fechxls"]'))) return true; await H.dorme(250); } return false; })();
  const card=await p.evaluate(()=>(document.querySelector('.rh-fech')||{}).innerText||'');
  ok('Relatório do mês tem o "Fechamento para a folha" com os números do Face ID', pronto&&/1\s*faltas sem registro/.test(card)&&/2\s*atrasos/.test(card)&&/1\s*saídas antes/.test(card)&&/R\$\s*10,00\s*desconto do almoço/.test(card)&&/1\s*advertências/.test(card), card.replace(/\n/g,' | ').slice(0,300));
  if(fs.existsSync(__dirname+'/node_modules/xlsx')) await p.addScriptTag({path:__dirname+'/node_modules/xlsx/dist/xlsx.full.min.js'});
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}).catch(()=>null),p.click('[data-act="rh-fechxls"]')]);
  let okx=false, det2=''; if(dl&&fs.existsSync(__dirname+'/node_modules/xlsx')){ const f='/tmp/claude-fech.xlsx'; await dl.saveAs(f); const X=require('xlsx'), wb=X.readFile(f), r=X.utils.sheet_to_json(wb.Sheets['Resumo por pessoa']);
    const a=r.find(x=>x.Nome==='ANA SOUZA')||{}, b=r.find(x=>x.Nome==='BRUNO ROCHA')||{}, c=r.find(x=>x.Nome==='CARLA DIAS')||{};
    okx=dl.suggestedFilename()==='Fechamento-folha-'+m+'.xlsx'&&a['Atrasos (vezes)']===2&&a['Atrasos (minutos)']===70&&a['Saídas antes (vezes)']===1&&a['Advertências']===1&&b['Faltas sem registro']===1&&c['Desconto do almoço (R$)']===10&&wb.SheetNames.includes('Faltas sem registro')&&wb.SheetNames.includes('Atrasos e saídas')&&wb.SheetNames.includes('Ocorrências');
    det2=wb.SheetNames.join(',')+' · '+JSON.stringify(a).slice(0,200); }
  ok('Excel do fechamento: resumo por pessoa (atrasos, minutos, saídas, faltas, desconto do almoço, advertências) e as abas de detalhe', okx, det2||(dl?'sem xlsx':'sem download'));
  console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
