// ===== RECEBIMENTO COM VÁRIOS ITENS, NO MESMO FORMULÁRIO (14/10) =====
// O formulário de sempre ganha "+ Pôr na lista": escolhe o item, a quantidade e põe na lista; repete; "Registrar Recebimento"
// grava todos de uma vez. Cada item continua sendo um registro de recebimento (mesmo formato), com o mesmo "grupo".
// No histórico, um recebimento com vários itens aparece numa linha só (abre para ver os itens) e é apontado de uma vez.
(function(){
  'use strict';
  var LISTA = [];
  var LS = 'receb_lista';
  window.RECEB_LISTA = LISTA;
  function esc(s){ return escapeHTML(s); }
  function n(v){ return (Number(v)||0).toLocaleString('pt-BR'); }
  function unid(item){ return temUnidadePropria(item) && !temConversaoBulk(item) ? item.unidade : (item.temRejunte ? 'fardo' : 'sc'); }
  function guardar(){ try{ localStorage.setItem(LS, JSON.stringify(LISTA)); }catch(e){} }
  try{ (JSON.parse(localStorage.getItem(LS) || '[]') || []).forEach(function(x){ if(x && x.cod) LISTA.push(x); }); }catch(e){}

  function montar(){
    var body = document.getElementById('recebCardBody'); if(!body || document.getElementById('recebLista')) return;
    var brow = body.querySelector('.brow'); if(!brow) return;
    var lista = document.createElement('div'); lista.id = 'recebLista'; brow.parentNode.insertBefore(lista, brow);
    var b = document.createElement('button'); b.className = 'btn'; b.id = 'btnRecebPorLista'; b.type = 'button'; b.textContent = '+ Pôr na lista'; b.title = 'Guarda este item e deixa escolher o próximo';
    b.onclick = porNaLista; brow.insertBefore(b, brow.firstChild);
    var qtd = document.getElementById('recebQtd'); if(qtd) qtd.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); porNaLista(); } });
    desenharLista();
  }
  function desenharLista(){
    var el = document.getElementById('recebLista'); if(!el) return;
    var bReg = document.querySelector('#recebCardBody .brow .btn-primary');
    if(!LISTA.length){ el.innerHTML = ''; if(bReg) bReg.innerHTML = '💾 Registrar Recebimento'; return; }
    var soma = {}; LISTA.forEach(function(x){ soma[x.unidade] = (soma[x.unidade]||0) + x.quantidade; });
    el.innerHTML = '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:16px;overflow:hidden">' +
      '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg3);font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.03em"><span>Itens deste recebimento</span><span>' + LISTA.length + '</span></div>' +
      LISTA.map(function(x, i){ return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid var(--border);font-size:12px">' +
        '<span style="flex:1;min-width:0"><b>' + esc(x.cod) + '</b> <span style="color:var(--text2);font-size:11px">' + esc(x.nome) + '</span></span>' +
        '<b style="color:var(--green)">+' + n(x.quantidade) + ' ' + esc(x.unidade) + '</b>' +
        '<button class="btn tap-target-sm" type="button" style="height:26px;width:26px;padding:0;color:var(--red)" title="Tirar da lista" onclick="recebTirarDaLista(' + i + ')">✕</button></div>'; }).join('') +
      '<div style="display:flex;justify-content:flex-end;padding:8px 12px;border-top:1px solid var(--border);font-size:12px;font-weight:700">Total: ' + Object.keys(soma).map(function(u){ return n(soma[u]) + ' ' + u; }).join(' + ') + '</div></div>';
    if(bReg) bReg.innerHTML = '💾 Registrar Recebimento (' + LISTA.length + ' ' + (LISTA.length === 1 ? 'item' : 'itens') + ')';
  }
  window.recebTirarDaLista = function(i){ LISTA.splice(i, 1); guardar(); desenharLista(); };
  function itemAtual(){ var it = _recebItemSelecionado; var q = Math.max(0, parseInt((document.getElementById('recebQtd') || {}).value, 10) || 0); return it ? {item: it, qtd: q} : null; }
  function porNaLista(){
    if(!podeRegistrarRecebimento()){ toast('⛔ Você não tem permissão para registrar recebimento.'); return false; }
    var a = itemAtual();
    if(!a){ toast('⚠️ Escolha o item antes.'); var b = document.getElementById('recebBuscaItem'); if(b) b.focus(); return false; }
    if(a.qtd <= 0){ toast('⚠️ Informe a quantidade recebida.'); var q = document.getElementById('recebQtd'); if(q) q.focus(); return false; }
    var ja = LISTA.find(function(x){ return x.cod === a.item.cod; });
    if(ja) ja.quantidade += a.qtd; else LISTA.push({cod: a.item.cod, nome: a.item.name || '', quantidade: a.qtd, unidade: unid(a.item)});
    guardar(); limparItemRecebimento(); var qe = document.getElementById('recebQtd'); if(qe) qe.value = '';
    toast(ja ? 'Somado: ' + a.item.cod + ' agora tem ' + ja.quantidade + ' ' + ja.unidade : '+ ' + a.item.cod + ' na lista');
    desenharLista(); var bs = document.getElementById('recebBuscaItem'); if(bs) bs.focus();
    return true;
  }

  // Registrar: sem lista, faz como sempre; com lista, grava todos (o item que ainda está no formulário entra junto)
  var _salvar = window.salvarRecebimento;
  window.salvarRecebimento = async function(){
    if(!LISTA.length) return _salvar.apply(this, arguments);
    if(!podeRegistrarRecebimento()){ toast('⛔ Você não tem permissão para registrar recebimento.'); return; }
    var a = itemAtual(); if(a && a.qtd > 0 && !porNaLista()) return;
    var dataEl = document.getElementById('recebData'), obsEl = document.getElementById('recebObs');
    var agora = new Date(), dataInf = dataEl && dataEl.value ? formatarDataBRparaFiltro(dataEl.value) : agora.toLocaleDateString('pt-BR');
    var hora = agora.toLocaleTimeString('pt-BR'), grupo = 'REC-' + agora.getTime() + '-' + Math.floor(Math.random() * 1000);
    var nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—', usuario = (USUARIO_LOGADO && USUARIO_LOGADO.usuario) || '—', obs = ((obsEl || {}).value || '').trim();
    var regs = LISTA.map(function(x, i){ return {id: LISTA.length === 1 ? grupo : grupo + '-' + (i + 1), grupo: grupo, grupoN: LISTA.length, idx: i, cod: x.cod, nome: x.nome, quantidade: x.quantidade, unidade: x.unidade,
      data: dataInf, dataHora: dataInf + ' ' + hora, usuario: usuario, nomeUsuario: nome, observacao: obs}; });
    var b = document.querySelector('#recebCardBody .brow .btn-primary'); if(b) b.disabled = true;
    try{
      for(var i = 0; i < regs.length; i++){ RECEBIMENTOS.unshift(regs[i]); await salvarRecebimentoSheets(regs[i]); }
      salvarRecebimentosLocal();
      toast('✅ Recebimento registrado: ' + regs.length + ' ' + (regs.length === 1 ? 'item' : 'itens'));
      LISTA.length = 0; guardar(); if(obsEl) obsEl.value = ''; if(dataEl) dataEl.value = '';
      _recebItemExpandido = grupo;
    }catch(e){ console.error(e); toast('❌ Não foi possível registrar. Verifique a conexão e tente de novo.', 5000); }
    if(b) b.disabled = false;
    desenharLista(); renderRecebimentos();
  };

  // ---------- histórico: um recebimento com vários itens = uma linha ----------
  function agrupados(lista){
    var out = [], vistos = {};
    (lista || []).forEach(function(r){
      if(!r.grupo || !(r.grupoN > 1)){ out.push(r); return; }
      if(vistos[r.grupo]) return; vistos[r.grupo] = 1;
      var rs = lista.filter(function(x){ return x.grupo === r.grupo; }).sort(function(a, b){ return (a.idx||0) - (b.idx||0); });
      var soma = {}; rs.forEach(function(x){ soma[x.unidade || 'sc'] = (soma[x.unidade || 'sc']||0) + (Number(x.quantidade)||0); });
      var us = Object.keys(soma), ap = rs.filter(function(x){ return x.apontado; });
      out.push({id: r.grupo, grupo: r.grupo, _grupo: true, cod: rs.length + ' itens', nome: rs.map(function(x){ return x.cod; }).join(', '),
        quantidade: n(soma[us[0]]), unidade: us[0] + (us.length > 1 ? ' + ' + us.slice(1).map(function(u){ return n(soma[u]) + ' ' + u; }).join(' + ') : ''),
        data: r.data, dataHora: r.dataHora, usuario: r.usuario, nomeUsuario: r.nomeUsuario,
        observacao: r.observacao || '', _itens: rs,
        apontado: ap.length === rs.length, apontadoPor: ap.length === rs.length ? (rs[0].apontadoPor || '') : '', apontadoDataHora: ap.length === rs.length ? (rs[0].apontadoDataHora || '') : ''});
    });
    return out;
  }
  var _render = window.renderRecebimentos;
  window.renderRecebimentos = function(){
    montar();
    var orig = RECEBIMENTOS; RECEBIMENTOS = agrupados(orig);
    try{ _render.apply(this, arguments); } finally { RECEBIMENTOS = orig; }
    // comprovante em PDF no recebimento aberto
    if(_recebItemExpandido && window.invFolhas){ var linha = document.querySelector('#recebHistorico [onclick="toggleRecebItem(\'' + String(_recebItemExpandido).replace(/'/g, '') + '\')"]');
      var det = linha && linha.lastElementChild; if(det && det !== linha.firstElementChild && !det.querySelector('.receb-pdf')){ var bt = document.createElement('button'); bt.className = 'btn receb-pdf'; bt.style.cssText = 'height:26px;padding:0 12px;font-size:11px;align-self:flex-start'; bt.textContent = '📄 Comprovante (PDF)'; var g = _recebItemExpandido; bt.onclick = function(e){ e.stopPropagation(); if(window.invFolhas.disponivel()) window.invFolhas.recebimento(g); else toast('Gerador de PDF indisponível. Recarregue a página.'); }; var vir = agrupados(RECEBIMENTOS).find(function(x){ return x.id === g && x._grupo; });
        if(vir){ var li = document.createElement('div'); li.className = 'receb-itens'; li.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin:2px 0 4px';
          li.innerHTML = vir._itens.map(function(x){ return '<div style="display:flex;gap:8px"><span style="flex:1"><b>' + esc(x.cod) + '</b> ' + esc(x.nome || '') + '</span><b style="color:var(--green)">+' + n(x.quantidade) + ' ' + esc(x.unidade || '') + '</b>' + (x.apontado ? ' <span style="color:var(--green)">✔</span>' : '') + '</div>'; }).join('');
          det.insertBefore(li, det.children[1] || null); }
        det.appendChild(bt); } }
  };
  function doGrupo(id){ return (RECEBIMENTOS || []).filter(function(r){ return r.grupo === id && r.grupoN > 1; }); }
  var _marca = window.marcarRecebimentoApontado, _desm = window.desmarcarRecebimentoApontado;
  window.marcarRecebimentoApontado = function(id){ var rs = doGrupo(id); if(!rs.length) return _marca.apply(this, arguments);
    if(!podeAuditarEstoque()){ toast('⛔ Você não tem permissão para apontar recebimentos.'); return; }
    var quem = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—', dh = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
    rs.forEach(function(r){ if(r.apontado) return; r.apontado = true; r.apontadoPor = quem; r.apontadoDataHora = dh; salvarRecebimentoSheets(r); });
    salvarRecebimentosLocal(); toast('✔ Recebimento marcado como apontado (' + rs.length + ' itens)'); renderRecebimentos(); };
  window.desmarcarRecebimentoApontado = function(id){ var rs = doGrupo(id); if(!rs.length) return _desm.apply(this, arguments);
    if(!podeAuditarEstoque()) return;
    rs.forEach(function(r){ if(!r.apontado) return; r.apontado = false; r.apontadoPor = ''; r.apontadoDataHora = ''; salvarRecebimentoSheets(r); });
    salvarRecebimentosLocal(); toast('Apontamento desfeito'); renderRecebimentos(); };
})();
