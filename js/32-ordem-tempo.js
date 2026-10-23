/* Painel Colafix · 32-ordem-tempo.js (22/10)
   1) Começar a ordem no posto: ao bipar a folha para apontar, se a ordem não está rodando, pergunta
      "Começar a ordem N agora?" (hora editável). Começar uma ordem FECHA a que estava rodando na mesma linha.
      A ordem NÃO termina sozinha ao chegar no total (reprocesso passa do total); só fecha quando outra começa
      ou com "Terminar esta ordem". Guardado em ordens.prodSeg [{ini,por,cracha,fim,fimPor,motivo}].
   2) Apontamento do posto NÃO entra direto na programação: vai para apontpend (status pendente) e o PCP
      confere na tela "Conferir apontamentos" (Produção): confirmar (vira entrega de verdade, desconta silo),
      corrigir a quantidade ou recusar.
   3) Tempo das ordens no relatório do dia do gestor: duração, troca (setup) antes, tempo parado e sacos por hora. */
"use strict";
S.apPend=S.apPend||[];
/* ---------- segmentos de produção da ordem ---------- */
function otSegs(o){ return Array.isArray(o&&o.prodSeg)?o.prodSeg:[]; }
function otAberto(o){ const s=otSegs(o); const u=s[s.length-1]; return u&&!u.fim?u:null; }
function otAtivaNaLinha(l,excetoId){ return (S.ordens||[]).find(o=>o.linha===l&&o._id!==excetoId&&otAberto(o))||null; }
function otMin(a,b){ return Math.max(0,(new Date(b).getTime()-new Date(a).getTime())/6e4); }
function otDur(m){ m=Math.round(m||0); return m<1?'menos de 1 min':m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'); }
async function otGrava(o,segs){ await S.db.doc('ordens/'+o._id).update({prodSeg:segs}); o.prodSeg=segs; const x=ordById(o._id); if(x&&x!==o) x.prodSeg=segs; }
async function otIniciar(o,quando,quem,cracha){ const outra=otAtivaNaLinha(o.linha,o._id);
  if(outra){ const ss=otSegs(outra).map(x=>Object.assign({},x)); const u=ss[ss.length-1]; u.fim=quando>u.ini?quando:new Date().toISOString(); u.fimPor=quem; u.motivo='começou a ordem '+o.num; await otGrava(outra,ss); }
  const ss=otSegs(o).map(x=>Object.assign({},x)); ss.push({ini:quando,por:quem,cracha:cracha||null}); await otGrava(o,ss); return outra; }
async function otTerminar(o,quem){ const ss=otSegs(o).map(x=>Object.assign({},x)); const u=ss[ss.length-1]; if(!u||u.fim) return; u.fim=new Date().toISOString(); u.fimPor=quem; u.motivo='terminada no posto'; await otGrava(o,ss); }

/* ---------- posto: tela "Começar a ordem" ---------- */
{ const _a=poAbreOrdem; poAbreOrdem=function(id){ _a.apply(this,arguments); const T=S.tt, o=ordById(id); if(T.fase==='poap'&&o&&!otAberto(o)){ T.ini={h:pad(new Date().getHours())+':'+pad(new Date().getMinutes())}; T.fase='poini'; render(); } }; }
{ const _v=vPosto; vPosto=function(){ const T=S.tt; if(T.fase!=='poini') return _v.apply(this,arguments); const o=ttOrd(); if(!o){ T.fase='pofolha'; return _v.apply(this,arguments); }
  const outra=otAtivaNaLinha(o.linha,o._id), ant=otSegs(o).length;
  return poPagina('Começar a ordem',`${poOrdCab(o,true)}<section class="cq-cta ot-ini"><div><h1>Começar a ordem ${esc(o.num)} agora?</h1>
    <p>${outra?`A ordem <b>${esc(outra.num)}</b> (${esc(String(outra.produto||'').replace(/^\S+\s+-\s+/,''))}) está rodando na ${esc(o.linha)} e vai ser <b>fechada</b>.`:`Nenhuma outra ordem rodando na ${esc(o.linha)}.`}${ant?' Esta ordem já rodou antes: o tempo continua contando a partir de agora.':''}</p>
    <label class="po-lb" for="ot-h">Começou às <small>(mude se já tinha começado antes)</small></label><input id="ot-h" class="po-in ot-h" type="time" value="${esc(T.ini&&T.ini.h||'')}">${poMsg()}</div></section>
    <div class="cq-rod"><button class="cq-sec" data-act="po-volta">Voltar (Esc)</button><button class="cq-bt ok po-ok" data-act="ot-ini-ok" ${T.enviando?'disabled':''}><b>${T.enviando?'Salvando…':'Começar e apontar (Enter)'}</b></button></div>`); }; }
async function otIniOk(){ const T=S.tt, o=ttOrd(); if(!o||!T.p||T.enviando) return; const i=document.getElementById('ot-h'), hh=String(i&&i.value||'').match(/^(\d{1,2}):(\d{2})$/);
  const d=new Date(); if(hh){ d.setHours(+hh[1],+hh[2],0,0); } if(d.getTime()>Date.now()+60000){ T.msg='A hora de começo não pode ser depois de agora.'; render(); return; }
  T.enviando=true; render();
  try{ const outra=await otIniciar(o,d.toISOString(),T.p.nome,T.p.codigo); T.enviando=false; T.fase='poap'; T.msg=''; render(); try{ toast('Ordem '+o.num+' começou às '+pad(d.getHours())+':'+pad(d.getMinutes())+(outra?' · ordem '+outra.num+' fechada':'')+'.'); }catch(e){} setTimeout(()=>{ try{ poFoco(); }catch(e){} },60); }
  catch(e){ T.enviando=false; console.warn('[ordem] começar',e); T.msg='Não foi possível salvar. Confira a internet e tente de novo.'; render(); } }
/* faixa no apontar: rodando desde… e "Terminar esta ordem" */
function otFaixa(o){ const u=otAberto(o); if(!u) return ''; const T=S.tt, conf=T.otConf===o._id&&Date.now()-(T.otConfT||0)<5000;
  return `<div class="ot-fx"><span>Rodando desde <b>${hora(u.ini)}</b> · há ${otDur(otMin(u.ini,new Date().toISOString()))}${u.por?' · começou: '+esc(u.por):''}</span><button class="cq-sec" data-act="ot-fim">${conf?'Clique de novo para terminar':'Terminar esta ordem'}</button></div>`; }
window.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ot-"]'); if(!b) return; const T=S.tt, a=b.dataset.act;
  if(a==='ot-ini-ok'){ otIniOk(); return; }
  if(a==='ot-fim'){ const o=ttOrd(); if(!o||!T.p) return; if(T.otConf===o._id&&Date.now()-(T.otConfT||0)<5000){ T.otConf=null; try{ await otTerminar(o,T.p.nome); SOMpo('ok'); poVai('pook',{okTit:'Ordem '+o.num+' terminada',okTxt:o.linha+' · rodou '+otDur(otTotal(o))+' · terminada por '+T.p.nome}); }catch(e){ T.msg='Não foi possível salvar.'; render(); } return; }
    T.otConf=o._id; T.otConfT=Date.now(); render(); return; } });
document.addEventListener('keydown',ev=>{ const T=S.tt; if(!T||T.fase!=='poini'||ev.key!=='Enter') return; ev.preventDefault(); otIniOk(); });
function otTotal(o){ return otSegs(o).reduce((a,s)=>a+otMin(s.ini,s.fim||new Date().toISOString()),0); }

/* ---------- apontamentos do posto esperando o PCP ---------- */
function apPendDe(oid){ return (S.apPend||[]).filter(x=>x.ordem===oid&&x.status==='pendente').reduce((a,x)=>a+(+x.qtd||0),0); }
let _apSub=false;
setInterval(()=>{ if(_apSub||!S.db||!S.acs||!S.acs.pronto) return; let pode=false; try{ pode=viewOk('apconf')||(typeof poOn==='function'&&poOn()); }catch(e){} if(!pode) return; _apSub=true;
  inscrever('apontpend',()=>S.db.collection('apontpend').where('status','==','pendente').limit(300),snap=>{ S.apPend=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); }); },1500);
function apPodeConf(){ try{ return !(typeof soVer==='function'&&soVer())&&(typeof acxPode!=='function'||acxPode('apontar')); }catch(e){ return true; } }
function vApConf(){ const xs=(S.apPend||[]).filter(x=>x.status==='pendente').sort((a,b)=>String(a.em).localeCompare(String(b.em))), pode=apPodeConf();
  const por={}; xs.forEach(x=>{ (por[x.ordem]=por[x.ordem]||[]).push(x); });
  const blocos=Object.keys(por).map(oid=>{ const o=ordById(oid)||{num:por[oid][0].num,linha:por[oid][0].linha,produto:por[oid][0].produto,total:0}, ent=o._id?entregueDe(o):0, pend=por[oid].reduce((a,x)=>a+(+x.qtd||0),0), un=typeof uA==='function'&&o._id?uA(o):'sc';
    return `<section class="card ap-b"><div class="ap-h"><div><b>OP ${esc(o.num)} · ${esc(o.linha||'')}</b><span>${esc(String(o.produto||'').slice(0,60))}</span></div><div class="ap-n"><span>Apontado: <b>${fQ(ent)}</b> de ${fQ(+o.total||0)} ${esc(un)}</span><span>Esperando: <b>${fQ(pend)}</b></span>${ent+pend>(+o.total||0)&&o.total?`<span class="ap-w">Passa do total em ${fQ(ent+pend-o.total)} (reprocesso?)</span>`:''}</div></div>
     <div class="ap-l">${por[oid].map(x=>`<div class="ap-r"><span class="ap-q"><label class="gx-sr" for="ap-q-${esc(x._id)}">Quantidade</label><input id="ap-q-${esc(x._id)}" class="txt num" inputmode="numeric" value="${esc(String(x.qtd))}" ${pode?'':'disabled'}> ${esc(un)}</span>
       <span class="ap-i">${new Date(x.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${esc(x.operador||'')}${x.pal?' · '+x.pal+' palete(s) × '+fQ(x.porPal)+(x.avulso?' + '+fQ(x.avulso):''):''}${x.passa?` · <b class="ap-w">passa do total</b>`:''}</span>
       ${pode?`<span class="ap-bt"><button class="btn" data-act="ap-ok" data-id="${esc(x._id)}">Confirmar</button><button class="btn sec" data-act="ap-no" data-id="${esc(x._id)}">Recusar</button></span>`:''}</div>`).join('')}</div></section>`; }).join('');
  return `${banner()}<div class="head"><div><div class="eyebrow">PRODUÇÃO · POSTO</div><h1>Conferir apontamentos</h1><div class="sub">O que o pessoal aponta no posto só entra na programação depois que você confirma. Dá para corrigir a quantidade antes (reprocesso, palete errado).</div></div>
   ${pode&&xs.length?`<button class="btn" data-act="ap-todos">Confirmar todos (${xs.length})</button>`:''}</div>
   ${xs.length?blocos:'<section class="card"><div class="empty">Nada esperando conferência.</div></section>'}`; }
async function apConfirma(x,qtd){ const d={ordem:x.ordem,num:x.num,linha:x.linha,em:x.em,por:S.uid,qtd:Math.round(qtd*1000)/1000,origem:'posto',operador:x.operador||null,cracha:x.cracha||null,conferidoPor:(S.nomes&&S.nomes[S.uid])||'',conferidoEm:new Date().toISOString()};
  if(x.pal&&+qtd===+x.qtd){ d.pal=x.pal; d.porPal=x.porPal; } if(x.avulso&&+qtd===+x.qtd) d.avulso=x.avulso; if(+qtd!==+x.qtd) d.obs='Quantidade do posto: '+x.qtd+' · corrigida na conferência';
  const ok=await salvar('entregas',d); if(!ok) throw new Error('não salvou');
  await S.db.doc('apontpend/'+x._id).update({status:'confirmado',qtdFinal:d.qtd,conferidoPor:d.conferidoPor,conferidoEm:d.conferidoEm}); x.status='confirmado'; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ap-"]'); if(!b||!apPodeConf()) return; const a=b.dataset.act;
  if(a==='ap-ok'){ const x=(S.apPend||[]).find(y=>y._id===b.dataset.id); if(!x) return; const i=document.getElementById('ap-q-'+x._id), q=+String(i&&i.value||x.qtd).replace(/\./g,'').replace(',','.');
    if(!(q>0)){ toast('Quantidade inválida. Para não lançar, use Recusar.'); return; } b.disabled=true; try{ await apConfirma(x,q); toast('Apontamento confirmado: '+fQ(q)+' na ordem '+x.num+'.'); }catch(e){ toast('Não foi possível confirmar agora.'); b.disabled=false; } render(); return; }
  if(a==='ap-no'){ const x=(S.apPend||[]).find(y=>y._id===b.dataset.id); if(!x) return; if(b.dataset.c!=='1'){ b.dataset.c='1'; b.textContent='Clique de novo para recusar'; return; }
    try{ await S.db.doc('apontpend/'+x._id).update({status:'recusado',conferidoPor:(S.nomes&&S.nomes[S.uid])||'',conferidoEm:new Date().toISOString()}); x.status='recusado'; toast('Apontamento recusado (não entra na programação).'); }catch(e){ toast('Não foi possível salvar.'); } render(); return; }
  if(a==='ap-todos'){ if(b.dataset.c!=='1'){ b.dataset.c='1'; b.textContent='Clique de novo: confirmar todos'; return; } b.disabled=true; let n=0;
    for(const x of (S.apPend||[]).filter(y=>y.status==='pendente')){ const i=document.getElementById('ap-q-'+x._id), q=+String(i&&i.value||x.qtd).replace(/\./g,'').replace(',','.'); if(q>0){ try{ await apConfirma(x,q); n++; }catch(e){} } }
    toast(n+' apontamento(s) confirmado(s).'); render(); return; } });
VIEWS.apconf={nome:'Conferir apontamentos',ic:'check',mob:'Conferir'}; CRUMB.apconf='Conferir apontamentos do posto'; S.extViews=S.extViews||{}; S.extViews.apconf=vApConf;
{ const M=MODS.find(m=>m.id==='producao'); if(M&&!M.views.includes('apconf')) M.views.splice(Math.min(2,M.views.length),0,'apconf'); }
registrarAviso(()=>{ try{ if(!viewOk('apconf')||!apPodeConf()) return []; const n=(S.apPend||[]).filter(x=>x.status==='pendente').length; return n?[{nivel:'warn',rotulo:'Posto',titulo:n+' apontamento'+(n>1?'s':'')+' do posto para conferir',texto:'Só entram na programação depois que você confirma.',go:'apconf'}]:[]; }catch(e){ return []; } });

/* ---------- relatório do dia do gestor: tempo das ordens ---------- */
function otDia(d){ const t0=new Date(d+'T00:00:00').getTime(), t1=new Date(d+'T23:59:59').getTime(), agora=Date.now(), out=[];
  (S.ordens||[]).forEach(o=>otSegs(o).forEach((s,i)=>{ const a=new Date(s.ini).getTime(), b=s.fim?new Date(s.fim).getTime():agora; if(b<t0||a>t1) return; out.push({o,s,a,b,ab:!s.fim}); }));
  out.sort((x,y)=>String(x.o.linha).localeCompare(String(y.o.linha))||x.a-y.a);
  out.forEach((x,i)=>{ const p=out[i-1]; x.pausa=p&&p.o===x.o&&p.s.pausa&&x.a>=p.b?{m:(x.a-p.b)/6e4,t:p.s.pausa}:null; x.setup=!x.pausa&&p&&p.o.linha===x.o.linha&&!p.ab&&x.a>=p.b?(x.a-p.b)/6e4:null; x.min=(x.b-x.a)/6e4;
    x.par=(S.paradas||[]).filter(pa=>pa.linha===x.o.linha&&pa.inicio&&!pa.anulada&&!(typeof gxSetup==='function'&&gxSetup(pa))).reduce((acc,pa)=>{ const pa0=Math.max(x.a,new Date(pa.inicio).getTime()), pa1=Math.min(x.b,pa.fim?new Date(pa.fim).getTime():agora); return acc+(pa1>pa0?(pa1-pa0)/6e4:0); },0);
    x.sc=(S.entregas||[]).filter(e=>e.ordem===x.o._id&&!e.anula&&!e.anulada&&e.em&&new Date(e.em).getTime()>=x.a&&new Date(e.em).getTime()<=x.b).reduce((acc,e)=>acc+(+e.qtd||0),0);
    const util=Math.max(0,x.min-x.par); x.ph=util>=10&&x.sc?x.sc/(util/60):null; });
  return out; }
function otCard(d){ const xs=otDia(d); if(!xs.length) return `<section class="card gx-w2"><div class="gx-ch"><h2>Tempo das ordens</h2><span class="gx-mut">começo e fim pelo posto</span></div><div class="empty">Nenhuma ordem começada pelo posto neste dia.</div></section>`;
  return `<section class="card gx-w2"><div class="gx-ch"><h2>Tempo das ordens</h2><span class="gx-mut">começo e fim pelo posto · troca = do fim da anterior ao começo desta · pausa = parada combinada (almoço, café…), não conta no tempo</span></div><div class="gx-tb"><table><thead><tr><th>Linha</th><th>Ordem</th><th>Produto</th><th>Começo</th><th>Fim</th><th class="n">Tempo</th><th class="n">Troca antes</th><th class="n">Parado</th><th class="n">Apontado</th><th class="n">Por hora</th></tr></thead><tbody>
   ${xs.map(x=>`<tr><td>${esc(x.o.linha||'')}</td><td>${esc(x.o.num)}</td><td>${esc(String(x.o.produto||'').replace(/^\S+\s+-\s+/,'').slice(0,40))}</td><td>${hora(x.s.ini)}${x.s.por?`<br><small class="gx-mut">${esc(x.s.por)}</small>`:''}</td><td>${x.ab?'<b>rodando</b>':hora(x.s.fim)+(x.s.motivo?`<br><small class="gx-mut">${esc(x.s.motivo)}</small>`:'')}</td><td class="n">${otDur(x.min)}</td><td class="n">${x.pausa?'pausa '+otDur(x.pausa.m)+'<br><small class="gx-mut">'+esc(x.pausa.t)+'</small>':x.setup!=null?otDur(x.setup):'—'}</td><td class="n">${x.par?otDur(x.par):'—'}</td><td class="n">${fQ(x.sc)}</td><td class="n">${x.ph!=null?gxN(x.ph):'—'}</td></tr>`).join('')}</tbody></table></div></section>`; }
if(typeof gxDiaHtml==='function'){ const _g=gxDiaHtml; gxDiaHtml=function(D,pdf){ const h=_g.apply(this,arguments); const i=h.lastIndexOf('</div>'); return i>0?h.slice(0,i)+otCard(D.d)+h.slice(i):h+otCard(D.d); }; }
try{ if(typeof ACX_BOTOES!=='undefined'&&ACX_BOTOES.apontar){ ['ap-ok','ap-no','ap-todos'].forEach(k=>{ if(!ACX_BOTOES.apontar.includes(k)) ACX_BOTOES.apontar.push(k); }); } }catch(e){}
document.head.insertAdjacentHTML('beforeend',`<style id="ot-css">
.ot-fx{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--card);border:2px solid var(--ok);border-radius:14px;padding:8px 14px;font-size:clamp(14px,2vh,18px)}.ot-fx .cq-sec{min-height:0;padding:8px 14px}
.ot-ini h1{font-size:clamp(26px,5vh,44px)}.ot-ini p{font-size:clamp(15px,2.4vh,20px)}.ot-h{width:auto;min-width:min(100%,380px);max-width:none;padding:0 16px}.cq.esc .po-in{color-scheme:dark}
.ap-b{display:flex;flex-direction:column;gap:10px}.ap-h{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.ap-h>div:first-child{display:flex;flex-direction:column}.ap-h span{color:var(--muted);font-size:14px}
.ap-n{display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:14px}.ap-w{color:var(--warn,#AD8432);font-weight:700}
.ap-l{display:flex;flex-direction:column;gap:6px}.ap-r{display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:8px}.ap-q input{width:110px}.ap-i{flex:1;min-width:200px;font-size:14px;color:var(--ink-2)}.ap-bt{display:flex;gap:8px}
</style>`);
