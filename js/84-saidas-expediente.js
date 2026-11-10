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
/* almoço que não conta (10/11: "desconsiderar o horário do almoço 12:00 às 13:15"); dá para mudar em config/geral.saidasAlm {ini,fim} */
const SX_ALM={ini:'12:00',fim:'13:15'};
/* horário de trabalho do dia: turno sem linhas (ou o primeiro) que vale no dia da semana */
function sxTurno(d){ const T=((S.cfg&&S.cfg.turnos)||[]).filter(t=>t&&t.ini&&t.fim), wd=new Date(d+'T12:00').getDay();
  const doDia=T.filter(t=>!(Array.isArray(t.dias)&&t.dias.length)||t.dias.includes(wd)), t=doDia.find(x=>!(x.linhas||[]).length)||doDia[0];
  const A=Object.assign({},SX_ALM,(S.cfg&&S.cfg.saidasAlm)||{});
  return {ini:sxM(t&&t.ini)||sxM('07:30'),fim:sxM(t&&t.fim)||sxM('17:30'),aIni:sxM(A.ini),aFim:sxM(A.fim)}; }
const sxSobre=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
/* saídas de uma pessoa num dia: [{s,v,min,alm,almMin,agora}] — min = tempo fora no horário de trabalho, sem o pedaço do almoço;
   saída só dentro do almoço (ou que sobra menos de SX_MIN fora dele) fica com alm:true e não conta */
function sxSaidas(p,d,T,agoraMin){ const g=(p&&p.g)||[], out=[];
  for(let i=0;i<g.length;i++){ const s=sxM(String(g[i]).split('-')[1]); if(s==null) continue;
    const nx=g[i+1]?sxM(String(g[i+1]).split('-')[0]):null, agora=nx==null;
    if(s<T.ini||s>=T.fim) continue;                                          /* saiu antes de começar ou depois de terminar o expediente */
    if(agora&&(agoraMin==null||agoraMin<=s)) continue;                      /* saiu e não voltou num dia que já acabou = foi embora */
    const v=agora?agoraMin:nx, a=Math.max(s,T.ini), b=Math.min(v,T.fim); if(b-a<=0) continue;   /* fora do horário de trabalho */
    if(agora&&agoraMin>=T.fim) continue;
    const almMin=sxSobre(a,b,T.aIni,T.aFim), min=(b-a)-almMin;
    if(min<SX_MIN){ if(almMin>0) out.push({s,v:agora?null:nx,min:0,almMin,alm:true,agora}); continue; }
    out.push({s,v:agora?null:nx,min,almMin,alm:false,agora}); }
  return out; }
function sxDocs(){ return ((S.gxPres&&S.gxPres.docs)||[]).filter(x=>x&&x.dia&&Array.isArray(x.p)).sort((a,b)=>b.dia.localeCompare(a.dia)); }
/* junta por pessoa: {n,s,e,sai:[{d,...}], q (saídas que contam), min (total), nd (dias), agora, porDia:{d:{q,min,T,g}}} */
function sxCalc(docs){ const hj=hojeStr(), now=new Date(), agora=now.getHours()*60+now.getMinutes(), M={};
  docs.forEach(D=>{ const T=sxTurno(D.dia);
    (D.p||[]).forEach(p=>{ const xs=sxSaidas(p,D.dia,T,D.dia===hj?agora:null); if(!xs.length) return;
      const o=M[p.n]||(M[p.n]={n:p.n,s:p.s||'',e:p.e||'',sai:[],q:0,min:0,dias:new Set(),agora:null,porDia:{}});
      const pd=o.porDia[D.dia]||(o.porDia[D.dia]={q:0,min:0,T,g:p.g||[],xs:[]});
      xs.forEach(x=>{ const y=Object.assign({d:D.dia},x); o.sai.push(y); pd.xs.push(y); if(!x.alm){ o.q++; o.min+=x.min; pd.q++; pd.min+=x.min; o.dias.add(D.dia); if(x.agora) o.agora=x; } }); }); });
  return Object.values(M).filter(o=>o.q>0).map(o=>Object.assign(o,{nd:o.dias.size,tom:o.q>=SX_CRIT.n||o.min>=SX_CRIT.min?'crit':o.q>=SX_ATN.n||o.min>=SX_ATN.min?'warn':''}))
    .sort((a,b)=>b.min-a.min||b.q-a.q||a.n.localeCompare(b.n,'pt-BR')); }
/* linha do dia: trabalho de T.ini a T.fim, faixa do almoço, trechos na empresa e as saídas pintadas */
function sxBarra(pd,tom){ const T=pd.T, L=T.fim-T.ini, pc=m=>Math.max(0,Math.min(100,(m-T.ini)/L*100)).toFixed(2);
  const dentro=(pd.g||[]).map(t=>{ const [a,b]=String(t).split('-'), x=sxM(a), y=b?sxM(b):null; if(x==null) return ''; const yy=y==null?Math.min(T.fim,x+1):y; if(yy<=T.ini||x>=T.fim) return ''; return `<i class="sx-in" style="left:${pc(x)}%;width:${(pc(yy)-pc(x)).toFixed(2)}%"></i>`; }).join('');
  const fora=pd.xs.map(x=>{ const v=x.v==null?Math.min(T.fim,x.s+x.min+x.almMin):x.v; return `<i class="sx-out ${x.alm?'alm':tom||'ok'}${x.agora?' ag':''}" style="left:${pc(x.s)}%;width:${Math.max(.8,pc(v)-pc(x.s)).toFixed(2)}%" title="${sxH(x.s)}–${x.v==null?'agora':sxH(x.v)}"></i>`; }).join('');
  const hs=[]; for(let h=Math.ceil(T.ini/60)*60;h<=T.fim;h+=120) hs.push(`<em style="left:${pc(h)}%">${String(h/60).padStart(2,'0')}h</em>`);
  return `<div class="sx-bar"><i class="sx-alm" style="left:${pc(T.aIni)}%;width:${(pc(T.aFim)-pc(T.aIni)).toFixed(2)}%" title="Almoço (não conta)"></i>${dentro}${fora}</div><div class="sx-esc">${hs.join('')}</div>`; }
function vGxSaidas(){ try{ if(typeof gxpAssina==='function') gxpAssina(); }catch(e){}
  const X=S.sx, U=window.Painel&&window.Painel.ui, docs=sxDocs(), hj=hojeStr(), T0=sxTurno(hj);
  const head=`<div class="head"><div><div class="eyebrow">VISÃO DO GESTOR · PESSOAS</div><h1>Saídas no expediente</h1>
    <div class="sub">Quem saiu (portaria de saída ou estacionamento) e voltou durante o horário de trabalho. O almoço, das ${sxH(T0.aIni)} às ${sxH(T0.aFim)}, não conta.</div></div></div>`;
  if(!S.gxPres.lido) return head+`<section class="card"><p class="sub">Carregando o Face ID…</p></section>`;
  if(!docs.length) return head+(U?U.vazio({tit:'Ainda não há Face ID publicado',txt:'O resumo do Face ID chega quando alguém do RH abre o painel (ou o robô do Face ID roda).'}):'');
  if(!X.dia||!docs.some(d=>d.dia===X.dia)) X.dia=(docs.find(d=>d.dia===hj)||docs[0]).dia;
  const sem=X.per==='sem', per=sem?docs.slice(0,7):docs.filter(d=>d.dia===X.dia), rs=sxCalc(per);
  const emps=[...new Set(rs.map(r=>r.e).filter(Boolean))].sort();
  const totQ=rs.reduce((a,r)=>a+r.q,0), totM=rs.reduce((a,r)=>a+r.min,0), fora=rs.filter(r=>r.agora);
  const dd=d=>{ const x=new Date(d+'T12:00'); return ['dom','seg','ter','qua','qui','sex','sáb'][x.getDay()]+' '+d.slice(8,10)+'/'+d.slice(5,7); };
  const filtros=`<div class="sx-f"><div class="sx-per" role="group"><button class="${!sem?'on':''}" data-act="sx-per" data-v="dia">Um dia</button><button class="${sem?'on':''}" data-act="sx-per" data-v="sem">Últimos 7 dias</button></div>
    ${!sem?`<div class="sx-dias">${docs.slice(0,10).map(d=>`<button class="sx-dia${d.dia===X.dia?' on':''}" data-act="sx-dia" data-v="${d.dia}">${d.dia===hj?'Hoje':dd(d.dia)}</button>`).join('')}</div>`:''}
    <span class="sx-sp"></span><label class="sx-q">${typeof ic==='function'?ic('lupa',16):''}<input id="sx-q" placeholder="Procurar pessoa ou setor" value="${esc(X.q)}" aria-label="Procurar pessoa ou setor"></label>
    ${emps.length>1?`<select id="sx-emp" aria-label="Empresa"><option value="">Todas as empresas</option>${emps.map(e=>`<option ${X.emp===e?'selected':''}>${esc(e)}</option>`).join('')}</select>`:''}</div>`;
  const nums=U?U.nums([{r:'Pessoas que saíram',v:String(rs.length),s:rs.filter(r=>r.tom==='crit').length?rs.filter(r=>r.tom==='crit').length+' acima do limite':''},{r:'Saídas',v:String(totQ),s:rs.length?'média '+(totQ/rs.length).toFixed(1).replace('.',',')+' por pessoa':''},{r:'Tempo fora',v:sxDur(totM),s:totQ?'média '+sxDur(Math.round(totM/totQ))+' por saída':''}].concat(!sem&&X.dia===hj?[{r:'Fora agora',v:String(fora.length),tom:fora.length?'warn':''}]:[])):'';
  const ini=n=>U&&U.ini?U.ini(n):'';
  const chip=x=>`<span class="sx-h${x.alm?' alm':''}${x.agora?' ag':''}">${sem?esc(x.d.slice(8,10)+'/'+x.d.slice(5,7))+' · ':''}${sxH(x.s)}–${x.v==null?'agora':sxH(x.v)} · ${x.alm?'no almoço':sxDur(x.min)+(x.almMin?' (sem o almoço)':'')}</span>`;
  const linhas=rs.map(r=>{ const b=sxNrm([r.n,r.s,r.e].join(' ')), esc0=(X.emp&&r.e!==X.emp)||(X.q&&!sxNrm(X.q).split(/\s+/).every(w=>b.includes(w)));
    const dias=Object.keys(r.porDia).sort().reverse();
    const vis=sem?`<div class="sx-ds">${dias.filter(d=>r.porDia[d].q).map(d=>`<span class="sx-dq ${r.tom}"><b>${dd(d)}</b> ${r.porDia[d].q}× · ${sxDur(r.porDia[d].min)}</span>`).join('')}</div>`:sxBarra(r.porDia[dias[0]],r.tom);
    return `<article class="sx-p ${r.tom}" data-b="${esc(b)}" data-e="${esc(r.e)}"${esc0?' hidden':''}>
      <div class="sx-pq">${ini(r.n)}<div><b class="sx-nm">${esc(r.n)}</b><small>${esc([r.s,r.e].filter(Boolean).join(' · '))}</small>${r.agora?`<span class="pc-selo warn">fora desde ${sxH(r.agora.s)}</span>`:''}</div></div>
      <div class="sx-pv">${vis}<div class="sx-hs">${r.sai.map(chip).join('')}</div></div>
      <div class="sx-pn"><div><b class="${r.tom?'t-'+r.tom:''}">${r.q}</b><small>${r.q===1?'saída':'saídas'}${sem?' em '+r.nd+' dia'+(r.nd>1?'s':''):''}</small></div><div><b class="${r.tom?'t-'+r.tom:''}">${sxDur(r.min)}</b><small>fora</small></div></div></article>`; }).join('');
  /* saídas por horário (quando o pessoal mais sai) */
  const H={}; rs.forEach(r=>r.sai.filter(x=>!x.alm).forEach(x=>{ const h=Math.floor(x.s/60); H[h]=(H[h]||0)+1; }));
  const hk=[]; for(let h=Math.floor(T0.ini/60);h<Math.ceil(T0.fim/60);h++) hk.push(h); const mx=Math.max(1,...hk.map(h=>H[h]||0));
  const porHora=`<section class="card sx-side"><h3>Quando mais saem</h3><div class="sx-hh">${hk.map(h=>`<div title="${H[h]||0} saídas"><i style="height:${Math.round((H[h]||0)/mx*100)}%"></i><b>${H[h]||''}</b><em>${h}h</em></div>`).join('')}</div>
      <h3>Como ler</h3><ul class="sx-leg"><li><i class="sx-k in"></i>Na empresa</li><li><i class="sx-k out"></i>Fora (conta)</li><li><i class="sx-k alm"></i>Almoço ${sxH(T0.aIni)}–${sxH(T0.aFim)} (não conta)</li>
      <li><span><b class="t-warn">Laranja</b>: ${SX_ATN.n}+ saídas ou ${SX_ATN.min}+ min</span></li><li><span><b class="t-crit">Vermelho</b>: ${SX_CRIT.n}+ saídas ou ${SX_CRIT.min}+ min</span></li></ul>
      <p class="sub">Conta quem passou no leitor de saída ou no do estacionamento e voltou. Saídas de menos de ${SX_MIN} min não contam. Quem sai sem passar no Face ID não aparece.</p></section>`;
  const lista=rs.length?`<section class="card sx-lista">${linhas}</section>`
    :(U?U.vazio({tom:'ok',tit:'Ninguém saiu no expediente',txt:sem?'Nos últimos 7 dias com Face ID ninguém saiu e voltou durante o horário de trabalho.':'Neste dia ninguém saiu e voltou durante o horário de trabalho.'}):'');
  return head+filtros+nums+`<div class="sx-g"><div>${lista}</div>${porHora}</div>`; }
function sxFiltra(){ const q=sxNrm((document.getElementById('sx-q')||{}).value||'').trim(), e=S.sx.emp; S.sx.q=(document.getElementById('sx-q')||{}).value||'';
  document.querySelectorAll('.sx-lista .sx-p').forEach(tr=>{ const ok=(!e||tr.dataset.e===e)&&(!q||q.split(/\s+/).every(w=>tr.dataset.b.includes(w))); tr.hidden=!ok; }); }
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
.sx-f{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:4px 0 14px}.sx-sp{flex:1}
.sx-per{display:inline-flex;background:var(--ground);border-radius:12px;padding:3px}.sx-per button{border:0;background:none;font:inherit;font-size:13.5px;padding:7px 14px;border-radius:9px;cursor:pointer;color:var(--muted)}
.sx-per button.on{background:var(--surface);color:var(--ink,inherit);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.sx-dias{display:flex;flex-wrap:wrap;gap:6px}.sx-dia{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 13px;font:inherit;font-size:13px;cursor:pointer;color:inherit}
.sx-dia.on{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}
.sx-q{display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:0 10px;color:var(--muted)}.sx-q input{border:0;background:none;font:inherit;padding:8px 0;min-width:200px;color:var(--ink,inherit);outline:none}
#sx-emp{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:8px 10px;font:inherit;color:inherit}
.sx-g{display:grid;gap:16px;margin-top:14px}@media(min-width:1100px){.sx-g{grid-template-columns:minmax(0,1fr) 300px;align-items:start}}
.sx-lista{padding:0;overflow:hidden}
.sx-p{display:grid;grid-template-columns:230px minmax(0,1fr) 150px;gap:16px;align-items:center;padding:14px 18px;border-top:1px solid var(--line);border-left:4px solid transparent}
.sx-p:first-child{border-top:0}.sx-p.warn{border-left-color:var(--warn)}.sx-p.crit{border-left-color:var(--crit)}
.sx-pq{display:flex;gap:10px;align-items:center;min-width:0}.sx-pq>div{min-width:0}.sx-nm{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sx-pq small{display:block;color:var(--muted);font-size:12px}.sx-pq .pc-selo{margin-top:4px}
.sx-pn{display:flex;gap:16px;justify-content:flex-end;text-align:right}.sx-pn b{display:block;font-size:22px;font-weight:600;line-height:1.1}.sx-pn small{color:var(--muted);font-size:11.5px}
.sx-bar{position:relative;height:16px;border-radius:8px;background:var(--ground);overflow:hidden}
.sx-bar i{position:absolute;top:0;bottom:0}.sx-in{background:color-mix(in srgb,var(--teal) 28%,transparent)}
.sx-alm{background:repeating-linear-gradient(45deg,color-mix(in srgb,var(--muted) 22%,transparent) 0 4px,transparent 4px 8px)}
.sx-out{top:2px!important;bottom:2px!important;border-radius:4px;background:var(--teal-strong)}.sx-out.warn{background:var(--warn)}.sx-out.crit{background:var(--crit)}.sx-out.alm{background:var(--muted);opacity:.45}.sx-out.ag{animation:sxPis 1.4s infinite}
@keyframes sxPis{50%{opacity:.35}}
.sx-esc{position:relative;height:14px;font-size:10.5px;color:var(--muted)}.sx-esc em{position:absolute;transform:translateX(-50%);font-style:normal}
.sx-hs{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.sx-h{font-size:12px;border-radius:7px;padding:2px 8px;background:var(--ground);white-space:nowrap}
.sx-h.alm{color:var(--muted);text-decoration:line-through;opacity:.75}.sx-h.ag{background:var(--warn-tint,#FBF1DD);color:var(--warn-ink,#7A5310);font-weight:600}
.sx-ds{display:flex;flex-wrap:wrap;gap:6px}.sx-dq{font-size:12.5px;border-radius:8px;padding:4px 9px;background:var(--ground)}.sx-dq.warn{background:var(--warn-tint,#FBF1DD)}.sx-dq.crit{background:color-mix(in srgb,var(--crit) 14%,transparent)}
.t-warn{color:var(--warn)}.t-crit{color:var(--crit)}
.sx-side h3{font-size:13px;font-weight:600;margin:0 0 10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.sx-side h3+*{margin-bottom:16px}
.sx-hh{display:flex;align-items:flex-end;gap:4px;height:120px}.sx-hh>div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.sx-hh i{display:block;width:100%;background:var(--teal-strong);border-radius:4px 4px 0 0;min-height:2px}.sx-hh b{font-size:11px;order:-1}.sx-hh em{font-style:normal;font-size:10.5px;color:var(--muted)}
.sx-leg{list-style:none;padding:0;margin:0;display:grid;gap:6px;font-size:13px}.sx-leg li{display:flex;gap:8px;align-items:center}
.sx-k{display:inline-block;width:18px;height:10px;border-radius:3px}.sx-k.in{background:color-mix(in srgb,var(--teal) 28%,transparent)}.sx-k.out{background:var(--teal-strong)}.sx-k.alm{background:repeating-linear-gradient(45deg,color-mix(in srgb,var(--muted) 35%,transparent) 0 3px,transparent 3px 6px)}
@media(max-width:860px){.sx-p{grid-template-columns:1fr;gap:10px}.sx-pn{justify-content:flex-start;text-align:left}.sx-q input{min-width:0;width:100%}.sx-q{flex:1}}
</style>`);
