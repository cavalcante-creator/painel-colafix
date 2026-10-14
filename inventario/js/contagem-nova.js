// ===== CONTAGEM NOVA (14/10) =====
// Computador: tabela, digita direto na linha do item (sem o passo "selecionar → iniciar").
// Celular: um item por vez, com botões grandes de + e −, e uma revisão antes de salvar.
// Usa o mesmo estado da contagem antiga (CONFERENCIAS / updateConf / salvarConferencia), então o que é salvo é igual.
// "Usar o layout antigo" volta para as telas de antes (escolha guardada no aparelho).
(function(){
  'use strict';
  var NL = {local:'todos', q:'', grupo:'', dia:false, lim:80, i:0, lista:null, tela:'inicio', rasg:{}, cel:null, achado:null};
  window.NL_ESTADO = NL;
  var LS = 'inv.layout';
  function ligado(){ try{ return localStorage.getItem(LS) !== 'antigo'; }catch(e){ return true; } }
  function setLigado(v){ try{ localStorage.setItem(LS, v ? 'novo' : 'antigo'); }catch(e){} aplicar(); }
  function celular(){ return (window.innerWidth || 1200) < 900; }
  function esc(s){ return escapeHTML(s); }
  function n(v){ return (Number(v)||0).toLocaleString('pt-BR'); }
  function fonte(){ return (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || []; }
  function itemDe(cod){ var f = fonte(); for(var i = 0; i < f.length; i++) if(f[i].cod === cod) return f[i]; return null; }

  // ---------- filtros ----------
  var LOCAIS = [['todos','Todos'],['almox3','Almox 3'],['almox30','Almox 30'],['rejunte','Rejunte'],['separacao','Separação'],['almox1','Almox 1'],['almox2','Almox 2']];
  var FLAG = {almox3:'temAlmox3', almox30:'temAlmox30', rejunte:'temRejunte', separacao:'temSeparacao', almox1:'temAlmox1', almox2:'temAlmox2'};
  function locaisVisiveis(){ var cp = confPerm(), f = confPerfilFiltro(); if(f) return LOCAIS.filter(function(l){ return l[0] === f; });
    var temItem = function(k){ return fonte().some(function(i){ return i[FLAG[k]] && itemPermitidoParaContagem(i); }); };
    return LOCAIS.filter(function(l){ if(l[0] === 'todos') return true; var p = {almox3:cp.podeContarAlmox3, almox30:cp.podeContarAlmox30, rejunte:cp.podeContarRejunte, separacao:cp.podeContarSeparacao, almox1:cp.podeContarAlmox1, almox2:cp.podeContarAlmox2}[l[0]]; return p && temItem(l[0]); }); }
  function localAtual(){ return confPerfilFiltro() || NL.local; }
  function filtrosRapidos(){ var pf = perfil(); var ok = pf.confFiltros || (pf.podeAdmin ? CONF_FILTROS_CONFIG.map(function(f){ return f.id; }) : []); return CONF_FILTROS_CONFIG.filter(function(f){ return ok.indexOf(f.id) >= 0; }); }
  function passaGrupo(item){
    if(!NL.grupo) return true; var f = CONF_FILTROS_CONFIG.find(function(x){ return x.id === NL.grupo; }); if(!f) return true;
    if(CONF_FILTROS_MODO === 'planilha'){ var m = FILTROS_ITEM_MAP[item.cod.toUpperCase()]; return !!(m && m.has(f.id)); }
    var nm = (item.name || '').toLowerCase();
    if(f.id === 'COLAFIX') return !(nm.indexOf('bautech') >= 0 || nm.indexOf('pozosul') >= 0 || / (py|uy)\b/.test(nm));
    return nm.indexOf(String(f.keyword || f.id).toLowerCase()) >= 0;
  }
  function semAcento(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function filtrados(){
    var loc = localAtual(), q = semAcento(NL.q).trim(), ps = q ? q.split(/\s+/) : [];
    var base = fonte().filter(function(it){
      if(!itemPermitidoParaContagem(it) || !blocos(it).length) return false;
      if(loc !== 'todos' && !it[FLAG[loc]]) return false;
      if(ps.length){ var alvo = semAcento(it.cod + ' ' + (it.name || '')); if(!ps.every(function(p){ return alvo.indexOf(p) >= 0; })) return false; }
      return passaGrupo(it);
    });
    if(NL.dia) base = contagemDoDia(base);
    return base;
  }
  // Contagem do dia: os itens há mais tempo sem contagem (lista ÷ 20, entre 10 e 30)
  function dataBR(s){ var m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? +(m[3] + m[2] + m[1]) : 0; }
  function contagemDoDia(lista){
    var qt = Math.max(10, Math.min(30, Math.round(lista.length / 20))); if(lista.length <= qt) return lista;
    return lista.map(function(it){ var u = ultimaContagemItem(it.cod); return {it: it, d: u ? dataBR(u.data) : 0}; })
      .sort(function(a, b){ return a.d - b.d || a.it.cod.localeCompare(b.it.cod); }).slice(0, qt).map(function(x){ return x.it; });
  }
  function blocos(it){ var b = window.invBlocosItem(it); var loc = localAtual();
    if(loc === 'almox3' || loc === 'rejunte' || loc === 'separacao' || loc === 'almox1') b = b.filter(function(x){ return x.k === '3'; });
    if(loc === 'almox30' || loc === 'almox2') b = b.filter(function(x){ return x.k === '30'; });
    return b; }
  function semPal(it){ return window.invSemPalete(it); }
  function un(it){ return unidSing(it); }

  // ---------- estado da contagem ----------
  function c(cod){ return CONFERENCIAS[cod] || {}; }
  function preenchido(cod){ var x = CONFERENCIAS[cod]; return !!x && ((+x.pal3||0) > 0 || (+x.sac3||0) > 0 || (+x.pal30||0) > 0 || (+x.sac30||0) > 0 || (+x.qtdRasgada||0) > 0 || !!x.confirmadoZero); }
  function nPreench(){ return Object.keys(CONFERENCIAS).filter(preenchido).length; }
  function totalTxt(it){ var x = c(it.cod), t = (+x.total3||0) + (+x.total30||0); if(!preenchido(it.cod)) return ''; if(x.confirmadoZero && !t) return 'zero';
    var pal = (+x.pal3||0) + (+x.pal30||0), sac = (+x.sac3||0) + (+x.sac30||0); return n(t) + ' ' + un(it) + (pal ? '<small>' + pal + ' pal + ' + sac + '</small>' : ''); }
  function setCampo(cod, tipo, val){
    var v = Math.max(0, parseInt(val, 10) || 0);
    if(tipo === 'rasg'){ setQtdRasgadaConf(cod, v); }
    else updateConf(cod, v, tipo);
    if(CONFERENCIAS[cod] && CONFERENCIAS[cod].confirmadoZero && tipo !== 'rasg' && v > 0) CONFERENCIAS[cod].confirmadoZero = false;
    CONF_ITENS_SEL.add(cod);
    atualizarLinha(cod); atualizarBarra();
  }
  function restaurarRascunho(){
    if(Object.keys(CONFERENCIAS).length) return;
    try{ var t = JSON.parse(localStorage.getItem('conf_temp') || 'null'); if(!t) return; var k = 0;
      Object.keys(t).forEach(function(cod){ if(itemDe(cod)){ CONFERENCIAS[cod] = t[cod]; CONF_ITENS_SEL.add(cod); if(preenchido(cod)) k++; } });
      if(k) toast('🔄 Contagem em andamento recuperada: ' + k + ' item(ns).', 3500); }catch(e){}
  }

  // ---------- montagem ----------
  function wrap(){ var w = document.getElementById('nlWrap'); if(!w){ var pai = document.getElementById('confModoContagemWrap'); if(!pai) return null; w = document.createElement('div'); w.id = 'nlWrap'; pai.insertBefore(w, pai.firstChild); } return w; }
  function aplicar(){
    var on = ligado(); document.body.classList.toggle('nl-on', on);
    var b = document.getElementById('nlVoltarNovo'); if(!b){ var t = document.querySelector('#confSelCard .card-title'); if(t){ t.insertAdjacentHTML('beforeend', '<button id="nlVoltarNovo" class="btn" style="margin-left:auto;height:26px;font-size:10px" onclick="invLayoutNovo(true)">Usar o layout novo</button>'); } }
    if(on){ restaurarRascunho(); render(); }
    else { var w = document.getElementById('nlWrap'); if(w) w.innerHTML = ''; if(typeof filtrarItensConf === 'function') filtrarItensConf(); }
  }
  window.invLayoutNovo = setLigado;
  function render(){
    if(!ligado()) return; var w = wrap(); if(!w) return;
    NL.cel = celular();
    w.innerHTML = NL.cel ? htmlCel() : htmlPC();
    if(NL.achado){ var r = document.querySelector('[data-nlrow="' + CSS.escape(NL.achado) + '"]'); if(r){ r.classList.add('nl-achou'); var i = r.querySelector('input[data-nl]'); if(i){ i.focus(); i.select && i.select(); } r.scrollIntoView({block:'center'}); } NL.achado = null; }
  }
  window.invContagemRender = render;

  function chipsLocal(){ var vs = locaisVisiveis(); if(vs.length <= 2 && confPerfilFiltro()) return '<span class="nl-chip on">' + esc(vs[0] ? vs[0][1] : 'Meu local') + '</span>';
    return vs.map(function(l){ return '<button class="nl-chip' + (localAtual() === l[0] ? ' on' : '') + '" data-nla="local" data-v="' + l[0] + '">' + esc(l[1]) + '</button>'; }).join(''); }
  function chipsGrupo(){ var fs = filtrosRapidos(); if(!fs.length) return ''; return '<div class="nl-chips nl-grupos">' + fs.map(function(f){ return '<button class="nl-chip sm' + (NL.grupo === f.id ? ' on' : '') + '" data-nla="grupo" data-v="' + esc(f.id) + '"' + (f.title ? ' title="' + esc(f.title) + '"' : '') + '>' + esc(f.label) + '</button>'; }).join('') + '</div>'; }
  var ICO_BIP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/></svg>';
  function busca(ph){ return '<label class="nl-busca">' + ICO_BIP + '<input id="nlBusca" data-nlq="1" autocomplete="off" placeholder="' + ph + '" value="' + esc(NL.q) + '"></label>'; }
  function verSistema(){ return podeAuditarEstoque() && !MODO_CEGO; }

  // ---------- computador: tabela ----------
  function htmlPC(){
    var lista = filtrados(), vis = lista.slice(0, NL.lim), sis = verSistema();
    var cab = '<div class="nl-tr nl-th' + (sis ? ' sis' : '') + '"><span>Item</span><span>Palete</span><span>Local</span><span>Paletes</span><span>Sacos / fardos</span><span>Rasgado</span><span class="r">Total contado</span>' + (sis ? '<span class="r">Sistema</span>' : '') + '<span></span></div>';
    var linhas = vis.map(function(it){ return linhaPC(it, sis); }).join('');
    return '<section class="nl-card nl-bar">' + busca('Bipe a etiqueta ou digite código / nome (Enter vai para o item)') +
      '<div class="nl-chips">' + chipsLocal() + '</div>' +
      '<div class="nl-chips"><button class="nl-chip' + (NL.dia ? ' on' : '') + '" data-nla="dia">Contagem do dia</button>' +
      (podeAuditarEstoque() ? '<label class="nl-cega"><input type="checkbox" data-nla="cega"' + (MODO_CEGO ? ' checked' : '') + '> Contagem cega</label>' : '') + '</div>' + chipsGrupo() + '</section>' +
      '<section class="nl-card nl-tab">' + cab + (linhas || '<div class="nl-vazio">Nenhum item para esse filtro.</div>') +
      (lista.length > vis.length ? '<button class="nl-mais" data-nla="mais">Mostrar mais ' + Math.min(80, lista.length - vis.length) + ' (faltam ' + (lista.length - vis.length) + ')</button>' : '') +
      barra(lista) + '</section>' +
      '<div class="nl-rodape"><button class="nl-link" onclick="invLayoutNovo(false)">Usar o layout antigo</button></div>';
  }
  function campo(cod, tipo, val, rot, cls){ return '<input class="nl-in' + (cls ? ' ' + cls : '') + (val ? ' tem' : '') + '" type="number" min="0" inputmode="numeric" data-nl="' + tipo + '" data-c="' + esc(cod) + '" aria-label="' + esc(rot) + '" value="' + (val || '') + '" placeholder="—">'; }
  function linhaPC(it, sis){
    var x = c(it.cod), bs = blocos(it), sp = semPal(it), cod = it.cod, rg = +x.qtdRasgada || 0;
    var cel = function(bk){ return bs.map(function(b){ var t = bk === 'loc' ? '<span class="nl-loc l' + b.k + '">' + esc(b.lbl) + '</span>' : bk === 'pal' ? (sp ? '<span class="nl-na">—</span>' : campo(cod, 'pal' + b.k, x['pal' + b.k], cod + ' ' + b.lbl + ' paletes')) : campo(cod, 'sac' + b.k, x['sac' + b.k], cod + ' ' + b.lbl + ' ' + (sp ? un(it) : 'sacos'));
      return '<div class="nl-sub">' + t + '</div>'; }).join(''); };
    var s3 = Number(it.saldo3)||0, s30 = Number(it.saldo30)||0;
    var sisTxt = sis ? bs.map(function(b){ var s = b.k === '3' ? s3 : s30, t = b.k === '3' ? (+x.total3||0) : (+x.total30||0), d = t - s; return '<div class="nl-sub r">' + n(s) + (preenchido(cod) ? ' <b class="' + (d ? (d < 0 ? 'neg' : 'pos') : 'ok') + '">' + (d > 0 ? '+' : '') + n(d) + '</b>' : '') + '</div>'; }).join('') : '';
    return '<div class="nl-tr' + (sis ? ' sis' : '') + (preenchido(cod) ? ' feito' : '') + (rg ? ' rasg' : '') + '" data-nlrow="' + esc(cod) + '">' +
      '<span class="nl-it"><b>' + esc(cod) + '</b><small>' + esc(it.name || '') + '</small></span>' +
      '<span>' + (sp ? '<span class="nl-na">' + esc(un(it)) + '</span>' : '<input class="nl-pp" type="number" min="1" inputmode="numeric" data-pp="' + esc(cod) + '" value="' + getSacsPorPal(cod) + '" title="Sacos por palete (só nesta contagem)" onchange="mudarPalete(\'' + esc(cod) + '\', this.value)">') + '</span>' +
      '<span>' + cel('loc') + '</span><span>' + cel('pal') + '</span><span>' + cel('sac') + '</span>' +
      '<span>' + campo(cod, 'rasg', rg, cod + ' rasgado', 'rasg') + (rg ? '<input class="nl-mot" data-nlmot="' + esc(cod) + '" placeholder="Motivo" value="' + esc(x.motivoRasgo || '') + '">' : '') + '</span>' +
      '<span class="r nl-tot" id="nlTot_' + esc(cod) + '">' + (totalTxt(it) || '<i>não contado</i>') + '</span>' + (sis ? '<span>' + sisTxt + '</span>' : '') +
      '<span class="r"><button class="nl-zero' + (x.confirmadoZero ? ' on' : '') + '" data-nla="zero" data-c="' + esc(cod) + '" title="Contei e não tem nenhum">Zero</button></span></div>';
  }
  function barra(lista){ var k = nPreench(), rg = Object.keys(CONFERENCIAS).filter(function(k2){ return (+CONFERENCIAS[k2].qtdRasgada||0) > 0; }).length;
    return '<div class="nl-barra" id="nlBarra"><span><b id="nlNum">' + k + ' ' + (k === 1 ? 'item' : 'itens') + '</b> preenchido' + (k === 1 ? '' : 's') + (rg ? ' · ' + rg + ' com rasgado' : '') + (lista ? ' · ' + lista.length + ' na lista' : '') + '</span>' +
      (k ? '<small>Rascunho guardado neste aparelho</small>' : '') +
      '<span class="nl-acoes">' + (k ? '<button class="nl-btn sec" data-nla="limpar">Limpar</button>' : '') + '<button class="nl-btn sec" data-nla="folha">Imprimir folha em branco</button>' +
      '<button class="nl-btn" data-nla="salvar"' + (k ? '' : ' disabled') + '>Salvar contagem</button></span></div>'; }
  function atualizarLinha(cod){
    var it = itemDe(cod); if(!it) return;
    var r = document.querySelector('[data-nlrow="' + CSS.escape(cod) + '"]');
    if(r){ r.classList.toggle('feito', preenchido(cod)); var rg = +(c(cod).qtdRasgada) || 0; var tinha = r.classList.contains('rasg'); r.classList.toggle('rasg', rg > 0);
      var t = document.getElementById('nlTot_' + cod); if(t) t.innerHTML = totalTxt(it) || '<i>não contado</i>';
      if(tinha !== (rg > 0) && !NL.cel){ var ativo = document.activeElement; var dc = ativo && ativo.dataset && ativo.dataset.nl; var novo = document.createElement('div'); novo.innerHTML = linhaPC(it, verSistema()); r.replaceWith(novo.firstChild); if(dc){ var f = document.querySelector('[data-nlrow="' + CSS.escape(cod) + '"] [data-nl="' + dc + '"]'); if(f){ f.focus(); var v = f.value; f.value = ''; f.value = v; } } }
      r.querySelectorAll && r.querySelectorAll('input[data-nl]').forEach(function(i){ i.classList.toggle('tem', !!(+i.value)); });
    }
    var tc = document.getElementById('nlTotCel'); if(tc) tc.innerHTML = totalCel(it);
  }
  function atualizarBarra(){ var b = document.getElementById('nlBarra'); if(!b) return; var tmp = document.createElement('div'); tmp.innerHTML = NL.cel ? barraCel() : barra(NL.cel ? null : filtrados()); b.replaceWith(tmp.firstChild); }

  // ---------- celular: um item por vez ----------
  function listaCel(){ if(!NL.lista) NL.lista = filtrados().map(function(i){ return i.cod; }); return NL.lista; }
  function htmlCel(){
    if(NL.tela === 'item') return htmlItem();
    if(NL.tela === 'revisao') return htmlRevisao();
    NL.lista = null; var lista = filtrados(), k = nPreench();
    var itens = lista.slice(0, NL.lim).map(function(it, i){ var f = preenchido(it.cod); return '<button class="nl-li' + (f ? ' feito' : '') + '" data-nla="abrir" data-i="' + i + '"><span><b>' + esc(it.cod) + '</b><small>' + esc(it.name || '') + '</small></span><em>' + (f ? totalTxt(it).replace(/<small>.*<\/small>/, '') : '') + '</em></button>'; }).join('');
    return '<section class="nl-card nl-cel">' + busca('Bipe ou digite o item') + '<div class="nl-chips">' + chipsLocal() + '<button class="nl-chip' + (NL.dia ? ' on' : '') + '" data-nla="dia">Contagem do dia</button></div>' + chipsGrupo() + '</section>' +
      '<button class="nl-btn grande" data-nla="comecar"' + (lista.length ? '' : ' disabled') + '>Começar a contar (' + lista.length + ' ' + (lista.length === 1 ? 'item' : 'itens') + ')</button>' +
      (k ? '<button class="nl-btn grande ok" data-nla="revisar">Revisar e salvar (' + k + ' contado' + (k === 1 ? '' : 's') + ')</button>' : '') +
      '<section class="nl-card nl-lista">' + (itens || '<div class="nl-vazio">Nenhum item para esse filtro.</div>') + (lista.length > NL.lim ? '<button class="nl-mais" data-nla="mais">Mostrar mais</button>' : '') + '</section>' +
      '<div class="nl-rodape"><button class="nl-link" data-nla="folha">Imprimir folha em branco</button> · <button class="nl-link" onclick="invLayoutNovo(false)">Usar o layout antigo</button></div>';
  }
  function stepper(cod, tipo, val, rot){ return '<div class="nl-step"><span class="nl-rot">' + esc(rot) + '</span><div><button class="nl-pm" data-nla="menos" data-c="' + esc(cod) + '" data-t="' + tipo + '" aria-label="Menos">−</button>' +
    '<input class="nl-in big" type="number" min="0" inputmode="numeric" data-nl="' + tipo + '" data-c="' + esc(cod) + '" aria-label="' + esc(rot) + '" value="' + (val || '') + '" placeholder="0"><button class="nl-pm mais" data-nla="mais1" data-c="' + esc(cod) + '" data-t="' + tipo + '" aria-label="Mais">+</button></div></div>'; }
  function totalCel(it){ var x = c(it.cod), t = (+x.total3||0) + (+x.total30||0), pp = getSacsPorPal(it.cod), sp = semPal(it);
    var conta = sp ? '' : blocos(it).map(function(b){ var p = +x['pal' + b.k] || 0, s = +x['sac' + b.k] || 0; return p ? p + ' × ' + pp + ' + ' + s : ''; }).filter(Boolean).join(' · ');
    return '<span>Total</span><b>' + n(t) + ' ' + esc(un(it)) + '</b>' + (x.confirmadoZero && !t ? '<em>zerado</em>' : conta ? '<em>' + conta + '</em>' : ''); }
  function htmlItem(){
    var L = listaCel(); if(!L.length){ NL.tela = 'inicio'; return htmlCel(); }
    NL.i = Math.max(0, Math.min(NL.i, L.length - 1)); var it = itemDe(L[NL.i]); if(!it){ NL.tela = 'inicio'; return htmlCel(); }
    var x = c(it.cod), sp = semPal(it), bs = blocos(it), rg = +x.qtdRasgada || 0, ult = NL.i === L.length - 1;
    var corpo = bs.map(function(b){ return '<div class="nl-bloco"><span class="nl-loc l' + b.k + '">' + esc(b.lbl) + '</span>' +
      (sp ? '' : stepper(it.cod, 'pal' + b.k, x['pal' + b.k], 'Paletes')) + stepper(it.cod, 'sac' + b.k, x['sac' + b.k], sp ? (un(it) === 'fardo' ? 'Fardos' : un(it)) : 'Sacos soltos') + '</div>'; }).join('');
    var abrirRasg = rg > 0 || NL.rasg[it.cod];
    return '<header class="nl-prog"><div class="nl-pbar"><i style="width:' + Math.round((NL.i + 1) / L.length * 100) + '%"></i></div><b>' + (NL.i + 1) + ' de ' + L.length + '</b><button class="nl-link" data-nla="inicio">Lista</button></header>' +
      busca('Bipe para ir a outro item') +
      '<section class="nl-card nl-item"><small class="nl-cod">' + esc(it.cod) + (sp ? '' : ' · palete de ' + getSacsPorPal(it.cod) + ' sc') + '</small><h3>' + esc(it.name || it.cod) + '</h3>' + corpo +
      '<div class="nl-totcel" id="nlTotCel">' + totalCel(it) + '</div>' +
      (abrirRasg ? '<div class="nl-bloco rasg">' + stepper(it.cod, 'rasg', rg, 'Sacos rasgados (à parte)') + '<input class="nl-mot" data-nlmot="' + esc(it.cod) + '" placeholder="Motivo (opcional)" value="' + esc(x.motivoRasgo || '') + '"></div>' : '') +
      '<div class="nl-links">' + (abrirRasg ? '' : '<button class="nl-link" data-nla="abrirrasg" data-c="' + esc(it.cod) + '">Tem saco rasgado</button>') + '<button class="nl-link' + (x.confirmadoZero ? ' on' : '') + '" data-nla="zero" data-c="' + esc(it.cod) + '">' + (x.confirmadoZero ? '✓ Marcado como zerado' : 'Está zerado') + '</button></div></section>' +
      '<div class="nl-nav"><button class="nl-btn sec grande" data-nla="ant"' + (NL.i ? '' : ' disabled') + '>Voltar</button><button class="nl-btn grande" data-nla="' + (ult ? 'revisar' : 'prox') + '">' + (ult ? 'Revisar e salvar' : 'Próximo item') + '</button></div>' + barraCel();
  }
  function barraCel(){ var k = nPreench(); return '<div id="nlBarra" class="nl-barcel">' + k + ' contado' + (k === 1 ? '' : 's') + (k ? ' · <button class="nl-link" data-nla="revisar">revisar e salvar</button>' : '') + '</div>'; }
  function htmlRevisao(){
    var cods = Object.keys(CONFERENCIAS).filter(preenchido);
    var itens = cods.map(function(cod){ var it = itemDe(cod) || {cod: cod, name: ''}; var x = c(cod); return '<div class="nl-li feito"><span><b>' + esc(cod) + '</b><small>' + esc(it.name || '') + '</small>' + ((+x.qtdRasgada||0) ? '<small class="neg">' + x.qtdRasgada + ' rasgado(s)</small>' : '') + '</span><em>' + (totalTxt(it).replace(/<small>.*<\/small>/, '') || '') + '</em><button class="nl-link" data-nla="editar" data-c="' + esc(cod) + '">mudar</button></div>'; }).join('');
    return '<header class="nl-prog"><b>Conferir antes de salvar</b><button class="nl-link" data-nla="inicio">Lista</button></header>' +
      '<section class="nl-card nl-lista">' + (itens || '<div class="nl-vazio">Nada contado ainda.</div>') + '</section>' +
      '<button class="nl-btn grande ok" data-nla="salvar"' + (cods.length ? '' : ' disabled') + '>Salvar contagem (' + cods.length + ' ' + (cods.length === 1 ? 'item' : 'itens') + ')</button>' +
      '<button class="nl-btn grande sec" data-nla="voltaritem">Continuar contando</button>' + (cods.length ? '<div class="nl-rodape"><button class="nl-link" data-nla="limpar">Apagar esta contagem</button></div>' : '');
  }

  // ---------- busca / bip ----------
  function achar(txt){
    var q = String(txt || '').trim(); if(!q) return false; var Q = q.toUpperCase();
    var it = fonte().find(function(i){ return i.cod.toUpperCase() === Q; });
    if(!it){ var ms = filtrados(); if(ms.length === 1) it = ms[0]; }
    if(!it) return false;
    if(!itemPermitidoParaContagem(it) || !window.invBlocosItem(it).length){ toast('⛔ Esse item não é de um local que você conta.'); return true; }
    NL.q = '';
    if(NL.cel){ var L = listaCel(); var i = L.indexOf(it.cod); if(i < 0){ L.push(it.cod); i = L.length - 1; } NL.i = i; NL.tela = 'item'; render(); setTimeout(function(){ var f = document.querySelector('.nl-item input[data-nl]'); if(f) f.focus(); }, 30); return true; }
    var lista = filtrados(); var pos = lista.findIndex(function(i){ return i.cod === it.cod; });
    if(pos < 0){ NL.local = 'todos'; NL.grupo = ''; NL.dia = false; lista = filtrados(); pos = lista.findIndex(function(i){ return i.cod === it.cod; }); }
    if(pos >= NL.lim) NL.lim = pos + 20;
    NL.achado = it.cod; render(); return true;
  }

  // ---------- eventos ----------
  var tBusca = null;
  document.addEventListener('input', function(e){
    var t = e.target; if(!t || !t.closest || !t.closest('#nlWrap')) return;
    if(t.dataset.nl){ setCampo(t.dataset.c, t.dataset.nl, t.value); return; }
    if(t.dataset.nlmot){ updateMotivoRasgoConf(t.dataset.nlmot, t.value); return; }
    if(t.dataset.nlq){ NL.q = t.value; if(NL.cel && NL.tela !== 'inicio') return; clearTimeout(tBusca); tBusca = setTimeout(function(){ var pos = t.selectionStart; render(); var b = document.getElementById('nlBusca'); if(b){ b.focus(); try{ b.setSelectionRange(pos, pos); }catch(x){} } }, 250); }
  });
  document.addEventListener('keydown', function(e){
    var t = e.target; if(!t || !t.closest || !t.closest('#nlWrap')) return;
    if(e.key === 'Enter' && t.dataset.nlq){ e.preventDefault(); clearTimeout(tBusca); NL.q = t.value; if(!achar(t.value)){ if(NL.cel && NL.tela !== 'inicio'){ toast('Item não encontrado: ' + t.value); t.select(); } else render(); } return; }
    if(e.key === 'Enter' && t.dataset.nl && !NL.cel){ e.preventDefault(); var ins = [].slice.call(document.querySelectorAll('#nlWrap input[data-nl]')); var i = ins.indexOf(t); if(ins[i + 1]){ ins[i + 1].focus(); ins[i + 1].select(); } }
  });
  document.addEventListener('change', function(e){ var t = e.target; if(t && t.dataset && t.dataset.nla === 'cega'){ MODO_CEGO = t.checked; var mc = document.getElementById('modoCego'); if(mc) mc.checked = t.checked; render(); } });
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('#nlWrap [data-nla]'); if(!b || b.tagName === 'INPUT') return;
    var a = b.dataset.nla, cod = b.dataset.c;
    if(a === 'local'){ NL.local = b.dataset.v; NL.lim = 80; render(); }
    else if(a === 'grupo'){ NL.grupo = NL.grupo === b.dataset.v ? '' : b.dataset.v; NL.lim = 80; render(); }
    else if(a === 'dia'){ NL.dia = !NL.dia; render(); }
    else if(a === 'mais'){ NL.lim += 80; render(); }
    else if(a === 'zero'){ var z = !(c(cod).confirmadoZero); setConfirmarZeroConf(cod, z); CONF_ITENS_SEL.add(cod); if(NL.cel) render(); else { var r = document.querySelector('[data-nlrow="' + CSS.escape(cod) + '"] .nl-zero'); if(r) r.classList.toggle('on', z); atualizarLinha(cod); atualizarBarra(); } }
    else if(a === 'menos' || a === 'mais1'){ var tp = b.dataset.t, inp = b.parentNode.querySelector('input'); var v = Math.max(0, (parseInt(inp.value, 10) || 0) + (a === 'menos' ? -1 : 1)); inp.value = v || ''; setCampo(cod, tp, v); }
    else if(a === 'abrirrasg'){ NL.rasg[cod] = true; render(); }
    else if(a === 'comecar'){ NL.lista = filtrados().map(function(i){ return i.cod; }); var p = NL.lista.findIndex(function(k){ return !preenchido(k); }); NL.i = p < 0 ? 0 : p; NL.tela = 'item'; render(); }
    else if(a === 'abrir'){ NL.lista = filtrados().map(function(i){ return i.cod; }); NL.i = +b.dataset.i; NL.tela = 'item'; render(); }
    else if(a === 'prox'){ NL.i++; render(); window.scrollTo(0, 0); }
    else if(a === 'ant'){ NL.i--; render(); window.scrollTo(0, 0); }
    else if(a === 'inicio'){ NL.tela = 'inicio'; render(); }
    else if(a === 'revisar'){ NL.tela = 'revisao'; render(); window.scrollTo(0, 0); }
    else if(a === 'voltaritem'){ NL.tela = NL.lista && NL.lista.length ? 'item' : 'inicio'; render(); }
    else if(a === 'editar'){ var L = listaCel(); var i = L.indexOf(cod); if(i < 0){ L.push(cod); i = L.length - 1; } NL.i = i; NL.tela = 'item'; render(); }
    else if(a === 'folha'){ gerarPDFListaContagem(); }
    else if(a === 'limpar'){ if(!confirm('Apagar o que foi digitado nesta contagem?')) return; Object.keys(CONFERENCIAS).forEach(function(k){ delete CONFERENCIAS[k]; }); CONF_ITENS_SEL.clear(); try{ localStorage.removeItem('conf_temp'); }catch(x){} NL.tela = 'inicio'; render(); }
    else if(a === 'salvar'){ salvar(b); }
  });
  async function salvar(b){
    if(b) b.disabled = true;
    var antes = CONF_HISTORICO.length;
    try{ await salvarConferencia(); }catch(e){ console.error(e); }
    if(CONF_HISTORICO.length > antes){ NL.tela = 'inicio'; NL.lista = null; NL.rasg = {}; }
    render();
  }
  // a folha em branco usa a lista da tela (filtro, local, contagem do dia)
  window.invItensParaFolha = function(){ if(!ligado()) return null; return {items: filtrados(), titulo: NL.dia ? 'contagem do dia' : ''}; };

  // ---------- ligar quando o programa abre a Contagem ----------
  var _mm = window.confMudarModo;
  window.confMudarModo = function(m){ var r = _mm.apply(this, arguments); if(m !== 'recebimento' && m !== 'auditoria') aplicar(); return r; };
  var _rc = window.renderConfHistorico; var tAplic = null;
  window.renderConfHistorico = function(){ var r = _rc.apply(this, arguments); if(ligado() && !document.getElementById('nlWrap')){ clearTimeout(tAplic); tAplic = setTimeout(aplicar, 0); } return r; };
  var larg = celular();
  window.addEventListener('resize', function(){ if(celular() !== larg){ larg = celular(); NL.tela = 'inicio'; render(); } });
  // dados novos do banco (itens, histórico): redesenha sem atrapalhar quem está digitando
  setInterval(function(){ if(!ligado() || !document.getElementById('nlWrap')) return; var a = document.activeElement; if(a && a.closest && a.closest('#nlWrap')) return;
    var sig = fonte().length + '|' + CONF_HISTORICO.length + '|' + (USUARIO_LOGADO ? USUARIO_LOGADO.nome : ''); if(sig !== NL.sig){ var prim = NL.sig == null; NL.sig = sig; if(!prim || !document.querySelector('#nlWrap .nl-card')) render(); } }, 2500);

  var css = document.createElement('style'); css.textContent = [
    'body.nl-on #confSelCard,body.nl-on #confPainelConf{display:none!important}',
    '#nlWrap{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}',
    '.nl-card{background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow)}',
    '.nl-bar{padding:14px 16px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}',
    '.nl-busca{flex:1 1 360px;display:flex;align-items:center;gap:10px;height:48px;border:1.5px solid var(--accent);border-radius:10px;padding:0 12px;background:#fff;color:var(--accent)}',
    '.nl-busca input{border:0;outline:0;flex:1;min-width:0;font-size:15px;background:transparent;color:var(--text);height:100%}',
    '.nl-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.nl-grupos{flex-basis:100%}',
    '.nl-chip{height:38px;padding:0 14px;border-radius:999px;border:1.5px solid var(--border2);background:#fff;font:600 13px "Segoe UI",system-ui;color:var(--text);cursor:pointer}',
    '.nl-chip.sm{height:30px;font-size:11px;padding:0 11px}.nl-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}',
    '.nl-cega{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);margin-left:6px}',
    '.nl-tab{overflow:hidden;display:flex;flex-direction:column}',
    '.nl-tr{display:grid;grid-template-columns:minmax(180px,2.4fr) 70px 90px 86px 86px 92px minmax(110px,1fr) 64px;gap:0 10px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border)}',
    '.nl-tr.sis{grid-template-columns:minmax(180px,2.4fr) 70px 90px 86px 86px 92px minmax(100px,1fr) 110px 64px}',
    '.nl-th{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);padding-top:10px;padding-bottom:10px;position:sticky;top:0;background:#fff;z-index:1}',
    '.nl-tr.feito{background:#EEF5F0}.nl-tr.rasg{background:var(--red-dim)}.nl-tr.nl-achou{outline:3px solid var(--accent);outline-offset:-3px}',
    '.nl-it{min-width:0}.nl-it b{display:block;font-size:13px}.nl-it small{display:block;font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.nl-sub{display:flex;align-items:center;min-height:42px}.nl-sub+.nl-sub{border-top:1px dashed var(--border)}.r{text-align:right;justify-content:flex-end}',
    '.nl-in{width:76px;height:38px;border:1.5px solid var(--border2);border-radius:7px;text-align:center;font-size:16px;font-weight:600;background:#fff}',
    '.nl-in:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}.nl-in.tem{border-color:var(--green);font-weight:800}.nl-in.rasg.tem{border-color:var(--red);color:var(--red)}',
    '.nl-pp{width:58px;height:30px;border:1px solid var(--border);border-radius:6px;text-align:center;font-size:12px;color:var(--text2)}',
    '.nl-mot{width:100%;height:30px;margin-top:4px;border:1px solid var(--red-mid);border-radius:6px;padding:0 8px;font-size:12px}',
    '.nl-loc{font-size:11px;font-weight:700;border-radius:999px;padding:3px 9px;background:var(--accent-dim);color:var(--accent)}.nl-loc.l30{background:var(--green-dim);color:var(--green)}',
    '.nl-na{color:var(--text3);font-size:12px}.nl-tot{font-weight:800;font-size:15px}.nl-tot small{display:block;font-size:11px;font-weight:400;color:var(--text2)}.nl-tot i{font-weight:400;font-size:12px;color:var(--text3)}',
    '.neg{color:var(--red)}.pos{color:var(--yellow)}.ok{color:var(--green)}',
    '.nl-zero{height:32px;padding:0 10px;border-radius:7px;border:1px solid var(--border2);background:#fff;font:600 12px "Segoe UI";cursor:pointer}.nl-zero.on{background:var(--text2);color:#fff;border-color:var(--text2)}',
    '.nl-mais{border:0;background:var(--bg3);height:44px;font:600 13px "Segoe UI";color:var(--accent);cursor:pointer;width:100%}',
    '.nl-barra{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--border);padding:12px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;font-size:14px}.nl-barra small{color:var(--text3)}',
    '.nl-acoes{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}',
    '.nl-btn{height:46px;padding:0 22px;border-radius:10px;border:0;background:var(--accent);color:#fff;font:700 14px "Segoe UI",system-ui;cursor:pointer}.nl-btn:disabled{opacity:.45;cursor:default}',
    '.nl-btn.sec{background:#fff;color:var(--text);border:1.5px solid var(--border2);font-weight:600}.nl-btn.ok{background:var(--green)}.nl-btn.grande{height:56px;width:100%;font-size:16px}',
    '.nl-vazio{padding:24px;text-align:center;color:var(--text3)}.nl-rodape{text-align:center;font-size:12px;color:var(--text3)}',
    '.nl-link{border:0;background:none;color:var(--accent);font:600 13px "Segoe UI";cursor:pointer;padding:6px 2px}.nl-link.on{color:var(--text2)}',
    '.nl-cel{padding:12px;display:flex;flex-direction:column;gap:10px}.nl-cel .nl-busca{flex:none}',
    '.nl-lista{display:flex;flex-direction:column;overflow:hidden}.nl-li{display:flex;align-items:center;gap:10px;text-align:left;width:100%;padding:12px 14px;border:0;border-bottom:1px solid var(--border);background:#fff;font:inherit;color:inherit;min-height:56px}',
    '.nl-li span{flex:1;min-width:0}.nl-li b{display:block;font-size:14px}.nl-li small{display:block;font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nl-li em{font-style:normal;font-weight:800;white-space:nowrap}.nl-li.feito{background:#EEF5F0}',
    '.nl-prog{display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:10px 14px;border:1px solid var(--border)}.nl-pbar{flex:1;height:8px;border-radius:9px;background:var(--bg4);overflow:hidden}.nl-pbar i{display:block;height:100%;background:var(--accent)}',
    '.nl-item{padding:16px;display:flex;flex-direction:column;gap:12px}.nl-item h3{font-size:20px;line-height:1.25;margin:0}.nl-cod{color:var(--text2);font-weight:600;font-size:12px}',
    '.nl-bloco{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--border)}.nl-bloco .nl-loc{align-self:flex-start}.nl-bloco.rasg .nl-in{color:var(--red)}',
    '.nl-step{display:flex;flex-direction:column;gap:4px}.nl-rot{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text3)}.nl-step>div{display:flex;gap:8px}',
    '.nl-pm{width:60px;height:60px;flex:none;border-radius:12px;border:1.5px solid var(--border2);background:#fff;font:700 26px "Segoe UI";cursor:pointer;color:var(--text)}.nl-pm.mais{background:var(--accent);border-color:var(--accent);color:#fff}',
    '.nl-in.big{flex:1;min-width:0;width:auto;height:60px;font-size:26px;border-radius:12px}',
    '.nl-totcel{display:flex;align-items:baseline;gap:8px;background:var(--bg3);border-radius:10px;padding:10px 12px}.nl-totcel span{color:var(--text2);font-size:13px}.nl-totcel b{font-size:24px}.nl-totcel em{margin-left:auto;font-style:normal;font-size:12px;color:var(--text2)}',
    '.nl-links{display:flex;gap:16px;flex-wrap:wrap}.nl-nav{display:grid;grid-template-columns:1fr 2fr;gap:10px}.nl-barcel{text-align:center;font-size:13px;color:var(--text2)}',
    '@media (max-width:899px){#nlWrap{gap:10px}.nl-chip{height:40px}}'
  ].join('\n'); document.head.appendChild(css);
})();
