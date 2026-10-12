/* Pedir ajuste (12/10): só no login da administradora.
   Botão no topo → anota o que mudar; o painel guarda a tela, o aparelho e uma foto da tela.
   Lista dos pedidos com "Copiar para o Claude" (texto pronto para colar na conversa).
   Dados: melhorias/{id} {texto, tela, telaNome, aparelho, largura, foto (jpeg base64, pequena), status 'aberto'|'enviado'|'feito', em, por} */
(function(){
  const P=window.Painel; if(!P) return;
  const COL='melhorias', esc=s=>P.esc(s);
  const R={aberto:false, lista:null, texto:'', foto:true, salv:false, ver:null, fil:'abertos'};
  const telaNome=()=>{ const h=document.querySelector('#view h1'); const c=document.querySelector('.crumb,.tp-crumb,[data-crumb]'); return ((h&&h.innerText)||(c&&c.innerText)||P.S.view||'').replace(/\s+/g,' ').trim().slice(0,80); };
  const aparelho=()=>{ const w=window.innerWidth; return w<700?'celular':w<1100?'tablet':'computador'; };
  const quando=iso=>{ try{ return P.dm(String(iso).slice(0,10))+' '+P.hora(iso); }catch(e){ return ''; } };
  const carregarJs=src=>new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); });

  /* botão no topo, só para a dona */
  function botao(){ const sino=document.getElementById('tp-sino'); const ja=document.getElementById('tp-ajuste');
    if(!P.dono()){ if(ja) ja.remove(); return; }
    if(sino&&!ja){ const b=document.createElement('button'); b.className='tp-ib'; b.id='tp-ajuste'; b.title='Pedir ajuste (anotar uma mudança para o Claude)'; b.setAttribute('aria-label','Pedir ajuste');
      b.innerHTML=P.ic('editar',18,2)+'<b id="tp-ajn" hidden></b>'; sino.parentNode.insertBefore(b,sino); contar(); } }
  let contado=false;
  async function contar(){ if(contado||!P.dono()||!P.db()) return; contado=true; try{ const s=await P.db().collection(COL).where('status','==','aberto').limit(50).get(); marcaN((s.docs||[]).length); }catch(e){ contado=false; } }
  function marcaN(n){ const b=document.getElementById('tp-ajn'); if(b){ b.hidden=!n; b.textContent=n>49?'50+':n; } }
  let pend=false; new MutationObserver(()=>{ if(!pend){ pend=true; requestAnimationFrame(()=>{ pend=false; botao(); }); } }).observe(document.body,{childList:true,subtree:true});

  async function lerLista(){ try{ const s=await P.db().collection(COL).orderBy('em','desc').limit(150).get(); R.lista=(s.docs||[]).map(d=>Object.assign({_id:d.id},d.data())); }
    catch(e){ R.lista=[]; P.erro(e); } marcaN(R.lista.filter(x=>x.status==='aberto').length); desenha(); }

  function abrir(){ R.aberto=true; R.texto=''; R.ver=null; R.tela={v:P.S.view, n:telaNome(), a:aparelho(), w:window.innerWidth}; desenha(); lerLista();
    setTimeout(()=>{ const t=document.getElementById('mlh-txt'); if(t) t.focus(); },50); }
  function fechar(){ R.aberto=false; const el=document.getElementById('mlh-pnl'); if(el) el.remove(); }

  function txtClaude(xs){ return 'Pedidos de ajuste do painel ('+xs.length+'):\n\n'+xs.map((x,i)=>`${i+1}. [${x.telaNome||x.tela||'?'} · ${x.aparelho||''}] ${x.texto}${x.quem?' (pediu: '+x.quem+')':''} — ${quando(x.em)}`).join('\n'); }

  function desenha(){ if(!R.aberto) return; let el=document.getElementById('mlh-pnl');
    if(!el){ el=document.createElement('div'); el.id='mlh-pnl'; el.className='mlh-fundo'; document.body.appendChild(el); }
    const L=R.lista, ab=L?L.filter(x=>x.status!=='feito'):[], xs=L?(R.fil==='abertos'?ab:L):[], v=R.ver&&L&&L.find(x=>x._id===R.ver);
    el.innerHTML=`<section class="mlh-box" role="dialog" aria-label="Pedir ajuste">
      <div class="head" style="align-items:baseline;margin:0 0 6px"><h2 style="margin:0">Pedir ajuste</h2><button class="lnk" data-act="mlh-x">Fechar</button></div>
      <div class="sub" style="margin:0 0 8px">Tela: <b>${esc(R.tela.n||'—')}</b> · ${esc(R.tela.a)} (${R.tela.w}px)</div>
      <textarea class="txt" id="mlh-txt" rows="3" placeholder="O que mudar? Ex.: o técnico não acha o botão de concluir no celular">${esc(R.texto)}</textarea>
      <div class="mlh-l2"><input class="txt" id="mlh-quem" placeholder="Quem pediu (opcional)"><label class="ck"><input type="checkbox" id="mlh-foto" ${R.foto?'checked':''}> Guardar foto da tela</label>
        <button class="btn" data-act="mlh-salvar" ${R.salv?'disabled':''}>${R.salv?'Salvando…':'Anotar'}</button></div>
      <div class="mlh-lh"><div class="seg" role="group"><button data-act="mlh-fil" data-v="abertos" aria-pressed="${R.fil==='abertos'}">Para fazer · ${ab.length}</button><button data-act="mlh-fil" data-v="todos" aria-pressed="${R.fil==='todos'}">Todos</button></div>
        ${ab.length?`<button class="btn" data-act="mlh-copiar">Copiar para o Claude (${ab.length})</button>`:''}</div>
      ${L==null?'<div class="empty">Carregando…</div>':xs.length?`<div class="mlh-lst">${xs.map(x=>`<div class="mlh-it ${x.status}">
          <div class="mlh-tx"><b>${esc(x.texto)}</b><small>${esc(x.telaNome||x.tela||'')} · ${esc(x.aparelho||'')}${x.quem?' · '+esc(x.quem):''} · ${quando(x.em)}</small></div>
          <div class="mlh-ac"><span class="pill ${x.status==='feito'?'ok':x.status==='enviado'?'teal':'warn'}">${x.status==='feito'?'Feito':x.status==='enviado'?'Enviado':'Para fazer'}</span>
            ${x.foto?`<button class="lnk" data-act="mlh-foto" data-id="${x._id}">${R.ver===x._id?'Esconder foto':'Ver foto'}</button>`:''}
            ${x.status!=='feito'?`<button class="lnk" data-act="mlh-feito" data-id="${x._id}">Feito</button>`:''}<button class="lnk" data-act="mlh-del" data-id="${x._id}" style="color:var(--crit-ink)">Apagar</button></div>
          ${R.ver===x._id&&x.foto?`<img class="mlh-img" src="${x.foto}" alt="Foto da tela">`:''}</div>`).join('')}</div>`:`<div class="empty">${R.fil==='abertos'?'Nenhum pedido para fazer.':'Nenhum pedido anotado.'}</div>`}
    </section>`; }

  async function foto(){ try{ if(!window.html2canvas) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const pn=document.getElementById('mlh-pnl'); if(pn) pn.style.visibility='hidden';
      const esc2=Math.min(1,900/window.innerWidth);
      const cv=await window.html2canvas(document.body,{scale:esc2,logging:false,useCORS:true,width:window.innerWidth,height:window.innerHeight,x:window.scrollX,y:window.scrollY,windowWidth:window.innerWidth,windowHeight:window.innerHeight});
      if(pn) pn.style.visibility='';
      let q=.6, u=cv.toDataURL('image/jpeg',q); while(u.length>380000&&q>.2){ q-=.15; u=cv.toDataURL('image/jpeg',q); } return u.length<=400000?u:null; }
    catch(e){ const pn=document.getElementById('mlh-pnl'); if(pn) pn.style.visibility=''; console.warn('[ajuste] foto',e); return null; } }

  document.addEventListener('input',ev=>{ if(ev.target.id==='mlh-txt') R.texto=ev.target.value; if(ev.target.id==='mlh-foto') R.foto=ev.target.checked; });
  document.addEventListener('change',ev=>{ if(ev.target.id==='mlh-foto') R.foto=ev.target.checked; });
  document.addEventListener('keydown',ev=>{ if(R.aberto&&ev.key==='Escape') fechar(); });
  document.addEventListener('click',async ev=>{
    if(ev.target.closest&&ev.target.closest('#tp-ajuste')){ if(R.aberto) fechar(); else abrir(); return; }
    if(R.aberto&&ev.target.id==='mlh-pnl'){ fechar(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="mlh-"]'); if(!b||!P.dono()) return; const a=b.dataset.act, id=b.dataset.id;
    if(a==='mlh-x'){ fechar(); return; }
    if(a==='mlh-fil'){ R.fil=b.dataset.v; desenha(); return; }
    if(a==='mlh-foto'){ R.ver=R.ver===id?null:id; desenha(); return; }
    if(a==='mlh-salvar'){ const t=(document.getElementById('mlh-txt').value||'').trim(); if(!t) return P.toast('Escreva o que mudar.');
      const quem=(document.getElementById('mlh-quem').value||'').trim(); R.salv=true; desenha();
      try{ const f=R.foto?await foto():null; const agora=new Date().toISOString();
        await P.db().collection(COL).add({texto:t,quem:quem||null,tela:R.tela.v||'',telaNome:R.tela.n||'',aparelho:R.tela.a,largura:R.tela.w,foto:f,status:'aberto',em:agora,por:P.S.uid||null});
        R.texto=''; P.toast('Anotado'+(R.foto&&!f?' (sem foto)':'')+'.'); }
      catch(e){ P.erro(e); } R.salv=false; await lerLista(); return; }
    if(a==='mlh-copiar'){ const xs=(R.lista||[]).filter(x=>x.status!=='feito').slice().reverse(); const t=txtClaude(xs);
      try{ await navigator.clipboard.writeText(t); }catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e2){} ta.remove(); }
      for(const x of xs) if(x.status==='aberto'){ try{ await P.db().doc(COL+'/'+x._id).update({status:'enviado',enviadoEm:new Date().toISOString()}); x.status='enviado'; }catch(e){} }
      marcaN(0); desenha(); P.toast('Copiado. Cole na conversa com o Claude.'); return; }
    if(a==='mlh-feito'){ try{ await P.db().doc(COL+'/'+id).update({status:'feito',feitoEm:new Date().toISOString()}); const x=R.lista.find(y=>y._id===id); if(x) x.status='feito'; }catch(e){ P.erro(e); } marcaN(R.lista.filter(x=>x.status==='aberto').length); desenha(); return; }
    if(a==='mlh-del'){ if(!confirm('Apagar este pedido?')) return; try{ await P.db().doc(COL+'/'+id).delete(); R.lista=R.lista.filter(x=>x._id!==id); }catch(e){ P.erro(e); } marcaN(R.lista.filter(x=>x.status==='aberto').length); desenha(); return; }
  });

  document.head.insertAdjacentHTML('beforeend',`<style id="mlh-css">
    #tp-ajuste b{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:9px;background:var(--warn);color:#fff;font-size:11px;display:grid;place-items:center;padding:0 4px}
    .mlh-fundo{position:fixed;inset:0;background:rgba(20,30,40,.35);z-index:9000;display:flex;justify-content:flex-end}
    .mlh-box{background:var(--surface);width:min(560px,100%);height:100%;overflow:auto;padding:18px 18px 28px;box-shadow:-8px 0 30px rgba(0,0,0,.18)}
    .mlh-box textarea{width:100%;resize:vertical;min-height:80px}
    .mlh-l2{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0 16px}.mlh-l2 .txt{flex:1;min-width:160px}
    .mlh-lh{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:14px;margin-bottom:8px}
    .mlh-it{display:grid;grid-template-columns:1fr auto;gap:6px 10px;padding:10px 0;border-bottom:1px solid var(--line)}.mlh-it.feito .mlh-tx b{color:var(--muted);text-decoration:line-through}
    .mlh-tx b{display:block;font-weight:600}.mlh-tx small{color:var(--muted);font-size:12px}
    .mlh-ac{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
    .mlh-img{grid-column:1/-1;width:100%;border:1px solid var(--line);border-radius:8px}
    @media(max-width:600px){.mlh-it{grid-template-columns:1fr}.mlh-ac{justify-content:flex-start}}
  </style>`);
})();
