const H = require('./harness'); const { seedManut } = require('./manut-seed');
const res = []; const ok = (n, c, det) => { res.push({ n, ok: !!c, det }); console.log((c ? 'PASSOU ' : 'FALHOU ') + n + (det ? ' — ' + String(det).slice(0, 230) : '')); };

(async () => {
  const { browser, page, erros } = await H.abrir(); const { d } = seedManut();
  await H.preparar(page, d);
  const srv = (p) => (p || page).evaluate(() => JSON.parse(localStorage.getItem('__srv')).docs);
  const os = async n => (await srv())['chamados/os-' + String(n).padStart(5, '0')];
  const sair = async (p) => { p = p || page; await p.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'sair-conta'; b.id = 'sx' + Math.random().toString(36).slice(2); document.body.appendChild(b); b.click(); }); await H.dorme(1600); };
  const abrirOS = async n => { await page.evaluate(n => { const S = __T.S(); S.man.cur = n; S.man.ed = null; __T.go('manch'); }, n); await H.dorme(400); };
  const toastTxt = () => page.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.innerText : ''; });

  // ---------- T1 login ----------
  await page.goto(H.BASE); await H.entrar(page, 'tecnico', 'tec123'); await H.dorme(2000);
  let e = await page.evaluate(() => ({ uid: __T.S().uid, view: __T.S().view, nav: document.getElementById('navlist').innerText }));
  ok('T1 login do técnico entra na manutenção', e.uid === 'uTEC' && /Manutenção/.test(e.nav) && /^man/.test(e.view), `tela=${e.view}`);
  await sair();

  // ---------- T2 operador abre chamado pelo painel ----------
  await H.entrar(page, 'operador', 'ope123'); await H.dorme(1800);
  await page.evaluate(() => __T.go('manch')); await H.dorme(300);
  await page.click('[data-act="man-novo"]'); await page.click('[data-act="man-f"][data-k="linha"][data-v="Linha 1"]'); await H.dorme(150);
  await page.click('[data-act="mx-f-eq"][data-id="eqmix1"]'); await H.dorme(150);
  await page.fill('[data-man="defeito"]', 'Misturador fazendo barulho forte'); await page.click('[data-act="man-f"][data-k="impacto"][data-v="parou"]');
  await page.setInputFiles('#mx-foto-in', 'foto-a.png'); await H.dorme(500);
  await page.dblclick('[data-act="man-salvar"]'); await H.dorme(1800);
  let s = await srv(); let o1 = s['chamados/os-00001'];
  const nOS = Object.keys(s).filter(k => k.startsWith('chamados/os-')).length;
  ok('T2 chamado salvo no Firestore com equipamento, prioridade, solicitante e foto (duplo clique não duplica)',
    o1 && o1.equipId === 'eqmix1' && o1.equip === 'Misturador' && o1.impacto === 'parou' && o1.nome === 'Ana Operadora' && o1.por === 'uOPE' && o1.status === 'Aberta' && !!o1.foto && !!o1.paradaId && nOS === 1 && /Chamado aberto/.test(JSON.stringify(o1.hist)),
    o1 && `OS 1: equip=${o1.equip} prioridade=${o1.impacto} foto=${!!o1.foto} parada=${!!o1.paradaId} OS criadas=${nOS}`);
  // operador não tem botões de atender
  await abrirOS(1);
  const botoesOp = await page.evaluate(() => document.querySelectorAll('#view [data-act="man-st"],#view [data-act="mm-assumir"],#view [data-act="man-salvar-at"],#view [data-act="mx-p-add"]').length);
  // e se forçar a ação, é bloqueada
  await page.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'man-st'; b.dataset.v = 'Concluída'; b.id = 'forca'; document.body.appendChild(b); }); await page.click('#forca'); await H.dorme(300);
  const tOp = await toastTxt(); s = await srv();
  ok('Permissão: operador acompanha mas não atende (sem botões; ação forçada bloqueada)', botoesOp === 0 && /não possui permissão/.test(tOp) && s['chamados/os-00001'].status === 'Aberta', `botões=${botoesOp} aviso="${tOp}"`);
  // Tela da linha (antes perdia foto e equipamento)
  await page.evaluate(() => __T.go('linhatv')); await H.dorme(400);
  const temLtv = await page.$('[data-act="mlt-abrir"][data-l="Linha 2"]');
  if (temLtv) { await page.click('[data-act="mlt-abrir"][data-l="Linha 2"]'); await H.dorme(200); await page.fill('.mm-box textarea', 'Compressor desarmando'); await page.click('[data-act="mlt-imp"][data-v="reduziu"]');
    await page.click('.mm-box [data-act="mx-f-eq"][data-id="eqcmp"]'); await page.setInputFiles('#mx-foto-in', 'foto-b.png'); await H.dorme(500); await page.click('[data-act="mlt-ok"]'); await H.dorme(1600); }
  s = await srv(); const o2 = s['chamados/os-00002'];
  ok('T2b chamado pela Tela da linha guarda equipamento e foto (estava perdendo)', o2 && o2.equipId === 'eqcmp' && !!o2.foto && !!s['chamfotos/' + o2.foto], o2 && `equipId=${o2.equipId} foto=${o2.foto}`);
  // ---------- T3b QR do equipamento com usuário logado ----------
  await page.goto(H.BASE + '?chamado=Linha%201&equip=eqens1#chamado=Linha%201&equip=eqens1'); await H.dorme(3000);
  const f3b = await page.evaluate(() => ({ f: __T.S().man.f, view: __T.S().view, banner: (document.querySelector('#man-form') || {}).innerText || '' }));
  ok('T3b QR do equipamento (logado): formulário abre com o equipamento escolhido', f3b.f && f3b.f.equipId === 'eqens1' && f3b.view === 'manch' && /identificado pelo QR/.test(f3b.banner), f3b.f && `linha=${f3b.f.linha} equip=${f3b.f.equip}`);
  await sair();

  // ---------- T3 QR do equipamento sem login ----------
  const b2 = await H.abrir(); const q = b2.page; await q.goto(H.BASE + 'vazio.html'); await q.evaluate(x => localStorage.setItem('__srv', x), JSON.stringify({ docs: await srv(), users: d.users }));
  await q.goto(H.BASE + '?chamado=Linha%201&equip=eqens1'); await H.dorme(1800);
  const qr = await q.evaluate(() => ({ topo: document.querySelector('.qr-top').innerText, sel: [...document.querySelectorAll('#qr-eqs button[aria-pressed="true"]')].map(b => b.innerText), campo: document.getElementById('qr-e').value }));
  await q.fill('#qr-d', 'Ensacadeira travando o bico'); await q.click('.qr-imp [data-v="nao"]'); await q.fill('#qr-n', 'Carlos QR'); await q.dblclick('#lg .lg-go'); await H.dorme(1400);
  const sq = await q.evaluate(() => JSON.parse(localStorage.getItem('__srv')).docs); const qd = Object.entries(sq).filter(([k]) => k.startsWith('chamados/q-'));
  ok('T3 QR do equipamento (sem login): equipamento identificado e chamado enviado uma vez', /Ensacadeira/.test(qr.topo) && qr.sel.join() === 'Ensacadeira' && qd.length === 1 && qd[0][1].equipId === 'eqens1', `topo="${qr.topo.replace(/\n/g, ' ')}" selecionado=${qr.sel} chamados QR=${qd.length}`);
  await b2.browser.close();
  await page.evaluate(x => { const v = JSON.parse(localStorage.getItem('__srv')); v.docs = x; localStorage.setItem('__srv', JSON.stringify(v)); }, sq);

  // ---------- T4 manutenção vê, assume, muda status ----------
  await H.entrar(page, 'tecnico', 'tec123'); await H.dorme(2000); await page.evaluate(() => __T.go('manch')); await H.dorme(5500); // conversão do QR em OS
  s = await srv(); const o3 = s['chamados/os-00003'];
  const lista = await page.evaluate(() => document.getElementById('view').innerText);
  ok('T4a manutenção vê os chamados (inclusive o do QR, já com número de OS)', /OS 00001/.test(lista) && /OS 00002/.test(lista) && o3 && o3.equipId === 'eqens1' && o3.origem === 'qr', o3 && `OS 3 do QR: equip=${o3.equip}`);
  // tempo real: um chamado novo aparece sem recarregar
  await page.evaluate(() => { const v = JSON.parse(localStorage.getItem('__srv')); v.docs['chamados/os-00004'] = { numero: 4, linha: 'Linha 2', quando: '2026-10-07T10:00', defeito: 'Teste tempo real', impacto: 'nao', nome: 'X', status: 'Aberta', criado: new Date().toISOString(), por: 'uOPE' }; localStorage.setItem('__srv', JSON.stringify(v)); window.__mockReconnect(); }); await H.dorme(700);
  ok('T4b chamado novo aparece na tela da manutenção sem atualizar', /OS 00004/.test(await page.evaluate(() => document.getElementById('view').innerText)));
  await abrirOS(1); await page.click('#view [data-act="mm-assumir"]'); await H.dorme(700);
  await page.click('[data-act="man-st"][data-v="Aguardando peça"]'); await page.click('[data-act="man-st"][data-v="Aguardando peça"]').catch(() => {}); await H.dorme(700);
  o1 = await os(1); const hs = (o1.hist || []).map(h => h.o);
  ok('T4c assumir e mudar status (Em execução → Aguardando peça), sem duplicar histórico', o1.status === 'Aguardando peça' && hs.filter(x => /→ Aguardando peça/.test(x)).length === 1 && hs.some(x => /Aberta → Em execução/.test(x)) && o1.exec.tecnico === 'Pedro Técnico', hs.join(' | '));
  await page.click('[data-act="man-st"][data-v="Em execução"]'); await H.dorme(600);

  // ---------- T5 OS vinculada ----------
  o1 = await os(1);
  ok('T5 chamado e OS são o mesmo registro (OS 00001), com parada ligada', o1.numero === 1 && !!o1.paradaId, 'chamados/os-00001 · parada ' + o1.paradaId);

  // ---------- T6 execução ----------
  await abrirOS(1);
  await page.fill('[data-man-e="diagnostico"]', 'Rolamento do eixo travado'); await page.selectOption('[data-man-e="causa"]', 'Desgaste de peça');
  await page.fill('[data-man-e="servicos"]', 'Troca do rolamento e lubrificação'); await page.fill('[data-man-e="tecnico"]', 'Pedro Técnico');
  await page.fill('[data-man-e="pendencias"]', 'Verificar alinhamento em 7 dias'); await page.click('[data-act="man-salvar-at"]'); await H.dorme(700);
  o1 = await os(1);
  ok('T6 diagnóstico, causa, serviço, responsável e observações salvos (com histórico)', o1.exec.diagnostico === 'Rolamento do eixo travado' && o1.exec.causa === 'Desgaste de peça' && o1.exec.servicos && o1.exec.tecnico === 'Pedro Técnico' && o1.exec.pendencias && (o1.hist || []).some(h => /Atendimento atualizado/.test(h.o)), JSON.stringify(o1.exec).slice(0, 200));

  // ---------- T7 material ----------
  await page.fill('#mx-p-c', 'ROL6205 · Rolamento 6205'); await page.fill('#mx-p-q', '2'); await page.fill('#mx-p-u', 'pç'); await page.fill('#mx-p-o', 'lado acionamento');
  await page.dblclick('[data-act="mx-p-add"]'); await H.dorme(800);
  o1 = await os(1); const pcs = o1.exec.pecas || [];
  ok('T7 material registrado (peça, código, quantidade, unidade, observação) sem duplicar', pcs.length === 1 && pcs[0].cod === 'ROL6205' && pcs[0].qtd === 2 && pcs[0].un === 'pç' && pcs[0].obs === 'lado acionamento' && (o1.hist || []).some(h => /Material registrado/.test(h.o)), JSON.stringify(pcs));

  // ---------- T8 foto (e não vai para a OS errada) ----------
  const antesF = (await os(1)).fotos || [];
  await page.setInputFiles('#mx-foto-os', 'foto-b.png'); await page.evaluate(() => { __T.S().man.cur = 2; }); await H.dorme(1200);
  o1 = await os(1); const o2b = await os(2); s = await srv(); const nova = (o1.fotos || []).filter(x => !antesF.includes(x))[0];
  ok('T8 foto salva na OS certa mesmo trocando de OS durante o envio, e visível', nova && s['chamfotos/' + nova] && s['chamfotos/' + nova].chamado === 'os-00001' && (o2b.fotos || []).length === 0, `foto ${nova} → ${s['chamfotos/' + nova] && s['chamfotos/' + nova].chamado}`);
  await abrirOS(1); await H.dorme(500);
  const imgs = await page.evaluate(() => document.querySelectorAll('.mx-ftg img').length);

  // ---------- T9 conclusão ----------
  await page.evaluate(() => { const S = __T.S(); const c = S.chamados.find(x => x.numero === 1); c.exec = Object.assign({}, c.exec, { servicos: '' }); });
  await page.click('[data-act="man-st"][data-v="Concluída"]'); await H.dorme(300);
  await page.fill('#mz-txt', ''); await page.click('[data-act="mz-ok"]'); await H.dorme(300);
  const errC = await page.evaluate(() => (document.getElementById('mz-err') || {}).textContent || ''); const aindaAberta = (await os(1)).status;
  await page.fill('#mz-txt', 'Troca do rolamento e lubrificação'); await page.click('[data-act="mz-ok"]'); await H.dorme(1200);
  o1 = await os(1); s = await srv(); const par = s['paradas/' + o1.paradaId]; const movs = Object.keys(s).filter(k => k.startsWith('pecasmov/'));
  ok('T9 conclusão exige dados mínimos, registra data/hora/usuário, fecha a parada e baixa o material uma vez', /serviço realizado/.test(errC) && aindaAberta !== 'Concluída' && o1.status === 'Concluída' && o1.concluidoEm && o1.concluidoPor === 'uTEC' && par && par.fim && movs.length === 1 && s[movs[0]].qtd === -2,
    `sem serviço: "${errC}" · concluída ${o1.concluidoEm} por ${o1.concluidoPor} · parada fim ${par && par.fim} · saídas de peça ${movs.length}`);
  ok('T8b foto aparece na OS', imgs >= 2, imgs + ' fotos na tela');

  // ---------- T10 histórico ----------
  await page.evaluate(() => { __T.S().mx.eqHist = 'eqmix1'; __T.go('manequip'); }); await H.dorme(400);
  const hEq = await page.evaluate(() => document.getElementById('view').innerText);
  await abrirOS(1); const tl = await page.evaluate(() => (document.querySelector('.mp-tl') || {}).innerText || '');
  ok('T10 histórico: equipamento mostra a OS; linha do tempo com abertura, status, atendimento, material, foto e conclusão',
    /Histórico · Misturador/.test(hEq) && /OS 00001/.test(hEq) && /Chamado aberto/.test(tl) && /Em execução/.test(tl) && /Atendimento atualizado/.test(tl) && /Material registrado/.test(tl) && /Foto adicionada/.test(tl) && /Concluída/.test(tl), tl.replace(/\n/g, ' | ').slice(0, 220));

  // ---------- T11 F5 ----------
  await page.reload(); await H.dorme(2200); await abrirOS(1);
  const dep = await page.evaluate(() => document.getElementById('view').innerText);
  ok('T11 depois do F5 tudo continua (status, responsável, material, causa)', /Concluída/.test(dep) && /Pedro Técnico/.test(dep) && /Rolamento 6205/.test(dep) && /Desgaste de peça/.test(dep));

  // ---------- extras: cancelar, preventiva ----------
  await abrirOS(4); await page.click('[data-act="man-st"][data-v="Cancelada"]'); await H.dorme(300); await page.click('[data-act="mcx-ok"]'); await H.dorme(200);
  const errX = await page.evaluate(() => (document.getElementById('mcx-err') || {}).textContent || '');
  await page.fill('#mcx-txt', 'Aberto em duplicidade'); await page.click('[data-act="mcx-ok"]'); await H.dorme(700);
  const o4 = await os(4);
  ok('Extra: cancelar exige motivo e mantém a OS no histórico', /motivo/.test(errX) && o4.status === 'Cancelada' && o4.motivoCancel === 'Aberto em duplicidade' && o4.canceladoPor === 'uTEC', `${o4.status} · ${o4.motivoCancel}`);

  await page.evaluate(() => __T.go('manprev')); await H.dorme(400);
  await page.selectOption('#mx-pv-e', 'eqcmp'); await page.fill('#mx-pv-t', 'Lubrificação'); await page.fill('#mx-pv-f', '30'); await page.fill('#mx-pv-p', '2026-10-15'); await page.fill('#mx-pv-r', 'Pedro Técnico');
  await page.click('[data-act="mx-pv-salvar"]'); await H.dorme(700);
  s = await srv(); const pv = (s['config/manut'].prev || [])[0];
  await page.click(`[data-act="mx-pv-gerar"][data-id="${pv.id}"]`); await H.dorme(1200);
  s = await srv(); const opv = Object.values(s).find(x => x && x.prevId === pv.id);
  await abrirOS(opv.numero); await page.click('[data-act="man-st"][data-v="Concluída"]'); await H.dorme(300); await page.click('[data-act="mz-causa"][data-v="Preventiva feita"]'); await page.fill('#mz-txt', 'Lubrificado'); await page.click('[data-act="mz-ok"]'); await H.dorme(1200);
  s = await srv(); const pv2 = s['config/manut'].prev[0]; const hoje = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  const prox = await page.evaluate(h => { const d = new Date(h + 'T12:00:00'); d.setDate(d.getDate() + 30); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }, hoje);
  await page.evaluate(() => __T.go('manprev')); await H.dorme(400); const tPv = await page.evaluate(() => document.getElementById('view').innerText);
  ok('Extra: preventiva com responsável → OS com responsável → concluída → próxima execução calculada e histórico', pv.resp === 'Pedro Técnico' && opv.exec.tecnico === 'Pedro Técnico' && pv2.ultima === hoje && pv2.prox === prox && /Realizadas:/.test(tPv), `responsável=${pv.resp} última=${pv2.ultima} próxima=${pv2.prox}`);

  // ---------- T12 outro usuário ----------
  await sair(); await H.entrar(page, 'operador', 'ope123'); await H.dorme(1800);
  const e12 = await page.evaluate(() => ({ uid: __T.S().uid, doc: JSON.stringify(__T.S().acs.doc), nav: document.getElementById('navlist').innerText }));
  await page.evaluate(() => __T.go('manequip')); await H.dorme(300); const v12 = await page.evaluate(() => __T.S().view);
  ok('T12 outro usuário: perfil e permissões próprios (operador não entra em Equipamentos)', e12.uid === 'uOPE' && !/manut/.test(e12.doc) && v12 !== 'manequip', `uid=${e12.uid} tentou Equipamentos → ${v12}`);
  await sair(); await H.entrar(page, 'tv', 'tv1234'); await H.dorme(1800);
  await page.evaluate(() => { const b = document.createElement('button'); b.dataset.go = 'manch'; b.id = 'tvg'; document.body.appendChild(b); }); await page.click('#tvg'); await H.dorme(300);
  ok('Perfil só de visualização não entra nos chamados e recebe a mensagem certa', await page.evaluate(() => __T.S().view) !== 'manch' && /não possui permissão/.test(await toastTxt()), await toastTxt());

  console.log('\nErros de JavaScript na página:', erros.filter(x => !/404/.test(x)).length ? erros.filter(x => !/404/.test(x)).slice(0, 8) : 'nenhum');
  require('fs').writeFileSync(__dirname + '/resultado-manut.json', JSON.stringify({ res, erros }, null, 1));
  await browser.close(); process.exit(0);
})().catch(e => { console.error('ERRO NO TESTE', e); process.exit(1); });
