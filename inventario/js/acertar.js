// ===== ACERTAR NO SISTEMA (14/10) =====
// Na Auditoria: os itens cuja ÚLTIMA contagem de cada local ficou diferente do saldo do Focco (no momento da contagem)
// acima da tolerância. Tolerância = sacos E % (as duas precisam passar). Guardada em config/geral.invTol {sc, pct}.
// Mostra também quem diverge em 3 contagens seguidas (o mesmo aviso aparece no Meu dia do painel).
(function(){
  'use strict';
  var AC = {aberto: true, soPend: true, editTol: false, lim: 60};
  function esc(s){ return escapeHTML(s); }
  function n(v){ return (Number(v)||0).toLocaleString('pt-BR'); }
  function tol(){ var P = window.PAINEL_INV; var t = P && P.tol ? P.tol() : null; return {sc: Math.max(0, +(t && t.sc) || 0), pct: Math.max(0, +(t && t.pct) || 0)}; }
  function passa(dif, sis, T){ var a = Math.abs(dif); if(!a) return false; if(a <= T.sc) return false; if(T.pct > 0 && sis > 0 && a / sis * 100 <= T.pct) return false; return true; }
  window.invTolPassa = passa;
  function quando(c){ return _parseDataHoraBR(c.dataHora || c.data || '') || 0; }
  function fonte(){ return (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || []; }
  // linhas (cod × local) de todas as conferências, da mais nova para a mais antiga
  function leituras(){
    var cp = confPerm(), out = {};
    var cs = (CONF_HISTORICO || []).slice().sort(function(a, b){ return quando(b) - quando(a); });
    cs.forEach(function(conf){ Object.keys(conf.itens || {}).forEach(function(cod){ var it = conf.itens[cod]; var inv = fonte().find(function(i){ return i.cod === cod; }) || null;
      [['3', it.almox3, it.saldoSistema3, it.l3 || (inv ? localLabel(inv) : 'Almox 3')], ['30', it.almox30, it.saldoSistema30, it.l30 || 'Almox 30']].forEach(function(s){
        var cont = Number(s[1]) || 0; if(!(cont > 0 || (it.confirmadoZero && s[0] === '3'))) return; if(s[2] == null || s[2] === '') return;
        var lbl = s[3]; if(!cp.acessoTotal){ var mp = {'Almox 3':'podeContarAlmox3','Almox 30':'podeContarAlmox30','Rejunte':'podeContarRejunte','Separação':'podeContarSeparacao','Almox 1':'podeContarAlmox1','Almox 2':'podeContarAlmox2'}; if(mp[lbl] && !cp[mp[lbl]]) return; }
        var k = cod + '|' + s[0]; (out[k] = out[k] || []).push({conf: conf, cod: cod, nome: it.nome || (inv && inv.name) || '', bloco: s[0], lbl: lbl, cont: cont, sis: Number(s[2]) || 0, dif: cont - (Number(s[2]) || 0), un: inv ? unidSing(inv) : 'sc'}); }); }); });
    return out;
  }
  function lista(){
    var T = tol(), L = leituras(), res = [];
    Object.keys(L).forEach(function(k){ var ls = L[k], u = ls[0]; if(!passa(u.dif, u.sis, T)) return;
      var st = getAuditStatus(u.conf.numero, u.cod, u.lbl); if(AC.soPend && (st === 'validado' || st === 'resolvido')) return;
      var seg = 0; for(var i = 0; i < ls.length && passa(ls[i].dif, ls[i].sis, T); i++) seg++;
      res.push(Object.assign({st: st, seg: seg}, u)); });
    return res.sort(function(a, b){ return Math.abs(b.dif) - Math.abs(a.dif); });
  }
  window.invAcertarLista = lista;

  function render(){
    var pg = document.getElementById('pg-divergencias'); if(!pg) return; var w = document.getElementById('acWrap');
    if(!(podeAuditarEstoque() || perfil().podeAudit)){ if(w) w.remove(); return; }
    if(!w){ var wr = pg.querySelector('.wrap'); if(!wr) return; w = document.createElement('div'); w.id = 'acWrap'; wr.insertBefore(w, wr.children[1] || null); }
    var a = document.activeElement; if(a && a.closest && a.closest('#acWrap') && a.tagName === 'INPUT') return;
    var T = tol(), ls = lista(), rep = ls.filter(function(x){ return x.seg >= 3; }).length, podeTol = !!perfil().podeAdmin || podeAuditarEstoque();
    var tolTxt = T.sc || T.pct ? 'acima de ' + n(T.sc) + ' sacos' + (T.pct ? ' e de ' + n(T.pct) + '%' : '') : 'qualquer diferença';
    var corpo = ls.slice(0, AC.lim).map(function(x){ return '<div class="ac-tr"><span class="ac-it"><b>' + esc(x.cod) + '</b><small>' + esc(x.nome) + '</small></span><span class="ac-loc l' + x.bloco + '">' + esc(x.lbl) + '</span>' +
      '<span class="r">' + n(x.cont) + '</span><span class="r">' + n(x.sis) + '</span><span class="r"><b class="' + (x.dif < 0 ? 'ac-neg' : 'ac-pos') + '">' + (x.dif > 0 ? '+' : '') + n(x.dif) + ' ' + esc(x.un) + '</b>' + (x.sis ? '<small>' + (x.dif > 0 ? '+' : '') + Math.round(x.dif / x.sis * 100) + '%</small>' : '') + '</span>' +
      '<span><small>' + esc(x.conf.data || '') + ' · ' + esc(x.conf.nomeUsuario || '') + '</small>' + (x.seg >= 3 ? '<small class="ac-rep">' + x.seg + ' contagens seguidas com diferença</small>' : '') + '</span>' +
      '<span class="r">' + auditStatusBadgeHTML(x.st, true) + (podeAuditarEstoque() && x.st === 'nao_auditado' ? ' <button class="btn" style="height:28px;padding:0 10px;font-size:11px" onclick="abrirValidarSaldo(\'' + esc(x.conf.numero) + '\',\'' + esc(x.cod) + '\',\'' + esc(x.lbl) + '\')">Auditar</button>' : '') + '</span></div>'; }).join('');
    w.innerHTML = '<div class="card ac-card"><div class="card-title"><button class="ac-tog" data-aca="tog">' + (AC.aberto ? '▾' : '▸') + ' Acertar no sistema</button>' +
      '<span class="ac-res">' + ls.length + ' ' + (ls.length === 1 ? 'item' : 'itens') + (rep ? ' · <b class="ac-neg">' + rep + ' diverge' + (rep === 1 ? '' : 'm') + ' toda contagem</b>' : '') + '</span>' +
      '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="btn" style="height:28px;font-size:11px" data-aca="csv">⬇ CSV</button><button class="btn btn-primary" style="height:28px;font-size:11px" data-aca="pdf">📄 PDF</button></span></div>' +
      (AC.aberto ? '<div class="ac-cfg"><span>Diferença do saldo do Focco na hora da contagem, última contagem de cada local. Tolerância: <b>' + tolTxt + '</b></span>' +
        (podeTol ? (AC.editTol ? '<span class="ac-tol"><label>Sacos <input type="number" min="0" id="acTolSc" value="' + T.sc + '"></label><label>% <input type="number" min="0" step="0.5" id="acTolPct" value="' + T.pct + '"></label><button class="btn btn-primary" style="height:30px" data-aca="tolok">Salvar</button><button class="btn" style="height:30px" data-aca="tolx">Cancelar</button></span>' : '<button class="ac-link" data-aca="tol">mudar tolerância</button>') : '') +
        '<label class="ac-pend"><input type="checkbox" data-aca="pend"' + (AC.soPend ? ' checked' : '') + '> esconder os já auditados</label></div>' +
        (ls.length ? '<div class="ac-tab"><div class="ac-tr ac-th"><span>Item</span><span>Local</span><span class="r">Contado</span><span class="r">Sistema</span><span class="r">Diferença</span><span>Contagem</span><span class="r">Auditoria</span></div>' + corpo + '</div>' +
          (ls.length > AC.lim ? '<button class="ac-mais" data-aca="mais">Mostrar mais (faltam ' + (ls.length - AC.lim) + ')</button>' : '') : '<div class="ac-vazio">Nenhum item com diferença acima da tolerância.</div>') : '') + '</div>';
  }
  window.invAcertarRender = render;
  function csv(){ var ls = lista(); if(!ls.length){ toast('Nada para exportar.'); return; }
    var L = [['Código','Descrição','Local','Contado','Sistema','Diferença','Diferença %','Data da contagem','Conferente','Contagens seguidas com diferença','Auditoria']].concat(ls.map(function(x){ return [x.cod, x.nome, x.lbl, x.cont, x.sis, x.dif, x.sis ? Math.round(x.dif / x.sis * 100) : '', x.conf.data || '', x.conf.nomeUsuario || '', x.seg, (AUDIT_STATUS_MAP[x.st] || {}).label || '']; }));
    var t = '﻿' + L.map(function(r){ return r.map(function(v){ v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
    var u = URL.createObjectURL(new Blob([t], {type: 'text/csv;charset=utf-8'})), a = document.createElement('a'); a.href = u; a.download = 'Acertar_no_sistema_' + new Date().toISOString().slice(0,10) + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 60000); toast('CSV baixado.'); }
  function pdf(){ var ls = lista(); if(!ls.length){ toast('Nada para imprimir.'); return; } if(!(window.invFolhas && window.invFolhas.disponivel())){ toast('Gerador de PDF indisponível.'); return; }
    var T = tol();
    window.invFolhas.tabela('ACERTAR NO SISTEMA', 'Diferença entre a contagem e o saldo do Focco', [{t:'ITEM', w:34}, {t:'LOCAL', w:11, al:'center'}, {t:'CONTADO', w:11, al:'right'}, {t:'SISTEMA', w:11, al:'right'}, {t:'DIFERENÇA', w:12, al:'right'}, {t:'CONTAGEM', w:16}, {t:'ACERTADO', w:10, al:'center'}],
      ls.map(function(x){ return {c:[[x.cod, x.nome], x.lbl, n(x.cont), n(x.sis), (x.dif > 0 ? '+' : '') + n(x.dif), [x.conf.data || '', x.conf.nomeUsuario || ''], ''], negrito:[0,4], cores:{4: x.dif < 0 ? [171,74,66] : [138,99,38]}, h:10}; }),
      'Acertar_no_sistema_' + new Date().toISOString().slice(0,10) + '.pdf', 'Tolerância: ' + (T.sc || T.pct ? 'acima de ' + T.sc + ' sacos' + (T.pct ? ' e de ' + T.pct + '%' : '') : 'qualquer diferença') + '. Marque "Acertado" quando lançar no Focco.'); }
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('#acWrap [data-aca]'); if(!b || b.tagName === 'INPUT') return; var a = b.dataset.aca;
    if(a === 'tog'){ AC.aberto = !AC.aberto; render(); } else if(a === 'csv') csv(); else if(a === 'pdf') pdf(); else if(a === 'mais'){ AC.lim += 60; render(); }
    else if(a === 'tol'){ AC.editTol = true; render(); } else if(a === 'tolx'){ AC.editTol = false; render(); }
    else if(a === 'tolok'){ var sc = Math.max(0, +document.getElementById('acTolSc').value || 0), pc = Math.max(0, +document.getElementById('acTolPct').value || 0); var P = window.PAINEL_INV;
      if(!P || !P.gravar){ toast('Sem conexão com o painel.'); return; }
      P.gravar('salvarTol', 'geral', {sc: sc, pct: pc}).then(function(){ AC.editTol = false; toast('Tolerância salva.'); setTimeout(render, 300); }).catch(function(){}); } });
  document.addEventListener('change', function(e){ var t = e.target; if(t && t.dataset && t.dataset.aca === 'pend'){ AC.soPend = t.checked; render(); } });
  var _rd = window.renderDivergencias; window.renderDivergencias = function(){ var r = _rd.apply(this, arguments); try{ render(); }catch(e){ console.warn('[acertar]', e); } return r; };
  var css = document.createElement('style'); css.textContent = [
    '.ac-card .card-title{flex-wrap:wrap;gap:8px}.ac-tog{border:0;background:none;font:inherit;font-weight:800;color:inherit;cursor:pointer;padding:0}.ac-res{font-size:11px;font-weight:600;color:var(--text2);text-transform:none;letter-spacing:0}',
    '.ac-cfg{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:12px;color:var(--text2);margin-bottom:10px}.ac-tol{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ac-tol input{width:70px;height:30px;margin-left:4px;text-align:center}.ac-pend{display:flex;gap:6px;align-items:center}',
    '.ac-tab{border:1px solid var(--border);border-radius:8px;overflow:auto}.ac-tr{display:grid;grid-template-columns:minmax(170px,2fr) 96px 80px 80px 110px minmax(120px,1.2fr) 150px;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border);min-width:860px;font-size:12px}',
    '.ac-it b{display:block;font-size:12px}.ac-it small{display:block;font-size:10.5px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.r{text-align:right}',
    '.ac-loc{font-size:10px;font-weight:700;border-radius:20px;padding:2px 8px;background:var(--accent-dim);color:var(--accent);justify-self:start}.ac-loc.l30{background:var(--green-dim);color:var(--green)}',
    '.ac-neg{color:var(--red)}.ac-pos{color:var(--yellow)}.ac-link{border:0;background:none;color:var(--accent);font-weight:700;font-size:11px;cursor:pointer;padding:0}',
    '.ac-mais{width:100%;margin-top:8px;height:30px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;color:var(--accent);font-weight:700;font-size:11px;cursor:pointer}.ac-vazio{text-align:center;padding:16px;color:var(--text3);font-size:11px}',
    '.ac-th{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);background:var(--bg3)}.ac-tr small{display:block;font-size:10.5px;color:var(--text2)}.ac-tr .ac-rep{color:var(--red);font-weight:700}'
  ].join('\n'); document.head.appendChild(css);
})();
