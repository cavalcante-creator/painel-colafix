/* Painel Colafix · 80-estoque-focco.js (04/11, "nosso estoque nunca está certo · no Focco acaba tendo mais no sistema do que no físico").
   Tela `anlxf` "Estoque × Focco" em Análise PCP › Sistema: raio-x de cada divergência das contagens do inventário.
   Para cada item, pega a contagem mais recente do período e refaz a conta:
     Focco na contagem   = saldo do sistema que a contagem usou (saldoSistema3/30 = saldo da ÚLTIMA importação do Focco)
     vendido/produzido entre a foto do saldo e a contagem (NFS/EPP do Extrato, `vendas.diario`, só os dias inteiros entre as duas)
     diferença real      = contado − (Focco na contagem − faturado depois + produzido depois)
   e mostra as causas que os dados conseguem medir:
     · rasgados contados à parte (qtdRasgada da contagem) — estão no Focco e não entram no contado;
     · Focco apontou mais que o painel, por ordem de produção (EPP do Extrato por nº de ordem `pcpvendas.op` × apontamentos do painel);
     · perdas lançadas no posto (`perdas`) que não têm baixa no Extrato.
   Só leitura. Lê ao abrir: contagens do período (se ainda não carregadas), fotos do saldo `pcpsnap` do período,
   1 documento `pcpvendas` por mês e os apontamentos/perdas do período (`praBusca`). Prefixo `xf`. */
"use strict";
S.xf=S.xf||{dias:60,q:'',so:'falta',ab:null,dados:{},lendo:{}};
const XF_BLOCOS={'Almox 3':[3],'Rejunte / Área Líquida':[3],'Separação':[3],'Almox 1':[3],'Almox 30':[30],'Almox 2':[30],'Todos':[3,30]};
const xfN=v=>v==null||!isFinite(v)?'—':Math.round(v).toLocaleString('pt-BR');
const xfS=v=>v==null||!isFinite(v)?'—':(v>0.5?'+':v<-0.5?'−':'')+Math.abs(Math.round(v)).toLocaleString('pt-BR');
function xfDesc(c){ const it=(((S.anl.base||{}).itens||{}).l||{})[c]||{}; return it.d||((typeof itemDe==='function'&&itemDe(c))||{}).descricao||''; }

/* ---------- leitura ---------- */
function xfCarrega(dias){ const X=S.xf, k=String(dias); if(X.dados[k]||X.lendo[k]||!S.db) return X.dados[k]||null; X.lendo[k]=true;
  const h=hojeStr(), de=addDias(h,-dias), de2=addDias(de,-20), db=S.db, ini=new Date(de+'T00:00:00').toISOString();
  (async()=>{ const out={de,h,conf:[],snaps:[],meses:{},ent:[],per:[],erro:''};
    try{ if(S.alx&&S.alx._l_conferencias) out.conf=S.alx.conferencias.filter(c=>c&&!c.excluida&&String(c.em||'')>=ini);
      else { const q=await db.collection('conferencias').where('em','>=',ini).orderBy('em','desc').limit(400).get(); out.conf=q.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(c=>!c.excluida); } }catch(e){ console.warn('[estoque×focco] contagens',e); out.erro='contagens'; }
    try{ const q=await db.collection('pcpsnap').where('data','>=',de2).orderBy('data').limit(150).get(); out.snaps=q.docs.map(d=>d.data()).filter(x=>x&&x.data).sort((a,b)=>String(a.em||a.data).localeCompare(String(b.em||b.data))); }catch(e){ console.warn('[estoque×focco] saldos',e); }
    try{ for(const cp of praMeses(de2,h)){ const s=await db.doc('pcpvendas/'+cp).get(); if(s.exists) out.meses[cp]=s.data(); } }catch(e){ console.warn('[estoque×focco] extrato',e); }
    try{ const d=await praBusca(de2,h); out.ent=(d&&d.ent)||[]; out.per=(d&&d.per)||[]; }catch(e){ console.warn('[estoque×focco] apontamentos',e); }
    X.dados[k]=out; X.lendo[k]=false; if(S.view==='anlxf') rerenderSeguro(); })();
  return null; }

/* ---------- contas ---------- */
/* dia da foto do saldo usada numa contagem: a última importação de saldo antes dela */
function xfSaldoDia(snaps,em){ let d=null; snaps.forEach(s=>{ const t=s.em||s.data+'T23:59'; if(t<=em) d=s.data; }); return d; }
function xfMov(c,de,ate,excl){ const D=(((S.anl.base||{}).vendas||{}).diario||{})[c]||{}; let ent=0,sai=0;
  for(const d in D){ if(excl?(d<=de||d>=ate):(d<de||d>ate)) continue; ent+=+D[d][0]||0; sai+=+D[d][1]||0; } return {ent,sai}; }
function xfCalc(dias){ const B=S.anl.base||{}; const D=xfCarrega(dias); if(!D) return null; const V=B.vendas||{}, vAte=V.ate||'';
  /* 1 · contagens por item (a mais recente de cada dia) */
  const por={};
  D.conf.slice().sort((a,b)=>String(a.em||'').localeCompare(String(b.em||''))).forEach(cf=>{ const bl=XF_BLOCOS[cf.local]||[3,30], dia=cf.dia||hojeStr(new Date(cf.em)), sd=xfSaldoDia(D.snaps,cf.em||'');
    for(const c in (cf.itens||{})){ const it=cf.itens[c]||{}; const cont=bl.reduce((a,b)=>a+(+it['almox'+b]||0),0), sis=bl.reduce((a,b)=>a+(+it['saldoSistema'+b]||0),0);
      const outro=bl.length===1?(+it['saldoSistema'+(bl[0]===3?30:3)]||0):0; /* contou só um almox e o item tem saldo no outro: o Extrato não separa por almox */
      const x={em:cf.em,dia,local:cf.local||'',num:cf.numero||cf._id,por:cf.nomeUsuario||cf.porNome||'',cont,sis,dif:cont-sis,rasg:+it.qtdRasgada||0,zero:!!it.confirmadoZero,sd,adj:!outro};
      if(x.adj&&sd&&sd<dia&&(!vAte||sd<vAte)){ const m=xfMov(c,sd,dia,true); x.ent=m.ent; x.sai=m.sai; } else { x.ent=0; x.sai=0; }
      { const a=xfMov(c,dia,dia,false), b=sd&&sd!==dia?xfMov(c,sd,sd,false):{ent:0,sai:0}; x.inc=(a.sai-a.ent)+(b.sai-b.ent); }
      x.esp=x.sis-x.sai+x.ent; x.real=x.adj?x.cont-x.esp:x.dif;
      const L=por[c]=por[c]||[]; const k=L.findIndex(y=>y.dia===dia&&y.local===x.local); if(k>=0) L[k]=x; else L.push(x); } });
  /* 2 · Focco × painel por ordem de produção */
  const an=new Set(D.ent.filter(e=>e.anula).map(e=>e.anula)), pain={}, ateP=vAte?addDias(vAte,1):'9';
  D.ent.forEach(e=>{ if(e.anula||an.has(e._id)||!e.num) return; const d=e.em?hojeStr(new Date(e.em)):''; if(d<D.de||d>ateP) return; pain[e.num]=(pain[e.num]||0)+(+e.qtd||0); });
  const foc={}; for(const cp in D.meses){ const op=D.meses[cp].op||{}; for(const c in op) for(const dd in op[c]){ const dia=cp+'-'+dd; if(dia<D.de) continue; for(const n in op[c][dd]){ const o=foc[n]=foc[n]||{n,c,q:0,de:dia,ate:dia}; o.q+=+op[c][dd][n]||0; if(dia<o.de) o.de=dia; if(dia>o.ate) o.ate=dia; } } }
  const temOp=Object.keys(foc).length>0;
  const ords=Object.values(foc).map(o=>Object.assign(o,{p:pain[o.n]||0,dif:o.q-(pain[o.n]||0)})).filter(o=>o.dif>Math.max(2,o.q*0.01)).sort((a,b)=>b.dif-a.dif);
  const maisPorItem={}; ords.forEach(o=>{ maisPorItem[o.c]=(maisPorItem[o.c]||0)+o.dif; });
  /* 3 · perdas do posto por item */
  const perPorItem={}; D.per.forEach(p=>{ const d=p.em?hojeStr(new Date(p.em)):''; if(d<D.de) return; const o=(typeof ordById==='function'&&p.ordem&&ordById(p.ordem))||null; const c=o?codigoDe(o):codigoDe({produto:p.produto||''}); if(c) perPorItem[c]=(perPorItem[c]||0)+(+p.qtd||0); });
  /* 4 · linha por item (contagem mais recente) */
  const rows=Object.keys(por).map(c=>{ const L=por[c].sort((a,b)=>String(a.em).localeCompare(String(b.em))), u=L[L.length-1];
    const tol=Math.max(5,Math.abs(u.sis)*0.01), falta=Math.max(0,-u.real), faltaV=Math.max(0,-u.dif);
    const r={c,d:xfDesc(c),u,L,n:L.length,tol,falta,faltaV,hor:u.adj?Math.max(0,faltaV-falta):0,rasg:u.rasg,mais:maisPorItem[c]||0,perd:perPorItem[c]||0,
      rep:L.filter(x=>x.real<-Math.max(5,Math.abs(x.sis)*0.01)).length};
    const f=falta;
    if(u.real>tol) r.lei=['Físico acima do Focco','w'];
    else if(f<=tol) r.lei=faltaV>tol?['Era o horário do saldo: vendeu depois da foto','o']:['Bateu','o'];
    else if(r.rasg>=f*0.5) r.lei=['Rasgados contados à parte, ainda no Focco','c'];
    else if(r.mais>=f*0.5) r.lei=['Focco apontou mais que o painel','c'];
    else if(r.perd>=f*0.5) r.lei=['Perdas do posto sem baixa no Focco','c'];
    else if(Math.abs(u.inc)>=f*0.8) r.lei=['Pode ser só o horário (venda no dia da contagem)','w'];
    else r.lei=['Sem explicação nos dados','c'];
    return r; });
  const com=rows.filter(r=>r.falta>r.tol);
  const T={falta:rows.reduce((a,r)=>a+r.faltaV,0),real:com.reduce((a,r)=>a+r.falta,0),hor:rows.reduce((a,r)=>a+r.hor,0),nV:rows.filter(r=>r.faltaV>r.tol).length,nR:com.length,
    rasg:com.reduce((a,r)=>a+Math.min(r.rasg,r.falta),0),mais:com.reduce((a,r)=>a+Math.min(r.mais,r.falta),0),perd:com.reduce((a,r)=>a+Math.min(r.perd,r.falta),0),
    sempre:rows.filter(r=>r.n>=2&&r.rep>=2&&r.rep/r.n>=0.6).length,acima:rows.filter(r=>r.u.real>r.tol).length};
  T.sem=Math.max(0,T.real-T.rasg-T.mais-T.perd);
  return {D,rows,ords,temOp,T,nConf:D.conf.length,vAte}; }
function xfFrase(X){ const T=X.T; if(!X.rows.length) return 'Nenhuma contagem do inventário no período.';
  let s=`Nas contagens dos últimos ${S.xf.dias} dias, ${T.nV} ${T.nV===1?'item ficou':'itens ficaram'} abaixo do Focco (${xfN(T.falta)} a menos no físico).`;
  if(T.hor>0) s+=` ${xfN(T.hor)} disso é só o horário: foi vendido depois da foto do saldo que a contagem usou.`;
  s+=T.nR?` Sobram ${xfN(T.real)} de falta de verdade em ${T.nR} ${T.nR===1?'item':'itens'}${T.sempre?`; ${T.sempre} ${T.sempre===1?'falta':'faltam'} contagem após contagem`:''}.`:' Depois de descontar o horário, não sobra falta.';
  return s; }

/* ---------- tela ---------- */
function vXf(){ const A=S.xf; const head=`<div class="head"><div><div class="eyebrow">ANÁLISE PCP · SISTEMA</div><h1>Estoque × Focco</h1>
    <p class="sub">Por que o Focco tem mais do que o físico: cada contagem do inventário, refeita com o que entrou e saiu depois da foto do saldo.</p></div>
    <div class="row" style="gap:8px;flex-wrap:wrap">${[30,60,90].map(d=>`<button class="btn ${A.dias===d?'':'sec'}" data-act="xf-dias" data-v="${d}" style="height:40px">${d} dias</button>`).join('')}</div></div>`;
  if(!S.anl.base||!S.anl.base.itens) return head+'<div class="empty">Carregando a base…</div>';
  const X=xfCalc(A.dias); if(!X) return head+'<section class="card"><div class="empty">Buscando as contagens, as fotos do saldo e o Extrato do período…</div></section>';
  const T=X.T, k=(t,v,s,c)=>`<div class="cm-k ${c||''}"><span>${t}</span><b class="num">${v}</b><i>${s||''}</i></div>`, pill=(t,c)=>`<span class="cm-pl ${c}">${t}</span>`;
  const tab=(cols,rows,vazio,nl)=>rows.length?`<div class="cm-tw"><table class="cm-t"><thead><tr>${cols.map((c,i)=>`<th${i<(nl||2)?' class="l"':''}>${c}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="empty">${vazio}</div>`;
  if(!X.rows.length) return head+`<section class="card"><div class="empty">Nenhuma contagem do inventário nos últimos ${A.dias} dias.</div></section>`;
  const mx=Math.max(1,T.rasg,T.mais,T.perd,T.sem,T.hor);
  const bar=(t,v,c,s)=>`<div class="xf-br"><span>${t}</span><i><em class="${c}" style="width:${Math.max(v>0?1:0,v/mx*100)}%"></em></i><b class="num">${xfN(v)}</b><small>${s||''}</small></div>`;
  const q=anlNorm(A.q||''); let rs=X.rows.filter(r=>!q||anlNorm(r.c+' '+r.d).includes(q));
  if(A.so==='falta') rs=rs.filter(r=>r.falta>r.tol); else if(A.so==='vis') rs=rs.filter(r=>r.faltaV>r.tol||r.falta>r.tol);
  rs.sort((a,b)=>b.falta-a.falta||b.faltaV-a.faltaV);
  const linha=r=>{ const u=r.u, ab=A.ab===r.c;
    return `<tr class="xf-tr${ab?' ab':''}" data-act="xf-ab" data-v="${esc(r.c)}"><td class="l"><b>${esc(r.c)}</b></td><td class="l">${esc(r.d)}<small class="xf-de">${dm(u.dia)} · ${esc(u.local||'')}${u.sd?' · saldo de '+dm(u.sd):''}</small><span class="xf-lei">${pill(r.lei[0],r.lei[1])}</span></td>
      <td>${xfN(u.cont)}</td><td>${xfN(u.sis)}</td><td><span class="${u.dif<-r.tol?'cm-neg':''}">${xfS(u.dif)}</span></td>
      <td>${u.adj?(u.sai||u.ent?`<span title="faturado ${xfN(u.sai)} · produzido ${xfN(u.ent)}">−${xfN(u.sai)} / +${xfN(u.ent)}</span>`:'—'):'<small>não separa almox</small>'}</td>
      <td><b class="${u.real<-r.tol?'cm-neg':''}">${xfS(u.real)}</b></td><td>${r.rasg?xfN(r.rasg):'—'}</td><td>${r.mais?xfN(r.mais):'—'}</td><td>${r.perd?xfN(r.perd):'—'}</td>
      <td>${r.n>1?`${r.rep} de ${r.n}`:'—'}</td></tr>`+(ab?`<tr class="xf-det"><td colspan="11">${xfHist(r)}</td></tr>`:''); };
  const cab=['Item','Produto','Contado','Focco na contagem','Diferença','Vendido / produzido depois da foto','Diferença de verdade','Rasgados','Focco a mais que o painel','Perdas do posto','Falta em'];
  const ordT=X.temOp?tab(['Ordem','Item','Produto','Dias','No Focco (EPP)','No painel','Focco a mais'],X.ords.slice(0,40).map(o=>`<tr><td class="l"><b>${esc(o.n)}</b></td><td class="l">${esc(o.c)}</td><td class="l">${esc(xfDesc(o.c))}</td><td>${o.de===o.ate?dm(o.de):dm(o.de)+' a '+dm(o.ate)}</td><td>${xfN(o.q)}</td><td>${xfN(o.p)}</td><td><b class="cm-neg">+${xfN(o.dif)}</b></td></tr>`),'Nenhuma ordem com mais produção no Focco do que no painel no período.',3)
    :'<div class="cm-av">O Extrato importado ainda não tem o número da ordem de cada produção (EPP). Importe o Extrato do Focco de novo na Base de dados para comparar ordem por ordem.</div>';
  return head+`${X.D.erro?'<div class="cm-av">Não foi possível ler as contagens do inventário agora.</div>':''}<div class="cm">
  <section class="card cm-s"><div class="cm-q">ONDE O FOCCO FICA ACIMA DO FÍSICO</div><p class="cm-r">${esc(xfFrase(X))}</p>
   <div class="cm-ks">${k('Faltou na contagem',xfN(T.falta),T.nV+' itens abaixo do Focco','c')}${k('Era só o horário do saldo',xfN(T.hor),'vendido depois da foto do saldo','o')}${k('Falta de verdade',xfN(T.real),T.nR+' itens','c')}${k('Faltam sempre',String(T.sempre),'itens com falta em 2 ou mais contagens','w')}</div>
   <h3 class="cm-h3">De onde vem a falta de verdade</h3>
   <div class="xf-bars">${bar('Rasgados contados à parte',T.rasg,'r','continuam no Focco e não entram no contado')}${bar('Focco apontou mais que o painel',T.mais,'m','produção lançada a mais no Focco, por ordem')}${bar('Perdas do posto',T.perd,'p','lançadas no painel, sem baixa no Focco')}${bar('Sem explicação nos dados',T.sem,'s','carga sem nota, amostra, troca de item, contagem errada…')}</div>
   ${T.acima?`<p class="cm-nota">${T.acima} ${T.acima===1?'item ficou':'itens ficaram'} com o físico acima do Focco.</p>`:''}</section>
  <section class="card cm-s"><div class="cm-q">ITEM POR ITEM</div>
   <div class="xf-fb"><label class="srch">${ic('lupa',16,2)}<input class="txt" id="xf-q" value="${esc(A.q||'')}" placeholder="Buscar código ou produto (Enter)" autocomplete="off"></label>
    <div class="seg">${[['falta','Com falta de verdade'],['vis','Com qualquer falta'],['todos','Todos contados']].map(([v,t])=>`<button class="${A.so===v?'on':''}" data-act="xf-so" data-v="${v}">${t}</button>`).join('')}</div><span class="sub" style="margin:0">${rs.length} de ${X.rows.length} itens · toque no item para ver todas as contagens</span></div>
   ${tab(cab,rs.slice(0,150).map(linha),A.so==='falta'?'Nenhum item com falta de verdade. Veja "Com qualquer falta".':'Nada para mostrar.')}</section>
  <section class="card cm-s"><div class="cm-q">ORDENS COM MAIS PRODUÇÃO NO FOCCO DO QUE NO PAINEL</div>
   <p class="cm-r">${X.temOp?(X.ords.length?`${X.ords.length} ${X.ords.length===1?'ordem tem':'ordens têm'} mais sacos apontados no Focco do que no painel (${xfN(X.ords.reduce((a,o)=>a+o.dif,0))} a mais). Cada saco a mais no Focco vira saldo que não existe no físico.`:'Todas as ordens do período batem com o painel.'):''}</p>${ordT}</section>
  <p class="cm-nota">Contagens: inventário (Conferência), a mais recente de cada item no período; conta só o almoxarifado contado (Almox 3, Almox 30 ou Todos). "Focco na contagem" é o saldo que a contagem comparou, que é o da última importação do saldo do Focco antes dela. "Vendido / produzido depois da foto" usa o Extrato (NFS e EPP) dos dias inteiros entre a foto do saldo e a contagem; o que aconteceu no próprio dia da foto ou da contagem pode ter sido antes ou depois (fica como "pode ser só o horário"). Quando a contagem foi de um almoxarifado só e o item tem saldo no outro, não dá para separar o Extrato por almox. Ordens: EPP do Extrato por nº da ordem × apontamentos do painel, desde ${dm(X.D.de)}${X.vAte?' até '+dm(X.vAte)+' (fim do Extrato importado)':''}. Diferença menor que 5 ou 1% do saldo conta como "bateu".</p></div>`; }
function xfHist(r){ return `<div class="xf-h"><b>Contagens de ${esc(r.c)}</b><table class="cm-t"><thead><tr><th class="l">Dia</th><th class="l">Onde · quem</th><th>Contado</th><th>Focco</th><th>Diferença</th><th>Depois da foto</th><th>De verdade</th><th>Rasgados</th></tr></thead><tbody>${r.L.slice().reverse().map(x=>`<tr><td class="l">${dm(x.dia)}${x.sd?`<small class="xf-de">saldo de ${dm(x.sd)}</small>`:''}</td><td class="l">${esc(x.local)}${x.por?' · '+esc(x.por):''}</td><td>${xfN(x.cont)}</td><td>${xfN(x.sis)}</td><td>${xfS(x.dif)}</td><td>${x.adj?(x.sai||x.ent?'−'+xfN(x.sai)+' / +'+xfN(x.ent):'—'):'—'}</td><td><b class="${x.real<-r.tol?'cm-neg':''}">${xfS(x.real)}</b></td><td>${x.rasg?xfN(x.rasg):'—'}</td></tr>`).join('')}</tbody></table></div>`; }

/* ---------- ligação ---------- */
VIEWS.anlxf={nome:'Estoque × Focco',ic:'caixa',mob:'Estoque'}; CRUMB.anlxf='Estoque × Focco'; S.extViews=S.extViews||{}; S.extViews.anlxf=()=>banner()+vXf();
function xfReg(){ const M=MODS.find(x=>x.id==='analise'); if(M&&!M.views.includes('anlxf')) M.views.push('anlxf');
  try{ const g=(NAV_GRP.analise||[]).find(x=>x.k==='sis'); if(g&&!g.v.includes('anlxf')) g.v.push('anlxf'); }catch(e){} }
xfReg(); setTimeout(xfReg,0);
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="xf-"]'); if(!b) return; const a=b.dataset.act, X=S.xf;
  if(a==='xf-dias'){ X.dias=+b.dataset.v||60; render(); return; }
  if(a==='xf-so'){ X.so=b.dataset.v; render(); return; }
  if(a==='xf-ab'){ X.ab=X.ab===b.dataset.v?null:b.dataset.v; render(); return; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='xf-q'){ ev.preventDefault(); S.xf.q=ev.target.value.trim(); render(); } });
document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='xf-q'){ S.xf.q=ev.target.value.trim(); render(); } });
try{ window.Painel=window.Painel||{}; window.Painel.estoqueFocco={calc:d=>xfCalc(d||S.xf.dias),frase:d=>xfFrase(xfCalc(d||S.xf.dias)),S:()=>S}; }catch(e){}
document.head.insertAdjacentHTML('beforeend',`<style id="xf-css">
.xf-bars{display:flex;flex-direction:column;gap:10px;margin:6px 0 4px}
.xf-br{display:grid;grid-template-columns:230px 1fr 80px;grid-template-rows:auto auto;column-gap:12px;align-items:center}
.xf-br>span{font-weight:600;font-size:13.5px}.xf-br>i{height:14px;border-radius:7px;background:var(--surface-2,#EEF2F5);overflow:hidden;display:block}
.xf-br>i>em{display:block;height:100%;border-radius:7px}.xf-br em.r{background:#C9852E}.xf-br em.m{background:var(--crit)}.xf-br em.p{background:#8A6BB8}.xf-br em.s{background:#8C99A3}
.xf-br>b{text-align:right;font-size:15px}.xf-br>small{grid-column:2/4;color:var(--muted);font-size:12px}
.xf-fb{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:4px 0 10px}.xf-fb .srch{flex:1 1 240px;margin:0;max-width:340px}
.xf-lei{display:block;margin-top:4px}.xf-lei .cm-pl{white-space:normal}
.xf-de{display:block;font-size:11px;color:var(--muted);font-weight:400}
.xf-tr{cursor:pointer}.xf-tr>td:nth-child(2){min-width:240px}.xf-det>td{text-align:left!important}.xf-tr.ab td{background:var(--surface-2,#EEF2F5)}
.xf-det td{padding:0 0 12px!important;background:var(--surface-2,#EEF2F5)}.xf-h{padding:10px 12px}.xf-h>b{display:block;margin-bottom:6px}
@media (max-width:700px){ .xf-br{grid-template-columns:1fr 70px}.xf-br>i{grid-column:1/3;grid-row:2}.xf-br>small{grid-column:1/3} }
</style>`);
