/* Painel Colafix · 60-estoques-semana.js (26/10, protótipo "Necessidades de produção · protótipo")
   Análise PCP › Estoques repaginada: "O que precisa produzir", olhando tudo em SEMANAS.
   - Meta da semana = previsão do mês ÷ 4. Semanas já passadas = 4 × dias úteis até hoje ÷ dias úteis do mês.
   - No mês (semanas) = (estoque do dia 1º + feito no mês) ÷ meta da semana − semanas já passadas.
   - Cabeçalho azul, barra de filtros (linha, busca, situação, família, embalagem, tipo), frase + 4 números,
     Curva S em semanas (não é a da TV nem a do Previsto × Realizado), "Vendeu mais que o previsto",
     a tabela de sempre (agora obedecendo os filtros) e os filtros antigos em "Mais filtros".
   - PDF (A4 deitada, jsPDF) e Excel com cores (ExcelJS; sem ele, SheetJS simples), respeitando os filtros.
   Ganchos no js/03 (vAnlEst): eswOk(r) no filtro, eswXs(xs) com a lista final e as marcas <!--esw:a|b|c|d-->.
   Prefixo `esw`. */
"use strict";
S.esw={sit:'acao',fam:'',emb:'',tipo:'',mais:false,capAb:false,xs:null,all:null,snap:undefined,va:[]};
const ESW_MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ESW_EXCELJS='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
const ESW_SIT=[['acao','Pede ação'],['hoje','Agir hoje'],['semana','Esta semana'],['calma','Sem pressa'],['todas','Todas']];
const eswF1=v=>(Math.round(v*10)/10).toFixed(1).replace('.',',');
const eswSemTxt=v=>{ const a=Math.abs(v); return eswF1(a)+' semana'+(Math.round(a*10)/10>=2?'s':''); };
/* ---------- classificação de cada linha da tabela ---------- */
function eswFam(d){ const s=String(d||'').toUpperCase(); const m=s.match(/\bAC\s*-?\s*(III|II|I|[123])\b/); if(m) return 'AC'+({I:'1',II:'2',III:'3'}[m[1]]||m[1]); if(/\bPIC\b/.test(s)) return 'PIC'; return 'Outros'; }
function eswEmb(d){ const s=String(d||'').toUpperCase(); if(/PL[AÁ]STIC/.test(s)) return 'Plástica'; if(/PAPEL/.test(s)) return 'Papel'; return 'Outra'; }
function eswGrupo(r){ if(r.int) return 'calma'; const rup=r.rup!==null&&r.rup!==undefined&&r.dem&&!r.enc;
  if(r.sit2==='ZERADO'||r.sit2==='ENC_FALTA'||(rup&&r.rup<=1)) return 'hoje'; if(rup&&r.rup<=7) return 'semana'; return 'calma'; }
function eswSemanas(){ const h=hojeStr(), cp=h.slice(0,7), ini=cp+'-01', y=+cp.slice(0,4), m=+cp.slice(5,7), prox=(m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0'))+'-01';
  const tot=Math.max(1,anlUteisEntre(ini,prox)), ate=Math.min(tot,anlUteisEntre(ini,addDias(h,1)));
  return {cp,ini,prox,dt:tot,du:ate,s:4*ate/tot,n:Math.max(1,Math.min(4,Math.ceil(4*ate/tot-1e-9)))}; }
function eswCalc(r,W){ if(r._esw) return r._esw; const meta=r.pvm>0?r.pvm/4:0; const tinha=r.pvT==null?0:r.pvT, feito=r.pvF||0;
  const o={meta,tinha,feito,pos:meta?(tinha+feito)/meta-W.s:null,cobre:meta?Math.max(0,r.tot)/meta:null,pedS:meta&&r.dc>0?r.dc/meta:null,
    acima:!r.int&&r.dc>0&&r.dc>Math.max(0,r.tot),faltaAt:Math.max(0,(r.dc||0)-Math.max(0,r.tot)),fam:eswFam(r.d),emb:eswEmb(r.d),g:eswGrupo(r)};
  o.dev=meta?meta*W.s:null; o.tem=tinha+feito; o.difS=meta?o.tem-o.dev:null; r.sem=o.pos==null?99:o.pos;
  r._esw=o; return o; }
/* coluna "Até hoje na semana" e cor da linha pela semana (pedido de 26/10 16:50) */
function eswTom(o){ return o.pos==null?null:o.pos<=-0.5?'crit':o.pos<0?'warn':'ok'; }
function eswCor(r,def){ const t=eswTom(eswCalc(r,eswSemanas())); return t||(def==='ok'?'neu':def); }
function eswTh(){ const F=S.anl.es||{}; return `<th class="nr srt esw-thd" data-act="anl-esort" data-k="sem" title="Meta da semana = previsão do mês ÷ 4. Deveria ter = meta × semanas já passadas do mês. Tem = estoque do dia 1º + feito no mês. A cor da linha vem daqui: verde em dia, amarelo atrasado menos de meia semana, vermelho meia semana ou mais.">Até hoje na semana${F.col==='sem'?(F.dir>0?' ↑':' ↓'):''}</th>`; }
function eswCel(r){ const o=eswCalc(r,eswSemanas()); if(o.pos==null) return '<td class="nr esw-sc"><span class="t-mut">sem previsão</span></td>';
  const t=eswTom(o), d=Math.round(o.difS), sg=o.pos>=0?'+':'−';
  return `<td class="nr num esw-sc"><small>deveria ter <b>${anlN(Math.round(o.dev))}</b></small><small>tem <b>${anlN(Math.round(o.tem))}</b> · meta/sem ${anlN(Math.round(o.meta))}</small><span class="anl-bdg ${t}" title="${d>=0?'Sobram':'Faltam'} ${anlN(Math.abs(d))} sacos para estar em dia">${sg}${eswF1(Math.abs(o.pos))} sem. · ${d>=0?'+':'−'}${anlN(Math.abs(d))}</span></td>`; }
/* filtro novo (o js/03 chama para cada item antes das visões antigas) */
function eswOk(r){ const E=S.esw, W=eswSemanas(), o=eswCalc(r,W);
  if(E.fam&&o.fam!==E.fam) return false; if(E.emb&&o.emb!==E.emb) return false;
  if(E.tipo==='est'&&r.enc) return false; if(E.tipo==='enc'&&!r.enc) return false;
  if(E._semSit) return true;
  if(E.sit==='acao'&&!(o.g==='hoje'||o.g==='semana')) return false; if(['hoje','semana','calma'].includes(E.sit)&&o.g!==E.sit) return false; return true; }
function eswXs(xs,all){ S.esw.xs=xs; S.esw.all=all; }
/* o mesmo recorte sem a situação (para a frase, os números e a curva: descrevem a linha, não só o que pede ação) */
function eswEscopo(all){ const F=S.anl.es||{}, q=anlNorm(F.q); S.esw._semSit=true;
  try{ return all.filter(r=>!r.int&&r.sit2!=='SEMGIRO'&&(!q||anlNorm(r.c+' '+r.d).includes(q))&&!(F.linha==='__sem'&&r.lp.length)&&!(F.linha&&F.linha!=='__sem'&&!r.lp.includes(F.linha))&&eswOk(r)); }
  finally{ S.esw._semSit=false; } }
/* ---------- carteira de ontem (foto da base: pcpsnap) ---------- */
function eswSnap(){ if(S.esw.snap!==undefined||!S.db||S.esw._lendo) return S.esw.snap||null; S.esw._lendo=true;
  S.db.collection('pcpsnap').orderBy('data','desc').limit(3).get().then(q=>{ const h=hojeStr(); const ds=q.docs.map(d=>d.data()).filter(x=>x&&x.dc&&String(x.data)<h); S.esw.snap=ds[0]||null; S.esw._lendo=false; rerenderSeguro(); })
    .catch(e=>{ console.warn('[estoques] foto de ontem',e); S.esw.snap=null; S.esw._lendo=false; });
  return null; }
function eswVendeu(esc){ const W=eswSemanas(), sn=eswSnap(); return esc.filter(r=>eswCalc(r,W).acima).map(r=>{ const o=eswCalc(r,W); const ant=sn&&sn.dc?(+sn.dc[r.c]||0):null;
    return {r,o,novo:ant==null?null:Math.max(0,Math.round(r.dc-ant)),desde:sn?sn.data:null}; }).sort((a,b)=>b.o.faltaAt-a.o.faltaAt); }
/* sino: venda nova (desde a última base) que passou do estoque */
NAV_EXTRA.push(()=>{ try{ if(!viewOk('anlest')) return []; const xs=(S.esw.va||[]).filter(v=>v.novo>0); if(!xs.length) return [];
  return [{n:xs.length,t:'Vendeu mais que o previsto',s:xs.slice(0,3).map(v=>v.r.c).join(', ')+' · pedido maior que o estoque',acao:'anlest',c:'crit'}]; }catch(e){ return []; } });
/* ---------- Curva S em semanas ---------- */
function eswCurva(esc,W){ const rs=esc.filter(r=>r.pvm>0); const meta=rs.reduce((a,r)=>a+r.pvm,0)/4; if(!meta) return null;
  const tinha=rs.reduce((a,r)=>a+(r.pvT||0),0), feitoT=rs.reduce((a,r)=>a+(r.pvF||0),0), cods=new Set(rs.map(r=>r.c));
  const ult=new Date(+W.cp.slice(0,4),+W.cp.slice(5,7),0).getDate(), hd=+hojeStr().slice(8,10);
  const dia=Array.from({length:ult},()=>0);
  try{ (S.entregas||[]).forEach(e=>{ if(e.anula||!e.em) return; const d=hojeStr(new Date(e.em)); if(d.slice(0,7)!==W.cp) return; const o=ordById(e.ordem)||S.ordens.find(z=>String(z.num)===String(e.num||e.ordem)); const c=o&&codigoDe(o); if(c&&cods.has(c)) dia[+d.slice(8,10)-1]+=(+e.qtd||0); }); }catch(e){}
  const pain=dia.reduce((a,v)=>a+v,0), k=pain>0?feitoT/pain:0; let ac=0; const real=[], prev=[];
  for(let i=1;i<=ult;i++){ const d=W.cp+'-'+String(i).padStart(2,'0'); prev.push(4*anlUteisEntre(W.ini,addDias(d,1))/W.dt);
    if(i<=hd){ ac+=pain>0?dia[i-1]*k:feitoT/hd; real.push((tinha+ac)/meta); } }
  return {meta,tem:(tinha+feitoT)/meta,dev:W.s,prev,real,ult,hd}; }
function eswCurvaSvg(C){ const w=600,h=210,x0=60,x1=590,y0=170,yt=18, top=Math.max(4,Math.ceil(Math.max(...C.real,4))); const X=i=>x0+(x1-x0)*(i)/(C.ult-1), Y=v=>y0-(y0-yt)*Math.min(v,top)/top;
  let g=''; for(let s=1;s<=top;s++){ g+=`<line x1="${x0}" y1="${Y(s)}" x2="${x1}" y2="${Y(s)}" stroke="var(--line)"/><text x="${x0-8}" y="${Y(s)+4}" text-anchor="end">${s} sem.</text>`; }
  const pp=C.prev.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(''), pr=C.real.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const xh=X(C.hd-1), yh=Y(C.real[C.real.length-1]||0);
  return `<svg class="esw-cs" viewBox="0 0 ${w} ${h}" role="img" aria-label="Curva S em semanas: previsto e realizado no mês"><g class="esw-ax">${g}<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="var(--line)"/>
    <text x="${x0}" y="${y0+20}">dia 1</text><text x="${X(9)}" y="${y0+20}" text-anchor="middle">10</text><text x="${X(19)}" y="${y0+20}" text-anchor="middle">20</text><text x="${x1}" y="${y0+20}" text-anchor="end">${C.ult}</text></g>
    <path d="${pp}" fill="none" stroke="var(--faint)" stroke-width="2" stroke-dasharray="6 5"/><path d="${pr}" fill="none" stroke="var(--teal)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="${xh}" y1="${yt-4}" x2="${xh}" y2="${y0}" stroke="var(--teal-strong)" stroke-dasharray="3 3"/><circle cx="${xh}" cy="${yh}" r="5" fill="var(--teal)"/><text x="${xh+6}" y="${yt-6}" class="esw-hj">hoje</text></svg>`; }
/* ---------- a tela ---------- */
function eswEscopoNome(){ const F=S.anl.es||{}; return F.linha&&F.linha!=='__sem'?F.linha:F.linha==='__sem'?'Sem linha':'A fábrica'; }
function eswCap(){ const F=S.anl.es||{}; if(F.linha&&F.linha!=='__sem') return capDe(F.linha)||0; return linhasOrd().reduce((a,l)=>a+(capDe(l)||0),0); }
function eswTopo(W,Rz,va){ const at=((S.anl.base.itens||{}).atual)||{}, sa=at.SALDO?String(at.SALDO):''; const m=ESW_MES[+W.cp.slice(5,7)-1]; const nm=eswEscopoNome();
  const pos=Rz&&Rz.metaT?` · ${esc(nm)} ${Rz.pos<0?'<b class="t-crit">'+eswSemTxt(Rz.pos)+' atrasad'+(nm==='A fábrica'?'a':'a')+'</b>':'<b class="t-ok">'+eswSemTxt(Rz.pos)+' adiantad'+(nm==='A fábrica'?'a':'a')+'</b>'}`:'';
  const nv=(va||[]).length;
  return `<div class="head esw-hd"><div><div class="eyebrow">ANÁLISE PCP · ${m.toUpperCase()}, ${W.n}ª SEMANA</div><h1>O que precisa produzir</h1><div class="sub">Atualizado ${sa?dm(sa.slice(0,10))+(sa.length>10?' às '+sa.slice(11,16):''):'—'}${pos}</div></div>
    <button class="btn sec esw-rb" data-act="esw-res" aria-expanded="${!!S.esw.res}">${ic('grafico',16,2)}Resumo, Curva S, PDF e Excel${nv?`<span class="esw-rbn" title="Venderam mais que o previsto">${nv}</span>`:''}</button></div>`; }
function eswFiltros(all,n,tot){ const E=S.esw, F=S.anl.es||{}; const famO=['AC1','AC2','AC3','PIC'].concat(all.some(r=>eswFam(r.d)==='Outros')?['Outros']:[]), embO=['Papel','Plástica'].concat(all.some(r=>eswEmb(r.d)==='Outra')?['Outra']:[]);
  const sel=(k,rot,ops,def)=>`<label class="esw-sl ${E[k]!==def?'on':''}"><span>${rot}</span><select data-esw="${k}">${ops.map(([v,l])=>`<option value="${esc(v)}" ${E[k]===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  const L=[['','Todas as linhas']].concat(linhasOrd().map(l=>[l,l]));
  const muda=E.sit!=='acao'||E.fam||E.emb||E.tipo||F.linha||F.q||(F.vis&&F.vis!=='principal')||F.cob||F.dp;
  return `<section class="card esw-fil"><div class="seg esw-ln" role="group" aria-label="Linha">${L.map(([v,l])=>`<button data-act="esw-ln" data-v="${esc(v)}" aria-pressed="${(F.linha||'')===v}">${esc(l)}</button>`).join('')}</div>
    <label class="srch esw-q">${ic('lupa',16,2)}<input class="txt" id="anl-esq" value="${esc(F.q||'')}" placeholder="Procurar código ou produto" autocomplete="off" aria-label="Procurar código ou produto"></label>
    ${sel('sit','Situação',ESW_SIT,'acao')}${sel('fam','Família',[['','Todas']].concat(famO.map(x=>[x,x])),'')}${sel('emb','Embalagem',[['','Todas']].concat(embO.map(x=>[x,x])),'')}${sel('tipo','Tipo',[['','Todos'],['est','Estoque'],['enc','Sob encomenda']],'')}
    <button class="esw-mf ${E.mais?'on':''}" data-act="esw-mais" aria-expanded="${E.mais}">Mais filtros</button>
    <span class="esw-n num">${n} de ${tot} itens${muda?` · <button class="lnk" data-act="esw-limpar">Limpar</button>`:''}</span></section>`; }
function eswResumo(esc,W){ const xs=esc.map(r=>({r,o:eswCalc(r,W)})), cp=xs.filter(x=>x.o.meta>0);
  const metaT=cp.reduce((a,x)=>a+x.o.meta,0), temT=cp.reduce((a,x)=>a+x.o.tinha+x.o.feito,0), cob=metaT?temT/metaT:0, pos=metaT?cob-W.s:0;
  const atr=cp.filter(x=>x.o.pos<0), atr5=atr.filter(x=>x.o.pos<=-0.5), adi=cp.filter(x=>x.o.pos>0).sort((a,b)=>b.o.pos-a.o.pos);
  const hoje=xs.filter(x=>x.o.g==='hoje'&&!x.r.enc&&x.r.sit2!=='ENC_FALTA').length, vend=xs.filter(x=>x.o.acima).length;
  const falta=esc.filter(r=>!r.enc).reduce((a,r)=>a+(r.falta||0),0), cap=eswCap(), nm=eswEscopoNome(), fem=nm==='A fábrica';
  const est=pos<0?`está <b class="t-crit">${eswSemTxt(pos)} atrasad${fem?'a':'a'}</b>`:`está <b class="t-ok">${eswSemTxt(pos)} adiantad${fem?'a':'a'}</b>`;
  const frase=metaT?`${esc_(nm)} ${est}: já passaram ${eswF1(W.s)} semanas do mês e o que tinha mais o que foi feito cobre ${eswF1(cob)}. <b class="${hoje?'t-crit':''}">${hoje} ${hoje===1?'item acaba':'itens acabam'} hoje</b> e <b class="${vend?'t-crit':''}">${vend} ${vend===1?'vendeu':'venderam'} mais que a semana</b>.`
    :`Sem previsão do mês importada para estes itens: a conta em semanas aparece quando a previsão estiver na Base de dados. ${hoje} ${hoje===1?'item acaba':'itens acabam'} hoje.`;
  const k=(c,t,v,s)=>`<div class="esw-k ${c}"><span>${t}</span><b class="num">${v}</b><small>${s}</small></div>`;
  return {metaT,cob,pos,html:`<section class="card esw-res"><p class="esw-fr">${frase}</p><div class="esw-ks">
    ${k(pos<=-0.5?'crit':pos<0?'warn':'ok',esc_(nm==='A fábrica'?'Fábrica no mês':nm+' no mês'),metaT?(pos<0?'−':'+')+eswF1(Math.abs(pos))+' <small>sem.</small>':'—',metaT?'cobre '+eswF1(cob)+' de '+eswF1(W.s)+' semanas':'sem previsão')}
    ${k(atr.length?'warn':'ok','Itens atrasados',atr.length,atr5.length?atr5.length+' com mais de meia semana':'nenhum com mais de meia semana')}
    ${k('ok','Itens adiantados',adi.length,adi.length?adi.slice(0,3).map(x=>esc_(x.r.c)+' +'+eswF1(x.o.pos)).join(' · '):'nenhum')}
    ${k('teal','Falta programar',anlN(falta)+' <small>sacos</small>',cap?'≈ '+eswF1(falta/cap)+' dias de linha ('+anlN(cap)+' por dia)':'sem capacidade cadastrada')}</div></section>`}; }
const esc_=v=>esc(String(v));
function eswVendeuHtml(va){ if(!va.length) return `<section class="card esw-vd ok"><h2>Vendeu mais que o previsto</h2><p class="sub" style="margin:0">Nenhum item com pedido maior que o estoque nestes filtros.</p></section>`;
  const sn=S.esw.snap; return `<section class="card esw-vd"><h2>${ic('grafico',18,2)}Vendeu mais que o previsto</h2><span class="sub" style="margin:0">pedidos maiores do que o estoque e a folga do item aguentam</span>
   <div class="esw-vl">${va.slice(0,6).map(v=>{ const r=v.r,o=v.o; return `<div class="esw-vi"><div class="esw-vh"><span><b class="t-teal">${esc(r.c)}</b> · ${esc(String(r.d||'').replace(/^ARGAMASSA\s+/i,'').slice(0,42))}</span><button class="fpbtn" data-act="anl-sug" data-c="${esc(r.c)}">Programar</button></div>
     <span>Pedidos de <b class="t-crit">${anlN(r.dc)}</b>${o.pedS!=null?' = '+eswSemTxt(o.pedS)+' da previsão':''}. O estoque (${anlN(Math.max(0,r.tot))}) cobre ${o.cobre!=null?eswSemTxt(o.cobre):'—'}. Faltam <b>${anlN(o.faltaAt)}</b> para atender.${v.novo>0?` <span class="t-crit">Entrou +${anlN(v.novo)} de pedido desde ${dm(String(v.desde).slice(0,10))}.</span>`:''}</span></div>`; }).join('')}</div>
   ${va.length>6?`<span class="sub" style="margin:0">e mais ${va.length-6} ${va.length-6===1?'item':'itens'} na tabela (Pedidos em vermelho).</span>`:''}
   <span class="esw-vn">Todo dia o painel compara os pedidos com os da última base${sn?' ('+dm(String(sn.data).slice(0,10))+')':''}. Se entrou mais venda do que a folga do item, ele aparece aqui e no sino, mesmo que estivesse adiantado.</span></section>`; }
function eswCurvaHtml(C){ if(!C) return `<section class="card esw-cv"><h2>Curva S em semanas</h2><div class="empty">Sem previsão do mês para estes itens.</div></section>`;
  return `<section class="card esw-cv"><div class="esw-cvh"><h2>Curva S em semanas · ${esc(eswEscopoNome()==='A fábrica'?'todas as linhas':eswEscopoNome())}</h2><div class="esw-lg"><span><i class="tr"></i>Previsto</span><span><i class="ch"></i>Realizado</span></div></div>
   <div class="esw-cn"><div><span>Meta da semana</span><b class="num">${anlN(C.meta)} sc</b></div><div><span>Tem (estoque do dia 1º + feito)</span><b class="num">${eswF1(C.tem)} semanas</b></div><div><span>Deveria ter hoje</span><b class="num">${eswF1(C.dev)} semanas</b></div></div>
   ${eswCurvaSvg(C)}<span class="sub" style="margin:0;font-size:12px">Cada faixa é uma semana de meta (previsão do mês ÷ 4). Tracejado: semanas que já deveriam estar cobertas em cada dia útil. Linha cheia: estoque do dia 1º + feito acumulado ÷ meta da semana.</span></section>`; }
function eswGrpCont(xs,W){ const c={hoje:0,semana:0,calma:0}; xs.forEach(r=>c[eswCalc(r,W).g]++); const f=xs.filter(r=>!r.enc).reduce((a,r)=>a+(r.falta||0),0);
  return `<div class="esw-gc"><span class="esw-pl crit">${c.hoje} agir hoje</span><span class="esw-pl warn">${c.semana} esta semana</span><span class="esw-pl ok">${c.calma} sem pressa</span><span class="sub" style="margin:0">falta programar <b class="num">${anlN(f)}</b></span></div>`; }
{ const _ve=vAnlEst; vAnlEst=function(R){ S.esw.xs=null; const h=_ve.apply(this,arguments); try{ return eswMonta(R,h); }catch(e){ console.warn('[estoques] tela nova',e); return h; } }; }
function eswMonta(R,h){ const ia=h.indexOf('<!--esw:a-->'), ib=h.indexOf('<!--esw:b-->'), ic_=h.indexOf('<!--esw:c-->'), id=h.indexOf('<!--esw:d-->'); if(ia<0||ib<0||ic_<0||id<0) return h;
  const cap=h.slice(0,ia), fil=h.slice(ib+12,ic_), tab=h.slice(ic_+12,id), nota=h.slice(id+12), W=eswSemanas(), all=(S.esw.all||[]), xs=S.esw.xs||[];
  all.forEach(r=>{ delete r._esw; }); const esc=eswEscopo(all), va=eswVendeu(esc); S.esw.va=va;
  const tot=all.filter(r=>!r.int&&r.sit2!=='SEMGIRO').length, Rz=eswResumo(esc,W), C=eswCurva(esc,W);
  const mais=fil.replace(/<div class="anl-th">[\s\S]*?Limpar<\/button><\/div>/,'<div class="label" style="margin:0 0 6px">MAIS FILTROS · visões, cobertura, pedidos, ordem e colunas</div>').replace(/<label class="srch"[\s\S]*?<\/label>/,'').replace(/<select class="txt anl-sel" data-anl-es="linha">[\s\S]*?<\/select>/,'');
  const vazio=!xs.length?`<section class="card"><div class="empty">Nenhum item com esses filtros. <button class="lnk" data-act="esw-limpar">Limpar filtros</button></div></section>`:'';
  const tabela=xs.length?tab.replace('<div class="anl-tw">','<div class="anl-tw">'+eswGrpCont(xs,W)):'';
  const capH=cap.trim()?`<details class="card esw-capd" ${S.esw.capAb?'open':''}><summary>Capacidade dos almoxarifados e por item</summary>${cap}</details>`:'';
  const como=`<p class="sub esw-como">Como ler: <b>meta da semana</b> = previsão do mês ÷ 4. <b>No mês</b> = semanas que o estoque do dia 1º mais o que já foi feito cobrem, menos as semanas que já passaram (hoje ${eswF1(W.s)}). Exemplo: mês de 100, meta da semana 25; começou com 50 = 2 semanas adiantado.</p>`;
  const dr=S.esw.res?`<div class="esw-drf" data-act="esw-resx"></div><aside class="esw-dr" role="dialog" aria-label="Resumo da semana"><div class="esw-drh"><div><div class="eyebrow">ANÁLISE PCP</div><h2>Resumo da semana</h2></div><button class="btn sec" data-act="esw-resx" aria-label="Fechar">✕</button></div>
     <div class="esw-tb"><button class="btn sec" data-act="esw-pdf">${ic('baixar',16,2)}Baixar PDF</button><button class="btn sec" data-act="esw-xls">${ic('baixar',16,2)}Baixar Excel</button><span class="sub" style="margin:0;font-size:12.5px">com os filtros da tela</span></div>
     ${Rz.html}${eswVendeuHtml(va)}${eswCurvaHtml(C)}${como}</aside>`:'';
  return `<div class="esw">${eswTopo(W,Rz,va)}${eswFiltros(all,xs.length,tot)}${S.esw.mais?mais:''}${vazio}${tabela}${nota}${capH}</div>${dr}`; }
/* ---------- ações ---------- */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="esw-"]'); if(!b) return; const a=b.dataset.act, E=S.esw; if(!S.anl.es) return;
  if(a==='esw-ln'){ S.anl.es.linha=b.dataset.v||''; render(); return; }
  if(a==='esw-mais'){ E.mais=!E.mais; render(); return; }
  if(a==='esw-res'){ E.res=!E.res; render(); return; }
  if(a==='esw-resx'){ E.res=false; render(); return; }
  if(a==='esw-limpar'){ Object.assign(E,{sit:'acao',fam:'',emb:'',tipo:''}); const F=S.anl.es; Object.assign(F,{q:'',vis:'principal',linha:'',cob:'',dp:'',col:''}); render(); return; }
  if(a==='esw-pdf'){ eswPdf(); return; }
  if(a==='esw-xls'){ eswXls(); return; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.esw.res&&S.view==='anlest'){ S.esw.res=false; render(); } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset||!t.dataset.esw) return; S.esw[t.dataset.esw]=t.value; render(); });
document.addEventListener('toggle',ev=>{ const t=ev.target; if(t&&t.classList&&t.classList.contains('esw-capd')) S.esw.capAb=t.open; },true);
/* ---------- dados para o PDF e o Excel (o que está na tela) ---------- */
function eswLinhas(){ const W=eswSemanas(), xs=(S.esw.xs||[]).slice(); const PR={}; try{ const R=anlDados(); anlPrevRows(R).forEach(y=>{ if(y.cp===W.cp) PR[y.c]=y; }); }catch(e){}
  const ord={hoje:0,semana:1,calma:2}; xs.sort((a,b)=>ord[eswCalc(a,W).g]-ord[eswCalc(b,W).g]);
  return xs.map(r=>{ const o=eswCalc(r,W), [st]=ANL_SIT[r.sit2]||['—']; const sf=PR[r.c]?PR[r.c].sf:null;
    const acaba=r.rup!==null&&!r.enc&&r.dem?(r.rup<=1?'Hoje':dm(r.rupD)+' · em '+r.rup+' dias'):r.sit2==='ENC_FALTA'?'Pedido sem estoque':r.enc?'Sob encomenda':'—';
    return {r,o,c:r.c,d:r.d,lin:(r.lp||[]).join(', '),tot:Math.round(r.tot),seg:r.enc?null:r.seg,dc:Math.round(r.dc||0),md:Math.round(r.md||0),pvm:Math.round(r.pvm||0),feito:Math.round(r.pvF||0),tinha:r.pvT==null?null:Math.round(r.pvT),ofa:Math.round(r.ofa||0),falta:Math.round(r.falta||0),fat:sf==null?null:Math.round(sf),acaba,st,g:o.g,a3:r.a3,a30:r.a30,emp:r.emp}; }); }
const ESW_GT={hoje:'AGIR HOJE',semana:'ESTA SEMANA',calma:'SEM PRESSA'};
async function eswPdf(){ try{ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }catch(e){}
  const J=window.jspdf&&window.jspdf.jsPDF; if(!J){ toast('O gerador de PDF não carregou. Confira a internet e tente de novo.'); return; }
  const W=eswSemanas(), rows=eswLinhas(), all=S.esw.all||[], esc0=eswEscopo(all), Rz=eswResumo(esc0,W), C=eswCurva(esc0,W), img=await gpImgs(), Co=GPDF.cor;
  const doc=new J({unit:'mm',format:'a4',orientation:'landscape'}), PW=297, PH=210, M=12;
  { const _t=doc.text.bind(doc); doc.text=(t,...r)=>_t(typeof t==='string'?t.replace(/−/g,'-').replace(/≈/g,'aprox.'):t,...r); } /* a fonte do PDF não tem − nem ≈ */
  const fc=c=>doc.setFillColor(c[0],c[1],c[2]), tc=c=>doc.setTextColor(c[0],c[1],c[2]), dcl=c=>doc.setDrawColor(c[0],c[1],c[2]);
  const fit=(t,w)=>{ t=String(t==null?'':t); if(doc.getTextWidth(t)<=w) return t; while(t.length>1&&doc.getTextWidth(t+'…')>w) t=t.slice(0,-1); return t+'…'; };
  const nm=eswEscopoNome(), quem=(typeof nomeDe==='function'&&S.uid?nomeDe(S.uid):'')||'', mes=ESW_MES[+W.cp.slice(5,7)-1]+' de '+W.cp.slice(0,4);
  fc(Co.pet); doc.rect(0,0,PW,22,'F'); if(img&&img.escuro) doc.addImage(img.escuro.d,'PNG',M,6,32,32*img.escuro.h/img.escuro.w);
  doc.setFont('helvetica','bold'); doc.setFontSize(15); tc([255,255,255]); doc.text('Necessidades de produção · '+(nm==='A fábrica'?'todas as linhas':nm),M+40,11);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); tc([199,215,224]); doc.text(mes+', '+W.n+'ª semana · o que precisa produzir para não faltar e fechar o mês',M+40,16.5);
  doc.setFontSize(7.5); doc.text('Emitido em '+new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),PW-M,10,{align:'right'}); doc.text((quem?'por '+quem+' · ':'')+'Painel Colafix',PW-M,14.5,{align:'right'});
  /* 4 números */
  let y=28; const kw=(PW-2*M-95-12)/4; const W2=Rz;
  const vd=rows.filter(x=>x.o.acima).length, hj=rows.filter(x=>x.g==='hoje').length;
  const ks=[[W2.pos<0?Co.crit:Co.ok,(nm==='A fábrica'?'FÁBRICA':nm.toUpperCase())+' NO MÊS',W2.metaT?(W2.pos<0?'−':'+')+eswF1(Math.abs(W2.pos))+' sem.':'—',W2.metaT?'cobre '+eswF1(W2.cob)+' de '+eswF1(W.s)+' semanas':'sem previsão'],
    [Co.crit,'AGIR HOJE',String(hj),'acabam hoje ou pedido sem estoque'],[Co.crit,'VENDEU MAIS QUE A SEMANA',String(vd),'pedido maior que o estoque'],
    [Co.teal,'FALTA PROGRAMAR',anlN(rows.filter(x=>!x.r.enc).reduce((a,x)=>a+x.falta,0)),'sacos'+(eswCap()?' · ≈ '+eswF1(rows.filter(x=>!x.r.enc).reduce((a,x)=>a+x.falta,0)/eswCap())+' dias de linha':'')]];
  ks.forEach((k,i)=>{ const x=M+i*(kw+3); dcl(Co.lin); doc.setLineWidth(.25); doc.roundedRect(x,y,kw,20,1.5,1.5,'S'); fc(k[0]); doc.rect(x,y,kw,1.2,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); tc(k[0]); doc.text(fit(k[1],kw-6),x+3,y+5.5); doc.setFontSize(15); tc(Co.ink); doc.text(k[2],x+3,y+12.5); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); tc(Co.mut); doc.text(fit(k[3],kw-6),x+3,y+17); });
  /* Curva S pequena */
  const cx=PW-M-95, cw=95; dcl(Co.lin); doc.roundedRect(cx,y,cw,20,1.5,1.5,'S'); doc.setFont('helvetica','bold'); doc.setFontSize(6.5); tc(Co.mut); doc.text('CURVA S EM SEMANAS',cx+3,y+5);
  if(C){ doc.setFont('helvetica','normal'); doc.setFontSize(7); tc(Co.ink); doc.text('Meta sem. '+anlN(C.meta),cx+3,y+10); doc.text('Tem '+eswF1(C.tem)+' · deveria '+eswF1(C.dev),cx+3,y+14.5);
    const gx=cx+38, gw=cw-41, gy=y+3, gh=15, top=Math.max(4,Math.ceil(Math.max(...C.real,4))); const X=i=>gx+gw*i/(C.ult-1), Y=v=>gy+gh-gh*Math.min(v,top)/top;
    dcl(Co.cinza); doc.setLineWidth(.4); doc.setLineDashPattern([1,1],0); for(let i=1;i<C.prev.length;i++) doc.line(X(i-1),Y(C.prev[i-1]),X(i),Y(C.prev[i])); doc.setLineDashPattern([],0);
    dcl(Co.teal); doc.setLineWidth(.8); for(let i=1;i<C.real.length;i++) doc.line(X(i-1),Y(C.real[i-1]),X(i),Y(C.real[i])); }
  /* tabela */
  y=54; const cols=[['CÓDIGO',17,'l'],['PRODUTO',0,'l'],['ESTOQUE',17,'r'],['EST. SEG.',15,'r'],['PEDIDOS',16,'r'],['META SEM.',15,'r'],['DEVERIA/TEM',24,'r'],['PREVISÃO',16,'r'],['FEITO',16,'r'],['NO MÊS (SEM.)',19,'r'],['FALTA PROG.',18,'r'],['FALTA FAT.',17,'r'],['QUANDO ACABA',30,'l']];
  const fixo=cols.reduce((a,c)=>a+c[1],0); cols[1][1]=PW-2*M-fixo; const cx0=[]; let ax=M; cols.forEach(c=>{ cx0.push(ax); ax+=c[1]; });
  const cab=()=>{ fc(Co.pet); doc.rect(M,y,PW-2*M,6,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(6.3); tc([255,255,255]); cols.forEach((c,i)=>doc.text(c[0],c[2]==='r'?cx0[i]+c[1]-1.5:cx0[i]+1.5,y+4,{align:c[2]==='r'?'right':'left'})); y+=6; };
  const pag=()=>{ doc.addPage(); if(img&&img.claro) doc.addImage(img.claro.d,'PNG',M,6,22,22*img.claro.h/img.claro.w); doc.setFont('helvetica','bold'); doc.setFontSize(8.5); tc(Co.ink); doc.text('Necessidades de produção · '+mes,PW-M,10,{align:'right'}); y=18; cab(); };
  cab(); const n=v=>v==null?'—':anlN(v); let g0=null, zi=0;
  const tone={hoje:Co.crit,semana:Co.warn,calma:Co.ok};
  rows.forEach(x=>{ if(y>PH-20) pag();
    if(x.g!==g0){ g0=x.g; zi=0; fc(Co.soft); doc.rect(M,y,PW-2*M,5,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(6.5); tc(tone[x.g]); doc.text(ESW_GT[x.g],M+1.5,y+3.5); y+=5; }
    if(zi++%2){ fc(Co.zeb); doc.rect(M,y,PW-2*M,5.4,'F'); }
    const o=x.o, cel=[x.c,(x.d||'')+(nm==='A fábrica'&&x.lin?' · '+x.lin:''),n(x.tot),n(x.seg),x.dc?n(x.dc):'—',o.meta?n(o.meta):'—',o.dev==null?'—':n(Math.round(o.dev))+' / '+n(Math.round(o.tem)),x.pvm?n(x.pvm):'—',n(x.feito),o.pos==null?'—':(o.pos>=0?'+':'−')+eswF1(Math.abs(o.pos)),x.falta?n(x.falta):'—',x.fat==null?'—':n(x.fat),x.acaba];
    doc.setFontSize(7); cols.forEach((c,i)=>{ let t=cel[i]; doc.setFont('helvetica',i===0||i===10||i===9||i===6?'bold':'normal'); tc(i===0?Co.teal:i===4&&o.acima?Co.crit:(i===9||i===6)&&o.pos!=null?(o.pos<=-0.5?Co.crit:o.pos<0?Co.warn:Co.ok):Co.ink);
      t=fit(t,c[1]-3); doc.text(t,c[2]==='r'?cx0[i]+c[1]-1.5:cx0[i]+1.5,y+3.7,{align:c[2]==='r'?'right':'left'}); });
    if(o.pos!=null){ fc(o.pos<=-0.5?Co.crit:o.pos<0?Co.warn:Co.ok); doc.rect(M,y,0.9,5.4,'F'); }
    dcl(Co.lin); doc.setLineWidth(.15); doc.line(M,y+5.4,PW-M,y+5.4); y+=5.4; });
  if(y>PH-20) pag(); fc([226,236,241]); doc.rect(M,y,PW-2*M,6,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); tc(Co.ink);
  doc.text('Total · '+rows.length+' itens',cx0[1]+1.5,y+4); doc.text(anlN(rows.filter(x=>!x.r.enc).reduce((a,x)=>a+x.falta,0)),cx0[10]+cols[10][1]-1.5,y+4,{align:'right'}); doc.text(anlN(rows.reduce((a,x)=>a+(x.fat||0),0)),cx0[11]+cols[11][1]-1.5,y+4,{align:'right'});
  const np=doc.getNumberOfPages?doc.getNumberOfPages():1;
  for(let p=1;p<=np;p++){ if(doc.setPage) doc.setPage(p); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); tc(Co.mut);
    doc.text('Meta sem. = previsão do mês ÷ 4. Deveria/Tem = meta × semanas já passadas / estoque do dia 1º + feito (cor da linha). No mês = semanas cobertas (estoque do dia 1º + feito) menos as que já passaram. Falta fat. = previsão − faturado no mês (Focco). Quando acaba = dia em que o estoque zera com os pedidos.',M,PH-6);
    doc.text('Página '+p+' de '+np,PW-M,PH-6,{align:'right'}); }
  const nomeArq='Necessidades-'+(nm==='A fábrica'?'todas':nm.replace(/\s+/g,''))+'-'+W.cp+'.pdf'; doc.save(nomeArq); S.esw._ult={tipo:'pdf',nome:nomeArq,n:rows.length}; toast('PDF baixado: '+nomeArq); }
/* ---------- Excel com cores (ExcelJS); sem ele, planilha simples ---------- */
async function eswXls(){ const W=eswSemanas(), rows=eswLinhas(), nm=eswEscopoNome(), all=S.esw.all||[], esc0=eswEscopo(all), Rz=eswResumo(esc0,W), C=eswCurva(esc0,W), mes=ESW_MES[+W.cp.slice(5,7)-1]+' de '+W.cp.slice(0,4);
  const nomeArq='Necessidades-'+(nm==='A fábrica'?'todas':nm.replace(/\s+/g,''))+'-'+W.cp+'.xlsx';
  const head=['Código','Produto','Linha','Estoque','Est. seg.','Pedidos','Sai por dia','Meta da semana','Deveria ter até hoje','Tem (dia 1º + feito)','Falta / sobra até hoje','No mês (semanas)','Cobre (semanas)','Previsão','Feito no mês','Tinha no dia 1º','Em ordem','Falta programar','Falta faturar','Quando acaba','Situação'];
  const val=x=>[x.c,x.d,x.lin,x.tot,x.seg==null?null:x.seg,x.dc||null,x.md||null,x.o.meta?Math.round(x.o.meta):null,x.o.dev==null?null:Math.round(x.o.dev),x.o.meta?Math.round(x.o.tem):null,x.o.difS==null?null:Math.round(x.o.difS),x.o.pos==null?null:Math.round(x.o.pos*10)/10,x.o.cobre==null?null:Math.round(x.o.cobre*10)/10,x.pvm||null,x.feito,x.tinha,x.ofa||null,x.falta||null,x.fat,x.acaba,x.st];
  const baixa=(blob)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nomeArq; document.body.appendChild(a); a.click(); a.remove(); S.esw._ult={tipo:'xls',nome:nomeArq,n:rows.length}; toast('Excel baixado: '+nomeArq); };
  try{ await carregarScript(ESW_EXCELJS); }catch(e){}
  const XJ=window.ExcelJS;
  if(!XJ){ try{ await carregarScript(ANL_XLSX); }catch(e){} if(!window.XLSX){ toast('Não foi possível carregar o gerador de Excel.'); return; }
    const XL=window.XLSX, wb=XL.utils.book_new(); XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet([['Necessidades de produção · '+mes],[],head].concat(rows.map(val))),'Necessidades');
    baixa(new Blob([XL.write(wb,{type:'array',bookType:'xlsx'})])); return; }
  const wb=new XJ.Workbook(); wb.creator='Painel Colafix'; const PET='FF143F54', TINT='FFE2ECF1', SOFT='FFF4F6F8';
  const T={hoje:['FFF6E8E6','FF9C3B34'],semana:['FFF6EEDC','FF6E5220'],calma:['FFE3F0E9','FF2F6E4F']};
  const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}), borda={bottom:{style:'thin',color:{argb:'FFE3E3E3'}}};
  /* Resumo */
  const r0=wb.addWorksheet('Resumo',{views:[{showGridLines:false}]}); r0.columns=[{width:34},{width:22},{width:44}];
  r0.mergeCells('A1:C1'); Object.assign(r0.getCell('A1'),{value:'NECESSIDADES DE PRODUÇÃO · '+(nm==='A fábrica'?'TODAS AS LINHAS':nm.toUpperCase())+' · '+mes.toUpperCase()}); r0.getCell('A1').font={bold:true,size:14,color:{argb:'FFFFFFFF'}}; r0.getCell('A1').fill=fill(PET); r0.getRow(1).height=28;
  r0.getCell('A2').value='Emitido em '+new Date().toLocaleString('pt-BR')+' · Painel Colafix'; r0.getCell('A2').font={italic:true,color:{argb:'FF5E6E77'}};
  const rk=[['Semanas já passadas do mês',Math.round(W.s*10)/10,'4 × dias úteis até hoje ÷ dias úteis do mês'],['Meta da semana (sacos)',Math.round(Rz.metaT),'previsão do mês ÷ 4'],['Cobre (semanas)',Math.round(Rz.cob*10)/10,'estoque do dia 1º + feito ÷ meta da semana'],['No mês (semanas)',Math.round(Rz.pos*10)/10,Rz.pos<0?'atrasado':'adiantado'],['Itens na lista',rows.length,'com os filtros da tela'],['Vendeu mais que a semana',rows.filter(x=>x.o.acima).length,'pedido maior que o estoque'],['Falta programar (sacos)',rows.filter(x=>!x.r.enc).reduce((a,x)=>a+x.falta,0),'']];
  rk.forEach((k,i)=>{ const rw=r0.getRow(4+i); rw.values=k; rw.getCell(1).font={bold:true,color:{argb:'FF143F54'}}; rw.getCell(2).font={bold:true,size:12}; rw.getCell(2).numFmt=Number.isInteger(k[1])?'#,##0':'0.0'; rw.getCell(3).font={color:{argb:'FF5E6E77'}}; rw.eachCell(c=>c.border=borda); });
  /* Necessidades */
  const ws=wb.addWorksheet('Necessidades',{views:[{state:'frozen',xSplit:2,ySplit:4,showGridLines:false}]});
  ws.columns=[11,44,14,11,10,11,10,12,13,13,13,12,11,11,12,12,10,13,12,22,18].map(w=>({width:w}));
  ws.mergeCells(1,1,1,head.length); const t1=ws.getCell(1,1); t1.value='NECESSIDADES DE PRODUÇÃO · '+(nm==='A fábrica'?'TODAS AS LINHAS':nm.toUpperCase())+' · '+mes.toUpperCase(); t1.font={bold:true,size:14,color:{argb:'FFFFFFFF'}}; t1.fill=fill(PET); t1.alignment={vertical:'middle'}; ws.getRow(1).height=28;
  ws.mergeCells(2,1,2,head.length); ws.getCell(2,1).value='Emitido em '+new Date().toLocaleString('pt-BR')+' · meta da semana '+anlN(Rz.metaT)+' · '+(Rz.metaT?(Rz.pos<0?'−':'+')+eswF1(Math.abs(Rz.pos))+' semana no mês':'sem previsão')+' · falta programar '+anlN(rows.filter(x=>!x.r.enc).reduce((a,x)=>a+x.falta,0))+' sacos'; ws.getCell(2,1).font={color:{argb:'FF44545D'}};
  const hr=ws.getRow(4); hr.values=head; hr.height=30; hr.eachCell((c,i)=>{ c.font={bold:true,size:10,color:{argb:PET}}; c.fill=fill(TINT); c.alignment={vertical:'middle',wrapText:true,horizontal:i>3&&i<20?'right':'left'}; c.border={bottom:{style:'medium',color:{argb:PET}}}; });
  ws.autoFilter={from:{row:4,column:1},to:{row:4,column:head.length}};
  let ri=5, g0=null; const first=ri;
  rows.forEach(x=>{ if(x.g!==g0){ g0=x.g; const gr=ws.getRow(ri++); gr.getCell(1).value=ESW_GT[x.g]; for(let i=1;i<=head.length;i++){ const c=gr.getCell(i); c.fill=fill(SOFT); c.font={bold:true,color:{argb:T[x.g][1]}}; } }
    const rw=ws.getRow(ri++); rw.values=val(x); rw.eachCell({includeEmpty:true},(c,i)=>{ c.border=borda; if(i>=4&&i<=19) c.numFmt=(i===12||i===13)?'+0.0;-0.0;0.0':i===11?'+#,##0;-#,##0;0':'#,##0'; });
    rw.getCell(1).font={bold:true,color:{argb:'FF2B6A87'}}; rw.getCell(18).font={bold:true,color:{argb:PET}};
    if(x.o.acima) rw.getCell(6).font={bold:true,color:{argb:'FFB5473F'}};
    if(x.o.pos!=null){ const k=x.o.pos<=-0.5?'hoje':x.o.pos<0?'semana':'calma'; [11,12].forEach(i=>rw.getCell(i).font={bold:true,color:{argb:T[k][1]}}); rw.getCell(1).border=Object.assign({},borda,{left:{style:'thick',color:{argb:T[k][1]}}}); }
    [20,21].forEach(i=>{ rw.getCell(i).fill=fill(T[x.g][0]); rw.getCell(i).font={bold:true,color:{argb:T[x.g][1]}}; }); });
  const last=ri-1, tr=ws.getRow(ri); tr.getCell(2).value='TOTAL · '+rows.length+' itens'; tr.getCell(18).value={formula:'SUM(R'+first+':R'+last+')'}; tr.getCell(19).value={formula:'SUM(S'+first+':S'+last+')'};
  for(let i=1;i<=head.length;i++){ const c=tr.getCell(i); c.fill=fill(PET); c.font={bold:true,color:{argb:'FFFFFFFF'}}; if(i>=18&&i<=19) c.numFmt='#,##0'; } tr.height=22;
  ws.getRow(ri+2).getCell(1).value='Meta da semana = previsão do mês ÷ 4 · Deveria ter até hoje = meta × semanas já passadas · Tem = estoque do dia 1º + feito · No mês = semanas cobertas (estoque do dia 1º + feito) − semanas já passadas · Falta faturar = previsão − faturado no mês (Focco).'; ws.getRow(ri+2).getCell(1).font={italic:true,color:{argb:'FF5E6E77'}};
  /* Por almoxarifado */
  const wa=wb.addWorksheet('Por almoxarifado',{views:[{state:'frozen',ySplit:1}]}); wa.columns=[{header:'Código',width:11},{header:'Produto',width:44},{header:'Almox 3',width:11},{header:'Almox 30',width:11},{header:'Empresa 1',width:11},{header:'Empresa 9',width:11},{header:'Total',width:11}];
  wa.getRow(1).eachCell(c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill=fill(PET); });
  rows.forEach(x=>{ const e=x.emp||{}, ev=k=>e[k]?(+e[k].a3||0)+(+e[k].a30||0):null; const rw=wa.addRow([x.c,x.d,Math.round(x.a3||0),Math.round(x.a30||0),ev('1'),ev('9'),x.tot]); rw.eachCell((c,i)=>{ if(i>2) c.numFmt='#,##0'; c.border=borda; }); });
  /* Curva S */
  const wc=wb.addWorksheet('Curva S'); wc.columns=[{header:'Dia',width:8},{header:'Previsto (semanas)',width:20},{header:'Realizado (semanas)',width:20}];
  wc.getRow(1).eachCell(c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill=fill(PET); });
  if(C) C.prev.forEach((p,i)=>{ const rw=wc.addRow([i+1,Math.round(p*100)/100,C.real[i]!=null?Math.round(C.real[i]*100)/100:null]); rw.getCell(2).numFmt='0.00'; rw.getCell(3).numFmt='0.00'; });
  const buf=await wb.xlsx.writeBuffer(); baixa(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); }
window.Painel=window.Painel||{}; window.Painel.estoquesSemana={semanas:eswSemanas,linhas:eswLinhas,estado:()=>S.esw};
document.head.insertAdjacentHTML('beforeend',`<style id="esw-css">
.anl-t td.pr .anl-lnt{display:block;font-size:11.5px;font-weight:600;color:var(--teal-strong);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.esw-sc small{display:block;white-space:nowrap}.esw-sc .anl-bdg{margin-top:3px;white-space:nowrap}.esw-thd{min-width:132px}
.esw{display:flex;flex-direction:column;gap:14px}
.esw-hd{margin-bottom:0}.esw-rb{position:relative;display:inline-flex;align-items:center;gap:8px}.esw-rbn{min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:var(--crit);color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.esw-drf{position:fixed;inset:0;background:rgba(20,40,50,.28);z-index:60}
.esw-dr{position:fixed;top:0;right:0;bottom:0;width:min(620px,100%);background:var(--ground);z-index:61;overflow-y:auto;padding:18px 18px 28px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;box-shadow:-8px 0 30px rgba(20,40,50,.18)}
.esw-drh{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.esw-drh h2{margin:0;font-size:21px;color:var(--teal-strong)}
.esw-dr .esw-ks{grid-template-columns:repeat(2,minmax(0,1fr))}.esw-dr .esw-tb{align-items:center}
.esw-top{display:flex;align-items:center;gap:20px;flex-wrap:wrap;background:#143F54;color:#fff;border-radius:14px;padding:18px 22px}
.esw-top img{height:34px;width:auto}.esw-tt{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:3px}.esw-tt h1{margin:0;font-size:24px;font-weight:600;color:#fff}.esw-tt span{font-size:13.5px;color:#C7D7E0}
.esw-tb{display:flex;gap:8px;flex-wrap:wrap}.esw-bo{height:42px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(255,255,255,.75);background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:8px;cursor:pointer}.esw-bo:hover{background:rgba(255,255,255,.12)}
.esw-fil{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding:14px 16px}
.esw-ln button{height:38px}.esw-q{flex:1 1 220px;max-width:320px;margin:0}
.esw-sl{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted);font-weight:600}.esw-sl select{height:38px;border:1.5px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font:inherit;font-size:14px;padding:0 8px;min-width:130px}
.esw-sl.on select{border-color:var(--teal);box-shadow:0 0 0 1px var(--teal) inset}
.esw-mf{height:38px;padding:0 12px;border-radius:9px;border:1.5px solid var(--line);background:var(--surface);color:var(--teal-strong);font:inherit;font-size:14px;font-weight:600;cursor:pointer}.esw-mf.on{border-color:var(--teal);background:var(--teal-wash)}
.esw-n{margin-left:auto;font-size:13.5px;color:var(--muted);align-self:center}
.esw-res{display:flex;flex-direction:column;gap:14px;padding:18px 20px}.esw-fr{margin:0;font-size:17px;line-height:1.45;color:var(--ink)}
.esw-ks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}@media (max-width:980px){.esw-ks{grid-template-columns:repeat(2,minmax(0,1fr))}}
.esw-k{background:var(--surface);border:1px solid var(--line);border-top:4px solid var(--teal);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}
.esw-k.crit{border-top-color:var(--crit)}.esw-k.warn{border-top-color:var(--warn)}.esw-k.ok{border-top-color:var(--ok)}
.esw-k span{font-size:13px;font-weight:600;color:var(--muted)}.esw-k b{font-size:28px;font-weight:700;color:var(--teal-strong);line-height:1.15}.esw-k b small{font-size:14px;font-weight:500}.esw-k small{font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}
.esw-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:16px}
.esw-cv,.esw-vd{display:flex;flex-direction:column;gap:10px;padding:18px 20px}.esw-cv h2,.esw-vd h2{margin:0;font-size:16px;font-weight:600;color:var(--teal-strong);display:flex;align-items:center;gap:8px}
.esw-cvh{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}.esw-lg{display:flex;gap:14px;font-size:12.5px;color:var(--ink-2)}.esw-lg span{display:flex;align-items:center;gap:6px}
.esw-lg i.tr{width:18px;border-top:2px dashed var(--faint)}.esw-lg i.ch{width:18px;height:3px;border-radius:2px;background:var(--teal)}
.esw-cn{display:flex;gap:22px;flex-wrap:wrap}.esw-cn div{display:flex;flex-direction:column}.esw-cn span{font-size:12.5px;color:var(--muted)}.esw-cn b{font-size:19px;color:var(--teal-strong)}
.esw-cs{width:100%;height:auto;display:block}.esw-ax text,.esw-hj{font-size:11px;fill:var(--muted);font-family:inherit}.esw-hj{fill:var(--teal-strong)}
.esw-vd{background:#FFF8F7;border:1px solid #EBC9C4}.esw-vd h2{color:#8E332C}.esw-vd.ok{background:var(--surface);border-color:var(--line)}.esw-vd.ok h2{color:var(--teal-strong)}
.esw-vl{display:flex;flex-direction:column;gap:8px}.esw-vi{background:var(--surface);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;font-size:13.5px;color:var(--ink-2)}
.esw-vh{display:flex;justify-content:space-between;gap:10px;align-items:center}.esw-vh>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.esw-vn{font-size:12.5px;color:#6B3A35}
.esw-gc{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px 8px}.esw-pl{padding:4px 10px;border-radius:99px;font-size:13px;font-weight:600}
.esw-pl.crit{background:var(--crit-tint);color:var(--crit-ink)}.esw-pl.warn{background:var(--warn-tint);color:var(--warn-ink)}.esw-pl.ok{background:var(--ok-tint);color:var(--ok-ink)}
.esw-como{font-size:12.5px;margin:0;line-height:1.5}
.esw-capd{padding:14px 18px}.esw-capd>summary{cursor:pointer;font-weight:600;color:var(--teal-strong);font-size:15px}.esw-capd[open]>summary{margin-bottom:12px}
:root[data-theme="dark"] .esw-vd:not(.ok){background:#3A2523;border-color:#6B3A35}:root[data-theme="dark"] .esw-vd h2{color:#F0B4AE}:root[data-theme="dark"] .esw-vn{color:#E0B8B3}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]) .esw-vd:not(.ok){background:#3A2523;border-color:#6B3A35} }
</style>`);
