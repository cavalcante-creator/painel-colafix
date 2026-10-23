/* Painel Colafix · 33-gestor-pessoas.js (22/10)
   1) Perfil do gestor organizado: a barra lateral mostra as telas da Visão do gestor e, embaixo, os sistemas completos
      (sem repetir: sem "Nível dos silos" e "Monitor do rancho"; as abas de cima somem na Visão do gestor).
   2) Início do gestor novo (faixa de destaque, números, pessoas hoje).
   3) Tela "Quem está na empresa" (gxpres, protótipo opção D): lê presenca/{dia}, o resumo do Face ID SEM CPF
      que o painel do RH publica (modulos/rh-almoco.js → RHAlmoco.publicar). */
"use strict";
const GXN_TELAS=['gxinicio','gxpres','gxprod','gxpar','gxdia','gxacoes','gxseg','gxcal','gxturnos','gxcad','gestao'];
const GXN_SIS=[['producao','Programação'],['manut','Manutenção'],['silos','Silos'],['analise','Análise PCP'],['premix','Almoxarifado'],['almox','Inventário'],['telas','Telas de TV'],['rh','RH']];
const GXN_ROT={gxpres:'Pessoas hoje',gxseg:'Segurança',gxcal:'Preventivas',gxdia:'Relatórios',gestao:'TVs da fábrica'};
const GXN_FORA=['gestor','silosver','monitor','meumenu','meupainel'];
function gxSolo(){ try{ const A=S.acs; if(!A||!A.pronto) return false; if(A.dono) return /[?&]gestor=1/.test(location.search); return !!(A.doc&&A.doc.perfil==='gestor')&&viewOk('gxinicio'); }catch(e){ return false; } }

/* ---------- presença (Face ID) ---------- */
S.gxPres=S.gxPres||{docs:[],lido:false}; S.gxp=S.gxp||{f:'todos',dia:null};
let _gxpSub=false;
function gxpAssina(){ if(_gxpSub||!S.db||!(viewOk('gxpres')||S._gxpRH)) return; _gxpSub=true;
  inscrever('gxpresenca',()=>S.db.collection('presenca').orderBy('dia','desc').limit(14),snap=>{ S.gxPres.docs=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x&&x.dia); S.gxPres.lido=true; rerenderSeguro(); }); }
function gxpDoc(d){ return (S.gxPres.docs||[]).find(x=>x.dia===d)||null; }
const gxpM=t=>{ const m=String(t||'').match(/(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
const gxpH=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(Math.round(m%60)).padStart(2,'0');
const gxpNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function gxpAgoraMin(){ const a=new Date(); return a.getHours()*60+a.getMinutes(); }
function gxpResumo(D){ if(!D) return null; const hoje=D.dia===hojeStr(), ag=gxpAgoraMin(), lim=gxpM(D.lim)||480, fimAl=gxpM((D.alm||[])[1])||870;
  const p=D.p||[], f=(D.f||[]).filter(x=>x.m!=='Sumiu'), sumiu=(D.f||[]).length-f.length; const na=p.filter(x=>!x.sa).length, alm=p.filter(x=>x.a).length, atr=p.filter(x=>gxpM(x.c)>lim).length, semReg=f.filter(x=>x.m!=='Férias').length, fer=f.length-semReg;
  return {hoje,ag,lim,fimAl,vieram:p.length,esper:p.length+f.length,na,alm,semAlm:p.length-alm,atr,semReg,fer,nao:f.length,sumiu,almAberto:hoje&&ag<fimAl}; }
function gxpFonte(D){ const f=D&&D.fonte; if(!f||!f.em) return ''; const x=new Date(f.em); return 'atualizado às '+String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0')+(x.toISOString().slice(0,10)!==D.dia&&D.dia===hojeStr()?' de '+x.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):''); }
function gxpVelho(D){ const f=D&&D.fonte; if(!f||!f.em||D.dia!==hojeStr()) return false; const h=new Date().getHours(); return h>=7&&h<=19&&(Date.now()-new Date(f.em).getTime())>130*60000; }
function gxpRing(v,t,tam,txt,sub,cor){ const r=tam/2-9, C=2*Math.PI*r, pc=t?Math.max(0,Math.min(1,v/t)):0;
  return `<div class="gxn-ring" style="width:${tam}px;height:${tam}px" role="img" aria-label="${esc(txt+' '+(sub||''))}"><svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" aria-hidden="true"><circle cx="${tam/2}" cy="${tam/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="11"/><circle cx="${tam/2}" cy="${tam/2}" r="${r}" fill="none" stroke="${cor||'#7FD1C0'}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(C*pc).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${tam/2} ${tam/2})"/></svg><div><b>${txt}</b>${sub?`<span>${sub}</span>`:''}</div></div>`; }

/* ---------- navegação do gestor ---------- */
function gxnSisLista(){ const vis=modsVis(), ids=vis.map(m=>m.id), out=[];
  GXN_SIS.forEach(([id,nome])=>{ const m=vis.find(x=>x.id===id); if(m) out.push({id,nome,ic:m.ic}); });
  vis.forEach(m=>{ if(!GXN_FORA.includes(m.id)&&!out.some(x=>x.id===m.id)) out.push({id:m.id,nome:m.nome,ic:m.ic}); });
  return {out,tv:viewOk('gestao')}; }
function gxnBadges(){ const b={}; try{ const al=gxAlertas(); if(al.length) b.gxinicio=al.length; }catch(e){} try{ const h=hojeStr(), n=(S.gxAcoes||[]).filter(a=>a.st!=='ok'&&a.prazo&&a.prazo<h).length; if(n) b.gxacoes=n; }catch(e){} return b; }
function gxnNav(){ const on=gxSolo(); document.body.classList.toggle('gx-solo',on); document.body.classList.toggle('gx-mod',on&&S.mod==='gestor'); if(!on) return;
  const nl=$('#navlist'); if(!nl) return; const lb=nl.previousElementSibling; if(lb&&lb.classList.contains('modulo')) lb.textContent='VISÃO DO GESTOR';
  const B=gxnBadges(), cur=v=>S.view===v||(v==='gxdia'&&S.view==='gxmes');
  const tel=GXN_TELAS.filter(v=>VIEWS[v]&&viewOk(v)).map(v=>`<button class="navbtn gxn-nb" data-go="${v}" ${cur(v)?'aria-current="page"':''}>${ic(VIEWS[v].ic,18)}<span>${esc(GXN_ROT[v]||VIEWS[v].nome)}</span>${B[v]?`<em class="gxn-bd">${B[v]}</em>`:''}</button>`).join('');
  const L=gxnSisLista(), sis=L.out.map(m=>`<button class="navbtn gxn-ns" data-mod="${m.id}" ${S.mod===m.id&&S.view!=='ajustes'?'aria-current="page"':''}>${ic(m.ic,16)}<span>${esc(m.nome)}</span></button>`).join('')
    +(L.tv?`<button class="navbtn gxn-ns" data-go="gestao" ${S.view==='gestao'?'aria-current="page"':''}>${ic('tv',16)}<span>TVs da fábrica</span></button>`:'');
  const h=tel; /* sistemas completos saíram do menu do gestor (pedido de 22/10); os links das telas continuam abrindo */
  nl.innerHTML=h;
  if(S.mod==='gestor'||S.view==='modulos'){ const bn=$('#bottomnav'); if(bn){ const it=[['gxinicio','grid','Início'],['gxpres','equipe','Pessoas'],['gxprod','grafico','Produção'],['gxdia','folha','Relatórios'],['modulos','grid','Mais']].filter(x=>x[0]==='modulos'||viewOk(x[0]));
    bn.style.gridTemplateColumns=`repeat(${it.length},minmax(0,1fr))`; bn.innerHTML=it.map(([v,i,t])=>`<button data-go="${v}" ${cur(v)?'aria-current="page"':''}>${ic(i,22)}${t}</button>`).join(''); } } }
{ const _rn=renderNav; renderNav=function(){ _rn.apply(this,arguments); try{ gxnNav(); }catch(e){ console.warn('[gestor nav]',e); } }; }
function gxnModulos(){ const L=gxnSisLista();
  return `<div class="head"><div><div class="eyebrow">VISÃO DO GESTOR</div><h1>Tudo o que você acompanha</h1></div></div>
   <section class="card"><h2 class="gxn-h2">Visão do gestor</h2><div class="gxn-mg">${GXN_TELAS.filter(v=>VIEWS[v]&&viewOk(v)).map(v=>`<button class="gxn-mb" data-go="${v}">${ic(VIEWS[v].ic,22)}<span>${esc(v==='gxpres'?'Quem está na empresa':VIEWS[v].nome)}</span></button>`).join('')}</div></section>
`; }
S.extViews=S.extViews||{}; S.extViews.modulos=()=>gxSolo()?gxnModulos():vModulos();

/* ---------- registro da tela nova ---------- */
VIEWS.gxpres={nome:'Quem está na empresa',ic:'equipe',mob:'Pessoas'}; CRUMB.gxpres='Quem está na empresa';
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxpres')){ const i=M.views.indexOf('gxinicio'); M.views.splice(i<0?0:i+1,0,'gxpres'); } }
if(VIEWS.gxinicio) VIEWS.gxinicio.nome='Início';

/* ================= INÍCIO NOVO ================= */
function vGxInicio2(){ gxAssina(); gxpAssina(); const h=hojeStr(), D=gxDados(h), al=gxAlertas(), agora=new Date();
  const nome=gxEu().split(' ')[0], sau=agora.getHours()<12?'Bom dia':agora.getHours()<18?'Boa tarde':'Boa noite';
  const L=linhasOrd(), st=L.map(l=>gxLinhaAgora(l)), rod=st.filter(x=>x.c==='ok').length, par=st.filter(x=>x.c==='crit').length;
  const chAb=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido&&!manFechada(c)), semT=chAb.filter(c=>!(c.exec&&c.exec.tecnico)).length;
  const pc=gxPct(D.tot.t,D.tot.mT), seg=D.seg;
  const ini=horaMin(GX_TURNO_PADRAO.ini), fim=horaMin(GX_TURNO_PADRAO.fim), mn=agora.getHours()*60+agora.getMinutes(), fr=Math.max(0,Math.min(1,(mn-ini)/(fim-ini)));
  const esp=D.tot.mT*fr, adiant=D.tot.mT?D.tot.t-esp:null;
  const PD=gxpDoc(h), PR=gxpResumo(PD);
  const frase=[D.tot.mT?`A produção está em ${pc||0}% da meta do dia`+(adiant!=null&&fr>0&&fr<1?(adiant>=0?', no ritmo.':', '+gxT(-adiant)+' t abaixo do esperado agora.'):'.'):`Hoje já saíram ${gxT(D.tot.t)} t.`,
    par?`${par} linha${par>1?'s':''} parada${par>1?'s':''}.`:'Nenhuma linha parada.', semT?`${semT} chamado${semT>1?'s':''} sem técnico.`:''].filter(Boolean).join(' ');
  const chs=chAb.filter(c=>!c.prevId).sort((a,b)=>(a.impacto==='parou'?0:1)-(b.impacto==='parou'?0:1)||String(a.criado).localeCompare(String(b.criado))).slice(0,5);
  let pv=[]; try{ pv=typeof mxPrevStatus==='function'?mxPrevStatus().filter(x=>['atrasada','hoje','aberta','semana'].includes(x.st)).slice(0,5):[]; }catch(e){}
  const ac=(S.gxAcoes||[]).filter(a=>a.st!=='ok').sort((a,b)=>String(a.prazo||'9').localeCompare(String(b.prazo||'9'))).slice(0,5), acAtr=(S.gxAcoes||[]).filter(a=>a.st!=='ok'&&a.prazo&&a.prazo<h).length;
  const D2=gxRit(h.slice(0,7)); let mes='<div class="empty">A previsão do mês ainda não foi importada na Curva S.</div>', mesPc=null;
  if(D2){ const k=ritStats(D2,{}); const kg=k.kg||20, T=k.T*kg/1000, R=k.ra*kg/1000, Pa=k.pa*kg/1000; mesPc=T?Math.round(R/T*100):null;
    mes=`<div class="gxn-mesl"><div><b class="gxn-big">${gxT(R)} t</b><span class="gxn-mut">de ${gxT(T)} t no mês</span></div><div class="gxn-mesr"><span>Esperado até hoje <b>${gxT(Pa)} t</b></span><span>${k.rem?`Precisa <b>${gxT(Math.max(0,T-R)/k.rem)} t</b> por dia útil (${k.rem})`:'Mês fechado'}</span></div></div>
      <div class="gxn-track"><i style="width:${T?Math.min(100,R/T*100).toFixed(1):0}%"></i><em style="left:${T?Math.min(100,Pa/T*100).toFixed(1):0}%" title="Esperado até hoje"></em></div>
      <div class="gxn-leg"><span><i class="a"></i>Feito ${gxPct(R,T)||0}%</span><span><i class="b"></i>Onde deveria estar ${gxPct(Pa,T)||0}%</span></div>`; }
  const corMeta=pc==null?'#7FD1C0':pc>=95?'#7FD1C0':pc>=70?'#F2C46D':'#F2A497';
  const hero=`<section class="gxn-hero">
     <div class="gxn-hl"><span class="gxn-eye">${esc(gxDiaTxt(h).toUpperCase())} · AO VIVO</span><h1>${sau}${nome?', '+esc(nome):''}</h1><p>${esc(frase)}</p>
       <div class="gxn-acts"><button class="gxn-b1" data-go="gxdia">${ic('folha',18,2)}Relatório do dia</button><button class="gxn-b2" data-act="gx-ac-nova">${ic('mais',18,2)}Nova ação</button><button class="gxn-b2" data-go="manprev">${ic('cal2',18,2)}Programar preventiva</button></div></div>
     <div class="gxn-hr">
       ${gxpRing(D.tot.t,D.tot.mT||0,150,D.tot.mT?(pc||0)+'%':gxT(D.tot.t)+' t',D.tot.mT?'da meta do dia':'produzido hoje',corMeta)}
       <div class="gxn-hs">
         <div><span>Produzido hoje</span><b>${gxT(D.tot.t)} t</b><small>${D.tot.mT?'meta '+gxT(D.tot.mT)+' t · esperado agora '+gxT(esp)+' t':gxN(D.tot.sc)+' sacos'}</small></div>
         <div><span>Linhas rodando</span><b>${rod} <em>de ${L.length}</em></b><small>${par?par+' parada'+(par>1?'s':''):'nenhuma parada'}</small></div>
         <div><span>Na empresa agora</span><b>${PR?(PR.hoje?PR.na:PR.vieram)+' <em>de '+PR.esper+'</em>':'—'}</b><small>${PR?PR.alm+(PR.alm===1?' almoçou':' almoçaram')+' · '+PR.nao+(PR.nao===1?' não veio':' não vieram'):'Face ID ainda sem dados hoje'}</small></div>
       </div></div></section>`;
  const alerta=al.length?`<section class="card gxn-al"><div class="gxn-ch"><h2>Precisa de você <span class="gxn-cnt">${al.length}</span></h2><span class="gxn-mut">Só o que saiu do normal.</span></div>
      <div class="gxn-als">${al.map(a=>`<div class="gxn-ali ${a.c}"><span class="gxn-dot" aria-hidden="true"></span><div><b>${esc(a.t)}</b><span>${esc(a.d||'')}</span></div>${a.n?`<button class="btn sec" data-act="man-abrir" data-n="${a.n}" data-ir="1">Ver chamado</button>`:a.go?`<button class="btn sec" data-go="${a.go}">Ver</button>`:''}</div>`).join('')}</div></section>`
    :`<div class="gxn-tudo">${ic('check',20,2)}<b>Tudo em ordem.</b><span>Nenhuma linha parada, chamado esperando ou prazo vencido.</span></div>`;
  const segTxt=seg?(+seg.ocorr?seg.ocorr+' ocorrência'+(+seg.ocorr>1?'s':''):'Sem ocorrências'):'';
  const minis=`<section class="gxn-minis">
     <button class="gxn-mini" data-go="gxpar"><span>Paradas hoje</span><b>${gxDur(D.tot.par)}</b><small>${D.par.filter(z=>!z.setup).length} parada(s) · sem setup</small></button>
     <button class="gxn-mini ${semT?'warn':''}" data-go="manch"><span>Chamados abertos</span><b>${chAb.length}</b><small>${semT?semT+' sem técnico':'todos com técnico'}</small></button>
     <button class="gxn-mini ${seg?(+seg.ocorr?'crit':'ok'):'warn'}" data-act="gx-seg-ir" data-d="${h}"><span>Segurança de hoje</span><b class="${seg?'':'gxn-txt'}">${seg?esc(segTxt):'Falta preencher'}</b><small>${seg?(seg.pessoas?seg.pessoas+' pessoas':'')+(seg.epi!=null&&seg.epi!==''?' · EPI '+seg.epi+'%':''):'toque para preencher'}</small></button>
     <button class="gxn-mini ${acAtr?'warn':''}" data-go="gxacoes"><span>Plano de ação</span><b>${(S.gxAcoes||[]).filter(a=>a.st!=='ok').length}</b><small>${acAtr?acAtr+' atrasada'+(acAtr>1?'s':''):'abertas · nenhuma atrasada'}</small></button>
   </section>`;
  const pes=PR?`<div class="gxn-pes">${gxpRingLight(PR.hoje?PR.na:PR.vieram,PR.esper)}<div class="gxn-pl"><div><b>${PR.vieram}</b><span>vieram</span></div><div><b>${PR.alm}</b><span>almoçaram</span></div><div class="${PR.semReg?'crit':''}"><b>${PR.nao}</b><span>não vieram${PR.fer?' · '+PR.fer+' de férias':''}</span></div><div class="${PR.atr?'warn':''}"><b>${PR.atr}</b><span>depois das ${esc(PD.lim||'08:00')}</span></div></div></div><p class="gxn-mut gxn-pf">${esc(gxpFonte(PD))}</p>`
    :`<p class="gxn-vaz">Os dados do Face ID de hoje ainda não chegaram.</p>`;
  return `${banner()}${hero}<div class="gxn-top">${alerta}${minis}</div>
   <div class="gxn-g21">
     <section class="card"><div class="gxn-ch"><h2>Linhas agora</h2><button class="lnk" data-go="gxprod">Ver produção</button></div>${gxLinhasHtml()}</section>
     <section class="card"><div class="gxn-ch"><h2>Pessoas hoje</h2><button class="lnk" data-go="gxpres">Quem está na empresa</button></div>${pes}</section>
   </div>
   <div class="gxn-g3">
     <section class="card"><div class="gxn-ch"><h2>Chamados</h2><button class="lnk" data-go="manch">Todos</button></div>
       ${chs.length?`<div class="gx-lista">${chs.map(c=>`<button class="gx-li" data-act="man-abrir" data-n="${c.numero}" data-ir="1"><div><b>${manNum(c.numero)} · ${esc(c.linha||'')}</b><span>${esc(c.defeito||'')} · há ${ltvMin(Date.now()-new Date(c.criado).getTime())}${c.exec&&c.exec.tecnico?' · '+esc(typeof tecNomes==='function'?tecNomes(c):c.exec.tecnico):''}</span></div>${c.impacto==='parou'?'<span class="gx-st atr">Máquina parada</span>':gxSt(c)}</button>`).join('')}</div>`:'<div class="gx-ok">Nenhum chamado aberto.</div>'}</section>
     <section class="card"><div class="gxn-ch"><h2>Preventivas</h2><button class="lnk" data-go="gxcal">Calendário</button></div>
       ${pv.length?`<div class="gx-lista">${pv.map(x=>`<div class="gx-li"><div><b>${x.p.prox?dm(x.p.prox):'—'} · ${esc(x.p.tarefa)}</b><span>${esc((x.e&&x.e.nome)||'')}${x.p.resp?' · '+esc(x.p.resp):''}</span></div><span class="gx-st ${x.st==='atrasada'?'atr':x.st==='aberta'?'and':'pen'}">${x.st==='atrasada'?'Atrasada':x.st==='aberta'?'Em andamento':x.st==='hoje'?'Hoje':'Na semana'}</span></div>`).join('')}</div>`:'<div class="gx-ok">Nenhuma preventiva para esta semana.</div>'}</section>
     <section class="card"><div class="gxn-ch"><h2>Plano de ação</h2><button class="lnk" data-go="gxacoes">Ver todas</button></div>
       ${ac.length?`<div class="gx-lista">${ac.map(a=>`<label class="gx-chk"><input type="checkbox" data-gxac-ok="${esc(a._id)}"><span><b>${esc(a.t)}</b><small>${esc(a.quem||'')}${a.prazo?' · até '+dm(a.prazo):''}</small></span>${gxAcSt(a)}</label>`).join('')}</div>`:'<div class="gx-ok">Nenhuma ação aberta.</div>'}</section>
   </div>
   <section class="card gxn-mes"><div class="gxn-ch"><h2>Produção do mês${mesPc!=null?` <span class="gxn-cnt">${mesPc}%</span>`:''}</h2><button class="lnk" data-go="gxmes">Relatório do mês</button></div>${mes}</section>
   ${S.gx.acNova?gxAcForm():''}`; }
function gxpRingLight(v,t){ const tam=112, r=tam/2-8, C=2*Math.PI*r, pc=t?Math.max(0,Math.min(1,v/t)):0;
  return `<div class="gxn-ring lt" style="width:${tam}px;height:${tam}px" role="img" aria-label="${v} de ${t} na empresa"><svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" aria-hidden="true"><circle cx="${tam/2}" cy="${tam/2}" r="${r}" fill="none" stroke="var(--sunken)" stroke-width="10"/><circle cx="${tam/2}" cy="${tam/2}" r="${r}" fill="none" stroke="var(--teal)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(C*pc).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${tam/2} ${tam/2})"/></svg><div><b>${v}</b><span>de ${t}</span></div></div>`; }
S.extViews.gxinicio=vGxInicio2;

/* ================= QUEM ESTÁ NA EMPRESA ================= */
const GXP_EMP_COR={Colafix:'#143F54',Zenith:'#1F6E80',Nexus:'#6FB3C2',Terceiros:'#C7832A'};
function gxpHist(docs,dSel,n){ /* status por pessoa nos últimos n dias de expediente até dSel */
  const ds=docs.filter(x=>x.dia<=dSel&&(x.exp||x.dia===hojeStr())).sort((a,b)=>a.dia.localeCompare(b.dia)).slice(-n), out={};
  ds.forEach((D,j)=>{ const lim=gxpM(D.lim)||480; (D.p||[]).forEach(p=>{ const k=gxpNorm(p.n); (out[k]=out[k]||Array(ds.length).fill(''))[j]=gxpM(p.c)>lim?'a':'o'; }); (D.f||[]).forEach(p=>{ const k=gxpNorm(p.n); (out[k]=out[k]||Array(ds.length).fill(''))[j]=p.m==='Férias'?'f':'x'; }); });
  return {dias:ds.map(x=>x.dia),out}; }
function vGxPres(){ gxpAssina(); const G=S.gxp, docs=S.gxPres.docs||[], h=hojeStr();
  if(!S.gxPres.lido) return `${banner()}<section class="card"><div class="empty">Carregando…</div></section>`;
  if(!docs.length) return `${banner()}<section class="gxp-hero"><div><span class="gxn-eye">${S._gxpRH?'RH · PESSOAS NA EMPRESA':'VISÃO DO GESTOR'} · PELO FACE ID</span><h1>Quem está na empresa</h1><p>Os dados do Face ID ainda não foram publicados. Eles chegam sozinhos quando alguém do RH (ou a administradora) está com o painel aberto e o Face ID do dia foi importado (pelo robô ou pelo arquivo).</p></div></section>`;
  const dSel=(G.dia&&gxpDoc(G.dia))?G.dia:(gxpDoc(h)?h:docs[0].dia), D=gxpDoc(dSel), R=gxpResumo(D), ag=R.ag;
  const p=D.p||[], f=D.f||[];
  /* faixa de horas */
  const cs=p.map(x=>gxpM(x.c)).filter(x=>x!=null).sort((a,b)=>a-b), us=p.map(x=>gxpM(x.u)).filter(x=>x!=null);
  const lo=Math.min(360,Math.floor(((cs[0]!=null?cs[0]:360))/60)*60), hi=Math.max(1080,Math.ceil((Math.max(R.hoje?ag:0,...us,0)+1)/60)*60);
  const pos=m=>((Math.max(lo,Math.min(hi,m))-lo)/(hi-lo)*100).toFixed(2)+'%', larg=(a,b)=>((Math.max(lo,Math.min(hi,b))-Math.max(lo,Math.min(hi,a)))/(hi-lo)*100).toFixed(2)+'%';
  const horas=[]; for(let x=lo;x<=hi;x+=120) horas.push(x);
  const horasH=`<div class="gxp-hrs" aria-hidden="true">${horas.map((x,i)=>`<span style="left:${pos(x)};transform:translateX(${i===0?'0':x>=hi?'-100%':'-50%'})">${x/60}h</span>`).join('')}</div>`;
  const agoraL=R.hoje&&ag>=lo&&ag<=hi?`<i class="gxp-now" style="left:${pos(ag)}"></i>`:'';
  /* ritmo do dia */
  const c90=cs.length?cs[Math.min(cs.length-1,Math.floor(cs.length*.9))]:null, al=(D.alm||['10:30','14:30']).map(gxpM);
  const ritmo=`<section class="card gxp-rit"><div class="gxn-ch"><h2>Ritmo do dia</h2><span class="gxn-mut">${R.hoje?(R.almAberto?'Almoço até '+esc((D.alm||[])[1]||'14:30')+' · faltam '+ltvMin((R.fimAl-ag)*60000):'Almoço encerrado'):'Dia '+dm(dSel)}</span></div>
    <div class="gxp-rb" role="img" aria-label="Chegadas ${cs.length?gxpH(cs[0])+' a '+gxpH(c90):''}, almoço ${esc((D.alm||[]).join(' a '))}">
      ${cs.length?`<div class="gxp-fx ch" style="left:${pos(cs[0])};width:${larg(cs[0],Math.max(c90,cs[0]+20))}"><span>Chegadas</span></div>`:''}
      <div class="gxp-fx al" style="left:${pos(al[0])};width:${larg(al[0],al[1])}"><span>Almoço · ${R.alm} ${R.alm===1?'pessoa':'pessoas'}</span></div>
      ${R.hoje&&ag>=lo&&ag<=hi?`<i class="gxp-now big" style="left:${pos(ag)}"><b>agora ${gxpH(ag)}</b></i>`:''}</div>${horasH}</section>`;
  /* pessoa por pessoa */
  const HI=gxpHist(docs,dSel,5);
  const dot=k=>`<span class="gxp-d ${k||'v'}" title="${k==='o'?'no horário':k==='a'?'chegou depois':k==='x'?'não veio, sem registro':k==='f'?'férias':'sem dado'}"></span>`;
  const hist=n=>{ const a=HI.out[gxpNorm(n)]||[]; return `<div class="gxp-hist" role="img" aria-label="Últimos ${HI.dias.length} dias: ${HI.dias.map((d,j)=>dm(d)+' '+({o:'no horário',a:'chegou depois',x:'faltou',f:'férias'}[a[j]]||'sem dado')).join(', ')}">${HI.dias.map((d,j)=>dot(a[j])).join('')}</div>`; };
  const rows=p.map(x=>{ const c=gxpM(x.c), u=gxpM(x.u), atr=c>R.lim;
      const seg=(x.g||[]).map(s=>{ const [a,b]=s.split('-'); const am=gxpM(a), bm=b?gxpM(b):(R.hoje?ag:u); return bm>am?`<i class="gxp-sg" style="left:${pos(am)};width:${larg(am,bm)}"></i>`:''; }).join('')||(c!=null?`<i class="gxp-sg" style="left:${pos(c)};width:${larg(c,Math.max(c+5,R.hoje?ag:u))}"></i>`:'');
      const st=x.sa?['saiu','Saiu '+x.u]:R.hoje?['na','Na empresa']:['na','Veio'];
      const cls=['p',x.sa?'saiu':'na',x.a?'alm':'semalm',atr?'atr':''].join(' ');
      return `<div class="gxp-row" data-k="${cls}" data-b="${esc(gxpNorm(x.n+' '+(x.s||'')+' '+(x.e||'')))}"><div class="gxp-who"><button class="gxp-nm" data-act="gxp-pes" data-n="${esc(x.n)}">${esc(x.n)}</button><span>${esc([x.s,x.e!=='Colafix'?x.e:''].filter(Boolean).join(' · '))}${x.s||x.e!=='Colafix'?' · ':''}<span class="${atr?'gxp-late':''}">chegou ${esc(x.c)}</span>${x.a?' · almoço '+esc(x.a):R.hoje&&R.almAberto?' · ainda não almoçou':' · não almoçou'}</span></div>
        <div class="gxp-tr" role="img" aria-label="${esc(x.n+': chegou '+x.c+(x.a?', almoço '+x.a:', sem almoço')+(x.sa?', saiu '+x.u:''))}">${seg}${x.a?`<i class="gxp-al" style="left:${pos(gxpM(x.a))}" title="Almoço ${esc(x.a)}"></i>`:''}${agoraL}</div>
        <span class="gxp-st ${st[0]}">${esc(st[1])}</span>${hist(x.n)}</div>`; }).join('')
    +f.map(x=>{ const su=x.m==='Sumiu'; return `<div class="gxp-row" data-k="${su?'sumiu':'f '+(x.m==='Férias'?'fer':'semreg')}" data-b="${esc(gxpNorm(x.n+' '+(x.s||'')+' '+(x.e||'')))}"><div class="gxp-who"><button class="gxp-nm" data-act="gxp-pes" data-n="${esc(x.n)}">${esc(x.n)}</button><span>${esc([x.s,x.e!=='Colafix'?x.e:''].filter(Boolean).join(' · ')||'—')}</span></div>
        <div class="gxp-tr aus ${su?'sumiu':''}"><span>${esc(su?(x.u?'Não passa no Face ID desde '+dm(x.u)+' · confira no RH se saiu da empresa':'Nunca passou no Face ID · confira no RH se ainda trabalha aqui'):x.m==='Férias'?'De férias':'Não veio · sem registro no Face ID')}</span></div><span class="gxp-st ${su?'sumiu':'nao'}">${su?'Fora do Face ID':x.m==='Férias'?'Férias':'Não veio'}</span>${hist(x.n)}</div>`; }).join('');
  const abas=[['todos','Todos',p.length+f.length],['na',R.hoje?'Na empresa agora':'Vieram',R.hoje?R.na:R.vieram],['semalm',R.hoje&&R.almAberto?'Ainda não almoçou':'Não almoçou',R.semAlm],['atr','Chegaram depois',R.atr],['f','Não vieram',R.nao]].concat(R.sumiu?[['sumiu','Fora do Face ID',R.sumiu]]:[]);
  const fil=abas.some(a=>a[0]===G.f)?G.f:'todos';
  const lista=`<section class="card gxp-lista" data-f="${fil}"><div class="gxn-ch gxp-lh"><h2>Pessoa por pessoa</h2>
      <div class="gxp-tabs" role="group" aria-label="Filtrar pessoas">${abas.map(([k,t,n])=>`<button class="gxp-tab" data-act="gxp-f" data-v="${k}" aria-pressed="${fil===k}">${esc(t)} <em>${n}</em></button>`).join('')}</div></div>
    <div class="gxp-tools"><div class="gxp-busca"><label for="gxp-q">Pesquisar pessoa</label><div><span aria-hidden="true">${ic('lupa',18,2)}</span><input id="gxp-q" type="search" autocomplete="off" placeholder="Nome, setor ou empresa" value="${esc(G.q||'')}"></div></div>
      <div class="gxp-leg"><span><i class="sg"></i>Na empresa</span><span><i class="al"></i>Almoço</span>${R.hoje?'<span><i class="nw"></i>Agora</span>':''}<span>Últimos dias: ${dot('o')}no horário ${dot('a')}depois ${dot('x')}faltou ${dot('f')}férias</span></div></div>
    <div class="gxp-sc"><div class="gxp-tab-in"><div class="gxp-row gxp-hd"><span>Pessoa</span>${horasH}<span>Agora</span><span>Últimos ${HI.dias.length} dias</span></div>${rows}<p class="gxp-vz" hidden>Ninguém encontrado com essa busca neste filtro.</p></div></div>
    <p class="gxn-mut gxp-rod">Só nome, setor e horários do Face ID. Sem CPF e sem dados do RH.</p></section>`;
  /* lado: empresas e atenção */
  const emp={}; p.forEach(x=>{ const e=x.e||'Colafix'; (emp[e]=emp[e]||{v:0,t:0}).v++; emp[e].t++; }); f.forEach(x=>{ const e=x.e||'Colafix'; (emp[e]=emp[e]||{v:0,t:0}).t++; });
  const EM=Object.keys(emp).sort((a,b)=>emp[b].t-emp[a].t), cor=e=>GXP_EMP_COR[e]||'#8AA3B0';
  const lado=`<aside class="gxp-side">${S._gxpRH&&typeof S._gxpRH.lado==='function'?S._gxpRH.lado(D,R):''}<section class="card"><h2 class="gxn-h2">Quem veio, por empresa</h2>
      <div class="gxp-stk" role="img" aria-label="${esc(EM.map(e=>e+' '+emp[e].v).join(', '))}">${EM.map(e=>`<i style="flex:${emp[e].v} 1 0;background:${cor(e)}"></i>`).join('')}</div>
      ${EM.map(e=>`<div class="gxp-er"><i style="background:${cor(e)}"></i><span>${esc(e)}</span><b>${emp[e].v} de ${emp[e].t}</b></div>`).join('')}</section>
    <section class="card"><h2 class="gxn-h2">Precisa de atenção</h2>
      <button class="gxp-at" data-act="gxp-f" data-v="semalm"><b class="t">${R.semAlm}</b><span>${R.hoje&&R.almAberto?'ainda não almoçaram · almoço até '+esc((D.alm||[])[1]||'14:30'):'não almoçaram'}</span></button>
      <button class="gxp-at" data-act="gxp-f" data-v="f"><b class="c">${R.semReg}</b><span>sem registro hoje, sem férias</span></button>
      <button class="gxp-at" data-act="gxp-f" data-v="atr"><b class="w">${R.atr}</b><span>chegaram depois das ${esc(D.lim||'08:00')}</span></button>${R.sumiu?`<button class="gxp-at" data-act="gxp-f" data-v="sumiu"><b class="c">${R.sumiu}</b><span>no cadastro, mas fora do Face ID há mais de 2 semanas · provavelmente saíram (o RH precisa dar baixa)</span></button>`:''}</section></aside>`;
  /* outros dias */
  const hist10=docs.filter(x=>x.exp||x.dia===h).sort((a,b)=>a.dia.localeCompare(b.dia)).slice(-10), rs=hist10.map(x=>({x,r:gxpResumo(x)}));
  const passado=rs.filter(z=>z.x.dia!==h), med=k=>passado.length?passado.reduce((a,z)=>a+z.r[k],0)/passado.length:null;
  const dias=`<section class="card gxp-dias"><div class="gxn-ch"><div><h2>Como foram os outros dias</h2><span class="gxn-mut">Últimos ${hist10.length} dias de expediente · toque num dia para ver</span></div>
      <div class="gxp-med">${med('vieram')!=null?`<div><span>Média de presença</span><b>${Math.round(med('vieram'))} de ${Math.round(med('esper'))}</b></div><div><span>Chegaram depois, por dia</span><b>${(med('atr')).toFixed(1).replace('.',',')}</b></div><div><span>Sem registro, por dia</span><b>${(med('semReg')).toFixed(1).replace('.',',')}</b></div>`:''}</div></div>
    <div class="gxp-dsc"><div class="gxp-dg" style="--n:${hist10.length}">${rs.map(({x,r})=>{ const ruim=r.semReg>=3||r.atr>=Math.max(7,r.esper*.12); const lab=x.dia===h?'hoje':['dom','seg','ter','qua','qui','sex','sáb'][new Date(x.dia+'T12:00').getDay()]+' '+dm(x.dia);
      return `<button class="gxp-dc ${ruim?'ruim':''}" data-act="gxp-dia" data-d="${x.dia}" aria-pressed="${x.dia===dSel}"><span class="gxn-mut">${lab}</span><b>${r.vieram}<em>/${r.esper}</em></b><i class="gxp-db"><i style="width:${r.esper?Math.round(r.vieram/r.esper*100):0}%"></i></i><small>${r.atr} depois · ${r.semReg} s/ reg.</small></button>`; }).join('')}</div></div></section>`;
  const fonte=gxpFonte(D), velho=gxpVelho(D);
  const hero=`<section class="gxp-hero"><div class="gxp-hl"><span class="gxn-eye">${S._gxpRH?'RH · PESSOAS NA EMPRESA':'VISÃO DO GESTOR'} · PELO FACE ID</span><h1>Quem está na empresa</h1><p>${esc(gxDiaTxt(dSel))}${fonte?' · '+esc(fonte):''}${dSel!==h&&gxpDoc(h)?` · <button class="gxp-lk" data-act="gxp-dia" data-d="${h}">voltar para hoje</button>`:''}</p>${velho?'<p class="gxp-velho">O Face ID não atualiza há mais de 2 horas. Confira o robô ou a importação no RH.</p>':''}</div>
     <div class="gxp-hs">${gxpRing(R.hoje?R.na:R.vieram,R.esper,140,String(R.hoje?R.na:R.vieram),R.hoje?'na empresa':'vieram')}
       <div><span>Vieram</span><b>${R.vieram} <em>de ${R.esper}</em></b></div><div><span>Almoçaram</span><b>${R.alm} <em>· ${R.semAlm} ${R.hoje&&R.almAberto?'ainda não':'não'}</em></b></div><div><span>Não vieram</span><b class="${R.nao?'nv':''}">${R.nao} <em>${R.fer?'· '+R.fer+' de férias':''}</em></b></div></div></section>`;
  return `${banner()}${hero}${ritmo}<div class="gxp-g">${lista}${lado}</div>${dias}${S.gxp.pes?gxpPesHtml(docs,S.gxp.pes,dSel):''}`; }
S.extViews.gxpres=vGxPres;
function gxpFiltra(){ const L=document.querySelector('.gxp-lista'); if(!L) return; const f=L.dataset.f||'todos', q=gxpNorm((document.getElementById('gxp-q')||{}).value||''), ws=q.split(/\s+/).filter(Boolean); let n=0;
  L.querySelectorAll('.gxp-row[data-b]').forEach(r=>{ const k=' '+r.dataset.k+' ', okF=f==='todos'||(f==='na'&&/ p /.test(k)&&(!/ saiu /.test(k)||!(S.gxp._hoje)))||(f==='semalm'&&/ semalm /.test(k))||(f==='atr'&&/ atr /.test(k))||(f==='f'&&/ f /.test(k))||(f==='sumiu'&&/ sumiu /.test(k)); const okQ=ws.every(w=>r.dataset.b.includes(w)); r.hidden=!(okF&&okQ); if(!r.hidden) n++; });
  const v=L.querySelector('.gxp-vz'); if(v) v.hidden=n>0; }
document.addEventListener('input',ev=>{ if(ev.target&&ev.target.id==='gxp-q'){ S.gxp.q=ev.target.value; gxpFiltra(); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="gxp-f"],[data-act="gxp-dia"],[data-act="gxp-pes"],[data-act="gxp-pesx"]'); if(!b) return;
  if(b.dataset.act==='gxp-pes'){ S.gxp.pes=b.dataset.n; render(); return; }
  if(b.dataset.act==='gxp-pesx'){ if(b.classList.contains('gxp-md')&&ev.target!==b) return; S.gxp.pes=null; render(); return; }
  if(b.dataset.act==='gxp-f'){ S.gxp.f=b.dataset.v; const L=document.querySelector('.gxp-lista'); if(L){ L.dataset.f=S.gxp.f; L.querySelectorAll('.gxp-tab').forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.v===S.gxp.f))); gxpFiltra(); if(!b.classList.contains('gxp-tab')) L.scrollIntoView({behavior:'smooth',block:'start'}); } return; }
  S.gxp.dia=b.dataset.d; render(); });
/* depois de desenhar: aplica filtro e busca guardados */
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ if(S.view==='gxpres'){ S.gxp._hoje=(S.gxp.dia||hojeStr())===hojeStr(); gxpFiltra(); } }catch(e){} return x; }; }

/* número em texto ("Não preenchido") com letra menor */
{ const _k=gxK; gxK=function(t,v){ const h=_k.apply(this,arguments); return /\d|—/.test(String(v))?h:h.replace('<b>','<b class="gx-kt">'); }; }
/* ---------- textos ---------- */
document.head.insertAdjacentHTML('beforeend',`<style id="gxn-css">
/* distribuição das telas do gestor (22/10): um espaço só entre blocos, grades que ocupam a largura */
.gxn-top{display:grid;gap:18px}.gxn-top>*{margin:0!important}
@media (min-width:1400px){.gxn-top{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)}.gxn-top .gxn-minis{grid-template-columns:repeat(2,minmax(0,1fr))}.gxn-top .gxn-tudo{flex-direction:column;justify-content:center;align-items:flex-start}}
body.gx-mod .content{gap:18px}
.gx-ks,.gx-g2,.gx-g3{margin-bottom:0!important;gap:18px!important}.gx-g2>.card,.gx-g3>.card,.gxn-g21>.card,.gxn-g3>.card{margin:0}
.gx-ls{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))!important}
@media (min-width:1100px){.gx-g2{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
.gx-hist{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(54px,1fr));gap:8px}.gx-hist>.gx-hd1{width:auto!important;min-width:0}
.gx-k b.gx-kt{font-size:19px;line-height:1.25;padding:3px 0}
/* navegação */
body.gx-solo .side .navlist{overflow-y:auto;min-height:0;flex:1 1 auto;margin-right:-6px;padding-right:6px}
body.gx-solo .side .spacer{flex:0 0 6px}
.gxn-nb{height:40px;font-size:14px}.gxn-nb span,.gxn-ns span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gxn-bd{font-style:normal;font-size:11px;font-weight:700;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#E8836F;color:#fff;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}
.gxn-sep{margin:18px 0 6px;padding:6px 10px 0;border-top:1px solid rgba(255,255,255,.12);font-size:10.5px;font-weight:600;letter-spacing:.14em;color:var(--nav-muted)}
.gxn-ns{height:34px;font-size:13px;color:var(--nav-muted)}.gxn-ns[aria-current="page"]{color:#fff}
body.gx-mod #view>nav.tabs{display:none}
.gxn-mg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.gxn-mb{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;font-size:14px;font-weight:600;text-align:left;cursor:pointer;min-height:84px}
.gxn-h2{margin:0 0 12px;font-size:16px;font-weight:600}
/* início */
.gxn-hero,.gxp-hero{background:linear-gradient(120deg,#123A4E 0%,#143F54 55%,#1B5168 100%);color:#fff;border-radius:20px;padding:26px 30px;display:flex;flex-wrap:wrap;gap:24px 32px;align-items:center;justify-content:space-between;margin-bottom:0;box-shadow:0 10px 30px rgba(20,63,84,.18)}
.gxn-hl{flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:6px}.gxn-eye{font-size:12px;letter-spacing:.1em;font-weight:600;color:#A9C4D0}
.gxn-hero h1,.gxp-hero h1{margin:0;font-size:34px;font-weight:700;color:#fff;letter-spacing:-.01em}.gxn-hero p,.gxp-hero p{margin:0;font-size:15px;color:#D3E2E9;max-width:640px;line-height:1.45}
.gxn-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.gxn-b1,.gxn-b2{display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:14px;font-weight:600;border-radius:12px;padding:0 16px;height:44px;cursor:pointer}
.gxn-b1{background:#fff;color:#143F54;border:0}.gxn-b2{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.28)}.gxn-b2:hover{background:rgba(255,255,255,.16)}
.gxn-hr{display:flex;flex-wrap:wrap;align-items:center;gap:22px 28px}
.gxn-ring{position:relative;flex:none}.gxn-ring>div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.gxn-ring b{font-size:34px;line-height:1;font-weight:700}.gxn-ring span{font-size:12px;color:#C8D9E1;margin-top:4px;max-width:90px}
.gxn-ring.lt b{font-size:28px;color:var(--ink)}.gxn-ring.lt span{color:var(--muted)}
.gxn-hs,.gxp-hs{display:grid;grid-template-columns:repeat(3,minmax(0,auto));gap:18px 28px}.gxn-hs>div,.gxp-hs>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.gxn-hs span,.gxp-hs>div>span{font-size:13px;color:#C8D9E1}.gxn-hs b,.gxp-hs>div>b{font-size:28px;font-weight:700;line-height:1.1}.gxn-hs b em,.gxp-hs b em{font-style:normal;font-size:15px;font-weight:500;color:#C8D9E1}.gxn-hs small{font-size:12.5px;color:#A9C4D0;max-width:210px}
.gxn-ch{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.gxn-ch h2{margin:0;font-size:17px;font-weight:600;display:flex;align-items:center;gap:8px}
.gxn-cnt{font-size:12px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--sunken);color:var(--ink)}.gxn-mut{font-size:13px;color:var(--muted)}
.gxn-al{margin-bottom:0}.gxn-als{display:flex;flex-direction:column;gap:8px}.gxn-ali{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:12px;background:var(--sunken)}
.gxn-ali>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.gxn-ali b{font-size:15px;font-weight:600}.gxn-ali>div>span{font-size:13px;color:var(--muted)}
.gxn-dot{width:12px;height:12px;border-radius:50%;flex:none;background:var(--warn);box-shadow:0 0 0 4px var(--warn-tint)}.gxn-ali.crit .gxn-dot{background:var(--crit);box-shadow:0 0 0 4px var(--crit-tint)}.gxn-ali.crit{background:var(--crit-tint)}
.gxn-tudo{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 18px;border-radius:14px;background:var(--ok-tint);color:var(--ok-ink);margin-bottom:0}.gxn-tudo span{color:var(--ok-ink);opacity:.85}
.gxn-minis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:0}
.gxn-mini{font:inherit;text-align:left;cursor:pointer;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:0;border-top:4px solid var(--line)}
.gxn-mini:hover{border-color:var(--teal)}.gxn-mini span{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.gxn-mini b{font-size:26px;font-weight:700;line-height:1.15}.gxn-mini b.gxn-txt{font-size:19px;padding:4px 0}.gxn-mini small{font-size:13px;color:var(--muted)}
.gxn-mini.ok{border-top-color:var(--ok)}.gxn-mini.warn{border-top-color:var(--warn)}.gxn-mini.crit{border-top-color:var(--crit)}.gxn-mini.warn b.gxn-txt{color:var(--warn-ink)}
.gxn-g21{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:18px;margin-bottom:0}.gxn-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-bottom:0}
.gxn-g21>.card,.gxn-g3>.card{margin:0}
.gxn-pes{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.gxn-pl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;flex:1;min-width:170px}.gxn-pl div{display:flex;flex-direction:column}.gxn-pl b{font-size:22px;font-weight:700}.gxn-pl span{font-size:12.5px;color:var(--muted)}
.gxn-pl .crit b{color:var(--crit-ink)}.gxn-pl .warn b{color:var(--warn-ink)}.gxn-pf{margin:10px 0 0}.gxn-vaz{margin:0;color:var(--muted);font-size:14px}
.gxn-mes{margin-bottom:0}.gxn-mesl{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:10px 24px;margin-bottom:10px}.gxn-big{font-size:30px;font-weight:700;margin-right:8px}.gxn-mesr{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:14px;color:var(--muted)}.gxn-mesr b{color:var(--ink)}
.gxn-track{position:relative;height:14px;border-radius:7px;background:var(--sunken)}.gxn-track>i{position:absolute;left:0;top:0;bottom:0;border-radius:7px;background:var(--teal)}.gxn-track>em{position:absolute;top:-5px;bottom:-5px;width:3px;margin-left:-1px;border-radius:2px;background:var(--ink)}
.gxn-leg{display:flex;gap:18px;margin-top:8px;font-size:13px;color:var(--muted)}.gxn-leg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}.gxn-leg i.a{background:var(--teal)}.gxn-leg i.b{background:var(--ink);width:3px}
@media (max-width:1100px){.gxn-g3{grid-template-columns:1fr 1fr}.gxn-minis{grid-template-columns:1fr 1fr}}
@media (max-width:860px){.gxn-g21,.gxn-g3{grid-template-columns:minmax(0,1fr)}.gxn-hero,.gxp-hero{padding:20px;border-radius:16px}.gxn-hero h1,.gxp-hero h1{font-size:26px}.gxn-hs,.gxp-hs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.gxn-minis{grid-template-columns:1fr 1fr}.gxn-mini b{font-size:22px}.gxn-acts>button{flex:1 1 auto;justify-content:center}}
/* quem está na empresa */
.gxp-hl{flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:6px}.gxp-hs{grid-template-columns:auto repeat(3,minmax(0,auto));align-items:center}
.gxp-hs b.nv{color:#F2B8AE}.gxp-lk{font:inherit;color:#fff;background:none;border:0;text-decoration:underline;cursor:pointer;padding:0}.gxp-velho{background:rgba(242,184,174,.18);border:1px solid rgba(242,184,174,.5);border-radius:10px;padding:8px 12px;color:#fff!important}
.gxp-rit{margin-bottom:0}.gxp-rb{position:relative;height:54px;margin-top:22px;background:var(--sunken);border-radius:10px}
.gxp-fx{position:absolute;top:8px;bottom:8px;border-radius:7px;display:flex;align-items:center;padding:0 10px;box-sizing:border-box;overflow:hidden;white-space:nowrap;font-size:12.5px;font-weight:600}
.gxp-fx.ch{background:#D3E7EC;color:#143F54}.gxp-fx.al{background:#D8EDE0;color:#245A3B}
.gxp-hrs{position:relative;height:18px;margin-top:6px}.gxp-hrs span{position:absolute;top:0;transform:translateX(-50%);font-size:12px;color:var(--muted)}
.gxp-now{position:absolute;top:-6px;bottom:-6px;width:2px;margin-left:-1px;background:#C7832A;border-radius:2px;pointer-events:none}.gxp-now.big{top:-4px;bottom:-4px;width:3px}.gxp-now b{position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;color:#8A5A17;white-space:nowrap;font-style:normal}
.gxp-g{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;margin-bottom:0}.gxp-lista{flex:999 1 640px;min-width:0;margin:0}.gxp-side{flex:1 1 260px;max-width:340px;display:flex;flex-direction:column;gap:14px}.gxp-side .card{margin:0}
.gxp-lh{align-items:center}.gxp-tabs{display:flex;flex-wrap:wrap;gap:6px}.gxp-tab{font:inherit;font-size:13.5px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:0 13px;min-height:38px;cursor:pointer}
.gxp-tab em{font-style:normal;font-weight:700;margin-left:4px;color:var(--muted)}.gxp-tab[aria-pressed="true"]{background:#143F54;border-color:#143F54;color:#fff}.gxp-tab[aria-pressed="true"] em{color:#C8D9E1}
.gxp-tools{display:flex;flex-wrap:wrap;gap:10px 20px;align-items:flex-end;justify-content:space-between;margin-bottom:10px}
.gxp-busca{display:flex;flex-direction:column;gap:4px;flex:1 1 260px;max-width:420px}.gxp-busca label{font-size:13px;font-weight:600;color:var(--muted)}.gxp-busca>div{position:relative;display:flex;align-items:center}.gxp-busca>div>span{position:absolute;left:12px;color:var(--muted);display:flex}
.gxp-busca input{font:inherit;font-size:15px;width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:10px 12px 10px 40px;min-height:44px;background:var(--surface);color:var(--ink)}
.gxp-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--muted);align-items:center}.gxp-leg>span{display:inline-flex;align-items:center;gap:5px}.gxp-leg i{display:inline-block}.gxp-leg i.sg{width:18px;height:10px;border-radius:3px;background:#1F6E80}.gxp-leg i.al{width:10px;height:10px;border-radius:50%;background:#3E9A64;box-shadow:0 0 0 2px #fff}.gxp-leg i.nw{width:3px;height:14px;background:#C7832A}
.gxp-sc{overflow-x:auto}.gxp-tab-in{min-width:820px}
.gxp-row{display:grid;grid-template-columns:200px minmax(0,1fr) 112px 92px;gap:14px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}.gxp-row[hidden]{display:none}
.gxp-hd{padding:0 0 6px;font-size:12px;font-weight:600;color:var(--muted)}.gxp-hd .gxp-hrs{margin:0}
.gxp-who{display:flex;flex-direction:column;gap:1px;min-width:0}.gxp-who b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gxp-who>span{font-size:12px;color:var(--muted)}.gxp-late{color:#8A5A17;font-weight:600}
.gxp-tr{position:relative;height:28px;border-radius:6px;background:var(--sunken)}.gxp-tr.aus{background:transparent;border:1px dashed #E2B7B0;display:flex;align-items:center;padding:0 10px;font-size:12px;font-weight:600;color:#8E3A32}
.gxp-sg{position:absolute;top:5px;bottom:5px;background:#1F6E80;border-radius:4px}.gxp-al{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#3E9A64;box-shadow:0 0 0 2px #fff}
.gxp-st{justify-self:start;padding:4px 10px;border-radius:999px;font-size:12.5px;font-weight:600;white-space:nowrap}.gxp-st.na{background:#E1F0EA;color:#245A3B}.gxp-st.saiu{background:var(--sunken);color:var(--muted)}.gxp-st.nao{background:#F6E3E0;color:#8E3A32}
.gxp-hist{display:flex;gap:5px;align-items:center}.gxp-d{display:inline-block;width:12px;height:12px;border-radius:50%;box-sizing:border-box}.gxp-d.o{background:#2E6B45}.gxp-d.a{background:#C7832A}.gxp-d.x{border:2px dashed #A8433A}.gxp-d.f{background:#B9C6CE}.gxp-d.v{border:1px solid var(--line)}
.gxp-vz{padding:24px 0;text-align:center;color:var(--muted);margin:0}.gxp-rod{margin:10px 0 0}
.gxp-stk{display:flex;height:18px;border-radius:6px;overflow:hidden;gap:2px;margin-bottom:10px}.gxp-er{display:flex;align-items:center;gap:8px;font-size:14px;padding:3px 0}.gxp-er i{width:12px;height:12px;border-radius:3px}.gxp-er span{flex:1}
.gxp-at{display:flex;gap:12px;align-items:baseline;font:inherit;text-align:left;background:none;border:0;padding:6px 0;cursor:pointer;color:var(--ink);width:100%}.gxp-at b{font-size:24px;min-width:36px}.gxp-at b.t{color:#1F6E80}.gxp-at b.c{color:#A8433A}.gxp-at b.w{color:#8A5A17}.gxp-at span{font-size:14px}.gxp-at:hover span{text-decoration:underline}
.gxp-dias{margin-bottom:0}.gxp-med{display:flex;flex-wrap:wrap;gap:22px}.gxp-med div{display:flex;flex-direction:column}.gxp-med span{font-size:12px;color:var(--muted)}.gxp-med b{font-size:18px}
.gxp-dsc{overflow-x:auto}.gxp-dg{display:grid;grid-template-columns:repeat(var(--n),minmax(96px,1fr));gap:8px;min-width:min-content}
.gxp-dc{font:inherit;color:var(--ink);text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:12px;background:var(--surface);border:1px solid var(--line)}
.gxp-dc b{font-size:22px;line-height:1}.gxp-dc b em{font-style:normal;font-size:13px;font-weight:500;color:var(--muted)}.gxp-dc small{font-size:12px;color:var(--muted)}.gxp-dc.ruim small{color:#8E3A32;font-weight:600}
.gxp-db{display:block;height:6px;border-radius:3px;background:var(--sunken);overflow:hidden}.gxp-db i{display:block;height:6px;background:#1F6E80}.gxp-dc.ruim .gxp-db i{background:#C7832A}
.gxp-dc[aria-pressed="true"]{border:2px solid #143F54;box-shadow:0 0 0 3px #D3E7EC;padding:11px}
@media (max-width:640px){.gxp-hs{grid-template-columns:auto 1fr}.gxp-side{max-width:none}.gxp-tab-in{min-width:0}.gxp-row{grid-template-columns:minmax(0,1fr) auto;gap:6px 10px}.gxp-row .gxp-tr,.gxp-hd{display:none!important}.gxp-row .gxp-st{justify-self:end}.gxp-row .gxp-hist{grid-column:1/-1}.gxp-who b{white-space:normal}.gxp-fx span{font-size:11px}.gxn-hr{width:100%;justify-content:space-between}.gxn-ring{width:120px!important;height:120px!important}.gxn-ring svg{width:120px;height:120px}}
</style>`);

/* RH revisado (22/10): a mesma tela "Quem está na empresa" dentro do RH (tela rhpres), com as ações do RH ao lado (o.lado(D,R)) */
try{ window.Painel.presenca={ render:o=>{ S._gxpRH=o||{}; try{ return vGxPres(); } finally{ S._gxpRH=null; } } }; }catch(e){}

/* detalhe da pessoa (pedido de 23/10): tocar no nome em "Quem está na empresa" */
function gxpPesHtml(docs,n,dSel){ const k=gxpNorm(n), ds=docs.slice().sort((a,b)=>b.dia.localeCompare(a.dia)), lin=[]; let info=null, vi=0, at=0, fa=0, fe=0, al=0;
  ds.forEach(D=>{ const lim=gxpM(D.lim)||480, p=(D.p||[]).find(x=>gxpNorm(x.n)===k), f=(D.f||[]).find(x=>gxpNorm(x.n)===k);
    if(p){ info=info||p; vi++; const late=gxpM(p.c)>lim; if(late) at++; if(p.a) al++; lin.push({d:D.dia,t:'veio',late,p}); }
    else if(f){ info=info||f; if(f.m==='Férias') fe++; else if(f.m!=='Sumiu'&&D.exp) fa++; lin.push({d:D.dia,t:f.m==='Férias'?'fer':f.m==='Sumiu'?'sumiu':'falta',f}); } });
  const sem=['dom','seg','ter','qua','qui','sex','sáb'], dl=d=>sem[new Date(d+'T12:00').getDay()]+' '+dm(d);
  const segs=p=>(p.g||[]).map(x=>{ const [a,b]=x.split('-'); return b?a+' – '+b:a+' – agora'; }).join(' · ');
  const rh=S._gxpRH&&typeof S._gxpRH.acoes==='function'?S._gxpRH.acoes(n):'';
  const sumiu=lin.length&&lin[0].t==='sumiu'?lin[0].f:null;
  return `<div class="gxp-md" data-act="gxp-pesx" role="dialog" aria-modal="true" aria-label="${esc(n)}"><div class="gxp-mdb">
    <div class="gxp-mdh"><div><b>${esc(n)}</b><span>${esc([info&&info.s,info&&info.e].filter(Boolean).join(' · ')||'—')}</span></div><button class="btn sec" data-act="gxp-pesx">Fechar</button></div>
    ${sumiu?`<div class="gxp-mdw">${sumiu.u?'Não passa no Face ID desde '+esc(dm(sumiu.u)):'Nunca passou no Face ID'}. Continua ativo no cadastro do RH: se saiu da empresa, o RH precisa registrar o desligamento.</div>`:''}
    <div class="gxp-mdk"><div><b>${vi}</b><span>dias que veio</span></div><div><b class="${at?'w':''}">${at}</b><span>chegou depois</span></div><div><b class="${fa?'c':''}">${fa}</b><span>faltou sem registro</span></div><div><b>${al}</b><span>almoçou</span></div>${fe?`<div><b>${fe}</b><span>de férias</span></div>`:''}</div>
    <div class="gxp-mdl">${lin.map(x=>`<div class="${x.d===dSel?'sel':''}"><span class="gxp-mdd">${dl(x.d)}</span>${x.t==='veio'?`<span>chegou <b class="${x.late?'gxp-late':''}">${esc(x.p.c)}</b>${x.p.a?' · almoço '+esc(x.p.a):' · sem almoço'}${x.p.sa?' · saiu '+esc(x.p.u):x.d===hojeStr()?' · na empresa':' · última passagem '+esc(x.p.u)}${segs(x.p)?`<small>na empresa ${esc(segs(x.p))}</small>`:''}</span>`:`<span class="${x.t==='falta'?'gxp-mdf':''}">${x.t==='fer'?'De férias':x.t==='sumiu'?'Fora do Face ID':'Não veio · sem registro no Face ID'}</span>`}</div>`).join('')||'<div class="gxn-mut">Sem registros nos últimos dias.</div>'}</div>
    ${rh?`<div class="gxp-mda">${rh}</div>`:''}
    <p class="gxn-mut" style="margin:10px 0 0;font-size:12.5px">Últimos ${ds.length} dias publicados pelo Face ID. Só horários, sem CPF.</p></div></div>`; }
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.gxp&&S.gxp.pes){ S.gxp.pes=null; render(); } });
try{ document.head.insertAdjacentHTML('beforeend',`<style id="gxp-pes-css">
.gxp-who .gxp-nm{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gxp-nm{border:0;background:none;padding:0;font-family:inherit;color:inherit;text-align:left;cursor:pointer}.gxp-nm:hover{text-decoration:underline}
.gxp-tr.aus.sumiu{border-color:var(--warn,#C7832A);background:var(--warn-tint,#FBEFD9)}.gxp-tr.aus.sumiu span{color:var(--warn-ink,#7A5410)}.gxp-st.sumiu{background:var(--warn-tint,#FBEFD9);color:var(--warn-ink,#7A5410)}
.gxp-md{position:fixed;inset:0;z-index:80;background:rgba(10,30,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px;overflow:auto}
.gxp-mdb{background:var(--surface,#fff);color:var(--ink,#143F54);border-radius:16px;width:min(620px,100%);padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.gxp-mdh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.gxp-mdh b{display:block;font-size:21px;font-weight:600}.gxp-mdh span{font-size:13.5px;color:var(--muted)}
.gxp-mdw{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:var(--warn-tint,#FBEFD9);color:var(--warn-ink,#7A5410);font-size:13.5px}
.gxp-mdk{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin:14px 0}.gxp-mdk div{background:var(--sunken,#F3F6F8);border-radius:10px;padding:10px 12px}.gxp-mdk b{display:block;font-size:22px;font-weight:600}.gxp-mdk b.w{color:var(--warn-ink)}.gxp-mdk b.c{color:var(--crit-ink)}.gxp-mdk span{font-size:12.5px;color:var(--muted)}
.gxp-mdl>div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:14px}.gxp-mdl>div.sel{background:var(--teal-wash)}.gxp-mdl small{display:block;color:var(--muted);font-size:12.5px}
.gxp-mdd{color:var(--muted);font-size:13px}.gxp-mdf{color:var(--crit-ink)}.gxp-mda{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
</style>`); }catch(e){}
