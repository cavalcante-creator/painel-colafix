/* Painel Colafix · 17-tvs3.js — fase 3 das TVs: tempo por tela, rodízio inteligente (crítico intercalado e com o dobro
   do tempo), faixa de recados (config/geral.tvRecados), horário de virar o calendário (config/geral.tvVira)
   e a Previsão mensal por item na TV (tvnprev). */
"use strict";
const tvnLS=(k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, tvnLSs=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const tvnSegs=()=>tvnLS('colafix.aprSegs',{})||{}, tvnInteli=()=>tvnLS('colafix.aprInteli',true)!==false, tvnSegPad=()=>+((tvnLS('colafix.apres',{})||{}).seg)||30;

/* ---------- o que está crítico agora, por tela ---------- */
function tvnCriticas(){ const r={}, h=hojeStr();
  try{ r.tvfab=S.paradas.some(p=>!p.fim&&linhasOrd().includes(p.linha)&&!/setup|troca|limpez/i.test(p.motivo||'')); }catch(e){}
  try{ r.monitor=(S.pedmat||[]).some(p=>p.urgente)||linhasOrd().some(l=>corLista(l,h).some(o=>!o._pv&&tvnRanSit(o).c==='crit')); }catch(e){}
  try{ const ult=saldoPorSilo(), L=S.cfg.limites||CFG_PADRAO.limites; r.silos=(S.cfg.silos||[]).some(s=>{ const u=ult[s.id]; return u&&+s.cap&&u.q/s.cap*100<L.atencao; }); }catch(e){}
  try{ r.manut=(S.chamados||[]).some(c=>!manIgnorar(c)&&!manFechada(c)&&c.impacto==='parou'); }catch(e){}
  return r; }

/* ---------- tempo por tela + rodízio inteligente (por fora do rodízio existente) ---------- */
{ const _apl=aprAplica; aprAplica=function(){ const A=S.apres, t=A.lista[A.i]; if(t){ const s=+tvnSegs()[t.k]||tvnSegPad(); A.seg=s*(A._crit?2:1); } return _apl.apply(this,arguments); }; }
{ const _ps=aprPassa; aprPassa=function(d){ const A=S.apres;
    if(!A.on||d!==1||!tvnInteli()||A.lista.length<2){ A._crit=false; A._norm=null; return _ps.apply(this,arguments); }
    const cr=tvnCriticas(), crit=A.lista.map((t,i)=>cr[t.k]?i:-1).filter(i=>i>=0&&i!==A.i);
    if(!A._crit&&crit.length){ const ult=A._crk==null?-1:A._crk, prox=crit.find(i=>i>ult); A._norm=A.i; A._crit=true; A.i=prox!=null?prox:crit[0]; A._crk=A.i; aprAplica(); return; } /* reveza entre as telas críticas pela ordem da lista */
    A._crit=false; if(A._norm!=null){ A.i=A._norm; A._norm=null; } return _ps.apply(this,arguments); }; }
{ const _sa=aprSair; aprSair=function(){ const A=S.apres; A._crit=false; A._norm=null; A._crk=null; A.seg=tvnSegPad(); return _sa.apply(this,arguments); }; }
{ const _ab=aprBarra; aprBarra=function(){ const r=_ab.apply(this,arguments); const A=S.apres, b=document.querySelector('#apr-bar .apr-bt b'); if(b&&A._crit) b.insertAdjacentHTML('beforeend',' <span class="tvn-alb">ALERTA · tempo dobrado</span>'); return r; }; }

/* ---------- faixa de recados em todas as telas novas ---------- */
function tvnRecados(){ const h=hojeStr(); return ((S.cfg||{}).tvRecados||[]).filter(r=>r&&String(r.t||'').trim()&&(!r.ate||r.ate>=h)); }
{ const _pg=tvnPagina; tvnPagina=function(cls,cab,corpo,rod){ const rs=tvnRecados();
    const faixa=rs.length?`<div class="tvn-rec"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"/></svg><b>RECADOS</b>${rs.map(r=>`<span>${esc(r.t)}</span>`).join('<i>•</i>')}</div>`:'';
    return _pg.call(this,cls,cab,corpo+faixa,rod); }; }

/* ---------- 8 · Previsão mensal por item ---------- */
const TVNP={pg:0,t0:Date.now()};
function vTvnPrev(){ const h=hojeStr(), cp=h.slice(0,7); let rows=[]; try{ rows=anlPrevRows(anlDados()).filter(r=>r.cp===cp); }catch(e){ console.warn('[TV prev]',e); }
  const mes=(([y,m])=>['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][+m-1]+' de '+y)(cp.split('-'));
  if(!rows.length) return tvnPagina('tvn-prv',tvnCab('Previsão mensal por item',mes,'',''),'<div class="tvn-vz grande">Nenhuma previsão importada para este mês.</div>','');
  const tP=rows.reduce((a,r)=>a+r.prev,0), tPr=rows.reduce((a,r)=>a+r.prod,0), tF=rows.reduce((a,r)=>a+r.fat,0), pend=rows.filter(r=>r.st!=='CONCLUIDO');
  const xs=rows.slice().sort((a,b)=>(b.nec||0)-(a.nec||0)||(b.sf||0)-(a.sf||0)), POR=9, pgs=Math.max(1,Math.ceil(xs.length/POR));
  if(Date.now()-TVNP.t0>15000){ TVNP.pg=(TVNP.pg+1)%pgs; TVNP.t0=Date.now(); } const pg=TVNP.pg%pgs, it=xs.slice(pg*POR,pg*POR+POR);
  const st=k=>(typeof ANL_PST!=='undefined'&&ANL_PST[k])||{t:k||'',c:'neu'};
  const th=`<div class="tvn-pr2 th"><span>ITEM</span><span>PRODUTO</span><span class="r">PREVISTO</span><span class="r">ESTOQUE INICIAL</span><span class="r">PRODUZIDO</span><span class="r">FATURADO</span><span class="r">A FATURAR</span><span class="r">PRECISA PRODUZIR</span><span>SITUAÇÃO</span></div>`;
  const rs=it.map(r=>{ const s=st(r.st); return `<div class="tvn-pr2${s.c==='crit'?' pr-crit':''}"><b>${esc(r.c)}</b><span class="tvn-mut el">${esc(r.d)}</span><b class="r">${f0(r.prev)}</b><span class="r">${f0(r.ei||0)}</span><b class="r">${f0(r.prod)}</b><b class="r">${f0(r.fat)}</b><b class="r">${f0(r.sf||0)}</b><b class="r ${(r.nec||0)>0?'warn':''}">${(r.nec||0)>0?f0(r.nec):'—'}</b><span>${tvnEtq(s.c,String(s.t).toUpperCase())}</span></div>`; }).join('');
  const bar=(n,v,c)=>`<div class="tvn-pbx"><span>${n}</span><div class="tvn-bar"><i class="${c}" style="width:${tP?Math.min(100,v/tP*100):0}%"></i></div><b>${f0(v)}</b></div>`;
  return tvnPagina('tvn-prv',tvnCab('Previsão mensal por item',mes+' · ordenado pelo que mais precisa produzir',tvnStat(f0(tP),'PREVISTO')+tvnStat((tP?Math.round(tPr/tP*100):0)+'%','PRODUZIDO')+tvnStat((tP?Math.round(tF/tP*100):0)+'%','ATENDIMENTO')+tvnStat(pend.length,'ITENS PENDENTES',pend.length?'warn':'ok'),`página ${pg+1} de ${pgs} · troca sozinha`),
    `<div class="tvn-pbs">${bar('Previsto',tP,'neu')}${bar('Produzido',tPr,'info')}${bar('Faturado',tF,'ok')}</div><div class="tvn-dt">${th}${rs}</div>`,tvnLeg(['crit:Atrasada / risco de faturamento','warn:Em produção','ok:Concluído','neu:Pendente'])); }

/* ---------- registro ---------- */
VIEWS.tvnprev={nome:'Previsão mensal (TV)',ic:'tv',mob:'Previsão TV'}; CRUMB.tvnprev=VIEWS.tvnprev.nome;
{ const M=MODS.find(x=>x.id==='analise'); if(M&&!M.views.includes('tvnprev')) M.views.push('tvnprev'); S.extViews=S.extViews||{}; S.extViews.tvnprev=vTvnPrev; }
{ const _sr=spRota; spRota=function(v){ return v==='tvnprev'?vTvnPrev():_sr.apply(this,arguments); }; }
if(!APR_TELAS.some(t=>t.k==='prevmes')){ const i=APR_TELAS.findIndex(t=>t.k==='detalhe'); APR_TELAS.splice(i<0?APR_TELAS.length:i+1,0,{k:'prevmes',v:'tvnprev',nome:'Previsão mensal por item',d:'Previsto, estoque inicial, produzido, faturado e o que falta produzir de cada item no mês. Troca de página sozinha.',cor:'#5B8A8C',on:true}); }
setInterval(()=>{ if(S.view==='tvnprev'&&Date.now()-TVNP.t0>15000) rerenderSeguro(); },1000);

/* ---------- configuração em Telas de TV (só leitura de quem não é administradora) ---------- */
function tvnCfgCard(){ const A=S.apres, sg=tvnSegs(), pad=tvnSegPad(), ts=aprTelas().filter(aprSel), adm=dbMaster(), rec=(S.cfg||{}).tvRecados||[], vira=tvnViraH();
  const opts=v=>[['','padrão ('+pad+' s)'],[5,'5 s'],[10,'10 s'],[15,'15 s'],[20,'20 s'],[30,'30 s'],[60,'1 min'],[120,'2 min']].map(([x,l])=>`<option value="${x}" ${String(sg[v]||'')===String(x)?'selected':''}>${l}</option>`).join('');
  return `<section class="card tvn-cfg" id="tvn-cfg">
    <div class="label">RODÍZIO</div>
    <label class="ck" style="margin-top:6px"><input type="checkbox" data-act="tvn-inteli" ${tvnInteli()?'checked':''}> Rodízio inteligente: quando houver algo crítico (máquina parada, rancho atrasado, pedido urgente, silo crítico, linha parada), a tela aparece intercalada entre as outras e fica o dobro do tempo</label>
    <div class="label" style="margin-top:14px">TEMPO DE CADA TELA <span style="font-weight:400;text-transform:none;letter-spacing:0">· neste aparelho</span></div>
    <div class="tvn-cfgg">${ts.map(t=>`<label><span>${esc(t.nome)}</span><select class="txt" data-tvn-seg="${t.k}">${opts(t.k)}</select></label>`).join('')||'<span class="sub">Marque as telas acima.</span>'}</div>
    <div class="label" style="margin-top:14px">CALENDÁRIO DA TV</div>
    <label class="tvn-cfgl">Destacar o dia seguinte a partir de <select class="txt" data-tvn-vira ${adm?'':'disabled'}>${[12,13,14,15,16,17,18,19,20,21,22].map(h=>`<option value="${h}" ${h===vira?'selected':''}>${h}:00</option>`).join('')}</select></label>
    ${typeof avEditor==='function'?avEditor():''}
  </section>`; }
function tvnCfgPoe(){ if(S.view!=='tvapres') return; const v=document.getElementById('view'); if(!v||document.getElementById('tvn-cfg')) return; const ref=v.querySelector('.apr-cfg'); if(ref) ref.insertAdjacentHTML('afterend',tvnCfgCard()); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ tvnCfgPoe(); }catch(e){ console.warn('[TV cfg]',e); } return x; }; }
const tvnRecLe=()=>[...document.querySelectorAll('[data-tvn-rt]')].map(i=>({t:i.value.trim(),ate:(document.querySelector(`[data-tvn-ra="${i.dataset.tvnRt}"]`)||{}).value||''}));
async function tvnCfgSalva(d,msg){ try{ await S.db.doc('config/geral').set(d,{merge:true}); Object.assign(S.cfg,d); toast(msg); render(); }catch(e){ toast('Não foi possível salvar: '+(e.message||e)); } }
document.addEventListener('change',ev=>{ const t=ev.target;
  if(t.dataset&&t.dataset.act==='tvn-inteli'){ tvnLSs('colafix.aprInteli',t.checked); toast(t.checked?'Rodízio inteligente ligado.':'Rodízio inteligente desligado.'); return; }
  if(t.dataset&&t.dataset.tvnSeg){ const sg=tvnSegs(); if(t.value) sg[t.dataset.tvnSeg]=+t.value; else delete sg[t.dataset.tvnSeg]; tvnLSs('colafix.aprSegs',sg); toast('Tempo salvo neste aparelho.'); return; }
  if(t.dataset&&t.dataset.tvnVira!=null&&dbMaster()){ tvnCfgSalva({tvVira:+t.value},'O calendário da TV passa a destacar o dia seguinte às '+t.value+':00.'); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="tvn-rec"]'); if(!b||!dbMaster()) return; const a=b.dataset.act;
  if(a==='tvn-reca'){ const rs=tvnRecLe(); rs.push({t:'',ate:''}); S.cfg.tvRecados=rs; const c=document.getElementById('tvn-cfg'); if(c) c.remove(); tvnCfgPoe(); return; }
  if(a==='tvn-recx'){ const rs=tvnRecLe(); rs.splice(+b.dataset.i,1); S.cfg.tvRecados=rs; const c=document.getElementById('tvn-cfg'); if(c) c.remove(); tvnCfgPoe(); return; }
  if(a==='tvn-recs'){ const rs=tvnRecLe().filter(r=>r.t); tvnCfgSalva({tvRecados:rs},rs.length?rs.length+' recado(s) salvo(s).':'Recados apagados.'); } });

document.head.insertAdjacentHTML('beforeend',`<style id="tvn3-css">
.tvn-rec{display:flex;align-items:center;gap:14px;background:#143F54;color:#FFFFFF;border-radius:12px;padding:10px 18px;font-size:21px;flex:none;overflow:hidden;white-space:nowrap}
:root[data-theme="dark"] .tvn-rec{background:#1C2A33}.tvn-rec svg{width:24px;height:24px;flex:none;fill:none;stroke:#FFFFFF;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.tvn-rec b{font-size:15px;letter-spacing:.08em;opacity:.8}.tvn-rec i{opacity:.5;font-style:normal}
.tvn-alb{margin-left:8px;background:#B5473F;color:#FFFFFF;border-radius:6px;padding:2px 8px;font-size:12px;letter-spacing:.06em}
.tvn-pbs{display:flex;gap:24px;flex:none}.tvn-pbx{flex:1;display:flex;align-items:center;gap:14px;background:var(--card);box-shadow:var(--sombra);border-radius:12px;padding:12px 18px}.tvn-pbx span{font-size:18px;color:var(--tx2);width:110px}.tvn-pbx .tvn-bar{flex:1}.tvn-pbx b{font-size:26px}
.tvn-pr2{display:grid;grid-template-columns:130px minmax(0,1fr) 130px 150px 140px 130px 140px 170px 210px;align-items:center;gap:18px;padding:11px 20px;background:var(--card);box-shadow:var(--sombra);border-radius:12px;font-size:24px}
.tvn-pr2.th{background:none;box-shadow:none;padding:0 20px;font-size:14px;font-weight:700;letter-spacing:.06em;color:var(--tx2)}.tvn-pr2 .r{text-align:right}.tvn-pr2 .tvn-mut{font-size:19px}.tvn-pr2 b.warn{color:var(--warn)}.tvn-pr2.pr-crit{border:2px solid var(--crit)}
.tvn-cfgg{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px 16px;margin-top:6px}.tvn-cfgg label{display:flex;justify-content:space-between;align-items:center;gap:10px}.tvn-cfgg select{width:auto}
.tvn-cfgl{display:flex;align-items:center;gap:10px;margin-top:6px}.tvn-cfgl select{width:auto}.tvn-recl{display:grid;grid-template-columns:minmax(0,1fr) 170px auto;gap:8px;margin-top:6px}
</style>`);
/* ===FIM TVS3=== */
