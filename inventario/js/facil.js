/* Inventário · modo fácil (tablet): contagem "um item por vez" e recebimento em 3 passos, com teclado numérico grande.
   Não muda a lógica: os números vão para os mesmos campos (confMain_*, data-pp, rasgado, zero, recebQtd/Data/Obs) e
   disparam as mesmas funções (updateConf, mudarPalete, setQtdRasgadaConf, setConfirmarZeroConf, salvarConferencia,
   selecionarItemRecebimento, salvarRecebimento). */
(function(){
  const $=id=>document.getElementById(id), esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toque=()=>{ try{ return matchMedia('(pointer:coarse)').matches; }catch(e){ return false; } };
  const fonte=()=>(typeof CONF_ITEMS!=='undefined'&&CONF_ITEMS.length?CONF_ITEMS:ITEMS)||[];
  const dispara=(el,tipo)=>el&&el.dispatchEvent(new Event(tipo,{bubbles:true}));
  const teclado=()=>`<div class="fc-tec">${['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(k=>`<button data-k="${k}" aria-label="${k==='⌫'?'Apagar':k==='C'?'Limpar':k}">${k}</button>`).join('')}</div>`;
  function digita(v,k){ v=String(v||''); if(k==='⌫') return v.slice(0,-1); if(k==='C') return ''; if(v==='0') v=''; return (v+k).slice(0,6); }

  /* ================= CONTAGEM: UM ITEM POR VEZ ================= */
  const F={on:false,i:0,campo:null,rev:false,modo:'lista',tela:'busca',q:'',cod:null,fam:''};
  const itens=()=>[...(CONF_ITENS_SEL||[])].filter(c=>$('confCard_'+c));
  const contado=c=>window.invTablet?window.invTablet.contado(c):false;
  function campos(cod){ const card=$('confCard_'+cod); if(!card) return [];
    const blocos=[...card.innerText.matchAll(/Contagem Física — ([^\n]+)/g)].map(m=>m[1].trim()), b3=blocos[0]||'Almox 3';
    const tem3=!!card.querySelector('input[id^="confMain_pal3_"],input[id^="confMain_sac3_"]'), b30=tem3?(blocos[1]||'Almox 30'):(blocos[0]||'Almox 30');
    return [...card.querySelectorAll('input[id^="confMain_"]')].map(inp=>{ const t=inp.id.split('_')[1], lab=((inp.closest('.fld')||{}).querySelector?((inp.closest('.fld').querySelector('label')||{}).innerText||''):'').trim();
      return {inp,t,bloco:/30$/.test(t)?b30:b3,rot:lab||(/^pal/.test(t)?'Paletes':'Sacos')}; }); }
  function fecha(){ F.on=false; F.modo='lista'; const o=$('fcConta'); if(o) o.remove(); document.body.classList.remove('fc-aberto'); try{ window.invTablet&&window.invTablet.barra(); }catch(e){} }
  function abreConta(i){ F.on=true; F.modo='lista'; F.rev=false; F.i=Math.max(0,Math.min(i||0,itens().length-1)); F.campo=null; desenha(); }
  function desenha(){ if(!F.on) return; if(F.modo==='achar'&&F.tela!=='item') return desenhaAchar(); const xs=itens(); if(!xs.length) return fecha(); let o=$('fcConta');
    if(!o){ o=document.createElement('div'); o.id='fcConta'; o.className='fc'; document.body.appendChild(o); document.body.classList.add('fc-aberto'); o.addEventListener('click',clica); }
    const n=xs.filter(contado).length;
    if(F.rev){ o.innerHTML=`<div class="fc-top"><div><b>Revisar e salvar</b><span>${n} de ${xs.length} contados</span></div><button data-a="fecha" class="fc-x">Ver todos</button></div>
        <div class="fc-rev">${xs.map((c,k)=>{ const it=fonte().find(i=>i.cod===c)||{}, x=CONFERENCIAS[c]||{}, ok=contado(c), t3=$('totalFisico3_'+c), t30=$('totalFisico30_'+c);
          return `<button class="fc-ri ${ok?'ok':''}" data-a="ir" data-i="${k}"><b>${esc(c)}</b><span>${esc(it.name||'')}</span><em>${ok?(x.confirmadoZero&&!(+x.total)?'zero confirmado':[t3&&t3.textContent,t30&&t30.textContent].filter(Boolean).join(' · ')||'contado'):'falta contar'}</em></button>`; }).join('')}</div>
        <div class="fc-bot">${n<xs.length?`<button data-a="falta" class="fc-sec">Contar os que faltam (${xs.length-n})</button>`:''}<button data-a="salvar" class="fc-ok">Salvar conferência</button></div>`; return; }
    if(F.modo==='achar'){ const k=xs.indexOf(F.cod); if(k<0){ F.tela='busca'; return desenhaAchar(); } F.i=k; }
    const cod=xs[F.i], it=fonte().find(i=>i.cod===cod)||{}, cs=campos(cod), x=CONFERENCIAS[cod]||{};
    if(!F.campo||!cs.some(c=>c.inp.id===F.campo)) F.campo=(cs[0]||{}).inp?cs[0].inp.id:null;
    const pp=$('confCard_'+cod).querySelector('[data-pp]'), rg=$('confCard_'+cod).querySelector('input[oninput*="setQtdRasgadaConf"]'), zero=$('confZero_'+cod);
    const grupos={}; cs.forEach(c=>(grupos[c.bloco]=grupos[c.bloco]||[]).push(c));
    const tot=[...new Set(cs.map(c=>/30$/.test(c.t)?'30':'3'))].map(b=>($('totalFisico'+b+'_'+cod)||{}).textContent).filter(Boolean).join(' · ');
    o.innerHTML=(F.modo==='achar'?`<div class="fc-top"><div><b>Contando o que achar</b><span>${n} ${n===1?'item contado':'itens contados'} até agora</span></div><button data-a="busca" class="fc-x">Outro item</button></div>`:`<div class="fc-top"><div><b>Item ${F.i+1} de ${xs.length}</b><span>${n} contados</span><i><u style="width:${n/xs.length*100}%"></u></i></div><button data-a="fecha" class="fc-x">Ver todos</button></div>`)+`
      <div class="fc-corpo"><div class="fc-item ${contado(cod)?'ok':''}"><b>${esc(cod)}</b><span>${esc(it.name||'')}</span>${contado(cod)?'<em>✓ contado</em>':''}</div>
        ${Object.entries(grupos).map(([bl,gs])=>`<div class="fc-bl"><small>${esc(bl)}</small><div class="fc-cs">${gs.map(c=>`<button class="fc-c ${F.campo===c.inp.id?'on':''}" data-a="campo" data-id="${c.inp.id}"><span>${esc(c.rot)}</span><b>${esc(c.inp.value||'0')}</b></button>`).join('')}</div></div>`).join('')}
        <div class="fc-tot">${tot?'= '+esc(tot):''}</div>
        <div class="fc-ext">${pp?`<div><span>1 palete =</span><button data-a="pp" data-d="-1">−</button><b>${esc(pp.value)}</b><button data-a="pp" data-d="1">+</button></div>`:''}${rg?`<div><span>Rasgados</span><button data-a="rg" data-d="-1">−</button><b>${esc(rg.value||'0')}</b><button data-a="rg" data-d="1">+</button></div>`:''}
          ${zero?`<button data-a="zero" class="fc-zero ${zero.checked?'on':''}">${zero.checked?'✓ Zero confirmado':'Não tem nenhum (zero)'}</button>`:''}</div>
        ${teclado()}</div>
      ${F.modo==='achar'?`<div class="fc-bot"><button data-a="busca" class="fc-sec">← Buscar outro</button><button data-a="contei" class="fc-ok">Contei · próximo item</button></div>`:`<div class="fc-bot"><button data-a="ant" class="fc-sec" ${F.i===0?'disabled':''}>← Anterior</button>${F.i<xs.length-1?'<button data-a="prox" class="fc-ok">Próximo →</button>':'<button data-a="rev" class="fc-ok">Revisar e salvar</button>'}</div>`}`; }
  function clica(ev){ const b=ev.target.closest('button'); if(!b) return; const a=b.dataset.a, k=b.dataset.k, xs=itens(), cod=xs[F.i], card=cod&&$('confCard_'+cod);
    if(k){ const inp=F.campo&&$(F.campo); if(!inp) return; inp.value=digita(inp.value,k); dispara(inp,'input'); const z=$('confZero_'+cod); if(z&&z.checked&&+inp.value>0){ z.checked=false; dispara(z,'change'); } return desenha(); }
    if(a==='fecha') return fecha();
    if(achaClica(a,b)) return;
    if(a==='campo'){ F.campo=b.dataset.id; return desenha(); }
    if(a==='ant'){ F.i=Math.max(0,F.i-1); F.campo=null; return desenha(); }
    if(a==='prox'){ F.i=Math.min(xs.length-1,F.i+1); F.campo=null; return desenha(); }
    if(a==='rev'){ F.rev=true; return desenha(); }
    if(a==='ir'){ F.rev=false; F.i=+b.dataset.i; F.campo=null; return desenha(); }
    if(a==='falta'){ const k2=xs.findIndex(c=>!contado(c)); F.rev=false; F.i=k2<0?0:k2; F.campo=null; return desenha(); }
    if(a==='salvar'){ fecha(); return salvarConferencia(); }
    if(a==='zero'){ const z=$('confZero_'+cod); if(!z) return; z.checked=!z.checked; if(z.checked) campos(cod).forEach(c=>{ if(c.inp.value){ c.inp.value=''; dispara(c.inp,'input'); } }); dispara(z,'change'); return desenha(); }
    if(a==='pp'){ const pp=card.querySelector('[data-pp]'); pp.value=Math.max(1,(+pp.value||1)+(+b.dataset.d)); dispara(pp,'change'); return desenha(); }
    if(a==='rg'){ const rg=card.querySelector('input[oninput*="setQtdRasgadaConf"]'); rg.value=Math.max(0,(+rg.value||0)+(+b.dataset.d)); dispara(rg,'input'); return desenha(); } }
  /* ================= CONTAR O QUE ACHAR (28/10) =================
     Sem escolher itens antes: busca grande → conta o item → volta para a busca. No fim, os itens que têm saldo no sistema
     e não foram contados aparecem para "Não tem nenhum (zero)" ou "Contar agora"; o resto fica para outro dia.
     Usa os mesmos cartões e funções da conferência (CONF_ITENS_SEL, renderConferencia, confZero_*, salvarConferencia). */
  const sNorm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function blocos(){ let cp={}; try{ cp=confPerm()||{}; }catch(e){} const t=!!cp.acessoTotal;
    return {cp,t,b3:t||!!(cp.podeContarAlmox3||cp.podeContarRejunte||cp.podeContarSeparacao||cp.podeContarAlmox1),b30:t||!!(cp.podeContarAlmox30||cp.podeContarAlmox2)}; }
  function permitidos(){ const {cp,t}=blocos(); let ff=''; try{ ff=confPerfilFiltro()||''; }catch(e){}
    const mp={almox3:'temAlmox3',almox30:'temAlmox30',rejunte:'temRejunte',separacao:'temSeparacao',almox1:'temAlmox1',almox2:'temAlmox2'};
    return fonte().filter(it=>{ if(ff&&mp[ff]&&!it[mp[ff]]) return false; if(t) return true;
      return (it.temAlmox3&&cp.podeContarAlmox3)||(it.temAlmox30&&cp.podeContarAlmox30)||(it.temRejunte&&cp.podeContarRejunte)||(it.temSeparacao&&cp.podeContarSeparacao)||(it.temAlmox1&&cp.podeContarAlmox1)||(it.temAlmox2&&cp.podeContarAlmox2); }); }
  function saldoVis(it){ const B=blocos(); return (B.b3?(+it.saldo3||0):0)+(B.b30?(+it.saldo30||0):0); }
  /* famílias (pedido de 28/10): tocar na família lista os itens dela, sem digitar */
  const FAMS=[['rsil','Rejunte siliconizado',h=>/rejunte/.test(h)&&/silicon/.test(h)],['rflex','Rejunte flexível',h=>/rejunte/.test(h)&&/flex/.test(h)],['racr','Rejunte acrílico',h=>/rejunte/.test(h)&&/acril/.test(h)],
    ['bau','Argamassas Bautech',h=>/bautech/.test(h)],['poz','Argamassas Pozosul',h=>/pozosul/.test(h)]];
  const famDe=k=>FAMS.find(x=>x[0]===k);
  function acharLista(){ const ws=sNorm(F.q).split(/\s+/).filter(Boolean), fm=famDe(F.fam); if(!ws.length&&!fm) return [];
    return permitidos().filter(it=>{ const h=sNorm(it.cod+' '+(it.name||'')); return (!fm||fm[2](h))&&ws.every(w=>h.includes(w)); }).sort((a,b)=>{ const q=sNorm(F.q); return (sNorm(b.cod).startsWith(q)?1:0)-(sNorm(a.cod).startsWith(q)?1:0)||String(a.cod).localeCompare(String(b.cod)); }).slice(0,F.fam&&!F.q.trim()?80:14); }
  const contados=()=>itens().filter(contado);
  function poe(cod){ /* garante o cartão do item na conferência (começa a conferência se ainda não começou) */
    if(!CONF_ITENS_SEL.has(cod)){ CONF_ITENS_SEL.add(cod); try{ atualizarBadgeSelConf(); }catch(e){} }
    if(CONF_MODO!=='conferencia'){ F.semAuto=true; try{ confIniciarConferencia(); } finally { F.semAuto=false; } }
    else if(!$('confCard_'+cod)) renderConferencia();
    return !!$('confCard_'+cod); }
  function abreAchar(){ if(CONF_MODO==='conferencia'&&itens().length===0) { /* nada */ }
    F.on=true; F.modo='achar'; F.tela='busca'; F.q=''; F.cod=null; F.rev=false; desenha(); focaBusca(); }
  const focaBusca=()=>setTimeout(()=>{ const i=$('fcAq'); if(i){ i.focus(); try{ i.select(); }catch(e){} } },60);
  function listaAchar(){ const xs=acharLista();
    if(!F.q.trim()&&!F.fam) return `<div class="fc-vz">Digite 2 ou 3 letras do nome ou o código do item que está na sua frente, ou toque numa família.</div>`;
    if(!xs.length) return `<div class="fc-vz">Nenhum item${F.q.trim()?' com "'+esc(F.q)+'"':''}${F.fam?' em '+esc(famDe(F.fam)[1]):''}.</div>`;
    return xs.map(it=>{ const ok=CONF_ITENS_SEL.has(it.cod)&&contado(it.cod); return `<button class="fc-ri ${ok?'ok':''}" data-a="achou" data-c="${esc(it.cod)}"><b>${esc(it.cod)}</b><span>${esc(it.name||'')}</span>${ok?'<em>✓ já contado agora · tocar para mudar</em>':''}</button>`; }).join(''); }
  const zeroSo=c=>{ const x=CONFERENCIAS[c]||{}; return !!x.confirmadoZero&&!['pal3','sac3','pal30','sac30','qtdRasgada'].some(k=>(+x[k]||0)>0); };
  function faltam(){ const ja=new Set(contados().filter(c=>!zeroSo(c))); return permitidos().filter(it=>!ja.has(it.cod)&&saldoVis(it)>0); }
  function desenhaAchar(){ let o=$('fcConta');
    if(!o){ o=document.createElement('div'); o.id='fcConta'; o.className='fc'; document.body.appendChild(o); document.body.classList.add('fc-aberto'); o.addEventListener('click',clica);
      o.addEventListener('input',ev=>{ if(ev.target.id==='fcAq'){ F.q=ev.target.value; const l=$('fcAl'); if(l) l.innerHTML=listaAchar(); } });
      o.addEventListener('keydown',ev=>{ if(ev.target.id==='fcAq'&&ev.key==='Enter'){ const xs=acharLista(); if(xs.length===1){ ev.preventDefault(); abreItem(xs[0].cod); } } }); }
    const cs=contados(), n=cs.length;
    if(F.tela==='fim'){ const fs=faltam(); o.innerHTML=`<div class="fc-top"><div><b>Terminar a contagem</b><span>${n} ${n===1?'item contado':'itens contados'}</span></div><button data-a="busca" class="fc-x">Voltar a contar</button></div>
      <div class="fc-rev">${fs.length?`<div class="fc-sub">Têm saldo no sistema e você não contou (${fs.length})</div><p class="fc-ajuda">Se o item não está no almox, toque em <b>Não tem nenhum</b>. Se não deu tempo, deixe como está: ele fica para outra contagem.</p>
        ${fs.map(it=>{ const z=CONF_ITENS_SEL.has(it.cod)&&(CONFERENCIAS[it.cod]||{}).confirmadoZero; return `<div class="fc-fl ${z?'ok':''}"><div><b>${esc(it.cod)}</b><span>${esc(it.name||'')}</span></div><button data-a="zeroF" data-c="${esc(it.cod)}" class="${z?'on':''}">${z?'✓ Zero':'Não tem nenhum'}</button><button data-a="achou" data-c="${esc(it.cod)}">Contar agora</button></div>`; }).join('')}`:'<div class="fc-vz">Todos os itens com saldo foram contados.</div>'}
        ${cs.filter(c=>!(zeroSo(c)&&fs.some(i=>i.cod===c))).length?`<div class="fc-sub">Contados agora</div>${cs.filter(c=>!(zeroSo(c)&&fs.some(i=>i.cod===c))).map(c=>{ const it=fonte().find(i=>i.cod===c)||{}, x=CONFERENCIAS[c]||{}, t3=$('totalFisico3_'+c), t30=$('totalFisico30_'+c); return `<button class="fc-ri ok" data-a="achou" data-c="${esc(c)}"><b>${esc(c)}</b><span>${esc(it.name||'')}</span><em>${x.confirmadoZero&&!(+x.total)?'zero confirmado':[t3&&t3.textContent,t30&&t30.textContent].filter(Boolean).join(' · ')||'contado'}</em></button>`; }).join('')}`:''}</div>
      <div class="fc-bot"><button data-a="busca" class="fc-sec">← Voltar a contar</button><button data-a="salvarA" class="fc-ok" ${n?'':'disabled'}>Salvar conferência (${n})</button></div>`; return; }
    o.innerHTML=`<div class="fc-top"><div><b>O que você está vendo?</b><span>${n?n+(n===1?' item contado':' itens contados')+' nesta contagem':'busque o item e conte'}</span></div>${n?'<button data-a="terminar" class="fc-x">Terminar</button>':'<button data-a="fecha" class="fc-x">Fechar</button>'}</div>
      <div class="fc-corpo"><input id="fcAq" class="fc-busca" placeholder="Nome ou código do item" autocomplete="off" value="${esc(F.q)}">${famChips()}<div id="fcAl" class="fc-al">${listaAchar()}</div>
        ${n?`<div class="fc-sub">Contados agora</div><div class="fc-chips">${cs.slice(-12).reverse().map(c=>`<button data-a="achou" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:''}</div>
      <div class="fc-bot">${n?`<button data-a="terminar" class="fc-ok">Terminar e salvar (${n})</button>`:'<button data-a="fecha" class="fc-sec">Fechar</button>'}</div>`; }
  function famChips(){ const base=permitidos(), fs=FAMS.filter(x=>base.some(it=>x[2](sNorm(it.cod+' '+(it.name||'')))));
    return fs.length?`<div class="fc-fams">${fs.map(x=>`<button data-a="fam" data-v="${x[0]}" aria-pressed="${F.fam===x[0]}">${esc(x[1])}</button>`).join('')}</div>`:''; }
  function abreItem(cod){ if(!poe(cod)) return toast('Não consegui abrir este item.'); F.on=true; F.modo='achar'; F.tela='item'; F.cod=cod; F.campo=null; desenha(); }
  function achaClica(a,b){ if(F.modo!=='achar') return false;
    if(a==='achou'){ abreItem(b.dataset.c); return true; }
    if(a==='fam'){ F.fam=F.fam===b.dataset.v?'':b.dataset.v; const l=$('fcAl'); if(l) l.innerHTML=listaAchar(); document.querySelectorAll('#fcConta [data-a="fam"]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===F.fam))); return true; }
    if(a==='busca'){ F.tela='busca'; F.q=''; desenha(); focaBusca(); return true; }
    if(a==='contei'){ if(!contado(F.cod)){ toast('Digite a quantidade, ou toque em "Não tem nenhum (zero)".'); return true; } F.tela='busca'; F.q=''; desenha(); focaBusca(); return true; }
    if(a==='terminar'){ F.tela='fim'; desenha(); return true; }
    if(a==='zeroF'){ const c=b.dataset.c; if(!poe(c)) return true; const z=$('confZero_'+c); if(z){ z.checked=!z.checked; dispara(z,'change'); } F.tela='fim'; desenha(); return true; }
    if(a==='salvarA'){ const sel=[...CONF_ITENS_SEL]; sel.forEach(c=>{ if(!contado(c)) CONF_ITENS_SEL.delete(c); }); fecha(); salvarConferencia(); return true; }
    return false; }
  /* botão grande no alto da escolha de itens */
  setInterval(()=>{ const sc=$('confSelCard'); if(!sc||$('fcAcharBtn')||typeof CONF_MODO==='undefined') return; try{ const pf=perfil(); if(!pf.podeConferir&&!pf.podeAdmin) return; }catch(e){}
    const b=document.createElement('button'); b.id='fcAcharBtn'; b.className='fc-grande'; b.innerHTML='Começar a contar <small>busque o item que está na sua frente · não precisa escolher antes</small>'; b.addEventListener('click',abreAchar); sc.parentElement.insertBefore(b,sc); },700);
  /* abre sozinho no tablet ao iniciar a conferência; "Um por vez" na barra para quem está no computador */
  const _ini=window.confIniciarConferencia; if(typeof _ini==='function') window.confIniciarConferencia=function(){ const r=_ini.apply(this,arguments); if(!F.semAuto) setTimeout(()=>{ if(toque()&&CONF_MODO==='conferencia'&&itens().length&&!(F.on&&F.modo==='achar')) abreConta(0); },60); return r; };
  /* o botão "Um por vez" fica na barra fixa (tablet.js) */
  ['updateConf','setConfirmarZeroConf','mudarPalete','setQtdRasgadaConf','renderConferencia'].forEach(n=>{ const f=window[n]; if(typeof f==='function') window[n]=function(){ const r=f.apply(this,arguments); if(F.on&&n==='renderConferencia'&&!(F.modo==='achar'&&F.tela!=='item')) setTimeout(desenha,0); return r; }; });

  /* ================= RECEBIMENTO EM 3 PASSOS ================= */
  const R={on:false,passo:1,q:'',it:null,campo:'pal',pal:'',sac:'',qtd:'',data:'',obs:'',ok:null};
  const comPalete=it=>{ try{ return !(temUnidadePropria(it)&&!temConversaoBulk(it)); }catch(e){ return true; } };
  const unid=it=>{ try{ return temUnidadePropria(it)&&!temConversaoBulk(it)?(it.unidade||'un'):(it.temRejunte?'fardo':'sc'); }catch(e){ return 'sc'; } };
  const spp=it=>{ try{ return getSacsPorPal(it.cod)||0; }catch(e){ return 0; } };
  const totalR=()=>R.it&&comPalete(R.it)&&spp(R.it)?(+R.pal||0)*spp(R.it)+(+R.sac||0):(+R.qtd||0);
  function abreRec(){ try{ if(typeof podeRegistrarRecebimento==='function'&&!podeRegistrarRecebimento()) return toast('⛔ Você não tem permissão para registrar recebimento.'); }catch(e){}
    Object.assign(R,{on:true,passo:1,q:'',it:null,campo:'pal',pal:'',sac:'',qtd:'',data:'',obs:'',ok:null}); desenhaR(); setTimeout(()=>{ const i=$('fcRq'); if(i) i.focus(); },80); }
  function fechaR(){ R.on=false; const o=$('fcRec'); if(o) o.remove(); document.body.classList.remove('fc-aberto'); try{ renderRecebimentos(); }catch(e){} }
  function achados(){ const q=R.q.trim().toLowerCase(), base=fonte().filter(it=>{ try{ return itemPermitidoParaContagem(it); }catch(e){ return true; } });
    if(q.length<2){ const rec=[...new Set((typeof RECEBIMENTOS!=='undefined'?RECEBIMENTOS:[]).map(r=>r.cod))].slice(0,6); return {t:rec.length?'Recebidos por último':'',xs:rec.map(c=>base.find(i=>i.cod===c)).filter(Boolean)}; }
    return {t:'',xs:base.filter(it=>it.cod.toLowerCase().includes(q)||(it.name||'').toLowerCase().includes(q)).slice(0,12)}; }
  function desenhaR(){ if(!R.on) return; let o=$('fcRec'); if(!o){ o=document.createElement('div'); o.id='fcRec'; o.className='fc'; document.body.appendChild(o); document.body.classList.add('fc-aberto'); o.addEventListener('click',clicaR); o.addEventListener('input',ev=>{ if(ev.target.id==='fcRq'){ R.q=ev.target.value; const l=$('fcRl'); if(l) l.innerHTML=listaR(); } else if(ev.target.id==='fcRobs') R.obs=ev.target.value; else if(ev.target.id==='fcRdata') R.data=ev.target.value; }); }
    const passos=`<div class="fc-ps">${['Item','Quantidade','Pronto'].map((t,k)=>`<span class="${R.passo===k+1?'on':R.passo>k+1?'feito':''}">${k+1} · ${t}</span>`).join('')}</div>`;
    if(R.passo===1){ o.innerHTML=`<div class="fc-top"><div><b>Receber material</b>${passos}</div><button data-a="fecha" class="fc-x">Fechar</button></div><div class="fc-corpo"><input id="fcRq" class="fc-busca" placeholder="Código ou nome do produto" value="${esc(R.q)}" autocomplete="off"><div id="fcRl">${listaR()}</div></div>`; return; }
    if(R.passo===2){ const it=R.it, cp=comPalete(it)&&spp(it)>0, u=unid(it), t=totalR();
      o.innerHTML=`<div class="fc-top"><div><b>Receber material</b>${passos}</div><button data-a="fecha" class="fc-x">Fechar</button></div>
        <div class="fc-corpo"><div class="fc-item"><b>${esc(it.cod)}</b><span>${esc(it.name||'')}</span><button data-a="troca" class="fc-lk">trocar item</button></div>
          <div class="fc-cs">${cp?`<button class="fc-c ${R.campo==='pal'?'on':''}" data-a="rcampo" data-v="pal"><span>Paletes</span><b>${esc(R.pal||'0')}</b></button><button class="fc-c ${R.campo==='sac'?'on':''}" data-a="rcampo" data-v="sac"><span>${u==='fardo'?'Fardos':'Sacos'} avulsos</span><b>${esc(R.sac||'0')}</b></button>`:`<button class="fc-c on" data-a="rcampo" data-v="qtd"><span>Quantidade (${esc(u)})</span><b>${esc(R.qtd||'0')}</b></button>`}</div>
          <div class="fc-tot">${cp?`1 palete = ${spp(it)} ${esc(u)} · total <b>${t.toLocaleString('pt-BR')} ${esc(u)}</b>`:''}</div>
          ${teclado()}
          <div class="fc-mais"><label>Data <input type="date" id="fcRdata" value="${esc(R.data||new Date().toISOString().slice(0,10))}"></label><label>Observação <input id="fcRobs" placeholder="Nota fiscal, transportadora…" value="${esc(R.obs)}"></label></div></div>
        <div class="fc-bot"><button data-a="troca" class="fc-sec">← Item</button><button data-a="registra" class="fc-ok" ${t>0?'':'disabled'}>Registrar ${t>0?t.toLocaleString('pt-BR')+' '+esc(u):''}</button></div>`; return; }
    o.innerHTML=`<div class="fc-top"><div><b>Receber material</b>${passos}</div><button data-a="fecha" class="fc-x">Fechar</button></div>
      <div class="fc-corpo fc-fim"><div class="fc-okc">✓</div><b>Recebido</b><span>${esc(R.ok)}</span></div>
      <div class="fc-bot"><button data-a="fecha" class="fc-sec">Fechar</button><button data-a="outro" class="fc-ok">Receber outro item</button></div>`; }
  function listaR(){ const A=achados(); if(!A.xs.length) return `<div class="fc-vz">${R.q.trim().length<2?'Digite pelo menos 2 letras ou números do item.':'Nenhum item encontrado.'}</div>`;
    return (A.t?`<small class="fc-sub">${A.t}</small>`:'')+A.xs.map(it=>`<button class="fc-ri" data-a="item" data-c="${esc(it.cod)}"><b>${esc(it.cod)}</b><span>${esc(it.name||'')}</span></button>`).join(''); }
  function clicaR(ev){ const b=ev.target.closest('button'); if(!b) return; const a=b.dataset.a, k=b.dataset.k;
    if(k){ R[R.campo]=digita(R[R.campo],k); return desenhaR(); }
    if(a==='fecha') return fechaR();
    if(a==='item'){ R.it=fonte().find(i=>i.cod===b.dataset.c); if(!R.it) return; R.passo=2; R.campo=comPalete(R.it)&&spp(R.it)>0?'pal':'qtd'; return desenhaR(); }
    if(a==='troca'){ R.passo=1; R.it=null; desenhaR(); return setTimeout(()=>{ const i=$('fcRq'); if(i) i.focus(); },50); }
    if(a==='rcampo'){ R.campo=b.dataset.v; return desenhaR(); }
    if(a==='outro') return abreRec();
    if(a==='registra'){ const t=totalR(); if(t<=0) return; const d=($('fcRdata')||{}).value||'', ob=($('fcRobs')||{}).value||'';
      selecionarItemRecebimento(R.it.cod); const q=$('recebQtd'), dt=$('recebData'), obs=$('recebObs'); if(!q) return toast('Abra a aba Recebimento.');
      q.value=t; if(dt) dt.value=d; if(obs) obs.value=ob; const antes=(typeof RECEBIMENTOS!=='undefined'?RECEBIMENTOS.length:0); salvarRecebimento();
      if(typeof RECEBIMENTOS!=='undefined'&&RECEBIMENTOS.length>antes){ R.ok=t.toLocaleString('pt-BR')+' '+unid(R.it)+' de '+R.it.cod+' · '+(R.it.name||''); R.passo=3; desenhaR(); } } }
  /* botão grande na tela de Recebimento */
  setInterval(()=>{ const bi=$('recebBuscaItem'); if(!bi||$('fcRecBtn')) return; const card=bi.closest('.card'); if(!card) return; const b=document.createElement('button'); b.id='fcRecBtn'; b.className='fc-grande'; b.innerHTML='📦 Receber material <small>passo a passo, com teclado grande</small>'; b.addEventListener('click',abreRec); card.parentElement.insertBefore(b,card); },700);
  window.invFacil={abreConta,abreRec,fecha,fechaR,abreAchar};
  document.head.insertAdjacentHTML('beforeend',`<style id="fc-css">
  body.fc-aberto{overflow:hidden}.fc{position:fixed;inset:0;z-index:950;background:#EDF1F4;display:flex;flex-direction:column;font-family:Archivo,'Segoe UI',system-ui,sans-serif;color:#1C2B33}
  .fc-top{display:flex;align-items:center;gap:12px;padding:14px 18px;background:#FFFFFF;border-bottom:1px solid #DDE3E8}.fc-top>div{flex:1;min-width:0}.fc-top b{font-size:20px;display:block}.fc-top span{font-size:14px;color:#5E6E77}
  .fc-top i{display:block;height:8px;border-radius:4px;background:#E6EBEF;margin-top:6px;overflow:hidden}.fc-top i u{display:block;height:100%;background:#3C8A63}
  .fc-x{min-height:48px;padding:0 16px;border-radius:12px;border:1px solid #DDE3E8;background:#FFFFFF;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
  .fc-corpo{flex:1;overflow:auto;padding:16px 18px;display:flex;flex-direction:column;gap:14px;max-width:760px;width:100%;margin:0 auto;box-sizing:border-box}
  .fc-item{background:#FFFFFF;border-radius:16px;padding:16px 18px;border:2px solid #DDE3E8;display:flex;flex-direction:column;gap:2px;position:relative}.fc-item.ok{border-color:#3C8A63;background:#F2F8F4}
  .fc-item b{font-size:26px}.fc-item span{font-size:18px;color:#44545D}.fc-item em{font-style:normal;font-weight:700;color:#3C8A63;font-size:15px}.fc-lk{position:absolute;top:14px;right:14px;background:none;border:0;color:#2B6A87;font:inherit;font-size:15px;text-decoration:underline;cursor:pointer;min-height:44px}
  .fc-bl small{display:block;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5E6E77;margin:0 0 6px 2px}
  .fc-cs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .fc-c{font:inherit;background:#FFFFFF;border:2px solid #DDE3E8;border-radius:16px;padding:12px 16px;display:flex;flex-direction:column;align-items:flex-start;cursor:pointer;min-height:96px;text-align:left}
  .fc-c span{font-size:15px;color:#44545D;font-weight:600}.fc-c b{font-size:44px;line-height:1.1}.fc-c.on{border-color:#143F54;box-shadow:0 0 0 4px rgba(20,63,84,.15)}
  .fc-tot{font-size:17px;color:#44545D;min-height:22px}.fc-tot b{color:#1C2B33}
  .fc-ext{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.fc-ext>div{display:flex;align-items:center;gap:6px;background:#FFFFFF;border-radius:12px;padding:6px 10px}.fc-ext span{font-size:15px;color:#44545D}.fc-ext b{min-width:44px;text-align:center;font-size:20px}
  .fc-ext button{min-width:48px;min-height:48px;border-radius:10px;border:1px solid #DDE3E8;background:#F4F6F8;font-size:22px;cursor:pointer}
  .fc-zero{min-height:52px!important;padding:0 18px;border-radius:12px!important;font:inherit;font-size:16px!important;font-weight:600}.fc-zero.on{background:#3C8A63!important;color:#FFFFFF;border-color:#3C8A63!important}
  .fc-tec{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.fc-tec button{min-height:68px;border-radius:14px;border:1px solid #DDE3E8;background:#FFFFFF;font:inherit;font-size:30px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  .fc-tec button:active{background:#E2ECF1}.fc-tec button[data-k="C"],.fc-tec button[data-k="⌫"]{font-size:22px;color:#5E6E77}
  .fc-bot{display:flex;gap:12px;padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px));background:#FFFFFF;border-top:1px solid #DDE3E8}
  .fc-bot button{flex:1;min-height:62px;border-radius:14px;font:inherit;font-size:19px;font-weight:700;cursor:pointer}.fc-sec{background:#FFFFFF;border:1px solid #DDE3E8;color:#1C2B33}.fc-ok{background:#3C8A63;border:0;color:#FFFFFF}.fc-bot button:disabled{opacity:.45}
  .fc-rev{flex:1;overflow:auto;padding:14px 18px;display:flex;flex-direction:column;gap:8px;max-width:760px;width:100%;margin:0 auto;box-sizing:border-box}
  .fc-ri{font:inherit;text-align:left;background:#FFFFFF;border:2px solid #DDE3E8;border-radius:14px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;cursor:pointer;min-height:64px;width:100%}
  .fc-ri b{font-size:20px}.fc-ri span{font-size:16px;color:#44545D}.fc-ri em{font-style:normal;font-size:15px;font-weight:600;color:#B5473F}.fc-ri.ok{border-color:#3C8A63}.fc-ri.ok em{color:#3C8A63}
  .fc-busca{font:inherit;font-size:22px;min-height:64px;border-radius:14px;border:2px solid #C9D2D9;padding:0 18px;width:100%;box-sizing:border-box}.fc-busca:focus{border-color:#2B6A87;outline:none;box-shadow:0 0 0 4px rgba(43,106,135,.18)}
  #fcRl{display:flex;flex-direction:column;gap:8px}.fc-sub{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5E6E77}.fc-vz{font-size:17px;color:#5E6E77;padding:20px 4px}
  .fc-ps{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap}.fc-ps span{font-size:13px;padding:3px 10px;border-radius:999px;background:#E6EBEF;color:#5E6E77}.fc-ps span.on{background:#143F54;color:#FFFFFF}.fc-ps span.feito{background:#E3F0E9;color:#3C8A63}
  .fc-mais{display:grid;grid-template-columns:1fr 2fr;gap:10px}.fc-mais label{font-size:14px;color:#44545D;display:flex;flex-direction:column;gap:4px}.fc-mais input{font:inherit;font-size:17px;min-height:52px;border-radius:12px;border:1px solid #C9D2D9;padding:0 12px}
  .fc-fim{align-items:center;justify-content:center;text-align:center}.fc-okc{width:110px;height:110px;border-radius:50%;background:#3C8A63;color:#FFFFFF;font-size:64px;display:flex;align-items:center;justify-content:center}.fc-fim>b{font-size:32px}.fc-fim>span{font-size:20px;color:#44545D}
  .fc-grande{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:76px;margin:0 0 14px;padding:12px 20px;border-radius:16px;border:0;background:#143F54;color:#FFFFFF;font:inherit;font-size:22px;font-weight:700;cursor:pointer;text-align:left}.fc-grande small{font-size:14px;font-weight:400;opacity:.85}
  .fc-fams{display:flex;flex-wrap:wrap;gap:8px}.fc-fams button{min-height:52px;padding:0 18px;border-radius:999px;border:1px solid #C9D2D9;background:#FFFFFF;color:#1C2B33;font:inherit;font-size:16px;font-weight:600;cursor:pointer}.fc-fams button[aria-pressed=true]{background:#143F54;border-color:#143F54;color:#FFFFFF}
  .fc-al{display:flex;flex-direction:column;gap:8px}.fc-chips{display:flex;flex-wrap:wrap;gap:8px}.fc-chips button{min-height:48px;padding:0 16px;border-radius:999px;border:1px solid #3C8A63;background:#F2F8F4;color:#1C2B33;font:inherit;font-size:16px;font-weight:600;cursor:pointer}
  .fc-ajuda{margin:0;font-size:15px;color:#44545D}.fc-fl{display:flex;align-items:center;gap:10px;background:#FFFFFF;border:2px solid #DDE3E8;border-radius:14px;padding:10px 12px 10px 16px}.fc-fl.ok{border-color:#3C8A63;background:#F2F8F4}
  .fc-fl>div{flex:1;min-width:0;display:flex;flex-direction:column}.fc-fl b{font-size:18px}.fc-fl span{font-size:15px;color:#44545D}
  .fc-fl button{min-height:52px;padding:0 16px;border-radius:12px;border:1px solid #DDE3E8;background:#FFFFFF;font:inherit;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap}.fc-fl button.on{background:#3C8A63;border-color:#3C8A63;color:#FFFFFF}
  @media (min-width:1000px){.fc-al{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:560px){.fc-mais{grid-template-columns:1fr}.fc-c b{font-size:38px}.fc-fl{flex-wrap:wrap}}
  /* tablet deitado (Redmi Pad 2, 1280×800): teclado à direita, tudo cabe sem rolar */
  @media (min-width:1000px) and (orientation:landscape){
    .fc-corpo:has(> .fc-tec){display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,420px);column-gap:24px;row-gap:12px;max-width:1240px;align-content:start}
    .fc-corpo:has(> .fc-tec)>*{grid-column:1}.fc-corpo:has(> .fc-tec)>.fc-tec{grid-column:2;grid-row:1 / span 20;align-self:start;grid-auto-rows:minmax(84px,1fr);height:min(calc(100vh - 210px),520px)}
    .fc-corpo:has(> .fc-tec) .fc-tec button{min-height:0;font-size:34px}
    .fc-corpo:has(> .fc-tec) .fc-item{padding:12px 16px}.fc-corpo:has(> .fc-tec) .fc-item b{font-size:24px}
    .fc-corpo:has(> .fc-tec) .fc-c{min-height:84px;padding:10px 14px}.fc-corpo:has(> .fc-tec) .fc-c b{font-size:40px}
    .fc-top{padding:10px 18px}.fc-bot{padding-top:10px}.fc-bot button{min-height:58px}}</style>`);
})();
