/* Inventário · tela inicial do conferente (pedidos de 04/11: "Contagem do dia" e "traga o que já tem, mas reformule").
   Na aba Contagem, antes de começar, o conferente vê uma tela só (#invDia):
   - "Bom dia, <nome>", data e os almox dele;
   - cartão grande da Contagem do dia (lista que o painel montou em Painel.inv.dia(): recontagens pedidas para outra pessoa,
     giro alto e rodízio) com o andamento e "Começar a contagem do dia (N)" → marca os itens que ele pode contar e abre a conferência de sempre;
   - "Contar o que estou vendo" (= o botão #fcAcharBtn do facil.js) e "Receber material" (= Recebimento em 3 passos, #fcRecBtn);
   - embaixo, links para a escolha de itens antiga (#confSelCard, que fica escondida) e para imprimir a lista de contagem.
   Nada da contagem muda: só a entrada. "Escolher itens na lista" mostra a tela antiga até voltar (sessionStorage 'ivh.lista'). */
(function(){
  const $=id=>document.getElementById(id), esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const P=()=>{ try{ return (window.parent!==window&&window.parent.Painel&&window.parent.Painel.inv)||null; }catch(e){ return null; } };
  const fonte=()=>(typeof CONF_ITEMS!=='undefined'&&CONF_ITEMS.length?CONF_ITEMS:(typeof ITEMS!=='undefined'?ITEMS:[]))||[];
  const LOC={a3:'Almox 3',a30:'Almox 30',rej:'Rejunte',sep:'Separação',a1:'Almox 1',a2:'Almox 2'};
  const lista=()=>{ try{ return sessionStorage.getItem('ivh.lista')==='1'; }catch(e){ return false; } };
  const setLista=v=>{ try{ v?sessionStorage.setItem('ivh.lista','1'):sessionStorage.removeItem('ivh.lista'); }catch(e){} sig=''; desenha(); };
  function pode(it){ let cp={}, ff=''; try{ cp=confPerm()||{}; }catch(e){} try{ ff=confPerfilFiltro()||''; }catch(e){}
    const mp={almox3:'temAlmox3',almox30:'temAlmox30',rejunte:'temRejunte',separacao:'temSeparacao',almox1:'temAlmox1',almox2:'temAlmox2'};
    if(ff&&mp[ff]&&!it[mp[ff]]) return false; if(cp.acessoTotal) return true;
    return !!((it.temAlmox3&&cp.podeContarAlmox3)||(it.temAlmox30&&cp.podeContarAlmox30)||(it.temRejunte&&cp.podeContarRejunte)||(it.temSeparacao&&cp.podeContarSeparacao)||(it.temAlmox1&&cp.podeContarAlmox1)||(it.temAlmox2&&cp.podeContarAlmox2)); }
  function dados(){ const p=P(); if(!p||!p.dia) return null; const D=p.dia(); if(!D) return null; const F=fonte();
    const xs=(D.itens||[]).map(i=>Object.assign({},i,{it:F.find(x=>String(x.cod)===String(i.cod))})).filter(i=>i.it&&pode(i.it)); return Object.assign({},D,{xs}); }
  function locais(){ try{ const u=P()&&P().usuario&&P().usuario(); const ls=(u&&u.flags&&u.flags.locais)||[]; if(ls.length>=6) return 'todos os almoxarifados'; return ls.map(l=>LOC[l]||l).join(', '); }catch(e){ return ''; } }
  const podeReceber=()=>{ const b=$('btnModoRecebimento'); return !!(b&&b.style.display!=='none'); };
  const MOT={rec:'recontar',giro:'sai muito',rod:'rodízio'};
  const SV=d=>`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICO={busca:SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),caixa:SV('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),feito:SV('<path d="M20 6 9 17l-5-5"/>'),
    lista:SV('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),imp:SV('<path d="M6 9V3h12v6M6 18H4v-6h16v6h-2"/><path d="M6 14h12v7H6z"/>'),hist:SV('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),aud:SV('<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>'),relogio:SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')};
  const LORD=[['temAlmox3','Almox 3','podeContarAlmox3'],['temAlmox30','Almox 30','podeContarAlmox30'],['temRejunte','Rejunte','podeContarRejunte'],['temSeparacao','Separação','podeContarSeparacao'],['temAlmox1','Almox 1','podeContarAlmox1'],['temAlmox2','Almox 2','podeContarAlmox2']];
  function ondeK(it){ let cp={}; try{ cp=confPerm()||{}; }catch(e){} const t=!!cp.acessoTotal; const ls=LORD.filter(([k,,p])=>it&&it[k]&&(t||cp[p])); return ls.length?ls:LORD.filter(([k])=>it&&it[k]); }
  const onde=it=>ondeK(it).map(x=>x[1]).join(' · '), ondeI=it=>{ const l=ondeK(it)[0]; return l?LORD.indexOf(l):9; };
  function recHoje(){ try{ const n=new Date(), d=String(n.getDate()).padStart(2,'0')+'/'+String(n.getMonth()+1).padStart(2,'0')+'/'+n.getFullYear(); const xs=(typeof RECEBIMENTOS!=='undefined'?RECEBIMENTOS:[]).filter(r=>String(r.dataHora||r.data||'').startsWith(d));
    const u=xs.map(r=>String(r.dataHora||'').slice(11,16)).filter(Boolean).sort().pop(); return {n:xs.length,u}; }catch(e){ return {n:0}; } }
  const hist=()=>{ try{ return sessionStorage.getItem('ivh.hist')==='1'; }catch(e){ return false; } };
  const podeAud=()=>{ const b=$('btnModoAuditoria'); return !!(b&&b.style.display!=='none'); };
  let sig='';
  function desenha(){ const sc=$('confSelCard'), wrap=$('confModoContagemWrap'); if(!sc||typeof CONF_MODO==='undefined') return; let el=$('invDia');
    let pf={}; try{ pf=perfil(); }catch(e){} const conta=!!(pf.podeConferir||pf.podeAdmin);
    const naHome=conta&&CONF_MODO==='selecao'&&!lista()&&(!wrap||wrap.style.display!=='none');
    document.body.classList.toggle('ivh',naHome); document.body.classList.toggle('ivh-lista',conta&&CONF_MODO==='selecao'&&lista()); document.body.classList.toggle('ivh-hist',hist());
    if(!conta){ if(el) el.remove(); return; }
    if(!el){ el=document.createElement('div'); el.id='invDia'; el.className='ivh-home'; el.addEventListener('click',clica); sc.parentElement.insertBefore(el,sc); sig=''; }
    let volta=$('ivhVolta'); if(!volta){ volta=document.createElement('button'); volta.id='ivhVolta'; volta.className='ivh-volta'; volta.textContent='← Voltar à tela inicial'; volta.addEventListener('click',()=>setLista(false)); sc.parentElement.insertBefore(volta,sc); }
    const rt=$('invRetoma'); if(rt&&naHome&&rt.nextElementSibling!==el) el.parentElement.insertBefore(rt,el); /* "Contagem em andamento · Continuar" fica em cima da tela inicial */
    el.style.display=naHome?'':'none'; if(!naHome) return;
    const D=dados(), n=new Date(); const s=JSON.stringify([D&&D.pronto,D&&D.hora,D&&D.xs.map(i=>[i.cod,i.m,i.feito,i.meu]),D&&D.meus,D&&D.meusItens,podeReceber(),podeAud(),hist(),recHoje(),n.getHours(),n.getMinutes()]);
    if(s===sig) return; sig=s;
    const nome=(typeof USUARIO_LOGADO!=='undefined'&&USUARIO_LOGADO&&USUARIO_LOGADO.nome)||''; const pri=String(nome).trim().split(/\s+/)[0]||'';
    const h=n.getHours(), oi=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
    const dsem=n.toLocaleDateString('pt-BR',{weekday:'long'}), dt=String(n.getDate()).padStart(2,'0')+'/'+String(n.getMonth()+1).padStart(2,'0');
    const xs=D?D.xs:[], rec=xs.filter(i=>i.m==='rec'&&!i.meu), outros=xs.filter(i=>i.meu), meusN=xs.filter(i=>!i.meu).length;
    const falta=xs.filter(i=>!i.feito&&!i.meu), feitos=xs.filter(i=>i.feito&&!i.meu).length, pct=meusN?Math.round(feitos/meusN*100):0;
    const [hh,mm]=String((D&&D.hora)||'07:30').split(':').map(Number), passou=n.getHours()*60+n.getMinutes()>(hh||0)*60+(mm||0);
    const ord=xs.filter(i=>!i.meu).sort((a,b)=>(a.feito-b.feito)||((b.m==='rec')-(a.m==='rec'))||(ondeI(a.it)-ondeI(b.it))||String(a.cod).localeCompare(String(b.cod))).concat(outros);
    const linha=i=>`<div class="ivh-it ${i.feito?'ok':''} ${i.m==='rec'&&!i.meu?'rec':''} ${i.meu?'meu':''}"><b>${esc(i.cod)}</b><span><span class="ivh-nm">${esc(i.it.name||'')}</span><small class="ivh-loc">${esc(onde(i.it))}</small></span><em>${i.meu?'outra pessoa reconta':i.feito?'✓ contado':MOT[i.m]||''}</em></div>`;
    const cartao=!D||(!D.pronto&&!xs.length)?`<div class="ivh-k">Contagem do dia</div><h2>A lista de hoje ainda está sendo montada…</h2><p class="ivh-s">Enquanto isso, use "Contar o que estou vendo".</p>`
      :`<div class="ivh-k">Contagem do dia</div><h2>${meusN} ${meusN===1?'item':'itens'} para contar hoje</h2>
        <div class="ivh-h ${passou?'pas':'ok'}">${ICO.relogio}<span>${passou?'<b>A expedição já começou</b> ('+esc(D.hora)+') · conte primeiro o que não está saindo agora':'<b>Dá tempo:</b> conte antes da expedição começar, até '+esc(D.hora)}</span></div>
        <div class="ivh-pg"><div class="ivh-anel" style="--p:${pct}"><i>${feitos}/${meusN}</i></div><div class="ivh-ns"><div><b>${falta.length}</b> para contar</div><div><b>${feitos}</b> já contados hoje</div>${rec.length?`<div class="r"><b>${rec.length}</b> ${rec.length===1?'recontagem pedida':'recontagens pedidas'} para você</div>`:''}${outros.length?`<div><b>${outros.length}</b> para outra pessoa recontar</div>`:''}</div></div>
        <div class="ivh-l">${ord.slice(0,6).map(linha).join('')}${ord.length>6?`<details class="ivh-mais"><summary>Ver a lista toda (${ord.length})</summary>${ord.slice(6).map(linha).join('')}</details>`:''}</div>
        ${falta.length?`<button class="ivh-go" data-a="dia">Começar a contagem do dia (${falta.length})  ›</button>`:`<div class="ivh-fim">✓ Tudo da lista de hoje que você pode contar já foi contado.</div>`}`;
    el.innerHTML=`<div class="ivh-oi"><h1>${oi}${pri?', '+esc(pri):''}</h1><span>${esc(dsem)}, ${dt}${locais()?' · '+esc(locais()):''}</span></div>
      <div class="ivh-g"><section class="ivh-c ivh-dia">${cartao}</section>
        <div class="ivh-lado"><button class="ivh-c ivh-t" data-a="achar"><span class="ivh-ic a">${ICO.busca}</span><span><b>Contar o que estou vendo</b><i>busque o item na sua frente, sem escolher antes</i></span></button>
        ${podeReceber()?(()=>{ const r=recHoje(); return `<button class="ivh-c ivh-t" data-a="receber"><span class="ivh-ic b">${ICO.caixa}</span><span><b>Receber material</b><i>${r.n?`${r.n} ${r.n===1?'recebimento':'recebimentos'} hoje${r.u?' · último às '+esc(r.u):''}`:'chegou nota? registre em 3 passos'}</i></span></button>`; })():''}
        <section class="ivh-c ivh-meus"><div class="ivh-k">Minhas contagens de hoje</div>${D&&D.meus?`<div class="ivh-mn"><b>${D.meus}</b> ${D.meus===1?'item contado':'itens contados'}${D.meusUlt?' · última às '+esc(D.meusUlt):''}</div><div class="ivh-mc">${(D.meusItens||[]).slice(0,8).map(c=>`<span>${esc(c)}</span>`).join('')}${(D.meusItens||[]).length>8?`<span>+${D.meusItens.length-8}</span>`:''}</div>`:'<div class="ivh-mn v">Você ainda não contou nada hoje.</div>'}</section></div></div>
      <div class="ivh-rod"><button data-a="lista">${ICO.lista}Escolher itens na lista</button><button data-a="hist">${ICO.hist}${hist()?'Esconder contagens anteriores':'Ver contagens anteriores'}</button><button data-a="pdf">${ICO.imp}Imprimir lista de contagem</button>${podeAud()?`<button data-a="aud">${ICO.aud}Auditoria</button>`:''}</div>`; }
  function clica(ev){ const b=ev.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='dia'){ const D=dados(); if(!D) return; const xs=D.xs.filter(i=>!i.feito&&!i.meu).map(i=>String(i.cod)); if(!xs.length) return;
      try{ CONF_ITENS_SEL.clear(); xs.forEach(c=>CONF_ITENS_SEL.add(c)); try{ atualizarBadgeSelConf(); }catch(e){} confIniciarConferencia(); }catch(e){ console.warn('[dia]',e); toast('Não consegui abrir a contagem do dia.'); } return; }
    if(a==='achar'){ const x=$('fcAcharBtn'); if(x) x.click(); else toast('Aguarde um instante e tente de novo.'); return; }
    if(a==='receber'){ try{ confMudarModo('recebimento'); }catch(e){} let k=0; const t=setInterval(()=>{ const r=$('fcRecBtn'); if(r||++k>20){ clearInterval(t); if(r) r.click(); } },150); return; }
    if(a==='lista'){ setLista(true); try{ window.scrollTo(0,0); }catch(e){} return; }
    if(a==='hist'){ try{ hist()?sessionStorage.removeItem('ivh.hist'):sessionStorage.setItem('ivh.hist','1'); }catch(e){} sig=''; desenha(); if(hist()){ const h=$('confHistBusca'); const c=h&&h.closest('.card'); if(c) setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'start'}),60); } return; }
    if(a==='aud'){ try{ confMudarModo('auditoria'); }catch(e){} return; }
    if(a==='pdf'){ try{ gerarPDFListaContagem(); }catch(e){ toast('Não consegui gerar a lista.'); } return; } }
  setInterval(()=>{ try{ desenha(); }catch(e){ console.warn('[dia]',e); } },800);
  document.head.insertAdjacentHTML('beforeend',`<style>
  body.ivh #fcAcharBtn, body.ivh #confSelCard, body.ivh .inv-bar{display:none!important}
  body.ivh .topbar>div:nth-child(2), body.ivh #mainTabs, body.ivh #subnavConferencia{display:none!important}
  body.ivh .topbar>div:last-child{margin-left:auto}
  body.ivh:not(.ivh-hist) #confModoContagemWrap .card:has(#confHistBusca){display:none!important}
  .ivh-home,.ivh-volta,body.ivh #invRetoma{--g:#F2F4F6;--sf:#FFFFFF;--ink:#1C2B33;--mu:#5E6E77;--fa:#A3B0B7;--ln:#E2E6EA;--sk:#EEF4F7;--ts:#143F54;--tl:#2B6A87;--tt:#E2ECF1;
    --ok:#3C8A63;--okt:#E3F0E9;--wn:#8A6A2A;--wnt:#F6EEDC;--cr:#B5473F;--crt:#F6E8E6;--lima:#7AC943;font-family:Archivo,'Archivo',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink)}
  body.ivh{background:#F2F4F6}
  .ivh-volta{display:none;margin:0 0 12px;border:0;background:none;color:var(--ts);font:inherit;font-weight:600;cursor:pointer;padding:10px 0;min-height:44px}
  body.ivh-lista .ivh-volta{display:inline-block}
  .ivh-home{margin:4px 0 14px} body.ivh #invRetoma{margin:6px 0 4px}
  .ivh-oi{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:10px 2px 16px}.ivh-oi h1{margin:0;font-size:32px;font-weight:650;letter-spacing:-.02em;color:var(--ts)}.ivh-oi span{color:var(--mu);font-size:15px}
  .ivh-g{display:grid;grid-template-columns:1.35fr 1fr;gap:16px;align-items:start}.ivh-lado{display:grid;gap:16px}
  .ivh-c{background:var(--sf);border-radius:18px;padding:20px 22px;border:0;box-shadow:0 1px 2px rgba(16,32,40,.05),0 8px 24px rgba(16,32,40,.06)}
  .ivh-dia{display:flex;flex-direction:column}.ivh-k{font-size:11.5px;letter-spacing:.09em;color:var(--mu);text-transform:uppercase;font-weight:500}
  .ivh-dia h2{margin:6px 0 12px;font-size:24px;font-weight:650;letter-spacing:-.01em;color:var(--ts)}.ivh-s{color:var(--mu)}
  .ivh-h{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:12px;font-size:15px}.ivh-h svg{width:20px;height:20px;flex:none}
  .ivh-h.ok{background:var(--okt);color:var(--ok)}.ivh-h.pas{background:var(--wnt);color:var(--wn)}
  .ivh-pg{display:flex;align-items:center;gap:18px;margin:16px 0}.ivh-anel{width:92px;height:92px;flex:none;border-radius:50%;background:conic-gradient(var(--ts) calc(var(--p)*1%),var(--tt) 0);display:grid;place-items:center}
  .ivh-anel i{width:72px;height:72px;border-radius:50%;background:var(--sf);display:grid;place-items:center;font-style:normal;font-size:20px;font-weight:600;color:var(--ts)}
  .ivh-ns div{margin:2px 0;color:var(--mu)}.ivh-ns b{font-size:26px;font-weight:300;margin-right:6px;color:var(--ts)}.ivh-ns .r b{color:var(--cr)}
  .ivh-l{display:grid;gap:6px;margin:4px 0 16px}.ivh-it{display:flex;gap:12px;align-items:center;padding:9px 12px;border-radius:12px;background:var(--sk);font-size:15px;min-width:0}
  .ivh-it>b{color:var(--ts);font-weight:600}.ivh-it>span{display:flex;flex-direction:column;min-width:0}.ivh-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ivh-loc{font-size:12px;color:var(--mu)}
  .ivh-it em{margin-left:auto;flex:none;font-style:normal;font-size:12px;padding:3px 10px;border-radius:999px;background:var(--tt);color:var(--tl);display:inline-flex;align-items:center;gap:6px}
  .ivh-it em::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
  .ivh-it.rec{background:var(--crt)}.ivh-it.rec em{background:#fff;color:var(--cr)}.ivh-it.ok,.ivh-it.meu{opacity:.55}
  .ivh-mais summary{cursor:pointer;color:var(--ts);font-weight:500;padding:10px 2px;min-height:44px}.ivh-mais .ivh-it{margin-top:6px}
  .ivh-go{margin-top:auto;border:0;border-radius:12px;background:var(--ts);color:#fff;font:inherit;font-size:20px;font-weight:600;padding:18px;width:100%;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 2px rgba(16,32,40,.14)}
  .ivh-go:active{transform:translateY(1px)}
  .ivh-fim{margin-top:auto;padding:14px;border-radius:12px;background:var(--okt);color:var(--ok);font-weight:500}
  .ivh-t{display:flex;gap:16px;align-items:center;text-align:left;font:inherit;color:inherit;cursor:pointer;min-height:96px}
  .ivh-t b{display:block;font-size:19px;font-weight:600;color:var(--ts)}.ivh-t i{display:block;font-style:normal;color:var(--mu);font-size:14px;margin-top:3px}
  .ivh-ic{width:52px;height:52px;flex:none;border-radius:14px;display:grid;place-items:center;background:var(--tt);color:var(--ts)}
  .ivh-meus .ivh-mn{margin:8px 0 8px;color:var(--mu)}.ivh-meus .ivh-mn b{font-size:26px;font-weight:300;color:var(--ts);margin-right:4px}.ivh-mn.v{color:var(--mu)}
  .ivh-mc{display:flex;flex-wrap:wrap;gap:6px}.ivh-mc span{font-size:12px;padding:4px 10px;border-radius:999px;background:var(--sk);color:var(--ts)}
  .ivh-rod{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 0}
  .ivh-rod button{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 16px;border-radius:12px;border:1px solid var(--ln);background:var(--sf);color:var(--ts);font:inherit;font-size:15px;font-weight:500;cursor:pointer}
  .ivh-rod button svg{width:20px;height:20px;color:var(--tl)}
  @media (max-width:820px){ .ivh-g{grid-template-columns:1fr} .ivh-t{min-height:0} .ivh-pg{margin:12px 0} .ivh-dia .ivh-go{order:5;margin:4px 0 14px} .ivh-dia .ivh-l{order:6} .ivh-dia .ivh-fim{order:5;margin:4px 0 14px} .ivh-rod button{flex:1 1 45%} .ivh-oi h1{font-size:28px} }
  </style>`);
})();
