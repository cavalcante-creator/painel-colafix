/* Painel Colafix · 46-melhorias-uso.js (24/10) — melhorias pedidas depois da revisão de uso.
   1) Início do gestor: "+ X t esperando conferência do PCP" (o que o posto apontou hoje e o PCP ainda não confirmou).
   2) Abas de cima cortadas no notebook: setas ‹ › que rolam as abas e a aba aberta sempre aparece.
   3) Posto · "Começar a ordem": a hora é digitada em 24 h (HH:MM), mesmo com o navegador em inglês (antes podia aparecer "06:50 PM").
   4) Chamado aberto com "máquina parou" deixa a linha como PARADA no Início do gestor, mesmo sem o registro de parada. */
"use strict";
/* 1) apontamentos do posto esperando o PCP — o gestor também lê (só os pendentes, até 300) */
let _gxApSub=false;
setInterval(()=>{ try{ if(_gxApSub||!S.db||!S.acs||!S.acs.pronto) return; if(viewOk('apconf')||(typeof poOn==='function'&&poOn())||!viewOk('gxinicio')) return; _gxApSub=true;
  inscrever('apontpend-gx',()=>S.db.collection('apontpend').where('status','==','pendente').limit(300),snap=>{ S.apPend=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); }); }catch(e){} },1500);
function gxPendHoje(){ const h=hojeStr(); let sc=0,t=0,n=0; (S.apPend||[]).forEach(x=>{ if(x.status!=='pendente'||!x.em||hojeStr(new Date(x.em))!==h) return; const q=+x.qtd||0; const o=(typeof gxOrd==='function'?gxOrd(x.ordem):null); sc+=q; t+=q*(o&&typeof gxKgDe==='function'?gxKgDe(o):20)/1000; n++; }); return {sc,t,n}; }
{ const _v=vGxInicio2; vGxInicio2=function(){ let h=_v.apply(this,arguments); try{ const P=gxPendHoje(); if(P.n){ const txt=`<small class="gxa-pend" title="Apontado no posto e ainda não conferido pelo PCP">+ ${gxT(P.t)} t esperando conferência do PCP</small>`;
    h=h.replace(/(<span>Produzido hoje<\/span><b>[\s\S]*?<\/b><small>[\s\S]*?<\/small>)/,'$1'+txt); } }catch(e){} return h; }; S.extViews.gxinicio=vGxInicio2; }
/* 4) chamado com máquina parada = linha parada no Início do gestor */
{ const _g=gxLinhaAgora; gxLinhaAgora=function(l){ const x=_g.apply(this,arguments); try{ if(x.c==='crit'||x.c==='info') return x;
    const c=(S.chamados||[]).filter(y=>y.linha===l&&!manIgnorar(y)&&!manFechada(y)&&!y.prevId&&!y.tarefa&&y.impacto==='parou'&&!y.liberadoEm).sort((a,b)=>String(a.criado).localeCompare(String(b.criado)))[0];
    if(c){ const m=Math.max(0,Math.round((Date.now()-new Date(c.criado||Date.now()).getTime())/6e4)); return Object.assign({},x,{c:'crit',st:'Máquina parada',t:(c.equip?c.equip+' · ':'')+'chamado '+manNum(c.numero),s:(c.exec&&c.exec.tecnico?'com '+(typeof tecNomes==='function'?tecNomes(c):c.exec.tecnico):'sem técnico')+' · há '+(m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')),pc:undefined}); } }catch(e){} return x; }; }
/* 2) abas cortadas: setas e aba aberta visível */
function tbSetas(){ document.querySelectorAll('.tabs').forEach(t=>{ if(innerWidth<861) return; const mais=t.scrollWidth>t.clientWidth+4;
  t.classList.toggle('tb-rola',mais); if(!mais) return;
  if(!t.querySelector('.tb-sd')){ t.insertAdjacentHTML('beforeend','<button type="button" class="tb-sd" aria-label="Mais abas" data-tbs="1">›</button>'); t.insertAdjacentHTML('afterbegin','<button type="button" class="tb-se" aria-label="Abas anteriores" data-tbs="-1">‹</button>'); }
  if(!t._tbFoc){ t._tbFoc=1; const a=t.querySelector('[aria-current="page"],[aria-selected="true"]'); if(a&&a.offsetLeft+a.offsetWidth>t.clientWidth-40) t.scrollLeft=a.offsetLeft-80; }
  tbEstado(t); if(!t._tbEv){ t._tbEv=1; t.addEventListener('scroll',()=>tbEstado(t),{passive:true}); } }); }
function tbEstado(t){ t.classList.toggle('tb-ini',t.scrollLeft<4); t.classList.toggle('tb-fim',t.scrollLeft+t.clientWidth>=t.scrollWidth-4); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-tbs]'); if(!b) return; ev.preventDefault(); ev.stopPropagation(); const t=b.closest('.tabs'); if(t){ t.scrollLeft=t.scrollLeft+(+b.dataset.tbs)*Math.max(240,t.clientWidth*.6); tbEstado(t); } },true);
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ setTimeout(tbSetas,0); }catch(e){} return x; }; }
window.addEventListener('resize',()=>{ try{ tbSetas(); }catch(e){} });
/* 3) hora em 24 h no "Começar a ordem" */
function otHora24(){ const i=document.getElementById('ot-h'); if(!i||i.dataset.h24) return; i.dataset.h24='1'; const v=i.value; i.type='text'; i.inputMode='numeric'; i.maxLength=5; i.placeholder='HH:MM'; i.autocomplete='off'; i.value=v; }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ otHora24(); }catch(e){} return x; }; }
document.addEventListener('input',ev=>{ const i=ev.target; if(!i||i.id!=='ot-h'||!i.dataset.h24) return; let d=i.value.replace(/\D/g,'').slice(0,4); if(d.length>=3) d=d.slice(0,d.length-2)+':'+d.slice(-2); i.value=d; });
document.addEventListener('blur',ev=>{ const i=ev.target; if(!i||i.id!=='ot-h'||!i.dataset.h24) return; const m=i.value.match(/^(\d{1,2}):?(\d{2})$/); if(m&&+m[1]<24&&+m[2]<60) i.value=String(m[1]).padStart(2,'0')+':'+m[2]; },true);
document.head.insertAdjacentHTML('beforeend',`<style id="mu-css">
.gxa-pend{display:block;margin-top:2px;color:#F2C46D!important;font-weight:600}
.tabs.tb-rola{scroll-behavior:smooth;scrollbar-width:none}.tabs.tb-rola::-webkit-scrollbar{display:none}
.tabs .tb-sd,.tabs .tb-se{position:sticky;z-index:2;flex:none;align-self:stretch;width:38px;border:0;font-size:24px;line-height:1;color:var(--teal-strong,#143F54);cursor:pointer;padding:0}
.tabs .tb-sd{right:0;margin-left:auto;background:linear-gradient(90deg,rgba(237,241,244,0),var(--ground,#EDF1F4) 45%)}
.tabs .tb-se{left:0;background:linear-gradient(270deg,rgba(237,241,244,0),var(--ground,#EDF1F4) 45%);order:-1}
.tabs.tb-fim .tb-sd,.tabs.tb-ini .tb-se{visibility:hidden}
</style>`);
