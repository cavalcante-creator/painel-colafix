/* Painel Colafix · 78-comercial-tendencia.js (04/11, pedido "estamos vendendo muito pouco mas mesmo assim a previsão não tem uma mudança").
   Parte 5 do Produção × Comercial (tela anlcom do js/71 e o PDF do mês): previsão do comercial × vendido, mês a mês.
   - Total por mês: previsão do mês (RPRE0301, pcpbase/prev.mes) × vendido (NFS do Extrato, pcpbase/vendas.mensal), últimos CT_MAX meses.
   - Comparação: 1º × último mês fechado com previsão (quanto a venda mudou × quanto a previsão mudou) e a previsão do mês atual × venda média
     dos últimos 3 meses fechados.
   - Por item: "previsão parada" = previsão em 3 meses ou mais, mudou CT_PARADA (10%) ou menos e vendeu CT_VENDEU (80%) ou menos dela.
   - Mesmo recorte do resto do relatório: sem ensacado/premix/nivelador (cmInt), sem exportação (cmExp) e com os filtros da tela (cmFora).
   Só lê o que já está carregado na base da Análise (nenhuma leitura nova do banco). Prefixo `ct`. */
"use strict";
const CT_MAX=7, CT_PARADA=0.10, CT_VENDEU=0.80;
const CT_MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const ctMC=m=>CT_MES[+m.slice(5,7)-1]+'/'+m.slice(2,4);
const ctSinal=(v,pdf)=>v==null||!isFinite(v)?'—':(v>0.0049?'+':v<-0.0049?(pdf?'-':'−'):'')+cmP(Math.abs(v)); /* no PDF: a fonte do jsPDF não tem − nem → */
function ctItem(c){ return !cmFora(c)&&!cmExp(c)&&!/ENSACAD|PREMIX|NIVELAD/i.test(cmDesc(c)); }
function ctMeses(){ const B=S.anl.base||{}, P=(B.prev||{}).mes||{}, V=(B.vendas||{}).mensal||{}, h=hojeStr().slice(0,7);
  const set=new Set(Object.keys(P)); for(const c in V) for(const m in (V[c]||{})) set.add(m);
  return [...set].filter(m=>/^\d{4}-\d{2}$/.test(m)&&m<=h).sort().slice(-CT_MAX); }
function ctCalc(){ const B=S.anl.base||{}; if(!(B.prev&&B.prev.mes)) return null;
  const P=B.prev.mes, V=(B.vendas||{}).mensal||{}, IL=(B.itens||{}).l||{}, h=hojeStr().slice(0,7), ms=ctMeses();
  const vd=(c,m)=>+((((V[c]||{})[m])||[0,0])[1])||0;
  const cods=new Set(); ms.forEach(m=>Object.keys(P[m]||{}).forEach(c=>cods.add(c))); for(const c in V) if(ms.some(m=>vd(c,m)>0)) cods.add(c);
  const cs=[...cods].filter(ctItem);
  const meses=ms.map(m=>{ const F=cmFrac(m), pm=P[m]||null; let pv=0,v=0,pt=0,vt=0;
    cs.forEach(c=>{ const p=pm?(+pm[c]||0):0, x=vd(c,m); pv+=p; v+=x; pt+=cmTon(c,p); vt+=cmTon(c,x); });
    return {m,F,fechado:F.fechado,temPrev:!!pm,prev:pv,vend:v,prevT:pt,vendT:vt,pct:pm&&pv?v/(pv*(F.fechado?1:F.f||1)):null}; });
  const CF=meses.filter(x=>x.fechado), CP=CF.filter(x=>x.temPrev), u3=CF.slice(-3);
  const a=CP[0]||null, b=CP[CP.length-1]||null;
  const vendMed=u3.length?u3.reduce((s,x)=>s+x.vend,0)/u3.length:0;
  const atual=meses.find(x=>x.m===h&&x.temPrev)||null;
  const p3=CP.slice(-3), sp3=p3.reduce((s,x)=>s+x.prev,0), sv3=p3.reduce((s,x)=>s+x.vend,0);
  /* por item */
  const CPm=CP.slice(-4).map(x=>x.m), u3m=u3.map(x=>x.m), ref=atual?h:(b?b.m:null);
  const itens=cs.map(c=>{ const prevs=CPm.map(m=>P[m]&&P[m][c]!=null?(+P[m][c]||0):null), vends=CPm.map(m=>vd(c,m));
    const pa=ref&&P[ref]?(+P[ref][c]||0):0, vm=u3m.length?u3m.reduce((s,m)=>s+vd(c,m),0)/u3m.length:0;
    const pp=CP.map(x=>P[x.m]&&+P[x.m][c]>0?+P[x.m][c]:null).filter(x=>x!=null).concat(atual&&pa>0?[pa]:[]);
    const mn=pp.length?Math.min(...pp):0, mx=pp.length?Math.max(...pp):0, med=pp.length?pp.reduce((s,x)=>s+x,0)/pp.length:0;
    const sp=CP.reduce((s,x)=>s+(P[x.m]&&+P[x.m][c]||0),0), sv=CP.reduce((s,x)=>s+(P[x.m]&&+P[x.m][c]>0?vd(c,x.m):0),0);
    const it=IL[c]||{}, est=it.a3!=null||it.a30!=null?(it.a3||0)+(it.a30||0):null;
    const r={c,d:cmDesc(c),prevs,vends,pa,vm,mn,mx,n:pp.length,varP:med?(mx-mn)/med:0,pct:sp?sv/sp:null,acima:pa-vm,est,sem:est!=null&&vm>0?est/(vm/4.33):null};
    r.parada=r.n>=3&&r.varP<=CT_PARADA&&r.pct!=null&&r.pct<=CT_VENDEU; return r; });
  const lista=itens.filter(r=>r.pa>0&&r.acima>=50&&r.vm<r.pa*0.9).sort((x,y)=>(y.parada-x.parada)||(y.acima-x.acima));
  return {meses,CF,CP,a,b,u3,vendMed,atual,ref,CPm,
    varV:a&&b&&a.vend?(b.vend-a.vend)/a.vend:null, varP:a&&b&&a.prev?(b.prev-a.prev)/a.prev:null,
    cmp:atual&&vendMed?atual.prev/vendMed-1:null, pct3:sp3?sv3/sp3:null, sobra3:sp3-sv3, n3:p3.length,
    itens,lista,paradas:itens.filter(r=>r.parada),acimaTot:lista.reduce((s,r)=>s+r.acima,0)}; }
function ctFrase(T){ if(!T) return ''; if(T.CP.length<2) return T.CP.length?'Só há um mês fechado com previsão importada; a comparação mês a mês começa quando fechar o próximo.':'Ainda não há mês fechado com previsão importada para comparar.';
  const a=T.a, b=T.b, dir=v=>v<=-0.03?'caiu '+cmP(-v):v>=0.03?'subiu '+cmP(v):Math.abs(v)<0.005?'não mudou':'ficou praticamente igual';
  let s=`De ${ctMC(a.m)} para ${ctMC(b.m)}, a venda ${dir(T.varV)} (de ${cmN(a.vend)} para ${cmN(b.vend)}) e a previsão ${dir(T.varP)} (de ${cmN(a.prev)} para ${cmN(b.prev)}).`;
  if(T.atual&&T.cmp!=null) s+=` A previsão de ${cmMesNome(T.atual.m).replace(/ de \d+$/,'')} é ${cmN(T.atual.prev)}, ${Math.abs(T.cmp)<0.03?'quase igual à':T.cmp>0?cmP(T.cmp)+' acima da':cmP(-T.cmp)+' abaixo da'} venda média dos últimos ${T.u3.length} meses (${cmN(T.vendMed)}).`;
  if(T.paradas.length) s+=` ${T.paradas.length} ${T.paradas.length===1?'item está':'itens estão'} com a previsão parada (mudou ${cmP(CT_PARADA)} ou menos) e ${T.paradas.length===1?'vendeu':'venderam'} ${cmP(CT_VENDEU)} ou menos dela.`;
  return s; }
function ctResumo(){ try{ const T=ctCalc(); return T&&T.CP.length>=2?ctFrase(T):''; }catch(e){ return ''; } }

/* ---------- tela (seção 5 do anlcom) ---------- */
function ctSec(){ let T; try{ T=ctCalc(); }catch(e){ console.warn('[comercial tendência]',e); return ''; } if(!T||!T.meses.length) return '';
  const k=(t,v,s,c)=>`<div class="cm-k ${c||''}"><span>${t}</span><b class="num">${v}</b><i>${s||''}</i></div>`, pill=(t,c)=>`<span class="cm-pl ${c}">${t}</span>`;
  const tab=(cols,rows,vazio,nl)=>rows.length?`<div class="cm-tw"><table class="cm-t"><thead><tr>${cols.map((c,i)=>`<th${i<(nl||2)?' class="l"':''}>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i<(nl||2)?' class="l"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty">${vazio}</div>`;
  const mx=Math.max(1,...T.meses.map(x=>Math.max(x.prev,x.vend)));
  const ks=T.CP.length>=2?`<div class="cm-ks">${k('Venda · '+ctMC(T.a.m)+' → '+ctMC(T.b.m),ctSinal(T.varV),cmN(T.a.vend)+' → '+cmN(T.b.vend),T.varV<=-0.03?'c':'')}${k('Previsão · '+ctMC(T.a.m)+' → '+ctMC(T.b.m),ctSinal(T.varP),cmN(T.a.prev)+' → '+cmN(T.b.prev),'w')}${k('Vendido ÷ previsto',cmP(T.pct3),'últimos '+T.n3+' meses · previsto a mais: '+cmN(Math.max(0,T.sobra3)),T.pct3!=null&&T.pct3<0.9?'c':'')}${T.atual?k('Previsão de '+ctMC(T.atual.m),cmN(T.atual.prev),T.cmp==null?'':ctSinal(T.cmp)+' sobre a venda média ('+cmN(T.vendMed)+')',T.cmp>0.1?'c':''):''}</div>`:'';
  const graf=`<div class="ct-ch">${T.meses.map(x=>`<div class="ct-m"><div class="ct-bs">${x.temPrev?`<i class="ct-b p" style="height:${Math.max(1,x.prev/mx*100)}%"><em>${cmN(x.prev)}</em></i>`:'<i class="ct-b z" title="sem previsão importada"></i>'}<i class="ct-b v" style="height:${Math.max(1,x.vend/mx*100)}%"><em>${cmN(x.vend)}</em></i></div><span>${ctMC(x.m)}${x.fechado?'':'<small>até '+cmD(x.F.ate)+'</small>'}</span></div>`).join('')}</div>
    <div class="ct-lg"><span><i class="p"></i>Previsão do mês</span><span><i class="v"></i>Vendido (faturado)</span></div>`;
  const tMes=tab(['Mês','Previsão','Vendido','Vendido ÷ previsão','Previsto a mais','Toneladas (prev. / vend.)'],T.meses.slice().reverse().map(x=>[`<b>${esc(cmMesNome(x.m))}</b>${x.fechado?'':' <small>(até '+cmD(x.F.ate)+')</small>'}`,x.temPrev?cmN(x.prev)+(x.fechado?'':' <small>· até hoje '+cmN(x.prev*x.F.f)+'</small>'):'<small>sem previsão</small>',cmN(x.vend),x.pct==null?'—':pill(cmP(x.pct),x.pct<0.8?'c':x.pct<0.95?'w':'o'),x.temPrev&&x.fechado?(x.prev-x.vend>0?`<span class="cm-neg">${cmN(x.prev-x.vend)}</span>`:'—'):'—',(x.temPrev?(Math.round(x.prevT)).toLocaleString('pt-BR'):'—')+' / '+Math.round(x.vendT).toLocaleString('pt-BR')]),'',1);
  const cab=['Item','Produto'].concat(T.CPm.map(m=>'Vendido '+ctMC(m)),[T.ref?'Previsão '+ctMC(T.ref):'Previsão','Venda média ('+T.u3.length+' m)','Previsão acima da venda','Estoque hoje']);
  const tIt=tab(cab,T.lista.slice(0,30).map(r=>[`<b>${esc(r.c)}</b>`,esc(r.d)+(r.parada?' '+pill('previsão parada','c'):'')].concat(r.vends.map((v,i)=>{ const p=r.prevs[i]; return p?`${cmN(v)}<small class="ct-de">de ${cmN(p)} (${cmP(v/p)})</small>`:`${cmN(v)}<small class="ct-de">sem previsão</small>`; }),
    [cmN(r.pa)+(r.n>=2?`<small class="ct-de">${r.varP<=CT_PARADA?'igual há '+r.n+' meses':cmN(r.mn)+' a '+cmN(r.mx)}</small>`:''),cmN(r.vm),`<span class="cm-neg">+${cmN(r.acima)}</span><small class="ct-de">${r.vm?cmP(r.acima/r.vm)+' acima':'sem venda'}</small>`,r.est==null?'—':cmN(r.est)+(r.sem!=null?`<small class="ct-de">${(Math.round(r.sem*10)/10).toLocaleString('pt-BR')} sem.</small>`:'')])),'Nenhum item com a previsão acima da venda média.');
  return `<section class="card cm-s"><div class="cm-q">“A VENDA CAIU E A PREVISÃO NÃO MUDOU”</div><p class="cm-r">${esc(ctFrase(T))}</p>${ks}${graf}
    <h3 class="cm-h3">Mês a mês</h3>${tMes}
    <h3 class="cm-h3">Itens com a previsão acima da venda${T.lista.length?' ('+T.lista.length+(T.paradas.length?', '+T.paradas.length+' com a previsão parada':'')+')':''}</h3>${tIt}
    <p class="cm-nota">Previsão: RPRE0301 de cada mês. Vendido: NFS do Extrato do Focco. Venda média: últimos ${T.u3.length} meses fechados. "Previsão parada": previsão em 3 meses ou mais que mudou ${cmP(CT_PARADA)} ou menos, e o item vendeu ${cmP(CT_VENDEU)} ou menos dela. Mês em andamento: vendido até o último dia do Extrato importado. Sem ensacado, premix, nivelador e exportação.</p></section>`; }

/* ---------- PDF (página 5) ---------- */
function ctPdf(P){ let T; try{ T=ctCalc(); }catch(e){ console.warn('[comercial tendência pdf]',e); return; } if(!T||!T.meses.length) return; const C=GPDF.cor;
  P.nova(); P.secao('5 · Previsão × venda, mês a mês','a venda mudou; e a previsão?'); P.texto(ctFrase(T),{c:'ink',fs:9.5});
  if(T.CP.length>=2) P.kpis([{t:'Venda '+ctMC(T.a.m)+' a '+ctMC(T.b.m),v:ctSinal(T.varV,1),s:cmN(T.a.vend)+' a '+cmN(T.b.vend),c:T.varV<=-0.03?'crit':'pet'},
    {t:'Previsão '+ctMC(T.a.m)+' a '+ctMC(T.b.m),v:ctSinal(T.varP,1),s:cmN(T.a.prev)+' a '+cmN(T.b.prev),c:'warn'},
    {t:'Vendido ÷ previsto',v:cmP(T.pct3),s:'últimos '+T.n3+' meses',c:T.pct3!=null&&T.pct3<0.9?'crit':'ok'},
    T.atual?{t:'Previsão de '+ctMC(T.atual.m),v:cmN(T.atual.prev),s:T.cmp==null?'':ctSinal(T.cmp,1)+' sobre a venda média',c:T.cmp>0.1?'crit':'pet'}:{t:'Previsto a mais',v:cmN(Math.max(0,T.sobra3)),s:'últimos '+T.n3+' meses',c:'warn'}],4);
  cmCols(P,T.meses.map(x=>ctMC(x.m)+(x.fechado?'':'*')),[{n:'Previsão do mês',v:T.meses.map(x=>x.prev),c:C.cinza},{n:'Vendido',v:T.meses.map(x=>x.vend),c:C.crit}],{h:44});
  P.tabela([{t:'Mês',w:30},{t:'Previsão',w:20,al:'r'},{t:'Vendido',w:20,al:'r'},{t:'Vend. ÷ prev.',w:18,al:'r'},{t:'Previsto a mais',w:22,al:'r'},{t:'Prev. (t)',w:16,al:'r'},{t:'Vend. (t)',w:16,al:'r'}],
    T.meses.map(x=>{ const r=[cmMesNome(x.m)+(x.fechado?'':' *'),x.temPrev?cmN(x.prev):'sem previsão',cmN(x.vend),x.pct==null?'—':cmP(x.pct),x.temPrev&&x.fechado&&x.prev>x.vend?cmN(x.prev-x.vend):'—',x.temPrev?Math.round(x.prevT).toLocaleString('pt-BR'):'—',Math.round(x.vendT).toLocaleString('pt-BR')]; r._cor={3:x.pct==null?null:x.pct<0.8?'crit':x.pct<0.95?'warn':'ok'}; return r; }));
  P.texto('* mês em andamento: vendido até '+cmD((T.meses.find(x=>!x.fechado)||{F:{}}).F.ate||'')+'; o % compara com a previsão proporcional aos dias úteis até lá.',{fs:7.5});
  P.secao('Itens com a previsão acima da venda',T.lista.length?T.lista.length+(T.lista.length===1?' item':' itens')+(T.paradas.length?' · '+T.paradas.length+' com a previsão parada':''):'');
  if(T.lista.length){ const cols=[{t:'Item',w:14},{t:'Produto',w:42}].concat(T.CPm.slice(-3).map(m=>({t:ctMC(m),w:17,al:'r'})),[{t:'Prev. '+(T.ref?ctMC(T.ref):''),w:20,al:'r'},{t:'Média 3 m',w:16,al:'r'},{t:'Acima',w:19,al:'r'},{t:'Parada',w:12,al:'r'}]);
    const off=T.CPm.length-Math.min(3,T.CPm.length);
    P.tabela(cols,T.lista.slice(0,40).map(r=>{ const x=[r.c,r.d].concat(r.vends.slice(off).map((v,i)=>{ const p=r.prevs[off+i]; return cmN(v)+(p?' ('+cmP(v/p)+')':''); }),[cmN(r.pa),cmN(r.vm),'+'+cmN(r.acima)+(r.vm?' ('+cmP(r.acima/r.vm)+')':''),r.parada?'sim':'']); x._cor={[x.length-2]:'crit',[x.length-1]:r.parada?'crit':null}; return x; })
      .concat([Object.assign(['Total',''].concat(T.CPm.slice(-3).map(()=>''),[cmN(T.lista.reduce((s,r)=>s+r.pa,0)),cmN(T.lista.reduce((s,r)=>s+r.vm,0)),'+'+cmN(T.acimaTot),'']),{_tot:1})])); }
  else P.vazio('Nenhum item com a previsão acima da venda média.');
  P.texto('Colunas dos meses = vendido no mês (entre parênteses, % da previsão daquele mês). Média 3 m = venda média = últimos '+T.u3.length+' meses fechados. Parada = previsão em 3 meses ou mais que mudou '+cmP(CT_PARADA)+' ou menos, e o item vendeu '+cmP(CT_VENDEU)+' ou menos dela. Sem ensacado, premix, nivelador e exportação.',{fs:7.5}); }

try{ window.Painel=window.Painel||{}; if(window.Painel.comercial) Object.assign(window.Painel.comercial,{tendencia:()=>ctCalc(),tendFrase:()=>ctFrase(ctCalc())}); }catch(e){}
document.head.insertAdjacentHTML('beforeend',`<style id="ct-css">
.ct-ch{display:flex;gap:10px;align-items:stretch;margin:14px 0 4px;padding:0 4px}
.ct-m{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}
.ct-bs{height:170px;width:100%;display:flex;gap:4px;align-items:flex-end;justify-content:center;padding-top:18px}
.ct-b{display:block;position:relative;width:34%;max-width:38px;border-radius:5px 5px 0 0}
.ct-b.p{background:#B9C6CE}.ct-b.v{background:var(--crit)}.ct-b.z{height:2px;background:repeating-linear-gradient(90deg,#B9C6CE 0 3px,transparent 3px 6px)}
.ct-b em{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-style:normal;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--muted);white-space:nowrap;margin-bottom:2px}
.ct-m>span{font-size:12.5px;font-weight:600;text-align:center;line-height:1.2}.ct-m>span small{display:block;font-weight:400;color:var(--muted);font-size:10.5px}
.ct-lg{display:flex;gap:18px;font-size:12px;color:var(--muted);margin:2px 4px 6px}.ct-lg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}.ct-lg i.p{background:#B9C6CE}.ct-lg i.v{background:var(--crit)}
.ct-de{display:block;font-size:11px;color:var(--muted);font-weight:400}
@media (max-width:700px){ .ct-ch{gap:4px} .ct-b em{display:none} .ct-bs{height:130px} }
</style>`);
