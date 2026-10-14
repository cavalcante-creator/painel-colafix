// ===== FOLHAS EM PDF (14/10) =====
// Lista de contagem, conferência e comprovante de recebimento gerados com o jsPDF do painel.
// O PDF é baixado direto (no celular e no app instalado a janela nova de impressão era bloqueada);
// no computador abre numa aba para imprimir. Se o gerador não carregar, cai nas folhas antigas.
(function(){
  'use strict';
  var LOGO = null;
  function jsPDFcls(){ var j = window.jspdf || (window.parent && window.parent !== window && window.parent.jspdf); return j && j.jsPDF; }
  function carregarLogo(){
    if(LOGO !== null) return Promise.resolve(LOGO);
    return new Promise(function(res){
      var im = new Image();
      im.onload = function(){ try{ var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im,0,0); LOGO = {d:c.toDataURL('image/png'), w:im.naturalWidth, h:im.naturalHeight}; }catch(e){ LOGO = false; } res(LOGO); };
      im.onerror = function(){ LOGO = false; res(false); };
      im.src = 'icons/logo.png';
      setTimeout(function(){ if(LOGO === null){ LOGO = false; res(false); } }, 3000);
    });
  }
  function ehCelular(){ return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (window.innerWidth || 1200) < 900; }
  function entregar(doc, nome){
    var blob = doc.output('blob');
    window.__ultimaFolha = {nome: nome, tam: blob.size, tipo: blob.type};
    var url = URL.createObjectURL(blob);
    var abriu = null;
    if(!ehCelular()){ try{ abriu = window.open(url, '_blank'); }catch(e){ abriu = null; } }
    if(!abriu){ var a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(function(){ URL.revokeObjectURL(url); }, 120000);
    toast('📄 ' + (abriu ? 'Folha aberta para imprimir' : 'Folha baixada: ' + nome));
  }
  function agoraBR(){ var d = new Date(); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
  function nomeQuem(){ return (typeof USUARIO_LOGADO !== 'undefined' && USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—'; }
  function n(v){ return (Number(v)||0).toLocaleString('pt-BR'); }
  function txt(s){ return String(s == null ? '' : s).replace(/[^\u0000-ÿ–—•…]/g, ''); }

  // ---------- página: cabeçalho, caixas de informação, tabela com quebra de página, rodapé ----------
  function Folha(titulo, sub, direita){
    var J = jsPDFcls(); if(!J) throw new Error('sem jsPDF');
    var doc = new J('p','mm','a4');
    var W = 210, H = 297, M = 12, y = 0;
    function cab(){
      doc.setDrawColor(26,26,26); doc.setTextColor(26,26,26);
      if(LOGO){ var h = 9, w = Math.min(38, h * LOGO.w / LOGO.h); doc.addImage(LOGO.d, 'PNG', M, M, w, h); }
      else { doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(27,92,122); doc.text('COLAFIX', M, M + 7); doc.setTextColor(26,26,26); }
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text('Almoxarifado', M, M + 13);
      doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(txt(titulo), W/2, M + 6, {align:'center'});
      doc.setFont('helvetica','normal'); doc.setFontSize(9); if(sub) doc.text(txt(sub), W/2, M + 11, {align:'center'});
      doc.setFontSize(9); (direita || []).forEach(function(l, i){ doc.text(txt(l), W - M, M + 4 + i * 4.6, {align:'right'}); });
      doc.setLineWidth(0.6); doc.line(M, M + 17, W - M, M + 17); doc.setLineWidth(0.2);
      y = M + 22;
    }
    cab();
    var F = {
      doc: doc, W: W, H: H, M: M,
      get y(){ return y; }, set y(v){ y = v; },
      novaPagina: function(){ doc.addPage(); cab(); },
      caixas: function(lista){ // [[rótulo, valor], …]
        var g = 3, w = (W - 2*M - g*(lista.length-1)) / lista.length;
        lista.forEach(function(c, i){ var x = M + i*(w+g); doc.setDrawColor(150,145,132); doc.roundedRect(x, y, w, 12, 1.5, 1.5, 'S');
          doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(74,70,61); doc.text(txt(String(c[0]).toUpperCase()), x + 2.5, y + 4.2);
          doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(26,26,26); doc.text(doc.splitTextToSize(txt(c[1]), w - 5).slice(0,1), x + 2.5, y + 9.4); });
        y += 16;
      },
      // cols: [{t:'ITEM', w:60, al:'left'|'center'|'right'}]; linhas: {sec:'ALMOX 3', cor:[r,g,b]} ou {c:[células], h, cinza:[índices], negrito:[índices], fundo:[r,g,b]}
      tabela: function(cols, linhas, alturaPadrao){
        var x0 = M, larg = W - 2*M, soma = cols.reduce(function(a,c){ return a + c.w; }, 0), k = larg / soma;
        cols.forEach(function(c){ c.W = c.w * k; });
        function cabTab(){ doc.setFillColor(232,228,218); doc.rect(x0, y, larg, 7, 'F'); doc.setDrawColor(154,147,132); doc.rect(x0, y, larg, 7, 'S');
          doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(26,26,26); var x = x0;
          cols.forEach(function(c){ var tx = c.al === 'right' ? x + c.W - 2 : c.al === 'center' ? x + c.W/2 : x + 2; doc.text(txt(c.t), tx, y + 4.7, c.al && c.al !== 'left' ? {align:c.al} : undefined); x += c.W; });
          y += 7; }
        cabTab();
        var secAtual = null;
        linhas.forEach(function(L){
          var h = L.sec ? 6 : (L.h || alturaPadrao || 10);
          if(y + h > H - 30){ F.novaPagina(); cabTab(); if(secAtual && !L.sec) secLinha(secAtual, true); }
          if(L.sec){ secAtual = L; secLinha(L); return; }
          if(L.fundo){ doc.setFillColor(L.fundo[0],L.fundo[1],L.fundo[2]); doc.rect(x0, y, larg, h, 'F'); }
          var x = x0; doc.setDrawColor(154,147,132);
          cols.forEach(function(c, i){
            if((L.cinza||[]).indexOf(i) >= 0){ doc.setFillColor(239,236,229); doc.rect(x, y, c.W, h, 'F'); }
            doc.rect(x, y, c.W, h, 'S');
            var v = L.c[i]; var linhasTxt = Array.isArray(v) ? v : (v == null || v === '' ? [] : [String(v)]);
            linhasTxt.forEach(function(t, j){
              var neg = j === 0 && (L.negrito||[]).indexOf(i) >= 0;
              doc.setFont('helvetica', neg ? 'bold' : 'normal'); doc.setFontSize(j === 0 ? 9 : 7.5);
              if(L.cores && L.cores[i]){ var cc = L.cores[i]; doc.setTextColor(cc[0],cc[1],cc[2]); } else doc.setTextColor(j === 0 ? 26 : 74, j === 0 ? 26 : 70, j === 0 ? 26 : 61);
              var tl = doc.splitTextToSize(txt(t), c.W - 3).slice(0,1)[0] || '';
              var ty = y + (linhasTxt.length > 1 ? 4.2 + j*3.8 : h/2 + 1.3);
              var tx = c.al === 'right' ? x + c.W - 2 : c.al === 'center' ? x + c.W/2 : x + 2;
              doc.text(tl, tx, ty, c.al && c.al !== 'left' ? {align:c.al} : undefined);
            });
            x += c.W;
          });
          doc.setTextColor(26,26,26);
          y += h;
        });
        function secLinha(L, cont){ var c = L.cor || [27,92,122]; doc.setFillColor(c[0],c[1],c[2]); doc.rect(x0, y, larg, 6, 'F');
          doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255); doc.text(txt(L.sec + (cont ? ' (continuação)' : '')), x0 + 2, y + 4.2); doc.setTextColor(26,26,26); y += 6; }
        y += 4;
      },
      nota: function(t){ doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(74,70,61); var ls = doc.splitTextToSize(txt(t), W - 2*M); if(y + ls.length*3.6 > H - 30){ F.novaPagina(); } doc.text(ls, M, y + 3); y += ls.length * 3.6 + 3; doc.setTextColor(26,26,26); },
      assinaturas: function(nomes){
        var yy = H - 26, g = 14, w = (W - 2*M - g*(nomes.length-1)) / nomes.length;
        if(y > yy - 6){ F.novaPagina(); }
        nomes.forEach(function(nm, i){ var x = M + i*(w+g); doc.setDrawColor(26,26,26); doc.line(x, yy, x + w, yy); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(26,26,26); doc.text(txt(nm), x + w/2, yy + 4.5, {align:'center'}); });
      },
      fechar: function(rodape){
        var tot = doc.getNumberOfPages();
        for(var p = 1; p <= tot; p++){ doc.setPage(p); doc.setDrawColor(229,223,208); doc.line(M, H - 12, W - M, H - 12);
          doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(74,70,61); doc.text(txt(rodape + ' · Painel de Operação Colafix'), M, H - 8); doc.text('Folha ' + p + ' de ' + tot, W - M, H - 8, {align:'right'}); }
      }
    };
    return F;
  }

  // ---------- locais de um item (os mesmos blocos da contagem) ----------
  function blocos(item){
    var cp = confPerm(), b = [];
    var ve3 = (item.temAlmox3 && cp.podeContarAlmox3) || (item.temRejunte && cp.podeContarRejunte) || (item.temSeparacao && cp.podeContarSeparacao) || (item.temAlmox1 && cp.podeContarAlmox1);
    var ve30 = (item.temAlmox30 && cp.podeContarAlmox30) || (item.temAlmox2 && cp.podeContarAlmox2);
    if(ve3) b.push({k:'3', lbl: item.temRejunte && cp.podeContarRejunte ? 'Rejunte' : item.temSeparacao && cp.podeContarSeparacao ? 'Separação' : item.temAlmox1 && cp.podeContarAlmox1 ? 'Almox 1' : 'Almox 3'});
    if(ve30) b.push({k:'30', lbl: item.temAlmox2 && cp.podeContarAlmox2 ? 'Almox 2' : 'Almox 30'});
    return b;
  }
  window.invBlocosItem = blocos;
  function semPalete(item){ return !!item.temRejunte || (temUnidadePropria(item) && !temConversaoBulk(item)); }
  window.invSemPalete = semPalete;
  var COR_LOCAL = {'Almox 3':[27,92,122],'Almox 30':[63,125,92],'Rejunte':[91,63,166],'Separação':[184,92,0],'Almox 1':[184,92,0],'Almox 2':[91,63,166]};

  // ---------- 1) Lista de contagem (em branco) ----------
  async function folhaContagem(itens, opc){
    opc = opc || {};
    await carregarLogo();
    var porLocal = {}, ordem = [];
    itens.forEach(function(it){ blocos(it).filter(function(b){ return !opc.so || b.k === opc.so; }).forEach(function(b){ if(!porLocal[b.lbl]){ porLocal[b.lbl] = []; ordem.push(b.lbl); } porLocal[b.lbl].push(it); }); });
    var pref = ['Almox 3','Almox 30','Rejunte','Separação','Almox 1','Almox 2']; ordem.sort(function(a,b){ return pref.indexOf(a) - pref.indexOf(b); });
    var nLinhas = ordem.reduce(function(a,l){ return a + porLocal[l].length; }, 0);
    if(!nLinhas){ toast('Nenhum item para imprimir. Verifique os filtros.'); return false; }
    var num = 'LC-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + String(Date.now()).slice(-4);
    var F = Folha('LISTA DE CONTAGEM', MODO_CEGO_FOLHA() ? 'Contagem cega — sem o saldo do sistema' : 'Contagem física de estoque', ['Data: ____/____/______', 'Início: ____:____   Fim: ____:____', num]);
    F.caixas([['Local', ordem.join(' + ')], ['Itens', String(itens.length)], ['Impresso por', nomeQuem() + ' · ' + agoraBR()]]);
    var cols = [{t:'ITEM', w:34}, {t:'PALETE', w:9, al:'center'}, {t:'PALETES', w:12, al:'center'}, {t:'SACOS / FARDOS', w:14, al:'center'}, {t:'RASGADO', w:11, al:'center'}, {t:'OBSERVAÇÃO', w:24}];
    var linhas = [];
    ordem.forEach(function(l){ linhas.push({sec: l.toUpperCase() + (l === 'Rejunte' ? ' · em fardos' : ''), cor: COR_LOCAL[l]});
      porLocal[l].forEach(function(it){ var sp = semPalete(it); linhas.push({c:[[it.cod, it.name || ''], sp ? '—' : String(getSacsPorPal(it.cod)), '', '', '', ''], negrito:[0], cinza: sp ? [2] : [], h: 11}); }); });
    F.tabela(cols, linhas, 11);
    F.nota('Escreva 0 quando o item estiver zerado (em branco = não contado). Rasgado fica à parte e não entra no total. Depois, lance no Inventário pelo número desta lista.');
    F.assinaturas(['Conferente', 'Supervisor']);
    F.fechar('Lista ' + num);
    entregar(F.doc, 'Lista_de_contagem_' + num + '.pdf');
    return true;
  }
  function MODO_CEGO_FOLHA(){ return typeof MODO_CEGO === 'undefined' ? true : (MODO_CEGO || !podeAuditarEstoque()); }

  // ---------- 2) Conferência salva ----------
  async function folhaConferencia(num){
    var conf = (CONF_HISTORICO || []).find(function(c){ return c.numero === num; });
    if(!conf || !conf.itens || !Object.keys(conf.itens).length){ toast('Conferência não encontrada ou sem itens.'); return false; }
    await carregarLogo();
    var verSis = podeAuditarEstoque();
    var fonte = (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || [];
    var linhas = [], totRasg = 0, nDif = 0;
    var cols = verSis
      ? [{t:'ITEM', w:30}, {t:'LOCAL', w:11, al:'center'}, {t:'PALETES', w:9, al:'center'}, {t:'SACOS', w:9, al:'center'}, {t:'CONTADO', w:12, al:'right'}, {t:'SISTEMA', w:11, al:'right'}, {t:'DIFERENÇA', w:12, al:'right'}, {t:'RASGADO', w:10, al:'center'}]
      : [{t:'ITEM', w:36}, {t:'LOCAL', w:12, al:'center'}, {t:'PALETES', w:10, al:'center'}, {t:'SACOS', w:10, al:'center'}, {t:'TOTAL', w:14, al:'right'}, {t:'RASGADO', w:12, al:'center'}];
    Object.keys(conf.itens).sort().forEach(function(cod){
      var it = conf.itens[cod], inv = fonte.find(function(i){ return i.cod === cod; }) || null;
      var un = inv ? unidSing(inv) : (it.l3 === 'Rejunte' ? 'fardo' : 'sc'); var rg = Number(it.qtdRasgada)||0; totRasg += rg;
      var partes = [];
      if((Number(it.almox3)||0) > 0 || it.confirmadoZero || !((Number(it.almox30)||0) > 0)) partes.push({lbl: it.l3 || (inv ? localLabel(inv) : (conf.local && conf.local !== 'Todos' ? conf.local : 'Almox 3')), pal: it.pal3, sac: it.sac3, tot: Number(it.almox3)||0, sis: it.saldoSistema3});
      if((Number(it.almox30)||0) > 0) partes.push({lbl: it.l30 || 'Almox 30', pal: it.pal30, sac: it.sac30, tot: Number(it.almox30)||0, sis: it.saldoSistema30});
      partes.forEach(function(p, j){
        var cel = [j === 0 ? [cod, it.nome || (inv && inv.name) || ''] : '', p.lbl, String(Number(p.pal)||0), String(Number(p.sac)||0), n(p.tot) + ' ' + un];
        var cores = {};
        if(verSis){ var temSis = p.sis != null && p.sis !== ''; var dif = temSis ? p.tot - Number(p.sis) : null; if(dif) nDif++;
          cel.push(temSis ? n(p.sis) : '—'); cel.push(dif == null ? '—' : (dif > 0 ? '+' : '') + n(dif)); if(dif) cores[6] = dif < 0 ? [171,74,66] : [138,99,38]; }
        cel.push(j === 0 && rg > 0 ? n(rg) : '—'); if(j === 0 && rg > 0) cores[cel.length - 1] = [171,74,66];
        linhas.push({c: cel, negrito:[0,4], cores: cores, h: 10, fundo: j % 2 ? null : null});
      });
    });
    var F = Folha('CONFERÊNCIA DE ESTOQUE', 'Contagem física registrada no Inventário', [conf.numero, conf.dataHora || conf.data || '']);
    var cx = [['Local', conf.local || '—'], ['Conferente', conf.nomeUsuario || conf.usuario || '—'], ['Itens', String(Object.keys(conf.itens).length)], ['Rasgados', totRasg ? n(totRasg) : '—']];
    if(verSis) cx.push(['Com diferença', String(nDif)]);
    F.caixas(cx);
    F.tabela(cols, linhas, 10);
    var motivos = Object.keys(conf.itens).filter(function(c){ return conf.itens[c].motivoRasgo; }).map(function(c){ return c + ': ' + conf.itens[c].motivoRasgo; });
    if(motivos.length) F.nota('Motivo dos rasgados — ' + motivos.join(' · '));
    if(verSis) F.nota('Sistema = saldo do Focco no momento da contagem. Diferença = contado - sistema.');
    F.assinaturas(['Conferente · ' + (conf.nomeUsuario || ''), 'Supervisor']);
    F.fechar('Conferência ' + conf.numero);
    entregar(F.doc, 'Conferencia_' + conf.numero + '.pdf');
    return true;
  }

  // ---------- 3) Comprovante de recebimento ----------
  async function folhaRecebimento(grupo){
    var regs = (RECEBIMENTOS || []).filter(function(r){ return (r.grupo || r.id) === grupo; }).sort(function(a, b){ return (a.idx||0) - (b.idx||0); });
    if(!regs.length){ toast('Recebimento não encontrado.'); return false; }
    await carregarLogo();
    var r0 = regs[0], somas = {}, temLoc = regs.some(function(r){ return r.local; }), temPal = regs.some(function(r){ return +r.pal > 0; });
    var cols = [{t:'ITEM', w:46}].concat(temLoc ? [{t:'LOCAL', w:14, al:'center'}] : []).concat(temPal ? [{t:'PALETES', w:12, al:'center'}, {t:'SACOS', w:10, al:'center'}] : []).concat([{t:'QUANTIDADE', w:24, al:'right'}]);
    var linhas = regs.map(function(r){ var u = r.unidade || 'sc'; somas[u] = (somas[u]||0) + (Number(r.quantidade)||0);
      var c = [[r.cod, r.nome || '']]; if(temLoc) c.push(r.local || '—'); if(temPal){ c.push(+r.pal ? r.pal + ' x ' + (r.pp || '') : '—'); c.push(String(+r.sac || 0)); } c.push(n(r.quantidade) + ' ' + u);
      return {c: c, negrito:[0, c.length - 1], h:10}; });
    var totTxt = Object.keys(somas).map(function(u){ return n(somas[u]) + ' ' + u; }).join(' + ');
    var tl = cols.map(function(){ return ''; }); tl[tl.length - 2] = tl.length > 2 ? 'TOTAL' : ''; tl[tl.length - 1] = totTxt; if(tl.length === 2) tl[0] = 'TOTAL';
    linhas.push({c: tl, negrito:[0, tl.length - 2, tl.length - 1], h:9, fundo:[243,240,232]});
    var apont = regs.every(function(r){ return r.apontado; }) ? 'Apontado' : regs.some(function(r){ return r.apontado; }) ? 'Apontado em parte' : 'Não apontado';
    var F = Folha('COMPROVANTE DE RECEBIMENTO', 'Material recebido sem nota fiscal', [grupo, r0.dataHora || r0.data || '']);
    F.caixas([['Recebido por', r0.nomeUsuario || r0.usuario || '—'], ['Itens', regs.length + ' · ' + totTxt], ['Sistema', apont]]);
    F.tabela(cols, linhas, 10);
    if(r0.observacao) F.nota('Observação: ' + r0.observacao);
    F.assinaturas(['Quem entregou', 'Quem recebeu · ' + (r0.nomeUsuario || '')]);
    F.fechar('Recebimento ' + grupo);
    entregar(F.doc, 'Recebimento_' + grupo + '.pdf');
    return true;
  }

  // ---------- 4) lista genérica (acertar no sistema) ----------
  async function folhaTabela(titulo, sub, cols, linhas, nome, nota){
    await carregarLogo();
    var F = Folha(titulo, sub, [agoraBR()]);
    F.tabela(cols, linhas, 9);
    if(nota) F.nota(nota);
    F.fechar(titulo.charAt(0) + titulo.slice(1).toLowerCase());
    entregar(F.doc, nome);
    return true;
  }

  window.invFolhas = {contagem: folhaContagem, conferencia: folhaConferencia, recebimento: folhaRecebimento, tabela: folhaTabela, disponivel: function(){ return !!jsPDFcls(); }};

  // As chamadas antigas passam a gerar o PDF novo (sem jsPDF, ficam as folhas antigas)
  var _velhaConf = window.gerarPDFConferencia, _velhaLista = window.gerarPDFListaContagem;
  window.gerarPDFConferencia = function(num){ if(!jsPDFcls()) return _velhaConf && _velhaConf(num); folhaConferencia(num).catch(function(e){ console.error(e); _velhaConf && _velhaConf(num); }); };
  // mesma seleção da folha antiga: itens marcados, almoxarifado escolhido, permissão e pesquisa
  var FLAG = {almox3:'temAlmox3', almox30:'temAlmox30', rejunte:'temRejunte', separacao:'temSeparacao', almox1:'temAlmox1', almox2:'temAlmox2'};
  var SO3 = {almox3:1, rejunte:1, separacao:1, almox1:1}, SO30 = {almox30:1, almox2:1};
  window.gerarPDFListaContagem = function(){
    if(!jsPDFcls()) return _velhaLista && _velhaLista();
    var alm = confPerfilFiltro() || ((document.getElementById('confAlmox') || {}).value || 'todos');
    var q = ((document.getElementById('confSearch') || {}).value || '').toLowerCase();
    var fonte = (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || [];
    var lista = fonte.filter(function(i){ return CONF_ITENS_SEL.has(i.cod) && itemPermitidoParaContagem(i) && (alm === 'todos' || i[FLAG[alm]]) && (!q || i.cod.toLowerCase().indexOf(q) >= 0 || (i.name || '').toLowerCase().indexOf(q) >= 0); });
    if(!lista.length){ toast('Nenhum item para imprimir. Verifique os filtros.'); return; }
    folhaContagem(lista, {so: SO3[alm] ? '3' : SO30[alm] ? '30' : null}).catch(function(e){ console.error(e); _velhaLista && _velhaLista(); });
  };
})();
