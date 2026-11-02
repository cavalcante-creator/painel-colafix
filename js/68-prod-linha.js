/* Painel Colafix · 68-prod-linha.js — Produção → "Por linha": relatório de produção por linha de produção, num período
   (apontamentos vivos + arquivados por mês), com programado, ordens, média por dia, paradas, por produto e por dia; PDF e Excel. */
"use strict";
S.pl=S.pl||{per:'mes',de:'',ate:'',cache:{},carregando:false};
const PL_PER=[['hoje','Hoje'],['ontem','Ontem'],['semana','Esta semana'],['semant','Semana passada'],['mes','Este mês'],['mesant','Mês passado'],['livre','Escolher datas']];
function plIntervalo(){ const h=hojeStr(), d=new Date(h+'T12:00:00'), seg=addDias(h,-((d.getDay()+6)%7)), m1=h.slice(0,8)+'01', P=S.pl;
  switch(P.per){ case 'hoje': return [h,h]; case 'ontem': return [addDias(h,-1),addDias(h,-1)]; case 'semana': return [seg,h]; case 'semant': return [addDias(seg,-7),addDias(seg,-1)];
    case 'mesant': { const ult=addDias(m1,-1); return [ult.slice(0,8)+'01',ult]; } case 'livre': return [P.de||m1,P.ate||h]; default: return [m1,h]; } }
const plFmt=n=>Math.round(+n||0).toLocaleString('pt-BR'), plH=ms=>{ const m=Math.round(ms/60000); return m>=60?Math.floor(m/60)+'h'+String(m%60).padStart(2,'0'):m+' min'; };
async function plCarregar(de,ate){ const k=de+'|'+ate, P=S.pl; if(P.cache[k]||P.carregando) return; P.carregando=true;
  try{ const ini=new Date(de+'T00:00:00').toISOString(), fim=new Date(addDias(ate,1)+'T00:00:00').toISOString(), por=new Map();
    (await S.db.collection('entregas').where('em','>=',ini).where('em','<',fim).orderBy('em').get()).docs.forEach(d=>por.set(d.id,Object.assign({_id:d.id},d.data())));
    for(let cp=de.slice(0,7); cp<=ate.slice(0,7); cp=addDias(cp+'-28',5).slice(0,7)){ try{ const g=await S.db.doc('entregasarq/'+cp).get(); ((g.exists&&g.data().l)||[]).forEach(e=>{ if(e.em>=ini&&e.em<fim&&!por.has(e._id)) por.set(e._id,e); }); }catch(e){} }
    let pars=[]; try{ pars=(await S.db.collection('paradas').where('inicio','<',fim).orderBy('inicio','desc').limit(800).get()).docs.map(d=>Object.assign({_id:d.id},d.data())); }catch(e){ pars=(S.paradas||[]).slice(); }
    P.cache[k]={ent:[...por.values()],pars,em:Date.now()}; }
  catch(e){ console.warn('[prod linha]',e); toast('Não foi possível buscar os apontamentos do período.'); P.cache[k]={ent:(S.entregas||[]).slice(),pars:(S.paradas||[]).slice(),erro:true}; }
  finally{ P.carregando=false; rerenderSeguro(); } }
function plCalc(de,ate,C){ const ini=new Date(de+'T00:00:00').getTime(), fim=new Date(addDias(ate,1)+'T00:00:00').getTime(), an=new Set(C.ent.filter(e=>e.anula).map(e=>e.anula)), an2=typeof anuladas==='function'?anuladas():new Set();
  const ordM=new Map((S.ordens||[]).map(o=>[o._id,o])), L={}, nomes=linhasOrd().slice(); const lin=n=>{ if(!L[n]){ L[n]={l:n,prod:0,prog:0,ords:new Set(),conc:0,nOrd:0,dias:{},itens:{},par:0,mot:{}}; if(!nomes.includes(n)) nomes.push(n); } return L[n]; };
  C.ent.forEach(e=>{ if(e.anula||an.has(e._id)||an2.has(e._id)||!e.em) return; const o=ordM.get(e.ordem)||{}, n=e.linha||o.linha||'Sem linha', x=lin(n), q=+e.qtd||0, d=hojeStr(new Date(e.em));
    x.prod+=q; x.dias[d]=(x.dias[d]||0)+q; const cod=(typeof codigoDe==='function'&&o.produto?codigoDe(o):'')||String(o.produto||'').split(/\s+/)[0]||('Ordem '+(e.num||'?')); const it=x.itens[cod]=x.itens[cod]||{cod,d:String(o.produto||'').replace(/^\S+\s*[-—]?\s*/,''),q:0}; it.q+=q; x.ords.add(e.ordem); });
  (S.ordens||[]).forEach(o=>{ if(['cancelada','excluida','ignorada','prevista'].includes(o.status)) return; const d=(typeof dataEf==='function'?dataEf(o):o.data)||''; if(!d||d<de||d>ate) return; const x=lin(o.linha||'Sem linha'); x.prog+=+o.total||0; x.nOrd++; if(o.status!=='aberta') x.conc++; });
  (C.pars||[]).forEach(p=>{ if(!p.inicio) return; const a=Math.max(ini,new Date(p.inicio).getTime()), b=Math.min(fim,p.fim?new Date(p.fim).getTime():Date.now()); if(b<=a) return; const x=lin(p.linha||'Sem linha'), ms=b-a; x.par+=ms; const m=String(p.motivo||'Sem motivo'); x.mot[m]=(x.mot[m]||0)+ms; });
  const xs=nomes.filter(n=>L[n]&&(L[n].prod||L[n].prog||L[n].par)).map(n=>{ const x=L[n], dt=Object.keys(x.dias).filter(d=>x.dias[d]>0).length, mot=Object.entries(x.mot).sort((a,b)=>b[1]-a[1])[0];
    return Object.assign(x,{pc:x.prog?x.prod/x.prog*100:null,diasT:dt,media:dt?x.prod/dt:0,motP:mot?mot[0]:'',motMs:mot?mot[1]:0,itensL:Object.values(x.itens).sort((a,b)=>b.q-a.q)}); });
  const dias=[]; for(let d=de; d<=ate; d=addDias(d,1)) dias.push(d);
  return {de,ate,xs,dias,tot:xs.reduce((a,x)=>a+x.prod,0),prog:xs.reduce((a,x)=>a+x.prog,0),par:xs.reduce((a,x)=>a+x.par,0)}; }
function vProdLinhas(){ const P=S.pl, [de,ate]=plIntervalo(), C=P.cache[de+'|'+ate]; if(!C) plCarregar(de,ate);
  const chips=`<div class="chips" role="group" aria-label="Período">${PL_PER.map(([k,n])=>`<button class="chip" data-act="pl-per" data-v="${k}" aria-pressed="${P.per===k}">${n}</button>`).join('')}</div>
    ${P.per==='livre'?`<div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-top:10px"><label class="sub" style="display:flex;flex-direction:column;gap:3px;margin:0">De<input type="date" class="txt" data-pl-de value="${esc(de)}"></label><label class="sub" style="display:flex;flex-direction:column;gap:3px;margin:0">Até<input type="date" class="txt" data-pl-ate value="${esc(ate)}"></label></div>`:''}`;
  const head=`<div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Produção por linha</h1><div class="sub">${esc(dataBR(de))}${de!==ate?' a '+esc(dataBR(ate)):''} · pelos apontamentos</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-act="pl-xls" ${C?'':'disabled'}>Baixar Excel</button><button class="btn" data-act="pl-pdf" ${C?'':'disabled'}>Baixar PDF</button></div></div>`;
  if(!C) return `${head}<section class="card">${chips}</section><div class="empty">Buscando os apontamentos do período…</div>`;
  const R=plCalc(de,ate,C), mx=Math.max(1,...R.xs.map(x=>Math.max(x.prod,x.prog)));
  const cards=R.xs.map(x=>{ const cor=x.pc==null?'var(--teal-strong)':x.pc>=95?'var(--ok)':x.pc>=75?'var(--warn)':'var(--crit)';
    return `<section class="card pl-card"><div class="pl-ch"><b>${esc(x.l)}</b>${x.pc!=null?`<span class="pill ${x.pc>=95?'ok':x.pc>=75?'warn':'crit'}">${Math.round(x.pc)}% do programado</span>`:''}</div>
      <div class="pl-big"><b>${plFmt(x.prod)}</b><span>sacos produzidos</span></div>
      <div class="pl-bar" title="Produzido × programado"><u style="width:${(x.prod/mx*100).toFixed(1)}%;background:${cor}"></u>${x.prog?`<i style="left:${Math.min(100,x.prog/mx*100).toFixed(1)}%"></i>`:''}</div>
      <div class="pl-kv"><div><span>Programado</span><b>${x.prog?plFmt(x.prog):'—'}</b></div><div><span>Ordens</span><b>${x.conc} de ${x.nOrd} concluídas</b></div><div><span>Média por dia trabalhado</span><b>${plFmt(x.media)}</b><small>${x.diasT} dia${x.diasT===1?'':'s'}</small></div><div><span>Tempo parado</span><b>${x.par?plH(x.par):'nenhum'}</b>${x.motP?`<small>mais: ${esc(x.motP)} (${plH(x.motMs)})</small>`:''}</div></div>
      <details class="pl-det"><summary>Por produto e por dia</summary>
        <div class="pl-g2"><div><div class="label" style="margin-bottom:6px">Por produto</div>${x.itensL.length?`<table class="pl-t"><tbody>${x.itensL.slice(0,12).map(i=>`<tr><td><b>${esc(i.cod)}</b> <span class="sub" style="margin:0">${esc(i.d.slice(0,32))}</span></td><td class="r">${plFmt(i.q)}</td><td class="r sub" style="margin:0">${x.prod?Math.round(i.q/x.prod*100):0}%</td></tr>`).join('')}</tbody></table>`:'<div class="sub">Nada apontado.</div>'}</div>
        <div><div class="label" style="margin-bottom:6px">Por dia</div>${R.dias.filter(d=>x.dias[d]).length?`<div class="pl-dias">${R.dias.filter(d=>x.dias[d]||R.dias.length<=14).map(d=>{ const v=x.dias[d]||0, m=Math.max(1,...Object.values(x.dias)); return `<div><span>${esc(dm(d))}</span><i><u style="width:${(v/m*100).toFixed(0)}%"></u></i><b>${v?plFmt(v):'—'}</b></div>`; }).join('')}</div>`:'<div class="sub">Nada apontado.</div>'}</div></div></details></section>`; }).join('');
  const tot=`<section class="card pl-tot"><div><span>Total produzido</span><b>${plFmt(R.tot)}</b><small>sacos</small></div><div><span>Programado</span><b>${R.prog?plFmt(R.prog):'—'}</b><small>${R.prog?Math.round(R.tot/R.prog*100)+'% feito':''}</small></div><div><span>Linhas</span><b>${R.xs.length}</b><small>com movimento</small></div><div><span>Tempo parado</span><b>${R.par?plH(R.par):'nenhum'}</b><small>todas as linhas</small></div></section>`;
  return `${head}<section class="card">${chips}</section>${R.xs.length?tot+`<div class="pl-grid">${cards}</div>`:'<div class="empty">Nenhum apontamento nem ordem programada neste período.</div>'}${C.erro?'<div class="sub">Atenção: não consegui buscar todo o período; mostrando só os apontamentos recentes.</div>':''}`; }
/* 02/11 ("melhorar o layout do PDF da produção por linha"): PDF de verdade no padrão dos relatórios do painel (js/34: faixa com a logo,
   números em quadros, barras e tabelas, rodapé com página), baixado direto, sem a janela de impressão. Uma folha de resumo e,
   para cada linha, os números, o que produziu (produtos) e o dia a dia. */
async function plPdf(){ const [de,ate]=plIntervalo(), C=S.pl.cache[de+'|'+ate]; if(!C) return; const R=plCalc(de,ate,C);
  try{ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }catch(e){}
  let img={}; try{ img=await gpImgs(); }catch(e){}
  let P; try{ P=gpNovo('Produção por linha',dataBR(de)+(de!==ate?' a '+dataBR(ate):'')+' · pelos apontamentos do painel',img); }catch(e){ toast(e.message||'O gerador de PDF não carregou.'); return; }
  const pc=(a,b)=>b?Math.round(a/b*100):null, cor=p=>p==null?'cinza':p>=95?'ok':p>=75?'warn':'crit', pT=pc(R.tot,R.prog);
  P.capa();
  P.kpis([{t:'Total produzido',v:plFmt(R.tot)+' sc',s:R.xs.filter(x=>x.prod).length+' linha(s) produziram',c:'pet'},
    {t:'Programado no período',v:R.prog?plFmt(R.prog)+' sc':'—',s:pT!=null?pT+'% do programado feito':'sem ordens programadas',c:cor(pT)},
    {t:'Ordens concluídas',v:R.xs.reduce((a,x)=>a+x.conc,0)+' de '+R.xs.reduce((a,x)=>a+x.nOrd,0),s:'programadas no período',c:'cinza'},
    {t:'Tempo parado',v:R.par?plH(R.par):'nenhum',s:'todas as linhas',c:R.par?'warn':'ok'}],4);
  if(!R.xs.length){ P.vazio('Nenhum apontamento nem ordem programada neste período.'); P.fim('Producao por linha '+de+(de!==ate?' a '+ate:'')+'.pdf'); return; }
  P.secao('Produzido × programado por linha','barra = produzido · número da direita = produzido de programado');
  const mx=Math.max(1,...R.xs.map(x=>Math.max(x.prod,x.prog)));
  P.hbar(R.xs.map(x=>({l:x.l,v:x.prod,c:x.pc==null?'pet':cor(x.pc),txt:plFmt(x.prod)+(x.prog?' de '+plFmt(x.prog)+' · '+Math.round(x.pc)+'%':'')})),{max:mx,lw:34});
  P.secao('Resumo');
  P.tabela([{t:'Linha',w:28},{t:'Produzido',w:20,al:'r'},{t:'Programado',w:21,al:'r'},{t:'% feito',w:15,al:'r'},{t:'Ordens',w:17,al:'r'},{t:'Média/dia',w:18,al:'r'},{t:'Parado',w:15,al:'r'},{t:'Principal parada',w:42}],
    R.xs.map(x=>Object.assign([x.l,plFmt(x.prod),x.prog?plFmt(x.prog):'—',x.pc!=null?Math.round(x.pc)+'%':'—',x.conc+' de '+x.nOrd,plFmt(x.media),x.par?plH(x.par):'—',x.motP||'—'],{_cor:{3:x.pc==null?null:cor(x.pc)}}))
      .concat([Object.assign(['Total',plFmt(R.tot),R.prog?plFmt(R.prog):'—',pT!=null?pT+'%':'—',R.xs.reduce((a,x)=>a+x.conc,0)+' de '+R.xs.reduce((a,x)=>a+x.nOrd,0),'',R.par?plH(R.par):'—',''],{_tot:1})]));
  R.xs.forEach(x=>{ P.cabe(95); if(P.y>32){ P.y+=2; P.dc(GPDF.cor.cinza); P.doc.setLineWidth(.5); P.doc.line(P.M,P.y,P.W-P.M,P.y); P.y+=6; } P.secao(x.l,plFmt(x.prod)+' sacos'+(x.prog?' · '+Math.round(x.pc)+'% do programado':''));
    P.kpis([{t:'Produzido',v:plFmt(x.prod)+' sc',s:x.itensL.length===1?'1 produto':x.itensL.length+' produtos',c:'pet'},{t:'Programado',v:x.prog?plFmt(x.prog)+' sc':'—',s:x.conc+' de '+x.nOrd+' ordens concluídas',c:cor(x.pc)},
      {t:'Média por dia trabalhado',v:plFmt(x.media)+' sc',s:x.diasT===1?'1 dia trabalhado':x.diasT+' dias trabalhados',c:'cinza'},{t:'Tempo parado',v:x.par?plH(x.par):'nenhum',s:x.motP?'mais: '+x.motP+' ('+plH(x.motMs)+')':'',c:x.par?'warn':'ok'}],4);
    P.secao('Por produto',x.itensL.length+' produto(s)');
    if(x.itensL.length) P.tabela([{t:'Código',w:22},{t:'Produto',w:100},{t:'Sacos',w:24,al:'r'},{t:'% da linha',w:20,al:'r'}],x.itensL.map(i=>[i.cod,i.d||'—',plFmt(i.q),(x.prod?Math.round(i.q/x.prod*100):0)+'%']));
    else P.vazio('Nada apontado nesta linha no período.');
    const ds=R.dias.filter(d=>x.dias[d]); P.secao('Dia a dia',ds.length+' dia(s) com produção');
    if(!ds.length){ P.vazio('Nada apontado.'); return; }
    if(ds.length<=12){ const m=Math.max(1,...ds.map(d=>x.dias[d])); P.hbar(ds.map(d=>({l:dataBR(d).slice(0,5)+' '+['dom','seg','ter','qua','qui','sex','sáb'][new Date(d+'T12:00:00').getDay()],v:x.dias[d],txt:plFmt(x.dias[d])})),{max:m,lw:22}); return; }
    const rows=[]; for(let i=0;i<ds.length;i+=3) rows.push([].concat(...[0,1,2].map(k=>ds[i+k]?[dataBR(ds[i+k]).slice(0,5),plFmt(x.dias[ds[i+k]])]:['',''])));
    P.tabela([{t:'Dia',w:16},{t:'Sacos',w:18,al:'r'},{t:'Dia',w:16},{t:'Sacos',w:18,al:'r'},{t:'Dia',w:16},{t:'Sacos',w:18,al:'r'}],rows); });
  P.fim('Producao por linha '+de+(de!==ate?' a '+ate:'')+'.pdf'); toast('PDF baixado.'); }
async function plXls(){ const [de,ate]=plIntervalo(), C=S.pl.cache[de+'|'+ate]; if(!C) return; const R=plCalc(de,ate,C);
  try{ await carregarScript(ANL_XLSX); const X=window.XLSX; if(!X) throw new Error('sem planilha'); const wb=X.utils.book_new();
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Linha','Produzido (sacos)','Programado','% do programado','Ordens concluídas','Ordens no período','Dias trabalhados','Média por dia','Tempo parado (min)','Principal parada']].concat(R.xs.map(x=>[x.l,Math.round(x.prod),Math.round(x.prog),x.pc!=null?Math.round(x.pc):'',x.conc,x.nOrd,x.diasT,Math.round(x.media),Math.round(x.par/60000),x.motP]))),'Resumo');
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Linha','Código','Produto','Sacos']].concat(...R.xs.map(x=>x.itensL.map(i=>[x.l,i.cod,i.d,Math.round(i.q)])))),'Por produto');
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Dia'].concat(R.xs.map(x=>x.l))].concat(R.dias.map(d=>[dataBR(d)].concat(R.xs.map(x=>Math.round(x.dias[d]||0)))))),'Por dia');
    X.writeFile(wb,'Producao por linha '+de+(de!==ate?' a '+ate:'')+'.xlsx'); }
  catch(e){ toast('Não foi possível gerar o Excel agora. Tente o PDF.'); } }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="pl-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='pl-per'){ S.pl.per=b.dataset.v; if(S.pl.per==='livre'&&!S.pl.de){ const [d0,d1]=[hojeStr().slice(0,8)+'01',hojeStr()]; S.pl.de=d0; S.pl.ate=d1; } render(); }
  if(a==='pl-pdf') plPdf(); if(a==='pl-xls') plXls(); });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset) return; if(t.dataset.plDe!=null){ S.pl.de=t.value; render(); } if(t.dataset.plAte!=null){ S.pl.ate=t.value; render(); } });
VIEWS.prodlinhas={nome:'Produção por linha',ic:'analise',mob:'Por linha'}; CRUMB.prodlinhas='Produção por linha';
{ const M=MODS.find(x=>x.id==='producao'); if(M&&!M.views.includes('prodlinhas')){ const i=M.views.indexOf('indicadores'); M.views.splice(i>=0?i+1:M.views.length,0,'prodlinhas'); } }
S.extViews=S.extViews||{}; S.extViews.prodlinhas=vProdLinhas;
/* administradora: as abas da Produção são enxutas (js/56); o relatório fica em Relatórios, junto dos indicadores */
try{ if(typeof ADM_REL!=='undefined'&&!ADM_REL.includes('prodlinhas')) ADM_REL.push('prodlinhas'); }catch(e){}
document.head.insertAdjacentHTML('beforeend',`<style id="pl-css">
.pl-tot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.pl-tot>div{display:flex;flex-direction:column}.pl-tot span{font-size:13px;color:var(--muted)}.pl-tot b{font-size:30px;font-weight:300;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.pl-tot small{font-size:12.5px;color:var(--muted)}
.pl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}.pl-card{display:flex;flex-direction:column;gap:12px}.pl-ch{display:flex;justify-content:space-between;align-items:center;gap:8px}.pl-ch b{font-size:19px}
.pl-big b{font-size:40px;font-weight:300;letter-spacing:-.03em;font-variant-numeric:tabular-nums;margin-right:8px}.pl-big span{color:var(--muted);font-size:14px}
.pl-bar{position:relative;height:10px;border-radius:5px;background:var(--surface-2);overflow:visible}.pl-bar u{display:block;height:100%;border-radius:5px}.pl-bar i{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--ink)}
.pl-kv{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}.pl-kv>div{display:flex;flex-direction:column}.pl-kv span{font-size:12.5px;color:var(--muted)}.pl-kv b{font-size:15.5px}.pl-kv small{font-size:12px;color:var(--muted)}
.pl-det summary{cursor:pointer;font-weight:600;font-size:14px;color:var(--teal-strong)}.pl-g2{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-top:10px}@media (max-width:700px){.pl-g2,.pl-tot{grid-template-columns:1fr 1fr}.pl-grid{grid-template-columns:1fr}}
.pl-t{width:100%;border-collapse:collapse;font-size:13.5px}.pl-t td{padding:5px 0;border-bottom:1px solid var(--line)}.pl-t .r{text-align:right;padding-left:8px;font-variant-numeric:tabular-nums}
.pl-dias{display:flex;flex-direction:column;gap:4px;font-size:13px}.pl-dias>div{display:grid;grid-template-columns:52px 1fr 54px;gap:6px;align-items:center}.pl-dias i{height:7px;border-radius:4px;background:var(--surface-2);overflow:hidden}.pl-dias u{display:block;height:100%;background:var(--teal-strong)}.pl-dias b{text-align:right;font-weight:500;font-variant-numeric:tabular-nums}
</style>`);
/* ===FIM PROD LINHA=== */
