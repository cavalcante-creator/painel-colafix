// ===== RECEBIMENTO COM VÁRIOS ITENS (14/10) =====
// Um recebimento (sem nota fiscal) junta vários itens. Cada item continua gravado como um registro de
// recebimento (mesmo formato de antes, para o apontamento e o resto do painel), com o mesmo "grupo".
// Campos novos por item: grupo, grupoN, local, pal, sac, pp. Os recebimentos antigos (um item cada) aparecem sozinhos.
(function(){
  'use strict';
  var RN = {itens: [], obs: '', data: '', q: '', filtro: 'hoje', busca: '', aberto: null, sel: null, salvando: false};
  window.RN_ESTADO = RN;
  var LS = 'receb_temp';
  function ligado(){ try{ return localStorage.getItem('inv.layout') !== 'antigo'; }catch(e){ return true; } }
  function esc(s){ return escapeHTML(s); }
  function n(v){ return (Number(v)||0).toLocaleString('pt-BR'); }
  function fonte(){ return (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || []; }
  function itemDe(cod){ return fonte().find(function(i){ return i.cod === cod; }) || null; }
  function semAc(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function guardar(){ try{ localStorage.setItem(LS, JSON.stringify({itens: RN.itens, obs: RN.obs})); }catch(e){} }
  function recuperar(){ try{ var t = JSON.parse(localStorage.getItem(LS) || 'null'); if(t && t.itens && t.itens.length && !RN.itens.length){ RN.itens = t.itens.filter(function(x){ return itemDe(x.cod); }); RN.obs = t.obs || ''; } }catch(e){} }
  function locaisDo(it){ var b = window.invBlocosItem(it); if(!b.length) b = [{k:'3', lbl: localLabel(it)}]; return b; }
  function unid(it){ return temUnidadePropria(it) && !temConversaoBulk(it) ? it.unidade : (it.temRejunte ? 'fardo' : 'sc'); }
  function semPal(it){ return window.invSemPalete(it); }
  function qtdLinha(x){ var it = itemDe(x.cod); if(!it) return 0; return semPal(it) ? (+x.sac||0) : (+x.pal||0) * (+x.pp || getSacsPorPal(x.cod)) + (+x.sac||0); }

  function wrap(){ var w = document.getElementById('rnWrap'); if(!w){ var pai = document.getElementById('confModoRecebimentoWrap'); if(!pai) return null; w = document.createElement('div'); w.id = 'rnWrap'; pai.insertBefore(w, pai.firstChild); } return w; }
  function aplicar(){ document.body.classList.toggle('rn-on', ligado()); if(ligado()){ recuperar(); render(); } else { var w = document.getElementById('rnWrap'); if(w) w.innerHTML = ''; } }

  function resultados(){
    var q = semAc(RN.q).trim(); if(q.length < 2) return [];
    var ps = q.split(/\s+/);
    return fonte().filter(function(it){ if(!itemPermitidoParaContagem(it)) return false; var a = semAc(it.cod + ' ' + (it.name || '')); return ps.every(function(p){ return a.indexOf(p) >= 0; }); }).slice(0, 8);
  }
  function acrescentar(cod){
    var it = itemDe(cod); if(!it) return;
    if(!itemPermitidoParaContagem(it)){ toast('⛔ Você não tem permissão para esse item.'); return; }
    var ls = locaisDo(it);
    var ja = RN.itens.find(function(x){ return x.cod === cod && x.loc === ls[0].k; });
    if(ja){ toast(cod + ' já está na lista. Mude a quantidade nele.'); RN.foco = RN.itens.indexOf(ja); }
    else { RN.itens.unshift({cod: cod, loc: ls[0].k, lbl: ls[0].lbl, pal: '', sac: '', pp: semPal(it) ? null : getSacsPorPal(cod)}); RN.foco = 0; }
    RN.q = ''; guardar(); render();
    setTimeout(function(){ var f = document.querySelector('#rnWrap [data-rnl="' + RN.foco + '"] input[data-rn]'); if(f){ f.focus(); f.select && f.select(); } }, 30);
  }

  function linhaForm(x, i){
    var it = itemDe(x.cod) || {cod: x.cod, name: ''}, ls = locaisDo(it), sp = semPal(it), q = qtdLinha(x);
    var loc = ls.length > 1 ? '<span class="rn-locs">' + ls.map(function(l){ return '<button class="nl-chip sm' + (x.loc === l.k ? ' on' : '') + '" data-rna="loc" data-i="' + i + '" data-v="' + l.k + '" data-l="' + esc(l.lbl) + '">' + esc(l.lbl) + '</button>'; }).join('') + '</span>' : '<span class="nl-loc l' + ls[0].k + '">' + esc(ls[0].lbl) + '</span>';
    var inp = function(k, rot){ return '<label class="rn-q"><span>' + rot + '</span><input class="nl-in" type="number" min="0" inputmode="numeric" data-rn="' + k + '" data-i="' + i + '" value="' + (x[k] || '') + '" placeholder="0"></label>'; };
    return '<div class="rn-lin" data-rnl="' + i + '"><span class="nl-it"><b>' + esc(x.cod) + '</b><small>' + esc(it.name || '') + (sp ? '' : ' · palete ' + (x.pp || getSacsPorPal(x.cod))) + '</small></span>' + loc +
      '<span class="rn-qs">' + (sp ? '' : inp('pal', 'Paletes')) + inp('sac', sp ? (unid(it) === 'fardo' ? 'Fardos' : unid(it)) : 'Sacos') + '</span>' +
      '<b class="rn-tot" id="rnTot' + i + '">' + (q ? n(q) + ' ' + esc(unid(it)) : '—') + '</b>' +
      '<button class="rn-x" data-rna="tirar" data-i="' + i + '" aria-label="Tirar ' + esc(x.cod) + '">×</button></div>';
  }
  function somaTxt(){ var s = {}; RN.itens.forEach(function(x){ var it = itemDe(x.cod); if(!it) return; var q = qtdLinha(x); if(q) s[unid(it)] = (s[unid(it)] || 0) + q; });
    return Object.keys(s).map(function(u){ return n(s[u]) + ' ' + u; }).join(' + ') || '—'; }

  // ---------- histórico agrupado ----------
  function grupos(){
    var mapa = {}, ord = [];
    (RECEBIMENTOS || []).forEach(function(r){ var g = r.grupo || r.id; if(!mapa[g]){ mapa[g] = []; ord.push(g); } mapa[g].push(r); });
    var hoje = new Date(); hoje.setHours(0,0,0,0); var t0 = hoje.getTime(), t7 = t0 - 6 * 864e5;
    var q = semAc(RN.busca).trim();
    return ord.map(function(g){ var rs = mapa[g].slice().sort(function(a, b){ return (a.idx||0) - (b.idx||0); }); return {g: g, rs: rs, t: _parseDataHoraBR(rs[0].dataHora || rs[0].data || '')}; })
      .filter(function(G){
        if(RN.filtro === 'hoje' && !(G.t >= t0)) return false;
        if(RN.filtro === '7' && !(G.t >= t7)) return false;
        if(RN.filtro === 'pend' && G.rs.every(function(r){ return r.apontado; })) return false;
        if(q){ var a = semAc(G.g + ' ' + G.rs.map(function(r){ return r.cod + ' ' + (r.nome||'') + ' ' + (r.nomeUsuario||''); }).join(' ')); if(a.indexOf(q) < 0) return false; }
        return true; })
      .sort(function(a, b){ return (b.t||0) - (a.t||0); });
  }
  function htmlGrupo(G){
    var r0 = G.rs[0], ap = G.rs.filter(function(r){ return r.apontado; }).length, aberto = RN.aberto === G.g;
    var st = ap === G.rs.length ? '<span class="rn-st ok">Apontado</span>' : ap ? '<span class="rn-st meio">Apontado ' + ap + ' de ' + G.rs.length + '</span>' : '<span class="rn-st pend">Não apontado</span>';
    var hora = String(r0.dataHora || '').split(' ')[1] || '';
    var det = aberto ? '<div class="rn-det">' + G.rs.map(function(r){ return '<div class="rn-dl"><span><b>' + esc(r.cod) + '</b> ' + esc(r.nome || '') + (r.local ? ' · ' + esc(r.local) : '') + '</span><b>' + (r.pal ? r.pal + ' pal + ' + (r.sac || 0) + ' = ' : '') + n(r.quantidade) + ' ' + esc(r.unidade || '') + '</b>' + (r.apontado ? '<small class="ok">✔ ' + esc(r.apontadoPor || '') + '</small>' : '') + '</div>'; }).join('') +
      (r0.observacao ? '<div class="rn-obs">Observação: ' + esc(r0.observacao) + '</div>' : '') +
      '<div class="rn-acs">' + (podeAuditarEstoque() ? (ap < G.rs.length ? '<button class="nl-btn" data-rna="apontar" data-g="' + esc(G.g) + '">Marcar apontado no sistema</button>' : '<button class="nl-link" data-rna="desapontar" data-g="' + esc(G.g) + '">desfazer apontamento</button>') : (ap < G.rs.length ? '<small>Aguardando o Supervisor Sistema apontar</small>' : '')) +
      '<button class="nl-btn sec" data-rna="folha" data-g="' + esc(G.g) + '">Comprovante (PDF)</button></div></div>' : '';
    return '<div class="rn-g' + (aberto ? ' aberto' : '') + '"><button class="rn-gh" data-rna="abrir" data-g="' + esc(G.g) + '"><span><b>' + esc(G.rs.length > 1 || r0.grupo ? G.g : r0.cod) + '</b><small>' + esc(r0.data || '') + ' ' + esc(hora.slice(0,5)) + ' · ' + esc(r0.nomeUsuario || '—') + ' · ' + (G.rs.length > 1 ? G.rs.length + ' itens' : esc(r0.nome || r0.cod)) + '</small></span>' + st + '<em>+' + (function(){ var s = {}; G.rs.forEach(function(r){ s[r.unidade||'sc'] = (s[r.unidade||'sc']||0) + (+r.quantidade||0); }); return Object.keys(s).map(function(u){ return n(s[u]) + ' ' + u; }).join(' + '); })() + '</em></button>' + det + '</div>';
  }

  function render(){
    if(!ligado()) return; var w = wrap(); if(!w) return;
    var podeReg = podeRegistrarRecebimento(), res = resultados(), gs = grupos();
    var nPend = (function(){ var f = RN.filtro; RN.filtro = 'pend'; var k = grupos().length; RN.filtro = f; return k; })();
    var hoje = new Date().toLocaleDateString('pt-BR');
    var form = podeReg ? '<section class="nl-card rn-form"><div class="rn-cab"><h3>Novo recebimento</h3><small>sem nota fiscal · ' + hoje + ' · ' + esc((USUARIO_LOGADO && USUARIO_LOGADO.nome) || '') + '</small></div>' +
      '<div class="rn-buscawrap"><label class="nl-busca"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/></svg><input id="rnBusca" data-rnq="1" autocomplete="off" placeholder="Bipe ou digite o item para acrescentar" value="' + esc(RN.q) + '"></label>' +
      (res.length ? '<div class="rn-res">' + res.map(function(it){ return '<button data-rna="add" data-c="' + esc(it.cod) + '"><b>' + esc(it.cod) + '</b> ' + esc(it.name || '') + '</button>'; }).join('') + '</div>' : (semAc(RN.q).trim().length >= 2 ? '<div class="rn-res"><div class="nl-vazio">Nenhum item encontrado</div></div>' : '')) + '</div>' +
      (RN.itens.length ? '<div class="rn-linhas">' + RN.itens.map(linhaForm).join('') + '</div>' : '<div class="nl-vazio">Bipe ou busque os itens que chegaram. Cada um entra na lista com o local, os paletes e os sacos.</div>') +
      '<div class="rn-extra"><label><span>Data</span><input type="date" id="rnData" value="' + esc(RN.data) + '"></label><label class="rn-obsl"><span>Observação (opcional)</span><input id="rnObs" data-rnobs="1" value="' + esc(RN.obs) + '" placeholder="De onde veio, transportadora, condição da carga…"></label></div>' +
      '<div class="nl-barra rn-barra" id="rnBarra"><span><b>' + RN.itens.length + ' ' + (RN.itens.length === 1 ? 'item' : 'itens') + '</b> · ' + somaTxt() + '</span><span class="nl-acoes">' + (RN.itens.length ? '<button class="nl-btn sec" data-rna="descartar">Descartar</button>' : '') + '<button class="nl-btn" data-rna="salvar"' + (RN.itens.length && !RN.salvando ? '' : ' disabled') + '>' + (RN.salvando ? 'Registrando…' : 'Registrar recebimento') + '</button></span></div></section>'
      : '<section class="nl-card"><div class="nl-vazio">Seu cargo não registra recebimento. Aqui você vê os recebimentos.</div></section>';
    var hist = '<section class="nl-card rn-hist"><div class="rn-cab"><h3>Recebimentos</h3></div><div class="nl-chips" style="padding:0 14px">' +
      [['hoje','Hoje'],['7','7 dias'],['todos','Todos'],['pend','Não apontados (' + nPend + ')']].map(function(f){ return '<button class="nl-chip sm' + (RN.filtro === f[0] ? ' on' : '') + '" data-rna="filtro" data-v="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div style="padding:10px 14px"><input class="rn-busca2" data-rnb="1" placeholder="Buscar item, nº ou quem recebeu" value="' + esc(RN.busca) + '"></div>' +
      '<div class="rn-gs">' + (gs.length ? gs.slice(0, 60).map(htmlGrupo).join('') : '<div class="nl-vazio">Nenhum recebimento para esse filtro.</div>') + '</div></section>';
    w.innerHTML = '<div class="rn-grid">' + form + hist + '</div><div class="nl-rodape"><button class="nl-link" onclick="invLayoutNovo(false)">Usar o layout antigo</button></div>';
  }
  window.invRecebRender = render;

  async function salvar(){
    if(RN.salvando) return;
    if(!podeRegistrarRecebimento()){ toast('⛔ Você não tem permissão para registrar recebimento.'); return; }
    var linhas = RN.itens.filter(function(x){ return qtdLinha(x) > 0; });
    if(!linhas.length){ toast('⚠️ Informe a quantidade de pelo menos um item.'); return; }
    if(linhas.length < RN.itens.length && !confirm((RN.itens.length - linhas.length) + ' item(ns) estão sem quantidade e ficam de fora. Registrar mesmo assim?')) return;
    RN.salvando = true; render();
    var agora = new Date(), dEl = document.getElementById('rnData');
    var dataInf = dEl && dEl.value ? formatarDataBRparaFiltro(dEl.value) : agora.toLocaleDateString('pt-BR');
    var hora = agora.toLocaleTimeString('pt-BR'), grupo = 'REC-' + agora.getTime() + '-' + Math.floor(Math.random() * 1000);
    var nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—', usuario = (USUARIO_LOGADO && USUARIO_LOGADO.usuario) || '—';
    var regs = linhas.map(function(x, i){ var it = itemDe(x.cod); var sp = semPal(it);
      return {id: linhas.length === 1 ? grupo : grupo + '-' + (i + 1), grupo: grupo, grupoN: linhas.length, idx: i, cod: x.cod, nome: it.name || '', quantidade: qtdLinha(x), unidade: unid(it),
        local: x.lbl || null, pal: sp ? 0 : (+x.pal || 0), sac: +x.sac || 0, pp: sp ? null : (+x.pp || getSacsPorPal(x.cod)),
        data: dataInf, dataHora: dataInf + ' ' + hora, usuario: usuario, nomeUsuario: nome, observacao: String(RN.obs || '').trim()}; });
    try{
      for(var i = 0; i < regs.length; i++){ RECEBIMENTOS.unshift(regs[i]); await salvarRecebimentoSheets(regs[i]); }
      salvarRecebimentosLocal();
      toast('✅ Recebimento registrado: ' + regs.length + ' ' + (regs.length === 1 ? 'item' : 'itens') + ' · ' + somaTxt());
      RN.itens = []; RN.obs = ''; RN.data = ''; RN.aberto = grupo; RN.filtro = 'hoje'; try{ localStorage.removeItem(LS); }catch(e){}
    }catch(e){ console.error(e); toast('❌ Não foi possível registrar. Verifique a conexão e tente de novo.', 5000); }
    RN.salvando = false; render();
  }
  function apontar(g, sim){
    if(!podeAuditarEstoque()){ toast('⛔ Você não tem permissão para apontar recebimentos.'); return; }
    var quem = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—', dh = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
    (RECEBIMENTOS || []).filter(function(r){ return (r.grupo || r.id) === g && !!r.apontado !== sim; }).forEach(function(r){
      r.apontado = sim; r.apontadoPor = sim ? quem : ''; r.apontadoDataHora = sim ? dh : ''; salvarRecebimentoSheets(r); });
    salvarRecebimentosLocal(); toast(sim ? '✔ Recebimento marcado como apontado' : 'Apontamento desfeito'); render();
  }

  var tB = null;
  document.addEventListener('input', function(e){
    var t = e.target; if(!t || !t.closest || !t.closest('#rnWrap')) return;
    if(t.dataset.rn){ var x = RN.itens[+t.dataset.i]; if(!x) return; x[t.dataset.rn] = t.value === '' ? '' : Math.max(0, parseInt(t.value, 10) || 0); guardar();
      var it = itemDe(x.cod), q = qtdLinha(x), el = document.getElementById('rnTot' + t.dataset.i); if(el) el.textContent = q ? n(q) + ' ' + unid(it) : '—';
      var b = document.querySelector('#rnBarra > span'); if(b) b.innerHTML = '<b>' + RN.itens.length + ' ' + (RN.itens.length === 1 ? 'item' : 'itens') + '</b> · ' + somaTxt(); return; }
    if(t.dataset.rnobs){ RN.obs = t.value; guardar(); return; }
    if(t.id === 'rnData'){ RN.data = t.value; return; }
    if(t.dataset.rnq || t.dataset.rnb){ var campo = t.dataset.rnq ? 'q' : 'busca'; RN[campo] = t.value; clearTimeout(tB); tB = setTimeout(function(){ var p = t.selectionStart; render(); var f = document.querySelector(t.dataset.rnq ? '#rnBusca' : '[data-rnb]'); if(f){ f.focus(); try{ f.setSelectionRange(p, p); }catch(x){} } }, 200); }
  });
  document.addEventListener('change', function(e){ if(e.target && e.target.id === 'rnData') RN.data = e.target.value; });
  document.addEventListener('keydown', function(e){
    var t = e.target; if(!t || !t.closest || !t.closest('#rnWrap')) return;
    if(e.key === 'Enter' && t.dataset.rnq){ e.preventDefault(); clearTimeout(tB); RN.q = t.value; var Q = String(t.value).trim().toUpperCase(); var it = fonte().find(function(i){ return i.cod.toUpperCase() === Q; }); var rs = resultados();
      if(it) acrescentar(it.cod); else if(rs.length === 1) acrescentar(rs[0].cod); else { render(); var f = document.getElementById('rnBusca'); if(f) f.focus(); if(!rs.length) toast('Item não encontrado: ' + t.value); } }
    if(e.key === 'Enter' && t.dataset.rn){ e.preventDefault(); var b = document.getElementById('rnBusca'); if(b) b.focus(); }
  });
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('#rnWrap [data-rna]'); if(!b) return;
    var a = b.dataset.rna, i = +b.dataset.i;
    if(a === 'add') acrescentar(b.dataset.c);
    else if(a === 'loc'){ var x = RN.itens[i]; x.loc = b.dataset.v; x.lbl = b.dataset.l; guardar(); render(); }
    else if(a === 'tirar'){ RN.itens.splice(i, 1); guardar(); render(); }
    else if(a === 'descartar'){ if(!confirm('Descartar os itens deste recebimento?')) return; RN.itens = []; RN.obs = ''; try{ localStorage.removeItem(LS); }catch(x){} render(); }
    else if(a === 'salvar') salvar();
    else if(a === 'filtro'){ RN.filtro = b.dataset.v; render(); }
    else if(a === 'abrir'){ RN.aberto = RN.aberto === b.dataset.g ? null : b.dataset.g; render(); }
    else if(a === 'apontar') apontar(b.dataset.g, true);
    else if(a === 'desapontar') apontar(b.dataset.g, false);
    else if(a === 'folha'){ if(window.invFolhas && window.invFolhas.disponivel()) window.invFolhas.recebimento(b.dataset.g); else toast('Gerador de PDF indisponível. Recarregue a página.'); }
  });

  var _mm = window.confMudarModo;
  window.confMudarModo = function(m){ var r = _mm.apply(this, arguments); if(m === 'recebimento') aplicar(); return r; };
  var _rr = window.renderRecebimentos;
  window.renderRecebimentos = function(){ var r = _rr.apply(this, arguments); if(ligado() && document.getElementById('confModoRecebimentoWrap') && document.getElementById('confModoRecebimentoWrap').style.display !== 'none'){ var a = document.activeElement; if(!(a && a.closest && a.closest('#rnWrap'))) aplicar(); } return r; };
  var _lig = window.invLayoutNovo; window.invLayoutNovo = function(v){ _lig(v); aplicar(); };

  var css = document.createElement('style'); css.textContent = [
    'body.rn-on #recebCard{display:none!important}',
    '#rnWrap{margin-bottom:14px}.rn-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:14px;align-items:start}',
    '@media (max-width:1099px){.rn-grid{grid-template-columns:minmax(0,1fr)}}',
    '.rn-form{display:flex;flex-direction:column;overflow:hidden}.rn-cab{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:14px 14px 8px}.rn-cab h3{margin:0;font-size:17px}.rn-cab small{color:var(--text2)}',
    '.rn-buscawrap{position:relative;padding:0 14px 12px;border-bottom:1px solid var(--border)}.rn-buscawrap .nl-busca{display:flex}',
    '.rn-res{position:absolute;left:14px;right:14px;top:52px;z-index:5;background:#fff;border:1px solid var(--border2);border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.14);overflow:hidden}',
    '.rn-res button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--border);background:#fff;padding:12px 14px;font:13px "Segoe UI",system-ui;cursor:pointer;min-height:46px}.rn-res button:hover{background:var(--bg3)}',
    '.rn-lin{display:grid;grid-template-columns:minmax(150px,1.8fr) auto auto minmax(90px,.8fr) 44px;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)}',
    '.rn-locs{display:flex;gap:4px;flex-wrap:wrap}.rn-qs{display:flex;gap:8px}.rn-q{display:flex;flex-direction:column;gap:2px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3)}',
    '.rn-tot{text-align:right;font-size:15px}.rn-x{width:40px;height:40px;border-radius:8px;border:1px solid var(--border2);background:#fff;color:var(--red);font-size:20px;cursor:pointer}',
    '.rn-extra{display:grid;grid-template-columns:170px 1fr;gap:10px;padding:12px 14px}.rn-extra label{display:flex;flex-direction:column;gap:4px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3)}',
    '.rn-extra input{height:42px;border:1.5px solid var(--border2);border-radius:8px;padding:0 10px;font-size:14px;text-transform:none;letter-spacing:0;font-weight:400;color:var(--text)}',
    '.rn-hist{overflow:hidden}.rn-busca2{width:100%;height:38px;border:1px solid var(--border2);border-radius:8px;padding:0 10px;font-size:13px}',
    '.rn-g{border-top:1px solid var(--border)}.rn-g.aberto{background:var(--accent-dim)}.rn-gh{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;text-align:left;padding:11px 14px;font:inherit;cursor:pointer;min-height:52px}',
    '.rn-gh span{flex:1;min-width:0}.rn-gh b{display:block;font-size:13px}.rn-gh small{display:block;font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rn-gh em{font-style:normal;font-weight:800;color:var(--green);white-space:nowrap;font-size:12px}',
    '.rn-st{font-size:10px;font-weight:700;border-radius:999px;padding:3px 8px;white-space:nowrap}.rn-st.ok{background:var(--green-dim);color:var(--green)}.rn-st.pend{background:var(--yellow-dim);color:var(--yellow)}.rn-st.meio{background:var(--orange-dim);color:var(--orange)}',
    '.rn-det{padding:0 14px 12px;display:flex;flex-direction:column;gap:6px}.rn-dl{display:flex;gap:8px;align-items:baseline;font-size:12px;flex-wrap:wrap}.rn-dl span{flex:1;min-width:0}.rn-obs{font-size:12px;color:var(--text2)}',
    '.rn-acs{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px}.rn-acs .nl-btn{height:40px;padding:0 14px;font-size:13px}',
    '@media (max-width:640px){.rn-lin{grid-template-columns:1fr auto;grid-template-areas:"it x" "loc loc" "qs tot"}.rn-lin>.nl-it{grid-area:it}.rn-lin>.rn-x{grid-area:x}.rn-lin>.rn-locs,.rn-lin>.nl-loc{grid-area:loc;justify-self:start}.rn-lin>.rn-qs{grid-area:qs}.rn-lin>.rn-tot{grid-area:tot;align-self:end}',
    '.rn-q .nl-in{width:96px;height:52px;font-size:22px}.rn-extra{grid-template-columns:1fr}.rn-barra .nl-acoes{margin-left:0;width:100%}.rn-barra .nl-btn{flex:1;height:52px}}'
  ].join('\n'); document.head.appendChild(css);
})();
