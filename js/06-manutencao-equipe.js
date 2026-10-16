/* Painel Colafix · 06-manutencao-equipe.js — manutenção (chamados, OS) e equipe e cargos.
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";


/* ===== TELA DA LINHA: produção registra parada e volta em dois toques (computador fixo) ===== */
S.ltv={abre:null,trocar:null,salvando:false};
VIEWS.linhatv={nome:'Tela da linha',ic:'pausa',mob:'Linha'}; CRUMB.linhatv='Tela da linha';
{ const m=MODS.find(x=>x.id==='producao'); if(m&&!m.views.includes('linhatv')){ const i=m.views.indexOf('paradas'); m.views.splice(i<0?m.views.length:i,0,'linhatv'); } }
{ const _vo=viewOk; viewOk=function(v){ if(v==='linhatv'){ if(S.acs&&S.acs.dono) return true; const p=acsP(); return !!p&&(p.tudo||p.mods.includes('paradas')||p.mods.includes('producao')); } return _vo(v); }; }
function ltvSoLinha(){ const p=acsP(); return !!p&&!p.tudo&&!(S.acs&&S.acs.dono)&&mViews(MODS.find(m=>m.id==='producao')).every(v=>v==='linhatv'||v==='paradas')&&modsVis().length<=1; }
function ltvMin(ms){ const m=Math.max(0,Math.round(ms/6e4)); return m<1?'menos de 1 min':m<60?m+' min':Math.floor(m/60)+'h'+pad(m%60); }
function vLinhaTv(){ const L=linhasParada(), at=S.paradas.filter(p=>!p.fim), h0=ini0(new Date()).getTime(), A=S.ltv;
  const hoje=S.paradas.filter(p=>!p.anulada&&(new Date(p.inicio).getTime()>=h0||!p.fim));
  const minL=l=>hoje.filter(p=>p.linha===l).reduce((a,p)=>a+((p.fim?new Date(p.fim):new Date())-Math.max(h0,new Date(p.inicio).getTime())),0);
  const mot=(acao,l,id)=>`<div class="ltv-mots">${(S.cfg.motivos||[]).map(m=>`<button class="ltv-mot" data-act="${acao}" data-l="${esc(l)}" data-id="${id||''}" data-v="${esc(m)}">${esc(m)}</button>`).join('')}<button class="ltv-mot ad" data-act="${acao}" data-l="${esc(l)}" data-id="${id||''}" data-v="A definir">Ainda não sei</button></div><button class="ltv-canc" data-act="ltv-x">Cancelar</button>`;
  const card=l=>{ const a=at.find(p=>p.linha===l), r=ordemRodando(l), tm=minL(l), n=hoje.filter(p=>p.linha===l).length;
    if(a){ const novo=Date.now()-new Date(a.inicio).getTime()<3*60000;
      return `<article class="ltv-c par"><header><b>${esc(l)}</b><span class="ltv-st"><i></i>PARADA</span></header>
       <div class="ltv-big num" data-ltv-desde="${esc(a.inicio)}">${ltvMin(Date.now()-new Date(a.inicio))}</div>
       <div class="ltv-mo">${a.motivo==='A definir'?'<em>motivo a definir</em>':esc(a.motivo)} · desde ${hora(a.inicio)}</div>
       ${A.trocar===a._id?mot('ltv-motivo',l,a._id):`<button class="ltv-b volta" data-act="ltv-volta" data-id="${a._id}">${ic('play',30,2.4)}VOLTOU</button>
       <div class="ltv-lk"><button class="lnk" data-act="ltv-trocar" data-id="${a._id}">${a.motivo==='A definir'?'Escolher o motivo':'Trocar o motivo'}</button>${novo?`<button class="lnk" data-act="ltv-engano" data-id="${a._id}">Foi engano</button>`:''}</div>`}</article>`; }
    return `<article class="ltv-c ok ${A.abre===l?'esc':''}"><header><b>${esc(l)}</b><span class="ltv-st"><i></i>PRODUZINDO</span></header>
      ${r?`<div class="ltv-or">Ordem ${esc(r.num)} · ${esc(codigoDe(r))}<small>${esc((r.produto||'').slice(0,42))}</small></div>`:'<div class="ltv-or vz">Sem ordem em produção</div>'}
      ${A.abre===l?`<div class="ltv-q">Por que parou?</div>${mot('ltv-parou',l)}`:`<button class="ltv-b parou" data-act="ltv-abre" data-l="${esc(l)}">${ic('pausa',30,2.4)}PAROU</button>
      <div class="ltv-hj">${n?`Hoje: ${n} parada${n>1?'s':''} · ${ltvMin(tm)}`:'Nenhuma parada hoje'}</div>`}</article>`; };
  const nP=at.length, kiosk=document.body.classList.contains('ltv-k');
  return `<div class="ltv ${kiosk?'k':''}"><div class="ltv-h"><div><div class="eyebrow">PRODUÇÃO · TELA DA LINHA</div><h1>${nP?`${nP} linha${nP>1?'s':''} parada${nP>1?'s':''}`:'Todas as linhas produzindo'}</h1><div class="sub">Toque em <b>PAROU</b> e no motivo. Quando a linha voltar, toque em <b>VOLTOU</b>. O horário é marcado sozinho.</div></div>
    <div class="ltv-hr"><span class="ltv-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</span>${ltvSoLinha()?'':`<button class="btn sec" data-act="ltv-k" style="height:42px">${kiosk?'Sair da tela cheia':'Tela cheia'}</button>`}</div></div>
   <div class="ltv-g" style="--n:${Math.min(4,L.length)}">${L.map(card).join('')}</div></div>`; }
setInterval(()=>{ if(S.view!=='linhatv') return; document.querySelectorAll('[data-ltv-desde]').forEach(e=>{ e.textContent=ltvMin(Date.now()-new Date(e.dataset.ltvDesde)); }); },15000);
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="ltv-"]'); if(!b) return; const A=S.ltv, a=b.dataset.act;
  if(a==='ltv-k'){ const on=!document.body.classList.contains('ltv-k'); document.body.classList.toggle('ltv-k',on); try{ if(on&&document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); else if(!on&&document.fullscreenElement) document.exitFullscreen(); }catch(e){} render(); return; }
  if(a==='ltv-abre'){ A.abre=b.dataset.l; A.trocar=null; render(); return; }
  if(a==='ltv-x'){ A.abre=null; A.trocar=null; render(); return; }
  if(a==='ltv-trocar'){ A.trocar=b.dataset.id; A.abre=null; render(); return; }
  if(A.salvando) return;
  if(a==='ltv-parou'){ const l=b.dataset.l; if(S.paradas.some(p=>p.linha===l&&!p.fim)){ A.abre=null; toast(l+' já está parada.'); render(); return; }
    const doc={linha:l,motivo:b.dataset.v,inicio:new Date().toISOString(),fim:null,por:S.uid||null,origem:'tela-linha'}; const r=ordemRodando(l); if(r){ doc.ordem=String(r.num); doc.ordemId=r._id; }
    A.salvando=true; const ok=await salvar('paradas',doc); A.salvando=false; if(ok){ A.abre=null; toast(l+' parada às '+hora(doc.inicio)+' · '+doc.motivo); render(); } return; }
  const p=S.paradas.find(x=>x._id===b.dataset.id); if(!p||!S.db) return;
  try{ A.salvando=true;
    if(a==='ltv-volta'){ const em=new Date().toISOString(); await S.db.doc('paradas/'+p._id).update({fim:em,porFim:S.uid||null}); toast(p.linha+' voltou às '+hora(em)+' · parada de '+dur(new Date(em)-new Date(p.inicio))); }
    else if(a==='ltv-motivo'){ const ed=(p.edits||[]).concat([{em:new Date().toISOString(),por:S.uid||null,antes:{motivo:p.motivo}}]).slice(-20); await S.db.doc('paradas/'+p._id).update({motivo:b.dataset.v,edits:ed}); A.trocar=null; toast(p.linha+' · motivo: '+b.dataset.v); }
    else if(a==='ltv-engano'){ const ed=(p.edits||[]).concat([{em:new Date().toISOString(),por:S.uid||null,antes:{fim:null},nota:'registrada por engano'}]).slice(-20); await S.db.doc('paradas/'+p._id).update({fim:p.inicio,anulada:true,porFim:S.uid||null,edits:ed}); toast('Parada desfeita. Fica no histórico como engano.'); }
  }catch(e){ erro(e); } finally{ A.salvando=false; } render(); });
{ const _rl=render; render=function(){ if(S.view!=='linhatv'&&S.view!=='manmon') document.body.classList.remove('ltv-k'); else if(ltvSoLinha()) document.body.classList.add('ltv-k'); return _rl.apply(this,arguments); }; }

/* ===== CAPACIDADE ÚNICA: real = o que a linha mostrou que faz em dias de linha cheia ===== */
function capRealCalc(LS,h){ h=h||hojeStr(); const CAPR={}, CAPRi={}; const an=anuladas(), OM={}; S.ordens.forEach(o=>OM[o._id]=o);
  const ens=o=>o&&/\bENSACADO\b/i.test(String(o.produto||''));
  const por={}; S.entregas.forEach(e=>{ if(e.anula||an.has(e._id)||!e.em) return; const d=hojeStr(new Date(e.em)); if(d>=h||!anlUtil(d)) return; const o=OM[e.ordem]; const l=e.linha||(o&&o.linha); if(!LS.includes(l)||ens(o)) return; const k=l+'|'+d; por[k]=(por[k]||0)+(+e.qtd||0); });
  /* programado por linha e dia (ordens): separa dia de linha cheia de dia com pouca programação */
  const prog={}; const lim=addDias(h,-60); S.ordens.forEach(o=>{ if(!o.linha||!LS.includes(o.linha)||['cancelada','excluida','vinculada','ignorada'].includes(o.status)||!o.data||ens(o)) return; const d0=o.data, d1=o.ate&&o.ate>d0?o.ate:d0; if(d1<lim||d0>=h) return;
    const ds=calDiasUteis(d0,d1,false).filter(d=>anlUtil(d)); const dd=ds.length?ds:[d0]; const q=(+o.total||0)/dd.length; dd.forEach(d=>{ const k=o.linha+'|'+d; prog[k]=(prog[k]||0)+q; }); });
  LS.forEach(l=>{ const cn=capDe(l); const ks=Object.keys(por).filter(k=>k.startsWith(l+'|')&&por[k]>0).sort().slice(-20);
    const okK=ks.filter(k=>!cn||por[k]<=cn*1.5); /* dia com mais de 150% da nominal = lançamento acumulado, fica fora */
    const cheio=cn?okK.filter(k=>Math.max(prog[k]||0,por[k])>=cn*0.5):okK; /* dia de linha cheia: programado (ou produzido) ≥ metade da nominal */
    const media=okK.length?Math.round(okK.reduce((a,k)=>a+por[k],0)/okK.length):0;
    if(cheio.length>=3){ const top=cheio.map(k=>por[k]).sort((a,b)=>b-a).slice(0,5); CAPR[l]=Math.round(top.reduce((a,v)=>a+v,0)/top.length); CAPRi[l]={dias:cheio.length,usados:top.length,media,fora:ks.length-okK.length,leves:okK.length-cheio.length}; }
    else if(okK.length>=3) CAPRi[l]={dias:okK.length,usados:0,media,fora:ks.length-okK.length,leves:okK.length-cheio.length,demanda:true}; });
  return {CAPR,CAPRi}; }
function capLinha(D,l){ return (D&&D.CAPR&&D.CAPR[l])||capDe(l); }
/* alertas: capacidade real e linhas sem capacidade */
{ const _ra=ritAlertas; ritAlertas=function(D){ const A=_ra(D); const sem=ritAtivas(D).filter(l=>!capDe(l)&&ritStats(D,{l}).T>0);
    if(sem.length) A.push({c:'warn',t:`Sem capacidade cadastrada: ${sem.map(esc).join(', ')}.`,s:'Cadastre em Ajustes → Capacidade por dia para o painel dizer se o mês cabe nessas linhas.'}); return A; }; }

/* ===== NAVEGAÇÃO: Análise PCP em grupos, uma só entrada de TV, avisos que dá para ocultar no dia ===== */
const NAV_GRP={analise:[
  {k:'hoje',n:'Hoje',ic:'grid',v:['anlres','anlnec']},
  {k:'mes',n:'Mês',ic:'grafico',v:['anlrit','anlmes']},
  {k:'est',n:'Estoque',ic:'caixa',v:['anlest','anlproj','anlace']},
  {k:'cap',n:'Capacidade',ic:'fabrica',v:['anllin']},
  {k:'sis',n:'Sistema',ic:'baixar',v:['anlapt','anlbase']}]};
S.navUlt=S.navUlt||{};
function navGrupos(m){ const G=NAV_GRP[m.id]; if(!G) return null; const vs=mViews(m); const gs=G.map(g=>Object.assign({},g,{v:g.v.filter(v=>vs.includes(v))})).filter(g=>g.v.length);
  const sobra=vs.filter(v=>!gs.some(g=>g.v.includes(v))); if(sobra.length) gs.push({k:'outros',n:'Outros',ic:'lista',v:sobra}); return gs.length>1?gs:null; }
function navGrpDe(gs,v){ return gs.find(g=>g.v.includes(v)); }
{ const _ab=abas; abas=function(){ const m=modAtual(); const gs=modDe(S.view)===m.id?navGrupos(m):null; if(!gs) return _ab();
  const g0=navGrpDe(gs,S.view); if(g0) S.navUlt[g0.k]=S.view;
  const top=`<nav class="tabs" aria-label="${esc(m.nome)}">${gs.map(g=>{ const alvo=S.navUlt[g.k]&&g.v.includes(S.navUlt[g.k])?S.navUlt[g.k]:g.v[0]; return `<button class="tab" data-go="${alvo}" ${g0&&g0.k===g.k?'aria-current="page"':''}>${ic(g.ic,18)}${g.n}</button>`; }).join('')}</nav>`;
  const sub=g0&&g0.v.length>1?`<div class="navsub" role="tablist" aria-label="${esc(g0.n)}">${g0.v.map(v=>`<button data-go="${v}" role="tab" aria-selected="${S.view===v}">${ic(VIEWS[v].ic,15)}${esc(VIEWS[v].nome)}</button>`).join('')}</div>`:'';
  return top+sub; }; }
{ const _rn=renderNav; renderNav=function(){ _rn.apply(this,arguments); const m=modAtual(); const gs=navGrupos(m); if(!gs) return; const bn=$('#bottomnav'); if(!bn) return; const g0=navGrpDe(gs,S.view);
  bn.style.gridTemplateColumns=`repeat(${gs.length},minmax(0,1fr))`;
  bn.innerHTML=gs.map(g=>{ const alvo=S.navUlt[g.k]&&g.v.includes(S.navUlt[g.k])?S.navUlt[g.k]:g.v[0]; return `<button data-go="${alvo}" ${g0&&g0.k===g.k?'aria-current="page"':''}>${ic(g.ic,22)}${g.n}</button>`; }).join(''); }; }
/* botão MODO TV do topo: abre as Telas de TV (escolher qual tela) */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('#tvbtn'); if(!b) return; if(document.body.classList.contains('tv')) return; if(!viewOk('tvapres')) return; ev.preventDefault(); ev.stopPropagation(); go('tvapres'); },true);
/* avisos do sino: ocultar por hoje (volta se o número aumentar ou no dia seguinte) */
function navOcultos(){ try{ const o=JSON.parse(localStorage.getItem('tpOcultos')||'{}'); const h=hojeStr(); for(const k in o) if(o[k].d!==h) delete o[k]; return o; }catch(e){ return {}; } }
function navOcultosGrava(o){ try{ localStorage.setItem('tpOcultos',JSON.stringify(o)); }catch(e){} }
const NAV_EXTRA=[];
{ const _ta=tpAvisos; tpAvisos=function(todos){ const xs=_ta().concat(...NAV_EXTRA.map(f=>{ try{ return f(); }catch(e){ return []; } })); if(todos) return xs; const o=navOcultos(); return xs.filter(x=>x.acao==='acessos'||!o[x.acao]||(x.n!==''&&x.n>o[x.acao].n)); }; }
{ const _tp=tpTogglePop; tpTogglePop=function(k,abrir){ _tp(k,abrir); if(k!=='avisos') return; const p=$('#tp-pop'); if(!p||p.hidden) return;
  p.querySelectorAll('.tp-it[data-tp="aviso"]').forEach(b=>{ if(b.dataset.v==='acessos') return; const s=document.createElement('span'); s.className='tp-oc'; s.dataset.oc=b.dataset.v; s.setAttribute('role','button'); s.title='Ocultar este aviso até amanhã'; s.textContent='ocultar hoje'; b.appendChild(s); });
  const ocs=Object.keys(navOcultos()).length, xs=tpAvisos(); if(xs.length>1){ const r=document.createElement('div'); r.className='tp-ocb'; r.innerHTML=`<button class="lnk" data-ocall="1">Ocultar todos até amanhã</button>`; p.appendChild(r); }
  if(ocs){ const r=document.createElement('div'); r.className='tp-ocb'; r.innerHTML=`<button class="lnk" data-ocver="1">Mostrar ${ocs} oculto${ocs>1?'s':''}</button>`; p.appendChild(r); } }; }
document.addEventListener('click',ev=>{ const t=ev.target.closest&&ev.target.closest('.tp-oc,[data-ocall],[data-ocver]'); if(!t) return; ev.preventDefault(); ev.stopPropagation(); const o=navOcultos(), h=hojeStr();
  if(t.dataset.ocver){ navOcultosGrava({}); }
  else{ const xs=tpAvisos(true); const alvo=t.dataset.ocall?tpAvisos().map(x=>x.acao):[t.dataset.oc]; alvo.forEach(a=>{ if(a==='acessos') return; const x=xs.find(z=>z.acao===a); o[a]={d:h,n:x&&x.n!==''?x.n:0}; }); navOcultosGrava(o); }
  try{ tpAtualiza(); }catch(e){} tpTogglePop('avisos',true); },true);

/* ===== CELULAR E LISTAS LONGAS ===== */
/* mostrar mais: listas muito longas começam com 60 linhas */
const MAIS_CFG={anlest:'#view tbody',anlmes:'#view tbody',anlnec:'#view .anl-r',alxcont:'#view .alx-sel'};
S.mais={v:null,n:{}};
function maisAplica(){ const v=S.view, sel=MAIS_CFG[v]; if(S.mais.v!==v){ S.mais.v=v; S.mais.n={}; } if(!sel) return;
  const grupos=new Map(); document.querySelectorAll(sel).forEach(el=>{ const pai=sel.endsWith('tbody')?el:el.parentElement; const xs=sel.endsWith('tbody')?[...el.children]:null; if(xs){ grupos.set(pai,xs); } else { if(!grupos.has(pai)) grupos.set(pai,[]); grupos.get(pai).push(el); } });
  let gi=0; grupos.forEach((xs,pai)=>{ const k=gi++; if(xs.length<=80) return; const lim=S.mais.n[k]||60; xs.forEach((e,i)=>{ e.hidden=i>=lim; });
    const resto=xs.length-lim; if(resto<=0) return; const ref=pai.tagName==='TBODY'?(pai.closest('.dbw,.anl-tw,div[style*="overflow"]')||pai.closest('table')):xs[xs.length-1];
    const b=document.createElement('div'); b.className='mais-b'; b.innerHTML=`<button class="btn sec" data-mais="${k}" data-inc="${Math.min(resto,100)}">Mostrar mais ${Math.min(resto,100)} <small>· faltam ${resto}</small></button>${resto>100?`<button class="lnk" data-mais="${k}" data-inc="${resto}">mostrar todos</button>`:''}`;
    ref.insertAdjacentElement('afterend',b); }); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-mais]'); if(!b) return; const k=+b.dataset.mais; S.mais.n[k]=(S.mais.n[k]||60)+(+b.dataset.inc); document.querySelectorAll('.mais-b').forEach(x=>x.remove()); maisAplica(); });
{ const _rm=render; render=function(){ const x=_rm.apply(this,arguments); try{ maisAplica(); }catch(e){ console.warn('mais',e); } return x; }; }
/* inventário: contagem cíclica (os itens há mais tempo sem contar) */
function alxCicloN(n){ return Math.max(10,Math.min(30,Math.round(n/20))); }
function alxCiclo(){ const xs=alxListaSel(), ult=alxUltimas(); return xs.slice().sort((a,b)=>String((ult[a.codigo]||{}).em||'').localeCompare(String((ult[b.codigo]||{}).em||''))).slice(0,alxCicloN(xs.length)); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="alx-ciclo"]'); if(!b) return; const X=S.alx; X.sel=[...new Set([...X.sel,...alxCiclo().map(i=>i.codigo)])]; render(); toast('Marcados os itens há mais tempo sem contagem. Contando assim todo dia, a lista inteira é contada em cerca de um mês.'); });

/* ===== MEU DIA, PRODUÇÃO, ANÁLISE E SILOS ===== */
/* capacidade real em cache curto (calendário chama por linha) */
const _capM={t:0,m:{}}; function capRealMemo(l){ if(Date.now()-_capM.t>15000){ try{ _capM.m=capRealCalc(linhasOrd()).CAPR; }catch(e){ _capM.m={}; } _capM.t=Date.now(); } return _capM.m[l]||0; }
/* fator histórico da previsão comercial (faturado ÷ previsto nos meses fechados) */
function ritFatorHist(){ const P=S.anl.base.prev||{}, V=S.anl.base.vendas||{}, cur=hojeStr().slice(0,7); const cps=Object.keys(P.mes||{}).filter(c=>c<cur).sort().slice(-6); if(!cps.length) return null;
  let tp=0,tf=0; cps.forEach(cp=>{ const pm=P.mes[cp]||{}; for(const c in pm){ tp+=+pm[c]||0; tf+=+((((V.mensal||{})[c]||{})[cp]||[0,0])[1])||0; } }); return tp?{f:tf/tp,n:cps.length}:null; }
/* itens em falta de estoque (Necessidades) até amanhã */
function anlFaltaMap(){ try{ const R=anlDados(); if(!R) return {}; const n3=R.dias[Math.min(1,R.dias.length-1)]; const m={}; R.itens.forEach(x=>{ if(x.st==='falta'&&x.prazo<=n3) m[x.c]=x; }); return m; }catch(e){ return {}; } }
/* ---- avisos novos no sino: base do Focco velha ---- */
NAV_EXTRA.push(()=>{ const out=[]; try{ if(!viewOk('anlbase')) return out; const h=hojeStr(), B=S.anl.base||{}, V=B.vendas||{}, a=(B.itens||{}).atual||{};
  const dd=s=>s?Math.floor((new Date(h+'T12:00:00')-new Date(String(s).slice(0,10)+'T12:00:00'))/864e5):999;
  if(V.ate&&dd(V.ate)>7) out.push({n:'',t:'Vendas do Focco até '+dm(V.ate),s:'Importe o Extrato da semana: o faturado e as médias de venda dependem dele',acao:'anlbase',c:'warn'});
  if(a.PARAMETROS&&dd(a.PARAMETROS)>30) out.push({n:'',t:'Parâmetros de '+dm(String(a.PARAMETROS).slice(0,10)),s:'Estoque de segurança e lotes com mais de 30 dias: importe os Parâmetros de novo',acao:'anlbase',c:'warn'}); }catch(e){} return out; });
/* ---- Meu dia: 3 coisas para hoje ---- */
function md3Coisas(){ const xs=[], h=hojeStr();
  try{ S.paradas.filter(p=>!p.fim).forEach(p=>xs.push({p:100,c:'crit',t:`${esc(p.linha)} parada há ${ltvMin(Date.now()-new Date(p.inicio))}`,s:p.motivo==='A definir'?'Motivo ainda não informado':esc(p.motivo),go:'linhatv',b:'Ver as linhas'})); }catch(e){}
  try{ const ab=ordAbertas(); const atr=ab.filter(o=>ordAtras(o,h)); if(atr.length) xs.push({p:80+Math.min(9,atr.length),c:'crit',t:`${atr.length} ordem${atr.length>1?'s':''} atrasada${atr.length>1?'s':''}`,s:'Programadas para dias que já passaram: replanejar ou encerrar',go:'programacao',b:'Replanejar'}); }catch(e){}
  try{ const fm=anlFaltaMap(), ks=Object.keys(fm); if(ks.length) xs.push({p:75,c:'crit',t:`${ks.length} ${ks.length>1?'itens':'item'} em falta até amanhã`,s:ks.slice(0,4).map(esc).join(', ')+(ks.length>4?'…':''),go:'anlres',b:'Ver o que fazer'}); }catch(e){}
  try{ const D=ritDados(h.slice(0,7),'painel'); if(D){ const rs=ritAtivas(D).map(l=>({l,k:ritStats(D,{l})})).filter(o=>o.k.T>0&&ritSt(o.k).c==='crit').sort((a,b)=>a.k.dev-b.k.dev);
    if(rs.length){ const o=rs[0], cp=o.k.cdR||o.k.cd; xs.push({p:70,c:'warn',t:`${rs.length} linha${rs.length>1?'s':''} em risco de não fechar o mês`,s:`${esc(o.l)}: ${anlN(-o.k.dev)} atrás da meta${cp?` · precisa de ${anlN(o.k.needEq)}/dia e faz ${anlN(cp)}`:''}`,go:'anlrit',b:'Ver o mês'}); } } }catch(e){}
  try{ tpAvisos().forEach(a=>{ if(['atrasadas','paradas','acessos'].includes(a.acao)) return; xs.push({p:a.c==='crit'?60:40,c:a.c,t:(a.n!==''?a.n+' · ':'')+esc(a.t),s:esc(a.s),aviso:a.acao,b:'Abrir'}); }); }catch(e){}
  xs.sort((a,b)=>b.p-a.p); return xs; }
function md3Html(){ const xs=md3Coisas(); if(!xs.length) return `<section class="card md3 ok"><div class="label">O QUE IMPORTA HOJE</div><div class="md3-ok">${ic('check',20,2.4)} Nada urgente. Linhas produzindo, ordens em dia e sem falta prevista até amanhã.</div></section>`;
  const top=xs.slice(0,3), resto=xs.length-3;
  return `<section class="card md3"><div class="md3-h"><div class="label">AS ${top.length===1?'COISA':top.length+' COISAS'} QUE MAIS IMPORTAM HOJE</div>${resto>0?`<button class="lnk" id="tp-sino-md" data-md3="sino">+${resto} no sino</button>`:''}</div>
   <div class="md3-g" style="--n:${top.length}">${top.map((x,i)=>`<div class="md3-i ${x.c}"><span class="md3-n">${i+1}</span><div><b>${x.t}</b><small>${x.s}</small>${x.go?`<button class="lnk" data-go="${x.go}">${x.b} ›</button>`:`<button class="lnk" data-md3="aviso" data-v="${esc(x.aviso)}">${x.b} ›</button>`}</div></div>`).join('')}</div></section>`; }
{ const _md=vMeuDia; vMeuDia=function(op){ const s=_md(op); if(op&&op.cargo) return s; const i=s.indexOf('<div class="rotina'); if(i<0) return s; let c=''; try{ c=md3Html(); }catch(e){ console.warn('md3',e); } return s.slice(0,i)+c+s.slice(i); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-md3]'); if(!b) return; if(b.dataset.md3==='sino'){ tpTogglePop('avisos',true); return; } const x=document.createElement('button'); x.className='tp-it'; x.dataset.tp='aviso'; x.dataset.v=b.dataset.v; x.hidden=true; document.body.appendChild(x); x.click(); x.remove(); });
/* ---- Previsto × Realizado: falta de estoque, meta pelo histórico e rascunho do mês ---- */
{ const _ra=ritAlertas; ritAlertas=function(D){ const A=_ra(D); try{ if(D.cp===hojeStr().slice(0,7)){ const fm=anlFaltaMap(); const ks=Object.keys(fm).filter(c=>D.IC[c]&&ritStats(D,{c}).sal>0); if(ks.length) A.unshift({c:'crit',t:`${ks.length} ${ks.length>1?'itens da meta estão':'item da meta está'} em falta de estoque até amanhã: ${ks.slice(0,5).map(esc).join(', ')}${ks.length>5?'…':''}.`,s:'Priorize esses na programação (veja Análise PCP → Necessidades).'}); } }catch(e){} return A; }; }
function ritRascunho(D){ const h=hojeStr(); const ls=ritAtivas(D).map(l=>{ const k=ritStats(D,{l}), cp=k.cdR||k.cd; return {l,k,cp}; }).filter(o=>o.k.T>0&&o.k.sal>0); if(!ls.length||!ls[0].k.rem) return '';
  const ini=D.cut?addDias(D.cut,1):h; const uteis=n=>{ let d=ini, c=0; for(let i=0;i<200;i++){ if(anlUtil(d)&&!(D.cut&&d<=D.cut)){ c++; if(c>=n) return d; } d=addDias(d,1); } return d; };
  const fimM=D.dias[D.dias.length-1]; let nsab0=0; for(let d=ini;d<=fimM;d=addDias(d,1)) if(new Date(d+'T12:00:00').getDay()===6) nsab0++;
  const rows=ls.map(o=>{ if(!o.cp) return `<div class="rr-r"><b>${esc(o.l)}</b><span class="t-mut">sem capacidade cadastrada</span><span></span><span></span></div>`;
    const dn=o.k.sal*o.k.fm/o.cp, n=Math.ceil(dn-1e-9), fim=uteis(Math.max(1,n)), ok=fim<=fimM, a=n-o.k.rem;
    return `<div class="rr-r ${ok?'ok':'crit'}"><b>${esc(o.l)}</b><span class="num">${anlN(o.k.sal)} <small>de saldo</small></span><span class="num">${dn.toLocaleString('pt-BR',{maximumFractionDigits:1})} <small>dias de ${anlN(o.cp)}/dia</small></span><span class="rr-v">${ok?`termina ${dm(fim)}`:`faltam ${a} dia${a>1?'s':''}`+(nsab0?(a<=nsab0?` <small>· fecha com ${a} sábado${a>1?'s':''}</small>`:` <small>· nem com os ${nsab0} sábados</small>`):'')}</span></div>`; });
  let nsab=0; for(let d=ini;d<=fimM;d=addDias(d,1)) if(new Date(d+'T12:00:00').getDay()===6) nsab++;
  const fal=ls.filter(o=>o.cp).map(o=>Math.ceil(o.k.sal*o.k.fm/o.cp-1e-9)-o.k.rem).filter(x=>x>0);
  return `<section class="card rr"><div class="rr-h"><div><h2>Rascunho do mês</h2><div class="sub" style="margin:2px 0 0;font-size:12.5px">Se o saldo de cada linha for programado no que ela tem feito por dia (capacidade real; sem histórico, a nominal), a partir do próximo dia útil. Nada é gravado no calendário.</div></div>
    <span class="pill ${fal.length?'crit':'ok'}">${fal.length?`${fal.length} linha${fal.length>1?'s':''} não fecha${fal.length>1?'m':''} no mês`:'Todas fecham no mês'}</span></div>
   <div class="rr-t">${rows.join('')}</div><div class="sub" style="font-size:12px;margin:8px 0 0">${D.n} dias úteis no mês · faltam ${ls[0].k.rem}${nsab?` · restam ${nsab} sábado${nsab>1?'s':''} no mês (cada sábado contado como um dia de produção)`:''}.</div></section>`; }
{ const _vr=vRit; vRit=function(){ let s=_vr(); try{ const A=S.rit; if(A.apr||document.body.classList.contains('tv')) return s; const D=ritDados(A.cp,A.fonte); if(!D) return s;
    const F=ritFams(D), k=ritStats(D,F.mist?{ls:F.ar}:{}), fh=ritFatorHist();
    if(fh&&fh.f<0.97&&fh.f>0.3&&k.T&&k.du){ const Ta=Math.round(k.T*fh.f); const p=Math.round(k.proj/Ta*100); const aj=`<p class="rx-aj">Se as vendas seguirem o histórico dos últimos ${fh.n} meses (faturado = ${Math.round(fh.f*100)}% da previsão), a meta ficaria perto de <b class="num">${ritQ(Ta,k.kg)}</b>${k.proj?` e o ritmo atual fecharia em <b class="${p<97?'neg':'pos'}">${p}%</b> dela`:''}.</p>`;
      s=s.replace(/(<p class="rx-fr">[\s\S]*?<\/p>)/,m=>m+aj); }
    const i=s.indexOf('<div class="rx-dets">'); if(i>=0) s=s.slice(0,i)+ritRascunho(D)+s.slice(i); }catch(e){ console.warn('rit+',e); } return s; }; }
/* ---- Necessidades: meta do mês em cada item ---- */
function necMeta(){ if(S.view!=='anlnec') return; let D=null; try{ D=ritDados(hojeStr().slice(0,7),'painel'); }catch(e){} if(!D) return;
  document.querySelectorAll('#view .anl-r[data-c]').forEach(r=>{ const c=r.dataset.c; if(!D.IC[c]||r.querySelector('.nec-m')) return; const k=ritStats(D,{c}); if(!k.T) return; const sm=r.querySelector('.op small'); if(!sm) return;
    const e=document.createElement('span'); e.className='nec-m num '+(k.sal<=0?'ok':k.dev<0?'neg':''); e.textContent=` · meta do mês ${anlN(k.T)} · feito ${Math.round(k.ra/k.T*100)}%`; sm.appendChild(e); }); }
{ const _r3=render; render=function(){ const x=_r3.apply(this,arguments); try{ necMeta(); }catch(e){} return x; }; }
/* ---- Silos: medição antiga em destaque ---- */
{ const _vg=vGeral; vGeral=function(){ const s=_vg(); try{ const um=ultimaMedicao(); if(!um) return s; const h=(Date.now()-new Date(um.em))/36e5; if(h<20) return s; const d=Math.floor(h/24);
    return `<div class="banner med-velha"><b>Última medição dos silos: ${d>=1?'há '+d+' dia'+(d>1?'s':''):'há '+Math.round(h)+' horas'}</b> (${dm(hojeStr(new Date(um.em)))} às ${hora(um.em)}). O Cimento × programação usa essa medição; meça de novo para a conta ficar certa. <button class="lnk" data-go="medicao">Lançar medição</button></div>`+s; }catch(e){ return s; } }; }
/* ---- Diário de bordo: pendências antigas recolhidas ---- */
S.dbacAb=false;
document.addEventListener('click',ev=>{ const sm=ev.target.closest&&ev.target.closest('[data-act="dbac-t"]'); if(!sm) return; ev.preventDefault(); S.dbacAb=!S.dbacAb; render(); });

/* ===== FECHAMENTO MENSAL: foto de cada mês fechado + tendência (P×R e apresentação) ===== */
S.fech={docs:null,cache:{},salvando:false};
async function fechCarrega(){ if(S.fech.docs!==null||!S.db) return; S.fech.docs=[]; try{ const q=await S.db.collection('ritfech').limit(60).get(); S.fech.docs=q.docs.map(d=>Object.assign({_id:d.id},d.data())); }catch(e){} try{ await fechAuto(); }catch(e){} rerenderSeguro(); }
function fechCalc(cp){ const A=S.rit, m0=A.meta; A.meta='liq'; try{ let D=null, fonte='focco'; try{ D=ritDados(cp,'focco'); }catch(e){} if(!D||!ritStats(D,{}).ra){ D=ritDados(cp,'painel'); fonte='painel'; } if(!D) return null;
    const F=ritFams(D); const st=f=>{ const k=ritStats(D,f); return {T:Math.round(k.T),ra:Math.round(k.ra),pa:Math.round(k.pa),proj:Math.round(k.proj),pc:Math.round(k.pc),fat:Math.round(k.fat),ader:k.ader==null?null:Math.round(k.ader*1000)/1000,pmin:Math.round(k.pmin),cd:Math.round(k.cd),cdR:Math.round(k.cdR||0),n:k.n,du:k.du,kg:Math.round(k.kg*10)/10}; };
    const L={}; ritAtivas(D).forEach(l=>L[l]=st({l})); const fimM=D.dias[D.dias.length-1]||cp+'-28'; const ate=fonte==='focco'?String(D.fonteAte||'').slice(0,10):''; return {cp,fonte,ate,completo:fonte==='painel'||(!!ate&&ate>=fimM),fatAte:String(D.fatAte||'').slice(0,10),tot:st({}),arg:F.mist?st({ls:F.ar}):null,rej:F.mist?st({ls:F.rj}):null,L}; }
  finally{ A.meta=m0; } }
async function fechSalva(cp,manual){ if(!S.db||S.fech.salvando) return; const x=fechCalc(cp); if(!x) return; S.fech.salvando=true;
  try{ const ant=(S.fech.docs||[]).find(d=>d._id===cp); const doc=Object.assign({},x,{em:new Date().toISOString(),por:S.uid||null,auto:!manual}); if(ant){ const {_id,ant:aa,...resto}=ant; doc.ant=[resto].concat(aa||[]).slice(0,3); }
    await S.db.doc('ritfech/'+cp).set(doc); const i=S.fech.docs.findIndex(d=>d._id===cp); const nd=Object.assign({_id:cp},doc); if(i>=0) S.fech.docs[i]=nd; else S.fech.docs.push(nd); delete S.fech.cache[cp];
    if(manual) toast('Fechamento de '+ritMesNome(cp)+' guardado.'); }catch(e){ if(manual) erro(e); } finally{ S.fech.salvando=false; } }
async function fechAuto(){ if(!(S.acs&&S.acs.dono)) return; const cur=hojeStr().slice(0,7); const ms=ritMeses().filter(c=>c<cur).slice(-6);
  for(const cp of ms){ if((S.fech.docs||[]).some(d=>d._id===cp)) continue; const x=fechCalc(cp); if(x&&x.completo) await fechSalva(cp,false); } }
function fechSerie(){ const cur=hojeStr().slice(0,7); const ms=ritMeses().filter(c=>c<=cur).slice(-6); return ms.map(cp=>{ const doc=(S.fech.docs||[]).find(d=>d._id===cp);
    if(cp===cur){ const x=fechCalc(cp); return x?Object.assign(x,{atual:true}):null; }
    if(doc) return Object.assign({foto:true},doc); if(!S.fech.cache[cp]) S.fech.cache[cp]=fechCalc(cp); return S.fech.cache[cp]; }).filter(Boolean); }
function fechV(x){ return x.arg||x.tot; }
function fechPct(x){ const v=fechV(x); if(!x.atual&&x.completo===false&&x.ate&&v.pa) return v.ra/v.pa*100; return v.T?v.ra/v.T*100:0; }
function fechGraf(xs,o){ o=o||{}; const W=o.w||640, H=o.h||210, pb=34, pt=24, n=xs.length, bw=Math.min(90,(W-40)/n*0.55), X=i=>20+(W-40)*(i+0.5)/n, mx=Math.max(110,...xs.map(x=>{ const v=fechV(x); return Math.max(fechPct(x),x.atual&&v.T?v.proj/v.T*100:0); }))*1.08, Y=p=>pt+(H-pt-pb)*(1-p/mx), fs=o.fs||12;
  return `<svg class="fech-g" viewBox="0 0 ${W} ${H}" role="img" aria-label="Produzido em % da meta, mês a mês"><line x1="10" x2="${W-10}" y1="${Y(100)}" y2="${Y(100)}" stroke="var(--ink)" stroke-dasharray="5 5" opacity=".45"/><text x="${W-10}" y="${Y(100)-6}" text-anchor="end" font-size="${fs-1}" fill="var(--muted)">meta</text>
   ${xs.map((x,i)=>{ const v=fechV(x), p=fechPct(x), pj=x.atual&&v.T?v.proj/v.T*100:0, c=p>=97?'var(--ok)':p>=90?'var(--warn)':'var(--crit)';
     return `${x.atual&&pj>p?`<rect x="${X(i)-bw/2}" y="${Y(pj)}" width="${bw}" height="${Y(p)-Y(pj)}" fill="none" stroke="${pj>=97?'var(--ok)':'var(--crit)'}" stroke-dasharray="4 3" rx="4"/>`:''}<rect x="${X(i)-bw/2}" y="${Y(p)}" width="${bw}" height="${Math.max(1,Y(0)-Y(p))}" rx="5" fill="${x.atual?'var(--teal)':c}"/>
      <text x="${X(i)}" y="${Math.min(Y(Math.max(p,pj)),Y(0)-4)-6}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="var(--ink)">${Math.round(p)}%${x.atual&&pj?` → ${Math.round(pj)}%`:''}</text>
      <text x="${X(i)}" y="${H-12}" text-anchor="middle" font-size="${fs-1}" fill="var(--muted)">${(ANL_MESES[+x.cp.slice(5,7)-1]||'').slice(0,3)}${x.atual?' (até hoje)':x.completo===false&&x.ate?' (até '+dm(x.ate)+')':''}</text>`; }).join('')}</svg>`; }
function fechCard(){ const xs=fechSerie(); if(xs.length<2) return '';
  const linha=x=>{ const v=fechV(x), p=Math.round(fechPct(x)); return `<tr class="${x.atual?'fech-at':''}"><td><b>${esc(ritMesNome(x.cp))}</b>${x.atual?'<small>até hoje</small>':x.foto?'<small>foto guardada</small>':!x.completo&&x.ate?`<small class="neg">Focco só até ${dm(x.ate)}</small>`:'<small>calculado agora</small>'}</td><td class="nr num">${anlN(v.T)}</td><td class="nr num">${anlN(v.ra)}</td><td class="nr num"><b class="${p>=97?'pos':p<90?'neg':''}">${p}%</b>${x.atual&&v.T?`<small>no ritmo ${Math.round(v.proj/v.T*100)}%</small>`:''}</td><td class="nr num">${v.pc&&!(x.fatAte&&x.fatAte<x.cp+'-01')?Math.round(v.fat/v.pc*100)+'%':'—'}</td><td class="nr num">${v.ader==null?'—':Math.round(v.ader*100)+'%'}</td><td class="nr num">${v.pmin?ritH(v.pmin):'—'}</td></tr>`; };
  const cur=hojeStr().slice(0,7), pode=!!(S.acs&&S.acs.dono), A=S.rit;
  return `<section class="card fech"><div class="rr-h"><div><h2>Últimos meses</h2><div class="sub" style="margin:2px 0 0;font-size:12.5px">Produzido em % da meta de produção${xs.some(x=>x.arg)?' (argamassas)':''}. Mês fechado usa o apontado no Focco; o mês atual mostra até hoje e, tracejado, onde fecha no ritmo atual.</div></div>
    ${pode&&A.cp<cur?`<button class="btn sec" data-act="fech-salva" data-v="${A.cp}" style="height:38px">Guardar fechamento de ${esc(ritMesNome(A.cp))}</button>`:''}</div>
   <div class="fech-w"><div class="fech-gw">${fechGraf(xs,{w:560,h:250,fs:14})}</div><div style="overflow-x:auto"><table class="rtab fech-t"><thead><tr><th>Mês</th><th class="nr">Meta</th><th class="nr">Produzido</th><th class="nr">% da meta</th><th class="nr">Faturado ÷ previsão</th><th class="nr">Aderência</th><th class="nr">Parado</th></tr></thead><tbody>${xs.slice().reverse().map(linha).join('')}</tbody></table></div></div></section>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="fech-salva"]'); if(!b) return; fechSalva(b.dataset.v,true).then(()=>render()); });
{ const _vr2=vRit; vRit=function(){ let s=_vr2(); try{ fechCarrega(); const A=S.rit; if(A.apr||document.body.classList.contains('tv')) return s; const i=s.indexOf('<div class="rx-dets">'); if(i>=0) s=s.slice(0,i)+fechCard()+s.slice(i); }catch(e){ console.warn('fech',e); } return s; }; }
/* slide de tendência na apresentação */
{ const _rs=rapSlides; rapSlides=function(D){ const r=_rs(D); try{ fechCarrega(); const xs=fechSerie(); if(xs.length>=2){ const fech=xs.filter(x=>!x.atual), med=fech.length?Math.round(fech.reduce((a,x)=>{ const v=fechV(x); return a+(v.T?v.ra/v.T*100:0); },0)/fech.length):null;
    const at=xs.find(x=>x.atual), va=at&&fechV(at), pj=va&&va.T?Math.round(va.proj/va.T*100):null;
    r.out.splice(r.out.length-1,0,{t:'Tendência',ey:'TENDÊNCIA',tt:med!=null?`Nos últimos ${fech.length} meses, a produção fechou em média em ${med}% da meta`:'Mês a mês',h:`<div class="rap-tend">${fechGraf(xs,{w:1460,h:520,fs:20})}</div><div class="rap-leg" style="justify-content:center"><span><i style="background:var(--ok)"></i>97% ou mais</span><span><i style="background:var(--warn)"></i>90 a 96%</span><span><i style="background:var(--crit)"></i>abaixo de 90%</span><span><i style="background:var(--teal)"></i>mês atual até hoje</span>${pj!=null?`<span>tracejado: onde o mês atual fecha no ritmo (${pj}%)</span>`:''}</div>`}); } }catch(e){ console.warn('tend',e); } return r; }; }


/* ===== Ranchos dentro da Programação: abre numa gaveta lateral pelo botão, sem ocupar a tela ===== */
function rchGav(){ return viewOk('programacao')&&viewOk('ranchos'); }
function mTabs(m){ return mViews(m).filter(v=>!(v==='ranchos'&&rchGav())&&!(typeof TELA_SEM_MENU!=="undefined"&&TELA_SEM_MENU[v])); }
function rchGavHtml(){ const b=banner(); let h=vRanchos(); if(b) h=h.replace(b,'');
  return `<div class="rgav-bg" data-act="rg-fechar" aria-hidden="true"></div><aside class="rgav" role="dialog" aria-modal="true" aria-label="Ranchos"><button class="rgav-x" data-act="rg-fechar" aria-label="Fechar ranchos" title="Fechar (Esc)">✕</button><div class="rgav-in">${h}</div></aside>`; }
function rchPend(){ try{ const g=ranchosDoDia(hojeStr(),''); return (g.grupos||[]).filter(r=>!(r.doc&&r.doc.enviadoEm)).length; }catch(e){ return 0; } }
{ const _vp=vProgramacao; vProgramacao=function(){ let h=_vp();
    /* cabeçalho compacto e fixo no topo, com botões pequenos */
    h=h.replace('<div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Programação</h1><div class="sub">Ordens por linha. Lance as entregas na ordem e o pendente se calcula sozinho.</div></div>','<div class="head pg-head"><div><h1 title="Ordens por linha. Lance as entregas na ordem e o pendente se calcula sozinho.">Programação</h1></div>');
    if(!rchGav()) return h; const n=rchPend();
    h=h.replace('<div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap">','<div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="rg-abrir" title="Anexar o PDF do rancho e preparar o envio ao almox">'+ic('folha',18,2)+'Ranchos'+(n?' <span class="pill warn num" style="padding:1px 8px" title="Ranchos de hoje ainda não enviados ao almox">'+n+'</span>':'')+'</button>');
    return h; }; }
/* a gaveta fica fora do #view (direto no body), para nada da página cortar ou esconder ela */
function rchGavPinta(force){ let root=document.getElementById('rgav-root'); if(!root){ root=document.createElement('div'); root.id='rgav-root'; document.body.appendChild(root); }
  const on=S.view==='programacao'&&S.rchGav&&rchGav();
  if(!on){ if(root.innerHTML) root.innerHTML=''; document.body.classList.remove('rgav-on'); return; }
  const a=document.activeElement, foco=a&&root.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)?{id:a.id,s:a.selectionStart,e:a.selectionEnd}:null; if(foco&&!foco.id&&!force) return; /* sem id não dá para devolver o foco: não repinta enquanto digita */
  let h; try{ h=rchGavHtml(); }catch(e){ console.warn('ranchos',e); h=`<div class="rgav-bg" data-act="rg-fechar"></div><aside class="rgav" role="dialog" aria-label="Ranchos"><button class="rgav-x" data-act="rg-fechar" aria-label="Fechar">✕</button><div class="rgav-in"><h1>Ranchos</h1><div class="banner">Não consegui abrir os ranchos agora (${esc(String(e&&e.message||e))}). Feche e tente de novo.</div></div></aside>`; }
  const tmp=document.createElement('div'); tmp.innerHTML=h; const novo=tmp.querySelector('.rgav-in'), velho=root.querySelector('.rgav-in');
  if(velho&&novo){ if(velho.innerHTML!==novo.innerHTML){ const st=velho.scrollTop; velho.innerHTML=novo.innerHTML; velho.scrollTop=st; } } /* já aberta: troca só o conteúdo, sem animar de novo */
  else { root.innerHTML=h; root.querySelectorAll('.rgav,.rgav-bg').forEach(x=>x.classList.add('anim')); }
  if(foco&&foco.id){ const n=document.getElementById(foco.id); if(n&&n!==document.activeElement){ n.focus(); try{ n.setSelectionRange(foco.s,foco.e); }catch(e){} } }
  document.body.classList.add('rgav-on'); }
{ const _r=render; render=function(){ try{ _r.apply(this,arguments); } finally{ try{ rchGavPinta(); }catch(e){ console.warn('ranchos',e); } } }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="rg-abrir"],[data-act="rg-fechar"]'); if(!b) return;
  ev.preventDefault(); if(b.dataset.act==='rg-abrir'){ S.rchGav=true; if(!S.rch.dia) S.rch.dia=hojeStr(); rchGavPinta(true); const n=document.querySelector('.rgav-in'); if(n) n.scrollTop=0; }
  else { S.rchGav=false; rchGavPinta(); render(); } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.rchGav&&document.querySelector('.rgav')&&!document.querySelector('.omodal,.dbmodal,.modal-bg')){ S.rchGav=false; render(); } });

/* botão "Enviado ao almox" na linha da ordem (marca o rancho inteiro, igual à aba Ranchos) */
function envAlmBtn(o){ if(!o.rancho||!dbPode().prod) return ''; const e=dbEt(o);
  if(e.conf||(e.fim&&e.fim.st==='encerrado')) return '';
  if(e.env) return `<button class="fpbtn envok" data-act="o-env-desf" data-id="${esc(o._id)}" title="Rancho ${esc(o.rancho)} enviado ao almox às ${hora(e.env)}${dm(hojeStr(new Date(e.env)))!==dm(hojeStr())?' de '+dm(hojeStr(new Date(e.env))):''}${e.rc&&e.rc.enviadoPor?' por '+esc(nomeDe(e.rc.enviadoPor)):''} · clique para desfazer">${ic('check',14,2.4)}Almox ${hora(e.env)}</button>`;
  return `<button class="fpbtn envbtn" data-act="o-env-alm" data-id="${esc(o._id)}" title="Marcar o rancho ${esc(o.rancho)} como enviado ao almox (vale para todas as ordens dele)">${ic('rota',14,2.2)}Enviado ao almox</button>`; }
async function envAlmMarca(o,on){ if(!S.db) return toast('Sem conexão: não deu para salvar.'); const rc=ranchoDe(o.rancho), agora=new Date().toISOString();
  try{ if(on){ if(rc) await S.db.doc('ranchos/'+o.rancho).update({enviadoEm:agora,enviadoPor:S.uid||null});
      else { const irm=S.ordens.filter(x=>String(x.rancho||'')===String(o.rancho)&&x.status!=='cancelada'&&x.status!=='excluida'); const d={numero:String(o.rancho),ordens:irm.map(x=>({num:String(x.num),codigo:codigoDe(x)})),criadoEm:agora,por:S.uid||null,enviadoEm:agora,enviadoPor:S.uid||null}; await S.db.doc('ranchos/'+o.rancho).set(d); if(!ranchoDe(o.rancho)) S.ranchos.push(Object.assign({_id:String(o.rancho)},d)); }
      if(rc){ rc.enviadoEm=agora; rc.enviadoPor=S.uid||null; } toast('Rancho '+o.rancho+' marcado como enviado ao almox.'); }
    else { await S.db.doc('ranchos/'+o.rancho).update({enviadoEm:null,enviadoPor:null}); if(rc){ rc.enviadoEm=null; rc.enviadoPor=null; } toast('Envio ao almox desfeito.'); }
    render(); }catch(e){ erro(e); } }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="o-env-alm"],[data-act="o-env-desf"]'); if(!b) return; ev.preventDefault(); ev.stopPropagation(); const o=ordById(b.dataset.id); if(!o||!o.rancho) return;
  if(b.dataset.act==='o-env-alm') return envAlmMarca(o,true);
  const t=Date.now(); if(S._envDesf===o._id&&t-(S._envT||0)<5000){ S._envDesf=null; return envAlmMarca(o,false); } S._envDesf=o._id; S._envT=t; toast('Clique de novo para desfazer o envio do rancho '+o.rancho+'.'); },true);

/* ===== Base de dados: conferência (o que está em dia, o que está estranho, conferir um item) ===== */
function anlConfere(R){ const B=S.anl.base, I=B.itens||{}, L=I.l||{}, a=I.atual||{}, P=B.prev||{}, V=B.vendas||{}, pf=B.perfil||{}, h=hojeStr(), cp=h.slice(0,7);
  const idade=iso=>iso?anlUteisEntre(String(iso).slice(0,10),h):null;
  const quando=(iso,n)=>n==null?'nunca importado':n===0?'hoje':n===1?'há 1 dia útil':'há '+n+' dias úteis';
  const qd=iso=>iso?dm(String(iso).slice(0,10))+(String(iso).length>10?' '+String(iso).slice(11,16):''):'—';
  const st=(n,ok,warn)=>n==null?'crit':n<=ok?'ok':n<=warn?'warn':'crit';
  const exAte=V.ate?addDias(V.ate,1):null; /* extrato "até ontem" está em dia */
  const prevOk=!!(P.mes||{})[cp], prevEm=(P.mesEm||{})[cp];
  const fontes=[
   {n:'Saldo',d:'almox 3 + 30'+(a.SALDO_E?' · '+Object.keys(a.SALDO_E).sort().map(e=>'E'+e+' '+(a.SALDO_E[e]?dm(String(a.SALDO_E[e]).slice(0,10)):'—')).join(' + '):''),iso:a.SALDO,i:idade(a.SALDO),s:st(idade(a.SALDO),0,1),u:'Necessidades, Projeção, Estoques',q:Object.values(L).filter(x=>x.sal).length+' itens'},
   {n:'Perfil',d:'RPLA0300 · carteira e ordens',iso:pf.atual,i:idade(pf.atual),s:st(idade(pf.atual),0,1),u:'Necessidades, Projeção',q:(pf.l||[]).length+' linhas'},
   {n:'Extrato',d:'produzido e faturado',iso:V.ate,i:exAte?idade(exAte):null,s:st(exAte?idade(exAte):null,1,3),u:'Média de vendas, Previsto × Realizado',q:V.ate?'até '+dm(V.ate):'',lab:V.ate?'até '+dm(V.ate):'—'},
   {n:'Parâmetros',d:'est. segurança e lotes',iso:a.PARAMETROS,i:idade(a.PARAMETROS),s:st(idade(a.PARAMETROS),22,66),u:'Estoque de segurança, lotes',q:Object.values(L).filter(x=>x.seg>0).length+' com seg.'},
   {n:'Previsão do mês',d:'RPRE0301 · '+cp.slice(5)+'/'+cp.slice(0,4),iso:prevOk&&prevEm&&prevEm!=='planilha'?prevEm:null,i:null,s:!prevOk?'crit':prevEm==='planilha'?'warn':'ok',u:'Meta do mês, Previsão mensal',q:prevOk?Object.keys(P.mes[cp]).length+' itens':'',lab:!prevOk?'não importada':prevEm==='planilha'?'da planilha':qd(prevEm)}];
  const pill={ok:'<span class="pill ok">Em dia</span>',warn:'<span class="pill warn">Atualizar</span>',crit:'<span class="pill crit">Desatualizado</span>'};
  const cards=fontes.map(f=>`<div class="bq-f ${f.s}" data-bq-imp="${esc(f.n)}" role="button" tabindex="0" title="${f.s==='ok'?'Clique para importar de novo':'Clique para escolher o arquivo e atualizar'}"><div class="bq-fh"><b>${f.n}</b>${pill[f.s]}</div><div class="bq-fd num">${f.lab||qd(f.iso)}</div><small>${f.n==='Previsão do mês'?(prevOk?f.q:'importe o RPRE0301 do mês'):quando(f.iso,f.i)+(f.q?' · '+f.q:'')}</small><small class="bq-u">${f.d} · usado em ${f.u}</small></div>`).join('');
  /* checagens */
  const nome=c=>(L[c]&&L[c].d)||((itemDe(c)||{}).descricao)||'';
  const lst=cs=>cs.slice(0,40).map(c=>`<button class="chip bq-c" data-bq="${esc(c)}" title="${esc(nome(c))}">${esc(c)}</button>`).join('')+(cs.length>40?` <small>+${cs.length-40}</small>`:'');
  const ck=[]; const add=(s,t,cs,dica)=>ck.push({s,t,cs:cs||[],dica:dica||''});
  const interm=c=>/^M\d/.test(c)||/PREMIX|ENSACAD/i.test(nome(c)); /* premix e ensacado: material intermediário, fica fora das checagens */
  const comSal=Object.keys(L).filter(c=>L[c].sal&&!interm(c));
  { const SE=a.SALDO_E||{}, es=Object.keys(SE).sort(); if(a.SALDO){ if(es.length>=2){ const ds=[...new Set(es.map(e=>String(SE[e]||'').slice(0,10)))]; add(ds.length===1?'ok':'warn',ds.length===1?`Saldo das duas empresas (${es.map(e=>'E'+e).join(' e ')}) do mesmo dia`:`Saldo das empresas de dias diferentes: ${es.map(e=>'E'+e+' '+(SE[e]?dm(String(SE[e]).slice(0,10)):'—')).join(' · ')}`,[],'Tire os dois relatórios no mesmo momento e arraste juntos.'); }
    else add('warn',es.length?`Saldo só da Empresa ${es[0]}`:'Saldo de uma empresa só',[],'O estoque fica dividido entre a Empresa 1 e a Empresa 9. Arraste os dois PDFs de saldo juntos (ou só o que faltar): o painel soma e mostra o detalhe por empresa no item.'); } }
  add(comSal.length?'ok':'crit',comSal.length?`${anlN(comSal.length)} itens com saldo carregado`:'Nenhum item com saldo carregado',[], 'Itens que vieram no relatório de saldo.');
  const neg=comSal.filter(c=>(+L[c].a3||0)+(+L[c].a30||0)<0); add(neg.length?'warn':'ok',neg.length?`${neg.length} ${neg.length===1?'item':'itens'} com saldo negativo no Focco`:'Nenhum saldo negativo',neg,'Saldo negativo no sistema costuma ser apontamento ou baixa faltando.');
  const perfC=[...new Set((pf.l||[]).map(r=>r[0]))].filter(c=>!interm(c)); const semCad=perfC.filter(c=>!L[c]);
  add(semCad.length?'warn':'ok',semCad.length?`${semCad.length} ${semCad.length===1?'código':'códigos'} do Perfil sem saldo cadastrado`:`Todos os ${perfC.length} códigos do Perfil têm saldo`,semCad,'Esses itens entram na análise com saldo zero. Se o estoque deles está zerado, o relatório de saldo não traz mesmo; se não, confira o relatório.');
  const pm=(P.mes||{})[cp]||{}; const prevC=Object.keys(pm).filter(c=>+pm[c]>0&&!interm(c)); const prevSem=prevC.filter(c=>!L[c]);
  if(prevOk) add(prevSem.length?'warn':'ok',prevSem.length?`${prevSem.length} ${prevSem.length===1?'item':'itens'} da previsão do mês sem cadastro de saldo`:`Os ${prevC.length} itens da previsão do mês estão cadastrados`,prevSem,'Pode ser código novo ou digitado diferente no comercial.');
  const usados=[...new Set(perfC.concat(prevC))]; const semLinha=usados.filter(c=>!anlLinhasDe(c,L[c]).length);
  add(semLinha.length?'warn':'ok',semLinha.length?`${semLinha.length} ${semLinha.length===1?'item':'itens'} com pedido ou previsão mas sem linha`:'Todos os itens com demanda têm linha',semLinha,'Sem linha, o item não entra na carga das linhas nem no Previsto × Realizado por linha. Cadastre em Ajustes → Itens.');
  const lim=addDias(h,-60), D=V.diario||{}; const vendeu=c=>Object.entries(D[c]||{}).some(([d,v])=>d>=lim&&(+((v||[])[1])||0)>0);
  const enc=new Set(anlCfg().enc||[]); const semSeg=comSal.filter(c=>!(+L[c].seg>0)&&!enc.has(c)&&!anlEncAuto(c,L[c].d)&&vendeu(c));
  add(semSeg.length?'warn':'ok',semSeg.length?`${semSeg.length} ${semSeg.length===1?'item vendido':'itens vendidos'} nos últimos 60 dias sem estoque de segurança`:'Itens com venda têm estoque de segurança',semSeg,'Sem segurança, a análise só avisa quando já vai faltar. Confira os Parâmetros.');
  const lote=comSal.filter(c=>+L[c].lmin>0&&+L[c].lmax>0&&+L[c].lmin>+L[c].lmax); if(lote.length) add('warn',`${lote.length} ${lote.length===1?'item':'itens'} com lote mínimo maior que o máximo`,lote,'Corrija nos Parâmetros do Focco.');
  if(a.SALDO&&pf.atual){ const ds=String(a.SALDO).slice(0,10), dp=String(pf.atual).slice(0,10); add(ds===dp?'ok':'warn',ds===dp?'Saldo e Perfil são do mesmo dia':`Saldo de ${dm(ds)} e Perfil de ${dm(dp)}: tire os dois juntos`,[],'Com dias diferentes, pedido já faturado pode contar duas vezes (ou nenhuma).'); }
  if(V.ate){ const ds=[]; let d=V.ate; for(let g=0;g<40&&ds.length<15;g++){ if(anlUtil(d)) ds.push(d); d=addDias(d,-1); } const mov=new Set(); Object.values(D).forEach(o=>{ for(const k in o){ const v=o[k]||[]; if((+v[0]||0)||(+v[1]||0)) mov.add(k); } }); const buraco=ds.filter(x=>!mov.has(x)).sort();
    add(buraco.length?'warn':'ok',buraco.length?`Extrato sem nenhum movimento em ${buraco.length} dia${buraco.length>1?'s':''} útil${buraco.length>1?'s':''}: ${buraco.map(dm).join(', ')}`:'Extrato tem movimento em todos os dias úteis recentes',[],'Dia útil sem produção nem faturamento costuma ser período que ficou fora da importação. Se foi feriado ou parada, pode ignorar.'); }
  { const dP=String(pf.rel||pf.atual||'').slice(0,10); /* pedido vencido só faz sentido com o Perfil tirado hoje */
    if(dP&&dP===h){ const venc=[...new Set((pf.l||[]).filter(r=>r[1]==='DC'&&r[2]<h&&!interm(r[0])).map(r=>r[0]))]; add(venc.length?'neu':'ok',venc.length?`${venc.length} ${venc.length===1?'item tem':'itens têm'} pedido vencido no Perfil de hoje`:'Nenhum pedido vencido no Perfil de hoje',venc,'Pedido com data de entrega antes de hoje. A análise trata como saída de hoje.'); }
    else if(dP) add('neu',`Pedidos vencidos: só confiro com o Perfil de hoje (o atual é de ${dm(dP)})`,[],'Com um Perfil de outro dia, pedido que já foi faturado aparece como vencido. Importe o Perfil de hoje para ver os vencidos de verdade.'); }
  { const ints=[...new Set(Object.keys(L).concat((pf.l||[]).map(r=>r[0])))].filter(interm); if(ints.length) add('neu',`${ints.length} materiais intermediários (premix e ensacado) ficam fora destas checagens`,ints.sort(),'Códigos M… ou com PREMIX/ENSACADO na descrição. Eles continuam na base, só não geram aviso aqui.'); }
  const n={ok:ck.filter(x=>x.s==='ok').length,warn:ck.filter(x=>x.s!=='ok'&&x.s!=='neu').length};
  const ico={ok:ic('check',15,2.6),warn:'!',crit:'✕',neu:'i'};
  const rows=ck.map(x=>x.cs.length?`<details class="bq-k ${x.s}"><summary><span class="bq-i">${ico[x.s]}</span><span>${x.t}</span><small>ver itens</small></summary><div class="bq-kb"><div class="sub" style="margin:0 0 6px;font-size:12.5px">${x.dica}</div><div class="chips">${lst(x.cs)}</div></div></details>`:`<div class="bq-k ${x.s}"><span class="bq-i">${ico[x.s]}</span><span>${x.t}${x.dica&&x.s!=='ok'?`<small style="display:block;color:var(--muted);font-size:12px">${x.dica}</small>`:''}</span></div>`).join('');
  const piores=fontes.filter(f=>f.s!=='ok');
  const res=!piores.length&&!n.warn?`<b class="bq-ok">${ic('check',16,2.6)} Tudo em dia e sem nada estranho.</b>`:`<b>${piores.length?piores.map(f=>f.n).join(', ')+(piores.length>1?' precisam':' precisa')+' ser atualizado'+(piores.length>1?'s':''):'Arquivos em dia'}${n.warn?' · '+n.warn+' ponto'+(n.warn>1?'s':'')+' para conferir':''}.</b>`;
  const codes=Object.keys(L).sort();
  return `<section class="card bq"><div class="head" style="align-items:baseline;margin-bottom:10px"><div><div class="label">CONFERÊNCIA DA BASE</div><div class="sub" style="margin:4px 0 0;font-size:13.5px">${res}</div></div>
    <label class="srch bq-busca">${ic('lupa',16,2)}<input class="txt" id="bq-item" list="bq-dl" placeholder="Conferir um item (código)" autocomplete="off"></label><datalist id="bq-dl">${codes.map(c=>`<option value="${esc(c)}">${esc(L[c].d||'')}</option>`).join('')}</datalist></div>
   <div class="bq-fs">${cards}</div>
   <div class="bq-ks">${rows}</div>
   <div class="sub" style="margin:10px 0 0;font-size:12px">Para conferir um número com o Focco: digite o código acima. Abre o item com o saldo (almox 3 e 30), o que entrou e saiu depois do saldo, o estoque de segurança, os lotes, as vendas e as linhas do Perfil, do jeito que a análise está usando.</div></section>`; }
function bqAbrir(v){ const c=String(v||'').trim().toUpperCase().split(/\s/)[0]; if(!c) return; const R=anlDados(); if(R&&R.por&&R.por[c]){ S.anl.item=c; S.anl.sug=null; render(); }
  else toast(((S.anl.base.itens||{}).l||{})[c]?'O item '+c+' está no cadastro mas não entrou na análise (sem saldo, sem pedido e sem venda).':'O código '+c+' não veio em nenhum arquivo da base.'); }
document.addEventListener('change',ev=>{ if(ev.target.id==='bq-item'){ bqAbrir(ev.target.value); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-bq]'); if(b) bqAbrir(b.dataset.bq); });
/* clicar num cartão da conferência abre direto a escolha de arquivo */
function bqImp(){ const i=document.getElementById('anl-arq'); if(i){ i.value=''; i.click(); } }
document.addEventListener('click',ev=>{ const c=ev.target.closest&&ev.target.closest('[data-bq-imp]'); if(c) bqImp(); });
document.addEventListener('keydown',ev=>{ const c=ev.target.closest&&ev.target.closest('[data-bq-imp]'); if(c&&(ev.key==='Enter'||ev.key===' ')){ ev.preventDefault(); bqImp(); } });
document.addEventListener('keydown',ev=>{ if(ev.target.id==='bq-item'&&ev.key==='Enter'){ ev.preventDefault(); bqAbrir(ev.target.value); } });

/* saldo das duas empresas (E1 e E9): guarda por empresa e soma; importar só uma mantém a outra */
function anlSaldoJunta(sals,base){ const I0=(base.itens&&base.itens.l)||{}, atE=Object.assign({},((base.itens||{}).atual||{}).SALDO_E||{}), por={}, desc={};
  for(const k in I0){ const e=I0[k].emp; if(!e||!I0[k].sal) continue; for(const x in e){ (por[x]=por[x]||{atual:atE[x]||null,l:{}}).l[k]={a3:+e[x].a3||0,a30:+e[x].a30||0}; } if(I0[k].d) desc[k]=I0[k].d; }
  sals.forEach(sa=>{ const e=String(sa.emp||'1'); por[e]={atual:sa.atual||null,l:{}}; for(const k in sa.l){ const v=sa.l[k]; por[e].l[k]={a3:+v.a3||0,a30:+v.a30||0}; if(v.d) desc[k]=v.d; } });
  const l={}; for(const e in por){ for(const k in por[e].l){ const v=por[e].l[k]; const t=l[k]=l[k]||{a3:0,a30:0,emp:{}}; t.a3+=v.a3; t.a30+=v.a30; t.emp[e]={a3:v.a3,a30:v.a30}; } }
  for(const k in l){ if(desc[k]) l[k].d=desc[k]; l[k].a3=Math.round(l[k].a3*1000)/1000; l[k].a30=Math.round(l[k].a30*1000)/1000; }
  const empAt={}; for(const e in por) empAt[e]=por[e].atual; const datas=Object.values(empAt).filter(Boolean).sort();
  return {atual:datas[0]||sals[0].atual,l,empAt}; }

/* estoque do início do mês: mostra de onde veio e permite recalcular = saldo atual (E1+E9) − produzido + faturado desde o dia 1 (extrato) */
function anlEstCalc(cp){ const B=S.anl.base, I=B.itens||{}, L=I.l||{}, a=I.atual||{}, D=(B.vendas||{}).diario||{}; const sAt=String(a.SALDO||''); if(!sAt) return null;
  const sDia=sAt.slice(0,10), ini=cp+'-01'; if(sDia<ini) return null; const ate=(B.vendas||{}).ate||''; if(ate<sDia) return {erro:'O extrato vai só até '+dm(ate)+'. Importe o extrato até '+dm(sDia)+' antes de recalcular.'};
  /* dias inteiros do dia 1 até a véspera do saldo; no dia do saldo só a produção (o faturado do dia costuma sair depois do saldo) */
  const m={}; for(const c in L){ if(!L[c].sal) continue; let v=(+L[c].a3||0)+(+L[c].a30||0); const dd=D[c]||{}; for(const d in dd){ const x=dd[d]||[]; if(d>=ini&&d<sDia) v-=(+x[0]||0)-(+x[1]||0); else if(d===sDia&&sDia>=ini) v-=(+x[0]||0); } m[c]=Math.max(0,Math.round(v*1000)/1000); }
  return {m,de:sAt,emps:Object.keys(a.SALDO_E||{}).sort()}; }
function anlEstInfo(){ const B=S.anl.base, P=B.prev||{}, cp=hojeStr().slice(0,7), em=(P.estEm||{})[cp], tem=!!(P.est||{})[cp];
  const orig=!tem?'<span style="color:var(--crit-ink)">ainda não guardado</span>':em==='planilha'?'da planilha':String(em).startsWith('fechamento')?'saldo de fechamento ('+esc(String(em).slice(11))+')':String(em).startsWith('recalc')?'recalculado com o saldo de '+esc(String(em).slice(7))+' (aproximado)':'foto do saldo de '+dm(String(em).slice(0,10))+' (antes de juntar as duas empresas)';
  return `<div class="impl" style="align-items:center"><span><b>Início de ${cp.slice(5)}/${cp.slice(0,4)}</b> <small style="color:var(--muted)">${orig}</small></span><button class="lnk" data-act="anl-est-rec" title="Saldo atual (E1+E9) menos o que foi produzido e mais o que foi faturado desde o dia 1, pelo extrato">Recalcular com o saldo atual</button></div>`; }
async function anlEstRecalc(){ const cp=hojeStr().slice(0,7); const r=anlEstCalc(cp); if(!r){ toast('Precisa de um saldo deste mês para recalcular.'); return; } if(r.erro){ toast(r.erro); return; }
  if(!S.db){ toast('Sem conexão.'); return; } const P=Object.assign({},S.anl.base.prev||{}); const est=Object.assign({},P.est||{}), estEm=Object.assign({},P.estEm||{});
  est[cp]=r.m; estEm[cp]='recalc '+dm(r.de.slice(0,10))+' '+r.de.slice(11,16)+(r.emps.length?' ('+r.emps.map(e=>'E'+e).join('+')+')':'');
  try{ const nv=Object.assign({},P,{est,estEm,em:new Date().toISOString()}); await S.db.doc('pcpbase/prev').set(nv); S.anl.base.prev=nv; S.anl._c=null; toast('Estoque do início de '+cp.slice(5)+'/'+cp.slice(0,4)+' recalculado ('+Object.keys(r.m).length+' itens).'); render(); }catch(e){ erro(e); } }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="anl-est-rec"]'); if(!b) return; ev.stopImmediatePropagation(); const t=Date.now(); if(S._estRecT&&t-S._estRecT<5000){ S._estRecT=0; anlEstRecalc(); return; } S._estRecT=t; toast('Clique de novo para trocar o estoque do início do mês pelo recalculado.'); },true);

/* ===================== MANUTENÇÃO: chamados e OS (06/10) ===================== */
P.chave='<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.5 1.5 0 0 0 0 2.1l.9.9a1.5 1.5 0 0 0 2.1 0l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.3-.6-.6-2.3z"/>';
S.chamados=S.chamados||[];
S.man={novo:false,f:null,fil:'abertos',cur:null,salv:false,ed:null,qr:false};
Object.assign(VIEWS,{manch:{nome:'Chamados',ic:'chave',mob:'Chamados'},manqr:{nome:'QR das linhas',ic:'grid',mob:'QR'}});
Object.assign(CRUMB,{manch:'Chamados de manutenção',manqr:'QR das linhas'});
MODS.push({id:'manut',nome:'Manutenção',ic:'chave',views:['manch','manqr']});
ACS_MODS.splice(ACS_MODS.findIndex(m=>m[0]==='ajustes'),0,['manut','Manutenção (atender chamados)']);
/* cargos prontos para criar os usuários do almox e da manutenção (06/10) */
{ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro;
  Object.assign(ACS_PERFIS,{almoxpmx:{nome:'Almoxarifado (premix, diário de bordo e contagem)',mods:['premix','almox'],locais:ALX_LOCS,contar:1,receber:1},manut:{nome:'Manutenção (atender chamados)',mods:['manut'],locais:[]}});
  ACS_PERFIS.outro=_o; }
/* quem é da produção (ou só registra paradas) pode abrir chamado; o QR das linhas é de quem cuida da manutenção */
{ const _vo=viewOk; viewOk=function(v){ if(v==='manch'&&!(S.acs&&S.acs.dono)){ const p=acsP(); if(p&&!p.tudo&&p.mods&&(p.mods.includes('producao')||p.mods.includes('paradas'))) return true; } return _vo.apply(this,arguments); }; }
const MAN_IMP={parou:['Parou a máquina','crit'],reduziu:['Diminuiu a produção','warn'],nao:['Não afeta a produção','ok']};
const MAN_ST=['Aberta','Em execução','Aguardando peça','Aguardando terceiros','Concluída','Cancelada'];
/* fechada = não precisa mais de atendimento; ignorada nas estatísticas = apagada ou cancelada */
function manFechada(c){ return !!c&&(c.status==='Concluída'||c.status==='Cancelada'); }
function manIgnorar(c){ return !c||!!c.excluido||c.status==='Cancelada'; }
function manStCor(st){ return st==='Concluída'?'ok':st==='Cancelada'?'neu':st==='Em execução'?'teal':/Aguardando/.test(st||'')?'warn':'neu'; }
const MAN_COND=['Funcionando normalmente','Funcionando com ressalvas','Equipamento indisponível','Necessita manutenção adicional','Necessita substituição de componente','Serviço não executado'];
const MAN_TIPO=['Corretiva','Preventiva','Preditiva','Emergencial','Inspeção','Instalação'];
function manNum(n){ return String(n||0).padStart(5,'0'); }
function manLinhas(){ return linhasOrd().concat(['Outra']); }
function manIdade(iso){ if(!iso) return ''; const m=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/6e4)); return m<1?'menos de 1 min':m<60?m+' min':m<1440?Math.floor(m/60)+'h'+(m%60?String(m%60).padStart(2,'0'):''):Math.floor(m/1440)+'d'; }
function manAgoraLocal(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); }
function manNovo(linha){ S.man.novo=true; S.man.cur=null; S.man.f={linha:linha||'',quando:manAgoraLocal(),defeito:'',impacto:'',nome:(S.uid&&S.nomes[S.uid])||'',equip:''}; }
function manDoc(n){ return (S.chamados||[]).find(c=>c.numero===n); }
function manLink(linha){ const l=encodeURIComponent(linha); return ((window.claude&&window.claude.link)||(S.cfg&&S.cfg.linkPainel)||LINK_PAINEL)+'?chamado='+l+'#chamado='+l; }
function manQrSvg(txt,px){ if(typeof qrcode!=='function') return ''; const q=qrcode(0,'M'); q.addData(txt); q.make(); const n=q.getModuleCount(); let d='';
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(q.isDark(r,c)) d+='M'+c+' '+r+'h1v1h-1z';
  return `<svg viewBox="-2 -2 ${n+4} ${n+4}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect x="-2" y="-2" width="${n+4}" height="${n+4}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; }

/* --- telas --- */
function manView(v){ return v==='manqr'?vManQr():vManCh(); }
function vManCh(){ const M=S.man, h=hojeStr(); const xs=(S.chamados||[]).filter(c=>!c.excluido);
  if(M.cur!=null){ const c=manDoc(M.cur); if(c) return manDetalhe(c); M.cur=null; }
  const ab=xs.filter(c=>!manFechada(c)), par=ab.filter(c=>c.impacto==='parou');
  const fil=M.fil==='meus'?xs.filter(c=>c.por&&c.por===S.uid):M.fil==='abertos'?ab:M.fil==='todos'?xs:M.fil==='aguardando'?xs.filter(c=>/^Aguardando/.test(c.status||'')):xs.filter(c=>c.status===M.fil);
  const card=c=>{ const [it,ic]=MAN_IMP[c.impacto]||['—','neu']; return `<button class="man-it ${manFechada(c)?'feito':''}" data-act="man-abrir" data-n="${c.numero}"><span class="man-n num">OS ${manNum(c.numero)}</span><span class="man-tx"><b>${esc(c.linha||'—')}</b>${c.equip?` · ${esc(c.equip)}`:''}<span class="man-df">${esc(String(c.defeito||'').slice(0,140))}</span><small>${[esc(c.nome||''),c.quando?dm(String(c.quando).slice(0,10))+' '+String(c.quando).slice(11,16):'',!manFechada(c)?'há '+manIdade(c.criado):''].filter(Boolean).join(' · ')}</small></span><span class="man-tg"><span class="pill ${ic}">${it}</span><span class="pill ${manStCor(c.status)}">${esc(c.status)}</span></span></button>`; };
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Chamados</h1><div class="sub">Quem está na linha abre o chamado (pelo celular ou pelo QR da linha). A manutenção atende e a OS sai pronta para imprimir.</div></div>
   <div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap">${viewOk('manqr')?`<button class="btn sec" data-go="manqr">${ic('grid',18,2)}QR das linhas</button>`:''}<button class="btn" data-act="man-novo">${ic('mais',20,2.2)}Abrir chamado</button></div></div>
  ${M.novo?manForm():''}
  <div class="rsm num"><span class="${par.length?'crit':''}">Máquina parada <b>${par.length}</b></span><span>Abertos <b>${ab.filter(c=>c.status==='Aberta').length}</b></span><span>Em execução <b>${ab.filter(c=>c.status==='Em execução').length}</b></span><span>Concluídos hoje <b>${xs.filter(c=>c.status==='Concluída'&&String(c.concluidoEm||'').slice(0,10)===h).length}</b></span></div>
  <section class="card ofil"><div class="seg" role="group" aria-label="Mostrar">${[['meus','Meus chamados'],['abertos','Em aberto'],['Aberta','Aberta'],['Em execução','Em execução'],['aguardando','Aguardando'],['Concluída','Concluída'],['Cancelada','Cancelada'],['todos','Todos']].map(([k,l])=>`<button data-act="man-fil" data-v="${esc(k)}" aria-pressed="${M.fil===k}">${l}</button>`).join('')}</div></section>
  <section class="man-lst">${fil.length?fil.map(card).join(''):`<div class="card"><div class="empty">${M.fil==='abertos'?'Nenhum chamado em aberto.':'Nenhum chamado.'}</div></div>`}</section>`; }
function manForm(){ const F=S.man.f; return `<section class="card man-form" id="man-form"><div class="head" style="align-items:baseline"><div><div class="eyebrow">NOVO CHAMADO</div><h2 style="margin-top:2px">Abrir chamado de manutenção</h2></div><button class="lnk" data-act="man-novo-x">Cancelar</button></div>
   <div class="label" style="margin:12px 0 6px">LINHA</div><div class="chips">${manLinhas().map(l=>`<button class="chip" data-act="man-f" data-k="linha" data-v="${esc(l)}" aria-pressed="${F.linha===l}">${esc(l)}</button>`).join('')}</div>
   <div class="two" style="margin-top:12px;gap:12px"><label><span class="label">DATA E HORA DA OCORRÊNCIA</span><input class="txt" type="datetime-local" data-man="quando" value="${esc(F.quando)}"></label><label><span class="label">EQUIPAMENTO (OPCIONAL)</span><input class="txt" data-man="equip" value="${esc(F.equip)}" placeholder="Ex.: misturador, ensacadeira…"></label></div>
   <label style="display:block;margin-top:12px"><span class="label">DEFEITO / PROBLEMA</span><textarea class="txt" data-man="defeito" rows="3" placeholder="Descreva o que está acontecendo">${esc(F.defeito)}</textarea></label>
   <div class="label" style="margin:12px 0 6px">IMPACTO NA PRODUÇÃO</div><div class="man-imp">${Object.keys(MAN_IMP).map(k=>`<button class="man-ib ${MAN_IMP[k][1]}" data-act="man-f" data-k="impacto" data-v="${k}" aria-pressed="${F.impacto===k}"><i></i>${MAN_IMP[k][0]}</button>`).join('')}</div>
   ${F.impacto==='parou'&&linhasOrd().includes(F.linha)?`<div class="sub" style="font-size:12.5px;margin:8px 0 0">${S.paradas.some(p=>p.linha===F.linha&&!p.fim)?`A ${esc(F.linha)} já está com parada aberta: o chamado fica ligado a ela.`:`Vai abrir uma parada na ${esc(F.linha)} com o motivo Manutenção, a partir do horário da ocorrência. Ela fecha quando a OS for concluída.`}</div>`:''}
   <label style="display:block;margin-top:12px"><span class="label">QUEM ESTÁ SOLICITANDO</span><input class="txt" data-man="nome" value="${esc(F.nome)}" autocomplete="name"></label>
   <button class="btn" data-act="man-salvar" style="margin-top:14px;width:100%" ${S.man.salv?'disabled':''}>${ic('check',18,2.2)}${S.man.salv?'Abrindo…':'Abrir chamado e gerar OS'}</button></section>`; }
function manDetalhe(c){ const E=c.exec||{}, ed=S.man.ed||{}; const v=k=>ed[k]!=null?ed[k]:(E[k]||'');
  const par=c.paradaId&&S.paradas.find(p=>p._id===c.paradaId);
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO · ${esc(c.linha||'')}</div><h1>OS ${manNum(c.numero)}</h1><div class="sub">${esc((MAN_IMP[c.impacto]||[''])[0])} · aberta por ${esc(c.nome||'—')} ${c.criado?'em '+dm(c.criado.slice(0,10))+' às '+hora(c.criado):''}${par?` · parada ${par.fim?'de '+hora(par.inicio)+' às '+hora(par.fim):'em andamento desde '+hora(par.inicio)}`:''}</div></div>
   <div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="man-voltar">← Chamados</button><button class="btn sec" data-act="man-imprimir">${ic('baixar',18,2)}Baixar OS para imprimir</button></div></div>
  <section class="card"><div class="label" style="margin-bottom:8px">STATUS</div><div class="seg">${MAN_ST.map(s=>`<button data-act="man-st" data-v="${s}" aria-pressed="${c.status===s}">${s}</button>`).join('')}</div>
   ${c.status==='Concluída'&&c.concluidoEm?`<div class="sub" style="margin:8px 0 0;font-size:12.5px">Concluída em ${dm(c.concluidoEm.slice(0,10))} às ${hora(c.concluidoEm)}${c.concluidoPor?' por '+esc(nomeDe(c.concluidoPor)):''}.</div>`:''}</section>
  <section class="card man-at"><div class="label" style="margin-bottom:8px">ATENDIMENTO DA MANUTENÇÃO</div>
   <div class="two" style="gap:12px"><label><span class="label">TÉCNICO RESPONSÁVEL</span><input class="txt" data-man-e="tecnico" value="${esc(v('tecnico'))}"></label><label><span class="label">TIPO</span><select class="txt" data-man-e="tipo"><option value="">—</option>${MAN_TIPO.map(t=>`<option ${v('tipo')===t?'selected':''}>${t}</option>`).join('')}</select></label></div>
   <div class="two" style="gap:12px;margin-top:10px"><label><span class="label">INÍCIO</span><input class="txt" type="datetime-local" data-man-e="inicio" value="${esc(v('inicio'))}"></label><label><span class="label">TÉRMINO</span><input class="txt" type="datetime-local" data-man-e="fim" value="${esc(v('fim'))}"></label></div>
   <label style="display:block;margin-top:10px"><span class="label">SERVIÇOS EXECUTADOS / PROCEDIMENTOS</span><textarea class="txt" rows="3" data-man-e="servicos">${esc(v('servicos'))}</textarea></label>
   <label style="display:block;margin-top:10px"><span class="label">MATERIAIS / PEÇAS UTILIZADOS</span><textarea class="txt" rows="2" data-man-e="materiais" placeholder="Uma peça por linha: descrição — qtd">${esc(v('materiais'))}</textarea></label>
   <div class="two" style="gap:12px;margin-top:10px"><label><span class="label">CONDIÇÃO APÓS A MANUTENÇÃO</span><select class="txt" data-man-e="condicao"><option value="">—</option>${MAN_COND.map(t=>`<option ${v('condicao')===t?'selected':''}>${t}</option>`).join('')}</select></label><label><span class="label">PENDÊNCIAS / RECOMENDAÇÕES</span><input class="txt" data-man-e="pendencias" value="${esc(v('pendencias'))}"></label></div>
   <div style="display:flex;gap:10px;margin-top:12px;justify-content:flex-end"><button class="btn" data-act="man-salvar-at" ${S.man.ed?'':'disabled'}>${ic('check',18,2.2)}Salvar atendimento</button></div></section>
  <section class="card"><div class="label" style="margin-bottom:8px">ORDEM DE SERVIÇO</div><div id="man-sheet" class="man-sheet">${manSheet(c)}</div></section>`; }
function manSheet(o){ const E=o.exec||{}, cb=(on,t)=>`${on?'☒':'☐'} ${t}`, L=(t,v,cs)=>`<td${cs?` colspan="${cs}"`:''}><span class="l">${t}</span>${v||'&nbsp;'}</td>`, f=s=>s?dm(String(s).slice(0,10))+' '+String(s).slice(11,16):'', tot=E.inicio&&E.fim?((new Date(E.fim)-new Date(E.inicio))/36e5):null;
  const mats=String(E.materiais||'').split('\n').map(x=>x.trim()).filter(Boolean); while(mats.length<4) mats.push('');
  return `<table class="noh"><tr><td style="border:0;padding:0"><h2>ORDEM DE SERVIÇO</h2><b style="color:#2E5597;letter-spacing:2px">MANUTENÇÃO</b></td><td style="width:32%;background:#eaf0f9"><span class="l">Nº da OS</span><b style="font-size:24px">${manNum(o.numero)}</b></td></tr></table>
  <h3>1. ABERTURA DO CHAMADO</h3><table><tr>${L('Linha de trabalho',esc(o.linha))}${L('Data / horário da ocorrência',f(o.quando))}${L('Aberta em',o.criado?dm(o.criado.slice(0,10))+' '+hora(o.criado):'')}</tr><tr>${L('Solicitante',esc(o.nome))}<td colspan="2"><span class="l">Impacto na produção</span>${Object.keys(MAN_IMP).map(k=>cb(o.impacto===k,MAN_IMP[k][0])).join('&nbsp;&nbsp;&nbsp;')}</td></tr><tr><td colspan="3"><span class="l">Status</span>${MAN_ST.map(k=>cb(o.status===k,k)).join('&nbsp;&nbsp;&nbsp;')}</td></tr></table>
  <h3>2. DEFEITO / DESCRIÇÃO DO PROBLEMA</h3><table><tr><td style="height:46px;white-space:pre-wrap">${esc(o.defeito)}</td></tr></table>
  <h3>3. TIPO</h3><table><tr><td colspan="2">${MAN_TIPO.map(t=>cb(E.tipo===t,t)).join('&nbsp;&nbsp;')}</td></tr><tr>${L('Equipamento / Sistema',esc(o.equip||''))}${L('Patrimônio / TAG','')}</tr></table>
  <h3>4. SERVIÇOS EXECUTADOS / PROCEDIMENTOS</h3><table><tr><td style="height:60px;white-space:pre-wrap">${esc(E.servicos||'')}</td></tr></table>
  <h3>5. MATERIAIS / PEÇAS UTILIZADOS</h3><table><tr><th style="width:8%">Item</th><th>Descrição</th><th style="width:15%">Qtd.</th><th style="width:15%">Unid.</th></tr>${mats.map((m,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td>${esc(m)}</td><td></td><td></td></tr>`).join('')}</table>
  <h3>6. CONDIÇÃO APÓS A MANUTENÇÃO</h3><table><tr>${MAN_COND.slice(0,3).map(t=>`<td>${cb(E.condicao===t,t)}</td>`).join('')}</tr><tr>${MAN_COND.slice(3).map(t=>`<td>${cb(E.condicao===t,t)}</td>`).join('')}</tr></table>
  <h3>7. HORAS DE SERVIÇO</h3><table><tr>${L('Início',f(E.inicio))}${L('Término',f(E.fim))}${L('Total de horas',tot!=null&&tot>=0?tot.toFixed(2).replace('.',','):'')}${L('Técnico responsável',esc(E.tecnico||''))}</tr></table>
  <h3>8. SEGURANÇA</h3><table><tr><td colspan="4">Condições verificadas? ${cb(0,'Sim')} ${cb(0,'Não')} ${cb(0,'N/A')}</td></tr><tr><td>${cb(0,'Desenergização')}</td><td>${cb(0,'Bloqueio / LOTO')}</td><td>${cb(0,'Ausência de tensão')}</td><td>${cb(0,'EPI')}</td></tr><tr><td>${cb(0,'Isolamento / sinalização')}</td><td>${cb(0,'Permissão de Trabalho')}</td><td colspan="2">${cb(0,'Outros:')}</td></tr></table>
  <h3>9. PENDÊNCIAS / RECOMENDAÇÕES</h3><table><tr><td style="height:40px;white-space:pre-wrap">${esc(E.pendencias||'')}</td></tr></table>
  <h3>10. APROVAÇÃO DO SERVIÇO</h3><table><tr><th>Responsável pela execução</th><th>Responsável pela produção</th></tr><tr>${L('Nome',esc(E.tecnico||''))}${L('Nome','')}</tr><tr>${L('Assinatura','')}${L('Assinatura','')}</tr><tr>${L('Data','')}${L('Data','')}</tr></table>`; }
function vManQr(){ const L=linhasOrd();
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>QR das linhas</h1><div class="sub">${window.claude&&window.claude.online?'Imprima e cole um QR em cada linha. O operador escaneia com a câmera do celular e cai direto no formulário do chamado.':`Atenção: em celular com o app do Claude instalado, o QR abre o chat (o app pega todo link do claude.ai). Nesses casos use o botão <b>Chamar manutenção</b> na Tela da linha. O QR funciona em celular sem o app ou abrindo no navegador.`}</div></div>
   <div class="pg-acts" style="display:flex;gap:10px"><button class="btn sec" data-go="manch">← Chamados</button><button class="btn" data-act="man-qr-imp">${ic('baixar',18,2)}Baixar PDF para imprimir</button></div></div>
  ${window.claude&&window.claude.online?'':`<section class="card" style="margin-bottom:14px"><div class="label" style="margin-bottom:6px">TESTE DO LINK NO CELULAR</div><div class="sub" style="margin:0 0 10px;font-size:13px">Se o QR abre o chat do Claude em vez do painel, escaneie os dois abaixo e me diga qual abre o formulário da Linha 1. O endereço também está escrito, para testar colando no navegador do celular.</div>
   <div style="display:flex;gap:18px;flex-wrap:wrap">${[['A','https://claude.ai/artifact/DAXN22FZGyfvxgVkKaA9WB'],['B','https://claude.ai/code/artifact/628211bf-6762-4b18-9b8e-ee730059e334']].map(([k,u])=>{ const l=u+'?chamado=Linha%201#chamado=Linha%201'; return `<div class="man-qr" style="max-width:260px"><div class="man-qr-t">TESTE ${k}</div>${manQrSvg(l,150)}<small style="word-break:break-all">${esc(l)}</small></div>`; }).join('')}</div></section>`}
  <div class="man-qrs" id="man-qrs">${L.map(l=>`<div class="man-qr"><div class="man-qr-t">CHAMADO DE MANUTENÇÃO</div>${manQrSvg(manLink(l),180)}<b>${esc(l)}</b><small>Escaneie para abrir um chamado desta linha</small></div>`).join('')}</div>`; }

/* --- ações --- */
async function manSalvar(){ const M=S.man, F=M.f; if(M.salv||!F) return; if(!S.db){ toast('Sem conexão com o servidor: o chamado não foi salvo.'); return; }
  if(!F.linha||!F.quando||!F.defeito.trim()||!F.nome.trim()||!F.impacto){ toast('Preencha a linha, a data, o defeito, o impacto e quem está solicitando.'); return; }
  M.salv=true; render(); const agora=new Date().toISOString(), quandoIso=new Date(F.quando).toISOString();
  const base={linha:F.linha,quando:F.quando,defeito:F.defeito.trim(),impacto:F.impacto,nome:F.nome.trim(),equip:(F.equip||'').trim()||null,equipId:F.equipId||null,cracha:F.cracha||null,status:'Aberta',criado:agora,por:S.uid||null,origem:F.origem||(M.ltv?'tela-linha':'painel'),hist:[{em:agora,por:S.uid||null,o:'Chamado aberto'+(F.equip?' · '+String(F.equip).trim():'')+(F.origem==='qr-equip'?' (QR do equipamento)':F.origem==='tablet'?' (tablet da parede'+(F.cracha?', crachá de '+F.nome:', sem crachá: '+F.nome)+')':'')}]};
  toast('Salvando chamado…');
  try{ let n=(S.chamados||[]).reduce((m,c)=>Math.max(m,(+c.numero||0)<900000?(+c.numero||0):0),0)+1, doc=null;
    for(let i=0;i<60&&!doc;i++,n++){ const ref=S.db.doc('chamados/os-'+manNum(n)); const r=await manTrava(ref,5000); if(!r.acquired) continue; const g=await ref.get(); if(g.exists&&g.data()&&g.data().numero) continue; doc=Object.assign({numero:n},base); await ref.set(doc); }
    if(!doc) throw new Error('Não consegui reservar o número da OS. Tente de novo.');
    if(F.impacto==='parou'&&linhasOrd().includes(F.linha)){ const ab=S.paradas.find(p=>p.linha===F.linha&&!p.fim); let pid=ab?ab._id:null;
      if(!pid){ const ref=await S.db.collection('paradas').add({linha:F.linha,motivo:'Manutenção',inicio:quandoIso<=agora?quandoIso:agora,fim:null,por:S.uid||null,obs:'OS '+manNum(doc.numero)+' · '+doc.defeito.slice(0,80),os:doc.numero}); pid=ref&&ref.id; }
      if(pid){ await S.db.doc('chamados/os-'+manNum(doc.numero)).update({paradaId:pid}); doc.paradaId=pid; } }
    if(!(S.chamados||[]).some(c=>c.numero===doc.numero)) S.chamados=[Object.assign({_id:'os-'+manNum(doc.numero)},doc)].concat(S.chamados||[]);
    M._criado=doc.numero; M.novo=false; M.f=null; M.cur=doc.numero; M.ed=null; toast('Chamado criado com sucesso · OS '+manNum(doc.numero)+(doc.paradaId?' · parada da '+doc.linha+' registrada':''));
  }catch(e){ console.warn('[manutenção] abrir chamado',e); manErro(e,'Não foi possível criar o chamado.'); }
  M.salv=false; render(); window.scrollTo(0,0); }
async function manStatus(c,st){ if(!S.db||c.status===st||c._stGrav) return; c._stGrav=true; const agora=new Date().toISOString(), u={status:st,hist:(c.hist||[]).concat([{em:agora,por:S.uid||null,o:c.status+' → '+st+(st==='Cancelada'&&c._motivoCancel?' · motivo: '+c._motivoCancel:'')}]).slice(-200)};
  const E=Object.assign({},c.exec||{}); const loc=()=>{ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); };
  if(st==='Em execução'&&!E.inicio){ E.inicio=loc(); u.exec=E; }
  if(st==='Concluída'){ if(!E.fim) E.fim=loc(); u.exec=E; u.concluidoEm=agora; u.concluidoPor=S.uid||null; } else { u.concluidoEm=null; }
  if(st==='Cancelada'){ u.canceladoEm=agora; u.canceladoPor=S.uid||null; u.motivoCancel=c._motivoCancel||null; } else if(c.canceladoEm){ u.canceladoEm=null; }
  try{ await S.db.doc('chamados/'+c._id).update(u); Object.assign(c,u);
    if(st==='Concluída'&&c.paradaId){ const p=S.paradas.find(x=>x._id===c.paradaId); if(p&&!p.fim){ const fim=E.fim?new Date(E.fim).toISOString():agora; await S.db.doc('paradas/'+p._id).update({fim:fim>p.inicio?fim:agora,porFim:S.uid||null}); toast('OS concluída · '+p.linha+' voltou a rodar'); } else toast('OS '+manNum(c.numero)+' concluída'); }
    else if(st==='Cancelada'&&c.paradaId){ const p=S.paradas.find(x=>x._id===c.paradaId); if(p&&!p.fim){ await S.db.doc('paradas/'+p._id).update({fim:agora>p.inicio?agora:p.inicio,porFim:S.uid||null}); toast('OS '+manNum(c.numero)+' cancelada · parada da '+p.linha+' encerrada'); } else toast('OS '+manNum(c.numero)+' cancelada'); }
    else toast('OS '+manNum(c.numero)+': '+st);
    render(); }catch(e){ console.warn('[manutenção] status',e); manErro(e,'Não foi possível mudar o status da OS '+manNum(c.numero)+'.'); } finally { c._stGrav=false; } }
const MAN_CAMPO={tecnico:'responsável',tipo:'tipo',inicio:'início',fim:'término',diagnostico:'diagnóstico',causa:'causa',servicos:'serviço realizado',condicao:'condição',pendencias:'observações/pendências'};
async function manSalvarAt(c){ const ed=S.man.ed; if(!ed||!S.db||S.man.salvAt) return; const E=Object.assign({},c.exec||{},ed);
  const mud=Object.keys(ed).filter(k=>String((c.exec||{})[k]||'')!==String(ed[k]||'')); if(!mud.length){ S.man.ed=null; render(); return; }
  const agora=new Date().toISOString(); const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Atendimento atualizado: '+mud.map(k=>MAN_CAMPO[k]||k).join(', ')+(ed.tecnico&&ed.tecnico!==(c.exec||{}).tecnico?' · responsável '+ed.tecnico:'')}]).slice(-200);
  S.man.salvAt=true; const b=document.querySelector('[data-act="man-salvar-at"]'); if(b){ b.disabled=true; b.textContent='Salvando…'; }
  try{ await S.db.doc('chamados/'+c._id).update({exec:E,hist}); c.exec=E; c.hist=hist; S.man.ed=null; toast('Atendimento salvo na OS '+manNum(c.numero)+'.'); }
  catch(e){ console.warn('[manutenção] atendimento',e); manErro(e,'Não foi possível salvar o atendimento. Nada foi perdido na tela: tente de novo.'); }
  finally{ S.man.salvAt=false; render(); } }
function manImprimir(sel){ const el=document.querySelector(sel); if(!el) return; document.body.classList.add('man-print'); el.classList.add('man-alvo'); const tira=()=>{ document.body.classList.remove('man-print'); el.classList.remove('man-alvo'); window.removeEventListener('afterprint',tira); }; window.addEventListener('afterprint',tira); setTimeout(()=>{ window.print(); setTimeout(tira,1500); },50); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="man-"]'); if(!b) return; const a=b.dataset.act, M=S.man;
  if(a==='man-novo'){ manNovo(); render(); setTimeout(()=>{ const f=$('#man-form'); if(f) f.scrollIntoView({block:'start',behavior:'smooth'}); },30); return; }
  if(a==='man-novo-x'){ M.novo=false; M.f=null; render(); return; }
  if(a==='man-f'){ M.f[b.dataset.k]=b.dataset.v; render(); return; }
  if(a==='man-salvar'){ manSalvar(); return; }
  if(a==='man-fil'){ M.fil=b.dataset.v; render(); return; }
  if(a==='man-abrir'){ M.cur=+b.dataset.n; M.ed=null; render(); window.scrollTo(0,0); return; }
  if(a==='man-voltar'){ if(M.ed&&!confirmarTroca()) return; M.cur=null; M.ed=null; render(); return; }
  if(a==='man-st'){ const c=manDoc(M.cur); if(c) manStatus(c,b.dataset.v); return; }
  if(a==='man-salvar-at'){ const c=manDoc(M.cur); if(c) manSalvarAt(c); return; }
  if(a==='man-imprimir'){ const c=manDoc(M.cur); if(c) manPdfOs(c); return; }
  if(a==='man-qr-imp'){ manPdfQr(); return; } });
document.addEventListener('input',ev=>{ const t=ev.target; if(t.dataset&&t.dataset.man&&S.man.f){ S.man.f[t.dataset.man]=t.value; return; }
  if(t.dataset&&t.dataset.manE){ S.man.ed=S.man.ed||{}; S.man.ed[t.dataset.manE]=t.value; const b=document.querySelector('[data-act="man-salvar-at"]'); if(b) b.disabled=false; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.dataset&&t.dataset.manE){ S.man.ed=S.man.ed||{}; S.man.ed[t.dataset.manE]=t.value; const b=document.querySelector('[data-act="man-salvar-at"]'); if(b) b.disabled=false; } });
/* não redesenha enquanto a pessoa digita no formulário (o painel atualiza sozinho) */
{ const _rs=rerenderSeguro; rerenderSeguro=function(){ const a=document.activeElement; if(a&&a.closest&&a.closest('.man-form,.man-at')) return; return _rs.apply(this,arguments); }; }
/* QR: ?chamado=Linha%201 abre o formulário já com a linha */
function manLinkInicial(){ if(tabOn()) return tabLinkInicial(); let m=null; try{ m=(location.hash+'&'+location.search+'&'+document.referrer+'&'+(window.name||'')).match(/chamado=([^&#]+)/); }catch(e){} if(!m) return; let linha=''; try{ linha=decodeURIComponent(m[1].replace(/\+/g,' ')); }catch(e){ linha=m[1]; } let t=0;
  const tenta=()=>{ if(S.acs&&S.acs.pronto){ if(viewOk('manch')){ manNovo(manLinhas().includes(linha)?linha:''); S.man.cur=null; go('manch'); } else toast('Seu acesso não inclui abrir chamados. Peça para liberar a Produção ou a Manutenção.'); try{ { const u=new URL(location.href); u.searchParams.delete('chamado'); u.searchParams.delete('equip'); u.hash=''; history.replaceState(null,'',u.pathname+u.search); } }catch(e){} return; } if(++t<60||!(S.acs&&S.acs.pronto)) setTimeout(tenta,500); };
  setTimeout(tenta,300); }
manLinkInicial(); window.addEventListener('hashchange',manLinkInicial);
/* painel por cargo: bloco de chamados + modelo Manutenção */
PNL_BLOCOS.chamados={nome:'Chamados de manutenção',d:'Chamados em aberto, com a máquina parada primeiro.',ic:'chave',s:'m',go:'manch'};
PNL_R.chamados=function(){ const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)).sort((a,b)=>(b.impacto==='parou')-(a.impacto==='parou')||String(a.criado).localeCompare(String(b.criado))); const par=xs.filter(c=>c.impacto==='parou').length;
  return {tit:'Chamados de manutenção',st:par?{c:'crit',t:par+' com máquina parada'}:xs.length?{c:'warn',t:xs.length+' em aberto'}:{c:'ok',t:'Nenhum em aberto'},
   html:xs.length?`<div class="pb-rl">${xs.slice(0,6).map(c=>`<div class="pb-ri ${c.impacto==='parou'?'crit':c.impacto==='reduziu'?'warn':''}"><i></i><div><b>OS ${manNum(c.numero)}</b> <span>${esc(c.linha)} · ${esc(String(c.defeito||'').slice(0,50))}</span></div><em class="num">${esc(c.status)} · ${manIdade(c.criado)}</em></div>`).join('')}</div>`:'<div class="pb-vz">Nenhum chamado em aberto</div>'}; };
PNL_MODELOS.manut={nome:'Manutenção',desc:'Fila de chamados, máquinas paradas e OS para imprimir.',mods:['manut','paradas'],blocos:[{t:'chamados',s:'g'},{t:'paradas',s:'p'}]};
PNL_SUG.manut=['chamados','paradas']; (PNL_SUG.producao||[]).push('chamados');
/* sino do topo: chamado com máquina parada */
NAV_EXTRA.push(()=>{ if(!viewOk('manch')) return []; const n=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)&&c.impacto==='parou').length; return n?[{n,t:'Chamado'+(n>1?'s':'')+' com máquina parada',s:'Manutenção',acao:'manch',c:'crit'}]:[]; });
{ const _ti=tpIr; tpIr=function(acao){ if(acao==='manch'){ S.tp.pop=null; S.man.cur=null; go('manch'); return; } return _ti.apply(this,arguments); }; }

/* impressão em PDF (o navegador do painel não deixa abrir a janela de impressão): gera o PDF e baixa */
async function manBaixar(pdf,nome,msg){ const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  try{ await dl.save({filename:nome,data:pdf.output('blob')}); toast(msg); }catch(e){ if(!e||e.code!=='declined') toast('Não foi possível baixar o PDF.'); } }
async function manPdfQr(){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } const L=linhasOrd(); const pdf=new window.jspdf.jsPDF('p','mm','a4');
  const W=210, cw=95, ch=135, mx=(W-2*cw)/2, my=12;
  L.forEach((l,i)=>{ const k=i%4; if(i&&k===0) pdf.addPage(); const x=mx+(k%2)*cw, y=my+Math.floor(k/2)*ch;
    pdf.setDrawColor(150); pdf.setLineDashPattern([1.5,1.5],0); pdf.rect(x+3,y+3,cw-6,ch-6); pdf.setLineDashPattern([],0);
    pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(31,56,100); pdf.text('CHAMADO DE MANUTENÇÃO',x+cw/2,y+15,{align:'center'});
    desenharQR(pdf,manLink(l),x+(cw-70)/2,y+22,70);
    pdf.setTextColor(0,0,0); pdf.setFontSize(24); pdf.text(l,x+cw/2,y+108,{align:'center'});
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor(90,90,90); pdf.text('Escaneie com o celular para abrir um chamado',x+cw/2,y+118,{align:'center'}); pdf.setTextColor(0,0,0); });
  await manBaixar(pdf,'QR_chamados_manutencao.pdf','PDF com '+L.length+' QR gerado. Abra e imprima.'); }
async function manPdfOs(o){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } const E=o.exec||{}; const pdf=new window.jspdf.jsPDF('p','mm','a4');
  const X=12, W=186; let y=12; const AZ=[31,56,100], CL=[234,240,249];
  const f=s=>s?dm(String(s).slice(0,10))+' '+String(s).slice(11,16):'';
  const box=(x,y0,w,h)=>{ pdf.setDrawColor(154,168,189); pdf.rect(x,y0,w,h); };
  const lab=(t,x,y0)=>{ pdf.setFont('helvetica','bold'); pdf.setFontSize(6.5); pdf.setTextColor(46,85,151); pdf.text(t.toUpperCase(),x+1.5,y0+3); pdf.setTextColor(0,0,0); };
  const val=(t,x,y0,w)=>{ pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(String(t||''),w-3),x+1.5,y0+7.2); };
  const cel=(t,v,x,y0,w,h)=>{ box(x,y0,w,h); lab(t,x,y0); val(v,x,y0,w); };
  const sec=t=>{ y+=2; pdf.setFillColor(...AZ); pdf.rect(X,y,W,5.5,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); pdf.setTextColor(255,255,255); pdf.text(t,X+2,y+3.9); pdf.setTextColor(0,0,0); y+=5.5; };
  const ck=(on,t,x,y0)=>{ pdf.setDrawColor(60); pdf.rect(x,y0-2.6,2.8,2.8); if(on){ pdf.setLineWidth(.4); pdf.line(x+.4,y0-2.2,x+2.4,y0-.2); pdf.line(x+2.4,y0-2.2,x+.4,y0-.2); pdf.setLineWidth(.2); } pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.text(t,x+4,y0); return x+4+pdf.getTextWidth(t)+5; };
  const area=(txt,h)=>{ box(X,y,W,h); pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(String(txt||''),W-4).slice(0,Math.floor(h/4)),X+2,y+4.5); y+=h; };
  pdf.setFont('helvetica','bold'); pdf.setFontSize(20); pdf.setTextColor(...AZ); pdf.text('ORDEM DE SERVIÇO',X,y+8); pdf.setFontSize(9); pdf.setTextColor(46,85,151); pdf.text('M A N U T E N Ç Ã O',X,y+13);
  pdf.setFillColor(...CL); pdf.rect(X+W-58,y,58,16,'F'); box(X+W-58,y,58,16); lab('Nº da OS',X+W-58,y); pdf.setFont('helvetica','bold'); pdf.setFontSize(20); pdf.setTextColor(0,0,0); pdf.text(manNum(o.numero),X+W-56,y+13); y+=18;
  sec('1. ABERTURA DO CHAMADO'); cel('Linha de trabalho',o.linha,X,y,62,10); cel('Data / horário da ocorrência',f(o.quando),X+62,y,62,10); cel('Aberta em',o.criado?dm(o.criado.slice(0,10))+' '+hora(o.criado):'',X+124,y,62,10); y+=10;
  cel('Solicitante',o.nome,X,y,62,10); box(X+62,y,124,10); lab('Impacto na produção',X+62,y); { let x=X+64; Object.keys(MAN_IMP).forEach(k=>{ x=ck(o.impacto===k,MAN_IMP[k][0],x,y+8); }); } y+=10;
  box(X,y,W,9); lab('Status',X,y); { let x=X+2; MAN_ST.forEach(k=>{ x=ck(o.status===k,k,x,y+7.5); }); } y+=9;
  sec('2. DEFEITO / DESCRIÇÃO DO PROBLEMA'); area(o.defeito,11);
  sec('3. TIPO'); box(X,y,W,7); { let x=X+2; MAN_TIPO.forEach(t=>{ x=ck(E.tipo===t,t,x,y+5); }); } y+=7; cel('Equipamento / Sistema',o.equip||'',X,y,124,10); cel('Patrimônio / TAG','',X+124,y,62,10); y+=10;
  sec('4. SERVIÇOS EXECUTADOS / PROCEDIMENTOS'); area(E.servicos,15);
  sec('5. MATERIAIS / PEÇAS UTILIZADOS'); { const cols=[[14,'Item'],[120,'Descrição'],[26,'Qtd.'],[26,'Unid.']]; let x=X; pdf.setFillColor(...CL); pdf.rect(X,y,W,5.5,'F'); cols.forEach(([w,t])=>{ box(x,y,w,5.5); pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(...AZ); pdf.text(t,x+1.5,y+3.9); x+=w; }); pdf.setTextColor(0,0,0); y+=5.5;
    const ms=String(E.materiais||'').split('\n').map(z=>z.trim()).filter(Boolean); while(ms.length<4) ms.push(''); ms.slice(0,8).forEach((m,i)=>{ let x=X; cols.forEach(([w],j)=>{ box(x,y,w,5); pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); if(j===0) pdf.text(String(i+1).padStart(2,'0'),x+1.5,y+3.6); if(j===1) pdf.text(pdf.splitTextToSize(m,w-3)[0]||'',x+1.5,y+3.6); x+=w; }); y+=5; }); }
  sec('6. CONDIÇÃO APÓS A MANUTENÇÃO'); [MAN_COND.slice(0,3),MAN_COND.slice(3)].forEach(r=>{ r.forEach((t,j)=>{ box(X+j*62,y,62,7); ck(E.condicao===t,t,X+j*62+2,y+5); }); y+=7; });
  sec('7. HORAS DE SERVIÇO'); { const tot=E.inicio&&E.fim?((new Date(E.fim)-new Date(E.inicio))/36e5):null; cel('Início',f(E.inicio),X,y,40,10); cel('Término',f(E.fim),X+40,y,40,10); cel('Total de horas',tot!=null&&tot>=0?tot.toFixed(2).replace('.',','):'',X+80,y,36,10); cel('Técnico responsável',E.tecnico||'',X+116,y,70,10); y+=10; }
  sec('8. SEGURANÇA'); box(X,y,W,7); { let x=ck(0,'Sim',X+48,y+5); pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.text('Condições verificadas?',X+2,y+5); x=ck(0,'Não',x,y+5); ck(0,'N/A',x,y+5); } y+=7;
   [['Desenergização','Bloqueio / LOTO','Ausência de tensão','EPI'],['Isolamento / sinalização','Permissão de Trabalho','Outros:','']].forEach(r=>{ r.forEach((t,j)=>{ box(X+j*46.5,y,46.5,7); if(t) ck(0,t,X+j*46.5+2,y+5); }); y+=7; });
  sec('9. PENDÊNCIAS / RECOMENDAÇÕES'); area(E.pendencias,9);
  sec('10. APROVAÇÃO DO SERVIÇO'); pdf.setFillColor(...CL); pdf.rect(X,y,W,5.5,'F'); box(X,y,W/2,5.5); box(X+W/2,y,W/2,5.5); pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(...AZ); pdf.text('Responsável pela execução',X+2,y+3.9); pdf.text('Responsável pela produção',X+W/2+2,y+3.9); pdf.setTextColor(0,0,0); y+=5.5;
   [['Nome',E.tecnico||'',''],['Assinatura','',''],['Data','','']].forEach(([t,a,b2])=>{ cel(t,a,X,y,W/2,8.5); cel(t,b2,X+W/2,y,W/2,8.5); y+=8.5; });
  pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(90,90,90); pdf.text('Gerada pelo Painel de Operação em '+dm(hojeStr())+' às '+hora(new Date().toISOString())+'. Preencher todos os campos aplicáveis e anexar evidências quando necessário.',X,Math.min(y+5,290));
  await manBaixar(pdf,'OS_'+manNum(o.numero)+'_'+String(o.linha||'').replace(/\s+/g,'_')+'.pdf','OS '+manNum(o.numero)+' em PDF. Abra e imprima.'); }

/* ===== Manutenção: painel (diário de bordo) com a linha piscando + chamado direto da Tela da linha (06/10) ===== */
VIEWS.manmon={nome:'Painel da manutenção',ic:'tv',mob:'Painel'}; CRUMB.manmon='Painel da manutenção';
{ const M=MODS.find(m=>m.id==='manut'); if(M&&!M.views.includes('manmon')) M.views.unshift('manmon'); }
S.man.som=false; S.man._abertas=null;
function manAbertos(){ return (S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)); }
function manPeso(c){ return (c.impacto==='parou'?30:c.impacto==='reduziu'?20:10)+(c.status==='Aberta'?5:0); }
function manEventosHoje(){ const h=hojeStr(), ev=[]; (S.chamados||[]).forEach(c=>{ if(c.excluido) return; if(String(c.criado||'').length&&hojeStr(new Date(c.criado))===h) ev.push({em:c.criado,c,t:'Aberto'}); (c.hist||[]).forEach(x=>{ if(x.em&&hojeStr(new Date(x.em))===h) ev.push({em:x.em,c,t:String(x.o||'').split('→').pop().trim(),por:x.por}); }); });
  return ev.sort((a,b)=>String(b.em).localeCompare(String(a.em))); }
function vManMon(){ const M=S.man, h=hojeStr(), dia=M.dia||h, ont=addDias(h,-1), LT=linhasOrd(), agora=new Date().toISOString(), kiosk=document.body.classList.contains('ltv-k'), hj=dia===h;
  if(!document.getElementById('mdfont')){ try{ const l=document.createElement('link'); l.id='mdfont'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'; document.head.appendChild(l); }catch(e){} }
  const doDia=iso=>iso&&hojeStr(new Date(iso))===dia;
  const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&(doDia(c.criado)||doDia(c.concluidoEm)||(c.hist||[]).some(x=>doDia(x.em))||(hj&&!manFechada(c))));
  const cor={crit:'#D64545',warn:'#E0930F',neu:'#1B5C7A',ok:'#2E9E5B'}, peso={crit:0,warn:1,neu:2,ok:3};
  const rs=xs.map(c=>{ const e=manEtapas(c); const resp=manMin(e.ab.em,e.as?e.as.em:(c.status==='Aberta'?agora:null)), rep=e.as?manMin(e.as.em,e.co?e.co.em:agora):null;
    const par=c.paradaId&&S.paradas.find(p=>p._id===c.paradaId); const pm=par?manMin(par.inicio,par.fim||agora):null; let x;
    if(e.co) x={c:'ok',t:'Concluído '+hora(e.co.em),sub:'reparo '+manDur(rep)+(e.as&&e.as.tec?' · '+e.as.tec:'')};
    else if(e.as) x={c:c.impacto==='parou'?'warn':'neu',t:'Em execução',sub:esc(e.as.tec||nomeDe(e.as.por)||'técnico')+' · há <span data-mm-desde="'+esc(e.as.em)+'">'+manDur(rep)+'</span>',pisca:c.impacto==='parou'};
    else if(c.impacto==='parou') x={c:'crit',t:'Máquina parada',sub:'esperando há <span data-mm-desde="'+esc(e.ab.em)+'">'+manDur(resp)+'</span>',pisca:true};
    else if(resp>15) x={c:'crit',t:'Esperando',sub:'ninguém assumiu há <span data-mm-desde="'+esc(e.ab.em)+'">'+manDur(resp)+'</span>',pisca:true};
    else x={c:'warn',t:'Aguardando',sub:'aberto há <span data-mm-desde="'+esc(e.ab.em)+'">'+manDur(resp)+'</span>',pisca:true};
    return {c,e,x,pm,par}; });
  const feito=r=>!!r.e.co;
  const item=r=>{ const {c,e,x}=r, [it]=MAN_IMP[c.impacto]||['—'], n=1+(e.as?1:0)+(e.co?1:0);
    const bt=hj&&!e.co?`<div class="mmb">${c.status==='Aberta'?`<button class="mmbt p" data-act="mm-assumir" data-n="${c.numero}">${ic('play',14,2.4)}Assumir</button>`:`<button class="mmbt p" data-act="mm-concluir" data-n="${c.numero}">${ic('check',14,2.4)}Concluir</button>`}<button class="mmbt" data-act="man-abrir" data-n="${c.numero}" data-ir="1">Abrir OS</button></div>`:'';
    return `<div class="mei ${x.c} ${x.pisca?'pisca':''} ${feito(r)?'fe':''}" data-act="man-abrir" data-n="${c.numero}" data-ir="1" style="cursor:pointer"><span class="meb" style="background:${cor[x.c]}"></span><div class="mec">
     <div class="mea"><b>OS ${manNum(c.numero)}</b><span class="mest2" style="color:${cor[x.c]}">${esc(x.t)}</span></div>
     <div class="mep"><b>${esc(c.defeito||'')}</b>${c.equip?' · '+esc(c.equip):''} · ${esc(it)}</div>
     <div class="mef"><span class="mdstp" title="aberto · assumido · concluído">${[0,1,2].map(k=>`<i class="${n>k?'on':''}"></i>`).join('')}</span><span class="mesub">${x.sub?x.sub:''}</span>${r.pm?`<span class="mesub" style="color:${r.par.fim?'#5E6E76':cor.crit}">· linha parada ${manDur(r.pm)}</span>`:''}</div><div class="mesub mab">aberto ${hora(e.ab.em)}${hojeStr(new Date(e.ab.em))!==dia?' '+dm(hojeStr(new Date(e.ab.em))):''}${c.nome?' por '+esc(c.nome):''}</div>${bt}</div></div>`; };
  const porL={}; LT.forEach(l=>porL[l]=[]); rs.forEach(r=>{ const l=r.c.linha||'Sem linha'; (porL[l]=porL[l]||[]).push(r); });
  const ls=Object.keys(porL).sort((a,b)=>{ const ia=LT.indexOf(a), ib=LT.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b); });
  const pend=rs.filter(r=>!feito(r)), agu=pend.filter(r=>!r.e.as).length, exe=pend.length-agu, par=pend.filter(r=>r.c.impacto==='parou').length, tPar=rs.reduce((a,r)=>a+(r.pm||0),0);
  const body=ls.map(l=>{ const xs=porL[l].slice().sort((a,b)=>(feito(a)?1:0)-(feito(b)?1:0)||peso[a.x.c]-peso[b.x.c]||String(a.c.criado).localeCompare(String(b.c.criado)));
    if(!xs.length) return `<section class="mecol mm0"><header style="border-top-color:#C9D3D8"><b>${esc(l)}</b><span>sem chamado</span></header><div class="mm0b">${ic('check',18,2.4)}</div></section>`;
    return `<section class="mecol"><header style="border-top-color:${feito(xs[0])?cor.ok:cor[xs[0].x.c]}"><b>${esc(l)}</b><span>${xs.filter(feito).length}/${xs.length} concluídos</span></header>${xs.map(item).join('')}</section>`; }).join('');
  const logo=(document.querySelector('.brand img')||{}).src;
  return `<div class="mdw mdb ${kiosk?'k':''}"><div class="mdh">${logo&&kiosk?`<img class="mdlogo" src="${logo}" alt="Colafix">`:''}<div class="mdtt"><div class="mdt">Manutenção · ${hj?'Hoje':dia===ont?'Ontem':esc(dm(dia))}</div><div class="mds">${hj?(pend.length?`<b>${pend.length}</b> em aberto${par?` · <b style="color:${cor.crit}">${par}</b> com máquina parada`:''}`:'Nenhum chamado em aberto'):'Diário de bordo do dia'}${tPar?` · linha parada <b>${manDur(tPar)}</b>`:''}</div></div>
   <div class="mddia"><button data-act="mdb-dia" data-v="${h}" aria-pressed="${hj}">Hoje</button><button data-act="mdb-dia" data-v="${ont}" aria-pressed="${dia===ont}">Ontem</button><input type="date" id="mdb-data" value="${esc(dia)}" max="${h}" aria-label="Escolher dia"></div>
   <div class="mdk ${agu?'r':''}"><b>${agu}</b><span>aguardando</span></div><div class="mdk"><b>${exe}</b><span>em execução</span></div><div class="mdk g"><b>${rs.length-pend.length}</b><span>concluídos</span></div>
   <div class="mdclock num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div>
   <div class="mmh"><button class="mdsair" data-act="mm-som" title="${S.man.som?'Som ligado: toca aviso quando chegar chamado novo':'Som desligado'}" aria-pressed="${!!S.man.som}">${S.man.som?'🔔':'🔕'}</button><button class="mdsair" data-act="ltv-k" title="${kiosk?'Sair da tela cheia':'Tela cheia'}">${kiosk?'✕':ic('tv',16,2)}</button></div></div>
   <div class="megrid mmg">${body}</div></div>`; }
{ const _mv=manView; manView=function(v){ return v==='manmon'?vManMon():_mv(v); }; }
setInterval(()=>{ if(S.view!=='manmon'&&S.view!=='linhatv') return; document.querySelectorAll('[data-mm-desde]').forEach(e=>{ e.textContent=manIdade(e.dataset.mmDesde); }); },15000);
/* som quando chega chamado novo */
function manBip(){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return; const c=S.man._ac||(S.man._ac=new A()); [0,0.35].forEach(t=>{ const o=c.createOscillator(), g=c.createGain(); o.frequency.value=880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.0001,c.currentTime+t); g.gain.exponentialRampToValueAtTime(0.3,c.currentTime+t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+t+0.3); o.start(c.currentTime+t); o.stop(c.currentTime+t+0.32); }); }catch(e){} }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ const ids=manAbertos().filter(c=>c.status==='Aberta').map(c=>c.numero); const ant=S.man._abertas; /* o aviso de chamado novo agora é do bloco MANP */ S.man._abertas=ids; }catch(e){} return x; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mm-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='mm-som'){ S.man.som=!S.man.som; if(S.man.som) manBip(); render(); return; }
  const c=manDoc(+b.dataset.n); if(!c) return;
  if(a==='mm-assumir'){ const nm=(S.uid&&S.nomes[S.uid])||''; manStatus(c,'Em execução').then(()=>{ if(nm&&!(c.exec&&c.exec.tecnico)&&S.db){ const E=Object.assign({},c.exec||{},{tecnico:nm}); S.db.doc('chamados/'+c._id).update({exec:E}).then(()=>{ c.exec=E; render(); }).catch(()=>{}); } }); return; }
  if(a==='mm-concluir'){ const t=Date.now(); if(S.man._cc===c.numero&&t-(S.man._ccT||0)<5000){ S.man._cc=null; manStatus(c,'Concluída'); return; } S.man._cc=c.numero; S.man._ccT=t; toast('Toque de novo em Concluir para fechar a OS '+manNum(c.numero)+(c.paradaId?' e a parada da '+c.linha:'')+'.'); return; } },true);
/* "Abrir OS" vindo do painel: vai para a tela de chamados */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="man-abrir"][data-ir]'); if(!b) return; ev.stopPropagation(); S.man.cur=+b.dataset.n; S.man.ed=null; go('manch'); },true);

/* Tela da linha: botão "Chamar manutenção" que abre o chamado ali mesmo */
S.man.ltv=null;
function manLtvForm(l){ const F=S.man.f||{}; return `<div class="mm-ov" data-act="mlt-fundo"><div class="mm-box" role="dialog" aria-modal="true" aria-label="Chamar manutenção · ${esc(l)}">
   <div class="mm-bh"><div><div class="eyebrow">CHAMAR MANUTENÇÃO</div><h2>${esc(l)}</h2></div><button class="btn sec" data-act="mlt-x" style="width:46px;height:46px;padding:0">✕</button></div>
   <div class="label">O QUE ESTÁ ACONTECENDO?</div><textarea class="txt" data-man="defeito" rows="3" placeholder="Ex.: correia do elevador rompeu" style="font-size:18px">${esc(F.defeito||'')}</textarea>
   <div class="label" style="margin-top:12px">A LINHA…</div><div class="man-imp mm-imp">${Object.keys(MAN_IMP).map(k=>`<button class="man-ib ${MAN_IMP[k][1]}" data-act="mlt-imp" data-v="${k}" aria-pressed="${F.impacto===k}"><i></i>${MAN_IMP[k][0]}</button>`).join('')}</div>
   <div class="label" style="margin-top:12px">SEU NOME</div><input class="txt" data-man="nome" value="${esc(F.nome||'')}" style="font-size:18px;height:52px">
   <button class="btn" data-act="mlt-ok" style="width:100%;height:64px;font-size:20px;margin-top:16px" ${S.man.salv?'disabled':''}>${ic('chave',22,2.2)}${S.man.salv?'Abrindo…':'Chamar manutenção'}</button></div></div>`; }
{ const _vl=vLinhaTv; vLinhaTv=function(){ let h=_vl(); const ab=manAbertos(), tags=[];
    h=h.replace(/<article class="ltv-c ([^"]*)"><header><b>([^<]*)<\/b>/g,(m0,cls,ln)=>{ const l=ln.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"); const cs=ab.filter(c=>c.linha===l); const pisca=cs.some(c=>c.status==='Aberta');
      const tag=cs.length?`<button class="mm-ltag ${pisca?'pisca':''}" data-act="man-abrir" data-n="${cs[0].numero}" data-ir="1">${ic('chave',14,2.2)}OS ${manNum(cs[0].numero)} · ${pisca?'aguardando manutenção':'manutenção trabalhando'} · ${manIdade(cs[0].criado)}</button>`:'';
      tags.push(tag); return `<article class="ltv-c ${cls}"><header><b>${ln}</b><!--mmt:${tags.length-1}-->`; });
    h=h.replace(/<!--mmt:(\d+)-->([\s\S]*?<\/header>)/g,(m0,i,rest)=>rest+tags[+i]);
    h=h.replace(/<\/article>/g,(m0,off,str)=>{ const ini=str.lastIndexOf('<article class="ltv-c',off); const seg=str.slice(ini,off); const mm=seg.match(/<header><b>([^<]*)<\/b>/); if(!mm) return m0; return `<button class="mm-lbtn" data-act="mlt-abrir" data-l="${mm[1]}">${ic('chave',20,2.2)}Chamar manutenção</button></article>`; });
    return h+(S.man.ltv?manLtvForm(S.man.ltv):''); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mlt-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='mlt-fundo'&&ev.target!==b) return;
  if(a==='mlt-abrir'){ const l=b.dataset.l.replace(/&amp;/g,'&'); manNovo(l); S.man.novo=false; if(S.paradas.some(p=>p.linha===l&&!p.fim)) S.man.f.impacto='parou'; S.man.ltv=l; render(); setTimeout(()=>{ const t=document.querySelector('.mm-box textarea'); t&&t.focus(); },50); return; }
  if(a==='mlt-x'||a==='mlt-fundo'){ S.man.ltv=null; S.man.f=null; render(); return; }
  if(a==='mlt-imp'){ S.man.f.impacto=b.dataset.v; document.querySelectorAll('.mm-imp .man-ib').forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===b.dataset.v)); return; }
  if(a==='mlt-ok'){ manSalvar(); return; } },true);
/* depois de salvar pela Tela da linha, fica na Tela da linha */
{ const _ms=manSalvar; manSalvar=async function(){ const daLtv=!!S.man.ltv; await _ms.apply(this,arguments); if(daLtv&&!S.man.f){ S.man.ltv=null; S.man.cur=null; render(); } }; }
{ const _rs=rerenderSeguro; rerenderSeguro=function(){ if(S.man&&S.man.ltv) return; return _rs.apply(this,arguments); }; }

/* ===== Manutenção: escanear o QR de dentro do painel + diário de bordo novo (06/10) ===== */
async function manLerQr(file){ const url=URL.createObjectURL(file); try{ const img=await new Promise((ok,er)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=er; i.src=url; });
    const k=Math.min(1,1600/Math.max(img.width,img.height)), cv=document.createElement('canvas'); cv.width=Math.round(img.width*k); cv.height=Math.round(img.height*k); const cx=cv.getContext('2d'); cx.drawImage(img,0,0,cv.width,cv.height);
    if('BarcodeDetector' in window){ try{ const bd=new BarcodeDetector({formats:['qr_code']}); const r=await bd.detect(cv); if(r&&r[0]&&r[0].rawValue) return r[0].rawValue; }catch(e){} }
    await carregarScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'); const d=cx.getImageData(0,0,cv.width,cv.height); const q=window.jsQR&&window.jsQR(d.data,cv.width,cv.height,{inversionAttempts:'attemptBoth'}); return q?q.data:null;
  }finally{ URL.revokeObjectURL(url); } }
function manEscanear(){ const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.setAttribute('capture','environment'); i.style.display='none';
  i.onchange=async()=>{ const f=i.files&&i.files[0]; i.remove(); if(!f) return; toast('Lendo o QR…'); let t=null; try{ t=await manLerQr(f); }catch(e){ t=null; }
    const m=t&&String(t).match(/chamado=([^&#]+)/); let l=''; if(m){ try{ l=decodeURIComponent(m[1].replace(/\+/g,' ')); }catch(e){ l=m[1]; } }
    if(!l||!manLinhas().includes(l)){ toast(t?'Este QR não é de chamado de linha.':'Não consegui ler o QR. Chegue mais perto e tente de novo.'); return; }
    if(!viewOk('manch')){ toast('Seu acesso não inclui abrir chamados.'); return; }
    manNovo(l); S.man.cur=null; if(S.view==='linhatv'){ S.man.novo=false; if(S.paradas.some(p=>p.linha===l&&!p.fim)) S.man.f.impacto='parou'; S.man.ltv=l; render(); } else { go('manch'); setTimeout(()=>{ const x=$('#man-form'); x&&x.scrollIntoView({block:'start'}); const ta=document.querySelector('[data-man="defeito"]'); ta&&ta.focus(); },60); } };
  document.body.appendChild(i); i.click(); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="man-scan"]'); if(!b) return; ev.preventDefault(); manEscanear(); },true);
const MAN_SCAN_BTN=`<button class="btn man-scanb" data-act="man-scan">${ic('grid',20,2.2)}Escanear QR da linha</button>`;
{ const _vc=vManCh; vManCh=function(){ let h=_vc(); if(S.man.cur==null) h=h.replace('<div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap">','<div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap">'+MAN_SCAN_BTN.replace('class="btn ','class="btn sec ')); return h; }; }
{ const _vl2=vLinhaTv; vLinhaTv=function(){ let h=_vl2(); return h.replace('<div class="ltv-hr">','<div class="ltv-hr">'+MAN_SCAN_BTN.replace('class="btn ','class="btn sec ').replace('<button','<button style="height:42px"')); }; }

/* diário de bordo da manutenção: uma linha por OS com as etapas (aberto → assumido → concluído), tempos e parada */
S.man.dia='';
function manEtapas(c){ const h=c.hist||[], as=h.find(x=>/→\s*Em execução/.test(x.o||'')), co=c.concluidoEm?{em:c.concluidoEm,por:c.concluidoPor}:null; return {ab:{em:c.criado,nome:c.nome},as:as?{em:as.em,por:as.por,tec:(c.exec||{}).tecnico}:null,co}; }
function manMin(a,b){ return a&&b?Math.max(0,Math.round((new Date(b)-new Date(a))/6e4)):null; }
function manDur(m){ return m==null?'—':m<1?'menos de 1 min':m<60?m+' min':Math.floor(m/60)+'h'+String(m%60).padStart(2,'0'); }
function manDiario(){ const M=S.man, h=hojeStr(), dia=M.dia||h, ont=addDias(h,-1), LT=linhasOrd(), agora=new Date().toISOString();
  if(!document.getElementById('mdfont')){ try{ const l=document.createElement('link'); l.id='mdfont'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'; document.head.appendChild(l); }catch(e){} }
  const doDia=iso=>iso&&hojeStr(new Date(iso))===dia;
  const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&(doDia(c.criado)||doDia(c.concluidoEm)||(c.hist||[]).some(x=>doDia(x.em))||(dia===h&&!manFechada(c))));
  const cor={crit:'#D64545',warn:'#E0930F',neu:'#1B5C7A',ok:'#2E9E5B'}, peso={crit:0,warn:1,neu:2,ok:3};
  const rs=xs.map(c=>{ const e=manEtapas(c); const resp=manMin(e.ab.em,e.as?e.as.em:(c.status==='Aberta'?agora:null)), rep=e.as?manMin(e.as.em,e.co?e.co.em:agora):null;
    const par=c.paradaId&&S.paradas.find(p=>p._id===c.paradaId); const pm=par?manMin(par.inicio,par.fim||agora):null; let x;
    if(e.co) x={c:'ok',t:'Concluído '+hora(e.co.em),sub:'reparo '+manDur(rep)+(e.as&&e.as.tec?' · '+e.as.tec:'')};
    else if(e.as) x={c:c.impacto==='parou'?'warn':'neu',t:'Em execução',sub:(e.as.tec||nomeDe(e.as.por)||'técnico')+' · há '+manDur(rep),pisca:c.impacto==='parou'};
    else if(c.impacto==='parou') x={c:'crit',t:'Máquina parada',sub:'esperando há '+manDur(resp),pisca:true};
    else if(resp>15) x={c:'crit',t:'Esperando '+manDur(resp),sub:'ninguém assumiu',pisca:true};
    else x={c:'warn',t:'Aguardando',sub:'aberto há '+manDur(resp),pisca:true};
    return {c,e,x,pm,par}; });
  const feito=r=>!!r.e.co;
  const item=r=>{ const {c,e,x}=r, [it]=MAN_IMP[c.impacto]||['—'], n=1+(e.as?1:0)+(e.co?1:0);
    return `<div class="mei ${x.c} ${x.pisca?'pisca':''} ${feito(r)?'fe':''}" data-act="man-abrir" data-n="${c.numero}" data-ir="1" style="cursor:pointer"><span class="meb" style="background:${cor[x.c]}"></span><div class="mec">
     <div class="mea"><b>OS ${manNum(c.numero)}</b><span>aberto ${hora(e.ab.em)}${hojeStr(new Date(e.ab.em))!==dia?' '+dm(hojeStr(new Date(e.ab.em))):''}${c.nome?' · '+esc(c.nome):''}</span></div>
     <div class="mep"><b>${esc(c.defeito||'')}</b>${c.equip?' · '+esc(c.equip):''} · ${esc(it)}</div>
     <div class="mef"><span class="mdstp" title="aberto · assumido · concluído">${[0,1,2].map(k=>`<i class="${n>k?'on':''}"></i>`).join('')}</span>${x.sub?`<span class="mesub">${esc(x.sub)}</span>`:''}${r.pm?`<span class="mesub" style="color:${r.par.fim?'#5E6E76':cor.crit}">· linha parada ${manDur(r.pm)}</span>`:''}</div></div>
     <div class="mest" style="color:${cor[x.c]}">${esc(x.t)}</div></div>`; };
  const porL={}; rs.forEach(r=>{ const l=r.c.linha||'Sem linha'; (porL[l]=porL[l]||[]).push(r); });
  const ls=Object.keys(porL).sort((a,b)=>{ const ia=LT.indexOf(a), ib=LT.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b); });
  const pend=rs.filter(r=>!feito(r)), agu=pend.filter(r=>!r.e.as).length, exe=pend.length-agu, tPar=rs.reduce((a,r)=>a+(r.pm||0),0);
  const body=ls.map(l=>{ const xs=porL[l].slice().sort((a,b)=>(feito(a)?1:0)-(feito(b)?1:0)||peso[a.x.c]-peso[b.x.c]||String(a.c.criado).localeCompare(String(b.c.criado))); const pior=xs[0].x.c;
    return `<section class="mecol"><header style="border-top-color:${feito(xs[0])?cor.ok:cor[pior]}"><b>${esc(l)}</b><span>${xs.filter(feito).length}/${xs.length} concluídos</span></header>${xs.map(item).join('')}</section>`; }).join('');
  const logo=(document.querySelector('.brand img')||{}).src;
  return `<div class="mdw mdb"><div class="mdh">${logo?`<img class="mdlogo" src="${logo}" alt="Colafix">`:''}<div class="mdtt"><div class="mdt">Manutenção · ${dia===h?'Hoje':dia===ont?'Ontem':esc(dm(dia))}</div><div class="mds">Diário de bordo: aberto → assumido → concluído${tPar?` · linha parada <b>${manDur(tPar)}</b>`:''}</div></div>
   <div class="mddia"><button data-act="mdb-dia" data-v="${h}" aria-pressed="${dia===h}">Hoje</button><button data-act="mdb-dia" data-v="${ont}" aria-pressed="${dia===ont}">Ontem</button><input type="date" id="mdb-data" value="${esc(dia)}" max="${h}" aria-label="Escolher dia"></div>
   <div class="mdk ${agu?'r':''}"><b>${agu}</b><span>aguardando</span></div><div class="mdk"><b>${exe}</b><span>em execução</span></div><div class="mdk g"><b>${rs.length-pend.length}</b><span>concluídos</span></div></div>
   ${ls.length?`<div class="megrid" style="--n:${Math.min(ls.length,5)}">${body}</div>`:`<div class="mdvz">Nenhum chamado ${dia===h?'hoje':dia===ont?'ontem':'em '+esc(dm(dia))}.</div>`}</div>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mdb-"]'); if(!b) return; const a=b.dataset.act, M=S.man;
  if(a==='mdb-dia') M.dia=b.dataset.v===hojeStr()?'':b.dataset.v; else if(a==='mdb-so') M.dso=b.dataset.v; else if(a==='mdb-linha') M.dlin=b.dataset.v; else if(a==='mdb-busca-x') M.dq=''; else return; render(); });
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='mdb-busca') return; S.man.dq=t.value; clearTimeout(S.man._bt); S.man._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=document.getElementById('mdb-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); });
document.addEventListener('change',ev=>{ if(ev.target.id==='mdb-data'){ const v=ev.target.value; S.man.dia=!v||v===hojeStr()?'':v; render(); } });

// ================= mudança para o painel online (Firebase): exportar daqui, importar lá =================
const MIG_COLS=['alxfila','auditorias','cargas','chamados','conferencias','config','diario','entregas','entregasarq','itens','medicoes','ordens','paradas','pcpbase','pcpsnap','pcpvendas','pmxbaixas','pmxfichas','pmxrec','premix','previsoes','ranchos','recebimentos','ritfech','ritplano','sistema'];
S.mig={st:'',msg:''};
function migOnline(){ return !!(window.claude&&window.claude.online); }
function migB64(u8){ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s); }
function migDeB64(b){ const s=atob(b), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }
function migPasso(m){ S.mig.msg=m; rerenderSeguro(); }
async function migExportar(){ if(!S.db||S.mig.st==='exp') return; const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  S.mig={st:'exp',msg:'Lendo os dados…'}; render();
  try{ const out={versao:1,em:new Date().toISOString(),de:'claude',cols:{},nomes:{},arquivos:{},cheias:[]};
    for(const c of MIG_COLS){ migPasso('Lendo '+c+'…'); const q=await S.db.collection(c).limit(1000).get(); out.cols[c]={}; q.docs.forEach(d=>{ out.cols[c][d.id]=d.data(); }); if(q.docs.length>=1000) out.cheias.push(c); }
    migPasso('Lendo os nomes das pessoas…'); const ids=new Set(); const anda=v=>{ if(typeof v==='string'){ if(/^u_[A-Za-z0-9_-]{20,24}$/.test(v)) ids.add(v); } else if(Array.isArray(v)) v.forEach(anda); else if(v&&typeof v==='object') Object.values(v).forEach(anda); }; anda(out.cols);
    const ls=[...ids]; for(let i=0;i<ls.length;i+=50){ try{ const ps=await S.user.profiles(ls.slice(i,i+50)); ls.slice(i,i+50).forEach(id=>{ const n=(ps&&ps[id]&&ps[id].name)||S.nomes[id]||''; if(n) out.nomes[id]=n; }); }catch(e){} }
    const as=new Set(); Object.values(out.cols.ranchos||{}).forEach(r=>{ if(r&&r.asset) as.add(r.asset); }); let k=0;
    for(const id of as){ k++; migPasso('Copiando os PDFs dos ranchos ('+k+' de '+as.size+')…'); try{ const b=await bytesAsset(id); out.arquivos[id]={tipo:'application/pdf',b64:migB64(b)}; }catch(e){} }
    const n=Object.values(out.cols).reduce((a,x)=>a+Object.keys(x).length,0);
    await dl.save({filename:'mudanca_painel_colafix_'+hojeStr()+'.json',data:new Blob([JSON.stringify(out)],{type:'application/json'})});
    S.mig={st:'ok',msg:n+' registros, '+Object.keys(out.nomes).length+' nomes e '+Object.keys(out.arquivos).length+' PDFs exportados.'+(out.cheias.length?' Atenção: '+out.cheias.join(', ')+' chegaram no limite de 1000.':'')};
  }catch(e){ console.warn('mig',e); S.mig={st:'erro',msg:'Não deu certo: '+((e&&e.code)||(e&&e.message)||'erro')}; }
  render(); }
async function migImportar(file){ if(!migOnline()||S.mig.st==='imp') return; let J;
  try{ J=JSON.parse(await file.text()); }catch(e){ toast('Arquivo inválido.'); return; }
  if(!J||!J.cols){ toast('Esse não é o arquivo de mudança do painel.'); return; }
  const n=Object.values(J.cols).reduce((a,x)=>a+Object.keys(x).length,0);
  if(!confirm('Importar '+n+' registros exportados em '+dm(hojeStr(new Date(J.em)))+' '+hora(J.em)+'?\nO que já existir com o mesmo código aqui será substituído.')) return;
  S.mig={st:'imp',msg:'Começando…'}; render();
  try{ const fs=window.claude._fs(), enc=window.claude._enc; let lote=fs.batch(), nl=0, feitos=0;
    const grava=async(p,d)=>{ lote.set(fs.doc(p),enc(d)); nl++; feitos++; if(nl>=300){ await lote.commit(); lote=fs.batch(); nl=0; migPasso('Gravando… '+feitos+' de '+n); } };
    for(const c in J.cols){ for(const id in J.cols[c]){ const d=Object.assign({},J.cols[c][id]); if(c==='config'&&id==='geral') delete d.linkPainel; await grava(c+'/'+id,d); } }
    for(const id in (J.nomes||{})) await grava('perfis/'+id,{nome:J.nomes[id],antigo:true});
    await lote.commit(); let k=0; const ar=Object.keys(J.arquivos||{});
    for(const id of ar){ k++; migPasso('Gravando os PDFs ('+k+' de '+ar.length+')…'); await window.claude._assets.gravarComId(id,migDeB64(J.arquivos[id].b64),J.arquivos[id].tipo); }
    S.mig={st:'ok',msg:'Pronto: '+n+' registros e '+ar.length+' PDFs importados. Recarregue a página.'};
  }catch(e){ console.warn('mig',e); S.mig={st:'erro',msg:'Parou no meio: '+((e&&e.code)||(e&&e.message)||'erro')+'. Pode importar de novo, ele sobrescreve.'}; }
  render(); }
function migCard(){ if(!(S.acs&&S.acs.dono)) return ''; const M=S.mig, on=migOnline(), rod=M.st==='exp'||M.st==='imp';
  return `<section class="card"><h2>${on?'Trazer os dados do painel do Claude':'Mudança para o painel online'}</h2>
   <div class="sub" style="margin:4px 0 12px">${on?'Escolha o arquivo <b>mudanca_painel_colafix_….json</b> que você baixou no painel do Claude. Pode importar de novo depois: ele substitui pelo mais novo.':'Baixa tudo do painel (ordens, ranchos com PDF, entregas, paradas, chamados, base do PCP, ajustes e os nomes de quem registrou) num arquivo para levar ao painel online. Faça no dia da troca, depois que ninguém mais estiver lançando aqui.'}</div>
   <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${on?`<label class="btn" style="${rod?'pointer-events:none;opacity:.6':''}">${ic('baixar',18,2)}Escolher arquivo e importar<input type="file" accept=".json,application/json" id="mig-arq" hidden></label>`:`<button class="btn" data-act="mig-exp" ${rod?'disabled':''}>${ic('baixar',18,2)}${rod?'Exportando…':'Exportar tudo'}</button>`}
    ${M.msg?`<span class="${M.st==='erro'?'t-crit':M.st==='ok'?'t-ok':''}" style="font-size:13.5px">${esc(M.msg)}</span>`:''}</div></section>`; }
{ const _va=vAjustes; vAjustes=function(){ return _va()+migCard(); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mig-exp"]'); if(b) migExportar(); });
document.addEventListener('change',ev=>{ if(ev.target.id==='mig-arq'&&ev.target.files[0]) migImportar(ev.target.files[0]); });

// ================= TABLET DA LINHA: um tablet que anda entre as linhas; escaneia o QR da linha e mostra só ela =================
function tabLS(k,v){ try{ if(v===undefined) return localStorage.getItem('colafix.tablet'+k)||''; if(v===null) localStorage.removeItem('colafix.tablet'+k); else localStorage.setItem('colafix.tablet'+k,v); }catch(e){ return ''; } }
function tabOn(){ return tabLS('')==='1'; }
function tabLinha(){ const l=tabLS('.linha'); return linhasOrd().includes(l)?l:''; }
function tabSet(l){ tabLS('.linha',l); S.ltv.abre=null; S.ltv.trocar=null; S.dbo.aberto=null; S.dbo.f=null; S.dbo.ver=null; }
function tabLinhaDoQr(t){ const m=t&&String(t).match(/chamado=([^&#]+)/); if(!m) return ''; let l=''; try{ l=decodeURIComponent(m[1].replace(/\+/g,' ')); }catch(e){ l=m[1]; } return linhasOrd().includes(l)?l:''; }
function tabEscanear(){ const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.setAttribute('capture','environment'); i.style.display='none';
  i.onchange=async()=>{ const f=i.files&&i.files[0]; i.remove(); if(!f) return; toast('Lendo o QR…'); let t=null; try{ t=await manLerQr(f); }catch(e){ t=null; }
    const l=tabLinhaDoQr(t); if(!l){ toast(t?'Este QR não é de uma linha.':'Não consegui ler o QR. Chegue mais perto e tente de novo.'); return; }
    tabSet(l); toast('Tablet na '+l+'.'); render(); };
  document.body.appendChild(i); i.click(); }
function tabOrdens(l){ const h=hojeStr(), am=amanhaStr(), r=ordemRodando(l);
  const xs=ordAbertas().filter(o=>o.linha===l&&dataEf(o)<=am).sort((a,b)=>(a===r?-1:b===r?1:0)||(dataEf(a)<=h?0:1)-(dataEf(b)<=h?0:1)||seqCmp(a,b));
  return {r,hoje:xs.filter(o=>dataEf(o)<=h).slice(0,8),prox:xs.filter(o=>dataEf(o)>h).slice(0,4)}; }
function tabRancho(o){ if(!o.rancho) return `<div class="tb-rc"><span class="tb-st crit">Sem rancho</span><small>PCP precisa anexar</small></div>`;
  const e=dbEt(o), P=dbPode(), et=(k,t)=>`<span class="tb-et ${e[k]?'on':''}"><i></i>${t}${e[k]?` <b class="num">${hora(e[k].em||e[k])}</b>`:''}</span>`;
  let st='', bt='';
  if(e.conf&&e.conf.falta&&dbMenosAberto(e)) st='<span class="tb-st crit">Veio a menos</span>';
  else if(e.conf) st='<span class="tb-st ok">Conferido</span>';
  else if(e.ent){ st='<span class="tb-st warn">Chegou · falta conferir</span>'; if(P.prod) bt=`<button class="btn tb-cf" data-act="db-conf" data-id="${esc(o._id)}">${ic('check',20,2.4)}Conferir rancho</button>`; }
  else if(e.sep) st='<span class="tb-st neu">Separado · a caminho</span>';
  else st='<span class="tb-st neu">No almox</span>';
  return `<div class="tb-rc"><div class="tb-rh">Rancho <b class="num">${esc(o.rancho)}</b> ${st}</div><div class="tb-ets">${et('sep','Separado')}${et('ent','Entregue')}${et('conf','Conferido')}</div>${bt}</div>`; }
function tabOrd(o,rod){ const pr=entregueDe(o);
  return `<div class="tb-o ${rod?'rod':''}"><div class="tb-oi">${rod?'<span class="tb-rod">RODANDO</span>':`<span class="tb-dt">${dataEf(o)<hojeStr()?'atrasada · ':''}${dm(dataEf(o))}</span>`}
     <div class="tb-on"><b class="num">${esc(o.num)}</b> <span>${esc(codigoDe(o))}</span></div><div class="tb-op">${esc(nomeCurto(o))}</div>
     <div class="tb-oq num">${f0(o.total)} ${esc(uA(o))}${pr>0?` · produzido ${fq(pr)}`:''}</div></div>${tabRancho(o)}</div>`; }
function vTablet(base){ const l=tabLinha(), L=linhasOrd(), clk=`<span class="ltv-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</span>`;
  if(!l) return `<div class="tb tb0"><div class="tb-h"><div><div class="eyebrow">TABLET DA LINHA</div><h1>Em qual linha o tablet está?</h1><div class="sub">Escaneie o QR colado na linha. Ele é o mesmo QR do chamado de manutenção.</div></div>${clk}</div>
    <button class="btn tb-scan" data-act="tab-scan">${ic('grid',30,2.2)}Escanear QR da linha</button>
    <div class="label" style="margin-top:6px">OU TOQUE NA LINHA</div><div class="tb-ls">${L.map(x=>`<button class="tb-lb" data-act="tab-linha" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <button class="lnk" data-act="tab-off" style="align-self:flex-start">Sair do modo tablet</button></div>`;
  let art=''; const re=/<article class="ltv-c[\s\S]*?<\/article>/g; let m; while((m=re.exec(base))){ if(m[0].includes('<b>'+esc(l)+'</b>')){ art=m[0]; break; } }
  const O=tabOrdens(l);
  return `<div class="tb"><div class="tb-h"><div><div class="eyebrow">TABLET DA LINHA</div><h1 class="tb-ln">${esc(l)}</h1></div>
     <div class="tb-hr">${clk}<button class="btn tb-trocar" data-act="tab-scan">${ic('grid',22,2.2)}Trocar de linha</button><button class="btn sec tb-lista" data-act="tab-lista" title="Escolher a linha sem QR">Lista</button></div></div>
   <div class="tb-g"><div class="tb-esq">${art||'<div class="empty">Linha não encontrada.</div>'}</div>
    <section class="card tb-ords"><div class="label">ORDENS DA LINHA</div>
     ${O.hoje.length?O.hoje.map(o=>tabOrd(o,o===O.r)).join(''):'<div class="empty">Nenhuma ordem programada para hoje nesta linha.</div>'}
     ${O.prox.length?`<div class="label" style="margin-top:14px">PRÓXIMAS · ${esc(amanhaLab().toUpperCase())}</div>${O.prox.map(o=>tabOrd(o,false)).join('')}`:''}</section></div>
   <button class="lnk" data-act="tab-off" style="align-self:flex-start;margin-top:4px">Sair do modo tablet</button></div>${dbModal()}`; }
{ const _vt=vLinhaTv; vLinhaTv=function(){ const h=_vt(); if(!tabOn()) return h.replace('<div class="ltv-hr">','<div class="ltv-hr"><button class="btn sec" data-act="tab-on" style="height:42px" title="Para o tablet que anda entre as linhas">'+ic('grid',18,2.2)+'Usar como tablet</button>');
  document.body.classList.add('ltv-k'); const modal=S.man.ltv?manLtvForm(S.man.ltv):''; return vTablet(h)+modal; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="tab-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='tab-on'){ tabLS('','1'); tabLS('.linha',null); try{ document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{}); }catch(e){} render(); return; }
  if(a==='tab-off'){ if(!b.dataset.ok){ b.dataset.ok='1'; b.textContent='Toque de novo para sair do modo tablet'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.ok; b.textContent='Sair do modo tablet'; } },4000); return; } tabLS('',null); tabLS('.linha',null); document.body.classList.remove('ltv-k'); try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){} render(); return; }
  if(a==='tab-scan'){ tabEscanear(); return; }
  if(a==='tab-linha'){ tabSet(b.dataset.v); render(); return; }
  if(a==='tab-lista'){ tabLS('.linha',null); render(); return; } });
/* no tablet, o QR da linha aberto pela câmera do próprio tablet troca a linha em vez de abrir chamado */
function tabLinkInicial(){
    let m=null; try{ m=(location.hash+'&'+location.search).match(/chamado=([^&#]+)/); }catch(e){} if(!m) return; const l0=m[0]; let t=0;
    const tenta=()=>{ if(S.acs&&S.acs.pronto){ const l=tabLinhaDoQr(l0); if(l&&viewOk('linhatv')){ tabSet(l); go('linhatv'); } try{ { const u=new URL(location.href); u.searchParams.delete('chamado'); u.searchParams.delete('equip'); u.hash=''; history.replaceState(null,'',u.pathname+u.search); } }catch(e){} return; } if(++t<60||!(S.acs&&S.acs.pronto)) setTimeout(tenta,500); };
    setTimeout(tenta,300); }










































































/* ===================== EQUIPE E CARGOS (06/10): criar pessoas, cargos e apagar, numa tela só ===================== */
P.lixo='<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>';
P.pessoa='<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>';
P.equipe='<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.2c3 .3 5 2.5 5 5.3"/>';
P.editar='<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>';
P.chaveacesso='<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>';
P.whats='<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.4-2-1.4-2.5-2.5l1-1-1-2z"/>';
P.imprimir='<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>';
P.olho='<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
P.bloq='<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>';
if(!P.tv) P.tv='<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>';
if(!P.analise) P.analise='<path d="M4 19V5M4 19h16"/><path d="M7 15l4-4 3 3 5-6"/>';
const EQ_MOD={inicio:['sol','Meu dia','Resumo do dia do PCP'],silos:['silo','Silos','Medição dos silos e cargas de cimento'],producao:['fabrica','Produção','Programação, calendário, ranchos e diário de bordo'],
  tv:['tv','TV da fábrica','Só a tela da TV das linhas'],telas:['tv','Telas de TV','Apresentação em rodízio'],cal:['calendario','Calendário','Só consulta da semana'],
  paradas:['pausa','Paradas','Parar e voltar a linha (Tela da linha) e abrir chamado'],analise:['analise','Análise PCP','Necessidades, estoques e previsto × realizado'],
  almox:['caixa','Inventário','Contagem, recebimento, auditoria e diário de bordo dos ranchos'],premix:['premix','Almoxarifado','Fichas e receitas de premix'],
  manut:['chave','Manutenção','Atender chamados e QR das linhas'],ajustes:['ajuste','Ajustes e itens','Configurações e cadastro de itens']};
const EQ_COR=['#1B5C7A','#3F7D5C','#8A6326','#A2453D','#5B4E8C','#2F6F73','#7A4E2D','#45607A'];
const EQ_PRONTO_ORD=['almoxpmx','linha','manut','producao','sup','supsis','tv','cal','auditor','conf','conf2','conf3','confa1','confa2','pcp'];
const EQ_PRONTO_DESC={almoxpmx:'Premix, diário de bordo dos ranchos e contagem',linha:'Computador fixo da linha: parar e voltar a linha e abrir chamado',manut:'Atende os chamados de manutenção',producao:'Vê o Meu dia e a programação, sem mudar nada',
  sup:'Inventário: contagem e recebimento de todos os almox',supsis:'Inventário completo, com auditoria',tv:'Só a TV das linhas',cal:'Só consulta do calendário',auditor:'Consulta a auditoria do inventário',
  conf:'Contagem e recebimento do Almox 3',conf2:'Contagem do Almox 30',conf3:'Contagem do Rejunte e da Separação',confa1:'Contagem do Almox 1',confa2:'Contagem do Almox 2',pcp:'Tudo, igual a você'};
const EQ_PRINCIPAIS=12;
if(ACS_PERFIS.almoxpmx) ACS_PERFIS.almoxpmx.nome='Almoxarifado'; if(ACS_PERFIS.manut) ACS_PERFIS.manut.nome='Manutenção'; if(ACS_PERFIS.linha) ACS_PERFIS.linha.nome='Produção · Tela da linha';
S.eq={maisCg:false,aba:'pessoas',q:'',fil:'',nv:null,cartao:null,conf:null,cg:null,cgConf:null,cgMove:'',salv:false,usu:{}};
function eqOnline(){ return !!(window.claude&&window.claude.online&&typeof window.claude.criarUsuario==='function'); }
function eqLimpo(s){ return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'.').replace(/[^a-z0-9._-]/g,'').replace(/\.{2,}/g,'.').replace(/^\.|\.$/g,''); }
function eqUsuSug(nome){ const p=eqLimpo(nome).split('.').filter(Boolean); return p.length>1?p[0]+'.'+p[p.length-1]:(p[0]||''); }
function eqSenha(){ const L='abcdefghjkmnpqrstuvwxyz', a=new Uint32Array(7); crypto.getRandomValues(a); return [0,1,2].map(i=>L[a[i]%L.length]).join('')+[3,4,5,6].map(i=>a[i]%10).join(''); }
function eqIni(n){ return String(n||'?').trim().split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase()||'?'; }
function eqCorDe(id){ let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return EQ_COR[h%EQ_COR.length]; }
function eqVis(d){ return d&&d._id!=='_geral'&&!d.apagado; }
/* Projeto novo do Firebase (13/10/2026): as pessoas que vieram na cópia ainda não têm login aqui ("sem login").
   Recriar com o mesmo usuário (pode ser a mesma senha) herda o cargo e os ajustes por pessoa; o cadastro antigo é marcado como apagado. */
function eqProjeto(){ const c=window.PAINEL_CONFIG||{}; return !c.projetoAntigo&&c.firebase&&c.firebase.projectId||''; }
function eqSemLogin(id){ const E=S.eq; return !!eqProjeto()&&id!==S.uid&&!!E.proj&&E.proj[id]==='importado'; } /* perfil que veio na cópia (backup importado) */
function eqAntigoDe(usu){ const E=S.eq, u=eqLimpo(usu); return u?(S.acs.lista||[]).find(d=>eqVis(d)&&eqSemLogin(d._id)&&eqLimpo(E.usu[d._id]||'')===u)||null:null; }
async function eqHerdar(uid,ant,cargo){ let c=Object.assign({},ant); delete c._id; if(cargo&&cargo!==ant.perfil) c=Object.assign(c,acsPreset(cargo));
  Object.assign(c,{herdadoDe:ant._id,ativo:true,apagado:false,alteradoEm:new Date().toISOString(),alteradoPor:S.uid||null});
  try{ await S.db.doc('acessos/'+uid).set(c); }catch(e){ erro(e); return false; }
  try{ await S.db.doc('acessos/'+ant._id).update({apagado:true,ativo:false,migradoPara:uid}); }catch(e){} return true; }
/* cargos: os prontos (do painel) + os criados por você */
function eqCargos(){ const ps=(S.acs.lista||[]).filter(eqVis); const n=k=>ps.filter(d=>(d.perfil||'outro')===k).length;
  const ord=k=>{ const i=EQ_PRONTO_ORD.indexOf(k); return i<0?99:i; };
  const prontos=Object.entries(ACS_PERFIS).filter(([k])=>k!=='outro').map(([k,v])=>({k,nome:v.nome,desc:EQ_PRONTO_DESC[k]||'',mods:v.mods||[],pronto:true,n:n(k)})).sort((a,b)=>ord(a.k)-ord(b.k));
  const meus=Object.entries(pnlCargos()).map(([k,v])=>({k,nome:v.nome||'Cargo sem nome',desc:v.desc||'',mods:v.mods||[],pronto:false,n:n(k)})).sort((a,b)=>a.nome.localeCompare(b.nome));
  return {meus,prontos,todos:[...meus,...prontos]}; }
function eqModsDe(d){ const c=pnlCargo(d.perfil); return c?(c.mods||[]):(d.mods||[]); }
function eqIcones(mods,max){ max=max||6; const ms=(mods||[]).filter(m=>EQ_MOD[m]); return `<span class="eq-ics">${ms.slice(0,max).map(m=>`<span class="eq-mi" title="${esc(EQ_MOD[m][1])}">${ic(EQ_MOD[m][0],15,2)}</span>`).join('')}${ms.length>max?`<span class="eq-mi more">+${ms.length-max}</span>`:''}</span>`; }
function eqUsuario(id){ return S.eq.usu[id]||''; }
async function eqCarregaUsu(){ const E=S.eq; if(!S.user) return; const ids=[...(S.acs.lista||[]),...(S.acs.pedidos||[])].map(x=>x._id).filter(i=>i&&i!=='_geral'&&!(i in E.usu)); if(!ids.length) return;
  ids.forEach(i=>E.usu[i]=''); try{ const ps=await S.user.profiles(ids); let mud=false; E.proj=E.proj||{}; ids.forEach(i=>{ const p=ps&&ps[i]; if(p){ E.proj[i]=p.importado&&!p.projeto?'importado':(p.projeto||''); if(E.proj[i]==='importado') mud=true; if(p.email&&!String(p.email).includes('@')){ E.usu[i]=p.email; mud=true; } if(p.name&&!S.nomes[i]){ S.nomes[i]=p.name; mud=true; } } }); if(mud) rerenderSeguro(); }catch(e){} }
function eqSelCargo(sel,attrs){ const C=eqCargos(); return `<select class="txt eq-sel" ${attrs||''}>${C.meus.length?`<optgroup label="Seus cargos">${C.meus.map(c=>`<option value="${c.k}" ${c.k===sel?'selected':''}>${esc(c.nome)}</option>`).join('')}</optgroup>`:''}<optgroup label="Cargos prontos">${C.prontos.map(c=>`<option value="${c.k}" ${c.k===sel?'selected':''}>${esc(c.nome)}</option>`).join('')}</optgroup>${sel&&!C.todos.some(c=>c.k===sel)?`<option value="${esc(sel)}" selected>Personalizado</option>`:''}</select>`; }

vAcessos=function(){ const A=S.acs, E=S.eq; if(!A.dono) return acsCaixa('Somente a responsável','Esta tela é só da dona do painel.');
  eqCarregaUsu();
  const abas=`<div class="eq-tabs" role="tablist">${[['pessoas','Pessoas',(A.lista||[]).filter(eqVis).length],['cargos','Cargos',eqCargos().todos.length]].map(([k,l,n])=>`<button role="tab" data-act="eq-aba" data-v="${k}" aria-selected="${E.aba===k}">${ic(k==='pessoas'?'equipe':'chaveacesso',18,2)}${l}<small>${n}</small></button>`).join('')}</div>`;
  const novo=E.aba==='pessoas'?(eqOnline()?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-act="eq-lote">${ic('equipe',18,2)}Várias pessoas</button><button class="btn" data-act="eq-novo">${ic('mais',18,2.4)}Nova pessoa</button></div>`:''):`<button class="btn" data-act="eq-cg-novo">${ic('mais',18,2.4)}Novo cargo</button>`;
  return `${banner()}
  <div class="head eq-head"><div><div class="eyebrow">AJUSTES</div><h1>Equipe e cargos</h1><div class="sub">${E.aba==='pessoas'?'Crie o acesso de cada pessoa e escolha o cargo dela. O cargo decide o que ela vê.':'Cada cargo é um pacote de telas. Mude um cargo e todos que o usam mudam juntos.'}</div></div>${novo}</div>
  ${ajAbas('acessos')}${abas}
  ${E.aba==='pessoas'?eqPessoas():eqCargosTela()}
  ${E.lote?eqLoteModal():''}${E.nv?eqNovoModal():''}${E.cartao?eqCartaoModal():''}${E.cg?eqCargoModal():''}`; };

function eqPessoas(){ const A=S.acs, E=S.eq, C=eqCargos();
  const pend=(A.pedidos||[]).filter(p=>!(A.lista||[]).some(l=>l._id===p._id)&&!p.criadoPeloPcp);
  const q=eqLimpo(E.q).replace(/\./g,' ');
  let ps=(A.lista||[]).filter(eqVis).map(d=>Object.assign({},d,{nome:acsNome(d._id)})).sort((a,b)=>a.nome.localeCompare(b.nome));
  const cnt={}; ps.forEach(d=>{ const k=d.perfil||'outro'; cnt[k]=(cnt[k]||0)+1; });
  if(E.fil) ps=ps.filter(d=>(d.perfil||'outro')===E.fil);
  if(q) ps=ps.filter(d=>eqLimpo(d.nome+' '+eqUsuario(d._id)+' '+pnlPerfilNome(d.perfil)).replace(/\./g,' ').includes(q));
  const chips=Object.keys(cnt).length>1?`<div class="eq-fil"><button class="chip" data-act="eq-fil" data-v="" aria-pressed="${!E.fil}">Todos · ${(A.lista||[]).filter(eqVis).length}</button>${Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<button class="chip" data-act="eq-fil" data-v="${esc(k)}" aria-pressed="${E.fil===k}">${esc(pnlPerfilNome(k))} · ${n}</button>`).join('')}</div>`:'';
  const card=d=>{ const id=d._id, bl=d.ativo===false, u=eqUsuario(id), conf=E.conf===id, sl=eqSemLogin(id);
    if(sl&&!conf) return `<article class="eq-p off"><div class="eq-pt"><span class="eq-av" style="background:${eqCorDe(id)}">${esc(eqIni(d.nome))}</span><div class="eq-pn"><b>${esc(d.nome)}</b><small>${u?'@'+esc(u):'&nbsp;'} · ${esc(pnlPerfilNome(d.perfil))}</small></div><span class="pill warn">sem login</span></div>
     <div class="eq-pm sub" style="font-size:12.5px">Veio da cópia. Recrie o login (pode ser a mesma senha): o cargo e os ajustes continuam.</div>
     <div class="eq-pa"><button class="btn" data-act="eq-recriar" data-id="${esc(id)}">Recriar login</button><button class="eq-lk del" data-act="eq-conf" data-id="${esc(id)}">${ic('lixo',15,2)}Apagar</button></div></article>`;
    return `<article class="eq-p ${bl?'off':''}">
     <div class="eq-pt"><span class="eq-av" style="background:${eqCorDe(id)}">${esc(eqIni(d.nome))}</span><div class="eq-pn"><b>${esc(d.nome)}</b><small>${u?'@'+esc(u):'&nbsp;'}</small></div>${bl?'<span class="pill crit">bloqueado</span>':''}</div>
     <label class="eq-pc"><span>Cargo</span>${eqSelCargo(d.perfil||'outro',`data-eq-cargo="${esc(id)}"`)}</label>
     <div class="eq-pm">${eqIcones(eqModsDe(d),7)}</div>
     ${conf?`<div class="eq-conf"><b>Apagar ${esc(d.nome)}?</b><span>A pessoa perde o acesso na hora. O que ela já registrou continua no histórico.${u?' O usuário @'+esc(u)+' não pode ser usado de novo.':''}</span><div><button class="btn warn" data-act="eq-apagar" data-id="${esc(id)}">${ic('lixo',16,2)}Sim, apagar</button><button class="btn sec" data-act="eq-conf-x">Não</button></div></div>`
      :`<div class="eq-pa"><button class="eq-lk" data-act="eq-bloq" data-id="${esc(id)}">${ic(bl?'check':'bloq',15,2)}${bl?'Desbloquear':'Bloquear'}</button><button class="eq-lk" data-act="acs-editar" data-id="${esc(id)}">${ic('editar',15,2)}Ajustar telas</button><button class="eq-lk del" data-act="eq-conf" data-id="${esc(id)}">${ic('lixo',15,2)}Apagar</button></div>`}
    </article>`; };
  const ed=A.ed?acsEditor(A.ed):'';
  return `${pend.length?`<section class="card eq-pend"><h2>${ic('sino',18,2)} Pedindo acesso · ${pend.length}</h2><div class="sub" style="margin:2px 0 8px">Pessoas que entraram e ainda não têm cargo. Escolha o cargo e libere.</div>
    ${pend.map(p=>`<div class="eq-pr"><span class="eq-av sm" style="background:${eqCorDe(p._id)}">${esc(eqIni(acsNome(p._id)))}</span><div class="eq-pn"><b>${esc(acsNome(p._id))}</b><small>${eqUsuario(p._id)?'@'+esc(eqUsuario(p._id))+' · ':''}${p.em?'pediu '+dia(p.em).toLowerCase()+' às '+hora(p.em):''}</small></div>
     ${eqSelCargo('',`id="eq-pp-${esc(p._id)}"`).replace('<optgroup','<option value="" selected>Escolha o cargo…</option><optgroup')}<button class="btn" data-act="eq-liberar" data-id="${esc(p._id)}">Liberar</button><button class="btn sec" data-act="eq-recusar" data-id="${esc(p._id)}">Recusar</button></div>`).join('')}</section>`:''}
   ${ed}
   ${(()=>{ const n=ps.filter(d=>eqSemLogin(d._id)).length; return n?`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink)"><b>${n} ${n===1?'pessoa veio':'pessoas vieram'} da cópia e ainda não ${n===1?'tem':'têm'} login neste painel.</b> Toque em <b>Recriar login</b> em cada uma. Pode usar o mesmo usuário e a mesma senha de antes; o cargo e os ajustes continuam.</div>`:''; })()}
   <div class="eq-bar"><label class="eq-q">${ic('lupa',18,2)}<input class="txt" id="eq-q" placeholder="Procurar pessoa, usuário ou cargo…" value="${esc(E.q)}" autocomplete="off"></label>${chips}</div>
   <div class="eq-grid">
    <article class="eq-p eu"><div class="eq-pt"><span class="eq-av" style="background:var(--teal-strong)">${esc(eqIni(S.nomes[S.uid]||'PCP'))}</span><div class="eq-pn"><b>${esc(S.nomes[S.uid]||'Você')}</b><small>dona do painel</small></div><span class="pill ok">master · tudo</span></div><div class="eq-pm sub" style="font-size:12.5px">Você vê e muda tudo, cria pessoas e cargos.</div></article>
    ${ps.map(card).join('')}
    ${eqOnline()&&!E.q&&!E.fil?`<button class="eq-p eq-add" data-act="eq-novo">${ic('mais',26,2)}<b>Nova pessoa</b><small>usuário, senha e cargo em um passo</small></button>`:''}
   </div>
   ${!ps.length&&(E.q||E.fil)?'<div class="empty">Ninguém encontrado com esse filtro.</div>':''}
   ${!eqOnline()?'<div class="sub" style="font-size:12.5px">Nesta versão do painel as pessoas entram com a conta do claude.ai e aparecem em “Pedindo acesso”. Na versão online você cria o usuário e a senha aqui.</div>':''}`; }

function eqNovoModal(){ const N=S.eq.nv, C=eqCargos(), sel=N.cargo;
  const cartao=c=>`<button class="eq-cgo ${sel===c.k?'on':''}" data-act="eq-nv-cargo" data-v="${esc(c.k)}" aria-pressed="${sel===c.k}"><b>${esc(c.nome)}</b>${eqIcones(c.mods,5)}${c.desc?`<small>${esc(c.desc)}</small>`:''}</button>`;
  return `<div class="dbmodal eq-modal" data-eq-fundo="nv"><div class="dbmbox eq-box" role="dialog" aria-modal="true" aria-labelledby="eq-nv-t">
   <div class="eq-mh"><div><div class="eyebrow">NOVA PESSOA</div><h2 id="eq-nv-t">Criar acesso</h2></div><button class="eq-x" data-act="eq-nv-x" aria-label="Fechar">✕</button></div>
   <div class="eq-mb">
    <div class="eq-steps"><span class="on">1 Quem é</span><span class="${N.nome?'on':''}">2 Cargo</span><span class="${N.nome&&sel?'on':''}">3 Pronto</span></div>
    <div class="eq-f2"><label class="eq-f"><span>Nome</span><input class="txt" id="eq-nv-nome" value="${esc(N.nome)}" placeholder="Ex.: João da Silva" autocomplete="off"></label>
     <label class="eq-f"><span>Usuário para entrar</span><div class="eq-in"><span class="eq-pre">@</span><input class="txt" id="eq-nv-usu" value="${esc(N.usu)}" placeholder="joao.silva" autocapitalize="none" spellcheck="false" autocomplete="off"></div></label>
     <label class="eq-f"><span>Senha inicial</span><div class="eq-in"><input class="txt num" id="eq-nv-sen" value="${esc(N.sen)}" autocomplete="off" spellcheck="false"><button type="button" class="eq-lk" data-act="eq-nv-gera" title="Gerar outra senha">${ic('relogio',15,2)}Outra</button></div><small>A pessoa pode trocar depois, tocando no nome dela no topo.</small></label></div>
    <div class="label" style="margin:18px 0 8px">CARGO</div>
    ${C.meus.length?`<div class="label" style="margin:0 0 8px">SEUS CARGOS</div><div class="eq-cgs">${C.meus.map(cartao).join('')}</div><div class="label" style="margin:14px 0 8px">CARGOS PRONTOS</div>`:''}
    <div class="eq-cgs">${(S.eq.maisCg||C.prontos.slice(EQ_PRINCIPAIS).some(c=>c.k===sel)?C.prontos:C.prontos.slice(0,EQ_PRINCIPAIS)).map(cartao).join('')}</div>
    ${C.prontos.length>EQ_PRINCIPAIS&&!S.eq.maisCg&&!C.prontos.slice(EQ_PRINCIPAIS).some(c=>c.k===sel)?`<button class="eq-lk" data-act="eq-mais" style="margin-top:8px">${ic('mais',15,2.2)}Mostrar todos os cargos prontos (${C.prontos.length})</button>`:''}
    <div class="eq-err" id="eq-nv-err">${esc(N.err||'')}</div>
   </div>
   <div class="eq-mf"><button class="btn sec" data-act="eq-nv-x">Cancelar</button><button class="btn" data-act="eq-nv-criar" ${S.eq.salv?'disabled':''}>${S.eq.salv?'Criando…':ic('check',18,2.4)+'Criar acesso'}</button></div>
  </div></div>`; }

function eqLinkPainel(){ return (window.claude&&window.claude.link)||(S.cfg&&S.cfg.linkPainel)||location.href.split(/[?#]/)[0]; }
function eqLinkDe(c){ const a=typeof eqAreaDe==='function'&&c&&c.perfil?eqAreaDe(c.perfil):''; return eqLinkPainel()+(a?'?area='+a:''); }
function eqTextoCartao(c){ return `Seu acesso ao Painel de Operação Colafix\n\nEndereço: ${eqLinkDe(c)}\nUsuário: ${c.usu}\nSenha: ${c.sen}\n\nNo primeiro acesso, toque no seu nome no topo e troque a senha.`; }
function eqCartaoModal(){ const c=S.eq.cartao;
  return `<div class="dbmodal eq-modal" data-eq-fundo="cartao"><div class="dbmbox eq-box sm" role="dialog" aria-modal="true">
   <div class="eq-ok">${ic('check',30,2.6)}</div><h2 style="text-align:center;margin-top:10px">Acesso criado</h2><div class="sub" style="text-align:center">Passe estes dados para ${esc(c.nome.split(' ')[0])}. A senha não aparece de novo depois de fechar.</div>
   <div class="eq-card" id="eq-cartao"><div class="eq-card-h"><b>Painel de Operação</b><span>COLAFIX</span></div>
    <div class="eq-card-r"><span>Nome</span><b>${esc(c.nome)}</b></div><div class="eq-card-r"><span>Cargo</span><b>${esc(c.cargo)}</b></div>
    <div class="eq-card-r big"><span>Usuário</span><b class="num">${esc(c.usu)}</b></div><div class="eq-card-r big"><span>Senha</span><b class="num">${esc(c.sen)}</b></div>
    <div class="eq-card-r"><span>Endereço</span><b class="num" style="font-size:12px;word-break:break-all">${esc(eqLinkDe(c))}</b></div></div>
   <div class="eq-cbts"><button class="btn sec" data-act="eq-c-copiar">${ic('copiar',16,2)}Copiar</button><button class="btn sec" data-act="eq-c-zap">${ic('whats',16,2)}WhatsApp</button><button class="btn sec" data-act="eq-c-print">${ic('imprimir',16,2)}Imprimir</button></div>
   <div class="eq-mf" style="border:0;padding:6px 0 0"><button class="btn sec" data-act="eq-c-outra">${ic('mais',16,2.2)}Criar outra pessoa</button><button class="btn" data-act="eq-c-x">Concluir</button></div>
  </div></div>`; }

function eqCargosTela(){ const C=eqCargos(), E=S.eq;
  const card=c=>{ const conf=E.cgConf===c.k, outros=C.todos.filter(x=>x.k!==c.k);
    return `<article class="eq-c ${c.pronto?'pronto':''}"><div class="eq-ct"><b>${esc(c.nome)}</b><span class="pill ${c.pronto?'neu':'prod'}">${c.pronto?'pronto':'seu'}</span></div>
     ${c.desc?`<div class="sub" style="font-size:12.5px;margin:0">${esc(c.desc)}</div>`:''}
     <div class="eq-cm">${(c.mods||[]).filter(m=>EQ_MOD[m]).map(m=>`<span class="eq-tg">${ic(EQ_MOD[m][0],14,2)}${esc(EQ_MOD[m][1])}</span>`).join('')||'<span class="sub" style="font-size:12px">nenhuma tela</span>'}</div>
     <div class="eq-cn">${ic('equipe',15,2)}${c.n} ${c.n===1?'pessoa':'pessoas'}</div>
     ${conf?`<div class="eq-conf"><b>Apagar o cargo ${esc(c.nome)}?</b>${c.n?`<span>${c.n} ${c.n===1?'pessoa usa':'pessoas usam'} este cargo. Passar para:</span>${eqSelCargo(E.cgMove||outros[0].k,'id="eq-cg-move"')}`:'<span>Ninguém usa este cargo.</span>'}<div><button class="btn warn" data-act="eq-cg-apagar" data-id="${esc(c.k)}">${ic('lixo',16,2)}Sim, apagar</button><button class="btn sec" data-act="eq-cg-conf-x">Não</button></div></div>`
      :`<div class="eq-pa">${c.pronto?`<button class="eq-lk" data-act="eq-cg-dup" data-id="${esc(c.k)}">${ic('copiar',15,2)}Copiar para ajustar</button>`:`<button class="eq-lk" data-act="eq-cg-ed" data-id="${esc(c.k)}">${ic('editar',15,2)}Editar</button><button class="eq-lk" data-act="eq-cg-tela" data-id="${esc(c.k)}">${ic('grid',15,2)}Tela inicial</button><button class="eq-lk del" data-act="eq-cg-conf" data-id="${esc(c.k)}">${ic('lixo',15,2)}Apagar</button>`}</div>`}
    </article>`; };
  return `${C.meus.length?`<div class="label" style="margin:0">SEUS CARGOS · ${C.meus.length}</div><div class="eq-grid">${C.meus.map(card).join('')}</div>`:''}
   <div class="eq-grid">${C.meus.length?'':`<button class="eq-c eq-add" data-act="eq-cg-novo">${ic('mais',26,2)}<b>Novo cargo</b><small>escolha as telas que ele vê</small></button>`}</div>
   <div class="label" style="margin:6px 0 0">CARGOS PRONTOS · ${C.prontos.length}</div><div class="sub" style="font-size:12.5px;margin:0">Não dá para mudar nem apagar estes. Use “Copiar para ajustar” para criar um seu a partir deles.</div>
   <div class="eq-grid">${(S.eq.maisCg?C.prontos:C.prontos.slice(0,EQ_PRINCIPAIS)).map(card).join('')}</div>
   ${C.prontos.length>EQ_PRINCIPAIS?`<button class="eq-lk" data-act="eq-mais">${ic(S.eq.maisCg?'seta':'mais',15,2.2)}${S.eq.maisCg?'Mostrar só os principais':'Mostrar todos os cargos prontos ('+C.prontos.length+')'}</button>`:''}`; }

function eqCargoModal(){ const G=S.eq.cg, f=G.f, temAlx=f.mods.includes('almox');
  return `<div class="dbmodal eq-modal" data-eq-fundo="cg"><div class="dbmbox eq-box" role="dialog" aria-modal="true" aria-labelledby="eq-cg-t">
   <div class="eq-mh"><div><div class="eyebrow">${G.novo?'NOVO CARGO':'EDITAR CARGO'}</div><h2 id="eq-cg-t">${esc(f.nome||'Cargo sem nome')}</h2></div><button class="eq-x" data-act="eq-cg-x" aria-label="Fechar">✕</button></div>
   <div class="eq-mb">
    <div class="eq-f2"><label class="eq-f"><span>Nome do cargo</span><input class="txt" id="eq-cg-nome" value="${esc(f.nome)}" placeholder="Ex.: Líder da Linha 2" autocomplete="off"></label>
     <label class="eq-f" style="grid-column:span 2"><span>Para que serve (opcional)</span><input class="txt" id="eq-cg-desc" value="${esc(f.desc||'')}" placeholder="Ex.: registra paradas e vê a programação da linha" autocomplete="off"></label></div>
    <div class="label" style="margin:18px 0 8px">O QUE ESTE CARGO VÊ</div>
    <div class="eq-mods">${ACS_MODS.map(([k])=>{ const M=EQ_MOD[k]; if(!M) return ''; const on=f.mods.includes(k); return `<button class="eq-mod ${on?'on':''}" data-act="eq-cg-mod" data-v="${k}" aria-pressed="${on}"><span class="eq-mic">${ic(M[0],20,2)}</span><span><b>${esc(M[1])}</b><small>${esc(M[2])}</small></span><span class="eq-ck">${on?ic('check',14,3):''}</span></button>`; }).join('')}</div>
    ${temAlx?`<div class="label" style="margin:16px 0 8px">INVENTÁRIO · ALMOXARIFADOS</div><div class="eq-fil">${ALX_LOCS.map(l=>`<button class="chip" data-act="eq-cg-loc" data-v="${l}" aria-pressed="${f.locais.includes(l)}">${esc(ALX_LOC[l])}</button>`).join('')}</div>
     <div class="label" style="margin:14px 0 8px">NO INVENTÁRIO PODE</div><div class="eq-fil">${ACS_ACOES.map(([k,n])=>`<button class="chip" data-act="eq-cg-acao" data-v="${k}" aria-pressed="${!!f[k]}">${esc(n)}</button>`).join('')}</div>`:''}
    <div class="eq-err">${esc(G.err||'')}</div>
   </div>
   <div class="eq-mf">${G.novo?'<span class="sub" style="font-size:12.5px;margin:0">A tela inicial começa com os blocos sugeridos para essas telas.</span>':'<span></span>'}<div style="display:flex;gap:8px"><button class="btn sec" data-act="eq-cg-x">Cancelar</button><button class="btn" data-act="eq-cg-salvar" ${S.eq.salv?'disabled':''}>${S.eq.salv?'Salvando…':ic('check',18,2.4)+'Salvar cargo'}</button></div></div>
  </div></div>`; }

async function eqGravaCargos(muda){ const D=pnlClone(S.pnl.dados)||{}; D.cargos=D.cargos||{}; muda(D.cargos); D.em=new Date().toISOString(); await S.db.doc('config/paineis').set(D); S.pnl.dados=D; }
function eqBlocosSug(mods){ const out=[]; (mods||[]).forEach(m=>(PNL_SUG[m]||[]).forEach(k=>{ const B=PNL_BLOCOS[k]; if(!B||out.some(b=>b.t===k)) return; const nb={t:k,s:B.s}; if(B.par==='linha') nb.p={linha:linhasOrd()[0]}; if(B.par==='ritmo') nb.p={ritmo:'total'}; out.push(nb); })); return out.slice(0,6); }

document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="eq-"]'); if(!b||b.disabled) return; const E=S.eq, a=b.dataset.act, A=S.acs; if(!A.dono) return;
  if(a==='eq-aba'){ E.aba=b.dataset.v; E.conf=null; E.cgConf=null; render(); return; }
  if(a==='eq-fil'){ E.fil=b.dataset.v; render(); return; }
  if(a==='eq-mais'){ E.maisCg=!E.maisCg; render(); return; }
  if(a==='eq-novo'||a==='eq-c-outra'){ E.cartao=null; E.nv={nome:'',usu:'',sen:eqSenha(),cargo:'',mexeu:false,err:''}; render(); setTimeout(()=>{ const i=$('#eq-nv-nome'); i&&i.focus(); },40); return; }
  if(a==='eq-nv-x'){ E.nv=null; render(); return; }
  if(a==='eq-recriar'){ const d=(A.lista||[]).find(x=>x._id===b.dataset.id); if(!d) return; E.cartao=null; E.nv={nome:acsNome(d._id),usu:E.usu[d._id]||'',sen:'',cargo:d.perfil||'outro',mexeu:true,err:'',de:d._id}; render(); setTimeout(()=>{ const i=$('#eq-nv-sen'); i&&i.focus(); },40); return; }
  if(a==='eq-nv-gera'){ E.nv.sen=eqSenha(); render(); return; }
  if(a==='eq-nv-cargo'){ E.nv.cargo=b.dataset.v; E.nv.err=''; render(); return; }
  if(a==='eq-nv-criar'){ const N=E.nv; N.nome=String(N.nome||'').trim(); N.usu=eqLimpo(N.usu); N.sen=String(N.sen||'').trim();
    N.err=!N.nome?'Escreva o nome da pessoa.':!N.usu?'Escreva o usuário.':N.sen.length<6?'A senha precisa ter pelo menos 6 caracteres.':!N.cargo&&!eqAntigoDe(N.usu)?'Escolha o cargo.':''; if(N.err){ render(); return; }
    E.salv=true; render();
    try{ const ant=(N.de&&(A.lista||[]).find(x=>x._id===N.de))||eqAntigoDe(N.usu); const uid=await window.claude.criarUsuario(N.usu,N.nome,N.sen); S.nomes[uid]=N.nome; E.usu[uid]=N.usu; (E.proj=E.proj||{})[uid]=eqProjeto();
      const ok=ant?await eqHerdar(uid,ant,N.cargo):await acsGravar(uid,acsPreset(N.cargo),true); if(ant&&!N.cargo) N.cargo=ant.perfil; E.salv=false;
      if(ok){ E.cartao={nome:N.nome,usu:N.usu,sen:N.sen,cargo:pnlPerfilNome(N.cargo),perfil:N.cargo}; E.nv=null; } render(); }
    catch(e){ E.salv=false; N.err=e&&e.code==='auth/email-already-in-use'?'Já existe o usuário @'+N.usu+'. Escolha outro (ex.: '+N.usu+'2).':e&&e.code==='auth/weak-password'?'Senha fraca: use pelo menos 6 caracteres.':e&&e.code==='auth/network-request-failed'?'Sem internet. Tente de novo.':'Não deu certo ('+((e&&e.code)||'erro')+').'; render(); }
    return; }
  if(a==='eq-c-x'){ E.cartao=null; render(); return; }
  if(a==='eq-c-copiar'){ const t=eqTextoCartao(E.cartao); try{ await navigator.clipboard.writeText(t); toast('Copiado.'); }catch(e){ toast('Não consegui copiar. Selecione e copie à mão.'); } return; }
  if(a==='eq-c-zap'){ window.open('https://wa.me/?text='+encodeURIComponent(eqTextoCartao(E.cartao)),'_blank','noopener'); return; }
  if(a==='eq-c-print'){ const el=$('#eq-cartao'); const w=window.open('','_blank','width=480,height=640'); if(!w){ toast('O navegador bloqueou a janela de impressão.'); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Acesso ${esc(E.cartao.nome)}</title><style>body{font:15px "Segoe UI",system-ui,sans-serif;margin:24px;color:#1A1A1A}.eq-card{border:2px solid #143F54;border-radius:14px;padding:18px 20px;max-width:360px}.eq-card-h{display:flex;justify-content:space-between;border-bottom:1px solid #E5DFD0;padding-bottom:10px;margin-bottom:6px}.eq-card-h b{color:#143F54;font-size:17px}.eq-card-h span{font-weight:800;letter-spacing:.14em;color:#A2453D}.eq-card-r{display:flex;justify-content:space-between;gap:14px;padding:7px 0;border-bottom:1px dashed #E5DFD0}.eq-card-r span{color:#6B6558}.eq-card-r.big b{font-size:20px}</style>${el.outerHTML}<p style="font-size:12px;color:#6B6558;max-width:360px">No primeiro acesso, toque no seu nome no topo do painel e troque a senha.</p><script>print()<\/script>`); w.document.close(); return; }
  if(a==='eq-conf'){ E.conf=b.dataset.id; render(); return; }
  if(a==='eq-conf-x'){ E.conf=null; render(); return; }
  if(a==='eq-apagar'){ const id=b.dataset.id, d=(A.lista||[]).find(x=>x._id===id); if(!d) return; const nd=Object.assign({},d); delete nd._id;
    Object.assign(nd,{ativo:false,apagado:true,apagadoEm:new Date().toISOString(),apagadoPor:S.uid||null,alteradoEm:new Date().toISOString()});
    try{ await S.db.doc('acessos/'+id).set(nd); try{ await S.db.doc('pedidos/'+id).delete(); }catch(e){} E.conf=null; toast(acsNome(id)+' foi apagado(a) da equipe.'); render(); }catch(e){ erro(e); } return; }
  if(a==='eq-bloq'){ const id=b.dataset.id, d=(A.lista||[]).find(x=>x._id===id); if(!d) return; const f=acsPreset(d.perfil||'outro'); if(!pnlCargo(d.perfil)&&!ACS_PERFIS[d.perfil]) Object.assign(f,{mods:d.mods||[],locais:d.locais||[],contar:d.contar,receber:d.receber,auditar:d.auditar,verAud:d.verAud}); f.perfil=d.perfil||'outro'; f.ativo=d.ativo===false;
    if(await acsGravar(id,f,false)){ toast(f.ativo?acsNome(id)+' desbloqueado(a).':acsNome(id)+' bloqueado(a): não entra mais até você desbloquear.'); render(); } return; }
  if(a==='eq-liberar'){ const id=b.dataset.id, sel=$('#eq-pp-'+CSS.escape(id)); if(!sel||!sel.value){ toast('Escolha o cargo antes de liberar.'); sel&&sel.focus(); return; } if(await acsGravar(id,acsPreset(sel.value),true)){ toast('Acesso liberado para '+acsNome(id)+'.'); render(); } return; }
  if(a==='eq-recusar'){ const id=b.dataset.id; if(b.dataset.c!=='1'){ b.dataset.c='1'; b.textContent='Confirmar recusa'; return; } const f=acsPreset('outro'); f.mods=[]; f.ativo=false; f.apagado=true; if(await acsGravar(id,f,true)){ try{ await S.db.doc('acessos/'+id).update({apagado:true}); }catch(e){} toast('Pedido recusado.'); render(); } return; }
  /* cargos */
  if(a==='eq-cg-novo'){ E.cg={novo:true,id:pnlNum(),f:{nome:'',desc:'',mods:[],locais:[],contar:false,receber:false,auditar:false,verAud:false},err:''}; render(); setTimeout(()=>{ const i=$('#eq-cg-nome'); i&&i.focus(); },40); return; }
  if(a==='eq-cg-ed'){ const c=pnlCargos()[b.dataset.id]; if(!c) return; E.cg={novo:false,id:b.dataset.id,f:{nome:c.nome||'',desc:c.desc||'',mods:[...(c.mods||[])],locais:[...(c.locais||[])],contar:!!c.contar,receber:!!c.receber,auditar:!!c.auditar,verAud:!!c.verAud},err:''}; render(); return; }
  if(a==='eq-cg-dup'){ const p=ACS_PERFIS[b.dataset.id]; if(!p) return; E.cg={novo:true,id:pnlNum(),f:{nome:p.nome+' (meu)',desc:'',mods:[...(p.mods||[])],locais:[...(p.locais||[])],contar:!!p.contar,receber:!!p.receber,auditar:!!p.auditar,verAud:!!p.verAud},err:''}; render(); setTimeout(()=>{ const i=$('#eq-cg-nome'); if(i){ i.focus(); i.select(); } },40); return; }
  if(a==='eq-cg-x'){ E.cg=null; render(); return; }
  if(a==='eq-cg-mod'){ const f=E.cg.f, k=b.dataset.v; f.mods=f.mods.includes(k)?f.mods.filter(x=>x!==k):[...f.mods,k]; if(k==='almox'&&f.mods.includes('almox')&&!f.locais.length){ f.locais=[...ALX_LOCS]; f.contar=true; } render(); return; }
  if(a==='eq-cg-loc'){ const f=E.cg.f, k=b.dataset.v; f.locais=f.locais.includes(k)?f.locais.filter(x=>x!==k):[...f.locais,k]; render(); return; }
  if(a==='eq-cg-acao'){ const f=E.cg.f; f[b.dataset.v]=!f[b.dataset.v]; render(); return; }
  if(a==='eq-cg-salvar'){ const G=E.cg, f=G.f; f.nome=String(f.nome||'').trim();
    G.err=!f.nome?'Dê um nome para o cargo.':!f.mods.length?'Marque pelo menos uma tela.':f.mods.includes('almox')&&!f.locais.length?'Marque pelo menos um almoxarifado.':(eqCargos().todos.some(c=>c.k!==G.id&&c.nome.toLowerCase()===f.nome.toLowerCase())?'Já existe um cargo com esse nome.':''); if(G.err){ render(); return; }
    E.salv=true; render();
    try{ await eqGravaCargos(cs=>{ const old=cs[G.id]; const c=Object.assign({},old||{},{nome:f.nome,desc:String(f.desc||'').trim(),mods:f.mods,locais:f.mods.includes('almox')?f.locais:[],contar:!!f.contar,receber:!!f.receber,auditar:!!f.auditar,verAud:!!f.verAud,alteradoEm:new Date().toISOString(),alteradoPor:S.uid||null});
        c.ocultas=(old&&old.ocultas)||[]; c.blocos=(old&&old.blocos)||eqBlocosSug(f.mods);
        if(old){ const snap=pnlClone(old); delete snap.hist; c.hist=[...(old.hist||[]).slice(-9),{em:old.alteradoEm||null,por:old.alteradoPor||null,snap}]; } cs[G.id]=c; });
      toast(G.novo?'Cargo '+f.nome+' criado.':'Cargo salvo. Quem usa '+f.nome+' já vê assim.'); E.cg=null; }
    catch(e){ erro(e); } E.salv=false; render(); return; }
  if(a==='eq-cg-tela'){ pnlAbrirCargo(b.dataset.id); go('paineis'); return; }
  if(a==='eq-cg-conf'){ E.cgConf=b.dataset.id; E.cgMove=''; render(); return; }
  if(a==='eq-cg-conf-x'){ E.cgConf=null; render(); return; }
  if(a==='eq-cg-apagar'){ const k=b.dataset.id, para=($('#eq-cg-move')||{}).value||'', ps=(A.lista||[]).filter(d=>eqVis(d)&&d.perfil===k);
    if(ps.length&&!para){ toast('Escolha para qual cargo as pessoas vão.'); return; }
    try{ for(const d of ps){ const f=acsPreset(para); f.ativo=d.ativo!==false; await acsGravar(d._id,f,false); }
      await eqGravaCargos(cs=>{ delete cs[k]; }); E.cgConf=null; toast('Cargo apagado'+(ps.length?'; '+ps.length+(ps.length===1?' pessoa passou':' pessoas passaram')+' para '+pnlPerfilNome(para):'')+'.'); render(); }
    catch(e){ erro(e); } return; }
});
document.addEventListener('input',ev=>{ const t=ev.target, E=S.eq; if(!t.id||!t.id.startsWith('eq-')) return;
  if(t.id==='eq-q'){ E.q=t.value; const p=t.selectionStart; render(); const n=$('#eq-q'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } return; }
  if(E.nv){ if(t.id==='eq-nv-nome'){ E.nv.nome=t.value; if(!E.nv.mexeu){ E.nv.usu=eqUsuSug(t.value); const u=$('#eq-nv-usu'); if(u) u.value=E.nv.usu; } }
    if(t.id==='eq-nv-usu'){ E.nv.usu=t.value; E.nv.mexeu=true; } if(t.id==='eq-nv-sen') E.nv.sen=t.value; }
  if(E.cg){ if(t.id==='eq-cg-nome'){ E.cg.f.nome=t.value; const h=$('#eq-cg-t'); if(h) h.textContent=t.value||'Cargo sem nome'; } if(t.id==='eq-cg-desc') E.cg.f.desc=t.value; } });
document.addEventListener('change',async ev=>{ const t=ev.target; if(t.id==='eq-cg-move'){ S.eq.cgMove=t.value; return; }
  const id=t.dataset&&t.dataset.eqCargo; if(!id||!S.acs.dono) return; const d=(S.acs.lista||[]).find(x=>x._id===id); if(!d) return;
  const f=acsPreset(t.value); f.ativo=d.ativo!==false; if(await acsGravar(id,f,false)){ toast(acsNome(id)+' agora é '+pnlPerfilNome(t.value)+'.'); render(); } });
document.addEventListener('click',ev=>{ const f=ev.target.closest&&ev.target.closest('[data-eq-fundo]'); if(!f||ev.target!==f) return; const k=f.dataset.eqFundo; if(k==='nv') S.eq.nv=null; else if(k==='cg') S.eq.cg=null; else return; render(); });
document.addEventListener('keydown',ev=>{ if(ev.key!=='Escape') return; const E=S.eq; if(E.nv||E.cg){ E.nv=null; E.cg=null; render(); } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&S.eq.nv&&ev.target&&ev.target.closest&&ev.target.closest('.eq-box')&&ev.target.tagName==='INPUT'){ ev.preventDefault(); const b=document.querySelector('[data-act="eq-nv-criar"]'); b&&b.click(); } });
/* pessoas apagadas não contam como "com acesso" e não aparecem nos cargos */
{ const _aj=ajAbas; ajAbas=function(v){ return _aj(v).replace('>Acessos<','>Equipe e cargos<').replace('>Painéis por cargo<','>Telas iniciais<'); }; }
CRUMB.acessos='Equipe e cargos';
{ const _pp=pnlPessoasDe; pnlPessoasDe=function(k){ return _pp(k).filter(d=>!d.apagado); }; }
{ const _g=acsGate; acsGate=function(){ const d=S.acs&&S.acs.doc; if(d&&d.apagado&&!S.acs.dono) return acsCaixa('Sem acesso','Este usuário não faz mais parte da equipe do painel. Se for engano, fale com a responsável pelo PCP.')+(window.claude&&window.claude.online?'<p style="text-align:center"><button class="lnk" data-act="sair-conta">Entrar com outro usuário</button></p>':''); return _g(); }; }
document.head.insertAdjacentHTML('beforeend',`<style id="eq-css">
.eq-head .btn{height:46px}
.eq-tabs{display:flex;gap:4px;padding:4px;background:var(--sunken);border-radius:12px;width:max-content;max-width:100%}
.eq-tabs button{display:flex;align-items:center;gap:8px;height:42px;padding:0 18px;border:0;border-radius:9px;background:transparent;color:var(--ink-2);font-weight:700;font-size:14px;cursor:pointer}
.eq-tabs button small{font-size:11px;font-weight:700;background:var(--surface);color:var(--muted);border-radius:999px;padding:1px 8px}
.eq-tabs button[aria-selected="true"]{background:var(--surface);color:var(--teal-strong);box-shadow:var(--shadow)}
.eq-tabs button[aria-selected="true"] small{background:var(--teal-tint);color:var(--teal-strong)}
.eq-bar{display:flex;flex-direction:column;gap:10px}
.eq-q{position:relative;display:block;max-width:520px}.eq-q svg{position:absolute;left:14px;top:13px;color:var(--muted)}.eq-q input{height:44px;padding-left:42px}
.eq-fil{display:flex;flex-wrap:wrap;gap:6px}
.eq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px}
.eq-p,.eq-c{background:var(--surface);border-radius:14px;box-shadow:var(--shadow);padding:16px 18px;display:flex;flex-direction:column;gap:12px;border:1.5px solid transparent;min-width:0}
.eq-p.off{opacity:.72;background:var(--surface-2)}.eq-p.eu{border-color:var(--teal-tint)}
.eq-pt{display:flex;align-items:center;gap:12px}.eq-pn{min-width:0;flex:1}.eq-pn b{display:block;font-size:16px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.eq-pn small{display:block;color:var(--muted);font-size:12.5px}
.eq-av{width:44px;height:44px;border-radius:999px;color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.02em}.eq-av.sm{width:36px;height:36px;font-size:13px}
.eq-pc{display:flex;flex-direction:column;gap:4px}.eq-pc>span{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}
.eq-sel{height:42px;font-weight:600}
.eq-ics{display:flex;flex-wrap:wrap;gap:5px}.eq-mi{width:28px;height:28px;border-radius:8px;background:var(--teal-wash);color:var(--teal-strong);display:inline-flex;align-items:center;justify-content:center}.eq-mi.more{font-size:11px;font-weight:800;width:auto;padding:0 7px}
.eq-pa{display:flex;flex-wrap:wrap;gap:4px 14px;padding-top:10px;border-top:1px solid var(--line-2);margin-top:auto}
.eq-lk{display:inline-flex;align-items:center;gap:5px;border:0;background:none;padding:4px 0;color:var(--teal-strong);font-weight:600;font-size:13px;cursor:pointer}.eq-lk:hover{text-decoration:underline}.eq-lk.del{color:var(--crit-ink);margin-left:auto}
.eq-conf{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:10px;background:var(--crit-tint);color:var(--crit-ink);margin-top:auto}.eq-conf span{font-size:12.5px;color:var(--ink-2)}.eq-conf>div{display:flex;gap:8px;flex-wrap:wrap}.eq-conf .btn{height:40px}.eq-conf .eq-sel{background:var(--surface)}
.eq-add{align-items:center;justify-content:center;text-align:center;border:2px dashed var(--line)!important;background:transparent!important;box-shadow:none!important;color:var(--teal-strong);cursor:pointer;min-height:180px;font:inherit}.eq-add:hover{border-color:var(--teal)!important;background:var(--teal-wash)!important}.eq-add b{font-size:16px}.eq-add small{color:var(--muted);font-size:12.5px}
.eq-pend{border:1.5px solid var(--warn)}.eq-pend h2{display:flex;align-items:center;gap:8px}
.eq-pr{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line-2)}.eq-pr .eq-pn{flex:1 1 180px}.eq-pr .eq-sel{width:auto;flex:0 1 240px}.eq-pr .btn{height:42px}
.eq-ct{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.eq-ct b{font-size:16px}
.eq-cm{display:flex;flex-wrap:wrap;gap:6px}.eq-tg{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:4px 9px;border-radius:999px;background:var(--teal-wash);color:var(--teal-strong)}
.eq-c.pronto .eq-tg{background:var(--sunken);color:var(--ink-2)}
.eq-cn{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);font-weight:600}
.eq-modal{z-index:950}.eq-box{max-width:760px;display:flex;flex-direction:column;padding:0}.eq-box.sm{max-width:440px;padding:24px 24px 18px}
.eq-mh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px 14px;border-bottom:1px solid var(--line-2);position:sticky;top:0;background:var(--surface);z-index:1}
.eq-x{width:38px;height:38px;border-radius:10px;border:0;background:var(--sunken);color:var(--ink-2);font-size:16px;cursor:pointer;flex-shrink:0}
.eq-mb{padding:18px 24px;overflow:auto}
.eq-mf{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 24px;border-top:1px solid var(--line-2);position:sticky;bottom:0;background:var(--surface)}.eq-mf .btn{height:46px}
.eq-steps{display:flex;gap:6px;margin-bottom:16px}.eq-steps span{flex:1;font-size:11.5px;font-weight:700;letter-spacing:.06em;color:var(--faint);padding-top:8px;border-top:3px solid var(--line)}.eq-steps span.on{color:var(--teal-strong);border-top-color:var(--teal)}
.eq-f2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.eq-f{display:flex;flex-direction:column;gap:5px;min-width:0}.eq-f>span{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}.eq-f small{font-size:11.5px;color:var(--muted)}
.eq-in{display:flex;align-items:center;gap:6px;position:relative}.eq-in .txt{flex:1;min-width:0}.eq-pre{position:absolute;left:12px;color:var(--muted);font-weight:700}.eq-pre+.txt{padding-left:28px}
.eq-cgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.eq-cgo{display:flex;flex-direction:column;align-items:flex-start;gap:8px;text-align:left;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;font:inherit;color:var(--ink)}.eq-cgo:hover{border-color:var(--teal)}
.eq-cgo b{font-size:14px;line-height:1.3}.eq-cgo small{font-size:12px;color:var(--muted)}.eq-cgo.on{border:2px solid var(--teal);background:var(--teal-wash);padding:11.5px 13.5px}
.eq-err{color:var(--crit-ink);font-weight:600;font-size:13.5px;margin-top:12px}.eq-err:empty{display:none}
.eq-mods{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.eq-mod{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;font:inherit;color:var(--ink)}.eq-mod:hover{border-color:var(--teal)}
.eq-mod b{display:block;font-size:14px}.eq-mod small{display:block;font-size:12px;color:var(--muted);line-height:1.35}.eq-mod>span:nth-child(2){flex:1;min-width:0}
.eq-mic{width:38px;height:38px;border-radius:10px;background:var(--sunken);color:var(--ink-2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.eq-ck{width:22px;height:22px;border-radius:7px;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}
.eq-mod.on{border:2px solid var(--teal);background:var(--teal-wash);padding:11.5px 13.5px}.eq-mod.on .eq-mic{background:var(--teal);color:#fff}.eq-mod.on .eq-ck{background:var(--teal);border-color:var(--teal)}
.eq-ok{width:60px;height:60px;border-radius:999px;background:var(--ok-tint);color:var(--ok-ink);display:flex;align-items:center;justify-content:center;margin:0 auto}
.eq-card{margin:16px 0 12px;border:2px solid var(--teal-strong);border-radius:14px;padding:14px 18px;background:var(--surface)}
.eq-card-h{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:4px}.eq-card-h b{color:var(--teal-strong);font-size:16px}.eq-card-h span{font-weight:800;letter-spacing:.16em;font-size:12px;color:var(--crit-ink)}
.eq-card-r{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:7px 0;border-bottom:1px dashed var(--line)}.eq-card-r:last-child{border-bottom:0}.eq-card-r span{color:var(--muted);font-size:13px}.eq-card-r b{text-align:right}.eq-card-r.big b{font-size:20px;letter-spacing:.02em}
.eq-cbts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.eq-cbts .btn{height:44px;padding:0 8px;font-size:14px}
@media (max-width:700px){ .eq-f2{grid-template-columns:1fr} .eq-f[style]{grid-column:auto!important} .eq-tabs{width:100%} .eq-tabs button{flex:1;justify-content:center;padding:0 8px} .eq-mh,.eq-mb,.eq-mf{padding-left:16px;padding-right:16px} .eq-box.sm{padding:20px 16px} .eq-head .btn{width:100%} }
</style>`);

/* ---------- várias pessoas de uma vez: nome + cargo; usuário e senha saem prontos; imprime todos os cartões ---------- */
function eqLoteLinha(){ return {nome:'',usu:'',cargo:'',sen:eqSenha(),mexeu:false,st:'',err:''}; }
function eqLoteModal(){ const L=S.eq.lote, C=eqCargos(), fim=L.rows.some(r=>r.st==='ok')&&!L.rodando;
  const sel=(r,i)=>`<select class="txt" data-eq-lc="${i}" ${r.st==='ok'?'disabled':''}><option value="">Cargo…</option>${C.meus.length?`<optgroup label="Seus cargos">${C.meus.map(c=>`<option value="${c.k}" ${r.cargo===c.k?'selected':''}>${esc(c.nome)}</option>`).join('')}</optgroup>`:''}<optgroup label="Cargos prontos">${C.prontos.map(c=>`<option value="${c.k}" ${r.cargo===c.k?'selected':''}>${esc(c.nome)}</option>`).join('')}</optgroup></select>`;
  return `<div class="dbmodal eq-modal" data-eq-fundo="lote"><div class="dbmbox eq-box eq-lote" role="dialog" aria-modal="true" aria-labelledby="eq-lt-t">
   <div class="eq-mh"><div><div class="eyebrow">VÁRIAS PESSOAS</div><h2 id="eq-lt-t">Criar acessos de uma vez</h2></div><button class="eq-x" data-act="eq-lote-x" aria-label="Fechar">✕</button></div>
   <div class="eq-mb"><div class="sub" style="margin:0 0 12px">Escreva o nome e escolha o cargo. O usuário e a senha saem prontos (dá para mudar). No fim, imprima ou copie todos os cartões.</div>
    <div class="eq-lh"><span>Nome</span><span>Usuário</span><span>Senha</span><span>Cargo</span><span></span></div>
    ${L.rows.map((r,i)=>`<div class="eq-lr ${r.st}"><input class="txt" data-eq-ln="${i}" value="${esc(r.nome)}" placeholder="Nome e sobrenome" ${r.st==='ok'?'disabled':''}><div class="eq-in"><span class="eq-pre">@</span><input class="txt" data-eq-lu="${i}" value="${esc(r.usu)}" autocapitalize="none" spellcheck="false" ${r.st==='ok'?'disabled':''}></div><input class="txt num" data-eq-ls="${i}" value="${esc(r.sen)}" ${r.st==='ok'?'disabled':''}>${sel(r,i)}
      <span class="eq-lst">${r.st==='ok'?ic('check',18,2.6):r.st==='vai'?'…':r.st==='err'?'⚠':`<button class="eq-x" data-act="eq-lote-del" data-i="${i}" aria-label="Tirar linha" style="width:32px;height:32px">✕</button>`}</span>${r.err?`<div class="eq-lerr">${esc(r.err)}</div>`:''}</div>`).join('')}
    ${L.rodando?'':`<button class="eq-lk" data-act="eq-lote-mais" style="margin-top:8px">${ic('mais',15,2.2)}Mais uma linha</button>`}
   </div>
   <div class="eq-mf">${fim?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-act="eq-lote-print">${ic('imprimir',16,2)}Imprimir os cartões</button><button class="btn sec" data-act="eq-lote-copiar">${ic('copiar',16,2)}Copiar todos</button></div>`:'<span></span>'}
    <div style="display:flex;gap:8px"><button class="btn sec" data-act="eq-lote-x">${fim?'Concluir':'Cancelar'}</button>${L.rows.some(r=>r.st!=='ok')?`<button class="btn" data-act="eq-lote-criar" ${L.rodando?'disabled':''}>${L.rodando?'Criando…':ic('check',18,2.4)+'Criar todos'}</button>`:''}</div></div>
  </div></div>`; }
function eqLoteCartoes(){ return S.eq.lote.rows.filter(r=>r.st==='ok').map(r=>({nome:r.nome,usu:r.usu,sen:r.sen,cargo:pnlPerfilNome(r.cargo),perfil:r.cargo})); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="eq-lote"]'); if(!b||b.disabled||!S.acs.dono) return; const E=S.eq, a=b.dataset.act;
  if(a==='eq-lote'){ E.lote={rows:[1,2,3,4,5].map(eqLoteLinha),rodando:false}; render(); setTimeout(()=>{ const i=document.querySelector('[data-eq-ln="0"]'); i&&i.focus(); },40); return; }
  const L=E.lote; if(!L) return;
  if(a==='eq-lote-x'){ if(L.rodando) return; E.lote=null; render(); return; }
  if(a==='eq-lote-mais'){ L.rows.push(eqLoteLinha()); render(); return; }
  if(a==='eq-lote-del'){ L.rows.splice(+b.dataset.i,1); if(!L.rows.length) L.rows.push(eqLoteLinha()); render(); return; }
  if(a==='eq-lote-criar'){ const fila=L.rows.filter(r=>r.st!=='ok'&&r.nome.trim()); let falta=false; if(!fila.length){ toast('Escreva pelo menos um nome.'); return; }
    fila.forEach(r=>{ r.usu=eqLimpo(r.usu||eqUsuSug(r.nome)); r.err=!r.cargo&&!eqAntigoDe(r.usu)?'Escolha o cargo.':!r.usu?'Escreva o usuário.':String(r.sen||'').length<6?'Senha com pelo menos 6 caracteres.':''; if(r.err){ r.st='err'; falta=true; } else r.st=''; });
    const us=fila.map(r=>r.usu); fila.forEach(r=>{ if(us.filter(u=>u===r.usu).length>1){ r.err='Usuário repetido na lista.'; r.st='err'; falta=true; } });
    if(falta){ render(); return; } L.rodando=true; render();
    for(const r of fila){ r.st='vai'; render(); try{ const ant=eqAntigoDe(r.usu); const uid=await window.claude.criarUsuario(r.usu,r.nome.trim(),r.sen); S.nomes[uid]=r.nome.trim(); E.usu[uid]=r.usu; (E.proj=E.proj||{})[uid]=eqProjeto(); const ok=ant?await eqHerdar(uid,ant,r.cargo):await acsGravar(uid,acsPreset(r.cargo),true); r.st=ok?'ok':'err'; if(!ok) r.err='Conta criada, mas o cargo não gravou: escolha o cargo na lista.'; }
      catch(e){ r.st='err'; r.err=e&&e.code==='auth/email-already-in-use'?'Já existe @'+r.usu+'. Mude o usuário (ex.: '+r.usu+'2).':e&&e.code==='auth/network-request-failed'?'Sem internet.':'Não deu certo ('+((e&&e.code)||'erro')+').'; } }
    L.rodando=false; const n=L.rows.filter(r=>r.st==='ok').length; toast(n+' acesso'+(n>1?'s':'')+' criado'+(n>1?'s':'')+'.'); render(); return; }
  if(a==='eq-lote-copiar'){ const t=eqLoteCartoes().map(c=>`${c.nome} (${c.cargo})\nEndereço: ${eqLinkDe(c)}\nUsuário: ${c.usu}\nSenha: ${c.sen}`).join('\n\n'); try{ await navigator.clipboard.writeText(t); toast('Copiado.'); }catch(e){ toast('Não consegui copiar.'); } return; }
  if(a==='eq-lote-print'){ const cs=eqLoteCartoes(); const w=window.open('','_blank','width=900,height=700'); if(!w){ toast('O navegador bloqueou a janela de impressão.'); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Acessos do painel</title><style>body{font:14px "Segoe UI",system-ui,sans-serif;margin:16px;color:#1A1A1A}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}.c{border:2px solid #143F54;border-radius:12px;padding:12px 14px;break-inside:avoid}.h{display:flex;justify-content:space-between;border-bottom:1px solid #E5DFD0;padding-bottom:6px;margin-bottom:4px}.h b{color:#143F54}.h span{font-weight:800;letter-spacing:.14em;color:#A2453D;font-size:11px}.r{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px dashed #E5DFD0}.r span{color:#6B6558}.r.b b{font-size:17px}.u{font-size:11px;word-break:break-all}.p{font-size:11px;color:#6B6558;margin-top:6px}</style>
     <div class="g">${cs.map(c=>`<div class="c"><div class="h"><b>Painel de Operação</b><span>COLAFIX</span></div><div class="r"><span>Nome</span><b>${esc(c.nome)}</b></div><div class="r"><span>Cargo</span><b>${esc(c.cargo)}</b></div><div class="r b"><span>Usuário</span><b>${esc(c.usu)}</b></div><div class="r b"><span>Senha</span><b>${esc(c.sen)}</b></div><div class="r"><span>Endereço</span><b class="u">${esc(eqLinkDe(c))}</b></div><div class="p">No primeiro acesso, toque no seu nome no topo e troque a senha.</div></div>`).join('')}</div><script>print()<\/script>`); w.document.close(); return; } });
document.addEventListener('input',ev=>{ const t=ev.target, L=S.eq.lote; if(!L||!t.dataset) return; const g=k=>t.dataset[k]!=null?+t.dataset[k]:null; let i;
  if((i=g('eqLn'))!=null){ const r=L.rows[i]; r.nome=t.value; if(!r.mexeu){ r.usu=eqUsuSug(t.value); const u=document.querySelector(`[data-eq-lu="${i}"]`); if(u) u.value=r.usu; } if(i===L.rows.length-1&&t.value.trim()){ L.rows.push(eqLoteLinha()); const p=t.selectionStart; render(); const n=document.querySelector(`[data-eq-ln="${i}"]`); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } } return; }
  if((i=g('eqLu'))!=null){ L.rows[i].usu=t.value; L.rows[i].mexeu=true; return; }
  if((i=g('eqLs'))!=null){ L.rows[i].sen=t.value; return; } });
document.addEventListener('change',ev=>{ const t=ev.target, L=S.eq.lote; if(!L||!t.dataset||t.dataset.eqLc==null) return; L.rows[+t.dataset.eqLc].cargo=t.value; });
document.addEventListener('click',ev=>{ const f=ev.target.closest&&ev.target.closest('[data-eq-fundo="lote"]'); if(!f||ev.target!==f||!S.eq.lote||S.eq.lote.rodando) return; S.eq.lote=null; render(); });
document.head.insertAdjacentHTML('beforeend',`<style id="eq-lote-css">
.eq-lote{max-width:1000px}.eq-lh,.eq-lr{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 110px minmax(0,1.2fr) 36px;gap:8px;align-items:center}
.eq-lh{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:0 0 6px}.eq-lr{padding:6px 0;border-top:1px solid var(--line-2)}.eq-lr .txt{height:42px;width:100%}
.eq-lr.ok .txt{background:var(--ok-tint);border-color:var(--ok)}.eq-lr.err .txt{border-color:var(--crit)}.eq-lst{display:flex;justify-content:center;color:var(--ok-ink);font-weight:800}.eq-lr.err .eq-lst{color:var(--crit-ink)}
.eq-lerr{grid-column:1/-1;color:var(--crit-ink);font-size:12.5px;font-weight:600}
@media (max-width:760px){ .eq-lh{display:none} .eq-lr{grid-template-columns:1fr 1fr;padding:10px 0} .eq-lr>input:first-child{grid-column:1/-1} .eq-lr select{grid-column:1/2} }
</style>`);