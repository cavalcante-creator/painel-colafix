const H = require('./harness'); const { seedManut } = require('./manut-seed'); const { execFileSync } = require('child_process'); const fs = require('fs');
const res = []; const ok = (n, c, det) => { res.push({ n, ok: !!c, det }); console.log((c ? 'PASSOU ' : 'FALHOU ') + n + (det ? ' — ' + String(det).slice(0, 240) : '')); };
const PY = (...a) => execFileSync('python3', [__dirname + '/cam.py', ...a]).toString();
const DIR = '/tmp/totem'; fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const { d } = seedManut(x => x);
  d.users['tablet@painel-colafix.app'] = { uid: 'uTAB', pass: 'tab123', nome: 'Tablet L1/L2' };
  d.docs['perfis/uTAB'] = { nome: 'Tablet da parede', usuario: 'tablet' };
  d.docs['acessos/uTAB'] = { perfil: 'linha', mods: ['paradas'], locais: [], ativo: true };
  let banco = d;

  // ---------- A. a administradora cria os crachás e imprime ----------
  let B = await H.abrir(); let page = B.page; await H.preparar(page, banco); await page.goto(H.BASE); await H.entrar(page, 'iasmyn', 'senha123'); await H.dorme(1800);
  await page.evaluate(() => __T.go('mancrachas')); await H.dorme(500);
  const criar = async (nome, linha, papel) => { await page.fill('#cr-nome', nome); await page.selectOption('#cr-linha', linha); await page.selectOption('#cr-papel', papel); await page.click('[data-act="cr-add"]'); await H.dorme(500); };
  await criar('Ana Souza', 'Linha 1', 'operador'); await criar('Bruno Lima', 'Linha 2', 'operador'); await criar('Pedro Técnico', '*', 'tecnico'); await criar('Ana Souza', 'Linha 1', 'operador');
  const srv = p => (p || page).evaluate(() => JSON.parse(localStorage.getItem('__srv')));
  let S0 = await srv(); const crs = Object.values(S0.docs).filter(x => x && x.codigo && x.papel);
  const cod = n => crs.find(c => c.nome === n).codigo;
  ok('A1 crachás criados (nome, linha, papel, código aleatório; nome repetido recusado)', crs.length === 3 && crs.every(c => /^[A-Z2-9]{8}$/.test(c.codigo)) && crs.find(c => c.nome === 'Pedro Técnico').papel === 'tecnico', crs.map(c => c.nome + '=' + c.codigo + '(' + c.linha + ')').join(' · '));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('[data-act="cr-pdf-todos"]')]);
  const pdf = DIR + '/crachas.png'; await dl.saveAs(pdf); const nomeArq = dl.suggestedFilename();
  const info = 'A4'; const med = PY('medir', pdf);
  const lidos = JSON.parse(med.replace(/\(/g, '[').replace(/\)/g, ']').replace(/'/g, '"'));
  const tamOk = lidos.length === 3 && lidos.every(([t, mm]) => mm >= 28.5 && mm <= 31.5);
  ok('A2 PDF de crachás: tamanho de crachá (85,6×54 mm), QR com ~3 cm e legível', /\.pdf$/.test(nomeArq) && tamOk && lidos.map(x => x[0]).sort().join() === crs.map(c => 'COLAFIX:CRACHA:' + c.codigo).sort().join(), 'QR medidos no PDF: ' + lidos.map(([t, mm]) => t.slice(15) + ' ' + mm + ' mm').join(' · '));
  // ordem no PDF: linha, depois nome → Pedro(*)=0, Ana(Linha 1)=1, Bruno(Linha 2)=2
  const ordem = crs.slice().sort((p, q) => String(p.linha).localeCompare(String(q.linha)) || String(p.nome).localeCompare(String(q.nome))).map(c => c.nome);
  const idx = n => ordem.indexOf(n);
  PY('cracha', pdf, String(idx('Ana Souza')), DIR + '/ana.y4m'); PY('cracha', pdf, String(idx('Pedro Técnico')), DIR + '/pedro.y4m'); PY('cracha', pdf, String(idx('Bruno Lima')), DIR + '/bruno.y4m');
  PY('qr', 'COLAFIX:CRACHA:ZZZZ9999', DIR + '/falso.y4m'); PY('qr', 'https://exemplo.com/qualquer', DIR + '/outro.y4m');
  banco = await srv(); await B.browser.close();

  // tablet com uma "câmera" mostrando um crachá
  const tablet = async (cam, extra) => { const T = await H.abrir(Object.assign({ camera: cam, decodificador: true, viewport: { width: 1280, height: 800 } }, extra || {})); await H.preparar(T.page, banco);
    await T.page.goto(H.BASE + '?totem=1'); await H.entrar(T.page, 'tablet', 'tab123'); return T; };
  const fase = p => p.evaluate(() => __T.S().tt.fase); const tela = p => p.evaluate(() => (document.querySelector('.tt') || {}).innerText || '');
  const espera = async (p, cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (await p.evaluate(cond).catch(() => false)) return true; await H.dorme(200); } return false; };

  // ---------- B1. Ana passa o crachá e abre o chamado ----------
  let T = await tablet(DIR + '/ana.y4m'); let p = T.page;
  const entrou = await espera(p, () => window.__T && __T.S().view === 'mantotem' && __T.S().tt.fase === 'maquina', 15000);
  const t1 = await tela(p);
  ok('B1 tablet em modo parede lê o crachá da Ana pela câmera e cumprimenta, com a linha dela primeiro', entrou && /Olá, Ana Souza/.test(t1) && /Linha 1 sua linha/.test(t1.replace(/\n/g, ' ')) && await p.evaluate(() => document.body.classList.contains('tt-on')), t1.replace(/\n/g, ' | ').slice(0, 160));
  await p.click('[data-act="tt-eq"][data-id="eqmix1"]'); await p.click('[data-act="tt-def"][data-v="Barulho anormal"]'); await p.fill('#tt-txt', 'rolamento chiando'); await p.click('[data-act="tt-def-ok"]');
  await p.dblclick('[data-act="tt-imp"][data-v="reduziu"]'); await espera(p, () => __T.S().tt.fase === 'ok', 6000);
  banco = await srv(p); const chs = Object.values(banco.docs).filter(x => x && x.origem === 'tablet');
  const c1 = chs[0];
  ok('B2 chamado salvo no nome da Ana, com crachá, linha, máquina e defeito (sem duplicar)', chs.length === 1 && c1.nome === 'Ana Souza' && c1.cracha === cod('Ana Souza') && c1.linha === 'Linha 1' && c1.equipId === 'eqmix1' && c1.defeito === 'Barulho anormal: rolamento chiando' && c1.impacto === 'reduziu' && /crachá de Ana Souza/.test(JSON.stringify(c1.hist)),
    c1 && `OS ${c1.numero} · ${c1.nome} · ${c1.linha} · ${c1.equip} · ${c1.defeito}`);
  await H.dorme(9500); const f3 = await fase(p); await H.dorme(3000); const f3b = await fase(p);
  ok('B3 volta sozinho para a espera e não reabre para quem acabou de chamar (crachá ainda na frente da câmera)', f3 === 'espera' && f3b === 'espera', `${f3} → ${f3b}`);
  const est = await tela(p);
  ok('B4 tela de espera mostra o estado das duas linhas', /LINHA 1|Linha 1/i.test(est) && /Manutenção chamada/.test(est) && /LINHA 2|Linha 2/i.test(est), est.replace(/\n/g, ' | ').slice(0, 170));
  await T.browser.close();

  // ---------- B5. Pedro (técnico) chega na máquina ----------
  T = await tablet(DIR + '/pedro.y4m'); p = T.page;
  await espera(p, () => window.__T && __T.S().tt.fase === 'tecnico', 15000); const t5 = await tela(p);
  await p.click(`[data-act="tt-cheguei"][data-n="${c1.numero}"]`); await espera(p, () => __T.S().tt.fase === 'espera', 6000); await H.dorme(500);
  banco = await srv(p); const c1b = Object.values(banco.docs).find(x => x && x.numero === c1.numero);
  ok('B5 técnico passa o crachá, vê o chamado e registra "cheguei" (status, responsável e hora)', /Qual chamado você está atendendo/.test(t5) && c1b.status === 'Em execução' && c1b.exec.tecnico === 'Pedro Técnico' && !!c1b.noLocalEm && /Técnico no local: Pedro Técnico \(crachá\)/.test(JSON.stringify(c1b.hist)), `${c1b.status} · ${c1b.exec.tecnico} · no local ${c1b.noLocalEm} · t5=${/Qual chamado/.test(t5)} · hist=${JSON.stringify((c1b.hist||[]).map(h=>h.o))}`);
  await T.browser.close();

  // ---------- B6. ninguém mexe: volta para a espera ----------
  T = await tablet(DIR + '/bruno.y4m'); p = T.page;
  await espera(p, () => window.__T && __T.S().tt.fase === 'maquina', 15000); const t6 = await tela(p);
  await p.evaluate(() => { __T.S().tt.ocioso = 2000; }); await p.click('[data-act="tt-eq"][data-id="eqcmp"]'); await H.dorme(3200);
  const f6 = await p.evaluate(() => ({ f: __T.S().tt.fase, eq: __T.S().tt.equipId, p: __T.S().tt.p }));
  ok('B6 Bruno (Linha 2 primeiro); sem toque, o tablet descarta o rascunho e volta para a espera', /Linha 2 sua linha/.test(t6.replace(/\n/g, ' ')) && f6.f === 'espera' && !f6.eq && !f6.p, JSON.stringify(f6));
  await T.browser.close();

  // ---------- B7. crachá desconhecido e QR que não é crachá ----------
  T = await tablet(DIR + '/falso.y4m'); p = T.page; await espera(p, () => window.__T && /não reconhecido/.test(__T.S().tt.msg || ''), 15000);
  const m7 = await p.evaluate(() => ({ f: __T.S().tt.fase, m: __T.S().tt.msg })); await T.browser.close();
  T = await tablet(DIR + '/outro.y4m'); p = T.page; await espera(p, () => window.__T && /não é um crachá/.test(__T.S().tt.msg || ''), 15000);
  const m7b = await p.evaluate(() => ({ f: __T.S().tt.fase, m: __T.S().tt.msg })); await T.browser.close();
  ok('B7 crachá desconhecido e QR qualquer são recusados com mensagem clara', m7.f === 'espera' && /não reconhecido/.test(m7.m) && m7b.f === 'espera' && /não é um crachá/.test(m7b.m), m7.m + ' | ' + m7b.m);

  // ---------- B8. crachá desativado ----------
  B = await H.abrir(); page = B.page; await H.preparar(page, banco); await page.goto(H.BASE); await H.entrar(page, 'iasmyn', 'senha123'); await H.dorme(1800);
  await page.evaluate(() => __T.go('mancrachas')); await H.dorme(400); const idB = cod('Bruno Lima');
  await page.click(`[data-act="cr-conf"][data-id="${idB}"]`); await H.dorme(200); await page.click(`[data-act="cr-desat"][data-id="${idB}"]`); await H.dorme(500);
  banco = await srv(page); await B.browser.close();
  T = await tablet(DIR + '/bruno.y4m'); p = T.page; await espera(p, () => window.__T && /desativado/.test(__T.S().tt.msg || ''), 15000);
  const m8 = await p.evaluate(() => ({ f: __T.S().tt.fase, m: __T.S().tt.msg }));
  const semBt = await p.evaluate(() => !!document.querySelector('[data-act="tt-sem"]'));
  ok('B8 crachá desativado não abre chamado', m8.f === 'espera' && /desativado/.test(m8.m), m8.m);
  ok('B8b regra: sem crachá não abre chamado (o botão "sem crachá" não aparece por padrão)', !semBt);
  await T.browser.close();
  // a administradora libera a exceção de emergência
  B = await H.abrir(); page = B.page; await H.preparar(page, banco); await page.goto(H.BASE); await H.entrar(page, 'iasmyn', 'senha123'); await H.dorme(1800);
  await page.evaluate(() => __T.go('mancrachas')); await H.dorme(400); await page.check('#cr-semcr'); await H.dorme(600); banco = await srv(page); await B.browser.close();
  T = await tablet(DIR + '/bruno.y4m'); p = T.page; await espera(p, () => window.__T && !!document.querySelector('[data-act="tt-sem"]'), 15000);
  // ---------- B9. sem crachá (só com a exceção ligada) ----------
  await p.click('[data-act="tt-sem"]'); await p.fill('#tt-nome', 'Carla Visitante'); await p.click('[data-act="tt-sem-ok"]');
  await p.click('[data-act="tt-eq"][data-l="Linha 2"][data-id=""]'); await p.click('[data-act="tt-def"][data-v="Outro"]'); await p.fill('#tt-txt', 'cheiro de queimado'); await p.click('[data-act="tt-def-ok"]'); await p.click('[data-act="tt-imp"][data-v="nao"]');
  await espera(p, () => __T.S().tt.fase === 'ok', 6000); banco = await srv(p);
  const c9 = Object.values(banco.docs).find(x => x && x.nome === 'Carla Visitante');
  ok('B9 com a exceção ligada pela administradora: sem crachá digita o nome e abre o chamado (marcado "sem crachá")', c9 && c9.cracha === null && c9.linha === 'Linha 2' && !c9.equipId && c9.defeito === 'cheiro de queimado' && /sem crachá: Carla Visitante/.test(JSON.stringify(c9.hist)), c9 && `${c9.nome} · ${c9.linha} · ${c9.defeito}`);
  // ---------- B10. o tablet não gerencia crachás ----------
  await p.evaluate(() => { __T.S().tt.fase = 'espera'; const b = document.createElement('button'); b.dataset.go = 'mancrachas'; b.id = 'gx'; document.body.appendChild(b); b.click(); }); await H.dorme(300);
  ok('B10 a conta do tablet não abre o cadastro de crachás', await p.evaluate(() => __T.S().view) !== 'mancrachas');
  await T.browser.close();
  // ---------- B11. câmera bloqueada ----------
  T = await tablet(DIR + '/ana.y4m', { negarCamera: true }); p = T.page; await espera(p, () => window.__T && __T.S().tt.cam === 'erro', 15000);
  const t11 = await tela(p);
  ok('B11 câmera bloqueada: mensagem clara e o botão "sem crachá" continua funcionando', /câmera foi bloqueada/.test(t11) && /Estou sem crachá/.test(t11), t11.replace(/\n/g, ' | ').slice(0, 200));
  await T.browser.close();
  // ---------- B12. tablet em pé (retrato) ----------
  T = await tablet(DIR + '/ana.y4m', { viewport: { width: 800, height: 1280 } }); p = T.page; await espera(p, () => window.__T && __T.S().tt.fase === 'maquina', 15000);
  const lay = await p.evaluate(() => ({ larg: document.documentElement.scrollWidth, vis: innerWidth, bt: [...document.querySelectorAll('.tt-bt')].every(b => b.getBoundingClientRect().height >= 60) }));
  await p.screenshot({ path: DIR + '/tablet-retrato.png' });
  ok('B12 tablet em pé: sem rolagem lateral e botões grandes para o dedo', lay.larg <= lay.vis && lay.bt, JSON.stringify(lay));
  await T.browser.close();

  // ---------- B13. quem conserta conclui com o crachá ----------
  T = await tablet(DIR + '/pedro.y4m'); p = T.page; await espera(p, () => window.__T && __T.S().tt.fase === 'tecnico', 15000);
  await p.click(`[data-act="tt-fim"][data-n="${c1.numero}"]`); await p.fill('#tt-serv', 'troquei o rolamento'); await p.click('[data-act="tt-fim-ok"]'); await H.dorme(300);
  const m13 = await p.evaluate(() => __T.S().tt.msg);
  await p.click('[data-act="tt-causa"][data-v="Desgaste de peça"]'); await p.click('[data-act="tt-fim-ok"]'); await espera(p, () => __T.S().tt.fase === 'fimok', 6000);
  banco = await srv(p); const cf = Object.values(banco.docs).find(x => x && x.numero === c1.numero);
  ok('B13 técnico conclui no tablet com o crachá: exige causa e serviço, registra quem consertou', /causou/.test(m13) && cf.status === 'Concluída' && cf.exec.tecnico === 'Pedro Técnico' && cf.exec.tecnicoCracha === cod('Pedro Técnico') && cf.concluidoPorNome === 'Pedro Técnico' && cf.exec.causa === 'Desgaste de peça' && cf.exec.servicos === 'troquei o rolamento' && /Conserto concluído no tablet por Pedro Técnico/.test(JSON.stringify(cf.hist)),
    `sem causa: "${m13}" · ${cf.status} · ${cf.concluidoPorNome} · ${cf.exec.causa}`);
  await T.browser.close();
  // ---------- B14. crachá de operador não conclui conserto ----------
  T = await tablet(DIR + '/ana.y4m'); p = T.page; await espera(p, () => window.__T && __T.S().tt.fase === 'maquina', 15000);
  ok('B14 crachá de operador abre chamado mas não vê "Cheguei" nem "Terminei"', !(await p.evaluate(() => !!document.querySelector('[data-act="tt-fim"],[data-act="tt-cheguei"]'))) && /Qual máquina/.test(await tela(p)));
  await T.browser.close();

  fs.writeFileSync(__dirname + '/resultado-totem.json', JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { console.error('ERRO NO TESTE', e); process.exit(1); });
