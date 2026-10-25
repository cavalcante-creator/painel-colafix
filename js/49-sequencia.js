/* Painel Colafix · 49-sequencia.js (24/10) — pedido 2: sugerir a sequência do dia juntando produtos parecidos (menos limpeza/troca).
   Calendário → "Sugerir sequência": para cada linha e dia da semana na tela com 2+ itens abertos, junta os itens da mesma família
   (2 primeiras palavras do nome do produto, sem o peso: "ARGAMASSA AC3", "REJUNTE FLEXÍVEL"…), mantendo a ordem em que cada família
   aparece hoje. Mostra antes → depois e quantas trocas de produto; "Aplicar" grava a sequência (mesmo caminho do arrastar: reordenarCal). */
"use strict";
S.sqs=null;
function sqFam(x){ const n=String(nomeCurto(x)||x.produto||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\b\d+([.,]\d+)?\s*(KG|K|G|L|LT|ML)\b/g,' ').replace(/[^A-Z0-9 ]+/g,' ').trim().split(/\s+/).filter(Boolean);
  return n.slice(0,2).join(' ')||String(codigoDe(x)||'').replace(/\d{3,}$/,''); }
function sqTrocas(xs){ let t=0; for(let i=1;i<xs.length;i++) if(sqFam(xs[i])!==sqFam(xs[i-1])) t++; return t; }
function sqSugere(xs){ const ord=[], g={}; xs.forEach(x=>{ const f=sqFam(x); if(!g[f]){ g[f]=[]; ord.push(f); } g[f].push(x); }); return ord.flatMap(f=>g[f]); }
function sqDias(){ const C=S.cal, ini=C.ini||segundaStr(new Date()), nd=C.sab?6:5, h=hojeStr(), LT=linhasOrd(), L=C.linha==='todas'||!C.linha?LT:LT.filter(l=>l===C.linha), r=[];
  for(let i=0;i<nd;i++){ const d=addDias(ini,i); if(d<h) continue; L.forEach(l=>{ const ab=ordAbertas().filter(o=>o.linha===l&&(dataEf(o)<h?h:dataEf(o))===d); if(ab.length<2) return;
    const xs=irmasCal(ab[0]).filter(x=>x._pv||x.status==='aberta'); const sg=sqSugere(xs), a=sqTrocas(xs), b=sqTrocas(sg);
    if(b<a) r.push({l,d,xs,sg,a,b}); }); }
  return r; }
function sqLista(xs){ return `<ol class="sq-ol">${xs.map(x=>`<li><b>${esc(codigoDe(x))}</b> ${esc(nomeCurto(x))}${x._pv?' <small>(previsão)</small>':''}</li>`).join('')}</ol>`; }
function vSqModal(){ const ds=sqDias();
  return `<div class="dbmodal" data-sq-fundo="1"><div class="dbmbox sq-box" role="dialog" aria-modal="true" aria-label="Sugerir sequência"><div style="padding:20px 22px">
    <div class="head" style="align-items:baseline"><div><div class="eyebrow">CALENDÁRIO</div><h2 style="margin:2px 0 0">Sugestão de sequência</h2><div class="sub" style="margin:2px 0 0">Junta os produtos da mesma família no mesmo dia e linha, para trocar e limpar menos. Nada muda até você tocar em Aplicar.</div></div><button class="lnk" data-act="sq-x">Fechar</button></div>
    ${ds.length?`<div class="sq-ac"><button class="btn" data-act="sq-tudo">Aplicar nos ${ds.length} dia${ds.length>1?'s':''}</button></div>`+ds.map((x,i)=>`<section class="sq-d"><div class="sq-h"><b>${esc(x.l)} · ${esc(dmTxt(x.d))}</b><span>${x.a} troca${x.a===1?'':'s'} de produto → <em>${x.b}</em></span><button class="btn sec" data-act="sq-ok" data-i="${i}">Aplicar</button></div>
      <div class="sq-g"><div><small>HOJE</small>${sqLista(x.xs)}</div><div><small>SUGERIDO</small>${sqLista(x.sg)}</div></div></section>`).join('')
      :'<div class="empty" style="margin-top:12px">A sequência desta semana já está boa: os produtos parecidos já estão juntos em cada dia e linha.</div>'}
  </div></div></div>`; }
{ const _vc=vCalendario; vCalendario=function(){ let h=_vc.apply(this,arguments); try{ if(!calRO()&&innerWidth>=700) h=h.replace('<button class="btn sec" data-act="cal-html"','<button class="btn sec" data-act="sq-abre" style="height:42px" title="Juntar produtos parecidos no mesmo dia">'+ic('grafico',16,2)+'Sugerir sequência</button><button class="btn sec" data-act="cal-html"');
  if(S.sqs) h+=vSqModal(); }catch(e){} return h; }; }
async function sqAplica(x){ const lista=x.sg.map(seqId); await reordenarCal(lista[0],x.l,null,true,lista); }
document.addEventListener('click',async ev=>{ const f=ev.target.closest&&ev.target.closest('[data-sq-fundo]'); const b=ev.target.closest&&ev.target.closest('[data-act^="sq-"]');
  if(f&&ev.target===f){ S.sqs=null; render(); return; } if(!b) return; const a=b.dataset.act;
  if(a==='sq-abre'){ S.sqs={}; render(); return; } if(a==='sq-x'){ S.sqs=null; render(); return; }
  if(a==='sq-ok'){ const x=sqDias()[+b.dataset.i]; if(!x) return; b.disabled=true; await sqAplica(x); toast('Sequência aplicada: '+x.l+' · '+dmTxt(x.d)+'.'); render(); return; }
  if(a==='sq-tudo'){ const ds=sqDias(); b.disabled=true; for(const x of ds) await sqAplica(x); S.sqs=null; toast('Sequência aplicada em '+ds.length+' dia'+(ds.length>1?'s':'')+'.'); render(); return; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.sqs){ S.sqs=null; render(); } });
document.head.insertAdjacentHTML('beforeend',`<style id="sq-css">
.sq-box{max-width:820px}.sq-ac{margin:12px 0}.sq-d{border:1px solid var(--line,#D5DDE3);border-radius:12px;padding:12px 14px;margin-top:10px}
.sq-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.sq-h span{color:var(--muted);flex:1}.sq-h em{font-style:normal;font-weight:700;color:var(--ok,#2F8C5A)}
.sq-g{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}.sq-g small{font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.05em}
.sq-ol{margin:4px 0 0;padding-left:20px;font-size:13px}.sq-ol li{margin:2px 0}.sq-ol small{color:var(--muted)}
@media(max-width:640px){.sq-g{grid-template-columns:1fr}}
</style>`);
