/* Inventário · lista do dia automática e fechar cada divergência (js/81 + inventario/js/dia.js). Dados inventados. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const hoje=(()=>{ const d=new Date(), p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); })();
const diaMenos=n=>{ const d=new Date(Date.now()-n*864e5), p=k=>String(k).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); };
(async()=>{ const {d}=H.seed(); const D=d.docs;
  const it=(cod,desc)=>({codigo:cod,descricao:desc,ativo:true,linhas:[],almox:{locais:['a3'],grupos:['COLAFIX'],un:null,conf:null}});
  const L={}, V={}; for(let i=1;i<=30;i++){ const c='AC'+String(i).padStart(4,'0'); D['itens/'+c]=it(c,'ARGAMASSA TESTE '+i+' 20 KG'); L[c]={a3:100,a30:0,d:'ARGAMASSA TESTE '+i+' 20 KG'}; }
  V.AC0001={}; V.AC0002={}; for(let k=2;k<20;k++){ V.AC0001[diaMenos(k)]=[0,50]; V.AC0002[diaMenos(k)]=[0,5]; } /* AC0001 e AC0002 = giro alto */
  D['pcpbase/itens']={em:new Date(Date.now()-864e5).toISOString(),atual:{},l:L}; D['pcpbase/vendas']={ate:diaMenos(1),diario:V,mensal:{}};
  D['conferencias/CONF-0']={numero:'CONF-0',em:new Date(Date.now()-2*864e5).toISOString(),dia:diaMenos(2),por:'uX',porNome:'OUTRO',local:'Almox 3',itens:{AC0002:{almox3:100,saldoSistema3:100,almox30:0}}};
  D['config/geral'].invDia={hora:'23:59',dias:10,giro:7,max:60};
  d.users['conf@painel-colafix.app']={uid:'uCONF',pass:'conf123',nome:'Carla'}; D['perfis/uCONF']={nome:'Carla',usuario:'conf'}; D['acessos/uCONF']={perfil:'conf',mods:['almox'],locais:['a3'],contar:true,receber:true,ativo:true};
  d.users['sis@painel-colafix.app']={uid:'uSIS',pass:'sis123',nome:'Sara'}; D['perfis/uSIS']={nome:'Sara',usuario:'sis'}; D['acessos/uSIS']={perfil:'conf',mods:['almox'],locais:['a3'],contar:true,receber:true,ativo:true};
  const B=await H.abrir({viewport:{width:1280,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept());
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')));
  const frame=async()=>{ for(let i=0;i<80;i++){ const f=p.frames().find(x=>x.url().includes('inventario/index.html')); if(f&&await f.evaluate(()=>typeof USUARIO_LOGADO!=='undefined'&&!!USUARIO_LOGADO&&!!document.getElementById('confItemSelList')).catch(()=>false)) return f; await H.dorme(250); } return null; };
  const card=async f=>{ for(let i=0;i<40;i++){ const t=await f.evaluate(()=>(document.getElementById('invDia')||{}).textContent||'').catch(()=>''); if(/para contar/.test(t)) return t; await H.dorme(300); } return ''; };
  const salva=async(f,vals)=>{ await f.evaluate(v=>{ Object.entries(v).forEach(([c,q])=>updateConf(c,q,'sac3')); },vals); await H.dorme(300); await f.click('#invBar [data-a="salvar"]'); await H.dorme(3000);
    await f.evaluate(()=>{ const b=document.querySelector('#invRec [data-a="nao"],#invRec [data-a="ok"]'); if(b) b.click(); const x=document.getElementById('invRec'); if(x) x.remove(); }); await H.dorme(1500); };
  const troca=async(u,s)=>{ const b=await srv(); await H.preparar(p,b); await p.goto(H.BASE); await H.entrar(p,u,s); await H.dorme(2500); return frame(); };

  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'conf','conf123'); await H.dorme(2500);
  let f=await frame(); let t=await card(f);
  let b=await srv(); const dia=b.docs['invdia/'+hoje];
  ok('A lista do dia é gravada (invdia/hoje) com o giro alto e o rodízio', dia&&dia.itens&&dia.itens.AC0001&&dia.itens.AC0001.m==='giro'&&Object.values(dia.itens).some(x=>x.m==='rod'), JSON.stringify(dia&&dia.itens).slice(0,200));
  ok('AC0002 (giro alto, contado há 2 dias) não entra: só depois de 7 dias', dia&&!dia.itens.AC0002);
  ok('Rodízio = 30 itens ÷ 10 dias = 3 (+ o giro alto)', dia&&Object.values(dia.itens).filter(x=>x.m==='rod').length===3, dia&&dia.n);
  ok('Cartão "Contagem do dia" no alto da escolha de itens', /Contagem do dia/.test(t)&&/4\s*para contar/.test(t)&&/Começar a contagem do dia \(4\)/.test(t), t.replace(/\n/g,' | '));
  await f.click('#invDia [data-a="dia"]'); await H.dorme(800);
  const sel=await f.evaluate(()=>({m:CONF_MODO,s:[...CONF_ITENS_SEL].sort()}));
  ok('"Começar a contagem do dia" abre a conferência com os 4 itens da lista', sel.m==='conferencia'&&sel.s.length===4&&sel.s.includes('AC0001'), JSON.stringify(sel));
  const vals={}; sel.s.forEach(c=>vals[c]=100); vals.AC0001=40; await salva(f,vals);
  b=await srv(); let dv=Object.entries(b.docs).filter(([k])=>k.startsWith('invdiv/')).map(([k,v])=>Object.assign({_id:k},v));
  ok('Contou 40 (sistema 100): abre divergência do AC0001 esperando recontagem; os que bateram não', dv.length===1&&dv[0].c==='AC0001'&&dv[0].st==='recontar'&&dv[0].c1.q===40&&dv[0].c1.s===100&&dv[0].c1.porNome==='Carla', JSON.stringify(dv).slice(0,250));
  await f.evaluate(()=>{ try{ confVoltarSelecao(); }catch(e){} }); await H.dorme(1500); t=await f.evaluate(()=>(document.getElementById('invDia')||{}).innerText||'');
  ok('Para a Carla: a recontagem do AC0001 fica para outra pessoa', /1\s*para outra pessoa recontar/.test(t)&&/Tudo da lista|0\s*para contar/.test(t), t.replace(/\n/g,' | ').slice(0,200));

  f=await troca('sis','sis123'); t=await card(f);
  ok('Para a Sara: o AC0001 aparece para recontar', /1\s*para contar/.test(t)&&/AC0001[\s\S]*recontar/.test(t), t.replace(/\n/g,' | ').slice(0,240));
  await f.click('#invDia [data-a="dia"]'); await H.dorme(800); await salva(f,{AC0001:45});
  b=await srv(); dv=Object.entries(b.docs).filter(([k])=>k.startsWith('invdiv/')).map(([k,v])=>Object.assign({_id:k},v));
  let x=dv.find(y=>y.c==='AC0001');
  ok('Recontagem de outra pessoa que não bateu: vai para o PCP fechar', x&&x.st==='pcp'&&x.rec&&x.rec.q===45&&x.rec.porNome==='Sara', JSON.stringify(x).slice(0,250));
  /* a mesma pessoa recontando e batendo fecha sozinha */
  await f.evaluate(()=>{ try{ confVoltarSelecao(); }catch(e){} CONF_ITENS_SEL.clear(); CONF_ITENS_SEL.add('AC0010'); confIniciarConferencia(); }); await H.dorme(500); await salva(f,{AC0010:60});
  await f.evaluate(()=>{ try{ confVoltarSelecao(); }catch(e){} CONF_ITENS_SEL.clear(); CONF_ITENS_SEL.add('AC0010'); confIniciarConferencia(); }); await H.dorme(500); await salva(f,{AC0010:100});
  b=await srv(); x=Object.values(b.docs).find(y=>y&&y.c==='AC0010'&&y.b!=null);
  ok('A mesma pessoa recontou e bateu: fecha sozinha como erro na contagem', x&&x.st==='fechada'&&x.aberta===false&&x.auto&&x.causa==='Erro na contagem', JSON.stringify(x).slice(0,250));

  await troca('iasmyn','senha123'); await p.evaluate(()=>__T.go('anlinvd')); await H.dorme(1500); await p.evaluate(()=>__T.go('anlinvd')); await H.dorme(2500);
  t=await H.txt(p,'#view')||'';
  ok('Tela "Divergências do inventário": 1 para o PCP fechar, com a 1ª contagem e a recontagem', /Divergências do inventário/.test(t)&&/Para o PCP fechar\s*1/.test(t)&&/AC0001/.test(t)&&/Sara/.test(t)&&/Carla/.test(t), t.replace(/\n/g,' | ').slice(0,300));
  await p.click('[data-act="ivd-abre"]'); await H.dorme(400); await p.click('[data-act="ivd-ok"]'); await H.dorme(400);
  b=await srv(); x=Object.values(b.docs).find(y=>y&&y.c==='AC0001'&&y.b!=null);
  ok('Não fecha sem a causa', x.aberta===true);
  await p.selectOption('#ivd-causa','Faturado e não saiu (ou saiu sem nota)'); await p.click('[data-act="ivd-ok"]'); await H.dorme(400);
  b=await srv(); x=Object.values(b.docs).find(y=>y&&y.c==='AC0001'&&y.b!=null);
  ok('"Sim, corrigi" pede o nº do documento do Focco', x.aberta===true);
  await p.click('[data-act="ivd-foc"][data-v="ainda"]'); await H.dorme(300); await p.click('[data-act="ivd-ok"]'); await H.dorme(800);
  b=await srv(); x=Object.values(b.docs).find(y=>y&&y.c==='AC0001'&&y.b!=null);
  ok('"Ainda não": fica em Falta corrigir no Focco, com a causa', x.aberta===true&&x.st==='focco'&&/Faturado/.test(x.causa), JSON.stringify(x).slice(0,200));
  await p.click('[data-act="ivd-aba"][data-v="focco"]'); await H.dorme(400); await p.click('[data-act="ivd-abre"]'); await H.dorme(400); await p.fill('#ivd-doc','AJ 7788'); await p.click('[data-act="ivd-ok"]'); await H.dorme(800);
  b=await srv(); x=Object.values(b.docs).find(y=>y&&y.c==='AC0001'&&y.b!=null);
  ok('"Corrigi no Focco" com o nº do documento fecha a divergência', x.aberta===false&&x.st==='fechada'&&x.foc==='sim'&&x.doc==='AJ 7788'&&x.fechadoPorNome, JSON.stringify(x).slice(0,220));
  await p.click('[data-act="ivd-aba"][data-v="fe"]'); await H.dorme(800); t=await H.txt(p,'#view')||'';
  ok('Aba Fechadas mostra a causa e o documento', /AJ 7788/.test(t)&&/Faturado/.test(t), t.replace(/\n/g,' | ').slice(-300));
  if(process.env.SHOT) await p.screenshot({path:'/tmp/invd.png',fullPage:true});
  const fal=res.filter(r=>!r.ok).length; console.log(fal?`FALHOU ${fal} de ${res.length}`:`PASSOU ${res.length}`); await B.browser.close(); process.exit(fal?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
