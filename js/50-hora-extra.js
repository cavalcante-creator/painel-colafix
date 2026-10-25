/* Painel Colafix · 50-hora-extra.js (24/10) — pedido 11: hora extra autorizada pelo Marcelo (sem pedido de ninguém).
   Visão do gestor › Hora extra (gxhe, logo depois de Pessoas hoje): o Marcelo escolhe o dia, as pessoas (da presença do Face ID
   ou digitando), o horário (das/até) ou as horas, e o motivo → horaextra/{id} {dia,nomes[],ini,fim,horas,mot,setor,porNome,por,em,removido}.
   Lista do mês com total de horas por pessoa; "Tirar" (dois toques) marca removido. Regra geral do banco (não mudou).
   RH: window.HoraExtra.doMes(m) e .horasDe(nome,m) — usados no Fechamento para a folha (coluna e aba "Hora extra"). */
"use strict";
S.he={dia:null,nomes:[],ini:'',fim:'',horas:'',mot:'',setor:'',q:'',cx:null,mes:null}; S.heLista=[]; let _heSub=false;
function heRH(){ try{ const p=acsP(); return !!(S.acs&&S.acs.dono)||!!(p&&((p.mods||[]).includes('rh')||(S.acs.doc&&(S.acs.doc.extras||[]).includes('rh')))); }catch(e){ return false; } }
setInterval(()=>{ try{ if(_heSub||!S.db||!S.acs||!S.acs.pronto) return; if(!(viewOk('gxhe')||heRH())) return; _heSub=true;
  inscrever('horaextra',()=>S.db.collection('horaextra').orderBy('dia','desc').limit(600),snap=>{ S.heLista=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); rerenderSeguro(); }); }catch(e){} },1500);
function heMin(s){ const m=String(s||'').match(/^(\d{1,2}):(\d{2})$/); return m?+m[1]*60+ +m[2]:null; }
function heHoras(x){ if(+x.horas>0) return +x.horas; const a=heMin(x.ini), b=heMin(x.fim); if(a==null||b==null) return 0; let d=b-a; if(d<0) d+=1440; return Math.round(d/60*100)/100; }
function heFH(h){ const m=Math.round((+h||0)*60); return Math.floor(m/60)+'h'+(m%60?String(m%60).padStart(2,'0'):''); }
function heKey(n){ return String(n||'').replace(/^\s*(motorista|terceiros?)\s*-\s*/i,'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z ]+/g,' ').trim().split(/\s+/).filter(w=>!['DA','DE','DO','DAS','DOS','E'].includes(w)); }
function heMesma(a,b){ const x=heKey(a), y=heKey(b); if(!x.length||!y.length) return false; if(x.join(' ')===y.join(' ')) return true; return x[0]===y[0]&&x[x.length-1]===y[y.length-1]; }
window.HoraExtra={ doMes(m){ return (S.heLista||[]).filter(x=>String(x.dia||'').slice(0,7)===m); },
  horasDe(nome,m){ return this.doMes(m).filter(x=>(x.nomes||[]).some(n=>heMesma(n,nome))).reduce((a,x)=>a+heHoras(x),0); },
  diasDe(nome,m){ return this.doMes(m).filter(x=>(x.nomes||[]).some(n=>heMesma(n,nome))); }, horas:heHoras, fh:heFH, pronto(){ return _heSub; } };
function heCands(d){ const doc=typeof gxpDoc==='function'?gxpDoc(d):null, s=new Map(); if(doc){ (doc.p||[]).forEach(p=>s.set(p.n,{n:p.n,s:p.s||'',veio:true})); (doc.f||[]).forEach(p=>{ if(!s.has(p.n)) s.set(p.n,{n:p.n,s:p.s||'',veio:false}); }); }
  return [...s.values()].sort((a,b)=>(b.veio-a.veio)||a.n.localeCompare(b.n,'pt-BR')); }
function vGxHe(){ if(typeof gxpAssina==='function') gxpAssina(); const E=S.he, h=hojeStr(); if(!E.dia) E.dia=h; if(!E.mes) E.mes=h.slice(0,7);
  const cs=heCands(E.dia), q=heKey(E.q).join(' '), vis=cs.filter(c=>!q||heKey(c.n).join(' ').includes(q)).slice(0,60), hr=heHoras(E);
  const xs=window.HoraExtra.doMes(E.mes).sort((a,b)=>String(b.dia).localeCompare(String(a.dia))||String(b.em).localeCompare(String(a.em)));
  const tot={}; xs.forEach(x=>(x.nomes||[]).forEach(n=>{ tot[n]=(tot[n]||0)+heHoras(x); }));
  const form=`<section class="card he-f"><div class="eyebrow">AUTORIZAR HORA EXTRA</div>
    <div class="he-g"><label><span>Dia</span><input type="date" class="txt" id="he-dia" value="${esc(E.dia)}"></label>
      <label><span>Das</span><input class="txt he-h" id="he-ini" inputmode="numeric" maxlength="5" placeholder="17:30" value="${esc(E.ini)}"></label>
      <label><span>Até</span><input class="txt he-h" id="he-fim" inputmode="numeric" maxlength="5" placeholder="20:00" value="${esc(E.fim)}"></label>
      <label><span>ou horas</span><input class="txt he-h" id="he-horas" inputmode="decimal" maxlength="5" placeholder="2,5" value="${esc(E.horas)}"></label>
      <label class="he-w"><span>Motivo</span><input class="txt" id="he-mot" maxlength="120" placeholder="Ex.: terminar a ordem 5012 da Linha 1" value="${esc(E.mot)}"></label>
      <label class="he-w"><span>Linha ou setor <small>(opcional)</small></span><input class="txt" id="he-setor" maxlength="40" list="he-ls" value="${esc(E.setor)}"><datalist id="he-ls">${linhasOrd().map(l=>`<option value="${esc(l)}">`).join('')}</datalist></label></div>
    <div class="he-p"><div class="he-ph"><b>Quem vai fazer${E.nomes.length?' · '+E.nomes.length:''}</b><input class="txt" id="he-q" placeholder="Procurar ou digitar o nome" value="${esc(E.q)}" autocomplete="off">${String(E.q||'').trim().length>2&&!cs.some(c=>heMesma(c.n,E.q))?`<button class="btn sec" data-act="he-add" data-v="${esc(String(E.q).trim())}">+ Pôr "${esc(String(E.q).trim())}"</button>`:''}</div>
      ${E.nomes.length?`<div class="he-sel">${E.nomes.map(n=>`<button class="he-ch on" data-act="he-tg" data-v="${esc(n)}">${esc(n)} ×</button>`).join('')}</div>`:''}
      <div class="he-cs">${vis.length?vis.map(c=>`<button class="he-ch ${E.nomes.includes(c.n)?'on':''} ${c.veio?'':'fora'}" data-act="he-tg" data-v="${esc(c.n)}"><b>${esc(c.n)}</b><small>${esc(c.s||'')}${c.veio?'':' · não veio'}</small></button>`).join(''):`<div class="sub" style="margin:0">${cs.length?'Ninguém com esse nome. Use "+ Pôr" para digitar.':'Sem a lista do Face ID deste dia: digite o nome e toque em "+ Pôr".'}</div>`}</div></div>
    <div class="he-ac"><span>${E.nomes.length&&hr?`${E.nomes.length} pessoa${E.nomes.length>1?'s':''} × ${heFH(hr)}`:'Escolha as pessoas e o horário'}</span><button class="btn" data-act="he-ok" ${E.salv?'disabled':''}>${E.salv?'Gravando…':'Autorizar hora extra'}</button></div></section>`;
  const lista=`<section class="card he-l"><div class="he-lh"><div><div class="eyebrow">AUTORIZADAS NO MÊS</div><h2 style="margin:2px 0 0">${xs.length} autorização${xs.length===1?'':'ões'} · ${heFH(Object.values(tot).reduce((a,b)=>a+b,0))} no total</h2></div><input type="month" class="txt" id="he-mes" value="${esc(E.mes)}" style="width:auto"></div>
    ${Object.keys(tot).length?`<div class="he-tot">${Object.entries(tot).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<span><b>${esc(n)}</b> ${heFH(v)}</span>`).join('')}</div>`:''}
    ${xs.length?xs.map(x=>`<div class="he-r"><div><b>${esc(dm(x.dia))} · ${x.ini&&x.fim?esc(x.ini)+' às '+esc(x.fim):heFH(heHoras(x))}${x.ini&&x.fim?' ('+heFH(heHoras(x))+')':''}</b><span>${esc((x.nomes||[]).join(', '))}</span><small>${esc(x.mot||'')}${x.setor?' · '+esc(x.setor):''} · autorizado por ${esc(x.porNome||'')}</small></div><button class="lnk" data-act="he-x" data-id="${esc(x._id)}" style="color:var(--crit-ink,#93413F)">${E.cx===x._id?'Confirmar: tirar':'Tirar'}</button></div>`).join(''):'<div class="empty">Nenhuma hora extra autorizada neste mês.</div>'}</section>`;
  return `${banner()}${gxCab('VISÃO DO GESTOR','Hora extra')}<div class="sub" style="margin:-6px 0 14px">Você autoriza direto, sem pedido. O RH vê no fechamento do mês para a folha.</div><div class="he-gr">${form}${lista}</div>`; }
Object.assign(VIEWS,{gxhe:{nome:'Hora extra',ic:'relogio',mob:'Hora extra'}}); CRUMB.gxhe='Hora extra';
S.extViews=S.extViews||{}; S.extViews.gxhe=vGxHe;
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxhe')){ const i=M.views.indexOf('gxpres'); M.views.splice(i>=0?i+1:1,0,'gxhe'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxhe')){ const i=GXN_TELAS.indexOf('gxpres'); GXN_TELAS.splice(i>=0?i+1:2,0,'gxhe'); }
function heLe(){ const g=id=>{ const x=document.getElementById(id); return x?x.value:null; }, E=S.he; [['he-dia','dia'],['he-ini','ini'],['he-fim','fim'],['he-horas','horas'],['he-mot','mot'],['he-setor','setor'],['he-q','q']].forEach(([i,k])=>{ const v=g(i); if(v!=null) E[k]=v; }); }
function heHoraFmt(i){ let d=i.value.replace(/\D/g,'').slice(0,4); if(d.length>=3) d=d.slice(0,d.length-2)+':'+d.slice(-2); i.value=d; }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.id||!/^he-/.test(t.id)) return; if(t.id==='he-ini'||t.id==='he-fim') heHoraFmt(t); heLe();
  if(t.id==='he-q'){ const p=t.selectionStart; render(); const n=document.getElementById('he-q'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.id) return; if(t.id==='he-dia'){ S.he.dia=t.value||hojeStr(); render(); } if(t.id==='he-mes'){ S.he.mes=t.value||hojeStr().slice(0,7); render(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="he-"]'); if(!b) return; const a=b.dataset.act, E=S.he; heLe();
  if(a==='he-tg'){ const v=b.dataset.v; E.nomes=E.nomes.includes(v)?E.nomes.filter(x=>x!==v):E.nomes.concat([v]); render(); return; }
  if(a==='he-add'){ const v=b.dataset.v; if(v&&!E.nomes.includes(v)) E.nomes.push(v); E.q=''; render(); return; }
  if(a==='he-x'){ const id=b.dataset.id; if(E.cx!==id){ E.cx=id; render(); return; } E.cx=null; try{ await S.db.doc('horaextra/'+id).update({removido:true,removidoEm:new Date().toISOString(),removidoPor:S.uid}); S.heLista=S.heLista.filter(x=>x._id!==id); toast('Hora extra tirada.'); }catch(e){ erro(e); } render(); return; }
  if(a==='he-ok'){ if(!E.nomes.length) return toast('Escolha quem vai fazer a hora extra.'); const ini=heMin(E.ini), fim=heMin(E.fim), hs=numIn(E.horas)||0;
    if(!(hs>0)&&(ini==null||fim==null)) return toast('Diga o horário (das/até) ou quantas horas.'); if(!String(E.mot||'').trim()) return toast('Escreva o motivo.');
    const d={dia:E.dia||hojeStr(),nomes:E.nomes.slice(),ini:ini!=null&&fim!=null?E.ini:'',fim:ini!=null&&fim!=null?E.fim:'',horas:hs>0&&(ini==null||fim==null)?hs:0,mot:String(E.mot).trim(),setor:String(E.setor||'').trim(),porNome:(S.nomes&&S.nomes[S.uid])||'',por:S.uid||null,em:new Date().toISOString()};
    E.salv=true; render(); const id='he'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    try{ await S.db.doc('horaextra/'+id).set(d); S.heLista=[Object.assign({_id:id},d)].concat(S.heLista.filter(x=>x._id!==id)); Object.assign(E,{nomes:[],ini:'',fim:'',horas:'',mot:'',q:'',salv:false}); toast('Hora extra autorizada: '+d.nomes.length+' pessoa'+(d.nomes.length>1?'s':'')+' em '+dm(d.dia)+'.'); }
    catch(e){ E.salv=false; erro(e); } render(); return; } });
document.head.insertAdjacentHTML('beforeend',`<style id="he-css">
.he-gr{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:18px;align-items:start}@media(max-width:1100px){.he-gr{grid-template-columns:1fr}}
.he-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}.he-g label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}.he-g .he-w{grid-column:span 2}.he-g small{font-weight:400;color:var(--muted)}
@media(max-width:640px){.he-g{grid-template-columns:1fr 1fr}.he-g .he-w{grid-column:span 2}}
.he-p{margin-top:14px}.he-ph{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.he-ph input{flex:1 1 200px}
.he-sel,.he-cs{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.he-cs{max-height:300px;overflow:auto}
.he-ch{border:1px solid var(--line,#D5DDE3);background:var(--surface,#fff);border-radius:10px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer;text-align:left;color:inherit}.he-ch small{display:block;color:var(--muted);font-size:11px}
.he-ch.on{background:var(--teal-strong,#143F54);color:#fff;border-color:var(--teal-strong,#143F54)}.he-ch.on small{color:#D6E3EA}.he-ch.fora{opacity:.7}
.he-ac{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap}.he-ac span{color:var(--muted)}
.he-lh{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap}.he-tot{display:flex;flex-wrap:wrap;gap:6px 14px;margin:10px 0;font-size:13px}
.he-r{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line,#E3E8EC)}.he-r b,.he-r span,.he-r small{display:block}.he-r span{font-size:13px;margin-top:2px}.he-r small{color:var(--muted);font-size:12px}
</style>`);
