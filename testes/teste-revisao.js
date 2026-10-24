/* Revisão por usuário (12/10): botões de gravar só para quem pode, "Produção (consulta)" sem editar a programação, textos e telas de celular. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const agora=new Date().toISOString();
 /* a ordem 5001 fica na terça da semana que o calendário mostra (seg a sex; no fim de semana, a próxima), para o teste não depender do dia (fim de semana / feriado na segunda) */
 { const t=new Date(); const dw=(t.getDay()+6)%7; t.setDate(t.getDate()-dw+1+(dw>=5?7:0)); /* no sábado/domingo o calendário abre na semana que vem */ const iso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); if(D['ordens/5001']) D['ordens/5001'].data=iso; }
  D['ordens/5001'].rancho='123456'; D['ranchos/123456']={numero:'123456',criadoEm:agora,ordens:[{num:'5001'}],itens:[{c:'MP001',d:'Cimento',um:'kg',q:500}]};
  D['chamados/os-00001']={numero:1,linha:'Linha 1',defeito:'teste',impacto:'parou',nome:'Ana',status:'Aberta',criado:agora};
  const add=(u,ac)=>{ const uid='u'+u; d.users[u+'@painel-colafix.app']={uid,pass:'x12345',nome:u}; D['perfis/'+uid]={nome:u,usuario:u}; D['acessos/'+uid]=Object.assign({locais:[],ativo:true},ac); };
  add('tvfab',{perfil:'tvtodas',mods:['tv','telas','cal','analise','producao','silos','manut']}); add('almox',{perfil:'almoxpmx',mods:['premix','almox'],locais:['a3'],contar:true});
  add('fernando',{perfil:'consulta',mods:['silosver','cal'],linhas:['Linha 1']});
  const abrir=async(u,pw,vp)=>{ const B=await H.abrir({negarCamera:true,viewport:vp||{width:1366,height:800}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,u,pw); await H.dorme(3000); return B; };
  const vis=(p,sel)=>p.evaluate(s=>[...document.querySelectorAll(s)].some(e=>e.getBoundingClientRect().width>0),sel);
  const erros=[];
  // operadora (Produção · consulta)
  let B=await abrir('operador','ope123'); let p=B.page;
  await p.evaluate(()=>__T.go('programacao')); await H.dorme(400);
  const pr={nova:await vis(p,'[data-act="o-nova-abrir"]'),imp:await vis(p,'[data-act="o-imp-abrir"]'),apt:await vis(p,'[data-act="md-apt-abrir"]'),folha:await vis(p,'[data-act="fp-ordem"]'),cap:await vis(p,'.ogcap [data-go="ajustes"]')};
  ok('Produção (consulta): sem Nova ordem, Importar, Lançar apontamento e capacidade; Folha continua', !pr.nova&&!pr.imp&&!pr.apt&&!pr.cap&&pr.folha, JSON.stringify(pr));
  const w=await p.evaluate(async()=>{ const r={}; try{ await Painel.db().doc('ordens/5001').update({total:1}); r.ordem='gravou'; }catch(e){ r.ordem=e.code; } try{ await Painel.db().doc('paradas/pteste').set({linha:'Linha 1',motivo:'Outros',inicio:new Date().toISOString()}); r.parada='gravou'; }catch(e){ r.parada=e.code; } return r; });
  ok('Produção (consulta): não muda a ordem, mas registra parada', w.ordem==='sem-permissao'&&w.parada==='gravou', JSON.stringify(w));
  await p.evaluate(()=>__T.go('manch')); await H.dorme(400); const chm=await vis(p,'[data-act="man-novo"]'); const txt=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Produção (consulta): continua abrindo chamado; sem "há 0 min" nem ponto repetido', chm&&!/há 0 min|· ·/.test(txt)&&/menos de 1 min/.test(txt), txt.replace(/\n/g,' | ').slice(0,220));
  erros.push(...B.erros); await B.browser.close();
  // administradora: vê tudo e grava os bloqueios do cargo para as regras do banco
  B=await abrir('iasmyn','senha123'); p=B.page; await p.evaluate(()=>__T.go('programacao')); await H.dorme(400);
  const adm=await vis(p,'[data-act="o-nova-abrir"]')&&await vis(p,'#tp-mais'); await H.dorme(3500);
  const bl=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['acessos/uOPE'].bloqCols||[]);
  ok('Administradora vê tudo; o painel dela grava os bloqueios do cargo Produção (consulta)', adm&&['previsoes','itens','entregas','medicoes'].every(c=>bl.includes(c))&&!bl.includes('ordens')&&!bl.includes('chamados')&&!bl.includes('paradas'), JSON.stringify(bl));
  await p.evaluate(()=>{ __T.S().eq.aba='pessoas'; __T.go('acessos'); }); await H.dorme(300); await p.click('[data-act="acs-editar"][data-id="uOPE"]'); await H.dorme(400);
  const pad=await p.evaluate(()=>{ const t=k=>{ const i=document.querySelector(`[data-acx-acao="${k}"][data-id="uOPE"]`); return i?(i.checked?'sim':'não')+' '+i.parentElement.innerText.trim().slice(-16):'?'; }; return {prog:t('programar'),ab:t('abrirch'),sel:/ajustado/.test(document.querySelector('[data-act="acs-editar"][data-id="uOPE"]')?.innerText||'')}; });
  ok('Ajustar acesso mostra o padrão do cargo (programar: não pode; abrir chamado: pode) sem selo "ajustado"', /^não[\s\S]*não pode/.test(pad.prog)&&/^sim[\s\S]*pode/.test(pad.ab)&&!pad.sel, JSON.stringify(pad));
  erros.push(...B.erros); await B.browser.close();
  // TV (só ver)
  B=await abrir('tvfab','x12345',{width:1920,height:1080}); p=B.page; await p.evaluate(()=>__T.go('programacao')); await H.dorme(400);
  const tv={nova:await vis(p,'[data-act="o-nova-abrir"]'),mais:await vis(p,'#tp-mais'),env:await vis(p,'[data-act="o-env-alm"]'),pri:await vis(p,'select[data-pri]')};
  await p.evaluate(()=>__T.go('manequip')); await H.dorme(400); tv.cad=await vis(p,'.mx-new'); tv.qr=await vis(p,'[data-act="mx-eq-qr"]');
  ok('TV: sem botões de gravar (nova ordem, +, enviado ao almox, prioridade, cadastro); consulta continua', !tv.nova&&!tv.mais&&!tv.env&&!tv.pri&&!tv.cad&&tv.qr, JSON.stringify(tv));
  erros.push(...B.erros); await B.browser.close();
  // almox no celular
  B=await abrir('almox','x12345',{width:390,height:844}); p=B.page; await p.evaluate(()=>__T.go('diario')); await H.dorme(400); const al=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Almox: aviso claro do que separar hoje', /Hoje o almox separa e entrega os ranchos das ordens de/.test(al.replace(/\s+/g,' ')), al.slice(0,160));
  erros.push(...B.erros); await B.browser.close();
  // técnico no celular: lista antes do cadastro
  B=await abrir('tecnico','tec123',{width:390,height:844}); p=B.page; await p.evaluate(()=>__T.go('manequip')); await H.dorme(400);
  const ord=await p.evaluate(()=>{ const n=document.querySelector('.mx-new'), l=[...document.querySelectorAll('#view section.card')].find(s=>/equipamento/.test(s.innerText)&&!s.classList.contains('mx-new')); return n&&l?l.getBoundingClientRect().top<n.getBoundingClientRect().top:null; });
  ok('Técnico (celular): Equipamentos mostra a lista antes do cadastro', ord===true, String(ord));
  erros.push(...B.erros); await B.browser.close();
  // consulta no celular: calendário em lista
  B=await abrir('fernando','x12345',{width:390,height:844}); p=B.page; await p.evaluate(()=>__T.go('calendario')); await H.dorme(400);
  const cl=await p.evaluate(()=>({lst:!!document.querySelector('.cal-lst'),grade:!!document.querySelector('.calgrid'),t:document.getElementById('view').innerText,lado:document.documentElement.scrollWidth>innerWidth+2}));
  ok('Consulta (celular): calendário em lista por dia, sem rolagem lateral e sem "(HTML)"', cl.lst&&!cl.grade&&/5001/.test(cl.t)&&!cl.lado&&!/HTML/.test(cl.t), JSON.stringify({lst:cl.lst,grade:cl.grade,lado:cl.lado}));
  erros.push(...B.erros); await B.browser.close();
  const e2=erros.filter(x=>!/404|cdnjs|camera|câmera|NotAllowed|getUserMedia/i.test(x)); ok('Nenhum erro de JavaScript', !e2.length, e2.join(' | '));
  const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU — '+res.length+' verificações'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
