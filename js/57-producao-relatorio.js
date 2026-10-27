/* Painel Colafix · 57-producao-relatorio.js (26/10, pedido de ajuste "relatório pdf do mês está feio… inclua análises personalizadas")
   1) Indicadores da produção › "Relatório do mês (PDF)": em vez da janela de impressão sem layout, baixa um PDF de verdade no padrão
      dos relatórios do gestor (gpNovo do js/34: faixa azul com as logos, quadros de números, gráficos, tabelas, rodapé com página):
      números do mês, produzido por dia com a meta, Curva S, meta por linha, paradas por motivo e por linha e as análises salvas
      marcadas "no relatório do mês".
   2) "Análise personalizada" embaixo dos indicadores: período (este mês, mês passado, 7/30 dias, ano, datas), o que medir
      (sacos, toneladas, tempo parado, nº de paradas, perdas), separar por (dia, semana, mês, linha, produto, família, motivo da parada),
      filtro de linhas e de produto, comparar com o período anterior. Resultado em barras + tabela, PDF da análise e Excel.
      Salvas no perfil (`perfis/{uid}.prodAnalises` [{id,nome,f,noMes}], vale em todos os aparelhos).
   Dados: busca sob demanda, só o período escolhido (`entregas` por `em`, `paradas` por `inicio`, `perdas` por `em`, com limite) e
   guarda na memória da tela. Prefixo `pra`. */
"use strict";
S.pra=S.pra||{f:{per:'mes',de:'',ate:'',med:'sc',por:'produto',ls:[],prod:'',semSetup:true,comp:false,compCp:'',fonte:''},cache:{},salvas:null,salvando:false};
const PRA_MED={sc:'Produção (sacos)',t:'Produção (toneladas)',par:'Tempo parado',npar:'Número de paradas',perda:'Perdas (sacos)'};
const PRA_POR={dia:'Dia',semana:'Semana',mes:'Mês',linha:'Linha',produto:'Produto',linprod:'Linha e produto',familia:'Família do produto',motivo:'Motivo da parada'};
const praSemProd=k=>k==='produto'||k==='familia'||k==='linprod'; /* não servem para paradas */
const PRA_PER={mes:'Este mês',mesant:'Mês passado',d7:'Últimos 7 dias',d30:'Últimos 30 dias',ano:'Este ano',datas:'Escolher datas'};
const PRA_SUG=[
  {n:'Produção por produto no mês',f:{per:'mes',med:'sc',por:'produto'}},
  {n:'Toneladas por semana',f:{per:'d30',med:'t',por:'semana'}},
  {n:'Paradas por motivo',f:{per:'mes',med:'par',por:'motivo'}},
  {n:'Toneladas mês a mês no ano',f:{per:'ano',med:'t',por:'mes'}},
  {n:'Perdas por linha',f:{per:'mes',med:'perda',por:'linha'}},
  {n:'Materiais de cada linha',f:{per:'mes',med:'sc',por:'linprod'}},
  {n:'Produzido no ano pelo Focco, por linha',f:{per:'ano',med:'sc',por:'linha',fonte:'focco'}}];
const praTempo=p=>p==='dia'||p==='semana'||p==='mes';
const praPar=m=>m==='par'||m==='npar';
const praSetup=p=>/setup|troca|limpez/i.test(p.motivo||'');
const praN=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const praMesFim=cp=>{ const [y,m]=cp.split('-').map(Number); return cp+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0'); };
const praMesAnt=cp=>{ const [y,m]=cp.split('-').map(Number), d=new Date(y,m-2,1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };
const praDm=d=>d.slice(8,10)+'/'+d.slice(5,7);
const praDmy=d=>praDm(d)+'/'+d.slice(0,4);
const praDias=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5)+1;
/* período → {de,ate,txt}; cpRel = mês do relatório (no PDF do mês, "este mês" é o mês do relatório) */
function praPeriodo(f,cpRel){ const h=hojeStr(), cp=cpRel||h.slice(0,7);
  if(f.per==='mesant'){ const a=praMesAnt(cp); return {de:a+'-01',ate:praMesFim(a),txt:pdMes(a)}; }
  if(f.per==='d7') return {de:addDias(h,-6),ate:h,txt:'últimos 7 dias'};
  if(f.per==='d30') return {de:addDias(h,-29),ate:h,txt:'últimos 30 dias'};
  if(f.per==='ano') return {de:cp.slice(0,4)+'-01-01',ate:cp.slice(0,4)===h.slice(0,4)?h:cp.slice(0,4)+'-12-31',txt:'ano de '+cp.slice(0,4)};
  if(f.per==='datas'&&f.de&&f.ate){ const de=f.de<=f.ate?f.de:f.ate, ate=f.de<=f.ate?f.ate:f.de; return {de,ate,txt:praDmy(de)+' a '+praDmy(ate)}; }
  const fim=praMesFim(cp); return {de:cp+'-01',ate:fim>h&&cp===h.slice(0,7)?h:fim,txt:pdMes(cp)}; }
function praAnterior(f,P){ if(f.compCp&&/^\d{4}-\d{2}$/.test(f.compCp)){ const a=f.compCp, h=hojeStr(), fim=praMesFim(a); return {de:a+'-01',ate:fim>h&&a===h.slice(0,7)?h:fim,txt:pdMes(a)}; } /* 27/10: mês escolhido para comparar */
  if(f.per==='mes'||f.per==='mesant'){ const a=praMesAnt(P.de.slice(0,7)); return {de:a+'-01',ate:praMesFim(a),txt:pdMes(a)}; }
  if(f.per==='ano'){ const y=+P.de.slice(0,4)-1; return {de:y+'-01-01',ate:y+P.ate.slice(4),txt:'mesmo período de '+y}; }
  const n=praDias(P.de,P.ate), ate=addDias(P.de,-1), de=addDias(ate,-(n-1)); return {de,ate,txt:praDmy(de)+' a '+praDmy(ate)}; }

/* ---------- busca sob demanda (só o período) ---------- */
/* 26/10 (economia de leituras): o que já está carregado na tela é usado direto — o mês da Curva S (S._ritEnt), os apontamentos,
   paradas e perdas mais recentes — e só o que falta é buscado no servidor. */
function praLocal(de,ate){ const ini=new Date(de+'T00:00:00').toISOString(), fim=new Date(addDias(ate,1)+'T00:00:00').toISOString(), cp=de.slice(0,7), o={};
  const cobre=(xs,campo,lim)=>{ if(!Array.isArray(xs)) return null; const jn=S._jan&&S._jan[campo==='inicio'?'paradas':'']; if(xs.length&&xs.length<lim&&(!jn||jn<=ini)) return xs; const menor=xs.reduce((a,x)=>x[campo]&&x[campo]<a?x[campo]:a,'9'); return menor<=ini?xs:null; };
  const dentro=(xs,campo)=>xs.filter(x=>x[campo]&&x[campo]>=ini&&x[campo]<fim);
  if(ate.slice(0,7)===cp&&S._ritEnt&&S._ritEnt[cp]) o.ent=S._ritEnt[cp]; else { const e=cobre(S.entregas,'em',1000); if(e) o.ent=dentro(e,'em'); }
  const pa=cobre(S.paradas,'inicio',1000); if(pa) o.par=dentro(pa,'inicio');
  const pe=cobre(S.perdas,'em',300); if(pe) o.per=dentro(pe,'em').filter(x=>!x.removido);
  return o; }
function praBusca(de,ate){ const k=de+'|'+ate, C=S.pra.cache; const L=praLocal(de,ate);
  if(L.ent&&L.par&&L.per){ const d={ent:L.ent,par:L.par,per:L.per}; return Promise.resolve(d); }
  if(C[k]) return C[k].pr;
  const ini=new Date(de+'T00:00:00').toISOString(), fim=new Date(addDias(ate,1)+'T00:00:00').toISOString(), db=S.db;
  const q=(col,campo,n)=>db.collection(col).where(campo,'>=',ini).where(campo,'<',fim).orderBy(campo).limit(n).get().then(s=>s.docs.map(d=>Object.assign({_id:d.id},d.data()))).catch(e=>{ console.warn('[análise] '+col,e); return null; });
  const it={d:null,err:false}; C[k]=it;
  it.pr=Promise.all([L.ent?Promise.resolve(L.ent):q('entregas','em',5000),L.par?Promise.resolve(L.par):q('paradas','inicio',2000),L.per?Promise.resolve(L.per):q('perdas','em',2000)]).then(([ent,par,per])=>{ it.err=ent==null; it.d={ent:ent||[],par:par||[],per:(per||[]).filter(x=>!x.removido)}; if(it.err) delete C[k]; return it.d; });
  return it.pr; }
function praTem(de,ate){ const L=praLocal(de,ate); if(L.ent&&L.par&&L.per) return {ent:L.ent,par:L.par,per:L.per};
  const it=S.pra.cache[de+'|'+ate]; if(it&&it.d) return it.d; praBusca(de,ate).then(()=>{ try{ if(S.view==='prodind'||S.view==='prodano') render(); }catch(e){} }); return null; }
/* ---------- 27/10: produção pelo Extrato do Focco (EPP por item e dia, coleção pcpvendas/<AAAA-MM>) ----------
   Pedido "ele pode pegar do extrato do item? preciso da quantidade produzida da linha 3 nesse ano". O Extrato não diz a linha:
   a linha vem do item (cadastro de Itens; senão a linha do Focco na base, igual à Análise PCP — anlLinhasDe). Item feito em mais
   de uma linha entra com as linhas juntas ("Linha 1 / Linha 3") e conta no filtro de qualquer uma delas. Lê 1 documento por mês. */
const praFocoOk=f=>f.fonte==='focco'&&(f.med==='sc'||f.med==='t');
function praMeses(de,ate){ const xs=[]; let cp=de.slice(0,7); for(let i=0;i<40&&cp<=ate.slice(0,7);i++){ xs.push(cp); const [y,m]=cp.split('-').map(Number); cp=m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0'); } return xs; }
function praFocBusca(de,ate){ const C=(S.pra.foc=S.pra.foc||{}), ms=praMeses(de,ate);
  return Promise.all(ms.map(cp=>{ if(C[cp]&&C[cp].pr) return C[cp].pr; const it={d:null}; C[cp]=it;
    it.pr=S.db.doc('pcpvendas/'+cp).get().then(g=>{ it.d=g.exists?(g.data().d||{}):{}; return it.d; }).catch(e=>{ console.warn('[análise] extrato '+cp,e); delete C[cp]; return {}; }); return it.pr; })); }
function praFocTem(de,ate){ const C=(S.pra.foc=S.pra.foc||{}), ms=praMeses(de,ate);
  if(ms.every(cp=>C[cp]&&C[cp].d)){ const foc=[], cov={}; ms.forEach(cp=>{ const M=C[cp].d, ds=new Set(); for(const c in M) for(const dd in M[c]){ const q=+((M[c][dd]||[])[0])||0; if(q){ foc.push({d:cp+'-'+dd,c,q}); ds.add(dd); } } cov[cp]=ds.size; }); return {foc,cov,ent:[],par:[],per:[]}; }
  praFocBusca(de,ate).then(()=>{ try{ if(S.view==='prodind'||S.view==='prodano') render(); }catch(e){} }); return null; }
/* 27/10 (2º pedido "não está puxando só da linha"): a linha onde o item É FEITO, nesta ordem:
   0) a linha do item em Ajustes › Itens, quando é uma só (a usuária acertou ali); 1) a linha do Focco (base: itens.l[c].ln), quando é uma só; 2) o que as linhas apontaram no painel nos últimos 60 dias (ritReal);
   3) a divisão em % da Curva S (Previsto × Realizado › Configurar; só tem L1/L2); 4) o cadastro de Itens, quando é uma linha só.
   Sem nada disso (item que pode ir em várias linhas e sem divisão), a produção NÃO é posta numa linha: fica à parte e a tela avisa. */
function praDiv(c){ const LO=linhasOrd(), B=(S.anl&&S.anl.base)||{}, it=((B.itens||{}).l||{})[c]||{}, um=l=>({d:{[l]:1},f:'focco'});
  /* 27/10: o que a usuária acertou em Ajustes › Itens (uma linha só) vale antes do Focco (ex.: chapisco = Fixcol) */
  try{ const pi=typeof itemDe==='function'?itemDe(c):null, cl=((pi&&pi.linhas)||[]).filter(l=>LO.includes(l)); if(cl.length===1) return {d:{[cl[0]]:1},f:'cad'}; }catch(e){}
  const fl=(it.ln||[]).filter(l=>LO.includes(l)); if(fl.length===1) return um(fl[0]);
  let cad=[]; try{ cad=anlLinhasDe(c,it); }catch(e){}
  /* 27/10 ("por que só apareceu essa?"): o apontado recente e a % da Curva S (que só tem L1/L2) só dividem o item se
     cobrem todas as linhas onde o Focco diz que ele pode ser feito; senão não dá para saber (ex.: AC0002 Focco L1/L3, Curva S L1) */
  const pode=fl.length?fl:cad.filter(l=>LO.includes(l)), cobre=d=>!pode.length||pode.every(l=>(d[l]||0)>0);
  try{ const r=ritReal(c,LO); if(r&&r.d&&Object.keys(r.d).length&&cobre(r.d)) return {d:r.d,f:'real'}; }catch(e){}
  try{ const ci=(ritCfg().itens||{})[c]; if(ci&&ci.d){ const d={}; let t=0; for(const l in ci.d){ const v=+ci.d[l]||0; if(v>0&&LO.includes(l)){ d[l]=v; t+=v; } } if(t>0&&cobre(d)){ for(const l in d) d[l]/=t; return {d,f:'cfg'}; } } }catch(e){}
  if(cad.length===1) return {d:{[cad[0]]:1},f:'cad'};
  return {d:null,ls:fl.length?fl:cad}; }
function praFocItem(c){ const B=(S.anl&&S.anl.base)||{}, it=((B.itens||{}).l||{})[c]||{}; let ls=[]; try{ ls=anlLinhasDe(c,it); }catch(e){}
  let n=''; try{ n=ritNome(c); }catch(e){} if(!n||n===c) n=String(it.d||((typeof itemDe==='function'&&itemDe(c))||{}).descricao||'').replace(/^ARGAMASSA\s+/i,'').replace(/\s+\d+(?:[.,]\d+)?\s*KG\b.*$/i,'');
  return {ls,p:{c,n:(c+' · '+n).trim()}}; }
const praDad=(f,de,ate)=>praFocoOk(f)?praFocTem(de,ate):praTem(de,ate);
const praEsp=(f,de,ate)=>praFocoOk(f)?praFocBusca(de,ate):praBusca(de,ate);
/* ---------- conta ---------- */
function praSemana(d){ const x=new Date(d+'T12:00:00'), w=(x.getDay()+6)%7; return addDias(d,-w); }
function praProd(o){ const c=codigoDe(o); let n=''; try{ n=ritNome(c); }catch(e){} if(!n||n===c) n=String(o.produto||'').replace(/^\S+\s*[-—]\s*/,'').replace(/\s+\d+(?:[.,]\d+)?\s*KG\b.*$/i,''); return {c,n:(c+' · '+n).trim()}; }
function praFam(nome){ const w=String(nome||'').replace(/^\S+\s·\s/,'').replace(/^ARGAMASSA\s+/i,'').split(/\s+/).filter(x=>x&&!/^\d/.test(x)); return w.slice(0,2).join(' ')||'Outros'; }
function praCalc(f,dados,de,ate){ const it=[], an=new Set(), lsOk=l=>!f.ls||!f.ls.length||f.ls.includes(l), pq=praN(f.prod).trim(); let faltam=0;
  const add=(d,l,p,mot,v,semLs)=>{ if(d<de||d>ate||(!semLs&&!lsOk(l||'—'))) return; if(pq&&p&&!praN(p.n).includes(pq)) return; it.push({d,l:l||'—',p:p?p.n:'',fam:p?praFam(p.n):'',mot:mot||'',v}); };
  var semDiv={}, dvF={};
  if(dados.foc&&praFocoOk(f)){ const DV={}; dados.foc.forEach(x=>{ const I=praFocItem(x.c), D=DV[x.c]||(DV[x.c]=praDiv(x.c)), v=f.med==='t'?x.q*(()=>{ try{ return ritKg(x.c); }catch(e){ return 20; } })()/1000:x.q;
      if(D.d){ dvF[D.f]=(dvF[D.f]||0)+1; for(const l in D.d) add(x.d,l,I.p,'',v*D.d[l]); return; }
      /* sem divisão: fora do filtro de linha; sem filtro, aparece com as linhas juntas */
      if(f.ls&&f.ls.length){ if(D.ls.some(l=>f.ls.includes(l))){ if(x.d>=de&&x.d<=ate&&(!pq||praN(x.c+' '+I.p.n).includes(pq))){ const k=x.c; semDiv[k]=semDiv[k]||{c:k,p:I.p.n,ls:D.ls,v:0,m:Array(12).fill(0)}; semDiv[k].v+=v; semDiv[k].m[+x.d.slice(5,7)-1]+=v; } } return; }
      add(x.d,D.ls.length?D.ls.join(' / '):'Sem linha',I.p,'',v,true); }); }
  else if(praPar(f.med)) dados.par.forEach(p=>{ if(!p.inicio||(f.semSetup&&praSetup(p))) return; if(pq) return; add(hojeStr(new Date(p.inicio)),p.linha,null,p.motivo||'Sem motivo',f.med==='par'?pdMin(p.inicio,p.fim):1); });
  else if(f.med==='perda') dados.per.forEach(x=>{ if(!x.em) return; const o=ordById(x.ordem)||(S.ritOrdX||{})[x.ordem]; const p=o?praProd(o):{c:'',n:String(x.produto||'—')}; add(hojeStr(new Date(x.em)),x.linha||(o&&o.linha),p,'',+x.qtd||0); });
  else { dados.ent.forEach(e=>{ if(e.anula) an.add(e.anula); });
    dados.ent.forEach(e=>{ if(e.anula||an.has(e._id)||!e.em) return; const o=ordById(e.ordem)||(S.ritOrdX||{})[e.ordem]; if(!o){ faltam++; try{ ritFaltaOrdem(e.ordem); }catch(x){} }
      const p=o?praProd(o):{c:'',n:'Ordem '+(e.num||'?')+' (carregando)'}, q=+e.qtd||0, kg=o&&p.c?(()=>{ try{ return ritKg(p.c); }catch(x){ return 20; } })():20;
      add(hojeStr(new Date(e.em)),e.linha||(o&&o.linha),p,'',f.med==='t'?q*kg/1000:q); }); }
  const por=f.por==='motivo'&&!praPar(f.med)?'linha':praPar(f.med)&&praSemProd(f.por)?'motivo':f.por;
  const chave=x=>por==='dia'?x.d:por==='semana'?praSemana(x.d):por==='mes'?x.d.slice(0,7):por==='linha'?x.l:por==='produto'?(x.p||'—'):por==='linprod'?x.l+PRA_SEP+(x.p||'—'):por==='familia'?(x.fam||'—'):(x.mot||'—');
  const g={}; it.forEach(x=>{ const k=chave(x); g[k]=(g[k]||0)+x.v; });
  if(praTempo(por)){ let d=de; const ks=new Set(Object.keys(g)); for(let i=0;i<400&&d<=ate;i++){ const w=new Date(d+'T12:00:00').getDay(); const k=por==='dia'?d:por==='semana'?praSemana(d):d.slice(0,7); if(por!=='dia'||(w>0&&w<6)) ks.add(k); d=addDias(d,1); }
    var rows=[...ks].sort().map(k=>({k,v:g[k]||0})); }
  else if(por==='linprod'){ const LO=linhasOrd(), tl={}; Object.entries(g).forEach(([k,v])=>{ const l=k.split(PRA_SEP)[0]; tl[l]=(tl[l]||0)+v; }); const ix=l=>{ const i=LO.indexOf(l); return i<0?999:i; };
    var rows=Object.entries(g).map(([k,v])=>({k,v,l:k.split(PRA_SEP)[0]})).sort((a,b)=>ix(a.l)-ix(b.l)||a.l.localeCompare(b.l)||b.v-a.v); rows.tl=tl; }
  else var rows=Object.entries(g).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);
  const tot=it.reduce((a,x)=>a+x.v,0), dias=new Set(it.filter(x=>x.v>0).map(x=>x.d)).size;
  return {rows,tot,dias,n:it.length,por,faltam,semDiv:Object.values(semDiv).sort((a,b)=>b.v-a.v),it}; }
const PRA_SEP=' › ';
function praRot(por,k){ if(por==='dia'){ const w=['dom','seg','ter','qua','qui','sex','sáb'][new Date(k+'T12:00:00').getDay()]; return praDm(k)+' '+w; } if(por==='semana') return 'semana de '+praDm(k); if(por==='mes') return pdMes(k); return k; }
function praFmt(med,v){ if(med==='t') return (Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' t'; if(med==='par') return pdHrs(v); if(med==='npar') return Math.round(v)+(Math.round(v)===1?' parada':' paradas'); return Math.round(v).toLocaleString('pt-BR')+' sc'; }
function praVar(a,b){ if(!b) return ''; const p=Math.round((a-b)/b*100); return (p>0?'+':'')+p+'%'; }
function praDesc(f,P){ const xs=[PRA_MED[f.med]+' por '+PRA_POR[f.por==='motivo'&&!praPar(f.med)?'linha':f.por].toLowerCase(),P?P.txt:PRA_PER[f.per].toLowerCase()];
  if(f.ls&&f.ls.length) xs.push(f.ls.join(', ')); if(f.prod&&!praPar(f.med)) xs.push('produto com "'+f.prod+'"'); if(praPar(f.med)&&f.semSetup) xs.push('sem setup'); if(praFocoOk(f)){ const V=((S.anl&&S.anl.base)||{}).vendas||{}; xs.push('pelo Extrato do Focco'+(V.ate?' (importado até '+praDm(V.ate)+')':'')); } if(f.comp) xs.push('comparando com '+(f.compCp?pdMes(f.compCp):'o período anterior')); return xs.join(' · '); }
function praResultado(f,cpRel){ const P=praPeriodo(f,cpRel), d=praDad(f,P.de,P.ate); if(!d) return {P,carregando:true};
  const R=praCalc(f,d,P.de,P.ate); if(d.cov) R.cov=d.cov; let A=null, RA=null; if(f.comp){ A=praAnterior(f,P); const da=praDad(f,A.de,A.ate); if(da) RA=praCalc(f,da,A.de,A.ate); else return {P,carregando:true}; }
  const ant={}; if(RA&&!praTempo(R.por)) RA.rows.forEach(r=>ant[r.k]=r.v);
  return {P,A,R,RA,ant,err:(S.pra.cache[P.de+'|'+P.ate]||{}).err}; }

/* ---------- análises salvas (no perfil) ---------- */
function praSalvasCarrega(){ if(S.pra.salvas!==null||S.pra._lendo||!S.db||!S.uid) return; S.pra._lendo=true;
  S.db.doc('perfis/'+S.uid).get().then(g=>{ S.pra.salvas=(g.exists&&g.data().prodAnalises)||[]; render(); }).catch(e=>{ console.warn('[análises]',e); S.pra.salvas=[]; }).finally(()=>{ S.pra._lendo=false; }); }
async function praSalvasGrava(){ try{ await S.db.doc('perfis/'+S.uid).set({prodAnalises:S.pra.salvas},{merge:true}); }catch(e){ erro(e); } }

/* ---------- 27/10: mês de comparação e cabeçalho de linha (Linha e produto) ---------- */
function praMesesOpc(){ const d=new Date(); d.setDate(1); return [...Array(24)].map((_,i)=>{ const x=new Date(d.getFullYear(),d.getMonth()-i,1); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'); }); }
function praGrupo(R,l,med){ const rs=R.rows.filter(x=>x.l===l), t=(R.rows.tl||{})[l]||0;
  return `<div class="pra-gh"><b>${esc(l)}</b><span>${rs.length} ${rs.length===1?'material':'materiais'} · ${praFmt(med,t)}${R.tot?' · '+Math.round(t/R.tot*100)+'% do total':''}</span></div>`; }
/* avisos do Extrato do Focco: até quando foi importado, meses sem dado e itens sem linha definida (27/10) */
function praFocAvisos(R,X,F){ const V=((S.anl&&S.anl.base)||{}).vendas||{}, h=hojeStr(), fim=X.P.ate<h?X.P.ate:h, out=[];
  if(V.ate&&V.ate<addDias(fim,-1)) out.push(`<div class="pra-av">O Extrato do Focco importado vai até ${praDmy(V.ate)}. Para ter os dias depois disso, importe o Extrato em Análise PCP › Sistema › Base de dados.</div>`);
  const MS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'], cov=R.cov||{}, ks=Object.keys(cov).sort(), vaz=ks.filter(k=>!cov[k]&&k+'-01'<=fim);
  if(ks.length>1) out.push(`<div class="pra-cov">Dias com produção no Extrato, por mês: ${ks.map(k=>`<span class="${!cov[k]&&k+'-01'<=fim?'v':''}">${MS[+k.slice(5)-1]} ${cov[k]}</span>`).join('')}</div>`);
  if(vaz.length) out.push(`<div class="pra-av">Sem Extrato importado em ${vaz.map(k=>MS[+k.slice(5)-1]+'/'+k.slice(0,4)).join(', ')}: esses meses não entram no total. Importe o Extrato desses meses em Análise PCP › Sistema › Base de dados.</div>`);
  if((R.semDiv||[]).length){ const t=R.semDiv.reduce((a,x)=>a+x.v,0);
    out.push(`<details class="pra-av"><summary>${praFmt(F.med,t)} de ${R.semDiv.length} ${R.semDiv.length===1?'item':'itens'} ficaram de fora: o item pode ser feito em mais de uma linha e não há como saber quanto foi nesta linha</summary><div style="margin-top:6px">${R.semDiv.slice(0,15).map(x=>esc(x.p)+' ('+esc(x.ls.join(' / ')||'sem linha')+'): '+praFmt(F.med,x.v)).join('<br>')}</div><div style="margin-top:6px">Para entrarem, diga a linha do item no Focco ou a divisão em Análise PCP › Mês › Previsto × Realizado › Configurar.</div></details>`); }
  out.push('<div class="sub" style="margin:0;font-size:12.5px">No Extrato não vem a linha. A linha é a do item em Ajustes › Itens (ou a do Focco); item de mais de uma linha é dividido pelo que as linhas apontaram no painel nos últimos 60 dias ou, sem isso, pela % da Curva S.</div>');
  return out.join(''); }
/* ---------- tela ---------- */
function praCard(){ praSalvasCarrega(); const F=S.pra.f, X=praResultado(F), LS=linhasOrd(), sv=S.pra.salvas||[];
  const opt=(o,v)=>Object.entries(o).map(([k,t])=>`<option value="${k}" ${k===v?'selected':''}>${t}</option>`).join('');
  const porOpt=Object.entries(PRA_POR).filter(([k])=>k!=='motivo'||praPar(F.med)).filter(([k])=>!praPar(F.med)||!praSemProd(k)).map(([k,t])=>`<option value="${k}" ${k===F.por?'selected':''}>${t}</option>`).join('');
  let res;
  if(X.carregando) res='<div class="empty">Buscando os dados do período…</div>';
  else { const R=X.R, mx=Math.max(1,...R.rows.map(r=>r.v)), comp=!!X.RA, cat=!praTempo(R.por), totA=X.RA?X.RA.tot:null, lp=R.por==='linprod', mostra=R.rows.slice(0,lp?400:60);
    const media=R.dias?R.tot/R.dias:0;
    res=`<div class="pra-tot"><div><b>${praFmt(F.med,R.tot)}</b><span>Total · ${esc(X.P.txt)}</span></div>
      ${F.med!=='npar'?`<div><b>${praFmt(F.med,media)}</b><span>Média por dia com registro (${R.dias})</span></div>`:''}
      ${comp?`<div><b class="${!totA?'':R.tot>=totA?(praPar(F.med)||F.med==='perda'?'crit':'ok'):(praPar(F.med)||F.med==='perda'?'ok':'crit')}">${praVar(R.tot,totA)||'—'}</b><span>${totA?'Antes: '+praFmt(F.med,totA)+' · '+esc(X.A.txt):'Sem dados antes ('+esc(X.A.txt)+')'}</span></div>`:''}
      <div><b>${R.rows.filter(r=>r.v>0).length}</b><span>${lp?'materiais (linha × produto) no resultado':PRA_POR[R.por]==='Dia'?'dias com registro':(PRA_POR[R.por]||'').toLowerCase()+(cat?'s':'')+' no resultado'}</span></div></div>
      ${X.err?'<div class="pra-av">Não foi possível buscar todos os dados do período. Confira a internet e toque em Analisar de novo.</div>':''}
      ${praFocoOk(F)?praFocAvisos(R,X,F):''}
      ${R.faltam?`<div class="pra-av">Buscando ${R.faltam} ordem(ns) antiga(s) para saber o produto… o resultado se completa sozinho.</div>`:''}
      ${R.n?`<div class="pra-bs">${mostra.map((r,i)=>{ const a=X.ant[r.k], gh=lp&&(!i||mostra[i-1].l!==r.l)?praGrupo(R,r.l,F.med):'', rot=lp?r.k.slice(r.l.length+PRA_SEP.length):praRot(R.por,r.k); return gh+`<div class="pra-b"><span title="${esc(praRot(R.por,r.k))}">${esc(rot)}</span><div><i style="width:${(r.v/mx*100).toFixed(1)}%"></i></div><b>${praFmt(F.med,r.v)}</b><small>${lp?((R.rows.tl||{})[r.l]?Math.round(r.v/R.rows.tl[r.l]*100)+'% da linha':''):R.tot?Math.round(r.v/R.tot*100)+'%':''}${comp&&cat?' · antes '+praFmt(F.med,a||0)+(praVar(r.v,a||0)?' ('+praVar(r.v,a||0)+')':''):''}</small></div>`; }).join('')}</div>${R.rows.length>mostra.length?`<div class="sub">Mostrando ${mostra.length} de ${R.rows.length}. O PDF e o Excel têm tudo.</div>`:''}`
      :'<div class="empty">Nada encontrado com essas escolhas.</div>'}`; }
  return `<section class="card pra" id="pra">
    <div class="pra-h"><div><h2>Análise personalizada</h2><div class="sub">Escolha o período, o que medir e como separar. Salve as que você usa sempre e marque quais entram no relatório do mês.</div></div>
      <div class="pra-acts"><button class="btn sec" data-act="pra-xls" ${X.carregando?'disabled':''}>Excel</button><button class="btn sec" data-act="pra-pdf" ${X.carregando?'disabled':''}>PDF desta análise</button><button class="btn" data-act="pra-salvar">Salvar análise</button></div></div>
    ${S.pra.salvando?`<div class="pra-sv"><input class="txt" id="pra-nome" maxlength="60" placeholder="Nome da análise (ex.: Rejunte por semana)" value="${esc(praDesc(F).split(' · ')[0])}"><label class="pra-ck"><input type="checkbox" id="pra-nomes" checked> Entrar no relatório do mês</label><button class="btn" data-act="pra-salvar-ok">Salvar</button><button class="btn sec" data-act="pra-salvar-x">Cancelar</button></div>`:''}
    <div class="pra-chips"><span class="pra-lb">Prontas:</span>${PRA_SUG.map((s,i)=>`<button class="pra-chip" data-act="pra-sug" data-i="${i}">${esc(s.n)}</button>`).join('')}</div>
    ${sv.length?`<div class="pra-chips"><span class="pra-lb">Salvas:</span>${sv.map(s=>`<span class="pra-chip pra-mi"><button data-act="pra-usar" data-id="${s.id}">${esc(s.nome)}</button><label title="Entrar no relatório do mês"><input type="checkbox" data-pra-nomes="${s.id}" ${s.noMes?'checked':''}> no relatório</label><button class="pra-x" data-act="pra-tirar" data-id="${s.id}" aria-label="Apagar ${esc(s.nome)}">×</button></span>`).join('')}</div>`:''}
    <div class="pra-f">
      <label>Período<select class="txt" data-pra="per">${opt(PRA_PER,F.per)}</select></label>
      ${F.per==='datas'?`<label>De<input class="txt" type="date" data-pra="de" value="${esc(F.de||'')}"></label><label>Até<input class="txt" type="date" data-pra="ate" value="${esc(F.ate||'')}"></label>`:''}
      <label>O que medir<select class="txt" data-pra="med">${opt(PRA_MED,F.med)}</select></label>
      <label>Separar por<select class="txt" data-pra="por">${porOpt}</select></label>
      ${F.med==='sc'||F.med==='t'?`<label>Produção de onde<select class="txt" data-pra="fonte"><option value="" ${F.fonte!=='focco'?'selected':''}>Apontamentos do painel</option><option value="focco" ${F.fonte==='focco'?'selected':''}>Extrato do Focco (EPP do item)</option></select></label>`:''}
      ${!praPar(F.med)?`<label>Produto contém<input class="txt" data-pra="prod" value="${esc(F.prod||'')}" placeholder="código ou nome"></label>`:''}
    </div>
    <div class="pra-f2"><span class="pra-lb">Linhas:</span><button class="pra-chip ${!F.ls.length?'on':''}" data-act="pra-ln" data-v="">Todas</button>${LS.map(l=>`<button class="pra-chip ${F.ls.includes(l)?'on':''}" data-act="pra-ln" data-v="${esc(l)}">${esc(l)}</button>`).join('')}
      <span class="pra-sp"></span>${praPar(F.med)?`<label class="pra-ck"><input type="checkbox" data-pra="semSetup" ${F.semSetup?'checked':''}> Tirar setup, troca e limpeza</label>`:''}<label class="pra-ck"><input type="checkbox" data-pra="comp" ${F.comp?'checked':''}> Comparar com</label><select class="txt pra-cmp" data-pra="compCp" aria-label="Comparar com qual período" ${F.comp?'':'disabled'}><option value="" ${!F.compCp?'selected':''}>o período anterior</option>${praMesesOpc().map(m=>`<option value="${m}" ${F.compCp===m?'selected':''}>${pdMes(m)}</option>`).join('')}</select></div>
    <div class="pra-r" aria-live="polite"><div class="pra-dsc">${esc(praDesc(F,X.P))}</div>${res}</div></section>`; }

/* ---------- PDF de uma análise (sozinha ou dentro do relatório do mês) ---------- */
function praPdfSecao(P,f,X,titulo){ const R=X.R, C=GPDF.cor, cat=!praTempo(R.por), comp=!!X.RA;
  P.secao(titulo||PRA_MED[f.med]+' por '+PRA_POR[R.por].toLowerCase(),praDesc(f,X.P));
  if(!R.n){ P.vazio('Nada encontrado com essas escolhas.'); return; }
  const media=R.dias?R.tot/R.dias:0;
  P.kpis([{t:'Total',v:praFmt(f.med,R.tot),s:X.P.txt,c:'pet'},{t:'Média por dia com registro',v:f.med==='npar'?'—':praFmt(f.med,media),s:R.dias+' dia(s)'},
    comp?{t:'Período anterior',v:praFmt(f.med,X.RA.tot),s:X.A.txt}:{t:PRA_POR[R.por],v:String(R.rows.filter(r=>r.v>0).length),s:'no resultado'},
    comp?{t:'Variação',v:praVar(R.tot,X.RA.tot)||'—',s:X.RA.tot?'contra o período anterior':'sem dados no período anterior',c:!X.RA.tot?'cinza':(R.tot>=X.RA.tot)===(!(praPar(f.med)||f.med==='perda'))?'ok':'crit'}:{t:'Registros',v:String(R.n)}],4);
  if(cat&&R.por!=='linprod') P.hbar(R.rows.slice(0,20).map(r=>({l:praRot(R.por,r.k),v:r.v,txt:praFmt(f.med,r.v)+' · '+(R.tot?Math.round(r.v/R.tot*100):0)+'%',c:praPar(f.med)||f.med==='perda'?'crit':'pet'})),{lw:62});
  else { const doc=P.doc, h=38; P.cabe(h+16); const top=P.y+3, base=top+h, xs=R.rows, mx=Math.max(1,...xs.map(x=>x.v)), gw=P.cw/Math.max(1,xs.length), bw=Math.max(1.6,Math.min(9,gw*.62));
    P.dc(C.lin); doc.setLineWidth(.2); for(let i=0;i<=4;i++){ const y=base-h*i/4; doc.line(P.M,y,P.M+P.cw,y); } doc.setFontSize(6.5); P.tc(C.mut); doc.text(praFmt(f.med,mx),P.M,top-1.2);
    const passo=Math.ceil(xs.length/16);
    xs.forEach((x,i)=>{ const cx=P.M+gw*i+gw/2, hh=x.v/mx*h; P.fc(praPar(f.med)||f.med==='perda'?C.crit:C.pet); if(hh>.3) doc.rect(cx-bw/2,base-hh,bw,hh,'F');
      if(i%passo===0){ doc.setFont('helvetica','normal'); doc.setFontSize(6.2); P.tc(C.mut); const t=R.por==='dia'?praDm(x.k):R.por==='semana'?praDm(x.k):pdMes(x.k).slice(0,3)+'/'+x.k.slice(2,4); doc.text(t,cx,base+3.6,{align:'center'}); } });
    P.y=base+8; }
  const cols=[{t:PRA_POR[R.por],w:70},{t:PRA_MED[f.med],w:30,al:'r'},{t:'% do total',w:18,al:'r'}].concat(comp&&cat?[{t:'Antes',w:26,al:'r'},{t:'Variação',w:18,al:'r'}]:[]);
  const rows=R.rows.filter(r=>r.v>0||!cat).slice(0,R.por==='linprod'?600:120).map(r=>{ const a=X.ant[r.k]||0, v=praVar(r.v,a), row=[praRot(R.por,r.k),praFmt(f.med,r.v),R.tot?Math.round(r.v/R.tot*100)+'%':''].concat(comp&&cat?[praFmt(f.med,a),v]:[]); if(comp&&cat&&v) row._cor={4:(r.v>=a)===(!(praPar(f.med)||f.med==='perda'))?'ok':'crit'}; return row; });
  rows.push(Object.assign(['Total',praFmt(f.med,R.tot),'100%'].concat(comp&&cat?[praFmt(f.med,X.RA.tot),praVar(R.tot,X.RA.tot)]:[]),{_tot:1}));
  P.tabela(cols,rows); }
async function praEspera(f,cpRel){ const P=praPeriodo(f,cpRel); await praEsp(f,P.de,P.ate); if(f.comp){ const A=praAnterior(f,P); await praEsp(f,A.de,A.ate); } await new Promise(r=>setTimeout(r,50)); return praResultado(f,cpRel); }
async function praPdf(){ const f=JSON.parse(JSON.stringify(S.pra.f)), X=await praEspera(f); if(X.carregando||!X.R) throw new Error('os dados ainda não chegaram');
  const img=await gpImgs(), P=gpNovo('Análise da produção',praDesc(f,X.P),img); P.capa(); praPdfSecao(P,f,X,'Resultado');
  P.fim('Analise-producao-'+X.P.de+'-a-'+X.P.ate+'.pdf'); }

/* ---------- Excel da análise ---------- */
async function praXls(){ const f=S.pra.f, X=praResultado(f); if(!X.R) return; const R=X.R, cat=!praTempo(R.por), comp=!!X.RA;
  const head=[PRA_POR[R.por],PRA_MED[f.med],'% do total'].concat(comp&&cat?['Período anterior','Variação']:[]);
  const num=v=>f.med==='t'?Math.round(v*10)/10:f.med==='par'?Math.round(v):Math.round(v);
  const linhas=[[praDesc(f,X.P)],[],head].concat(R.rows.map(r=>[praRot(R.por,r.k),num(r.v),R.tot?Math.round(r.v/R.tot*1000)/10:0].concat(comp&&cat?[num(X.ant[r.k]||0),praVar(r.v,X.ant[r.k]||0)]:[]))).concat([['Total',num(R.tot),100].concat(comp&&cat?[num(X.RA.tot),praVar(R.tot,X.RA.tot)]:[])]);
  if(f.med==='par') linhas[2][1]='Tempo parado (min)';
  if(R.por==='linprod') linhas.forEach((r,i)=>{ if(i===2) r.splice(0,1,'Linha','Produto'); else if(i>2){ const k=String(r[0]), j=k.indexOf(PRA_SEP); if(r[0]==='Total') r.splice(1,0,''); else r.splice(0,1,j<0?k:k.slice(0,j),j<0?'':k.slice(j+PRA_SEP.length)); } });
  const nome='Analise-producao-'+X.P.de+'-a-'+X.P.ate;
  if(window.XLSX){ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(linhas),'Análise'); XLSX.writeFile(wb,nome+'.xlsx'); return; }
  const csv=linhas.map(r=>r.map(c=>{ const s=String(c==null?'':c); return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(';')).join('\r\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'})); a.download=nome+'.csv'; document.body.appendChild(a); a.click(); a.remove(); }

/* ---------- RELATÓRIO DO MÊS (PDF de verdade) ---------- */
async function praRelMes(){ const cp=S.pi.cp, X=pdInd(cp); if(!X.D){ toast('Sem a previsão deste mês para o relatório.'); return; }
  const k=X.k, D=X.D, Q=v=>ritQ(v,k.kg), U=ritU(), p=k.T?Math.round(k.ra/k.T*100):0, ef=Math.round(X.ef), C=GPDF.cor, img=await gpImgs();
  const cor=p>=ef?'ok':p>=ef*0.8?'warn':'crit', parN=(S.paradas||[]).filter(x=>x.inicio&&hojeStr(new Date(x.inicio)).slice(0,7)===cp).length;
  const P=gpNovo('Relatório da produção',pdMes(cp).replace(/^./,c=>c.toUpperCase())+' · pelos apontamentos e pela previsão do mês',img); P.capa();
  P.kpis([
    {t:'Da meta do mês',v:p+'%',s:'deveria estar em '+ef+'%',c:cor},
    {t:'Produzido no mês',v:Q(k.ra)+' '+U,s:'de '+Q(k.T)+' '+U+' previstos',c:'pet'},
    {t:'Média por dia',v:Q(k.du?k.ra/k.du:0)+' '+U,s:k.sal>0?'precisa '+Q(k.need)+' '+U+'/dia':'meta do mês batida',c:k.sal>0&&k.du&&k.ra/k.du<k.need?'warn':'ok'},
    {t:'Dias úteis',v:k.du+' de '+k.n,s:k.rem?'faltam '+k.rem+' dia(s)':'mês fechado'},
    {t:'Ordens concluídas',v:String(X.conc),s:'no mês'},
    {t:'Tempo parado',v:pdHrs(X.P.tot),s:parN+' parada(s)',c:X.P.tot?'crit':'ok'},
    {t:'Maior motivo de parada',v:X.P.porM[0]?X.P.porM[0][0]:'—',s:X.P.porM[0]?pdHrs(X.P.porM[0][1]):'nenhuma parada'},
    {t:'Projeção do mês',v:Q(k.proj)+' '+U,s:k.T?Math.round(k.proj/k.T*100)+'% da meta no ritmo atual':'',c:k.T&&k.proj>=k.T?'ok':'warn'}],4);
  /* produção por dia com o traço da meta */
  P.secao('Produzido por dia',U+' · traço = meta do dia'); { const doc=P.doc, h=40, xs=(k.s||[]); P.cabe(h+18); const top=P.y+3, base=top+h, mx=Math.max(1,...xs.map(x=>Math.max(x.r||0,x.p||0))), gw=P.cw/Math.max(1,xs.length), bw=Math.max(2,Math.min(7,gw*.62));
    P.dc(C.lin); doc.setLineWidth(.2); for(let i=0;i<=4;i++){ const y=base-h*i/4; doc.line(P.M,y,P.M+P.cw,y); } doc.setFontSize(6.5); P.tc(C.mut); doc.text(Q(mx)+' '+U,P.M,top-1.2);
    xs.forEach((x,i)=>{ const cx=P.M+gw*i+gw/2, fut=D.cut&&x.d>D.cut; if(!fut){ const pc=x.p?x.r/x.p*100:null, hh=(x.r||0)/mx*h; P.fc(C[gpCor(pc)]||C.pet); if(hh>.3) doc.rect(cx-bw/2,base-hh,bw,hh,'F'); }
      if(x.p){ const y=base-x.p/mx*h; P.fc(C.ink); doc.rect(cx-bw/2-1,y-.35,bw+2,.7,'F'); } doc.setFont('helvetica','normal'); doc.setFontSize(6.3); P.tc(C.mut); doc.text(x.d.slice(8),cx,base+3.6,{align:'center'}); });
    P.y=base+9; P.legenda([['95% da meta ou mais',C.ok],['80 a 95%',C.warn],['abaixo de 80%',C.crit],['meta do dia',C.ink,'linha']]); }
  /* curva S */
  P.secao('Curva S do mês','realizado acumulado × planejado'); { const doc=P.doc, h=46, xs=k.s||[]; P.cabe(h+14); const top=P.y+2, base=top+h; let ra=0, pa=0;
    const pts=xs.map(x=>{ pa+=x.p||0; const fut=D.cut&&x.d>D.cut; if(!fut) ra+=x.r||0; return {pa,ra:fut?null:ra}; }), my=Math.max(1,k.T,pa,ra), Xp=i=>P.M+(i/Math.max(1,pts.length-1))*P.cw, Y=v=>base-v/my*h;
    P.dc(C.lin); doc.setLineWidth(.2); for(let i=0;i<=4;i++){ const y=base-h*i/4; doc.line(P.M,y,P.M+P.cw,y); doc.setFontSize(6.3); P.tc(C.mut); doc.text(Q(my*i/4),P.M-1,y+1,{align:'right'}); }
    P.dc(C.cinza); doc.setLineWidth(.9); doc.setLineDashPattern([1.6,1.2],0); for(let i=1;i<pts.length;i++) doc.line(Xp(i-1),Y(pts[i-1].pa),Xp(i),Y(pts[i].pa)); doc.setLineDashPattern([],0);
    const rr=pts.filter(x=>x.ra!=null); P.dc(C.pet); doc.setLineWidth(1.2); for(let i=1;i<rr.length;i++) doc.line(Xp(i-1),Y(rr[i-1].ra),Xp(i),Y(rr[i].ra));
    if(rr.length){ const i=rr.length-1; P.fc(C.pet); doc.circle(Xp(i),Y(rr[i].ra),1.2,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); P.tc(C.pet); doc.text(Q(rr[i].ra)+' '+U,Xp(i)+2,Y(rr[i].ra)-1.5); }
    P.y=base+7; P.legenda([['Realizado acumulado',C.pet,'linha'],['Planejado (meta do mês)',C.cinza,'linha']]); }
  /* por linha */
  const LS=D.LS.map(l=>({l,s:ritStats(D,{l})})).filter(x=>x.s.T>0);
  P.cabe(92); P.secao('Meta por linha','realizado × meta até hoje');
  if(LS.length){ P.colunas(LS.map(x=>{ const pc=x.s.pa?Math.round(x.s.ra/x.s.pa*100):null; return {l:x.l,a:x.s.ra,b:x.s.pa,at:Q(x.s.ra),bt:Q(x.s.pa),rot:pc!=null?pc+'%':'',c:gpCor(pc)}; }));
    P.tabela([{t:'Linha',w:30},{t:'Meta do mês',w:22,al:'r'},{t:'Meta até hoje',w:22,al:'r'},{t:'Realizado',w:22,al:'r'},{t:'Atingido',w:16,al:'r'},{t:'Do mês',w:16,al:'r'}],
      LS.map(x=>{ const pc=x.s.pa?x.s.ra/x.s.pa*100:null, r=[x.l,Q(x.s.T),Q(x.s.pa),Q(x.s.ra),pc!=null?Math.round(pc)+'%':'—',x.s.T?Math.round(x.s.ra/x.s.T*100)+'%':'—']; r._cor={4:pc!=null?gpCor(pc):null}; return r; })
      .concat([Object.assign(['Total',Q(k.T),Q(k.pa),Q(k.ra),k.pa?Math.round(k.ra/k.pa*100)+'%':'—',p+'%'],{_tot:1})])); }
  else P.vazio('Sem meta por linha neste mês.');
  /* paradas */
  P.secao('Tempo parado por motivo',pdHrs(X.P.tot)+' no mês');
  if(X.P.porM.length) P.hbar(X.P.porM.map(([m,v])=>({l:m,v,txt:pdHrs(v)+' · '+(X.P.tot?Math.round(v/X.P.tot*100):0)+'%',c:'crit'})),{lw:56}); else P.vazio('Nenhuma parada no mês.');
  if(X.P.porL.length){ P.secao('Tempo parado por linha'); P.hbar(X.P.porL.map(([l,v])=>({l,v,txt:pdHrs(v),c:'warn'})),{lw:56}); }
  /* análises salvas marcadas */
  const sv=(S.pra.salvas||[]).filter(s=>s.noMes);
  for(const s of sv){ try{ const Xa=await praEspera(s.f,cp); if(Xa.R) praPdfSecao(P,s.f,Xa,s.nome); }catch(e){ console.warn('[relatório] análise',s.nome,e); } }
  P.fim('Relatorio-producao-'+cp+'.pdf'); }
pdRelatorio=function(){ return praRelMes(); };

/* ---------- ligação com a tela ---------- */
{ const _pi=S.extViews.prodind; if(typeof _pi==='function') S.extViews.prodind=function(){ const h=_pi.apply(this,arguments); try{ return h+praCard(); }catch(e){ console.warn('[análise]',e); return h; } }; }
const praBusy=async(b,fn,ok)=>{ if(b.dataset.gerando) return; b.dataset.gerando='1'; const t0=b.innerHTML; b.disabled=true; b.textContent='Gerando…';
  try{ await fn(); if(ok) toast(ok); }catch(e){ console.warn('[pdf produção]',e); toast('Não foi possível gerar: '+((e&&e.message)||e)); } finally{ delete b.dataset.gerando; b.disabled=false; b.innerHTML=t0; } };
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="pd-pdf"]'); if(!b) return; ev.stopImmediatePropagation(); ev.preventDefault(); praBusy(b,praRelMes,'PDF do mês baixado.'); },true);
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="pra-"]'); if(!b) return; const a=b.dataset.act, F=S.pra.f;
  if(a==='pra-ln'){ const v=b.dataset.v; F.ls=!v?[]:F.ls.includes(v)?F.ls.filter(x=>x!==v):F.ls.concat([v]); render(); return; }
  if(a==='pra-sug'){ const s=PRA_SUG[+b.dataset.i]; if(s){ Object.assign(F,{ls:[],prod:'',fonte:''},s.f); render(); } return; }
  if(a==='pra-usar'){ const s=(S.pra.salvas||[]).find(x=>x.id===b.dataset.id); if(s){ S.pra.f=Object.assign({ls:[],prod:'',semSetup:true,comp:true,compCp:'',fonte:''},JSON.parse(JSON.stringify(s.f))); render(); } return; }
  if(a==='pra-tirar'){ if(b.dataset.c!=='1'){ b.dataset.c='1'; b.textContent='apagar?'; setTimeout(()=>{ if(b.isConnected){ b.dataset.c=''; b.textContent='×'; } },3000); return; }
    S.pra.salvas=(S.pra.salvas||[]).filter(x=>x.id!==b.dataset.id); render(); praSalvasGrava(); return; }
  if(a==='pra-salvar'){ S.pra.salvando=true; render(); setTimeout(()=>{ const i=$('#pra-nome'); i&&(i.focus(),i.select()); },30); return; }
  if(a==='pra-salvar-x'){ S.pra.salvando=false; render(); return; }
  if(a==='pra-salvar-ok'){ const nome=(($('#pra-nome')||{}).value||'').trim(); if(!nome){ toast('Dê um nome para a análise.'); return; }
    const noMes=!!(($('#pra-nomes')||{}).checked); S.pra.salvas=(S.pra.salvas||[]).filter(x=>x.nome!==nome).concat([{id:'a'+Date.now().toString(36),nome:nome.slice(0,60),f:JSON.parse(JSON.stringify(F)),noMes}]).slice(-15);
    S.pra.salvando=false; render(); praSalvasGrava(); toast('Análise salva'+(noMes?' · entra no relatório do mês':'')+'.'); return; }
  if(a==='pra-pdf'){ praBusy(b,praPdf,'PDF da análise baixado.'); return; }
  if(a==='pra-xls'){ praBusy(b,praXls); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.closest||!t.closest('#pra')) return; const F=S.pra.f;
  if(t.dataset.praNomes){ const s=(S.pra.salvas||[]).find(x=>x.id===t.dataset.praNomes); if(s){ s.noMes=t.checked; praSalvasGrava(); toast(t.checked?'Entra no relatório do mês.':'Saiu do relatório do mês.'); } return; }
  const k=t.dataset.pra; if(!k) return; F[k]=t.type==='checkbox'?t.checked:t.value;
  if(k==='med'){ if(praPar(F.med)&&praSemProd(F.por)) F.por='motivo'; if(!praPar(F.med)&&F.por==='motivo') F.por='produto'; }
  if(k==='per'&&F.per==='datas'&&!F.de){ F.ate=hojeStr(); F.de=addDias(F.ate,-13); }
  render(); });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='pra-nome'){ ev.preventDefault(); const b=document.querySelector('[data-act="pra-salvar-ok"]'); b&&b.click(); } });
document.head.insertAdjacentHTML('beforeend',`<style id="pra-css">
.pra{margin-top:16px;display:flex;flex-direction:column;gap:12px}
.pra-h{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}.pra-h h2{margin:0 0 2px}.pra-h .sub{margin:0}
.pra-acts{display:flex;gap:8px;flex-wrap:wrap}
.pra-sv{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--ground);border-radius:10px;padding:10px}.pra-sv .txt{flex:1 1 260px}
.pra-chips,.pra-f2{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pra-lb{font-size:12.5px;color:var(--muted);font-weight:600;margin-right:2px}
.pra-chip{border:1px solid var(--line,#DDE4E9);background:var(--surface);color:inherit;border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer}
.pra-chip:hover{border-color:var(--teal)}.pra-chip.on{background:var(--teal-strong,#143F54);border-color:var(--teal-strong,#143F54);color:#fff}
.pra-mi{display:inline-flex;align-items:center;gap:8px;padding:3px 6px 3px 12px}.pra-mi button{border:0;background:none;font:inherit;color:inherit;cursor:pointer;padding:0;font-weight:600}
.pra-mi label{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--muted)}.pra-x{font-size:16px!important;font-weight:400!important;color:var(--muted)!important;padding:0 4px!important}
.pra-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.pra-f label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted);font-weight:600}
.pra-sp{flex:1}.pra-ck{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:inherit}
.pra-r{border-top:1px solid var(--line,#DDE4E9);padding-top:12px;display:flex;flex-direction:column;gap:12px}
.pra-dsc{font-size:13px;color:var(--muted)}
.pra-cov{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--muted)}.pra-cov span{background:var(--ground);border-radius:6px;padding:2px 7px;color:inherit}.pra-cov span.v{background:var(--crit-tint,#F6E8E6);color:var(--crit-ink,#9C3B34);font-weight:600}
details.pra-av summary{cursor:pointer}
.pra-gh{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-top:8px;padding:6px 0 4px;border-bottom:2px solid var(--teal-strong,#143F54)}.pra-gh:first-child{margin-top:0}.pra-gh b{font-size:14.5px;color:var(--teal-strong,#143F54)}.pra-gh span{font-size:12.5px;color:var(--muted)}
.pra-cmp{height:34px;width:auto;min-width:150px;font-size:13px;padding:0 8px}.pra-cmp:disabled{opacity:.5}
.pra-tot{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.pra-tot>div{background:var(--ground);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}
.pra-tot b{font-size:24px;font-weight:700;line-height:1.1}.pra-tot b.ok{color:var(--ok-ink,var(--ok))}.pra-tot b.crit{color:var(--crit-ink,var(--crit))}.pra-tot span{font-size:12.5px;color:var(--muted)}
.pra-av{background:var(--warn-bg,#FBF3E2);color:var(--warn-ink,#7A5B1C);border-radius:10px;padding:8px 12px;font-size:13px}
.pra-bs{display:flex;flex-direction:column;gap:6px;max-height:560px;overflow:auto;padding-right:4px}
.pra-b{display:grid;grid-template-columns:minmax(120px,260px) minmax(0,1fr) 110px minmax(0,190px);gap:10px;align-items:center;font-size:13.5px}
.pra-b>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pra-b>div{background:var(--ground);border-radius:6px;height:12px;overflow:hidden}.pra-b>div i{display:block;height:100%;background:var(--teal,#2B6A87);border-radius:6px}
.pra-b>b{text-align:right;font-weight:600}.pra-b>small{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:760px){.pra-b{grid-template-columns:minmax(0,1fr) 90px}.pra-b>div{grid-column:1/-1;order:3}.pra-b>small{grid-column:1/-1;order:4}}
</style>`);
try{ window.Painel.analiseProducao={resultado:f=>praResultado(f||S.pra.f),relatorioMes:()=>praRelMes()}; }catch(e){}
