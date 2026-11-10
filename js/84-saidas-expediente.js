/* Painel Colafix · 84-saidas-expediente.js (10/11/2026)
   "As pessoas saem para fumar no horário de expediente; o Marcelo consegue ver isso no login dele?"
   Visão do gestor › Pessoas › Saídas no expediente (gxsai). Usa só o que já existe: presenca/{dia} (publicado pelo RH,
   sem CPF), em que p[].g são os trechos de cada pessoa dentro da empresa — um trecho fecha quando ela passa num leitor
   com "SAÍDA" no nome e abre de novo quando volta. O intervalo entre dois trechos = tempo fora.
   Conta só dentro do horário de trabalho (turno de config/geral.turnos; sem turno, 07:30–17:30), separa o almoço
   (almIni + intv do turno) e ignora saídas de menos de SX_MIN minutos. Quem sai sem passar no Face ID não aparece.
   Prefixo sx em tudo. Teste: teste-gxsaidas.js. */
"use strict";
const SX_MIN=3, SX_ATN={n:2,min:20}, SX_CRIT={n:4,min:45};
S.sx=S.sx||{per:'dia',dia:null,q:'',emp:''};
const sxM=t=>{ const m=String(t||'').match(/(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
const sxH=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const sxDur=m=>m<60?m+' min':Math.floor(m/60)+'h'+(m%60?String(m%60).padStart(2,'0'):'');
const sxNrm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
/* horário de trabalho do dia: turno sem linhas (ou o primeiro) que vale no dia da semana */
function sxTurno(d){ const T=((S.cfg&&S.cfg.turnos)||[]).filter(t=>t&&t.ini&&t.fim), wd=new Date(d+'T12:00').getDay();
  const doDia=T.filter(t=>!(Array.isArray(t.dias)&&t.dias.length)||t.dias.includes(wd)), t=doDia.find(x=>!(x.linhas||[]).length)||doDia[0];
  const ini=sxM(t&&t.ini)||sxM('07:30'), fim=sxM(t&&t.fim)||sxM('17:30'), aIni=sxM(t&&t.almIni)||sxM('11:30'), intv=t&&t.intv!=null&&t.intv!==''?+t.intv:60;
  return {ini,fim,aIni,aFim:aIni+(intv||60)}; }
/* saídas de uma pessoa num dia: [{s,v,min,alm}] (v = volta; sem volta = ainda fora) */
function sxSaidas(p,d,T,agoraMin){ const g=(p&&p.g)||[], out=[];
  for(let i=0;i<g.length;i++){ const [a,b]=String(g[i]).split('-'), s=sxM(b); if(s==null) continue;
    const nx=g[i+1]?sxM(String(g[i+1]).split('-')[0]):null;
    if(s<T.ini||s>=T.fim) continue;                                           /* saiu fora do horário de trabalho */
    if(nx==null){ if(agoraMin!=null&&agoraMin<T.fim&&agoraMin-s>=SX_MIN) out.push({s,v:null,min:agoraMin-s,agora:true,alm:s>=T.aIni-10&&s<T.aFim}); continue; }
    const v=Math.min(nx,T.fim), min=v-s; if(min<SX_MIN) continue;
    out.push({s,v:nx,min,alm:s>=T.aIni-10&&s<T.aFim}); }
  return out; }
function sxDocs(){ return ((S.gxPres&&S.gxPres.docs)||[]).filter(x=>x&&x.dia&&Array.isArray(x.p)).sort((a,b)=>b.dia.localeCompare(a.dia)); }
/* junta por pessoa: {n,s,e,sai:[{d,s,v,min,alm,agora}], n:qtd, min:total (sem almoço), dias} */
function sxCalc(docs){ const hj=hojeStr(), now=new Date(), agora=now.getHours()*60+now.getMinutes(), M={};
  docs.forEach(D=>{ const T=sxTurno(D.dia);
    (D.p||[]).forEach(p=>{ const xs=sxSaidas(p,D.dia,T,D.dia===hj?agora:null); if(!xs.length) return;
      const o=M[p.n]||(M[p.n]={n:p.n,s:p.s||'',e:p.e||'',sai:[],q:0,min:0,dias:new Set(),agora:null});
      xs.forEach(x=>{ o.sai.push(Object.assign({d:D.dia},x)); if(!x.alm){ o.q++; o.min+=x.min; o.dias.add(D.dia); if(x.agora) o.agora=x; } }); }); });
  return Object.values(M).filter(o=>o.q>0).map(o=>Object.assign(o,{nd:o.dias.size,tom:o.q>=SX_CRIT.n||o.min>=SX_CRIT.min?'crit':o.q>=SX_ATN.n||o.min>=SX_ATN.min?'warn':''}))
    .sort((a,b)=>b.min-a.min||b.q-a.q||a.n.localeCompare(b.n,'pt-BR')); }
function vGxSaidas(){ try{ if(typeof gxpAssina==='function') gxpAssina(); }catch(e){}
  const X=S.sx, U=window.Painel&&window.Painel.ui, docs=sxDocs(), hj=hojeStr();
  const head=`<div class="head"><div><div class="eyebrow">VISÃO DO GESTOR · PESSOAS</div><h1>Saídas no expediente</h1>
    <div class="sub">Quem passou no Face ID de saída e voltou depois, dentro do horário de trabalho (o almoço fica à parte). Saídas de menos de ${SX_MIN} minutos não contam. Quem sai sem passar no Face ID não aparece.</div></div></div>`;
  if(!S.gxPres.lido) return head+`<section class="card"><p class="sub">Carregando o Face ID…</p></section>`;
  if(!docs.length) return head+(U?U.vazio({tit:'Ainda não há Face ID publicado',txt:'O resumo do Face ID chega quando alguém do RH abre o painel (ou o robô do Face ID roda).'}):'');
  if(!X.dia||!docs.some(d=>d.dia===X.dia)) X.dia=(docs.find(d=>d.dia===hj)||docs[0]).dia;
  const per=X.per==='sem'?docs.slice(0,7):docs.filter(d=>d.dia===X.dia), rs=sxCalc(per);
  const emps=[...new Set(rs.map(r=>r.e).filter(Boolean))].sort();
  const totQ=rs.reduce((a,r)=>a+r.q,0), totM=rs.reduce((a,r)=>a+r.min,0), fora=rs.filter(r=>r.agora);
  const dd=d=>{ const x=new Date(d+'T12:00'); return ['dom','seg','ter','qua','qui','sex','sáb'][x.getDay()]+' '+d.slice(8,10)+'/'+d.slice(5,7); };
  const chips=`<div class="sx-bar"><div class="seg" role="group"><button class="${X.per!=='sem'?'on':''}" data-act="sx-per" data-v="dia">Um dia</button><button class="${X.per==='sem'?'on':''}" data-act="sx-per" data-v="sem">Últimos 7 dias</button></div>
    ${X.per!=='sem'?`<div class="sx-dias">${docs.slice(0,10).map(d=>`<button class="sx-dia${d.dia===X.dia?' on':''}" data-act="sx-dia" data-v="${d.dia}">${d.dia===hj?'Hoje':dd(d.dia)}</button>`).join('')}</div>`:''}
    <span class="sx-sp"></span><input id="sx-q" class="txt" placeholder="Procurar pessoa ou setor" value="${esc(X.q)}" aria-label="Procurar pessoa ou setor">
    ${emps.length>1?`<select id="sx-emp" aria-label="Empresa"><option value="">Todas as empresas</option>${emps.map(e=>`<option ${X.emp===e?'selected':''}>${esc(e)}</option>`).join('')}</select>`:''}</div>`;
  const nums=U?U.nums([{r:'Pessoas que saíram',v:String(rs.length)},{r:'Saídas',v:String(totQ),s:rs.length?'média '+(totQ/rs.length).toFixed(1).replace('.',',')+' por pessoa':''},{r:'Tempo fora',v:sxDur(totM),s:totQ?'média '+sxDur(Math.round(totM/totQ))+' por saída':''}].concat(X.per!=='sem'&&X.dia===hj?[{r:'Fora agora',v:String(fora.length),tom:fora.length?'warn':''}]:[])):'';
  const chip=x=>`<span class="sx-h${x.alm?' alm':''}${x.agora?' ag':''}" title="${x.alm?'no horário do almoço (não conta)':''}">${X.per==='sem'?esc(x.d.slice(8,10)+'/'+x.d.slice(5,7))+' ':''}${sxH(x.s)}–${x.v==null?'agora':sxH(x.v)} · ${sxDur(x.min)}${x.alm?' · almoço':''}</span>`;
  const linhas=rs.map(r=>{ const b=sxNrm([r.n,r.s,r.e].join(' '));
    return `<tr data-b="${esc(b)}" data-e="${esc(r.e)}"${(X.emp&&r.e!==X.emp)||(X.q&&!sxNrm(X.q).split(/\s+/).every(w=>b.includes(w)))?' hidden':''}>
      <td data-r="Pessoa"><b>${esc(r.n)}</b><small>${esc([r.s,r.e].filter(Boolean).join(' · '))}</small>${r.agora?`<span class="pc-selo warn">fora desde ${sxH(r.agora.s)}</span>`:''}</td>
      <td class="dir" data-r="Saídas"><b class="${r.tom?'t-'+r.tom:''}">${r.q}</b>${X.per==='sem'?`<small>em ${r.nd} dia${r.nd>1?'s':''}</small>`:''}</td>
      <td class="dir" data-r="Tempo fora"><b class="${r.tom?'t-'+r.tom:''}">${sxDur(r.min)}</b></td>
      <td data-r="Horários"><div class="sx-hs">${r.sai.map(chip).join('')}</div></td></tr>`; }).join('');
  const tab=rs.length?`<section class="card sx-c"><div class="pc-rola"><table class="pc-tab pc-resp sx-t"><thead><tr><th>Pessoa</th><th class="dir">Saídas</th><th class="dir">Tempo fora</th><th>Horários (saiu–voltou)</th></tr></thead><tbody>${linhas}</tbody></table></div>
      <div class="sx-leg"><span class="t-warn">Laranja</span>: ${SX_ATN.n}+ saídas ou ${SX_ATN.min}+ min fora · <span class="t-crit">Vermelho</span>: ${SX_CRIT.n}+ saídas ou ${SX_CRIT.min}+ min · horários em cinza = no almoço (não somam)</div></section>`
    :(U?U.vazio({tom:'ok',tit:'Ninguém saiu no expediente',txt:X.per==='sem'?'Nos últimos 7 dias com Face ID ninguém passou na saída e voltou durante o horário de trabalho.':'Neste dia ninguém passou na saída e voltou durante o horário de trabalho.'}):'');
  return head+chips+nums+tab; }
function sxFiltra(){ const q=sxNrm((document.getElementById('sx-q')||{}).value||'').trim(), e=S.sx.emp; S.sx.q=(document.getElementById('sx-q')||{}).value||'';
  document.querySelectorAll('.sx-t tbody tr').forEach(tr=>{ const ok=(!e||tr.dataset.e===e)&&(!q||q.split(/\s+/).every(w=>tr.dataset.b.includes(w))); tr.hidden=!ok; }); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-act^="sx-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='sx-per'){ S.sx.per=b.dataset.v; render(); } else if(a==='sx-dia'){ S.sx.dia=b.dataset.v; render(); } });
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='sx-q') sxFiltra(); });
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='sx-emp'){ S.sx.emp=e.target.value; sxFiltra(); } });
/* ---------- registro (como o Quadro de pessoas, js/65) ---------- */
Object.assign(VIEWS,{gxsai:{nome:'Saídas no expediente',ic:'relogio',mob:'Saídas'}}); CRUMB.gxsai='Saídas no expediente';
S.extViews=S.extViews||{}; S.extViews.gxsai=vGxSaidas;
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxsai')){ const i=M.views.indexOf('gxpres'); M.views.splice(i>=0?i+1:M.views.length,0,'gxsai'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxsai')){ const i=GXN_TELAS.indexOf('gxpres'); GXN_TELAS.splice(i>=0?i+1:GXN_TELAS.length,0,'gxsai'); }
try{ const g=GXG.find(x=>x.id==='g-pes'); if(g&&!g.tabs.some(t=>t[0]==='gxsai')){ const i=g.tabs.findIndex(t=>t[0]==='gxpres'); g.tabs.splice(i>=0?i+1:g.tabs.length,0,['gxsai','Saídas no expediente']);
  const f=S.extViews.gxsai; S.extViews.gxsai=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas('gxsai')+h; }catch(e){ return h; } }; } }catch(e){}
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Saídas no expediente (quem saiu para fumar, tempo fora)','saidas saida fumar cigarro fora pausa expediente tempo fora portaria','gxsai',()=>go('gxsai')]); }catch(e){}
window.Painel=window.Painel||{}; window.Painel.saidas={calc:sxCalc,saidas:sxSaidas,turno:sxTurno};
document.head.insertAdjacentHTML('beforeend',`<style id="sx-css">
.sx-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:4px 0 14px}.sx-sp{flex:1}
.sx-dias{display:flex;flex-wrap:wrap;gap:6px}.sx-dia{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer;color:inherit}
.sx-dia.on{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}
#sx-q{min-width:220px}.sx-c{margin-top:14px;padding:0;overflow:hidden}
.sx-t td small{display:block;color:var(--muted);font-size:12px}.sx-t td .pc-selo{margin-top:4px}
.sx-hs{display:flex;flex-wrap:wrap;gap:5px}.sx-h{font-size:12.5px;border-radius:8px;padding:2px 8px;background:var(--ground);white-space:nowrap}
.sx-h.alm{color:var(--muted);text-decoration:line-through;opacity:.75}.sx-h.ag{background:var(--warn-tint,#FBF1DD);color:var(--warn-ink,#7A5310);font-weight:600}
.sx-t .t-warn,.sx-leg .t-warn{color:var(--warn)}.sx-t .t-crit,.sx-leg .t-crit{color:var(--crit)}
.sx-leg{font-size:12.5px;color:var(--muted);padding:10px 16px;border-top:1px solid var(--line)}
</style>`);
