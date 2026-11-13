/* ===== Resumo para o chatbot do gestor (12/11/2026, "uma API do painel para o chatbot ler os dados") =====
   O painel não tem servidor. Por isso, o painel aberto calcula, com o que JÁ
   carregou (nenhuma leitura nova), um resumo por assunto e grava em api/resumo — um campo por assunto, em texto JSON:
     producao · manutencao · silos · estoque · pessoas   (+ em_<assunto> = quando foi calculado, ISO)
   Publicam só os painéis da administradora, do gestor e de quem tem a Análise PCP (TVs e tablets não, pela cota de
   gravações). Cada um grava só o assunto que tem carregado, quando mudou ou a cada 15 min (para o chatbot saber que
   está atualizado), no máximo a cada 5 min por assunto.
   O chatbot entra com um login próprio (Firebase Auth, e-mail e senha) cadastrado em apibots/{uid}: as regras deixam
   esse login ler SÓ api/resumo — ele não enxerga mais nada do banco. Guia para o programador: docs/API-CHATBOT.md.
   LGPD: 13/11, pedido da administradora ("tem que ser completa"): nomes de quem veio (setor, empresa, chegada, almoço, se
   ainda está) e de quem faltou. Nunca CPF. */
const API_MIN = 5 * 60e3, API_VIVO = 15 * 60e3, API_VERSAO = 3;
const _api = { ult: {}, em: {}, ocupado: false };

function apiR(n, c) { const k = Math.pow(10, c == null ? 1 : c); return Math.round((+n || 0) * k) / k; }
/* quem publica: a administradora, o gestor e quem tem a Análise PCP (painéis abertos o dia todo). TVs, tablets e celulares
   não gravam, para não gastar a cota de gravações do Firebase. */
function apiPodeGravar() {
  if (!(S.db && S.uid && S.acs && S.acs.pronto) || /[?&](treino|antigo|janela|tela|totem)=/.test(location.search) || document.body.classList.contains('tv')) return false;
  try { return !!(S.acs.dono || viewOk('gxinicio') || viewOk('anlest')); } catch (e) { return false; }
}

/* ordem e rancho (13/11/2026): situação da ordem, quanto foi feito e em que pé está o rancho (enviado ao almox, separado, entregue na linha) */
const apiEm = v => !v ? '' : typeof v === 'string' ? v : (v.em || '');
function apiRancho(o) {
  if (!o.rancho) return { numero: '', situacao: 'Sem rancho' };
  let e = {}, st = ''; try { e = dbEt(o); st = dbSit(o, e).t; } catch (x) {}
  const sep = e.sep && typeof e.sep === 'object' ? e.sep : null, ent = e.ent && typeof e.ent === 'object' ? e.ent : null;
  const parte = !e.ent && o.rdb && (o.rdb.entp || []).length;
  return { numero: String(o.rancho), situacao: st, urgente: !!(o.rdb && o.rdb.urg), enviadoAoAlmox: apiEm(e.env), separado: !!e.sep, separadoEm: apiEm(e.sep), separadoPor: sep && (sep.nome || '') || '',
    faltouNaSeparacao: sep && sep.falta ? (sep.itens || []).map(x => String(x.c || x.i || '') + (x.q ? ' (' + x.q + ')' : '')).slice(0, 15) : [],
    entregueNaLinha: !!e.ent, entregueEm: apiEm(e.ent), recebidoPor: ent && (ent.recebidoPor || '') || '', entregueEmParte: !!parte, conferido: !!e.conf, veioAMenos: !!(e.conf && e.conf.falta) };
}
function apiOrdem(o, hojeOrd) {
  const feito = entregueDe(o), total = +o.total || 0; let sit = 'Não começou';
  try { if (o.status === 'concluida' || (total && feito >= total)) sit = 'Concluída'; else if (typeof otAberto === 'function' && otAberto(o)) sit = 'Rodando'; else if (typeof otPausada === 'function' && otPausada(o)) sit = 'Pausada · ' + (otPausada(o).pausa || ''); else if (feito > 0) sit = 'Em andamento'; } catch (e) {}
  return { ordem: String(o.num || ''), produto: String(o.produto || ''), programado: total, feitoTotal: Math.round(feito), feitoHoje: Math.round(hojeOrd[o._id] || 0), falta: Math.max(0, Math.round(total - feito)), dia: dataEf(o) || '', situacao: sit, rancho: apiRancho(o) };
}
function apiOrdensLinha(l, h, hojeOrd) {
  const vis = new Set(), out = [];
  const add = o => { if (!o || o._pv || vis.has(o._id)) return; vis.add(o._id); out.push(o); };
  try { corLista(l, h).forEach(add); } catch (e) {}
  (S.ordens || []).filter(o => o.linha === l && !['cancelada', 'excluida', 'vinculada'].includes(o.status) && (dataEf(o) === h || (o.data <= h && o.ate && o.ate >= h) || hojeOrd[o._id])).forEach(add);
  return out.map(o => apiOrdem(o, hojeOrd));
}
function apiRanchosResumo(linhas) {
  const r = { comRancho: 0, enviadosAoAlmox: 0, separados: 0, entreguesNaLinha: 0, aguardandoSeparacao: 0, separadosACaminho: 0, naoEnviados: 0, semRancho: 0 };
  linhas.forEach(L => (L.ordensDoDia || []).forEach(o => { const x = o.rancho; if (!x.numero) { r.semRancho++; return; } r.comRancho++; if (x.enviadoAoAlmox) r.enviadosAoAlmox++; if (x.separado) r.separados++; if (x.entregueNaLinha) r.entreguesNaLinha++;
    if (x.separado && !x.entregueNaLinha) r.separadosACaminho++; else if (!x.separado && x.enviadoAoAlmox) r.aguardandoSeparacao++; else if (!x.separado && !x.enviadoAoAlmox) r.naoEnviados++; }));
  return r;
}

function apiProducao() {
  if (!(S.ordens || []).length) return null;
  const h = hojeStr(), D = gxDados(h), M = (() => { try { return gxMesDados(h.slice(0, 7)); } catch (e) { return null; } })();
  const linhas = linhasOrd().map(l => {
    const a = gxLinhaAgora(l), x = D.lin.find(y => y.l === l) || {};
    const o = a.o ? { ordem: String(a.o.num || ''), produto: String(a.o.produto || ''), feito: entregueDe(a.o), total: +a.o.total || 0 } : null;
    return { linha: l, situacao: a.st || 'Sem ordem', detalhe: a.t || '', ordem: o,
      hoje: { sacos: Math.round(x.sc || 0), toneladas: apiR(x.t), metaToneladas: apiR(x.mT), minutosParada: Math.round(x.par || 0), ordens: x.ords || 0, ordensConcluidas: x.ordsOk || 0 } };
  });
  const abertas = (S.paradas || []).filter(p => !p.fim && !p.anulada).map(p => ({ linha: p.linha, motivo: p.motivo || 'a definir', desde: p.inicio, setup: gxSetup(p) }));
  let atrasadas = 0, sacosAtrasados = 0; try { const at = repAtrasadas(); atrasadas = at.length; sacosAtrasados = Math.round(at.reduce((s, o) => s + Math.max(0, (+o.total || 0) - entregueDe(o)), 0)); } catch (e) {}
  let faltaCimento = null; try { const pv = previsaoCimento(); if (pv && pv.falta) faltaCimento = { dia: pv.falta.dia, ordem: String(pv.falta.o.num || '') }; } catch (e) {}
  const ents = gxEntregasDia(h), hojeOrd = {}; ents.forEach(e => { hojeOrd[e.ordem] = (hojeOrd[e.ordem] || 0) + (+e.qtd || 0); });
  linhas.forEach(L => { L.ordensDoDia = apiOrdensLinha(L.linha, h, hojeOrd); });
  const porProd = {}; ents.forEach(e => { const o = gxOrd(e.ordem); if (!o) return; const k = String(o.produto || codigoDe(o) || ''); const x = porProd[k] = porProd[k] || { produto: k, linha: e.linha || o.linha || '', sacos: 0, toneladas: 0 }; x.sacos += +e.qtd || 0; x.toneladas += (+e.qtd || 0) * gxKgDe(o) / 1000; });
  let prox = null; try { const d2 = dbProxUtil(h); prox = { dia: d2, linhas: linhasOrd().map(l => ({ linha: l, ordens: corLista(l, d2).filter(o => !o._pv).map(o => apiOrdem(o, {})) })).filter(x => x.ordens.length) }; } catch (e) {}
  const pm = (S.pedmat || []).filter(x => x.status === 'aberto').map(x => ({ ordem: String(x.num || ''), linha: x.linha || '', item: x.item || '', quantidade: +x.qtd || 0, unidade: x.um || '', urgente: !!x.urgente, pedidoEm: x.em || '', quemPediu: x.porNome || '' }));
  const ap = (S.apPend || []).filter(x => x.status === 'pendente'); let perdas = []; try { perdas = pmPerdasDia(h).map(x => ({ ordem: String(x.num || ''), linha: x.linha || '', produto: x.produto || '', quantidade: +x.qtd || 0, unidade: x.un || 'sc' })); } catch (e) {}
  return { dia: h, linhas, produzidoHojePorProduto: Object.values(porProd).map(x => ({ produto: x.produto, linha: x.linha, sacos: Math.round(x.sacos), toneladas: apiR(x.toneladas) })).sort((a, b) => b.sacos - a.sacos),
    ranchosHoje: apiRanchosResumo(linhas), proximoDia: prox, pedidosDeMaterialAbertos: pm,
    apontamentosParaConferir: { quantidade: ap.length, sacos: Math.round(ap.reduce((s, x) => s + (+x.qtd || 0), 0)) }, perdasHoje: perdas, totalHoje: { sacos: Math.round(D.tot.sc), toneladas: apiR(D.tot.t), metaToneladas: apiR(D.tot.mT), disponibilidade: D.tot.disp == null ? null : apiR(D.tot.disp * 100) },
    mes: M ? { mes: h.slice(0, 7), toneladas: apiR(M.tot.t), metaAteHojeToneladas: apiR(M.tot.mAte), metaMesToneladas: apiR(M.tot.mMes) } : null,
    paradasAbertas: abertas, ordensAtrasadas: atrasadas, sacosAtrasados, faltaCimento };
}

function apiManutencao() {
  if (!Array.isArray(S.chamados) || !S.chamados.length) return null;
  const ab = S.chamados.filter(c => !manIgnorar(c) && !manFechada(c) && (+c.numero || 0) < 900000);
  const um = c => ({ os: manNum(c.numero), tipo: c.prevId ? 'preventiva' : c.tarefa ? 'tarefa' : 'chamado', linha: c.linha || '', equipamento: c.equip || '', problema: String(c.defeito || '').slice(0, 200),
    situacao: c.status || '', tecnico: (c.exec && c.exec.tecnico) || '', abertoEm: c.criado || '', maquinaParada: c.impacto === 'parou' && !c.liberadoEm, urgencia: c.prioridade || '', prazo: c.prazo || '' });
  let prevAtr = []; try { prevAtr = mxPrevStatus().filter(x => x.st === 'atrasada').map(x => String((x.p && (x.p.tarefa || x.p.nome)) || '')).filter(Boolean); } catch (e) {}
  const peds = (S.pedpecas || []).filter(p => !p.removido && !['chegou', 'nao'].includes(p.status));
  return { abertos: ab.length, semTecnico: ab.filter(c => !c.prevId && !(c.exec && c.exec.tecnico)).length, maquinasParadas: ab.filter(c => c.impacto === 'parou' && !c.liberadoEm).map(um),
    lista: ab.sort((a, b) => String(b.criado || '').localeCompare(String(a.criado || ''))).slice(0, 40).map(um),
    preventivasAtrasadas: prevAtr.length, preventivasAtrasadasLista: prevAtr.slice(0, 15), pedidosDePecaAbertos: peds.length };
}

function apiSilos() {
  if (!(S.cfg.silos || []).length || !S.siloSaldo || !Object.keys(S.siloSaldo).length) return null;
  const sp = saldoPorSilo();
  return { silos: (S.cfg.silos || []).map(s => { const u = sp[s.id], t = u ? apiR((u.kg || 0) / 1000) : null;
    return { silo: s.nome, material: s.grupo || '', toneladas: t, capacidadeToneladas: s.cap ? +s.cap : null, ocupacao: t != null && s.cap ? apiR(t / s.cap * 100, 0) : null, atualizadoEm: u && u.em || '', origem: u ? u.origem : '' }; }) };
}

function apiEstoque() {
  if (!(S.anl && S.anl.base && S.anl.base.itens) || typeof anlEstRows !== 'function') return null;
  let rows; try { rows = anlEstRows(anlDados()).map(anlEstX); } catch (e) { return null; }
  if (!rows.length) return null;
  const it = r => ({ codigo: r.c, produto: r.d || '', estoque: Math.round(r.tot || 0), ruptura: r.rup == null ? null : apiR(r.rup), pedidosEmCarteira: Math.round(r.dc || 0), linha: r.lin0 || '' });
  const g = k => rows.filter(r => typeof eswGrupo === 'function' ? eswGrupo(r) === k : false);
  return { agirHoje: g('hoje').slice(0, 30).map(it), estaSemana: g('semana').slice(0, 30).map(it), itens: rows.filter(r => !r.int).length,
    explicacao: 'ruptura = dias até acabar o estoque pela venda; agirHoje = zerado com demanda ou acaba em até 1 dia; estaSemana = acaba em até 7 dias' };
}

function apiPessoas() {
  if (typeof gxpDoc !== 'function' || typeof gxpResumo !== 'function') return null;
  const D = gxpDoc(hojeStr()); if (!D) return null;
  const R = gxpResumo(D); if (!R) return null;
  /* 13/11/2026, pedido da administradora: os nomes de quem não veio (só nome, setor, empresa e o motivo que o painel
     já mostra: Sem registro ou Férias). Nunca CPF nem horário. Afastado/folga e "fora do Face ID" ficam de fora. */
  const faltaram = (D.f || []).filter(x => x && x.m !== 'Sumiu' && x.m !== 'Afastado' && x.m !== 'Folga')
    .map(x => ({ nome: x.n || '', setor: x.s || '', empresa: x.e || '', motivo: x.m === 'Férias' ? 'Férias' : 'Sem registro no Face ID' }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const vieramLista = (D.p || []).map(x => ({ nome: x.n || '', setor: x.s || '', empresa: x.e || '', chegada: x.c || '', almoco: x.a && typeof x.a === 'string' ? x.a : (x.a ? 'sim' : ''), naEmpresaAgora: !x.sa, ultimaPassagem: x.u || '', chegouDepoisDoHorario: (gxpM(x.c) || 0) > R.lim }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const justif = (D.f || []).filter(x => x && (x.m === 'Afastado' || x.m === 'Folga')).map(x => ({ nome: x.n || '', setor: x.s || '', empresa: x.e || '', motivo: x.m === 'Folga' ? 'Não trabalha neste dia' : 'Afastado' }));
  return { dia: D.dia, vieramLista, afastadosOuFolgaLista: justif, vieram: R.vieram, naEmpresaAgora: R.na, almocaram: R.alm, chegaramDepoisDoHorario: R.atr, naoVieram: R.nao, semRegistro: R.semReg, ferias: R.fer, afastadosOuFolga: R.jus, esperados: R.esper,
    faltaram, atualizadoEm: (D.fonte && D.fonte.em) || '', observacao: 'vieramLista = quem passou no Face ID hoje (chegada, almoço, se ainda está na empresa); faltaram = quem não veio. Sem CPF.' };
}

const API_SEC = { producao: apiProducao, manutencao: apiManutencao, silos: apiSilos, estoque: apiEstoque, pessoas: apiPessoas };
async function apiPublicar(forca) {
  if (_api.ocupado || !apiPodeGravar()) return; _api.ocupado = true;
  try {
    const agora = Date.now(), up = {};
    for (const k in API_SEC) {
      let v = null; try { v = API_SEC[k](); } catch (e) { console.warn('[api] ' + k, e); }
      if (!v) continue;
      const j = JSON.stringify(v); if (j.length > 200000) continue;
      const mudou = j !== _api.ult[k], velho = agora - (_api.em[k] || 0) > API_VIVO;
      if (!forca && (agora - (_api.em[k] || 0) < API_MIN || (!mudou && !velho))) continue;
      up[k] = j; up['em_' + k] = new Date(agora).toISOString(); _api.ult[k] = j; _api.em[k] = agora;
    }
    if (Object.keys(up).length) { up.versao = API_VERSAO; await S.db.doc('api/resumo').set(up, { merge: true }); }
  } catch (e) { console.warn('[api] resumo', e && e.code || e); }
  finally { _api.ocupado = false; }
}
setTimeout(() => { apiPublicar(); setInterval(() => apiPublicar(), 60e3); }, 20e3);
if (window.Painel) window.Painel.apiResumo = { calcular: () => { const o = {}; for (const k in API_SEC) { try { o[k] = API_SEC[k](); } catch (e) { o[k] = 'erro: ' + e.message; } } return o; }, publicar: () => apiPublicar(true) };
