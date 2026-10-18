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
  const F={on:false,i:0,campo:null,rev:false};
  const itens=()=>[...(CONF_ITENS_SEL||[])].filter(c=>$('confCard_'+c));
  const contado=c=>window.invTablet?window.invTablet.contado(c):false;
  function campos(cod){ const card=$('confCard_'+cod); if(!card) return [];
    const blocos=[...card.innerText.matchAll(/Contagem Física — ([^\n]+)/g)].map(m=>m[1].trim()), b3=blocos[0]||'Almox 3';
    const tem3=!!card.querySelector('input[id^="confMain_pal3_"],input[id^="confMain_sac3_"]'), b30=tem3?(blocos[1]||'Almox 30'):(blocos[0]||'Almox 30');
    return [...card.querySelectorAll('input[id^="confMain_"]')].map(inp=>{ const t=inp.id.split('_')[1], lab=((inp.closest('.fld')||{}).querySelector?((inp.closest('.fld').querySelector('label')||{}).innerText||''):'').trim();
      return {inp,t,bloco:/30$/.test(t)?b30:b3,rot:lab||(/^pal/.test(t)?'Paletes':'Sacos')}; }); }
  function fecha(){ F.on=false; const o=$('fcConta'); if(o) o.remove(); document.body.classList.remove('fc-aberto'); try{ window.invTablet&&window.invTablet.barra(); }catch(e){} }
  function abreConta(i){ F.on=true; F.rev=false; F.i=Math.max(0,Math.min(i||0,itens().length-1)); F.campo=null; desenha(); }
  function desenha(){ if(!F.on) return; const xs=itens(); if(!xs.length) return fecha(); let o=$('fcConta');
    if(!o){ o=document.createElement('div'); o.id='fcConta'; o.className='fc'; document.body.appendChild(o); document.body.classList.add('fc-aberto'); o.addEventListener('click',clica); }
    const n=xs.filter(contado).length;
    if(F.rev){ o.innerHTML=`<div class="fc-top"><div><b>Revisar e salvar</b><span>${n} de ${xs.length} contados</span></div><button data-a="fecha" class="fc-x">Ver todos</button></div>
        <div class="fc-rev">${xs.map((c,k)=>{ const it=fonte().find(i=>i.cod===c)||{}, x=CONFERENCIAS[c]||{}, ok=contado(c), t3=$('totalFisico3_'+c), t30=$('totalFisico30_'+c);
          return `<button class="fc-ri ${ok?'ok':''}" data-a="ir" data-i="${k}"><b>${esc(c)}</b><span>${esc(it.name||'')}</span><em>${ok?(x.confirmadoZero&&!(+x.total)?'zero confirmado':[t3&&t3.textContent,t30&&t30.textContent].filter(Boolean).join(' · ')||'contado'):'falta contar'}</em></button>`; }).join('')}</div>
        <div class="fc-bot">${n<xs.length?`<button data-a="falta" class="fc-sec">Contar os que faltam (${xs.length-n})</button>`:''}<button data-a="salvar" class="fc-ok">Salvar conferência</button></div>`; return; }
    const cod=xs[F.i], it=fonte().find(i=>i.cod===cod)||{}, cs=campos(cod), x=CONFERENCIAS[cod]||{};
    if(!F.campo||!cs.some(c=>c.inp.id===F.campo)) F.campo=(cs[0]||{}).inp?cs[0].inp.id:null;
    const pp=$('confCard_'+cod).querySelector('[data-pp]'), rg=$('confCard_'+cod).querySelector('input[oninput*="setQtdRasgadaConf"]'), zero=$('confZero_'+cod);
    const grupos={}; cs.forEach(c=>(grupos[c.bloco]=grupos[c.bloco]||[]).push(c));
    const tot=[...new Set(cs.map(c=>/30$/.test(c.t)?'30':'3'))].map(b=>($('totalFisico'+b+'_'+cod)||{}).textContent).filter(Boolean).join(' · ');
    o.innerHTML=`<div class="fc-top"><div><b>Item ${F.i+1} de ${xs.length}</b><span>${n} contados</span><i><u style="width:${n/xs.length*100}%"></u></i></div><button data-a="fecha" class="fc-x">Ver todos</button></div>
      <div class="fc-corpo"><div class="fc-item ${contado(cod)?'ok':''}"><b>${esc(cod)}</b><span>${esc(it.name||'')}</span>${contado(cod)?'<em>✓ contado</em>':''}</div>
        ${Object.entries(grupos).map(([bl,gs])=>`<div class="fc-bl"><small>${esc(bl)}</small><div class="fc-cs">${gs.map(c=>`<button class="fc-c ${F.campo===c.inp.id?'on':''}" data-a="campo" data-id="${c.inp.id}"><span>${esc(c.rot)}</span><b>${esc(c.inp.value||'0')}</b></button>`).join('')}</div></div>`).join('')}
        <div class="fc-tot">${tot?'= '+esc(tot):''}</div>
        <div class="fc-ext">${pp?`<div><span>1 palete =</span><button data-a="pp" data-d="-1">−</button><b>${esc(pp.value)}</b><button data-a="pp" data-d="1">+</button></div>`:''}${rg?`<div><span>Rasgados</span><button data-a="rg" data-d="-1">−</button><b>${esc(rg.value||'0')}</b><button data-a="rg" data-d="1">+</button></div>`:''}
          ${zero?`<button data-a="zero" class="fc-zero ${zero.checked?'on':''}">${zero.checked?'✓ Zero confirmado':'Não tem nenhum (zero)'}</button>`:''}</div>
        ${teclado()}</div>
      <div class="fc-bot"><button data-a="ant" class="fc-sec" ${F.i===0?'disabled':''}>← Anterior</button>${F.i<xs.length-1?'<button data-a="prox" class="fc-ok">Próximo →</button>':'<button data-a="rev" class="fc-ok">Revisar e salvar</button>'}</div>`; }
  function clica(ev){ const b=ev.target.closest('button'); if(!b) return; const a=b.dataset.a, k=b.dataset.k, xs=itens(), cod=xs[F.i], card=cod&&$('confCard_'+cod);
    if(k){ const inp=F.campo&&$(F.campo); if(!inp) return; inp.value=digita(inp.value,k); dispara(inp,'input'); const z=$('confZero_'+cod); if(z&&z.checked&&+inp.value>0){ z.checked=false; dispara(z,'change'); } return desenha(); }
    if(a==='fecha') return fecha();
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
  /* abre sozinho no tablet ao iniciar a conferência; "Um por vez" na barra para quem está no computador */
  const _ini=window.confIniciarConferencia; if(typeof _ini==='function') window.confIniciarConferencia=function(){ const r=_ini.apply(this,arguments); setTimeout(()=>{ if(toque()&&CONF_MODO==='conferencia'&&itens().length) abreConta(0); },60); return r; };
  /* o botão "Um por vez" fica na barra fixa (tablet.js) */
  ['updateConf','setConfirmarZeroConf','mudarPalete','setQtdRasgadaConf','renderConferencia'].forEach(n=>{ const f=window[n]; if(typeof f==='function') window[n]=function(){ const r=f.apply(this,arguments); if(F.on&&n==='renderConferencia') setTimeout(desenha,0); return r; }; });

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
  window.invFacil={abreConta,abreRec,fecha,fechaR};
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
  @media (max-width:560px){.fc-mais{grid-template-columns:1fr}.fc-c b{font-size:38px}}</style>`);
})();
