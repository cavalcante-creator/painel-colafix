/* Painel Colafix · 71-comercial.js (28/10, pedido "relatórios onde possamos nos defender do comercial"; protótipo aprovado
   "Produção × Comercial", PDF para a reunião). Tela `anlcom` em Análise PCP › Mês, com "Baixar PDF do mês".
   Responde 4 cobranças:
   1. "Faltou produto"          previsão do comercial (RPRE0301) × faturado (NFS do Extrato), item a item, com o que tinha no dia 1º e o produzido (EPP).
   2. "Atrasou o pedido"        quando o pedido entrou na carteira (foto diária do Perfil, DC) × entrega pedida × tempo de reposição do item.
   3. "Não produziu o previsto" previsto × produzido × faturado por linha; o que foi previsto e não vendeu (estoque que sobrou).
   4. "Mudaram em cima da hora" quanto entrou na carteira de um dia para o outro e cada troca da previsão no mês.
   O que começa a ser guardado agora (a cada importação na Base de dados, inclusive pelo robô do Focco):
   - pcpcart/{AAAA-MM-DD}  carteira do Perfil com a data de entrega {dia, em, atual, l:{item:{entrega:qtd}}}
   - pcpprevver/{id}       cada versão da previsão {cp, em, por, l:{item:qtd}, ant:true quando é a que já estava}
   Sem essas fotos, a parte 2 usa o total da carteira de pcpsnap (sem data de entrega).
   Prefixo `cm`. */
"use strict";
const CM_SALTO=1000; /* "em cima da hora": subiu pelo menos isto de um dia para o outro */
S.cm=S.cm||{cp:'',dados:{},lendo:{}};

/* ---------- guardar carteira e versões da previsão a cada importação ---------- */
{ const _m=anlMontar; anlMontar=function(partes,base,meses,agora){ const r=_m.apply(this,arguments);
    try{ const P=partes||{}; const g={em:agora||new Date().toISOString()};
      if(P.perfil&&P.perfil.l) g.perfil={atual:P.perfil.atual||g.em,l:P.perfil.l};
      if(P.prevMes&&P.prevMes.l){ const cp=P.prevMes.comp, pv=(base&&base.prev)||{}; g.prev={cp,l:P.prevMes.l,ant:pv.mes&&pv.mes[cp]?{l:pv.mes[cp],em:(pv.mesEm||{})[cp]||''}:null}; }
      S.cm._grava=(g.perfil||g.prev)?g:null; }catch(e){ console.warn('[comercial] montar',e); }
    return r; }; }
{ const _g=anlGravar; anlGravar=async function(){ const r=await _g.apply(this,arguments);
    try{ const g=S.cm._grava; S.cm._grava=null; const ok=!(S.anl.imp&&S.anl.imp.arqs&&S.anl.imp.arqs.length); if(g&&ok) await cmGuardar(g); }catch(e){ console.warn('[comercial] guardar',e); }
    return r; }; }
function cmCart(perfilL){ const l={}; (perfilL||[]).forEach(([c,t,f,q])=>{ if(t!=='DC'||!f) return; const v=Math.abs(+q||0); if(!v) return; const o=l[c]=l[c]||{}; o[f]=Math.round(((o[f]||0)+v)*100)/100; }); return l; }
async function cmGuardar(g){ if(!S.db) return;
  if(g.perfil){ const dia=String(g.perfil.atual||g.em).slice(0,10); await S.db.doc('pcpcart/'+dia).set({dia,em:g.em,atual:g.perfil.atual||'',l:cmCart(g.perfil.l)}); }
  if(g.prev){ const q=await S.db.collection('pcpprevver').where('cp','==',g.prev.cp).limit(30).get(); const ja=q.docs.length;
    if(!ja&&g.prev.ant) await S.db.doc('pcpprevver/'+g.prev.cp+'_0').set({cp:g.prev.cp,em:g.prev.ant.em||'',l:g.prev.ant.l,ant:true});
    await S.db.doc('pcpprevver/'+g.prev.cp+'_'+g.em.replace(/\D/g,'').slice(0,14)).set({cp:g.prev.cp,em:g.em,por:S.uid||null,l:g.prev.l}); }
  Object.keys(S.cm.dados).forEach(k=>delete S.cm.dados[k]); }
/* primeira vez: guarda o que já está na base (carteira de hoje e a previsão atual) como ponto de partida */
async function cmSemente(cp){ if(!S.db) return; const B=S.anl.base||{};
  try{ if(B.perfil&&B.perfil.l&&B.perfil.l.length){ const dia=String(B.perfil.atual||'').slice(0,10); if(dia){ const s=await S.db.doc('pcpcart/'+dia).get(); if(!s.exists) await S.db.doc('pcpcart/'+dia).set({dia,em:new Date().toISOString(),atual:B.perfil.atual,l:cmCart(B.perfil.l),semente:true}); } }
    const pm=B.prev&&B.prev.mes&&B.prev.mes[cp]; if(pm){ const q=await S.db.collection('pcpprevver').where('cp','==',cp).limit(1).get(); if(!q.docs.length) await S.db.doc('pcpprevver/'+cp+'_0').set({cp,em:(B.prev.mesEm||{})[cp]||'',l:pm,ant:true}); }
  }catch(e){ /* só ver: não grava */ } }

/* ---------- leitura (sob demanda, só o mês) ---------- */
/* ensacado, premix e intermediários (M…) não são material pronto: ficam fora do relatório */
function cmInt(c){ const B=S.anl.base||{}, it=((B.itens||{}).l||{})[c]||{}; const d=it.d||((typeof itemDe==='function'&&itemDe(c))||{}).descricao||''; return /^M\d/.test(c)||/ENSACAD|PREMIX/i.test(d); }
/* filtros da tela (valem também para o PDF): linha, família, embalagem e busca */
S.cm.f=S.cm.f||{ln:'',fam:'',emb:'',q:''};
function cmDesc(c){ const it=(((S.anl.base||{}).itens||{}).l||{})[c]||{}; return it.d||((typeof itemDe==='function'&&itemDe(c))||{}).descricao||''; }
function cmLnDe(c){ const it=(((S.anl.base||{}).itens||{}).l||{})[c]||{}; return cmLinha({linhas:anlLinhasDe(c,it)}); }
function cmFiltrando(){ const f=S.cm.f; return !!(f.ln||f.fam||f.emb||f.q); }
function cmOk(c,d){ const f=S.cm.f; if(!cmFiltrando()) return true; d=d||cmDesc(c);
  if(f.ln&&cmLnDe(c)!==f.ln) return false; if(f.fam&&eswFam(d)!==f.fam) return false; if(f.emb&&eswEmb(d)!==f.emb) return false;
  if(f.q){ const t=anlNorm(c+' '+d); if(!anlNorm(f.q).split(/\s+/).filter(Boolean).every(w=>t.includes(w))) return false; } return true; }
function cmFora(c,d){ return cmInt(c)||!cmOk(c,d); }
function cmFiltroTxt(){ const f=S.cm.f, xs=[]; if(f.ln) xs.push(f.ln); if(f.fam) xs.push('família '+f.fam); if(f.emb) xs.push('embalagem '+f.emb.toLowerCase()); if(f.q) xs.push('"'+f.q+'"'); return xs.join(' · '); }
const cmFimMes=cp=>{ const y=+cp.slice(0,4), m=+cp.slice(5,7); return cp+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0'); };
function cmCarrega(cp){ const D=S.cm.dados; if(D[cp]||S.cm.lendo[cp]||!S.db) return D[cp]||null; S.cm.lendo[cp]=true;
  const ini=addDias(cp+'-01',-10), fim=cmFimMes(cp);
  (async()=>{ const out={snaps:[],carts:[],vers:[]}; try{ await cmSemente(cp); }catch(e){}
    try{ const q=await S.db.collection('pcpsnap').where('data','>=',ini).where('data','<=',fim).get(); out.snaps=q.docs.map(d=>d.data()).filter(x=>x&&x.data).sort((a,b)=>a.data.localeCompare(b.data)); }catch(e){ console.warn('[comercial] snaps',e); }
    try{ const q=await S.db.collection('pcpcart').where('dia','>=',ini).where('dia','<=',fim).get(); out.carts=q.docs.map(d=>d.data()).filter(x=>x&&x.dia).sort((a,b)=>a.dia.localeCompare(b.dia)); }catch(e){ console.warn('[comercial] carteira',e); }
    try{ const q=await S.db.collection('pcpprevver').where('cp','==',cp).limit(30).get(); out.vers=q.docs.map(d=>d.data()).sort((a,b)=>(a.ant?'':String(a.em)).localeCompare(b.ant?'':String(b.em))); }catch(e){ console.warn('[comercial] versões',e); }
    D[cp]=out; S.cm.lendo[cp]=false; if(S.view==='anlcom') rerenderSeguro(); })();
  return null; }

/* ---------- contas ---------- */
const cmDias=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
/* até onde dá para comparar: hoje, fim do mês e o último dia do Extrato importado (vendido e produzido só existem até lá) */
function cmFrac(cp){ const h=hojeStr(), fim=cmFimMes(cp), ext=((S.anl.base||{}).vendas||{}).ate||'';
  let corte=[fim,h,ext||fim].sort()[0]; if(corte<cp+'-01') return {f:0,ate:cp+'-01',fechado:false,ext,du:0,semExt:true};
  let t=0,p=0; for(let d=cp+'-01';d<=fim;d=addDias(d,1)){ if(anlUtil(d)){ t++; if(d<=corte) p++; } }
  const fechado=corte>=fim; return {f:fechado?1:(t?p/t:1),ate:corte,fechado,du:p,dt:t,ext,porExt:!fechado&&ext&&ext<h&&ext<fim}; }
function cmLinha(r){ const ls=(r.linhas||[]).filter(Boolean); return ls.length===1?ls[0]:ls.length?'Mais de uma linha':'Sem linha'; }
function cmEstDia(snaps,dia,c){ let s=null; snaps.forEach(x=>{ if(x.data<=dia&&x.s&&x.s[c]!=null) s=x.s[c]; }); return s; }
function cmCalc(cp){ const B=S.anl.base||{}; if(!(B.prev&&B.prev.mes)) return null; const R=anlDados();
  const IL=(B.itens||{}).l||{}, F=cmFrac(cp), D=S.cm.dados[cp]||{snaps:[],carts:[],vers:[]};
  const rows0=anlPrevRows(R).filter(r=>r.cp===cp), tem=new Set(rows0.map(r=>r.c)), V=B.vendas||{}, E=(B.prev.est||{})[cp]||{};
  /* vendeu sem previsão nenhuma: o comercial não previu o item */
  for(const c in (V.mensal||{})){ const mm=V.mensal[c][cp]; if(!mm||tem.has(c)||!(mm[1]>0)) continue; const it=IL[c]||{};
    rows0.push({c,cp,d:it.d||((itemDe(c)||{}).descricao)||'',linhas:anlLinhasDe(c,it),ei:E[c]||0,prev:0,fat:mm[1],prod:mm[0]}); }
  const y=+cp.slice(0,4), mm=+cp.slice(5,7), prox=(mm===12?(y+1)+'-01':y+'-'+String(mm+1).padStart(2,'0')), EF=F.fechado&&(B.prev.est||{})[prox]||null; /* mês fechado: estoque do começo do mês seguinte = fim do mês */
  const rows=rows0.filter(r=>!cmFora(r.c,r.d)&&!/ENSACAD|PREMIX/i.test(r.d||'')).map(r=>Object.assign({},r,{pr:r.prev*F.f,ln:cmLinha(r),est:EF?(EF[r.c]||0):(IL[r.c]?(IL[r.c].a3||0)+(IL[r.c].a30||0):null)}));
  /* 1 · faltou produto */
  const tP=rows.reduce((a,r)=>a+r.pr,0), tF=rows.reduce((a,r)=>a+r.fat,0), tPm=rows.reduce((a,r)=>a+r.prev,0), tPd=rows.reduce((a,r)=>a+r.prod,0);
  const err=rows.reduce((a,r)=>a+Math.abs(r.fat-r.pr),0);
  const acima=rows.filter(r=>r.fat>r.pr*1.05&&r.fat-r.pr>=50).map(r=>Object.assign(r,{dif:r.fat-r.pr,disp:r.ei+r.prod,tinha:r.pr>0&&r.ei+r.prod>=r.pr*0.97})).sort((a,b)=>b.dif-a.dif);
  const s1={tP,tF,tPm,tPd,erro:tP?err/tP:0,acima,semPrev:acima.filter(r=>!r.prev),dif:acima.reduce((a,r)=>a+r.dif,0),tinha:acima.filter(r=>r.tinha).length};
  /* 2 · pedidos (carteira com data de entrega) */
  const ped=[]; let fonte2='cart';
  const cs=D.carts; if(cs.length>=2){ for(let i=1;i<cs.length;i++){ const a=cs[i-1], b=cs[i]; if(b.dia.slice(0,7)!==cp) continue; const desde=addDias(a.dia,1);
      for(const c in b.l){ const nb=b.l[c], na=(a.l&&a.l[c])||{}; const sum=o=>Object.values(o).reduce((x,y)=>x+y,0); let sobe=sum(nb)-sum(na); if(sobe<1) continue;
        Object.keys(nb).sort().forEach(f=>{ if(sobe<1) return; const inc=Math.min(sobe,nb[f]-(na[f]||0)); if(inc<1) return; sobe-=inc;
          const pr=Math.max(0,cmDias(desde,f)), tr=IL[c]&&IL[c].trep||null, est=cmEstDia(D.snaps,b.dia,c);
          if(cmFora(c)) return; ped.push({c,d:(IL[c]||{}).d||'',q:inc,de:desde,ate:b.dia,f,prazo:pr,trep:tr,est,curto:tr!=null&&pr<tr,semEst:est!=null&&est<inc}); }); } } }
  else { fonte2='snap'; const sn=D.snaps; for(let i=1;i<sn.length;i++){ const a=sn[i-1], b=sn[i]; if(b.data.slice(0,7)!==cp||!a.dc||!b.dc) continue; const desde=addDias(a.data,1);
      for(const c in b.dc){ if(cmFora(c)) continue; const inc=(b.dc[c]||0)-(a.dc[c]||0); if(inc<1) continue; const tr=IL[c]&&IL[c].trep||null, est=b.s&&b.s[c]!=null?b.s[c]:null;
        ped.push({c,d:(IL[c]||{}).d||'',q:inc,de:desde,ate:b.data,f:'',prazo:null,trep:tr,est,curto:false,semEst:est!=null&&est<inc}); } } }
  ped.sort((a,b)=>a.ate.localeCompare(b.ate)||b.q-a.q);
  const s2={ped,fonte:fonte2,curtos:ped.filter(p=>p.curto),semEst:ped.filter(p=>p.semEst),comData:ped.filter(p=>p.prazo!=null),desde:(cs[0]||{}).dia||''};
  s2.prazoMed=s2.comData.length?s2.comData.reduce((a,p)=>a+p.prazo,0)/s2.comData.length:null; const ct=s2.comData.filter(p=>p.trep!=null); s2.repMed=ct.length?ct.reduce((a,p)=>a+p.trep,0)/ct.length:null;
  /* 3 · produziu o previsto */
  const pl={}; rows.forEach(r=>{ const o=pl[r.ln]=pl[r.ln]||{l:r.ln,prev:0,pr:0,prod:0,fat:0}; o.prev+=r.prev; o.pr+=r.pr; o.prod+=r.prod; o.fat+=r.fat; });
  const LO=linhasOrd(); const porLinha=Object.values(pl).sort((a,b)=>{ const i=x=>{ const k=LO.indexOf(x.l); return k<0?99:k; }; return i(a)-i(b)||a.l.localeCompare(b.l); });
  const sem=F.fechado?(F.dt||22)/5:Math.max(.2,(F.du||1)/5);
  const sobra=rows.filter(r=>r.pr>0&&r.fat<r.pr*0.9&&r.pr-r.fat>=50).map(r=>{ const vs=r.fat/sem; return Object.assign(r,{falta:r.pr-r.fat,semanas:r.est!=null&&vs>0?r.est/vs:null}); }).sort((a,b)=>b.falta-a.falta);
  const s3={estFim:!!EF,porLinha,sobra,prodPct:tP?tPd/tP:0,fatPct:tP?tF/tP:0,sobrou:sobra.reduce((a,r)=>a+(r.est||0),0)};
  /* 4 · em cima da hora */
  const ser=cs.length>=2?cs.map(x=>({dia:x.dia,dc:Object.fromEntries(Object.entries(x.l||{}).map(([c,o])=>[c,Object.values(o).reduce((a,b)=>a+b,0)]))})):D.snaps.filter(x=>x.dc).map(x=>({dia:x.data,dc:x.dc}));
  const dias=[], saltos=[]; for(let i=1;i<ser.length;i++){ const a=ser[i-1], b=ser[i]; if(b.dia.slice(0,7)!==cp) continue; let t=0;
    for(const c in b.dc){ if(cmFora(c)) continue; const inc=(b.dc[c]||0)-(a.dc[c]||0); if(inc>0){ t+=inc; if(inc>=CM_SALTO) saltos.push({dia:b.dia,c,antes:a.dc[c]||0,depois:b.dc[c],inc}); } } dias.push({dia:b.dia,t}); }
  saltos.sort((a,b)=>b.inc-a.inc);
  const vers=D.vers.map((v,i)=>{ const a=i?D.vers[i-1].l||{}:null; if(!a){ const ks=Object.keys(v.l||{}).filter(c=>!cmFora(c)); return {em:v.em,ant:v.ant,n:ks.length,primeira:true,tot:ks.reduce((x,c)=>x+(v.l[c]||0),0)}; }
    let up=0,dn=0,n=0; const ks=new Set([...Object.keys(a),...Object.keys(v.l||{})].filter(c=>!cmFora(c))); ks.forEach(c=>{ const d=((v.l||{})[c]||0)-(a[c]||0); if(Math.abs(d)>=1){ n++; if(d>0) up+=d; else dn-=d; } });
    return {em:v.em,n,up,dn,saldo:up-dn}; });
  const s4={dias,saltos,diasGrandes:dias.filter(d=>d.t>=CM_SALTO),vers,trocas:vers.filter(v=>!v.primeira&&v.n>0),fonte:cs.length>=2?'cart':'snap'};
  return {cp,F,rows,s1,s2,s3,s4,carregado:!!S.cm.dados[cp]}; }

/* ---------- tela ---------- */
const cmN=v=>v==null||!isFinite(v)?'—':Math.round(v).toLocaleString('pt-BR');
const cmP=v=>v==null||!isFinite(v)?'—':Math.round(v*100)+'%';
const cmD=iso=>iso?dm(iso):'—';
function cmMesNome(cp){ const M=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']; return M[+cp.slice(5,7)-1]+' de '+cp.slice(0,4); }
function cmMeses(){ const B=S.anl.base||{}; const h=hojeStr().slice(0,7); const ms=Object.keys((B.prev||{}).mes||{}).filter(k=>k<=h).sort().reverse(); if(!ms.includes(h)&&ms.length) ms.unshift(h); return ms; }
function cmFrases(X){ const a=X.s1, b=X.s2, c=X.s3, d=X.s4, ref=X.F.fechado?'':' até '+cmD(X.F.ate);
  return {
    f1:a.acima.length?`${a.acima.length} ${a.acima.length===1?'item vendeu':'itens venderam'} acima da previsão${ref} (+${cmN(a.dif)}). Em ${a.tinha} deles a produção tinha o previsto (estoque do dia 1º + produzido).${a.semPrev.length?' '+a.semPrev.length+' sem previsão nenhuma.':''}`:`Nenhum item vendeu acima da previsão${ref}.`,
    f2:b.ped.length?(b.fonte==='cart'?`${b.curtos.length} de ${b.ped.length} pedidos entraram com prazo menor que o tempo de reposição do item${b.semEst.length?'; '+b.semEst.length+' sem estoque no dia em que entraram':''}.`:`${b.ped.length} aumentos de carteira no mês${b.semEst.length?', '+b.semEst.length+' sem estoque no dia em que entraram':''}. A data de entrega de cada pedido começou a ser guardada agora.`):'Sem fotos da carteira neste mês para comparar.',
    f3:`A produção fez ${cmP(c.prodPct)} da previsão${ref}; o faturamento ficou em ${cmP(c.fatPct)}.${c.sobra.length?' '+c.sobra.length+(c.sobra.length===1?' item vendeu':' itens venderam')+' menos que o previsto.':''}`,
    f4:d.dias.length?`Em ${d.diasGrandes.length} ${d.diasGrandes.length===1?'dia':'dias'} a carteira subiu ${cmN(CM_SALTO)} ou mais de uma vez.${d.trocas.length?' A previsão foi trocada '+d.trocas.length+(d.trocas.length===1?' vez':' vezes')+' no mês.':''}`:'Sem fotos da carteira neste mês para comparar.' }; }
function cmBarra(cp){ const f=S.cm.f, B=S.anl.base||{}, pm=((B.prev||{}).mes||{})[cp]||{}, V=(B.vendas||{}).mensal||{};
  const cods=[...new Set(Object.keys(pm).concat(Object.keys(V).filter(c=>V[c][cp])))].filter(c=>!cmInt(c)&&!/ENSACAD|PREMIX/i.test(cmDesc(c)));
  const lns=[...new Set(cods.map(cmLnDe))], LO=linhasOrd(); lns.sort((a,b)=>{ const i=x=>{ const k=LO.indexOf(x); return k<0?99:k; }; return i(a)-i(b)||a.localeCompare(b); });
  const fams=[...new Set(cods.map(c=>eswFam(cmDesc(c))))].sort(), embs=[...new Set(cods.map(c=>eswEmb(cmDesc(c))))].sort();
  const sel=(k,rot,ops)=>`<label class="cm-fl${f[k]?' on':''}"><span>${rot}</span><select class="txt" data-cmf="${k}"><option value="">Todas</option>${ops.map(o=>`<option ${f[k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<section class="card cm-fb"><label class="srch cm-busca">${ic('lupa',16,2)}<input class="txt" id="cm-q" value="${esc(f.q)}" placeholder="Buscar código ou produto (Enter)" autocomplete="off"></label>
    ${sel('ln','Linha',lns)}${sel('fam','Família',fams)}${sel('emb','Embalagem',embs)}
    ${cmFiltrando()?`<button class="lnk" data-act="cm-limpar">Limpar filtros</button>`:''}</section>`; }
function vAnlCom(){ const A=S.cm; const ms=cmMeses(); if(!A.cp||!ms.includes(A.cp)) A.cp=ms[0]||hojeStr().slice(0,7);
  let head=`<div class="head"><div><div class="eyebrow">ANÁLISE PCP · ${esc(cmMesNome(A.cp).toUpperCase())}</div><h1>Produção × Comercial</h1>
    <p class="sub">Previsão do comercial, pedidos, produção e faturamento do mês. Para levar à reunião.</p></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><select class="txt" id="cm-mes" style="height:42px;width:auto">${ms.map(m=>`<option value="${m}" ${m===A.cp?'selected':''}>${esc(cmMesNome(m))}</option>`).join('')}</select>
    <button class="btn" data-act="cm-pdf" style="height:42px">${ic('baixar',16,2)}Baixar PDF do mês</button></div></div>`;
  if(!S.anl.lidos.prev&&!S.anl.base.prev) return head+'<div class="empty">Carregando a base…</div>';
  const head0=head; head=head0+cmBarra(A.cp);
  if(!(S.anl.base.prev&&S.anl.base.prev.mes&&S.anl.base.prev.mes[A.cp])) return head+'<section class="card"><div class="empty">Sem a previsão deste mês. Importe o relatório de previsão (RPRE0301) em Sistema › Base de dados.</div></section>';
  cmCarrega(A.cp); const X=cmCalc(A.cp); if(!X) return head+'<div class="empty">Carregando…</div>'; const T=cmFrases(X);
  const k=(t,v,s,c)=>`<div class="cm-k ${c||''}"><span>${t}</span><b class="num">${v}</b><i>${s||''}</i></div>`;
  const tab=(cols,rows,vazio)=>rows.length?`<div class="cm-tw"><table class="cm-t"><thead><tr>${cols.map((c,i)=>`<th${i<2?' class="l"':''}>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i<2?' class="l"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty">${vazio}</div>`;
  const pill=(t,c)=>`<span class="cm-pl ${c}">${t}</span>`, ref=X.F.fechado?'':' até '+cmD(X.F.ate);
  const a=X.s1, b=X.s2, c=X.s3, d=X.s4;
  const sec1=`<section class="card cm-s"><div class="cm-q">“FALTOU PRODUTO”</div><p class="cm-r">${esc(T.f1)}</p>
    <div class="cm-ks">${k('Previsão do comercial'+ref,cmN(a.tP),X.F.fechado?'do mês':'mês inteiro: '+cmN(a.tPm))}${k('Vendido (faturado)',cmN(a.tF),cmP(a.tP?a.tF/a.tP:0)+' da previsão','c')}${k('Erro da previsão',cmP(a.erro),'diferenças somadas ÷ previsão','w')}${k('Venda acima do previsto','+'+cmN(a.dif),a.acima.length+' itens','c')}</div>
    ${tab(['Item','Produto','Previsto','Vendido','Diferença','Tinha dia 1º','Produzido','Tinha o previsto?'],a.acima.slice(0,25).map(r=>[`<b>${esc(r.c)}</b>`,esc(r.d),cmN(r.pr),cmN(r.fat),`<span class="cm-neg">+${cmN(r.dif)}${r.pr?' ('+Math.round(r.dif/r.pr*100)+'%)':' (sem previsão)'}</span>`,cmN(r.ei),cmN(r.prod),r.tinha?pill('sim','o'):pill(r.pr?Math.round(r.disp/r.pr*100)+'%':'—','w')]),'Nenhum item vendeu acima da previsão.')}</section>`;
  const sec2=`<section class="card cm-s"><div class="cm-q">“ATRASOU O PEDIDO”</div><p class="cm-r">${esc(T.f2)}</p>
    ${b.fonte==='snap'?`<div class="cm-av">A carteira com a data de entrega de cada pedido começou a ser guardada ${b.desde?'em '+cmD(b.desde):'agora'}. Até ter duas fotos no mês, a lista mostra o aumento da carteira de cada item, sem a data de entrega; como a carteira cai quando se fatura, um pedido faturado no mesmo dia em que entrou não aparece. Importe o Perfil (RPLA0300) todo dia.</div>`:''}
    <div class="cm-ks">${k('Pedidos no mês',String(b.ped.length),'aumentos da carteira por item')}${b.fonte==='cart'?k('Prazo menor que a reposição',String(b.curtos.length),b.ped.length?cmP(b.curtos.length/b.ped.length)+' dos pedidos':'','c'):''}${k('Sem estoque no dia em que entrou',String(b.semEst.length),'estoque menor que o pedido','w')}${b.fonte==='cart'?k('Prazo médio dado',b.prazoMed==null?'—':(Math.round(b.prazoMed*10)/10).toLocaleString('pt-BR')+' d',b.repMed==null?'':'reposição média '+(Math.round(b.repMed*10)/10).toLocaleString('pt-BR')+' d'):''}</div>
    ${tab(b.fonte==='cart'?['Item','Produto','Qtd.','Entrou','Entrega pedida','Prazo dado','Reposição','Estoque no dia']:['Item','Produto','Subiu','Entrou','Estoque no dia'],
      (b.fonte==='cart'?b.ped.slice().sort((x,y)=>(y.curto-x.curto)||(y.semEst-x.semEst)||x.ate.localeCompare(y.ate)):b.ped.slice().sort((x,y)=>y.q-x.q)).slice(0,30).map(p=>b.fonte==='cart'
        ?[`<b>${esc(p.c)}</b>`,esc(p.d),cmN(p.q),p.de===p.ate?cmD(p.ate):cmD(p.de)+' a '+cmD(p.ate),cmD(p.f),p.curto?`<span class="cm-neg">${p.prazo} d</span>`:p.prazo+' d',p.trep!=null?p.trep+' d':'—',p.est==null?'—':p.semEst?pill(cmN(p.est),'c'):cmN(p.est)]
        :[`<b>${esc(p.c)}</b>`,esc(p.d),'+'+cmN(p.q),p.de===p.ate?cmD(p.ate):cmD(p.de)+' a '+cmD(p.ate),p.est==null?'—':p.semEst?pill(cmN(p.est),'c'):cmN(p.est)]),'Sem pedidos novos nas fotos deste mês.')}</section>`;
  const mx=Math.max(1,...c.porLinha.map(x=>Math.max(x.pr,x.prod,x.fat)));
  const sec3=`<section class="card cm-s"><div class="cm-q">“NÃO PRODUZIU O PREVISTO”</div><p class="cm-r">${esc(T.f3)}</p>
    <div class="cm-bars">${c.porLinha.map(x=>`<div class="cm-bl"><b>${esc(x.l)}</b>${[['Previsto',x.pr,'p'],['Produzido',x.prod,'d'],['Faturado',x.fat,'f']].map(([t,v,cl])=>`<div class="cm-br"><span>${t}</span><i><em class="${cl}" style="width:${Math.max(0.5,v/mx*100)}%"></em></i><span class="num">${cmN(v)}</span></div>`).join('')}</div>`).join('')}</div>
    <h3 class="cm-h3">Venderam menos que a previsão${ref}</h3>
    ${tab(['Item','Produto','Previsto','Vendido','Faltou vender',c.estFim?'Estoque no fim do mês':'Estoque hoje','Semanas de estoque'],c.sobra.slice(0,25).map(r=>[`<b>${esc(r.c)}</b>`,esc(r.d),cmN(r.pr),cmN(r.fat),cmN(r.falta),cmN(r.est),r.semanas==null?'—':pill((Math.round(r.semanas*10)/10).toLocaleString('pt-BR')+' sem.',r.semanas>=4?'w':'n')]),'Nenhum item vendeu bem menos que a previsão.')}</section>`;
  const mxd=Math.max(1,...d.dias.map(x=>x.t));
  const sec4=`<section class="card cm-s"><div class="cm-q">“MUDARAM EM CIMA DA HORA”</div><p class="cm-r">${esc(T.f4)}</p>
    ${d.dias.length?`<div class="cm-dd">${d.dias.map(x=>`<div class="cm-dc" title="${cmD(x.dia)}: +${cmN(x.t)}"><i class="${x.t>=CM_SALTO?'c':''}" style="height:${Math.max(2,x.t/mxd*100)}%"></i><span>${x.dia.slice(8)}</span></div>`).join('')}</div>`:''}
    <div class="cm-2"><div><h3 class="cm-h3">Maiores saltos (${cmN(CM_SALTO)} ou mais de um dia para o outro)</h3>${tab(['Dia','Item','Antes','Depois','Subiu'],d.saltos.slice(0,15).map(s=>[cmD(s.dia),`<b>${esc(s.c)}</b>`,cmN(s.antes),cmN(s.depois),`<span class="cm-neg">+${cmN(s.inc)}</span>`]),'Nenhum salto grande no mês.')}</div>
    <div><h3 class="cm-h3">Trocas da previsão no mês</h3>${tab(['Importada em','Itens mudados','Subiu','Desceu','Saldo'],d.vers.map(v=>v.primeira?[v.ant?'já estava'+(v.em&&/^\d{4}-/.test(v.em)?' ('+cmD(v.em.slice(0,10))+')':''):cmD(String(v.em).slice(0,10)),'—','—','—','1ª versão · '+cmN(v.tot)]:[cmD(String(v.em).slice(0,10)),String(v.n),v.up?'+'+cmN(v.up):'—',v.dn?'−'+cmN(v.dn):'—',`<span class="${v.saldo>0?'cm-neg':''}">${v.saldo>0?'+':v.saldo<0?'−':''}${cmN(Math.abs(v.saldo))}</span>`]),'Cada importação da previsão passa a ficar guardada a partir de agora.')}</div></div></section>`;
  return head+(X.carregado?'':'<div class="cm-av">Buscando as fotos da carteira do mês…</div>')+(X.F.porExt?`<div class="cm-av">O Extrato do Focco importado vai até ${cmD(X.F.ext)}. Vendido e produzido contam até esse dia, e a previsão também (na proporção dos dias úteis). Importe o Extrato de novo para ter o mês até hoje.</div>`:'')+(X.F.semExt?'<div class="cm-av">Ainda não há Extrato do Focco deste mês. Importe o Extrato em Sistema › Base de dados.</div>':'')+`<div class="cm">${sec1}${sec2}${sec3}${sec4}
    <p class="cm-nota">Quantidades na unidade do item (sacos, fardos…). Previsão: RPRE0301. Vendido e produzido: Extrato do Focco (NFS e EPP). Carteira: Perfil (RPLA0300, pedidos DC); o dia em que o pedido entrou é o primeiro dia em que ele aparece numa importação do Perfil (se não houve importação no dia anterior, aparece "de … a …" e o prazo conta do primeiro dia possível). Reposição: cadastro do item no Focco.${X.F.fechado?'':' A previsão é contada até '+cmD(X.F.ate)+(X.F.porExt?' (último dia do Extrato importado)':'')+', na proporção dos dias úteis.'}</p></div>`; }

/* ---------- PDF ---------- */
function cmCols(P,cats,series,o){ o=o||{}; const doc=P.doc, C=GPDF.cor, h=o.h||46; P.cabe(h+20); const top=P.y+4, base=top+h, mx=Math.max(1,...series.flatMap(s=>s.v));
  P.dc(C.lin); doc.setLineWidth(.2); for(let i=0;i<=4;i++){ const y=base-h*i/4; doc.line(P.M,y,P.M+P.cw,y); doc.setFontSize(6.3); P.tc(C.mut); doc.text(cmN(mx*i/4),P.M-1,y+1,{align:'right'}); }
  const gw=P.cw/Math.max(1,cats.length), bw=Math.min(10,gw*.8/series.length);
  cats.forEach((c,i)=>{ const x0=P.M+gw*i+(gw-bw*series.length)/2; series.forEach((s,j)=>{ const v=s.v[i]||0, hh=v/mx*h, cor=typeof s.c==='function'?s.c(v,i):s.c; P.fc(cor); if(hh>.3) doc.rect(x0+j*bw,base-hh,bw-.6,hh,'F'); });
    doc.setFont('helvetica','normal'); doc.setFontSize(cats.length>14?5.8:7); P.tc(C.ink); doc.text(P.fit(c,gw-1),P.M+gw*i+gw/2,base+4,{align:'center'}); });
  P.y=base+9; P.legenda(series.filter(s=>s.n).map(s=>[s.n,typeof s.c==='function'?s.cl:s.c])); }
async function cmPdf(){ try{ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }catch(e){}
  const cp=S.cm.cp; if(!S.cm.dados[cp]){ cmCarrega(cp); for(let i=0;i<40&&!S.cm.dados[cp];i++) await new Promise(r=>setTimeout(r,250)); }
  const X=cmCalc(cp); if(!X){ toast('Sem a previsão deste mês.'); return; } const T=cmFrases(X), C=GPDF.cor, img=await gpImgs(); const a=X.s1,b=X.s2,c=X.s3,d=X.s4, ref=X.F.fechado?'':' até '+cmD(X.F.ate);
  const P=gpNovo('Produção × Comercial',cmMesNome(cp).replace(/^./,x=>x.toUpperCase())+(cmFiltrando()?' · '+cmFiltroTxt():' · previsão, pedidos, produção e faturamento'),img); P.capa();
  P.secao('Resumo do mês'+(X.F.fechado?'':' (até '+cmD(X.F.ate)+')'));
  P.kpis([{t:'Vendido acima da previsão',v:a.acima.length+' itens',s:'+'+cmN(a.dif)+' além do previsto',c:a.acima.length?'crit':'ok'},
    b.fonte==='cart'?{t:'Pedidos com prazo menor que a reposição',v:String(b.curtos.length)+' de '+b.ped.length,s:'pedidos do mês',c:b.curtos.length?'crit':'ok'}:{t:'Pedidos sem estoque no dia',v:String(b.semEst.length)+' de '+b.ped.length,s:'aumentos da carteira',c:b.semEst.length?'warn':'ok'},
    {t:'Produzido / previsão',v:cmP(c.prodPct),s:'faturado '+cmP(c.fatPct)+' da previsão',c:c.prodPct>=.95?'ok':c.prodPct>=.8?'warn':'crit'},
    {t:'Dias com salto na carteira',v:d.diasGrandes.length+(d.diasGrandes.length===1?' dia':' dias'),s:'carteira +'+cmN(CM_SALTO)+' de um dia p/ outro',c:d.diasGrandes.length?'warn':'ok'}],2);
  [T.f1,T.f2,T.f3,T.f4].forEach(f=>P.texto('• '+f,{fs:9,c:'ink'}));
  /* 1 */
  P.nova(); P.secao('1 · Previsão do comercial × vendido',ref?ref.trim():''); P.texto(T.f1,{c:'ink',fs:9.5});
  P.kpis([{t:'Previsão'+ref,v:cmN(a.tP),s:X.F.fechado?'do mês':'mês inteiro '+cmN(a.tPm),c:'pet'},{t:'Vendido (faturado)',v:cmN(a.tF),s:cmP(a.tP?a.tF/a.tP:0)+' da previsão',c:'crit'},{t:'Erro da previsão',v:cmP(a.erro),s:'diferenças ÷ previsão',c:'warn'},{t:'Acima do previsto',v:'+'+cmN(a.dif),s:a.acima.length+' itens',c:'crit'}],4);
  if(a.acima.length){ const top=a.acima.slice(0,12); cmCols(P,top.map(r=>r.c),[{n:'Previsto',v:top.map(r=>r.pr),c:C.cinza},{n:'Vendido',v:top.map(r=>r.fat),c:C.crit}]);
    P.tabela([{t:'Item',w:15},{t:'Produto',w:40},{t:'Previsto',w:15,al:'r'},{t:'Vendido',w:15,al:'r'},{t:'Diferença',w:21,al:'r'},{t:'Dia 1º',w:14,al:'r'},{t:'Produzido',w:16,al:'r'},{t:'Tinha?',w:15,al:'r'}],
      a.acima.map(r=>{ const x=[r.c,r.d,cmN(r.pr),cmN(r.fat),'+'+cmN(r.dif)+(r.pr?' ('+Math.round(r.dif/r.pr*100)+'%)':''),cmN(r.ei),cmN(r.prod),r.tinha?'sim':(r.pr?Math.round(r.disp/r.pr*100)+'%':'sem previsão')]; x._cor={4:'crit',7:r.tinha?'ok':'warn'}; return x; })
      .concat([Object.assign(['Total','',cmN(a.acima.reduce((s,r)=>s+r.pr,0)),cmN(a.acima.reduce((s,r)=>s+r.fat,0)),'+'+cmN(a.dif),'','',''],{_tot:1})])); }
  else P.vazio('Nenhum item vendeu acima da previsão.');
  P.texto('Tinha? = estoque do dia 1º + produzido no mês cobre a previsão (97% ou mais).',{fs:7.5});
  /* 2 */
  P.nova(); P.secao('2 · Prazo dos pedidos','quanto tempo a produção teve'); P.texto(T.f2,{c:'ink',fs:9.5});
  if(b.fonte==='snap') P.texto('A carteira com a data de entrega de cada pedido começou a ser guardada '+(b.desde?'em '+cmD(b.desde):'agora')+'. Até ter duas fotos no mês, a lista mostra o aumento da carteira de cada item, sem a data de entrega.',{fs:8});
  P.kpis(b.fonte==='cart'?[{t:'Pedidos no mês',v:String(b.ped.length),s:'aumentos da carteira',c:'pet'},{t:'Prazo menor que a reposição',v:String(b.curtos.length),s:b.ped.length?cmP(b.curtos.length/b.ped.length)+' dos pedidos':'',c:'crit'},{t:'Sem estoque no dia',v:String(b.semEst.length),s:'estoque menor que o pedido',c:'warn'},{t:'Prazo médio dado',v:b.prazoMed==null?'—':(Math.round(b.prazoMed*10)/10).toLocaleString('pt-BR')+' d',s:b.repMed==null?'':'reposição média '+(Math.round(b.repMed*10)/10).toLocaleString('pt-BR')+' d'}]
    :[{t:'Aumentos da carteira',v:String(b.ped.length),s:'no mês',c:'pet'},{t:'Sem estoque no dia',v:String(b.semEst.length),s:'estoque menor que o pedido',c:'warn'}],b.fonte==='cart'?4:2);
  if(b.ped.length){ if(b.fonte==='cart'){ const cs=b.ped.filter(p=>p.trep!=null).slice(0,14); if(cs.length) cmCols(P,cs.map(p=>p.c),[{n:'Reposição do item (dias)',v:cs.map(p=>p.trep),c:C.teal},{n:'Prazo que o pedido deu (dias)',v:cs.map(p=>p.prazo),c:C.crit}],{h:38});
      P.tabela([{t:'Item',w:15},{t:'Produto',w:42},{t:'Qtd.',w:14,al:'r'},{t:'Entrou',w:22},{t:'Entrega',w:15},{t:'Prazo',w:12,al:'r'},{t:'Reposição',w:15,al:'r'},{t:'Est. no dia',w:18,al:'r'}],
        b.ped.slice().sort((x,y)=>(y.curto-x.curto)||(y.semEst-x.semEst)||x.ate.localeCompare(y.ate)).map(p=>{ const x=[p.c,p.d,cmN(p.q),p.de===p.ate?cmD(p.ate):cmD(p.de)+' a '+cmD(p.ate),cmD(p.f),p.prazo+' d',p.trep!=null?p.trep+' d':'—',p.est==null?'—':cmN(p.est)]; x._cor={5:p.curto?'crit':null,7:p.semEst?'crit':null}; return x; })); }
    else P.tabela([{t:'Item',w:16},{t:'Produto',w:60},{t:'Subiu',w:18,al:'r'},{t:'Entrou',w:26},{t:'Estoque no dia',w:20,al:'r'}],b.ped.slice().sort((x,y)=>y.q-x.q).map(p=>{ const x=[p.c,p.d,'+'+cmN(p.q),p.de===p.ate?cmD(p.ate):cmD(p.de)+' a '+cmD(p.ate),p.est==null?'—':cmN(p.est)]; x._cor={4:p.semEst?'crit':null}; return x; })); }
  else P.vazio('Sem fotos da carteira neste mês para comparar.');
  /* 3 */
  P.nova(); P.secao('3 · Previsto × produzido × faturado',ref?ref.trim():''); P.texto(T.f3,{c:'ink',fs:9.5});
  if(c.porLinha.length){ cmCols(P,c.porLinha.map(x=>x.l),[{n:'Previsto',v:c.porLinha.map(x=>x.pr),c:C.cinza},{n:'Produzido',v:c.porLinha.map(x=>x.prod),c:C.pet},{n:'Faturado',v:c.porLinha.map(x=>x.fat),c:C.crit}]);
    P.tabela([{t:'Linha',w:34},{t:'Previsto',w:20,al:'r'},{t:'Produzido',w:20,al:'r'},{t:'% previsto',w:16,al:'r'},{t:'Faturado',w:20,al:'r'},{t:'% previsto',w:16,al:'r'}],
      c.porLinha.map(x=>{ const r=[x.l,cmN(x.pr),cmN(x.prod),x.pr?cmP(x.prod/x.pr):'—',cmN(x.fat),x.pr?cmP(x.fat/x.pr):'—']; r._cor={3:x.pr?gpCor(x.prod/x.pr*100):null}; return r; })
      .concat([Object.assign(['Total',cmN(a.tP),cmN(a.tPd),cmP(c.prodPct),cmN(a.tF),cmP(c.fatPct)],{_tot:1})])); }
  P.secao('Venderam menos que a previsão','estoque que sobrou');
  if(c.sobra.length) P.tabela([{t:'Item',w:16},{t:'Produto',w:52},{t:'Previsto',w:17,al:'r'},{t:'Vendido',w:17,al:'r'},{t:'Faltou vender',w:18,al:'r'},{t:c.estFim?'Estoque fim do mês':'Estoque hoje',w:18,al:'r'},{t:'Semanas',w:14,al:'r'}],
    c.sobra.slice(0,40).map(r=>{ const x=[r.c,r.d,cmN(r.pr),cmN(r.fat),cmN(r.falta),cmN(r.est),r.semanas==null?'—':(Math.round(r.semanas*10)/10).toLocaleString('pt-BR')]; x._cor={6:r.semanas>=4?'warn':null}; return x; }));
  else P.vazio('Nenhum item vendeu bem menos que a previsão.');
  P.texto('Semanas de estoque = '+(c.estFim?'estoque no fim do mês':'estoque de hoje')+' ÷ venda média por semana no mês.',{fs:7.5});
  /* 4 */
  P.nova(); P.secao('4 · Entradas na carteira e trocas da previsão'); P.texto(T.f4,{c:'ink',fs:9.5});
  if(d.dias.length) cmCols(P,d.dias.map(x=>x.dia.slice(8)),[{v:d.dias.map(x=>x.t),c:(v)=>v>=CM_SALTO?C.crit:C.teal}],{h:40});
  if(d.dias.length) P.legenda([['Entrou na carteira',C.teal],[cmN(CM_SALTO)+' ou mais num dia',C.crit]]);
  P.secao('Maiores saltos');
  if(d.saltos.length) P.tabela([{t:'Dia',w:18},{t:'Item',w:18},{t:'Produto',w:60},{t:'Antes',w:18,al:'r'},{t:'Depois',w:18,al:'r'},{t:'Subiu',w:18,al:'r'}],d.saltos.slice(0,25).map(s=>{ const x=[cmD(s.dia),s.c,((S.anl.base.itens||{}).l||{})[s.c]?S.anl.base.itens.l[s.c].d||'':'',cmN(s.antes),cmN(s.depois),'+'+cmN(s.inc)]; x._cor={5:'crit'}; return x; }));
  else P.vazio('Nenhum salto de '+cmN(CM_SALTO)+' ou mais no mês.');
  P.secao('Trocas da previsão no mês');
  if(d.vers.length>1) P.tabela([{t:'Importada em',w:30},{t:'Itens mudados',w:22,al:'r'},{t:'Subiu',w:22,al:'r'},{t:'Desceu',w:22,al:'r'},{t:'Saldo',w:22,al:'r'}],d.vers.map(v=>v.primeira?[v.ant?'já estava':cmD(String(v.em).slice(0,10)),'—','—','—','1ª versão']:[cmD(String(v.em).slice(0,10)),String(v.n),v.up?'+'+cmN(v.up):'-',v.dn?'-'+cmN(v.dn):'-',(v.saldo>0?'+':v.saldo<0?'-':'')+cmN(Math.abs(v.saldo))]));
  else P.vazio(d.vers.length?'A previsão não foi trocada neste mês.':'Cada importação da previsão passa a ficar guardada a partir de agora.');
  /* como foi contado */
  P.secao('Como foi contado');
  ['Previsão do comercial: relatório RPRE0301 do Focco, importado na Base de dados; cada importação fica guardada com a data.'+(X.F.fechado?'':' A previsão é contada até '+cmD(X.F.ate)+(X.F.porExt?' (último dia do Extrato importado)':'')+', na proporção dos dias úteis.'),
   'Vendido e produzido: Extrato do Focco (NFS = faturado, EPP = produzido). Estoque do dia 1º: saldo do começo do mês.',
   'Pedidos: carteira do Perfil (RPLA0300, linhas DC) com a data de entrega. O pedido entrou no primeiro dia em que aparece numa importação do Perfil; se não houve importação no dia anterior, o prazo conta do primeiro dia possível (o mais favorável ao comercial).',
   'Prazo curto: dias entre a entrada do pedido e a entrega pedida menores que o tempo de reposição do item (cadastro do Focco). Estoque no dia: saldo do Focco (almox 3 + 30) importado naquele dia.',
   'Em cima da hora: a carteira de um item subiu '+cmN(CM_SALTO)+' ou mais de uma importação para a seguinte. Quantidades na unidade do item.'].forEach(t=>P.texto('• '+t,{fs:8}));
  P.fim('Producao-x-Comercial-'+cp+'.pdf'); }

/* ---------- ligação ---------- */
VIEWS.anlcom={nome:'Produção × Comercial',ic:'grafico',mob:'Comercial'}; CRUMB.anlcom='Produção × Comercial'; S.extViews=S.extViews||{}; S.extViews.anlcom=()=>banner()+vAnlCom();
function cmReg(){ const M=MODS.find(x=>x.id==='analise'); if(M&&!M.views.includes('anlcom')){ const i=M.views.indexOf('anlmes'); if(i>=0) M.views.splice(i+1,0,'anlcom'); else M.views.push('anlcom'); }
  try{ const g=(NAV_GRP.analise||[]).find(x=>x.k==='mes'); if(g&&!g.v.includes('anlcom')) g.v.push('anlcom'); }catch(e){} }
cmReg(); setTimeout(cmReg,0);
document.addEventListener('change',ev=>{ const t=ev.target; if(!t) return; if(t.id==='cm-mes'){ S.cm.cp=t.value; render(); return; }
  if(t.dataset&&t.dataset.cmf){ S.cm.f[t.dataset.cmf]=t.value; render(); return; } if(t.id==='cm-q'){ S.cm.f.q=t.value.trim(); render(); } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='cm-q'){ ev.preventDefault(); S.cm.f.q=ev.target.value.trim(); render(); setTimeout(()=>{ const i=document.getElementById('cm-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } },30); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cm-limpar"]'); if(!b) return; S.cm.f={ln:'',fam:'',emb:'',q:''}; render(); });
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cm-pdf"]'); if(!b) return; ev.stopImmediatePropagation(); if(b.dataset.gerando) return;
  b.dataset.gerando='1'; const t0=b.innerHTML; b.disabled=true; b.textContent='Gerando…';
  cmPdf().then(()=>toast('PDF baixado.')).catch(e=>{ console.warn('[comercial pdf]',e); toast('Não foi possível gerar: '+((e&&e.message)||e)); }).finally(()=>{ delete b.dataset.gerando; b.disabled=false; b.innerHTML=t0; }); },true);
try{ window.Painel=window.Painel||{}; window.Painel.comercial={pdf:()=>cmPdf(),gravar:()=>anlGravar(),S:()=>S,calc:cp=>cmCalc(cp||S.cm.cp),dados:()=>S.cm.dados,frases:cp=>cmFrases(cmCalc(cp||S.cm.cp))}; }catch(e){}
document.head.insertAdjacentHTML('beforeend',`<style id="cm-css">
.cm{display:flex;flex-direction:column;gap:16px}
.cm-fb{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding:12px 14px;margin-bottom:16px}
.cm-busca{flex:2 1 260px;margin:0;max-width:none}
.cm-fl{display:flex;flex-direction:column;gap:3px;flex:1 1 150px;min-width:0}.cm-fl span{font-size:11.5px;font-weight:600;color:var(--muted)}
.cm-fl select{height:40px;width:100%}.cm-fl.on select{border-color:var(--teal);box-shadow:0 0 0 1px var(--teal)}
.cm-s{display:flex;flex-direction:column;gap:12px}
.cm-q{font-size:12px;font-weight:700;letter-spacing:.07em;color:var(--muted)}
.cm-r{margin:0;font-size:17px;font-weight:600;line-height:1.35;max-width:900px}
.cm-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.cm-k{background:var(--ground);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;border-top:3px solid var(--teal)}
.cm-k.c{border-top-color:var(--crit)}.cm-k.w{border-top-color:var(--warn)}
.cm-k span{font-size:12px;color:var(--muted);font-weight:600}.cm-k b{font-size:24px;font-weight:600}.cm-k i{font-style:normal;font-size:12px;color:var(--muted)}
.cm-tw{overflow-x:auto}
.cm-t{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.cm-t th{font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--muted);text-align:right;padding:6px 8px;border-bottom:1.5px solid var(--line);white-space:nowrap}
.cm-t td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
.cm-t .l{text-align:left}.cm-t td.l{white-space:normal}
.cm-neg{color:var(--crit);font-weight:600}
.cm-pl{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--ground)}
.cm-pl.o{color:var(--ok)}.cm-pl.w{color:var(--warn)}.cm-pl.c{color:var(--crit)}
.cm-av{background:var(--ground);border-left:3px solid var(--warn);border-radius:8px;padding:10px 12px;font-size:13px}
.cm-h3{margin:4px 0 0;font-size:13px;font-weight:700;color:var(--muted)}
.cm-bars{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.cm-bl{display:flex;flex-direction:column;gap:4px}.cm-bl>b{font-size:14px}
.cm-br{display:grid;grid-template-columns:76px 1fr 72px;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
.cm-br i{height:10px;border-radius:5px;background:var(--ground);overflow:hidden;display:block}.cm-br em{display:block;height:100%;border-radius:5px}
.cm-br em.p{background:var(--muted);opacity:.45}.cm-br em.d{background:var(--teal)}.cm-br em.f{background:var(--crit)}.cm-br .num{text-align:right;color:var(--ink,inherit)}
.cm-dd{display:flex;align-items:flex-end;gap:3px;height:120px;padding-top:6px}
.cm-dc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px;min-width:0}
.cm-dc i{width:100%;max-width:26px;background:var(--teal);border-radius:3px 3px 0 0}.cm-dc i.c{background:var(--crit)}
.cm-dc span{font-size:10.5px;color:var(--muted)}
.cm-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}
.cm-nota{margin:0;font-size:12px;color:var(--muted);line-height:1.5}
</style>`);
