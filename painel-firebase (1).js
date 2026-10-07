/* Painel de Operação Colafix — versão online (Firebase).
   Faz o painel funcionar fora do Claude: implementa window.claude.use('db' | 'user' | 'assets' | 'downloads')
   em cima do Firebase (Firestore + Authentication por e-mail e senha).
   Precisa de window.PAINEL_CONFIG = { firebase:{...}, donos:['email@...'], link:'https://...' } antes deste arquivo. */
(function(){
  'use strict';
  const CFG = window.PAINEL_CONFIG || {};
  const DOM = CFG.dominio || 'painel-colafix.app';            /* usuário vira usuario@painel-colafix.app (e-mail interno, ninguém recebe) */
  const usuarioLimpo = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
  const emailDe = s => { s = String(s || '').trim().toLowerCase(); return s.includes('@') ? s : usuarioLimpo(s) + '@' + DOM; };
  const usuarioDe = em => { em = String(em || '').toLowerCase(); return em.endsWith('@' + DOM) ? em.slice(0, -DOM.length - 1) : em; };
  const DONOS = (CFG.donos || []).map(emailDe);
  firebase.initializeApp(CFG.firebase);
  const auth = firebase.auth();
  /* banco com nome (ex.: "default" sem parênteses) ou o padrão "(default)" */
  const BANCO = CFG.banco || '(default)';
  let fs;
  if (BANCO === '(default)') fs = firebase.firestore();
  else { const app = firebase.app(); const exp = app.container.getProvider('firestore').getImmediate({ identifier: BANCO }); fs = new firebase.firestore.Firestore(app, exp); }
  try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch (e) {}
  if (CFG.emulador) { auth.useEmulator('http://' + CFG.emulador + ':9099', { disableWarnings: true }); fs.useEmulator(CFG.emulador, 8080); }
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}

  /* ---------- Firestore não aceita lista dentro de lista: guarda como {__l:[...]} e devolve igual ---------- */
  function enc(v, dentroLista) {
    if (Array.isArray(v)) { const a = v.map(x => enc(x, true)); return dentroLista ? { __l: a } : a; }
    if (v && typeof v === 'object' && !(v instanceof Date) && !(v instanceof firebase.firestore.Blob)) {
      const o = {}; for (const k in v) { if (v[k] !== undefined) o[k === '' ? '__vazio' : /^__.*__$/.test(k) ? '_' + k : k] = enc(v[k], false); } return o; }
    return v;
  }
  function dec(v) {
    if (Array.isArray(v)) return v.map(dec);
    if (v && typeof v === 'object') {
      if (v instanceof firebase.firestore.Timestamp) return v.toDate().toISOString();
      if (v instanceof firebase.firestore.Blob) return v;
      const ks = Object.keys(v); if (ks.length === 1 && ks[0] === '__l' && Array.isArray(v.__l)) return v.__l.map(dec);
      const o = {}; for (const k of ks) o[k === '__vazio' ? '' : /^___.*__$/.test(k) ? k.slice(1) : k] = dec(v[k]); return o; }
    return v;
  }
  /* Mensagens de erro para quem usa o painel (nunca o texto técnico do Firebase). Antes esta função não existia:
     qualquer erro fora de "senha errada" (sem internet, muitas tentativas, usuário desativado…) quebrava o login. */
  function msgErro(e) { const c = (e && e.code) || '';
    console.warn('[login] erro', c, e && e.message);
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/invalid-login-credentials') return 'Usuário ou senha incorretos.';
    if (c === 'auth/user-not-found') return 'Usuário não encontrado.';
    if (c === 'auth/invalid-email' || c === 'usuario-vazio') return 'Usuário inválido. Use só letras, números, ponto, hífen ou sublinhado.';
    if (c === 'auth/missing-password') return 'Informe a senha.';
    if (c === 'auth/user-disabled') return 'Este usuário está desativado. Fale com o administrador.';
    if (c === 'auth/too-many-requests') return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    if (c === 'auth/network-request-failed' || c === 'unavailable' || c === 'tempo-esgotado') return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    if (c === 'auth/weak-password') return 'A senha precisa ter pelo menos 6 caracteres.';
    if (c === 'auth/email-already-in-use') return 'Esse usuário já existe.';
    if (c === 'auth/requires-recent-login') return 'Por segurança, saia e entre de novo antes de trocar a senha.';
    if (c === 'auth/operation-not-allowed') return 'O login por usuário e senha está desligado no Firebase. Avise o administrador.';
    if (c === 'permission-denied' || c === 'sem-permissao') return 'Sem permissão para esta operação.';
    return 'Não foi possível concluir agora. Tente novamente.' + (c ? ' (' + c + ')' : ''); }
  const erroCod = e => { if (e && !e.code) e.code = 'erro'; if (e && e.code === 'permission-denied') e.code = 'sem-permissao'; return e; };

  /* ---------- objetos no mesmo formato que o painel já usa ---------- */
  function DocSnap(s) { return { id: s.id, exists: s.exists, data: () => (s.exists ? dec(s.data()) : undefined), ref: Doc(s.ref.path),
    /* login/acesso: distinguir "o servidor confirmou" de "só o cache local respondeu" */
    metadata: { fromCache: !!(s.metadata && s.metadata.fromCache), hasPendingWrites: !!(s.metadata && s.metadata.hasPendingWrites) } }; }
  function QSnap(q) { const docs = q.docs.map(DocSnap); return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f) }; }
  function Doc(path) {
    const r = fs.doc(path);
    return {
      id: r.id, path,
      get: () => r.get().then(DocSnap).catch(e => { throw erroCod(e); }),
      set: (d, o) => r.set(enc(d), o && o.merge ? { merge: true } : {}).catch(e => { throw erroCod(e); }),
      /* no painel, update mescla objetos internos (ex.: etapas:{chegada}) sem apagar os outros */
      update: d => r.set(enc(d), { merge: true }).catch(e => { throw erroCod(e); }),
      delete: () => r.delete().catch(e => { throw erroCod(e); }),
      onSnapshot: (ok, err, opts) => (opts ? r.onSnapshot(opts, s => ok(DocSnap(s)), e => err && err(erroCod(e))) : r.onSnapshot(s => ok(DocSnap(s)), e => err && err(erroCod(e)))),
      /* trava curta para numerar sem repetir (ex.: OS de manutenção) */
      acquire: async ({ holder, ttlMs } = {}) => {
        const lk = fs.doc('_travas/' + path.replace(/\//g, '__')); const agora = Date.now();
        try {
          const ok = await fs.runTransaction(async t => { const g = await t.get(lk); const d = g.exists ? g.data() : null;
            if (d && d.ate > agora && d.holder !== holder) return false;
            t.set(lk, { holder: holder || '', ate: agora + (ttlMs || 5000) }); return true; });
          return { acquired: ok };
        } catch (e) { return { acquired: false }; }
      },
      release: () => fs.doc('_travas/' + path.replace(/\//g, '__')).delete().catch(() => {})
    };
  }
  function Query(q, path) {
    return {
      orderBy: (c, d) => Query(q.orderBy(c, d || 'asc'), path),
      where: (c, op, v) => Query(q.where(c, op, v), path),
      limit: n => Query(q.limit(n), path),
      get: () => q.get().then(QSnap).catch(e => { throw erroCod(e); }),
      onSnapshot: (ok, err) => q.onSnapshot(s => ok(QSnap(s)), e => err && err(erroCod(e))),
      add: d => path ? fs.collection(path).add(enc(d)).then(r => Doc(r.path)).catch(e => { throw erroCod(e); }) : Promise.reject(new Error('add')),
      doc: id => Doc(path + '/' + (id || fs.collection(path).doc().id))
    };
  }
  const DB = { collection: p => Query(fs.collection(p), p), doc: p => Doc(p) };

  /* ---------- pessoas ---------- */
  let EU = null; const cacheNomes = {};
  const ehDono = u => !!(u && u.email && DONOS.includes(u.email.toLowerCase()));
  async function perfis(ids) { const out = {};
    await Promise.all([...new Set(ids)].map(async id => {
      if (id in cacheNomes) { out[id] = cacheNomes[id]; return; }
      try { const g = await Promise.race([fs.doc('perfis/' + id).get(), new Promise((_, er) => setTimeout(() => er({ code: 'tempo-esgotado' }), 8000))]); const d = g.exists ? g.data() : null; cacheNomes[id] = d ? { name: d.nome || d.usuario || '', email: d.usuario || d.email || '' } : null; }
      catch (e) { cacheNomes[id] = null; }
      out[id] = cacheNomes[id]; }));
    return out; }
  const USER = {
    id: async () => EU && EU.uid,
    me: async () => { const p = EU && (await perfis([EU.uid]))[EU.uid]; return { id: EU && EU.uid, name: (p && p.name) || (EU && (EU.displayName || usuarioDe(EU.email))) || '' }; },
    isOwner: async () => ehDono(EU),
    profiles: ids => perfis(ids || []),
    search: async q => { q = String(q || '').trim().toLowerCase();
      const s = await fs.collection('perfis').limit(300).get();
      return s.docs.map(d => ({ id: d.id, name: d.data().nome || '', email: d.data().usuario || d.data().email || '', antigo: d.data().antigo, isMe: EU && d.id === EU.uid }))
        .filter(x => !x.antigo && (!q || (x.name + ' ' + x.email).toLowerCase().includes(q))).slice(0, 20); }
  };

  /* ---------- arquivos (PDF dos ranchos): guardados no próprio banco em pedaços ---------- */
  const PEDACO = 700 * 1024;
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const ASSETS = {
    upload: async (blob, opts) => { const id = novoId(); const b = new Uint8Array(await blob.arrayBuffer()); const n = Math.max(1, Math.ceil(b.length / PEDACO));
      for (let i = 0; i < n; i++) await fs.doc('_arquivos_p/' + id + '_' + i).set({ b: firebase.firestore.Blob.fromUint8Array(b.slice(i * PEDACO, (i + 1) * PEDACO)) });
      await fs.doc('_arquivos/' + id).set({ tipo: (opts && opts.type) || blob.type || '', tam: b.length, n, em: new Date().toISOString(), por: EU && EU.uid });
      return { id }; },
    bytes: async id => { const m = await fs.doc('_arquivos/' + id).get(); if (!m.exists) throw new Error('arquivo não encontrado');
      const { n, tam } = m.data(); const out = new Uint8Array(tam); let o = 0;
      for (let i = 0; i < n; i++) { const p = await fs.doc('_arquivos_p/' + id + '_' + i).get(); const u = p.data().b.toUint8Array(); out.set(u, o); o += u.length; }
      return out; },
    gravarComId: async (id, bytes, tipo) => { const n = Math.max(1, Math.ceil(bytes.length / PEDACO));
      for (let i = 0; i < n; i++) await fs.doc('_arquivos_p/' + id + '_' + i).set({ b: firebase.firestore.Blob.fromUint8Array(bytes.slice(i * PEDACO, (i + 1) * PEDACO)) });
      await fs.doc('_arquivos/' + id).set({ tipo: tipo || '', tam: bytes.length, n, em: new Date().toISOString() }); },
    list: async () => ({ assets: [] })
  };

  /* ---------- downloads: baixa direto no navegador ---------- */
  const DOWNLOADS = { save: async ({ filename, data }) => { const b = data instanceof Blob ? data : new Blob([data]);
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = filename || 'arquivo'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); return { ok: true }; } };

  /* ---------- app instalável (PWA) ---------- */
  let pedidoInstalar = null;
  const instalado = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function instalarPossivel() { return !instalado() && (!!pedidoInstalar || ehIOS()); }
  async function instalar() {
    if (pedidoInstalar) { const p = pedidoInstalar; pedidoInstalar = null; p.prompt(); try { await p.userChoice; } catch (e) {} document.querySelectorAll('#lg-inst').forEach(b => b.remove()); return; }
    if (ehIOS()) aviso('No iPhone/iPad: toque em Compartilhar (quadrado com seta) e depois em “Adicionar à Tela de Início”.');
  }
  window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); pedidoInstalar = ev;
    const bx = document.querySelector('#lg .bx'); if (bx && !bx.querySelector('#lg-inst')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'lg-inst'; b.id = 'lg-inst'; b.textContent = '⤓ Instalar o app neste aparelho'; b.onclick = instalar; const go = bx.querySelector('.lg-go'); go && go.after(b); } });
  window.addEventListener('appinstalled', () => { pedidoInstalar = null; document.querySelectorAll('#lg-inst').forEach(b => b.remove()); aviso('App instalado. Ele aparece junto dos outros aplicativos.'); });
  (function () { const h = document.head; const tem = sel => h.querySelector(sel);
    if (!tem('link[rel="manifest"]')) { const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; h.appendChild(l); }
    if (!tem('link[rel="apple-touch-icon"]')) { const l = document.createElement('link'); l.rel = 'apple-touch-icon'; l.href = 'icons/apple-touch-icon.png'; h.appendChild(l); }
    [['theme-color', '#143F54'], ['apple-mobile-web-app-capable', 'yes'], ['mobile-web-app-capable', 'yes'], ['apple-mobile-web-app-title', 'Painel Colafix'], ['apple-mobile-web-app-status-bar-style', 'default']].forEach(([n, c]) => { if (!tem(`meta[name="${n}"]`)) { const m = document.createElement('meta'); m.name = n; m.content = c; h.appendChild(m); } });
    if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(r => {
      r.addEventListener('updatefound', () => { const w = r.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) aviso('Tem versão nova do painel.', [['Atualizar agora', () => location.reload()]]); }); }); }).catch(e => console.warn('sw', e)); });
  })();

  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ---------- entradas por área (?area=manutencao | telas | almox | producao) ---------- */
  const SVG = {
    manutencao: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.5 1.5 0 0 0 0 2.1l.9.9a1.5 1.5 0 0 0 2.1 0l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.3-.6-.6-2.3z"/>',
    telas: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    almox: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    producao: '<path d="M3 21V10l6 4V10l6 4V6l6 4v11z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
    check: '<path d="M5 12l5 5 9-10"/>' };
  const AREAS = {
    manutencao: { ey: 'MANUTENÇÃO', t: 'Central de Manutenção', s: 'Chamados das linhas chegando ao vivo, com aviso sonoro, e a OS pronta para imprimir.', it: ['Chamado aberto pelo QR da linha toca aqui na hora', 'Assumir e concluir com um toque', 'Tempo de resposta e de reparo de cada máquina'], c1: '#0F2A38', c2: '#1B5C7A' },
    telas: { ey: 'TELAS DA FÁBRICA', t: 'Telas de TV', s: 'Acesso só para olhar: TV das linhas, apresentação e calendário da semana.', it: ['Atualiza sozinho, sem tocar em nada', 'Ideal para a TV, a portaria e a sala de reunião', 'Não muda nenhum dado do painel'], c1: '#1D2B36', c2: '#33566B' },
    almox: { ey: 'ALMOXARIFADO', t: 'Almoxarifado', s: 'Diário de bordo dos ranchos, fichas de premix e contagem do estoque.', it: ['Próximo rancho a separar e entregar', 'Ficha do premix na hora', 'Contagem do dia no celular'], c1: '#2B2A1E', c2: '#6B5A2A' },
    producao: { ey: 'PRODUÇÃO', t: 'Produção', s: 'Parar e voltar a linha em dois toques e chamar a manutenção.', it: ['Parada registrada com o horário certo', 'Chamado da manutenção pelo QR', 'Programação do dia da linha'], c1: '#123D33', c2: '#2F6F5E' } };
  const AREA = AREAS[(new URLSearchParams(location.search).get('area') || '').toLowerCase()] ? (new URLSearchParams(location.search).get('area') || '').toLowerCase() : '';
  const svg = (k, n, w) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[k]}</svg>`;
  function ladoArea(k) { const A = AREAS[k]; if (!A) return ''; const agora = new Date();
    return `<aside class="lg-lado" style="--c1:${A.c1};--c2:${A.c2}"><div class="lg-ey">${A.ey} · COLAFIX</div><div class="lg-ic">${svg(k, 40, 1.7)}</div><h2>${A.t}</h2><p>${A.s}</p><ul>${A.it.map(x => `<li>${svg('check', 16, 2.6)}${x}</li>`).join('')}</ul>
      <div class="lg-rel"><b data-lg-hora>${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}</b><span>${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span></div></aside>`; }
  setInterval(() => { const d = new Date(); document.querySelectorAll('[data-lg-hora]').forEach(e => { e.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }); }, 15000);
  const cssArea = `#lg .lg-wrap{display:flex;width:100%;max-width:420px;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(15,42,56,.25),0 2px 6px rgba(20,63,84,.06)}
  #lg .lg-wrap.tem{max-width:900px}#lg .lg-wrap .bx{box-shadow:none;border-radius:0;flex:1 1 420px;max-width:none}
  #lg .lg-lado{flex:1 1 440px;color:#fff;padding:38px 38px 30px;display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden;background:linear-gradient(150deg,var(--c1) 0%,var(--c2) 100%)}
  #lg .lg-lado::before{content:'';position:absolute;right:-80px;top:-80px;width:280px;height:280px;border-radius:999px;border:46px solid rgba(255,255,255,.06)}
  #lg .lg-lado::after{content:'';position:absolute;left:-60px;bottom:-110px;width:260px;height:260px;border-radius:999px;background:rgba(255,255,255,.05)}
  #lg .lg-ey{font-size:11px;font-weight:800;letter-spacing:.2em;opacity:.8}#lg .lg-ic{width:76px;height:76px;border-radius:22px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;margin-top:6px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
  #lg .lg-lado h2{margin:6px 0 0;font-size:30px;line-height:1.15;letter-spacing:-.01em}#lg .lg-lado p{margin:0;font-size:15px;line-height:1.5;opacity:.88;max-width:34ch}
  #lg .lg-lado ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:10px;font-size:14px}#lg .lg-lado li{display:flex;gap:10px;align-items:flex-start}#lg .lg-lado li svg{flex-shrink:0;margin-top:2px;padding:3px;border-radius:999px;background:rgba(255,255,255,.16);width:22px;height:22px;box-sizing:border-box}
  #lg .lg-rel{margin-top:auto;padding-top:22px;display:flex;flex-direction:column;position:relative;z-index:1}#lg .lg-rel b{font-size:44px;line-height:1;font-weight:700;font-variant-numeric:tabular-nums}#lg .lg-rel span{font-size:13px;opacity:.8;text-transform:capitalize}
  @media (max-width:760px){ #lg .lg-wrap.tem{flex-direction:column;max-width:440px} #lg .lg-lado{padding:26px 24px 22px;flex:0 0 auto} #lg .lg-lado ul,#lg .lg-rel{display:none} #lg .lg-lado h2{font-size:24px} #lg .lg-ic{width:56px;height:56px;border-radius:16px;position:absolute;right:22px;top:22px;margin:0} }
  @media (max-width:480px){ #lg .lg-wrap{border-radius:0;max-width:none;min-height:100%;box-shadow:none} #lg .lg-wrap .bx{min-height:0;justify-content:flex-start} }`;

  /* ---------- tela de entrada ---------- */
  let pronto, prontoOk; pronto = new Promise(r => prontoOk = r);
  const css = `#lg{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;font:15px/1.45 "Segoe UI",system-ui,-apple-system,sans-serif;color:#1A1A1A;overflow:auto;
    background:radial-gradient(1200px 600px at 10% -10%,#DCE9EF 0,transparent 60%),radial-gradient(900px 500px at 110% 110%,#EFE6D2 0,transparent 55%),#F5F1E8}
  #lg .bx{background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(20,63,84,.16),0 2px 6px rgba(20,63,84,.06);padding:34px 34px 26px;width:100%;max-width:420px;display:flex;flex-direction:column}
  #lg .lg-logo{display:block;height:44px;width:auto;margin:0 auto 18px}
  #lg h1{font-size:22px;font-weight:800;margin:0;text-align:center;color:#143F54;letter-spacing:-.01em}#lg .lg-sub{margin:4px 0 24px;text-align:center;color:#6B6558;font-size:13.5px}
  #lg label{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;color:#4A463D;margin:0 0 6px}
  #lg .lg-in{position:relative;margin:0 0 16px}
  #lg input{height:50px;border:1.5px solid #E0D9C9;border-radius:12px;padding:0 14px;font:inherit;font-size:16px;width:100%;box-sizing:border-box;background:#FBFAF6;transition:border-color .15s,box-shadow .15s}
  #lg input:focus{outline:none;border-color:#1B5C7A;background:#fff;box-shadow:0 0 0 4px rgba(27,92,122,.14)}#lg input:-webkit-autofill{-webkit-box-shadow:0 0 0 40px #EEF4F6 inset}
  #lg .lg-olho{position:absolute;right:6px;top:6px;height:38px;padding:0 10px;border:0;border-radius:9px;background:transparent;color:#6B6558;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}#lg .lg-olho:hover{background:#F2EEE4}
  #lg .lg-go{height:54px;border:0;border-radius:12px;background:#1B5C7A;color:#fff;font:inherit;font-size:16.5px;font-weight:700;cursor:pointer;margin-top:4px;box-shadow:0 6px 18px rgba(27,92,122,.28);transition:background .15s,transform .1s}#lg .lg-go:hover{background:#143F54}#lg .lg-go:active{transform:scale(.985)}#lg .lg-go:disabled{opacity:.65;cursor:wait}
  #lg .lk{border:0;background:none;color:#6B6558;padding:2px 0;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}#lg .lk:hover{color:#1B5C7A;text-decoration:underline}
  #lg .er{color:#A2453D;background:#F8E6E3;border-radius:10px;padding:9px 12px;font-size:13.5px;font-weight:600;margin:-4px 0 12px}#lg .er:empty{display:none}
  #lg .rw{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:16px}
  #lg .lg-inst{margin-top:14px;height:44px;border:1.5px solid #E0D9C9;border-radius:12px;background:#fff;color:#143F54;font:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}#lg .lg-inst:hover{border-color:#1B5C7A;background:#EEF4F6}
  #lg .lg-pe{margin-top:18px;text-align:center;font-size:11.5px;color:#9A948A}
  @media (max-width:480px){ #lg{padding:0;align-items:stretch} #lg .bx{border-radius:0;max-width:none;min-height:100%;justify-content:center;padding:28px 22px;box-shadow:none} }
  @media (prefers-color-scheme:dark){ #lg{background:#15191B;color:#EEF1F2} #lg .bx{background:#1E2427;box-shadow:0 24px 70px rgba(0,0,0,.4)} #lg h1{color:#8CC2DA} #lg label{color:#CBD3D6} #lg input{background:#232A2E;border-color:#333C41;color:#EEF1F2} #lg input:focus{background:#1E2427} #lg .lg-logo{background:#fff;border-radius:8px;padding:4px 8px} #lg .lg-inst{background:#1E2427;color:#8CC2DA;border-color:#333C41} }`;
  function telaEntrar(modo) {
    let el = document.getElementById('lg'); if (!el) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); el = document.createElement('div'); el.id = 'lg'; document.body.appendChild(el); }
    const pri = modo === 'primeiro';
    const logo = (document.querySelector('.brand img') || {}).src || '';
    if (!document.getElementById('lg-css2')) { const st2 = document.createElement('style'); st2.id = 'lg-css2'; st2.textContent = cssArea; document.head.appendChild(st2); }
    el.innerHTML = `<div class="lg-wrap ${AREA && !pri ? 'tem' : ''}">${AREA && !pri ? ladoArea(AREA) : ''}<form class="bx" autocomplete="on">${logo ? `<img class="lg-logo" src="${logo}" alt="Colafix">` : ''}<h1>${AREA && !pri ? 'Entrar' : 'Painel de Operação'}</h1><div class="lg-sub">${pri ? 'Primeiro acesso da responsável pelo PCP' : RANCHO_QR ? 'Entre para abrir o rancho <b>' + esc(RANCHO_QR) + '</b> no diário de bordo' : QR_LINHA ? 'Entre para abrir o chamado da <b>' + esc(QR_LINHA) + '</b>' : 'Entre com o usuário e a senha que o PCP passou para você'}</div>
      ${pri ? '<label for="lg-n">SEU NOME</label><div class="lg-in"><input id="lg-n" autocomplete="name" required></div>' : ''}
      <label for="lg-e">USUÁRIO</label><div class="lg-in"><input id="lg-e" autocomplete="username" autocapitalize="none" spellcheck="false" required placeholder="ex.: joao.silva"></div>
      <label for="lg-s">SENHA</label><div class="lg-in"><input id="lg-s" type="password" autocomplete="${pri ? 'new-password' : 'current-password'}" required minlength="6" style="padding-right:76px"><button type="button" class="lg-olho" id="lg-o" aria-label="Mostrar senha">Mostrar</button></div>
      <div class="er" id="lg-er" role="alert"></div><button type="submit" class="lg-go">${pri ? 'Criar e entrar' : 'Entrar'}</button>
      ${instalarPossivel() ? '<button type="button" class="lg-inst" id="lg-inst">⤓ Instalar o app neste aparelho</button>' : ''}
      <div class="rw"><span class="lk" style="cursor:default;text-decoration:none">${pri ? '' : 'Esqueceu a senha? Fale com o PCP.'}</span><button type="button" class="lk" id="lg-t">${pri ? 'Voltar' : 'Primeiro acesso'}</button></div>
      <div class="lg-pe">Colafix · Produção · PCP · Almoxarifado · Manutenção</div></form></div>`;
    const f = el.querySelector('form'), er = el.querySelector('#lg-er');
    el.querySelector('#lg-t').onclick = () => telaEntrar(pri ? 'entrar' : 'primeiro');
    el.querySelector('#lg-o').onclick = () => { const i = el.querySelector('#lg-s'), o = el.querySelector('#lg-o'); const v = i.type === 'password'; i.type = v ? 'text' : 'password'; o.textContent = v ? 'Ocultar' : 'Mostrar'; i.focus(); };
    const bi = el.querySelector('#lg-inst'); if (bi) bi.onclick = instalar;
    f.onsubmit = async ev => { ev.preventDefault(); const b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Entrando…'; er.textContent = '';
      const us = el.querySelector('#lg-e').value, em = emailDe(us), se = el.querySelector('#lg-s').value;
      const volta = () => { b.disabled = false; b.textContent = pri ? 'Criar e entrar' : 'Entrar'; };
      if (!usuarioLimpo(us) && !String(us).includes('@')) { er.textContent = 'Informe o usuário.'; volta(); return; }
      if (!se) { er.textContent = 'Informe a senha.'; volta(); return; }
      try {
        if (pri) { if (!DONOS.includes(em)) { er.textContent = 'O primeiro acesso é só da responsável pelo PCP. As outras contas o PCP cria em Equipe e cargos.'; volta(); return; }
          const nome = el.querySelector('#lg-n').value.trim(); const c = await auth.createUserWithEmailAndPassword(em, se);
          await c.user.updateProfile({ displayName: nome }); await fs.doc('perfis/' + c.user.uid).set({ nome, usuario: usuarioDe(em), criadoEm: new Date().toISOString() }); }
        else await auth.signInWithEmailAndPassword(em, se);
        b.textContent = 'Carregando seu acesso…'; /* autenticou: o painel abre e confere o perfil (não é erro de senha) */
      } catch (e) { try { er.textContent = e && e.code === 'auth/email-already-in-use' ? 'Esse usuário já existe. Volte e entre com ele.' : msgErro(e); }
        catch (x) { er.textContent = 'Não foi possível entrar agora. Tente novamente.'; } volta(); } };
    setTimeout(() => { const i = el.querySelector('input'); i && i.focus(); }, 50);
    if (!logo) document.addEventListener('DOMContentLoaded', () => { const src = (document.querySelector('.brand img') || {}).src, bx = el.querySelector('.bx'); if (src && bx && !bx.querySelector('.lg-logo')) { const im = document.createElement('img'); im.className = 'lg-logo'; im.src = src; im.alt = 'Colafix'; bx.prepend(im); } }, { once: true });
  }
  /* ---------- chamado pelo QR da linha, sem login (entra como anônimo e só consegue criar o chamado) ---------- */
  const QR_LINHA = (() => { const m = (location.search + '&' + location.hash).match(/[?&#]chamado=([^&#]+)/); if (!m) return ''; try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; } })();
  let MODO_QR = false;
  const RANCHO_QR = ((location.search + '&' + location.hash).match(/[?&#]rancho=(\d{4,})/) || [])[1] || '';
  const cssQr = `#lg .qr-bx{max-width:480px}#lg .qr-top{display:flex;align-items:center;gap:14px;margin:0 0 18px}#lg .qr-ic{width:56px;height:56px;border-radius:16px;background:linear-gradient(150deg,#0F2A38,#1B5C7A);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  #lg .qr-top small{display:block;font-size:11px;font-weight:800;letter-spacing:.16em;color:#1B5C7A}#lg .qr-top b{display:block;font-size:26px;line-height:1.1;color:#143F54}
  #lg textarea{border:1.5px solid #E0D9C9;border-radius:12px;padding:12px 14px;font:inherit;font-size:17px;width:100%;box-sizing:border-box;background:#FBFAF6;min-height:96px;resize:vertical;margin:0 0 16px}#lg textarea:focus{outline:none;border-color:#1B5C7A;background:#fff;box-shadow:0 0 0 4px rgba(27,92,122,.14)}
  #lg .qr-imp{display:grid;gap:8px;margin:0 0 16px}#lg .qr-imp button{display:flex;align-items:center;gap:12px;min-height:56px;padding:0 16px;border:1.5px solid #E0D9C9;border-radius:12px;background:#fff;font:inherit;font-size:16px;font-weight:700;color:#1A1A1A;cursor:pointer;text-align:left}
  #lg .qr-imp i{width:14px;height:14px;border-radius:999px;flex-shrink:0}#lg .qr-imp [data-v=parou] i{background:#C0665D}#lg .qr-imp [data-v=reduziu] i{background:#D2A857}#lg .qr-imp [data-v=nao] i{background:#6A9C7E}
  #lg .qr-imp button[aria-pressed=true]{border-width:2.5px;border-color:#143F54;background:#EEF4F6}#lg .qr-imp [data-v=parou][aria-pressed=true]{border-color:#A2453D;background:#F8E6E3}
  #lg .qr-eqs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}#lg .qr-eqs:empty{display:none}#lg .qr-eqs button{height:40px;padding:0 14px;border-radius:999px;border:1.5px solid #E0D9C9;background:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}#lg .qr-eqs button[aria-pressed=true]{background:#143F54;border-color:#143F54;color:#fff}
  #lg .qr-ok{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}#lg .qr-ok .qr-big{width:84px;height:84px;border-radius:999px;background:#E2EEE6;color:#3F7D5C;display:flex;align-items:center;justify-content:center;animation:qrpop .4s ease-out}
  @keyframes qrpop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}#lg .qr-ok h1{font-size:24px}#lg .qr-ok p{margin:0;color:#4A463D;font-size:15px;max-width:34ch}`;
  async function comprimir(file) { const url = await new Promise((ok, er) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = er; r.readAsDataURL(file); });
    const img = await new Promise((ok, er) => { const i = new Image(); i.onload = () => ok(i); i.onerror = er; i.src = url; });
    let w = img.width, h = img.height; const mx = 1280; if (Math.max(w, h) > mx) { const k = mx / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); let q = .72, d = cv.toDataURL('image/jpeg', q); while (d.length > 700000 && q > .3) { q -= .12; d = cv.toDataURL('image/jpeg', q); } return d; }
  /* entra como anônimo se o Firebase permitir; se não, segue sem conta (as regras aceitam o chamado do QR assim mesmo) */
  let anonTentado = false;
  async function entrarAnonimo() { if (auth.currentUser || anonTentado) return; anonTentado = true; try { await auth.signInAnonymously(); } catch (e) { console.info('QR sem conta (' + (e && e.code) + ')'); } }
  function telaChamado(fase, info) { MODO_QR = true;
    let el = document.getElementById('lg'); if (!el) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); el = document.createElement('div'); el.id = 'lg'; document.body.appendChild(el); }
    if (!document.getElementById('lg-css3')) { const st3 = document.createElement('style'); st3.id = 'lg-css3'; st3.textContent = cssQr; document.head.appendChild(st3); }
    const nome = (() => { try { return localStorage.getItem('painel.qrnome') || ''; } catch (e) { return ''; } })();
    if (fase === 'ok') { el.innerHTML = `<div class="bx qr-bx qr-ok"><div class="qr-big">${svg('check', 44, 2.6)}</div><h1>Chamado enviado</h1><p>A manutenção já foi avisada no painel dela${info && info.parou ? ' e a parada da ' + esc(QR_LINHA) + ' fica registrada' : ''}. Acompanhe pela TV ou fale com o PCP.</p>
        <button type="button" class="lg-go" id="qr-mais" style="width:100%;margin-top:12px">Abrir outro chamado</button><div class="lg-pe">Colafix · Manutenção</div></div>`;
      el.querySelector('#qr-mais').onclick = () => telaChamado(); return; }
    el.innerHTML = `<form class="bx qr-bx" autocomplete="off"><div class="qr-top"><span class="qr-ic">${svg('manutencao', 30, 2)}</span><div><small>CHAMAR MANUTENÇÃO</small><b>${esc(QR_LINHA)}</b></div></div>
      <label for="qr-d">O QUE ESTÁ ACONTECENDO?</label><textarea id="qr-d" required maxlength="900" placeholder="Ex.: correia do elevador rompeu"></textarea>
      <label>A LINHA…</label><div class="qr-imp">${[['parou', 'Parou'], ['reduziu', 'Está produzindo menos'], ['nao', 'Continua normal']].map(([k, t]) => `<button type="button" data-v="${k}" aria-pressed="false"><i></i>${t}</button>`).join('')}</div>
      <label for="qr-e">EQUIPAMENTO (SE SOUBER)</label><div class="qr-eqs" id="qr-eqs"></div><div class="lg-in"><input id="qr-e" maxlength="80" placeholder="Ex.: misturador, ensacadeira"></div>
      <div class="qr-foto" id="qr-foto"><label class="lg-inst" style="margin:0 0 16px;cursor:pointer">📷 Tirar foto do defeito (opcional)<input type="file" accept="image/*" capture="environment" id="qr-fi" hidden></label></div>
      <label for="qr-n">SEU NOME</label><div class="lg-in"><input id="qr-n" required maxlength="60" autocomplete="name" value="${esc(nome)}"></div>
      <div class="er" id="qr-er" role="alert"></div><button type="submit" class="lg-go">Enviar chamado</button>
      <div class="rw"><span class="lk" style="cursor:default;text-decoration:none">Não precisa de usuário nem senha.</span><button type="button" class="lk" id="qr-login">Entrar com usuário</button></div><div class="lg-pe">Colafix · Manutenção</div></form>`;
    const f = el.querySelector('form'), er = el.querySelector('#qr-er'); let imp = '', eqId = '', foto = '';
    /* equipamentos da linha (lista da manutenção) e foto */
    (async () => { try { await entrarAnonimo(); const g = await fs.doc('config/manut').get(); const es = ((g.exists && g.data().equips) || []).filter(e => e.ativo !== false && e.linha === QR_LINHA);
      const box = el.querySelector('#qr-eqs'); if (!box || !es.length) return;
      box.innerHTML = es.map(e => `<button type="button" data-id="${esc(e.id)}" data-n="${esc(e.nome)}">${esc(e.nome)}</button>`).join('');
      box.querySelectorAll('button').forEach(b => b.onclick = () => { const on = eqId !== b.dataset.id; eqId = on ? b.dataset.id : ''; el.querySelector('#qr-e').value = on ? b.dataset.n : ''; box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b && on)); });
    } catch (e) { console.warn('equipamentos', e); } })();
    el.querySelector('#qr-e').oninput = () => { eqId = ''; el.querySelectorAll('#qr-eqs button').forEach(x => x.setAttribute('aria-pressed', 'false')); };
    const ligaFoto = () => { const bx = el.querySelector('#qr-foto'); if (!bx) return;
      bx.innerHTML = foto ? `<div style="display:flex;align-items:center;gap:12px;margin:0 0 16px"><img src="${foto}" alt="Foto" style="height:90px;border-radius:10px"><button type="button" class="lk" id="qr-fx">Tirar a foto</button></div>`
        : '<label class="lg-inst" style="margin:0 0 16px;cursor:pointer">📷 Tirar foto do defeito (opcional)<input type="file" accept="image/*" capture="environment" id="qr-fi" hidden></label>';
      const x = bx.querySelector('#qr-fx'); if (x) x.onclick = () => { foto = ''; ligaFoto(); };
      const fi = bx.querySelector('#qr-fi'); if (fi) fi.onchange = async ev => { const fl = ev.target.files && ev.target.files[0]; if (!fl) return; try { foto = await comprimir(fl); } catch (e) { er.textContent = 'Não consegui ler a foto.'; } ligaFoto(); }; };
    ligaFoto();
    f.querySelectorAll('.qr-imp button').forEach(b => b.onclick = () => { imp = b.dataset.v; f.querySelectorAll('.qr-imp button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    el.querySelector('#qr-login').onclick = () => { MODO_QR = false; telaEntrar('entrar'); };
    setTimeout(() => { const t = el.querySelector('#qr-d'); t && t.focus(); }, 60);
    f.onsubmit = async ev => { ev.preventDefault(); const b = f.querySelector('.lg-go'); er.textContent = '';
      const d = f.querySelector('#qr-d').value.trim(), n = f.querySelector('#qr-n').value.trim().replace(/\s+/g, ' '), eq = f.querySelector('#qr-e').value.trim();
      if (!d) { er.textContent = 'Escreva o que está acontecendo.'; return; } if (!imp) { er.textContent = 'Toque em como está a linha.'; return; } if (n.length < 2) { er.textContent = 'Escreva o seu nome.'; return; }
      b.disabled = true; b.textContent = 'Enviando…'; try { localStorage.setItem('painel.qrnome', n); } catch (e) {}
      try { await entrarAnonimo();
        const id = 'q-' + novoId(), agora = new Date(), loc = new Date(agora.getTime() - agora.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
        let fid = null; if (foto) { fid = 'f-' + novoId(); try { await fs.doc('chamfotos/' + fid).set({ d: foto, em: agora.toISOString(), origem: 'qr' }); } catch (e) { console.warn('foto', e); fid = null; } }
        const doc = { linha: QR_LINHA.slice(0, 59), quando: loc, defeito: d.slice(0, 900), impacto: imp, nome: n.slice(0, 60), equip: eq ? eq.slice(0, 80) : null, status: 'Aberta', criado: agora.toISOString(), por: null, numero: 999999, qr: true, qid: id, origem: 'qr' };
        if (fid) doc.foto = fid; if (eqId) doc.equipId = eqId;
        await fs.doc('chamados/' + id).set(doc);
        telaChamado('ok', { parou: imp === 'parou' });
      } catch (e) { console.warn('qr', e); b.disabled = false; b.textContent = 'Enviar chamado';
        er.textContent = e && (e.code === 'permission-denied' || e.code === 'sem-permissao') ? 'O banco recusou o chamado: as regras do Firebase estão desatualizadas. Avise o PCP (Firestore → Regras → colar e Publicar).' : e && (e.code === 'auth/network-request-failed' || e.code === 'unavailable') ? 'Sem internet. Tente de novo.' : 'Não deu certo (' + ((e && e.code) || 'erro') + '). Tente de novo ou avise o PCP.'; } };
  }

  let jaLogou = false; try { jaLogou = localStorage.getItem('painel.logado') === '1'; } catch (e) {}
  /* 'painel.logado' só evita piscar a tela de entrada; quem decide se a pessoa está logada é sempre o Firebase Auth. */
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  /* Apaga a cópia local do banco (cache do Firestore neste aparelho), para a próxima pessoa não ver dados de quem saiu. */
  async function limparCacheLocal() { try { await fs.terminate(); } catch (e) {} try { await fs.clearPersistence(); } catch (e) { console.info('[login] cache local não foi limpo agora (' + ((e && e.code) || 'erro') + '); outra aba ainda usa o painel.'); } }
  let saindo = false;
  /* Sair: espera as gravações pendentes subirem, encerra a sessão, limpa o cache local e volta para a entrada. */
  async function sair() { if (saindo) return; saindo = true;
    try { const pend = await Promise.race([fs.waitForPendingWrites().then(() => false), new Promise(r => setTimeout(() => r(true), 5000))]);
      if (pend && !confirm('Há registros deste aparelho que ainda não chegaram ao servidor (sem internet?). Se sair agora, eles podem se perder.\n\nSair mesmo assim?')) { saindo = false; return; } } catch (e) {}
    try { await auth.signOut(); } catch (e) { console.warn('[login] signOut', e && e.code); }
    LS.del('painel.logado'); LS.del('painel.uid');
    await limparCacheLocal();
    location.reload(); }
  const primeiraTela = () => (QR_LINHA && !jaLogou ? telaChamado() : telaEntrar('entrar'));
  if (!jaLogou) { if (document.body) primeiraTela(); else document.addEventListener('DOMContentLoaded', () => { if (!EU) primeiraTela(); }); }
  auth.onAuthStateChanged(async u => {
    if (saindo) return; /* sair() cuida do resto (limpar cache e recarregar) */
    if (u && u.isAnonymous) { if (!MODO_QR) auth.signOut(); return; } /* anônimo só serve para o chamado do QR */
    if (!u) { jaLogou = false; LS.del('painel.logado'); if (EU) { saindo = true; LS.del('painel.uid'); await limparCacheLocal(); location.reload(); return; } if (!document.getElementById('lg')) primeiraTela(); return; }
    /* troca de pessoa no mesmo aparelho: o cache local é da pessoa anterior → limpa antes de abrir o painel */
    const uidAnt = LS.get('painel.uid');
    if ((EU && EU.uid !== u.uid) || (uidAnt && uidAnt !== u.uid)) { saindo = true; LS.set('painel.uid', u.uid); LS.set('painel.logado', '1'); await limparCacheLocal(); location.reload(); return; }
    LS.set('painel.uid', u.uid); LS.set('painel.logado', '1');
    EU = u; const el = document.getElementById('lg'); if (el) el.remove(); setTimeout(() => { const q = document.querySelector('.quem'); if (q) { q.title = 'Usuário ' + usuarioDe(u.email) + ' · trocar senha ou sair'; q.style.cursor = 'pointer'; } }, 500);
    prontoOk(); /* o painel abre na hora; o perfil é conferido em segundo plano */
    diagnostico(u);
    const ate = ms => new Promise((_, er) => setTimeout(() => er({ code: 'tempo-esgotado' }), ms));
    (async () => { try { const g = await Promise.race([fs.doc('perfis/' + u.uid).get(), ate(20000)]);
      if (!g.exists) await fs.doc('perfis/' + u.uid).set({ nome: u.displayName || usuarioDe(u.email), usuario: usuarioDe(u.email), criadoEm: new Date().toISOString() }); }
    catch (e) { const c = (e && e.code) || 'erro'; console.warn('firestore', c, e && e.message);
      aviso(c === 'permission-denied' || c === 'sem-permissao' ? 'O banco recusou o acesso: as regras do Firestore não estão publicadas. No Firebase: Firestore Database → Regras → cole o firestore.rules → Publicar.'
        : 'O banco de dados está demorando para responder (' + c + '). Confira a internet e, no Firebase, se o Firestore Database foi criado.', [['Tentar de novo', () => location.reload()]]); } })();
  });
  /* confere, no servidor, se o banco responde para este usuário (aparece na tela se o painel ficar preso em "Verificando") */
  window.PAINEL_DIAG = { passos: [] };
  async function diagnostico(u) { const D = window.PAINEL_DIAG; D.usuario = usuarioDe(u.email); D.uid = u.uid;
    const t = (nome, pr) => Promise.race([pr, new Promise((_, er) => setTimeout(() => er({ code: 'sem-resposta' }), 10000))])
      .then(r => { const x = { nome, ok: true, info: r && r.exists !== undefined ? (r.exists ? 'existe' : 'não existe') : (r && r.size !== undefined ? r.size + ' registros' : '') }; D.passos.push(x); return x; })
      .catch(e => { const x = { nome, ok: false, info: (e && e.code) || 'erro' }; D.passos.push(x); return x; });
    await t('acesso (acessos/' + u.uid.slice(0, 6) + '…)', fs.doc('acessos/' + u.uid).get({ source: 'server' }));
    await t('nome (perfis)', fs.doc('perfis/' + u.uid).get({ source: 'server' }));
    await t('ordens', fs.collection('ordens').limit(1).get({ source: 'server' }));
    console.info('[painel] diagnóstico', JSON.stringify(D)); }
  setInterval(() => { const g = document.querySelector('.acs-gate'); if (!g || !EU || g.querySelector('.pf-diag')) return; const h = (g.querySelector('h1') || {}).textContent || ''; if (!/Verificando|Não consegui/.test(h)) return;
    if (!g.dataset.t0) { g.dataset.t0 = Date.now(); return; } if (Date.now() - g.dataset.t0 < 8000) return;
    const D = window.PAINEL_DIAG; const d = document.createElement('div'); d.className = 'pf-diag'; d.style.cssText = 'margin-top:16px;text-align:left;font-size:13px;background:#F7F4EC;border-radius:10px;padding:12px 14px;max-width:520px;width:100%';
    const neg = D.passos.find(x => !x.ok);
    d.innerHTML = '<b>Demorou mais que o normal. O que o banco respondeu para @' + esc(D.usuario || '') + ':</b><br>' + (D.passos.length ? D.passos.map(x => (x.ok ? '✅ ' : '❌ ') + esc(x.nome) + ' — ' + esc(x.info)).join('<br>') : 'ainda sem resposta…')
      + (neg && /permission|sem-permissao/.test(neg.info) ? '<br><br><b>As regras do Firestore estão desatualizadas.</b> Peça para o PCP publicar o firestore.rules (Firestore Database → Regras → Publicar).' : neg && neg.info === 'sem-resposta' ? '<br><br>O banco não respondeu. Confira a internet e tente de novo.' : D.passos.length && D.passos[0].info === 'não existe' ? '<br><br>Este usuário ainda não tem cargo. Peça para o PCP escolher o cargo em Equipe e cargos.' : '')
      + '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" onclick="location.reload()" style="height:40px;padding:0 14px;border-radius:8px;border:0;background:#1B5C7A;color:#fff;font-weight:700;cursor:pointer">Tentar de novo</button><button type="button" data-act="sair-conta" style="height:40px;padding:0 14px;border-radius:8px;border:1px solid #CFCAC0;background:#fff;font-weight:700;cursor:pointer">Entrar com outro usuário</button></div>';
    g.appendChild(d); }, 2000);
  function aviso(txt, bts) { let b = document.getElementById('lg-aviso');
    if (!b) { b = document.createElement('div'); b.id = 'lg-aviso'; b.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2100;max-width:min(640px,calc(100% - 24px));background:#FFF7E6;border:1px solid #E8CB8A;color:#5C4210;border-radius:12px;padding:12px 14px;font:14px/1.4 "Segoe UI",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.12);display:flex;gap:10px;align-items:center;flex-wrap:wrap'; document.body.appendChild(b); }
    b.innerHTML = ''; const s = document.createElement('span'); s.style.flex = '1 1 260px'; s.textContent = txt; b.appendChild(s);
    (bts || []).forEach(([l, f]) => { const x = document.createElement('button'); x.textContent = l; x.style.cssText = 'height:34px;padding:0 12px;border-radius:8px;border:1px solid #C9A152;background:#fff;color:#5C4210;font:inherit;font-weight:700;cursor:pointer'; x.onclick = f; b.appendChild(x); });
    const fx = document.createElement('button'); fx.textContent = '✕'; fx.title = 'Fechar'; fx.style.cssText = 'border:0;background:none;color:#8A6326;font-size:16px;cursor:pointer'; fx.onclick = () => b.remove(); b.appendChild(fx); }

  /* ---------- janelinha (modal) simples ---------- */
  const mcss = `#pf-m{position:fixed;inset:0;z-index:2050;background:rgba(10,25,35,.45);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.45 "Segoe UI",system-ui,sans-serif}
  #pf-m .bx{background:#F6F4EF;border:1px solid #E3DED4;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:24px 26px;width:100%;max-width:420px}
  #pf-m h2{margin:0 0 4px;font-size:18px;color:#143F54}#pf-m p{margin:0 0 16px;color:#6B6558;font-size:13px}
  #pf-m label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;color:#4A463D;margin:0 0 6px}
  #pf-m input{height:40px;border:1px solid #CFCAC0;border-radius:6px;padding:0 12px;font:inherit;font-size:14px;width:100%;box-sizing:border-box;background:#fff;margin:0 0 14px}
  #pf-m .rw{display:flex;gap:8px;justify-content:flex-end;margin-top:6px}#pf-m button{height:42px;padding:0 16px;border-radius:6px;font:inherit;font-weight:700;cursor:pointer;border:1px solid #CFCAC0;background:#fff;color:#143F54}
  #pf-m button.p{background:#1B5C7A;border-color:#1B5C7A;color:#fff}#pf-m button:disabled{opacity:.6}#pf-m .er{color:#A2453D;font-size:13px;margin:-4px 0 8px}#pf-m .er:empty{display:none}#pf-m .ok{color:#3F7D5C}
  #pf-menu{position:fixed;z-index:2040;background:#fff;border:1px solid #E3DED4;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.15);padding:6px;min-width:200px;font:14px "Segoe UI",system-ui,sans-serif}
  #pf-menu div{padding:4px 10px 8px;color:#6B6558;font-size:12px;border-bottom:1px solid #F0EBE1;margin-bottom:4px}#pf-menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:9px 10px;border-radius:6px;font:inherit;cursor:pointer;color:#1A1A1A}#pf-menu button:hover{background:#F2F5F7}
  .pf-novo{height:42px;padding:0 16px;border-radius:10px;border:0;background:#1B5C7A;color:#fff;font:inherit;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px}`;
  let mcssOk = false;
  function modal(html, montar) { if (!mcssOk) { const st = document.createElement('style'); st.textContent = mcss; document.head.appendChild(st); mcssOk = true; }
    fecharModal(); const m = document.createElement('div'); m.id = 'pf-m'; m.innerHTML = `<form class="bx">${html}</form>`; document.body.appendChild(m);
    m.addEventListener('mousedown', ev => { if (ev.target === m) fecharModal(); }); montar(m.querySelector('form')); setTimeout(() => { const i = m.querySelector('input'); i && i.focus(); }, 50); }
  function fecharModal() { const m = document.getElementById('pf-m'); if (m) m.remove(); }

  /* trocar a própria senha */
  function trocarSenha() { modal(`<h2>Trocar minha senha</h2><p>Usuário <b>${usuarioDe(EU.email)}</b></p><label>SENHA ATUAL</label><input type="password" id="ts-a" required autocomplete="current-password"><label>NOVA SENHA</label><input type="password" id="ts-n" required minlength="6" autocomplete="new-password"><div class="er" id="ts-er"></div><div class="rw"><button type="button" id="ts-x">Cancelar</button><button class="p">Trocar</button></div>`, f => {
      f.querySelector('#ts-x').onclick = fecharModal;
      f.onsubmit = async ev => { ev.preventDefault(); const er = f.querySelector('#ts-er'), b = f.querySelector('.p'); b.disabled = true; er.textContent = '';
        try { const cred = firebase.auth.EmailAuthProvider.credential(EU.email, f.querySelector('#ts-a').value); await EU.reauthenticateWithCredential(cred); await EU.updatePassword(f.querySelector('#ts-n').value); fecharModal(); aviso('Senha trocada.'); }
        catch (e) { er.textContent = e && (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') ? 'Senha atual incorreta.' : msgErro(e); b.disabled = false; } }; }); }

  /* PCP cria a conta de outra pessoa (sem sair da própria): usa uma segunda instância só para criar */
  async function criarUsuario(usuario, nome, senha) { const em = emailDe(usuario); if (!usuarioLimpo(usuario)) throw { code: 'usuario-vazio' };
    const sec = firebase.apps.find(a => a.name === 'criador') || firebase.initializeApp(CFG.firebase, 'criador');
    if (CFG.emulador) { try { sec.auth().useEmulator('http://' + CFG.emulador + ':9099'); } catch (e) {} }
    const c = await sec.auth().createUserWithEmailAndPassword(em, senha); const uid = c.user.uid;
    try { await c.user.updateProfile({ displayName: nome }); } catch (e) {}
    await sec.auth().signOut();
    await fs.doc('perfis/' + uid).set({ nome, usuario: usuarioDe(em), criadoEm: new Date().toISOString(), criadoPor: EU.uid });
    return uid; }
  /* menu do usuário: tocar no nome/avatar no topo */
  document.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('[data-act="sair-conta"]')) { sair(); return; }
    const mn = document.getElementById('pf-menu'); if (mn && !mn.contains(ev.target)) mn.remove();
    const q = ev.target.closest && ev.target.closest('.quem'); if (!q || !EU || mn) return;
    if (!mcssOk) { const st = document.createElement('style'); st.textContent = mcss; document.head.appendChild(st); mcssOk = true; }
    const r = q.getBoundingClientRect(), m = document.createElement('div'); m.id = 'pf-menu'; m.style.top = (r.bottom + 6) + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px';
    m.innerHTML = `<div>Usuário <b>${usuarioDe(EU.email)}</b></div><button data-m="senha">Trocar minha senha</button>${instalarPossivel() ? '<button data-m="instalar">Instalar o app neste aparelho</button>' : ''}<button data-m="sair">Sair</button>`;
    m.onclick = e => { const k = e.target.dataset.m; if (!k) return; m.remove(); if (k === 'senha') trocarSenha(); else if (k === 'instalar') instalar(); else sair(); };
    document.body.appendChild(m); });

  window.claude = {
    online: true, link: CFG.link || '',
    use: async nome => { await pronto;
      if (nome === 'db') return DB; if (nome === 'user') return USER; if (nome === 'assets') return ASSETS; if (nome === 'downloads') return DOWNLOADS; return null; },
    assetBytes: async id => { await pronto; return ASSETS.bytes(id); },
    /* só a dona: cria a conta de outra pessoa (o painel grava o acesso com o cargo) */
    criarUsuario: async (usuario, nome, senha) => { await pronto; if (!ehDono(EU)) throw { code: 'sem-permissao' }; return criarUsuario(usuario, nome, senha); },
    instalar, instalarPossivel,
    _fs: () => fs, _assets: ASSETS, _enc: enc
  };
})();
