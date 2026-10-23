/* Painel Colafix · 42-ordem-pausa.js (23/10) — no posto: COMEÇAR, PAUSAR, VOLTAR A RODAR e TERMINAR a ordem
   (pedido da usuária: eles começam num horário, param para almoçar e depois voltam).
   Menu do posto ganha "5 · Começar / pausar a ordem" (tela poord): por linha do posto, a ordem rodando ou pausada,
   com Pausar (motivo: Almoço, Café, Troca de turno, Falta de material, Esperando rancho, Outro), Voltar a rodar e Terminar;
   "Começar uma ordem" pede a folha (OP-/RA-) e abre a pergunta de começo do 32 (hora editável).
   Dados: os mesmos segmentos ordens.prodSeg do 32. Pausar = fecha o segmento com {pausa:motivo}; voltar = segmento novo.
   O tempo da ordem (otTotal) já não conta a pausa. Começar outra ordem na linha encerra a pausa da anterior (encerrada:true). */
"use strict";
const OT_PAUSAS=['Almoço','Café','Troca de turno','Falta de material','Esperando rancho','Outro'];
function otPausada(o){ const s=otSegs(o), u=s[s.length-1]; return u&&u.fim&&u.pausa&&!u.encerrada?u:null; }
function otPausadaNaLinha(l){ return (S.ordens||[]).filter(o=>o.linha===l&&otPausada(o)).sort((a,b)=>String(otPausada(b).fim).localeCompare(String(otPausada(a).fim)))[0]||null; }
async function otPausar(o,mot,quem){ const ss=otSegs(o).map(x=>Object.assign({},x)), u=ss[ss.length-1]; if(!u||u.fim) return; u.fim=new Date().toISOString(); u.fimPor=quem; u.pausa=mot||'Pausa'; u.motivo='pausa: '+(mot||'pausa'); await otGrava(o,ss); }
async function otRetomar(o,quem,cracha){ const outra=otAtivaNaLinha(o.linha,o._id); if(outra) throw new Error('rodando:'+outra.num);
  const ss=otSegs(o).map(x=>Object.assign({},x)); ss.push({ini:new Date().toISOString(),por:quem,cracha:cracha||null,volta:true}); await otGrava(o,ss); }
/* terminar também vale para ordem pausada (só marca que acabou) */
{ const _t=otTerminar; otTerminar=async function(o,quem){ const p=otPausada(o); if(p){ const ss=otSegs(o).map(x=>Object.assign({},x)), u=ss[ss.length-1]; u.encerrada=true; u.motivo=(u.motivo||'')+' · terminada no posto'; u.fimPor=u.fimPor||quem; await otGrava(o,ss); return; } return _t.apply(this,arguments); }; }
/* começar uma ordem encerra a pausa de outra da mesma linha */
{ const _i=otIniciar; otIniciar=async function(o,quando){ for(const x of (S.ordens||[]).filter(y=>y.linha===o.linha&&y._id!==o._id&&otPausada(y))){ const ss=otSegs(x).map(z=>Object.assign({},z)), u=ss[ss.length-1]; u.encerrada=true; u.motivo=(u.motivo||'')+' · depois começou a ordem '+o.num; try{ await otGrava(x,ss); }catch(e){} }
  return _i.apply(this,arguments); }; }
const otProd=o=>String(o.produto||'').replace(/^\S+\s+-\s+/,'');
function otEstado(l){ const r=otAtivaNaLinha(l); if(r){ const u=otAberto(r); return {k:'roda',o:r,t:'Rodando · ordem '+r.num,s:otProd(r)+' · desde '+hora(u.ini)+' · há '+otDur(otMin(u.ini,new Date().toISOString()))}; }
  const p=otPausadaNaLinha(l); if(p){ const u=otPausada(p); return {k:'pausa',o:p,t:'Pausada · ordem '+p.num+' · '+u.pausa,s:otProd(p)+' · parou às '+hora(u.fim)+' · há '+otDur(otMin(u.fim,new Date().toISOString()))}; }
  return {k:'nada',o:null,t:'Nenhuma ordem rodando',s:'bipe a folha para começar'}; }
/* ---------- menu: botão 5 ---------- */
function otMenuSub(){ return ttLinhas().map(l=>{ const e=otEstado(l); return l+': '+(e.k==='roda'?'OP '+e.o.num+' rodando':e.k==='pausa'?'OP '+e.o.num+' pausada':'nada rodando'); }).join(' · '); }
{ const _vp=vPosto; vPosto=function(){ const T=S.tt;
  if(T&&T.fase==='poord') return otTela();
  let h=_vp.apply(this,arguments);
  if(h&&T&&T.fase==='pomenu'&&!(typeof nxOn==='function'&&nxOn())){ const bt=`<button class="po-op ot-op" data-act="ot-menu"><span class="po-k">5</span><div><b>Começar / pausar a ordem</b><small>${esc(otMenuSub())}</small></div></button>`; const i=h.indexOf('<div class="po-menu">'); const j=i>=0?h.indexOf('</button></div>',i):-1; if(j>=0) h=h.slice(0,j+9)+bt+h.slice(j+9); }
  if(h&&T&&T.fase==='pofolha'&&T.po&&T.po.acao==='ord') h=h.replace(/Pedir material/g,'Começar a ordem').replace('<span>3</span>Material','<span>3</span>Começar').replace('para pedir material','para começar a ordem');
  if(h&&T&&T.fase==='poini'){ const o=ttOrd(), p=o&&otPausada(o); if(p) h=h.replace(/Começar a ordem (\S+) agora\?/,'Voltar a rodar a ordem $1?').replace('Começar e apontar (Enter)',T.po&&T.po.acao==='ord'?'Voltar a rodar (Enter)':'Voltar a rodar e apontar (Enter)').replace(/<p>[\s\S]*?<\/p>/,`<p>Está pausada desde <b>${hora(p.fim)}</b> (${esc(p.pausa)}). A pausa não conta no tempo da ordem.</p>`); else if(T.po&&T.po.acao==='ord') h=h.replace('Começar e apontar (Enter)','Começar a ordem (Enter)'); }
  if(h&&T&&T.fase==='poap'){ const o=ttOrd(); if(o&&otAberto(o)) h=h.replace('<button class="cq-sec" data-act="ot-fim">','<button class="cq-sec" data-act="ot-pausa-ap">Pausar</button><button class="cq-sec" data-act="ot-fim">'); }
  return h; }; }
function otTela(){ const T=S.tt, L=ttLinhas(), sua=T.p&&L.includes(T.p.linha)?T.p.linha:'', pl=T.po&&T.po.pausaL, conf=T.otConf2;
  if(pl){ const e=otEstado(pl);
    return poPagina('Pausar a ordem',`${e.o?poOrdCab(e.o,false):''}<h1 class="cq-h">Por que a ${esc(pl)} vai parar?</h1><div class="cq-g ot-mot">${OT_PAUSAS.map((m,i)=>`<button class="cq-bt ${m==='Almoço'?'pri':''}" data-act="ot-pmot" data-v="${esc(m)}"><b><span class="po-k">${i+1}</span> ${esc(m)}</b></button>`).join('')}</div>
      <p class="ot-dica">Quebra de máquina não é pausa: use "4 · A linha parou" (e o chamado). A pausa não conta no tempo da ordem.</p>${poMsg()}${poRod('Aperte o número do motivo ou clique.','po-volta','Voltar (Esc)')}`); }
  const cards=L.map((l,i)=>{ const e=otEstado(l), c=conf===l&&Date.now()-(T.otConf2T||0)<5000;
    const bts=e.k==='roda'?`<button class="cq-bt warn" data-act="ot-pausa" data-l="${esc(l)}"><b>Pausar</b></button><button class="cq-sec" data-act="ot-term" data-l="${esc(l)}">${c?'Clique de novo para terminar':'Terminar a ordem'}</button>`
      :e.k==='pausa'?`<button class="cq-bt ok" data-act="ot-volta" data-l="${esc(l)}"><b>Voltar a rodar</b></button><button class="cq-sec" data-act="ot-term" data-l="${esc(l)}">${c?'Clique de novo para terminar':'Terminar a ordem'}</button>`
      :`<button class="cq-bt pri" data-act="ot-comecar" data-l="${esc(l)}"><b>Começar uma ordem</b></button>`;
    return `<section class="ot-ln ot-${e.k}"><div class="ot-lh"><span class="po-k">${i+1}</span><div><h2>${esc(l)}${l===sua?' <small>· sua linha</small>':''}</h2><b>${esc(e.t)}</b><span>${esc(e.s)}</span></div></div><div class="ot-lb">${bts}</div></section>`; }).join('');
  return poPagina('Começar ou pausar a ordem',`<h1 class="cq-h">Começar ou pausar a ordem</h1><div class="ot-lns">${cards}</div>
    <p class="ot-dica">Para começar uma ordem, você também pode bipar a folha (OP-) agora. Tecla da linha: pausa a que está rodando, volta a rodar a pausada ou começa uma nova.</p>${poMsg()}${poRod('Sem uso por 1 minuto, a tela volta ao início.','po-volta','Voltar (Esc)')}`); }
function otAbreTela(extra){ const T=S.tt; T.po=Object.assign({acao:'ord',pausaL:''},extra||{}); T.hub=null; poVai('poord'); }
async function otFazPausa(l,mot){ const T=S.tt, e=otEstado(l); if(e.k!=='roda'||!T.p||T.enviando) return; T.enviando=true; render();
  try{ await otPausar(e.o,mot,T.p.nome); T.enviando=false; SOMpo('ok'); poVai('pook',{okTit:'Ordem '+e.o.num+' pausada · '+mot,okTxt:l+' · parou às '+hora(new Date().toISOString())+' · por '+T.p.nome+'. Para voltar: 5 · Começar / pausar a ordem → Voltar a rodar.'}); }
  catch(er){ T.enviando=false; console.warn('[ordem] pausar',er); T.msg='Não foi possível salvar. Confira a internet e tente de novo.'; render(); } }
async function otFazVolta(l){ const T=S.tt, e=otEstado(l); if(e.k!=='pausa'||!T.p||T.enviando) return; T.enviando=true; render();
  try{ const p=otPausada(e.o); await otRetomar(e.o,T.p.nome,T.p.codigo); T.enviando=false; SOMpo('ok'); poVai('pook',{okTit:'Ordem '+e.o.num+' voltou a rodar',okTxt:l+' · ficou pausada '+otDur(otMin(p.fim,new Date().toISOString()))+' ('+p.pausa+') · por '+T.p.nome}); }
  catch(er){ T.enviando=false; T.msg=/^rodando:/.test(er.message||'')?'Já tem outra ordem rodando nesta linha ('+er.message.slice(8)+'). Pause ou termine ela antes.':'Não foi possível salvar. Confira a internet e tente de novo.'; render(); } }
async function otFazTerm(l){ const T=S.tt, e=otEstado(l); if(!e.o||!T.p) return; if(!(T.otConf2===l&&Date.now()-(T.otConf2T||0)<5000)){ T.otConf2=l; T.otConf2T=Date.now(); render(); return; } T.otConf2=null;
  try{ await otTerminar(e.o,T.p.nome); SOMpo('ok'); poVai('pook',{okTit:'Ordem '+e.o.num+' terminada',okTxt:l+' · rodou '+otDur(otTotal(e.o))+' (sem contar pausas) · por '+T.p.nome}); }catch(er){ T.msg='Não foi possível salvar.'; render(); } }
function otTeclaLinha(l){ const e=otEstado(l); if(e.k==='roda'){ S.tt.po.pausaL=l; render(); } else if(e.k==='pausa') otFazVolta(l); else { S.tt.po={acao:'ord'}; S.tt.hub=null; poVai('pofolha'); } }
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ot-"]'); if(!b) return; const a=b.dataset.act, T=S.tt, l=b.dataset.l;
  if(!['ot-menu','ot-pausa','ot-pmot','ot-volta','ot-term','ot-comecar','ot-pausa-ap'].includes(a)) return; ev.stopImmediatePropagation(); ev.preventDefault(); if(!T||!T.p) return; T.ult=Date.now();
  if(a==='ot-menu') return otAbreTela(); if(a==='ot-pausa'){ T.po.pausaL=l; render(); return; } if(a==='ot-pmot') return otFazPausa(T.po.pausaL,b.dataset.v);
  if(a==='ot-volta') return otFazVolta(l); if(a==='ot-term') return otFazTerm(l); if(a==='ot-comecar'){ T.po={acao:'ord'}; T.hub=null; poVai('pofolha'); return; }
  if(a==='ot-pausa-ap'){ const o=ttOrd(); if(o) otAbreTela({pausaL:o.linha}); } },true);
/* teclas: 5 no menu; na tela, número da linha / do motivo; Esc volta */
const otK={t:0,pend:null};
window.addEventListener('keydown',ev=>{ if(typeof ttAtivo!=='function'||!ttAtivo()||!poOn()||(typeof nxOn==='function'&&nxOn())||ev.ctrlKey||ev.altKey||ev.metaKey||document.getElementById('trava-m')) return; const T=S.tt, ag=performance.now(), gap=ag-otK.t; otK.t=ag;
  if(otK.pend&&gap<120){ clearTimeout(otK.pend); otK.pend=null; }
  if(T.fase==='pomenu'&&ev.key==='5'){ ev.preventDefault(); otK.pend=setTimeout(()=>{ otK.pend=null; if(S.tt.fase==='pomenu') otAbreTela(); },120); return; }
  if(T.fase!=='poord') return; T.ult=Date.now();
  if(ev.key==='Escape'){ ev.preventDefault(); ev.stopImmediatePropagation(); if(T.po.pausaL){ T.po.pausaL=''; render(); } else poVai('pomenu'); return; }
  if(/^[1-9]$/.test(ev.key)){ ev.preventDefault(); const n=+ev.key; otK.pend=setTimeout(()=>{ otK.pend=null; if(S.tt.fase!=='poord') return;
    if(S.tt.po.pausaL){ const m=OT_PAUSAS[n-1]; if(m) otFazPausa(S.tt.po.pausaL,m); } else { const l=ttLinhas()[n-1]; if(l) otTeclaLinha(l); } },120); } },true);
/* folha bipada na tela "Começar / pausar": vai direto para começar */
{ const _cb=cbLeu; cbLeu=function(cod){ const c=String(cod||'').toUpperCase(); if(S.view==='mantotem'&&poOn()&&S.tt&&S.tt.fase==='poord'&&/^(OP-?\d{3,}|RA-?\d{4,})$/.test(c)){ S.tt.po={acao:'ord'}; S.tt.hub=null; S.tt.fase='pofolha'; poFolha(c); return; } return _cb.apply(this,arguments); }; }
{ const _tl=ttLeu; ttLeu=function(txt){ if(poOn()&&S.tt&&S.tt.fase==='poord'&&/^(OP-?\d{3,}|RA-?\d{4,})$/i.test(String(txt||'').trim())){ S.tt.po={acao:'ord'}; S.tt.hub=null; S.tt.fase='pofolha'; poFolha(txt); return; } return _tl.apply(this,arguments); }; }
/* folha bipada para começar: abre a pergunta de começo (ou avisa que já está rodando) */
{ const _a=poAbreOrdem; poAbreOrdem=function(id){ const T=S.tt; if(!(T.po&&T.po.acao==='ord')) return _a.apply(this,arguments); const o=ordById(id); T.hub={oid:id,cands:[id],rancho:''};
  if(o&&otAberto(o)){ T.msg=''; poVai('poord'); ttMsg('A ordem '+o.num+' já está rodando na '+o.linha+'.'); return; }
  T.ap={pal:0,av:''}; T.ini={h:pad(new Date().getHours())+':'+pad(new Date().getMinutes())}; poVai('poini'); }; }
{ const _o=otIniOk; otIniOk=async function(){ const T=S.tt, ord=T.po&&T.po.acao==='ord', o=ttOrd(), eraPausa=o&&otPausada(o); await _o.apply(this,arguments);
  if(ord&&T.fase==='poap'&&o){ const u=otAberto(o); poVai('pook',{okTit:'Ordem '+o.num+(eraPausa?' voltou a rodar':' começou'),okTxt:o.linha+' · '+(u?'às '+hora(u.ini):'')+' · por '+(T.p&&T.p.nome||'')+'. Para apontar: 2 · Apontar produção.'}); } }; }
{ const _pv=poVolta; poVolta=function(){ const T=S.tt; if(T.fase==='poord'){ if(T.po&&T.po.pausaL){ T.po.pausaL=''; render(); } else poVai('pomenu'); return; } if(T.fase==='pofolha'&&T.po&&T.po.acao==='ord'){ otAbreTela(); return; } if(T.fase==='poini'&&T.po&&T.po.acao==='ord'){ otAbreTela(); return; } return _pv.apply(this,arguments); }; }
/* espera do posto: linha com ordem pausada */
{ const _e=poEstLinha; poEstLinha=function(l){ const e=_e.apply(this,arguments); if(e&&(e.c==='crit'||e.c==='arr')) return e; const p=otPausadaNaLinha(l), r=otAtivaNaLinha(l); if(p&&!r){ const u=otPausada(p); return Object.assign({},e,{c:'warn',t:'Pausada · ordem '+p.num+' · '+u.pausa,s:'parou às '+hora(u.fim)+' · há '+otDur(otMin(u.fim,new Date().toISOString()))}); } return e; }; }
try{ if(typeof ACX_BOTOES!=='undefined'&&ACX_BOTOES.apontar){ ['ot-pausa','ot-pmot','ot-volta','ot-term'].forEach(k=>{ if(!ACX_BOTOES.apontar.includes(k)) ACX_BOTOES.apontar.push(k); }); } }catch(e){}
document.head.insertAdjacentHTML('beforeend',`<style id="otp-css">
.po-op.ot-op{background:#3F6F93}
.ot-lns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}
.ot-ln{display:flex;flex-direction:column;gap:14px;padding:18px 20px;border-radius:18px;background:var(--card);border:3px solid var(--line,#D5DEE4)}
.ot-ln.ot-roda{border-color:var(--ok)}.ot-ln.ot-pausa{border-color:var(--warn)}
.ot-lh{display:flex;gap:14px;align-items:flex-start}.ot-lh h2{margin:0;font-size:clamp(20px,3vh,28px)}.ot-lh h2 small{font-weight:500;opacity:.7;font-size:.7em}.ot-lh b{display:block;font-size:clamp(18px,2.8vh,26px);margin-top:4px}.ot-lh span:not(.po-k){display:block;font-size:clamp(14px,2vh,18px);opacity:.8}
.ot-lb{display:flex;gap:10px;flex-wrap:wrap}.ot-lb .cq-bt{flex:1;min-width:180px}.ot-dica{font-size:clamp(14px,2vh,17px);opacity:.8;margin:12px 0 0}
.ot-mot .cq-bt b{display:flex;align-items:center;gap:12px}
</style>`);
