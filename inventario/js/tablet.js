/* Inventário · modo tablet: barra fixa com progresso e salvar, itens contados em verde, "só os que faltam",
   campo seleciona tudo ao tocar e Enter vai para o próximo, tela não apaga durante a contagem, e a contagem em andamento
   (itens + números) fica guardada para continuar se o tablet recarregar. Não muda a lógica de conferencia.js. */
(function(){
  const SEL='conf_temp_sel', VAL='conf_temp';
  const ler=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
  const contado=c=>{ const x=CONFERENCIAS[c]; if(!x) return false; return ['pal3','sac3','pal30','sac30'].some(k=>(+x[k]||0)>0)||!!x.confirmadoZero||(+x.qtdRasgada||0)>0; };
  const selecionados=()=>[...(CONF_ITENS_SEL||[])];
  function guardaSel(){ try{ if(CONF_MODO==='conferencia'&&selecionados().length) localStorage.setItem(SEL,JSON.stringify({itens:selecionados(),em:new Date().toISOString(),quem:(typeof USUARIO_LOGADO!=='undefined'&&USUARIO_LOGADO&&USUARIO_LOGADO.nome)||''})); }catch(e){} }
  /* ---------- barra fixa e cartões contados ---------- */
  let soFaltam=false, wake=null;
  function barra(){ let b=document.getElementById('invBar'); const on=CONF_MODO==='conferencia'; document.body.classList.toggle('inv-contando',on); document.body.classList.toggle('inv-so-faltam',on&&soFaltam);
    if(!on){ if(b) b.remove(); if(wake){ try{ wake.release(); }catch(e){} wake=null; } return; }
    const its=selecionados(), n=its.filter(contado).length;
    if(!b){ b=document.createElement('div'); b.id='invBar'; b.className='inv-bar'; document.body.appendChild(b);
      b.addEventListener('click',ev=>{ const t=ev.target.closest('button'); if(!t) return; const a=t.dataset.a, its=selecionados(); /* sempre a lista atual */
        if(a==='itens') confVoltarSelecao(); if(a==='salvar') salvarConferencia();
        if(a==='faltam'){ soFaltam=!soFaltam; barra(); }
        if(a==='um'&&window.invFacil){ const k=its.findIndex(x=>!contado(x)); window.invFacil.abreConta(k<0?0:k); }
        if(a==='prox'){ const c=its.find(x=>!contado(x)); const el=c&&document.getElementById('confCard_'+c); if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); const i=el.querySelector('input[type=number]'); if(i) setTimeout(()=>i.focus(),350); } } }); }
    b.innerHTML=`<div class="inv-prog"><b>${n} de ${its.length}</b> <span>itens contados</span><i><u style="width:${its.length?n/its.length*100:0}%"></u></i></div>
      ${window.invFacil?'<button data-a="um">Um por vez</button>':''}<button data-a="itens">← Itens</button><button data-a="faltam" aria-pressed="${soFaltam}">Só os que faltam</button><button data-a="prox" ${n===its.length?'disabled':''}>Próximo que falta</button><button data-a="salvar" class="inv-salvar">Salvar conferência</button>`;
    its.forEach(c=>{ const el=document.getElementById('confCard_'+c); if(el) el.classList.toggle('inv-ok',contado(c)); });
    if(!wake&&navigator.wakeLock){ navigator.wakeLock.request('screen').then(w=>{ wake=w; }).catch(()=>{}); } }
  const envolve=(nome,depois)=>{ const f=window[nome]; if(typeof f!=='function') return; window[nome]=function(){ const r=f.apply(this,arguments); const fim=()=>{ try{ depois&&depois(); barra(); }catch(e){} }; if(r&&typeof r.then==='function') r.then(fim,fim); else fim(); return r; }; };
  ['renderConferencia','updateConf','confSomarQtd','confDesfazerSoma','mudarPalete','setConfirmarZeroConf','setQtdRasgadaConf','confRemoverItem'].forEach(n=>envolve(n,guardaSel));
  envolve('confIniciarConferencia',()=>{ guardaSel(); prepCampos(); });
  envolve('confVoltarSelecao',()=>{ retoma(); });
  envolve('salvarConferencia',()=>{ try{ if(!localStorage.getItem(VAL)) localStorage.removeItem(SEL); }catch(e){} retoma(); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&CONF_MODO==='conferencia'){ wake=null; barra(); } });
  /* ---------- campos: tocar seleciona o número; Enter vai para o próximo ---------- */
  function prepCampos(){ const g=document.getElementById('confGrid'); if(!g||g._inv) return; g._inv=true;
    g.addEventListener('focusin',ev=>{ const i=ev.target; if(i&&i.type==='number'){ i.setAttribute('inputmode','numeric'); setTimeout(()=>{ try{ if(document.activeElement===i) i.select(); }catch(e){} },30); /* só se ainda for o campo em uso (select() puxa o foco) */ } });
    g.addEventListener('keydown',ev=>{ const i=ev.target; if(ev.key!=='Enter'||!i||i.type!=='number') return; ev.preventDefault(); const xs=[...g.querySelectorAll('input[type=number]')].filter(x=>x.offsetParent!==null); const k=xs.indexOf(i); i.blur(); if(xs[k+1]) xs[k+1].focus(); }); }
  /* ---------- continuar a contagem que ficou aberta ---------- */
  function retoma(){ const box=document.getElementById('invRetoma'); if(box) box.remove(); if(CONF_MODO!=='selecao') return;
    const s=ler(SEL), v=ler(VAL)||{}; if(!s||!(s.itens||[]).length) return; const lista=document.getElementById('confItemSelList'); if(!lista) return;
    const n=s.itens.filter(c=>{ const x=v[c]; return x&&(['pal3','sac3','pal30','sac30'].some(k=>(+x[k]||0)>0)||x.confirmadoZero||(+x.qtdRasgada||0)>0); }).length;
    const d=document.createElement('div'); d.id='invRetoma'; d.className='inv-retoma'; const hm=new Date(s.em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    d.innerHTML=`<div><b>Contagem em andamento</b><span>${s.itens.length} itens · ${n} já contados · guardada às ${hm}${s.quem?' · '+s.quem:''}</span></div><button class="inv-sim" data-a="sim">Continuar a contagem</button><button data-a="nao">Descartar</button>`;
    d.addEventListener('click',ev=>{ const t=ev.target.closest('button'); if(!t) return;
      if(t.dataset.a==='sim'){ CONF_ITENS_SEL=new Set(s.itens.filter(c=>(CONF_ITEMS.length?CONF_ITEMS:ITEMS).some(i=>i.cod===c))); try{ atualizarBadgeSelConf(); }catch(e){} confIniciarConferencia(); }
      else if(confirm('Descartar a contagem em andamento? Os números digitados serão apagados.')){ try{ localStorage.removeItem(SEL); localStorage.removeItem(VAL); }catch(e){} d.remove(); } });
    lista.parentElement.insertBefore(d,lista.parentElement.firstChild); }
  /* quando o programa termina de abrir */
  let tent=0; const ini=setInterval(()=>{ tent++; if(typeof USUARIO_LOGADO!=='undefined'&&USUARIO_LOGADO&&document.getElementById('confItemSelList')){ clearInterval(ini); setTimeout(retoma,600); } if(tent>120) clearInterval(ini); },500);
  window.invTablet={barra,retoma,contado};
})();

/* ---------- Recontagem guiada: ao salvar, o que deu MUITO diferente do sistema vira uma lista para recontar na hora ----------
   Regra: diferença ≥ 5 unidades E ≥ 3% do saldo do sistema (por bloco: Almox 3/Rejunte/Separação/Almox 1 e Almox 30/Almox 2).
   Na contagem cega, a lista mostra só os itens (sem números do sistema). "Agora não": seguem para a Auditoria como sempre. */
(function(){
  const LIM_UN=5, LIM_PC=0.03, K='conf_reconta';
  const fonte=()=>(typeof CONF_ITEMS!=='undefined'&&CONF_ITEMS.length?CONF_ITEMS:ITEMS);
  function divergentes(snap){ let cp={}; try{ cp=confPerm()||{}; }catch(e){}
    const out=[]; Object.keys(snap||{}).forEach(cod=>{ const c=snap[cod], it=fonte().find(i=>i.cod===cod); if(!it||!c) return;
      const b3=(it.temAlmox3&&cp.podeContarAlmox3)||(it.temRejunte&&cp.podeContarRejunte)||(it.temSeparacao&&cp.podeContarSeparacao)||(it.temAlmox1&&cp.podeContarAlmox1);
      const b30=(it.temAlmox30&&cp.podeContarAlmox30)||(it.temAlmox2&&cp.podeContarAlmox2);
      const ver=(cont,sis,rot)=>{ const d=cont-sis; if(Math.abs(d)>=LIM_UN&&Math.abs(d)>=Math.abs(sis)*LIM_PC) out.push({cod,nome:it.name||it.descricao||'',local:rot,cont,sis,d}); };
      if(b3) ver(+c.total3||0,+it.saldo3||0,(typeof localLabel==='function'?localLabel(it):'Almox 3'));
      if(b30) ver(+c.total30||0,+it.saldo30||0,it.temAlmox2&&cp.podeContarAlmox2?'Almox 2':'Almox 30'); });
    return out; }
  function modal(html){ let m=document.getElementById('invRec'); if(m) m.remove(); m=document.createElement('div'); m.id='invRec'; m.className='inv-rec'; m.innerHTML=`<div class="inv-rec-c" role="dialog" aria-modal="true" aria-labelledby="invRecT">${html}</div>`; document.body.appendChild(m); return m; }
  const fmt=n=>Number(n||0).toLocaleString('pt-BR');
  function oferece(xs){ const cega=typeof MODO_CEGO!=='undefined'&&MODO_CEGO;
    const m=modal(`<h2 id="invRecT">Recontagem recomendada</h2><p>${xs.length===1?'Este item deu':'Estes '+xs.length+' itens deram'} bem diferente do sistema. Recontar agora evita abrir auditoria por um erro de contagem.</p>
      <div class="inv-rec-l">${xs.map(x=>`<div><b>${x.cod}</b><span>${String(x.nome).replace(/</g,'&lt;')} · ${x.local}</span>${cega?'':`<em>contou ${fmt(x.cont)} · sistema ${fmt(x.sis)} (${x.d>0?'+':''}${fmt(x.d)})</em>`}</div>`).join('')}</div>
      <div class="inv-rec-b"><button data-a="nao">Agora não</button><button data-a="sim" class="inv-sim">Recontar agora (${new Set(xs.map(x=>x.cod)).size} ${new Set(xs.map(x=>x.cod)).size===1?'item':'itens'})</button></div>`);
    m.addEventListener('click',ev=>{ const t=ev.target.closest('button'); if(!t) return; m.remove();
      if(t.dataset.a==='sim'){ const cods=[...new Set(xs.map(x=>x.cod))]; try{ sessionStorage.setItem(K,JSON.stringify({cods,em:Date.now()})); }catch(e){}
        CONF_ITENS_SEL=new Set(cods); try{ atualizarBadgeSelConf(); }catch(e){} confIniciarConferencia(); try{ toast('Recontagem: conte de novo '+(cods.length===1?'este item':'estes '+cods.length+' itens')+' e salve.'); }catch(e){} } }); }
  function resultado(xs,cods){ const dif=new Set(xs.map(x=>x.cod)), bateu=cods.filter(c=>!dif.has(c));
    const m=modal(`<h2 id="invRecT">Resultado da recontagem</h2><div class="inv-rec-r"><div class="ok"><b>${bateu.length}</b><span>${bateu.length===1?'item bateu':'itens bateram'} com o sistema</span></div><div class="${dif.size?'crit':'ok'}"><b>${dif.size}</b><span>${dif.size===1?'continua diferente':'continuam diferentes'} · ${dif.size?'vão para a Auditoria':'nada para a Auditoria'}</span></div></div>
      ${dif.size?`<div class="inv-rec-l">${[...dif].map(c=>{ const x=xs.find(y=>y.cod===c); return `<div><b>${c}</b><span>${String(x.nome).replace(/</g,'&lt;')} · ${x.local}</span></div>`; }).join('')}</div>`:''}
      <div class="inv-rec-b"><button data-a="ok" class="inv-sim">Fechar</button></div>`);
    m.addEventListener('click',ev=>{ if(ev.target.closest('button')) m.remove(); }); }
  const _salvar=window.salvarConferencia; if(typeof _salvar!=='function') return;
  window.salvarConferencia=async function(){ const snap=JSON.parse(JSON.stringify(CONFERENCIAS||{})); const r=await _salvar.apply(this,arguments);
    try{ if(Object.keys(CONFERENCIAS||{}).length||!Object.keys(snap).length) return r; /* não salvou (ou nada a salvar) */
      let rec=null; try{ rec=JSON.parse(sessionStorage.getItem(K)||'null'); sessionStorage.removeItem(K); }catch(e){}
      const xs=divergentes(snap);
      if(rec&&(rec.cods||[]).length) resultado(xs.filter(x=>rec.cods.includes(x.cod)),rec.cods.filter(c=>snap[c]));
      else if(xs.length) oferece(xs); }catch(e){ console.warn('[recontagem]',e); }
    return r; };
  window.invRecontagem={divergentes};
  document.head.insertAdjacentHTML('beforeend',`<style id="inv-rec-css">.inv-rec{position:fixed;inset:0;z-index:1000;background:rgba(20,43,51,.45);display:flex;align-items:center;justify-content:center;padding:18px}
  .inv-rec-c{background:#FFFFFF;border-radius:18px;max-width:620px;width:100%;max-height:88vh;overflow:auto;padding:24px 24px 18px;box-shadow:0 12px 40px rgba(0,0,0,.25)}
  .inv-rec-c h2{margin:0 0 6px;font-size:24px}.inv-rec-c p{margin:0 0 14px;font-size:16px;color:#44545D}
  .inv-rec-l>div{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:12px;background:#F4F6F8;margin-bottom:8px}.inv-rec-l b{font-size:18px}.inv-rec-l span{font-size:15px;color:#44545D}.inv-rec-l em{font-style:normal;font-size:15px;font-weight:600;color:#B5473F}
  .inv-rec-b{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}.inv-rec-b button{min-height:54px;padding:0 22px;border-radius:12px;font-size:17px;font-weight:600;border:1px solid #DDE3E8;background:#FFFFFF;cursor:pointer}.inv-rec-b .inv-sim{background:#143F54;color:#FFFFFF;border:0}
  .inv-rec-r{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 12px}.inv-rec-r>div{border-radius:14px;padding:14px 16px}.inv-rec-r .ok{background:#E3F0E9;color:#2F7A55}.inv-rec-r .crit{background:#F6E8E6;color:#B5473F}.inv-rec-r b{display:block;font-size:36px}.inv-rec-r span{font-size:15px;font-weight:600}
  @media (max-width:520px){.inv-rec-r{grid-template-columns:1fr}.inv-rec-b button{flex:1}}</style>`);
})();
