const H = require('./harness');
const res = [];
const ok = (n, cond, det) => { res.push({ n, ok: !!cond, det }); console.log((cond ? 'PASSOU ' : 'FALHOU ') + n + (det ? ' — ' + det : '')); };

(async () => {
  const { browser, ctx, page, erros } = await H.abrir();
  const { d, uid } = H.seed();
  const estado = () => page.evaluate(() => ({ lg: !!document.getElementById('lg'), gate: (document.querySelector('.acs-gate h1') || {}).innerText || '', gateTxt: (document.querySelector('.acs-gate') || {}).innerText || '',
    uid: window.__T && __T.S().uid, view: window.__T && __T.S().view, temDb: !!(window.__T && __T.S().db), doc: window.__T && __T.S().acs && __T.S().acs.doc ? JSON.stringify(__T.S().acs.doc) : null,
    nav: (document.getElementById('navlist') || {}).innerText || '', toast: (document.getElementById('toast') || {}).hidden === false ? document.getElementById('toast').innerText : '' }));
  const erroLogin = async () => { await H.dorme(400); return page.evaluate(() => ({ er: (document.getElementById('lg-er') || {}).textContent || '', btn: (document.querySelector('#lg .lg-go') || {}).textContent, dis: (document.querySelector('#lg .lg-go') || {}).disabled })); };

  // T1 login correto
  await H.preparar(page, d); await page.goto(H.BASE);
  await H.entrar(page, 'joao', 'joao123'); await H.dorme(1500);
  let e = await estado();
  ok('T1 login correto', !e.lg && e.uid === uid.joao && !e.gate && /Produção/.test(e.nav), `tela=${e.view}, menu=${e.nav.replace(/\n/g, ' | ')}`);

  // T6 F5
  await page.reload(); await H.dorme(1500); e = await estado();
  ok('T6 F5 continua logado', !e.lg && e.uid === uid.joao && !e.gate, `tela=${e.view}`);

  // T7 fechar e abrir (nova aba no mesmo perfil do navegador, sessão persistida)
  await page.close(); const p2 = await ctx.newPage(); p2.on('pageerror', x => erros.push(String(x.message)));
  await p2.goto(H.BASE); await H.dorme(1500);
  const e7 = await p2.evaluate(() => ({ lg: !!document.getElementById('lg'), uid: window.__T && __T.S().uid }));
  ok('T7 fechar e abrir de novo continua logado', !e7.lg && e7.uid === uid.joao);
  const pg = p2;

  // T8 logout pelo menu do usuário
  await pg.click('.quem'); await pg.click('#pf-menu [data-m="sair"]'); await H.dorme(1500);
  const e8 = await pg.evaluate(() => ({ lg: !!document.getElementById('lg-e'), sess: localStorage.getItem('__sess_def'), cache: localStorage.getItem('__cache'), uidLS: localStorage.getItem('painel.uid'), db: !!(window.__T && __T.S().db) }));
  ok('T8 logout volta para login e encerra a sessão (a cópia local fica até outra pessoa entrar)', e8.lg && !e8.sess && !e8.db, JSON.stringify({lg:e8.lg,sess:e8.sess,db:e8.db}));

  // T9 login com outro usuário (Carlos, só almox) depois do João
  await H.entrar(pg, 'carlos', 'carlos123'); await H.dorme(1800);
  const e9 = await pg.evaluate(() => ({ uid: __T.S().uid, doc: JSON.stringify(__T.S().acs.doc), nav: document.getElementById('navlist').innerText, ent: (__T.S().entregas || []).length, ordens: (__T.S().ordens || []).length }));
  const cacheJoao = await pg.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('__cache') || '{}')).filter(k => /uJOAO/.test(k)).length);
  ok('T9b quando outra pessoa entra, a cópia local da anterior é apagada', cacheJoao === 0, 'documentos do João no cache: ' + cacheJoao);
  ok('T9 outro usuário não herda perfil/permissões do anterior', e9.uid === uid.carlos && e9.doc === JSON.stringify(d.docs['acessos/' + uid.carlos]) && !/Silos/.test(e9.nav), `uid=${e9.uid} perfil=${e9.doc} menu=${e9.nav.replace(/\n/g, ' | ')} (Produção aparece só pelo Diário de bordo, que o almox já via antes)`);

  // T5 com perfil, sem permissão de um módulo: toque numa tela de Produção
  await pg.evaluate(() => { const b = document.createElement('button'); b.dataset.go = 'programacao'; b.id = 'teste-go'; document.body.appendChild(b); });
  await pg.evaluate(() => document.getElementById('teste-go').click()); await H.dorme(300); /* Carlos só tem o Inventário: o programa ocupa a tela toda */
  const e5 = await pg.evaluate(() => ({ view: __T.S().view, lg: !!document.getElementById('lg'), toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast').innerText, gate: !!document.querySelector('.acs-gate') }));
  ok('T5 sem permissão: avisa e continua no sistema', e5.view !== 'programacao' && !e5.lg && !e5.gate && /não possui permissão/.test(e5.toast), JSON.stringify(e5));

  // sair para os próximos
  await pg.evaluate(() => document.querySelector('[data-act="sair-conta"]') || (() => { const b = document.createElement('button'); b.dataset.act = 'sair-conta'; b.id = 'sx'; document.body.appendChild(b); })());
  await pg.evaluate(() => (document.getElementById('sx') || document.querySelector('[data-act="sair-conta"]')).click()); await H.dorme(1500);
  ok('T5b depois de sair, a tela de entrar aparece (o programa do inventário fecha)', await pg.evaluate(() => !document.body.classList.contains('inv-solo') && !!document.getElementById('lg') && document.getElementById('lg').getBoundingClientRect().width > 0 && !document.querySelector('.inv-frx')));

  // T2 senha errada
  await H.entrar(pg, 'joao', 'errada'); let l = await (async () => { await H.dorme(400); return pg.evaluate(() => ({ er: document.getElementById('lg-er').textContent, dis: document.querySelector('#lg .lg-go').disabled })); })();
  ok('T2 senha errada', l.er === 'Usuário ou senha incorretos.' && !l.dis, JSON.stringify(l));

  // T3 usuário inexistente (com proteção contra enumeração do Firebase = padrão; e sem ela)
  await H.entrar(pg, 'naoexiste', 'qualquer1'); await H.dorme(400);
  l = await pg.evaluate(() => ({ er: document.getElementById('lg-er').textContent, dis: document.querySelector('#lg .lg-go').disabled }));
  ok('T3a usuário inexistente (proteção de enumeração ligada)', l.er === 'Usuário ou senha incorretos.' && !l.dis, JSON.stringify(l));
  await H.ctlSet(pg, { enumProt: false });
  await H.entrar(pg, 'naoexiste', 'qualquer1'); await H.dorme(400);
  l = await pg.evaluate(() => ({ er: document.getElementById('lg-er').textContent, dis: document.querySelector('#lg .lg-go').disabled }));
  ok('T3b usuário inexistente (proteção desligada)', l.er === 'Usuário não encontrado.' && !l.dis, JSON.stringify(l));

  // T10a falha de conexão no login
  await H.ctlSet(pg, { offline: true });
  await H.entrar(pg, 'joao', 'joao123'); await H.dorme(400);
  l = await pg.evaluate(() => ({ er: document.getElementById('lg-er').textContent, dis: document.querySelector('#lg .lg-go').disabled }));
  ok('T10a sem conexão no login: mensagem clara e botão liberado', /Não foi possível conectar ao servidor/.test(l.er) && !l.dis, JSON.stringify(l));
  // muitas tentativas (no código original travava o botão)
  await H.ctlSet(pg, { tooMany: true });
  await H.entrar(pg, 'joao', 'joao123'); await H.dorme(400);
  l = await pg.evaluate(() => ({ er: document.getElementById('lg-er').textContent, dis: document.querySelector('#lg .lg-go').disabled }));
  ok('T2b muitas tentativas: mensagem e botão liberado', /Muitas tentativas/.test(l.er) && !l.dis, JSON.stringify(l));
  await H.ctlSet(pg, {});

  // T4 autenticado sem perfil
  await H.entrar(pg, 'maria', 'maria123'); await H.dorme(1800);
  const e4 = await pg.evaluate(() => ({ lg: !!document.getElementById('lg'), gate: (document.querySelector('.acs-gate') || {}).innerText || '', pedido: JSON.parse(localStorage.getItem('__srv')).docs['pedidos/uMARIA'] }));
  ok('T4 autenticado sem perfil: mensagem correta, sem confundir com senha', !e4.lg && /Login realizado, mas seu perfil de acesso não foi encontrado/.test(e4.gate) && !!e4.pedido, e4.gate.split('\n')[0]);

  // T10b sessão válida + sem internet + sem cópia local do perfil → não pode dizer "sem perfil" nem voltar ao login
  await pg.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'sair-conta'; b.id = 'sx2'; document.body.appendChild(b); }); await pg.click('#sx2'); await H.dorme(1500);
  await H.entrar(pg, 'joao', 'joao123'); await H.dorme(1500);
  await pg.evaluate(() => localStorage.removeItem('__cache')); await H.ctlSet(pg, { offline: true });
  await pg.reload(); await H.dorme(2500);
  const e10 = await pg.evaluate(() => ({ lg: !!document.getElementById('lg'), gate: (document.querySelector('.acs-gate h1') || {}).innerText || '' }));
  ok('T10b sem internet ao abrir: fica em "Verificando", não expulsa nem diz "sem perfil"', !e10.lg && /Verificando/.test(e10.gate), JSON.stringify(e10));
  await H.ctlSet(pg, {}); await pg.evaluate(() => window.__mockReconnect()); await H.dorme(1500);
  const e10c = await pg.evaluate(() => ({ gate: (document.querySelector('.acs-gate h1') || {}).innerText || '', nav: document.getElementById('navlist').innerText }));
  ok('T10c conexão volta: entra sozinho, sem recarregar', !e10c.gate && /Produção/.test(e10c.nav), JSON.stringify(e10c).slice(0, 120));

  // T11 tela interna sem login
  const p3 = await (await H.abrir()).page; // navegador novo, sem sessão
  await H.preparar(p3, d); await p3.goto(H.BASE + '?area=producao#programacao'); await H.dorme(1500);
  const e11 = await p3.evaluate(() => ({ lg: !!document.getElementById('lg-e'), db: !!(window.__T && __T.S().db), ordens: (window.__T && __T.S().ordens || []).length, view: (document.getElementById('view') || {}).innerText.slice(0, 80) }));
  ok('T11 sem login não acessa tela interna nem dados', e11.lg && !e11.db && e11.ordens === 0, JSON.stringify(e11));

  // listener de auth registrado uma vez só
  const nAuth = await pg.evaluate(() => window.__mockLog.filter(x => x[0] === 'onAuthStateChanged').length);
  ok('onAuthStateChanged registrado uma única vez por carregamento', nAuth === 1, 'registros=' + nAuth);

  console.log('\nErros de JavaScript na página:', erros.length ? erros.slice(0, 10) : 'nenhum');
  require('fs').writeFileSync(__dirname + '/resultado-login-' + (process.env.TAG || 'novo') + '.json', JSON.stringify({ res, erros }, null, 1));
  await browser.close(); process.exit(0);
})().catch(e => { console.error('ERRO NO TESTE', e); process.exit(1); });
