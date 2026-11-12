/* ===== Resumo para o chatbot do gestor (12/11/2026, "uma API do painel para o chatbot ler os dados") =====
   O painel não tem servidor. Por isso, o painel aberto calcula, com o que JÁ
   carregou (nenhuma leitura nova), um resumo por assunto e grava em api/resumo — um campo por assunto, em texto JSON:
     producao · manutencao · silos · estoque · pessoas   (+ em_<assunto> = quando foi calculado, ISO)
   Publicam só os painéis da administradora, do gestor e de quem tem a Análise PCP (TVs e tablets não, pela cota de
   gravações). Cada um grava só o assunto que tem carregado, quando mudou ou a cada 15 min (para o chatbot saber que
   está atualizado), no máximo a cada 5 min por assunto.
   O chatbot entra com um login próprio (Firebase Auth, e-mail e senha) cadastrado em apibots/{uid}: as regras deixam
   esse login ler SÓ api/resumo — ele não enxerga mais nada do banco. Guia para o programador: docs/API-CHATBOT.md.
   LGPD: pessoas só em números (sem nome, CPF ou horário de ninguém). */
const API_MIN = 5 * 60e3, API_VIVO = 15 * 60e3, API_VERSAO = 1;
const _api = { ult: {}, em: {}, ocupado: false };

function apiR(n, c) { const k = Math.pow(10, c == null ? 1 : c); return Math.round((+n || 0) * k) / k; }
/* quem publica: a administradora, o gestor e quem tem a Análise PCP (painéis abertos o dia todo). TVs, tablets e celulares
   não gravam, para não gastar a cota de gravações do Firebase. */
function apiPodeGravar() {
  if (!(S.db && S.uid && S.acs && S.acs.pronto) || /[?&](treino|antigo|janela|tela|totem)=/.test(location.search) || document.body.classList.contains('tv')) return false;
  try { return !!(S.acs.dono || viewOk('gxinicio') || viewOk('anlest')); } catch (e) { return false; }
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
  return { dia: h, linhas, totalHoje: { sacos: Math.round(D.tot.sc), toneladas: apiR(D.tot.t), metaToneladas: apiR(D.tot.mT), disponibilidade: D.tot.disp == null ? null : apiR(D.tot.disp * 100) },
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
  return { dia: D.dia, vieram: R.vieram, naEmpresaAgora: R.na, almocaram: R.alm, chegaramDepoisDoHorario: R.atr, naoVieram: R.nao, semRegistro: R.semReg, ferias: R.fer, afastadosOuFolga: R.jus, esperados: R.esper,
    atualizadoEm: (D.fonte && D.fonte.em) || '', observacao: 'Só números, sem nomes (LGPD).' };
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
