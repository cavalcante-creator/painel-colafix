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
  let sig='';
  function desenha(){ const sc=$('confSelCard'), wrap=$('confModoContagemWrap'); if(!sc||typeof CONF_MODO==='undefined') return; let el=$('invDia');
    let pf={}; try{ pf=perfil(); }catch(e){} const conta=!!(pf.podeConferir||pf.podeAdmin);
    const naHome=conta&&CONF_MODO==='selecao'&&!lista()&&(!wrap||wrap.style.display!=='none');
    document.body.classList.toggle('ivh',naHome); document.body.classList.toggle('ivh-lista',conta&&CONF_MODO==='selecao'&&lista());
    if(!conta){ if(el) el.remove(); return; }
    if(!el){ el=document.createElement('div'); el.id='invDia'; el.className='ivh-home'; el.addEventListener('click',clica); sc.parentElement.insertBefore(el,sc); sig=''; }
    let volta=$('ivhVolta'); if(!volta){ volta=document.createElement('button'); volta.id='ivhVolta'; volta.className='ivh-volta'; volta.textContent='← Voltar à tela inicial'; volta.addEventListener('click',()=>setLista(false)); sc.parentElement.insertBefore(volta,sc); }
    const rt=$('invRetoma'); if(rt&&naHome&&rt.nextElementSibling!==el) el.parentElement.insertBefore(rt,el); /* "Contagem em andamento · Continuar" fica em cima da tela inicial */
    el.style.display=naHome?'':'none'; if(!naHome) return;
    const D=dados(), n=new Date(); const s=JSON.stringify([D&&D.pronto,D&&D.hora,D&&D.xs.map(i=>[i.cod,i.m,i.feito,i.meu]),D&&D.meus,podeReceber(),n.getHours(),n.getMinutes()]);
    if(s===sig) return; sig=s;
    const nome=(typeof USUARIO_LOGADO!=='undefined'&&USUARIO_LOGADO&&USUARIO_LOGADO.nome)||''; const pri=String(nome).trim().split(/\s+/)[0]||'';
    const h=n.getHours(), oi=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
    const dsem=n.toLocaleDateString('pt-BR',{weekday:'long'}), dt=String(n.getDate()).padStart(2,'0')+'/'+String(n.getMonth()+1).padStart(2,'0');
    const xs=D?D.xs:[], rec=xs.filter(i=>i.m==='rec'&&!i.meu), outros=xs.filter(i=>i.meu), meusN=xs.filter(i=>!i.meu).length;
    const falta=xs.filter(i=>!i.feito&&!i.meu), feitos=xs.filter(i=>i.feito&&!i.meu).length, pct=meusN?Math.round(feitos/meusN*100):0;
    const [hh,mm]=String((D&&D.hora)||'07:30').split(':').map(Number), passou=n.getHours()*60+n.getMinutes()>(hh||0)*60+(mm||0);
    const ord=xs.filter(i=>!i.meu).sort((a,b)=>(a.feito-b.feito)||((b.m==='rec')-(a.m==='rec'))).concat(outros);
    const linha=i=>`<div class="ivh-it ${i.feito?'ok':''} ${i.m==='rec'&&!i.meu?'rec':''} ${i.meu?'meu':''}"><b>${esc(i.cod)}</b><span>${esc(i.it.name||'')}</span><em>${i.meu?'outra pessoa reconta':i.feito?'✓ contado':MOT[i.m]||''}</em></div>`;
    const cartao=!D||(!D.pronto&&!xs.length)?`<div class="ivh-k">Contagem do dia</div><h2>A lista de hoje ainda está sendo montada…</h2><p class="ivh-s">Enquanto isso, use "Contar o que estou vendo".</p>`
      :`<div class="ivh-k">Contagem do dia</div><h2>${meusN} ${meusN===1?'item':'itens'} para contar hoje</h2>
        <div class="ivh-h ${passou?'pas':''}">${passou?'A expedição já começou ('+esc(D.hora)+'): conte primeiro o que não está saindo agora.':'Conte antes da expedição começar: até '+esc(D.hora)+'.'}</div>
        <div class="ivh-pg"><div class="ivh-anel" style="--p:${pct}"><i>${feitos}/${meusN}</i></div><div class="ivh-ns"><div><b>${falta.length}</b> para contar</div><div><b>${feitos}</b> já contados hoje</div>${rec.length?`<div class="r"><b>${rec.length}</b> ${rec.length===1?'recontagem pedida':'recontagens pedidas'} para você</div>`:''}${outros.length?`<div><b>${outros.length}</b> para outra pessoa recontar</div>`:''}</div></div>
        <div class="ivh-l">${ord.slice(0,6).map(linha).join('')}${ord.length>6?`<details class="ivh-mais"><summary>Ver a lista toda (${ord.length})</summary>${ord.slice(6).map(linha).join('')}</details>`:''}</div>
        ${falta.length?`<button class="ivh-go" data-a="dia">Começar a contagem do dia (${falta.length})  ›</button>`:`<div class="ivh-fim">✓ Tudo da lista de hoje que você pode contar já foi contado.</div>`}`;
    el.innerHTML=`<div class="ivh-oi"><h1>${oi}${pri?', '+esc(pri):''}</h1><span>${esc(dsem)}, ${dt}${locais()?' · '+esc(locais()):''}</span></div>
      <div class="ivh-g"><section class="ivh-c ivh-dia">${cartao}</section>
        <div class="ivh-lado"><button class="ivh-c ivh-t" data-a="achar"><span class="ivh-ic a">🔍</span><span><b>Contar o que estou vendo</b><i>busque o item na sua frente, sem escolher antes</i></span></button>
        ${podeReceber()?`<button class="ivh-c ivh-t" data-a="receber"><span class="ivh-ic b">📦</span><span><b>Receber material</b><i>chegou nota? registre em 3 passos</i></span></button>`:''}</div></div>
      <div class="ivh-rod">${D&&D.meus?`<span>Hoje você contou ${D.meus} ${D.meus===1?'item':'itens'}${D.meusUlt?' · última às '+esc(D.meusUlt):''}</span>`:''}<button data-a="lista">Escolher itens na lista</button><button data-a="pdf">Imprimir lista de contagem</button></div>`; }
  function clica(ev){ const b=ev.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='dia'){ const D=dados(); if(!D) return; const xs=D.xs.filter(i=>!i.feito&&!i.meu).map(i=>String(i.cod)); if(!xs.length) return;
      try{ CONF_ITENS_SEL.clear(); xs.forEach(c=>CONF_ITENS_SEL.add(c)); try{ atualizarBadgeSelConf(); }catch(e){} confIniciarConferencia(); }catch(e){ console.warn('[dia]',e); toast('Não consegui abrir a contagem do dia.'); } return; }
    if(a==='achar'){ const x=$('fcAcharBtn'); if(x) x.click(); else toast('Aguarde um instante e tente de novo.'); return; }
    if(a==='receber'){ try{ confMudarModo('recebimento'); }catch(e){} let k=0; const t=setInterval(()=>{ const r=$('fcRecBtn'); if(r||++k>20){ clearInterval(t); if(r) r.click(); } },150); return; }
    if(a==='lista'){ setLista(true); try{ window.scrollTo(0,0); }catch(e){} return; }
    if(a==='pdf'){ try{ gerarPDFListaContagem(); }catch(e){ toast('Não consegui gerar a lista.'); } return; } }
  setInterval(()=>{ try{ desenha(); }catch(e){ console.warn('[dia]',e); } },800);
  document.head.insertAdjacentHTML('beforeend',`<style>
  body.ivh #fcAcharBtn, body.ivh #confSelCard, body.ivh .inv-bar{display:none!important}
  .ivh-volta{display:none;margin:0 0 12px;border:0;background:none;color:var(--accent,#14706A);font:inherit;font-weight:500;cursor:pointer;padding:6px 0}
  body.ivh-lista .ivh-volta{display:inline-block}
  .ivh-home{margin:4px 0 14px}
  body.ivh #invRetoma{margin:6px 0 4px}
  .ivh-oi{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:6px 2px 14px}.ivh-oi h1{margin:0;font-size:28px;font-weight:600;color:var(--text,#143F54)}.ivh-oi span{color:var(--text3,#6B7C88);font-size:15px}
  .ivh-g{display:grid;grid-template-columns:1.35fr 1fr;gap:16px}.ivh-lado{display:grid;gap:16px;align-content:stretch}
  .ivh-c{background:#fff;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(16,40,56,.06),0 6px 18px rgba(16,40,56,.06);border:0}
  .ivh-dia{display:flex;flex-direction:column}.ivh-k{font-size:12px;letter-spacing:.08em;color:var(--text3,#6B7C88);text-transform:uppercase}
  .ivh-dia h2{margin:6px 0 2px;font-size:24px;font-weight:600}.ivh-h{color:var(--text2,#405866)}.ivh-h.pas{color:#B45309;font-weight:500}.ivh-s{color:var(--text3,#6B7C88)}
  .ivh-pg{display:flex;align-items:center;gap:18px;margin:16px 0}.ivh-anel{width:92px;height:92px;flex:none;border-radius:50%;background:conic-gradient(#14706A calc(var(--p)*1%),#E3EAEE 0);display:grid;place-items:center}
  .ivh-anel i{width:70px;height:70px;border-radius:50%;background:#fff;display:grid;place-items:center;font-style:normal;font-size:20px;font-weight:700}
  .ivh-ns div{margin:2px 0;color:var(--text2,#405866)}.ivh-ns b{font-size:22px;margin-right:4px;color:var(--text,#143F54)}.ivh-ns .r b{color:#B42318}
  .ivh-l{display:grid;gap:6px;margin:4px 0 16px}.ivh-it{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:10px;background:#F3F6F8;font-size:15px;min-width:0}
  .ivh-it span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.ivh-it em{margin-left:auto;flex:none;font-style:normal;font-size:12px;padding:3px 9px;border-radius:999px;background:#E3EAEE}
  .ivh-it.rec{background:#FDECEC}.ivh-it.rec em{background:#F7C9C9;color:#9B1C1C}.ivh-it.ok,.ivh-it.meu{opacity:.55}
  .ivh-mais summary{cursor:pointer;color:var(--accent,#14706A);padding:6px 2px}.ivh-mais .ivh-it{margin-top:6px}
  .ivh-go{margin-top:auto;border:0;border-radius:14px;background:#14706A;color:#fff;font:inherit;font-size:21px;font-weight:600;padding:19px;width:100%;cursor:pointer}
  .ivh-fim{margin-top:auto;padding:14px;border-radius:12px;background:#E8F5EE;color:#1F6B45;font-weight:500}
  .ivh-t{display:flex;gap:16px;align-items:center;text-align:left;font:inherit;color:inherit;cursor:pointer;min-height:120px}
  .ivh-t b{display:block;font-size:20px;color:var(--text,#143F54)}.ivh-t i{display:block;font-style:normal;color:var(--text3,#6B7C88);font-size:14px;margin-top:4px}
  .ivh-ic{width:56px;height:56px;flex:none;border-radius:14px;display:grid;place-items:center;font-size:28px}.ivh-ic.a{background:#E6F2F1}.ivh-ic.b{background:#EEF0FB}
  .ivh-rod{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;margin:14px 2px 0;color:var(--text3,#6B7C88);font-size:14px}
  .ivh-rod button{border:0;background:none;color:var(--accent,#14706A);font:inherit;cursor:pointer;padding:6px 0;text-decoration:underline;text-underline-offset:3px}
  @media (max-width:820px){ .ivh-g{grid-template-columns:1fr} .ivh-t{min-height:0} }
  </style>`);
})();
