/* Inventário · "Contagem do dia" (pedido de 04/11). Cartão no alto da escolha de itens com a lista que o painel montou
   (Painel.inv.dia(): recontagens pedidas para outra pessoa, giro alto e rodízio), para contar antes da expedição começar.
   "Começar a contagem do dia" marca os itens que faltam (só os que a pessoa pode contar) e abre a conferência de sempre
   (CONF_ITENS_SEL + confIniciarConferencia). Recontagem de item que a própria pessoa contou fica de fora: precisa de outra pessoa. */
(function(){
  const $=id=>document.getElementById(id), esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const P=()=>{ try{ return (window.parent!==window&&window.parent.Painel&&window.parent.Painel.inv)||null; }catch(e){ return null; } };
  const fonte=()=>(typeof CONF_ITEMS!=='undefined'&&CONF_ITEMS.length?CONF_ITEMS:(typeof ITEMS!=='undefined'?ITEMS:[]))||[];
  function pode(it){ let cp={}, ff=''; try{ cp=confPerm()||{}; }catch(e){} try{ ff=confPerfilFiltro()||''; }catch(e){}
    const mp={almox3:'temAlmox3',almox30:'temAlmox30',rejunte:'temRejunte',separacao:'temSeparacao',almox1:'temAlmox1',almox2:'temAlmox2'};
    if(ff&&mp[ff]&&!it[mp[ff]]) return false; if(cp.acessoTotal) return true;
    return !!((it.temAlmox3&&cp.podeContarAlmox3)||(it.temAlmox30&&cp.podeContarAlmox30)||(it.temRejunte&&cp.podeContarRejunte)||(it.temSeparacao&&cp.podeContarSeparacao)||(it.temAlmox1&&cp.podeContarAlmox1)||(it.temAlmox2&&cp.podeContarAlmox2)); }
  function dados(){ const p=P(); if(!p||!p.dia) return null; const D=p.dia(); if(!D) return null; const F=fonte();
    const xs=(D.itens||[]).map(i=>Object.assign({},i,{it:F.find(x=>String(x.cod)===String(i.cod))})).filter(i=>i.it&&pode(i.it)); return Object.assign({},D,{xs}); }
  const MOT={rec:'recontar',giro:'giro alto',rod:'rodízio'};
  let sig='';
  function desenha(){ const sc=$('confSelCard'); if(!sc||typeof CONF_MODO==='undefined') return; let el=$('invDia');
    if(CONF_MODO!=='selecao'||sc.style.display==='none'){ if(el) el.style.display='none'; return; }
    let pf={}; try{ pf=perfil(); }catch(e){} if(!pf.podeConferir&&!pf.podeAdmin){ if(el) el.remove(); return; }
    const D=dados(); const s=JSON.stringify(D&&[D.pronto,D.hora,D.xs.map(i=>[i.cod,i.m,i.feito,i.meu])]);
    if(!el){ el=document.createElement('div'); el.id='invDia'; el.className='card ivd'; el.addEventListener('click',clica); const ach=$('fcAcharBtn'); (ach||sc).parentElement.insertBefore(el,ach||sc); sig=''; }
    el.style.display=''; if(s===sig) return; sig=s;
    if(!D||(!D.pronto&&!D.xs.length)){ el.innerHTML='<div class="ivd-t1">Contagem do dia</div><div class="ivd-s">A lista de hoje ainda está sendo montada…</div>'; return; }
    const falta=D.xs.filter(i=>!i.feito&&!i.meu), feitos=D.xs.filter(i=>i.feito).length, outros=D.xs.filter(i=>i.meu).length;
    const [hh,mm]=String(D.hora||'07:30').split(':').map(Number), n=new Date(), passou=n.getHours()*60+n.getMinutes()>(hh||0)*60+(mm||0);
    const dt=String(D.dia||'').split('-');
    el.innerHTML=`<div class="ivd-t1">Contagem do dia${dt.length===3?' · '+dt[2]+'/'+dt[1]:''}</div>
      <div class="ivd-s">${passou?'<b class="ivd-w">A expedição já começou ('+esc(D.hora)+').</b> Conte primeiro o que não está saindo agora.':'Conte antes da expedição começar: até <b>'+esc(D.hora)+'</b>.'}</div>
      <div class="ivd-n"><span><b>${falta.length}</b> para contar</span><span><b>${feitos}</b> já contados hoje</span>${outros?`<span><b>${outros}</b> para outra pessoa recontar</span>`:''}</div>
      ${falta.length?`<button class="ivd-go" data-a="dia">Começar a contagem do dia (${falta.length})</button>`:`<div class="ivd-ok">✓ Tudo da lista de hoje que você pode contar já foi contado.</div>`}
      <details class="ivd-dl"><summary>Ver a lista</summary><div class="ivd-l">${D.xs.map(i=>`<div class="ivd-i ${i.feito?'ok':''} ${i.m==='rec'?'rec':''}"><b>${esc(i.cod)}</b><span>${esc(i.it.name||'')}</span><em>${i.meu?'recontagem · outra pessoa precisa contar':MOT[i.m]||''}${i.feito?' · ✓ contado':''}</em></div>`).join('')}</div></details>`; }
  function clica(ev){ const b=ev.target.closest('[data-a]'); if(!b) return; if(b.dataset.a!=='dia') return; const D=dados(); if(!D) return;
    const xs=D.xs.filter(i=>!i.feito&&!i.meu).map(i=>String(i.cod)); if(!xs.length) return;
    try{ CONF_ITENS_SEL.clear(); xs.forEach(c=>CONF_ITENS_SEL.add(c)); try{ atualizarBadgeSelConf(); }catch(e){} confIniciarConferencia(); }catch(e){ console.warn('[dia]',e); toast('Não consegui abrir a contagem do dia.'); } }
  setInterval(()=>{ try{ desenha(); }catch(e){ console.warn('[dia]',e); } },800);
  document.head.insertAdjacentHTML('beforeend',`<style>
  .ivd{margin-bottom:14px;border:2px solid var(--accent,#14706A)!important}
  .ivd-t1{font-size:20px;font-weight:600}.ivd-s{margin:4px 0 10px;color:var(--text2,#555)}.ivd-w{color:#B45309}
  .ivd-n{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px;font-size:14px}.ivd-n b{font-size:22px;margin-right:4px}
  .ivd-go{width:100%;min-height:56px;border:0;border-radius:12px;background:var(--accent,#14706A);color:#fff;font:inherit;font-size:18px;font-weight:600;cursor:pointer}
  .ivd-ok{padding:12px;border-radius:10px;background:#E8F5EE;color:#1F6B45;font-weight:500}
  .ivd-dl{margin-top:10px}.ivd-dl summary{cursor:pointer;color:var(--accent,#14706A)}
  .ivd-l{display:grid;gap:6px;margin-top:8px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
  .ivd-i{display:flex;flex-direction:column;padding:8px 10px;border-radius:10px;background:var(--bg3,#F1F4F6);font-size:13px}.ivd-i em{font-style:normal;font-size:12px;color:var(--text3,#777)}
  .ivd-i.ok{opacity:.55}.ivd-i.rec{background:#FDECEC}
  </style>`);
})();
