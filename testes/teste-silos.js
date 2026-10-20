const H = require('./harness');
const res = []; const ok = (n, c, det) => { res.push({ n, ok: !!c, det }); console.log((c ? 'PASSOU ' : 'FALHOU ') + n + (det ? ' — ' + det : '')); };

(async () => {
  const { browser, page, erros } = await H.abrir();
  const { d } = H.seed();
  d.docs['config/geral'].siloComparar = false; /* este teste confere o modo em que a medição corrige o saldo (o modo comparação tem teste próprio: teste-silomais.js) */
  await H.preparar(page, d); await page.goto(H.BASE);
  await H.entrar(page, 'iasmyn', 'senha123'); await H.dorme(1800);
  const srv = () => page.evaluate(() => JSON.parse(localStorage.getItem('__srv')).docs);
  const saldo = async sid => { const x = (await srv())['silos/' + sid]; return x ? x.saldoKg : null; };
  const irSilo = async sid => { await page.evaluate(sid => { const S = __T.S(); S.siloSel = sid; __T.go('silos'); }, sid); await H.dorme(300); };
  const agoraTela = () => page.evaluate(() => { const l = [...document.querySelectorAll('.label')].find(x => x.innerText === 'AGORA'); return l ? l.parentElement.innerText.replace(/\n/g, ' ') : ''; });
  const tanqueGeral = async nome => { await page.evaluate(() => __T.go('geral')); await H.dorme(300); return page.evaluate(n => { const t = [...document.querySelectorAll('.silos-wrap .tank')].find(x => x.querySelector('.nm').textContent.trim().toLowerCase() === n.toLowerCase()); return t ? t.innerText.replace(/\n/g, ' ') : ''; }, nome); };
  const apontar = (ordem, qtd, extra) => page.evaluate(([o, q, x]) => __T.salvar('entregas', Object.assign({ ordem: o, num: o, linha: __T.S().ordens.find(z => z._id === o).linha, em: new Date().toISOString(), por: __T.S().uid, qtd: q }, x || {})), [ordem, qtd, extra]);
  const idUltimaEntrega = () => page.evaluate(() => { const ds = JSON.parse(localStorage.getItem('__srv')).docs; return Object.keys(ds).filter(k => k.startsWith('entregas/')).map(k => [k.slice(9), ds[k]]).sort((a, b) => b[1].em.localeCompare(a[1].em))[0]; });
  const aviso = () => page.evaluate(() => (document.getElementById('silo-aviso') || {}).innerText || '');
  const fecharAviso = () => page.evaluate(() => { const a = document.getElementById('silo-aviso'); a && a.remove(); });

  // 0) configuração: Linha 1 → Silo Grande (c2), Linha 2 → Silo Pequeno (c1) pela tela
  await irSilo('c2');
  await page.click('[data-act="smf-tg"][data-m="cim"][data-l="Linha 1"][data-sid="c2"]'); await H.dorme(150); await page.click('[data-act="smf-tg"][data-m="cim"][data-l="Linha 2"][data-sid="c1"]'); await H.dorme(150);
  await page.click('[data-act="smf-ok"]'); await H.dorme(400); /* editor novo (um ou vários silos por linha) */
  const cfg = (await srv())['config/geral'].siloConsumo;
  ok('Configuração: silo de consumo por linha salva', cfg && cfg['Linha 1'] === 'c2' && cfg['Linha 2'] === 'c1', JSON.stringify(cfg));

  // 0b) saldo inicial pela medição 📏: 10.000 kg
  await irSilo('c2'); await page.click('[data-act="sm-abrir"]'); await page.fill('#sm-kg', '10000'); await page.click('[data-act="sm-salvar"]'); await H.dorme(600);
  ok('Saldo inicial por medição 📏 = 10.000 kg', await saldo('c2') === 10000, 'saldo=' + await saldo('c2'));

  // T1 consumo 500 kg (100 un × 5 kg)
  await apontar('5001', 100); await H.dorme(500);
  let tela = await tanqueGeral('Silo Grande');
  ok('T1 10.000 − 500 = 9.500 kg no banco e no painel', await saldo('c2') === 9500 && /9,5\s*t/.test(tela) && /⚙️/.test(tela), 'banco=' + await saldo('c2') + ' | tanque: ' + tela);
  const ent1 = await idUltimaEntrega();

  // T2 recarregar
  await page.reload(); await H.dorme(1800); await irSilo('c2'); tela = await agoraTela();
  ok('T2 depois de recarregar continua 9.500 kg', /9\.500 kg/.test(tela) && /Atualização automática/.test(tela), tela.slice(0, 160));

  // T3 consumo 300 kg
  await apontar('5001', 60); await H.dorme(500);
  ok('T3 9.500 − 300 = 9.200 kg', await saldo('c2') === 9200, 'saldo=' + await saldo('c2'));

  // T4 consumo maior que o saldo (2.000 un × 5 kg = 10.000 kg)
  await apontar('5001', 2000); await H.dorme(600);
  const av = await aviso(); const ent4 = await idUltimaEntrega(); const ds4 = await srv();
  ok('T4 consumo maior que o saldo: bloqueado e avisado, saldo não fica negativo', await saldo('c2') === 9200 && /Estoque insuficiente no silo/.test(av) && !!ds4['entregas/' + ent4[0]] && ds4['silomov/r_' + ent4[0]] && ds4['silomov/r_' + ent4[0]].tipo === 'recusado',
    'saldo=' + await saldo('c2') + ' | aviso: ' + av.slice(0, 110));
  await fecharAviso();

  // T5 medição manual 8.950 (sistema 9.200) com motivo Inventário
  await irSilo('c2'); await page.click('[data-act="sm-abrir"]'); await page.fill('#sm-kg', '8950');
  const dif = await page.$eval('#sm-dif', e => e.innerText);
  await page.click('[data-act="sm-motivo"][data-v="Inventário"]'); await page.fill('#sm-obs', 'contagem com trena'); await page.click('[data-act="sm-salvar"]'); await H.dorme(600);
  const movs = Object.entries(await srv()).filter(([k, v]) => k.startsWith('silomov/') && v.tipo === 'medicao').map(x => x[1]).sort((a, b) => b.em.localeCompare(a.em));
  const m5 = movs[0];
  ok('T5 medição manual: saldo 8.950, registrada como MEDIÇÃO (não consumo)', await saldo('c2') === 8950 && m5.antesKg === 9200 && m5.medidoKg === 8950 && m5.diferencaKg === -250 && m5.depoisKg === 8950 && m5.motivo === 'Inventário' && m5.obs === 'contagem com trena' && m5.porNome === 'Iasmyn',
    `diferença na tela antes de salvar: ${dif} | mov: antes ${m5.antesKg}, medido ${m5.medidoKg}, dif ${m5.diferencaKg}, novo ${m5.depoisKg}, motivo ${m5.motivo}`);

  // T6 recarregar
  await page.reload(); await H.dorme(1800); await irSilo('c2'); tela = await agoraTela();
  ok('T6 depois de recarregar continua 8.950 kg (origem medição manual)', /8\.950 kg/.test(tela) && /Medição manual/.test(tela), tela.slice(0, 160));

  // T7 histórico
  const hist = await page.evaluate(() => { const c = [...document.querySelectorAll('section.card .label')].find(x => /MOVIMENTAÇÕES/.test(x.innerText)); return c ? c.parentElement.innerText : ''; });
  const nCons = (hist.match(/Consumo \(apontamento\)/g) || []).length, nMed = (hist.match(/Medição manual/g) || []).length, nRec = (hist.match(/Consumo recusado/g) || []).length;
  ok('T7 histórico com todas as movimentações (2 consumos, 1 recusado, 2 medições)', nCons === 2 && nMed === 2 && nRec === 1, `consumos=${nCons} medições=${nMed} recusados=${nRec}`);

  // T8 mesmo apontamento processado de novo (duas vezes ao mesmo tempo + rede de segurança)
  const antes8 = await saldo('c2');
  const r8 = await page.evaluate(id => { const e = JSON.parse(localStorage.getItem('__srv')).docs['entregas/' + id]; return Promise.all([__T.proc(id, e), __T.proc(id, e)]); }, ent1[0]);
  await page.evaluate(() => __T.rec()); await H.dorme(500);
  const nC1 = Object.keys(await srv()).filter(k => k === 'silomov/c_' + ent1[0]).length;
  ok('T8 o mesmo apontamento não desconta duas vezes', await saldo('c2') === antes8 && nC1 === 1, `saldo antes ${antes8} depois ${await saldo('c2')} · retorno ${JSON.stringify(r8)}`);

  // Extra A: desfazer apontamento devolve o consumo
  await apontar('5001', 20); await H.dorme(400); const s1 = await saldo('c2'); const entA = await idUltimaEntrega();
  await page.evaluate(id => __T.salvar('entregas', { ordem: '5001', num: '5001', anula: id, em: new Date().toISOString(), por: __T.S().uid, qtd: 0 }), entA[0]); await H.dorme(500);
  ok('Extra A: desfazer apontamento devolve 100 kg ao silo', s1 === 8850 && await saldo('c2') === 8950, `${s1} → ${await saldo('c2')}`);

  // Extra B: tela "Nova medição" (vários silos, em toneladas) também atualiza o saldo
  await page.evaluate(() => __T.go('medicao')); await H.dorme(400);
  await page.fill('#m-c1', '10'); await page.fill('#m-c2', '8'); await page.fill('#m-c3', '5'); await page.dispatchEvent('#m-c3', 'input');
  await page.evaluate(() => { const S = __T.S(); S.med.v.c1 = '10'; S.med.v.c2 = '8'; S.med.v.c3 = '5'; });
  await page.evaluate(() => { const b = document.getElementById('m-salvar'); b.disabled = false; b.click(); }); await H.dorme(900);
  const sB = [await saldo('c1'), await saldo('c2'), await saldo('c3')];
  const prev = await page.evaluate(() => __T.prev());
  ok('Extra B: "Nova medição" (tela antiga) atualiza o saldo dos silos', sB.join() === '10000,8000,5000', sB.join(' / ') + ' kg');
  ok('Extra C: Cimento × programação usa o mesmo saldo dos tanques (23 t)', prev && Math.abs(prev.estoque - 23) < 1e-6, 'estimado=' + (prev && prev.estoque) + ' t');

  // Extra D: sem internet na hora do apontamento → avisa; volta a internet → rede de segurança desconta uma vez
  await H.ctlSet(page, { offline: true });
  await page.evaluate(() => { const S = __T.S(); const ref = S.db.collection('entregas').doc('offline1'); return true; });
  await page.evaluate(() => { const d = { ordem: '5002', num: '5002', linha: 'Linha 2', em: new Date().toISOString(), por: __T.S().uid, qtd: 40 };
    const s = JSON.parse(localStorage.getItem('__srv')); s.docs['entregas/offline1'] = d; localStorage.setItem('__srv', JSON.stringify(s)); return __T.proc('offline1', d).catch(e => e.code); });
  await H.ctlSet(page, {}); await page.evaluate(() => window.__mockReconnect()); await H.dorme(600);
  await page.evaluate(() => __T.rec()); await H.dorme(600); await page.evaluate(() => __T.rec()); await H.dorme(300);
  ok('Extra D: apontamento que não descontou (sem internet) é descontado depois, uma vez só', await saldo('c1') === 9800, 'Silo Pequeno: ' + await saldo('c1') + ' kg');

  // Extra E: linha sem silo configurado não desconta e avisa
  await page.evaluate(() => __T.S().cfg.siloConsumo['Linha 2'] = ''); await fecharAviso();
  await apontar('5002', 10); await H.dorme(400); const avE = await aviso();
  ok('Extra E: linha sem silo configurado não desconta e avisa', await saldo('c1') === 9800 && /não tem silo de consumo configurado/.test(avE), avE.slice(0, 90));

  // Extra F: quem não tem Silos não vê o botão 📏
  console.log('\nErros de JavaScript na página:', erros.length ? erros.slice(0, 8) : 'nenhum');
  require('fs').writeFileSync(__dirname + '/resultado-silos.json', JSON.stringify({ res, erros }, null, 1));
  await browser.close(); process.exit(0);
})().catch(e => { console.error('ERRO NO TESTE', e); process.exit(1); });
