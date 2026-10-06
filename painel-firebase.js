/* Painel de Operação Colafix — versão online (Firebase).
   Faz o painel funcionar fora do Claude: implementa window.claude.use('db' | 'user' | 'assets' | 'downloads')
   em cima do Firebase (Firestore + Authentication por e-mail e senha).
   Precisa de window.PAINEL_CONFIG = { firebase:{...}, donos:['email@...'], link:'https://...' } antes deste arquivo. */
(function(){
  'use strict';
  const CFG = window.PAINEL_CONFIG || {};
  const DONOS = (CFG.donos || []).map(e => String(e).trim().toLowerCase());
  firebase.initializeApp(CFG.firebase);
  const auth = firebase.auth();
  const fs = firebase.firestore();
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
  const erroCod = e => { if (e && !e.code) e.code = 'erro'; if (e && e.code === 'permission-denied') e.code = 'sem-permissao'; return e; };

  /* ---------- objetos no mesmo formato que o painel já usa ---------- */
  function DocSnap(s) { return { id: s.id, exists: s.exists, data: () => (s.exists ? dec(s.data()) : undefined), ref: Doc(s.ref.path) }; }
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
      onSnapshot: (ok, err) => r.onSnapshot(s => ok(DocSnap(s)), e => err && err(erroCod(e))),
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
  const ehDono = u => !!(u && u.email && u.emailVerified && DONOS.includes(u.email.toLowerCase()));
  async function perfis(ids) { const out = {};
    await Promise.all([...new Set(ids)].map(async id => {
      if (id in cacheNomes) { out[id] = cacheNomes[id]; return; }
      try { const g = await fs.doc('perfis/' + id).get(); const d = g.exists ? g.data() : null; cacheNomes[id] = d ? { name: d.nome || '', email: d.email || '' } : null; }
      catch (e) { cacheNomes[id] = null; }
      out[id] = cacheNomes[id]; }));
    return out; }
  const USER = {
    id: async () => EU && EU.uid,
    me: async () => { const p = EU && (await perfis([EU.uid]))[EU.uid]; return { id: EU && EU.uid, name: (p && p.name) || (EU && (EU.displayName || EU.email)) || '' }; },
    isOwner: async () => ehDono(EU),
    profiles: ids => perfis(ids || []),
    search: async q => { q = String(q || '').trim().toLowerCase();
      const s = await fs.collection('perfis').limit(300).get();
      return s.docs.map(d => ({ id: d.id, name: d.data().nome || '', email: d.data().email || '', isMe: EU && d.id === EU.uid }))
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

  /* ---------- tela de entrada ---------- */
  let pronto, prontoOk; pronto = new Promise(r => prontoOk = r);
  const css = `#lg{position:fixed;inset:0;z-index:2000;background:#F5F1E8;display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.45 "Segoe UI",system-ui,sans-serif;color:#1A1A1A}
  #lg .bx{background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:28px 26px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px}
  #lg h1{font-size:22px;margin:0;color:#143F54}#lg p{margin:0;color:#6B6558;font-size:13.5px}
  #lg input{height:46px;border:1.5px solid #E5DFD0;border-radius:10px;padding:0 12px;font:inherit;width:100%;box-sizing:border-box}#lg input:focus{outline:none;border-color:#1B5C7A}
  #lg button{height:46px;border:0;border-radius:10px;background:#1B5C7A;color:#fff;font:inherit;font-weight:700;cursor:pointer}#lg button:disabled{opacity:.6}
  #lg .lk{background:none;color:#1B5C7A;height:auto;padding:2px 0;font-weight:600;font-size:13.5px}#lg .er{color:#A2453D;font-size:13px;min-height:18px}#lg .ok{color:#3F7D5C}
  #lg .rw{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}`;
  function msgErro(e) { const c = (e && e.code) || ''; return ({ 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.', 'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.', 'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use "Entrar".', 'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos.', 'auth/network-request-failed': 'Sem internet.' })[c] || 'Não deu certo (' + c + ').'; }
  function telaEntrar(modo) {
    let el = document.getElementById('lg'); if (!el) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); el = document.createElement('div'); el.id = 'lg'; document.body.appendChild(el); }
    const cria = modo === 'criar';
    el.innerHTML = `<form class="bx" autocomplete="on"><h1>Painel de Operação</h1><p>${cria ? 'Crie sua conta. Depois o PCP libera o seu acesso.' : 'Entre com seu e-mail e senha.'}</p>
      ${cria ? '<input id="lg-n" placeholder="Seu nome" autocomplete="name" required>' : ''}
      <input id="lg-e" type="email" placeholder="E-mail" autocomplete="username" required><input id="lg-s" type="password" placeholder="Senha" autocomplete="${cria ? 'new-password' : 'current-password'}" required minlength="6">
      <div class="er" id="lg-er"></div><button type="submit">${cria ? 'Criar conta' : 'Entrar'}</button>
      <div class="rw"><button type="button" class="lk" id="lg-t">${cria ? 'Já tenho conta' : 'Criar conta'}</button>${cria ? '' : '<button type="button" class="lk" id="lg-r">Esqueci a senha</button>'}</div></form>`;
    const f = el.querySelector('form'), er = el.querySelector('#lg-er');
    el.querySelector('#lg-t').onclick = () => telaEntrar(cria ? 'entrar' : 'criar');
    const r = el.querySelector('#lg-r'); if (r) r.onclick = async () => { const em = el.querySelector('#lg-e').value.trim(); if (!em) { er.textContent = 'Escreva seu e-mail acima.'; return; }
      try { await auth.sendPasswordResetEmail(em); er.className = 'er ok'; er.textContent = 'Enviamos um e-mail para trocar a senha.'; } catch (e) { er.className = 'er'; er.textContent = msgErro(e); } };
    f.onsubmit = async ev => { ev.preventDefault(); const b = f.querySelector('button[type=submit]'); b.disabled = true; er.className = 'er'; er.textContent = '';
      const em = el.querySelector('#lg-e').value.trim(), se = el.querySelector('#lg-s').value;
      try {
        if (cria) { const nome = el.querySelector('#lg-n').value.trim(); const c = await auth.createUserWithEmailAndPassword(em, se);
          await c.user.updateProfile({ displayName: nome }); await fs.doc('perfis/' + c.user.uid).set({ nome, email: em.toLowerCase(), criadoEm: new Date().toISOString() });
          try { await c.user.sendEmailVerification(); } catch (e) {} }
        else await auth.signInWithEmailAndPassword(em, se);
      } catch (e) { er.textContent = msgErro(e); b.disabled = false; } };
    setTimeout(() => { const i = el.querySelector('input'); i && i.focus(); }, 50);
  }
  auth.onAuthStateChanged(async u => {
    if (!u) { if (EU) { location.reload(); return; } telaEntrar('entrar'); return; }
    if (EU && EU.uid !== u.uid) { location.reload(); return; }
    EU = u; const el = document.getElementById('lg'); if (el) el.remove(); setTimeout(() => { const q = document.querySelector('.quem'); if (q) { q.title = 'Sair (' + (u.email || '') + ')'; q.style.cursor = 'pointer'; } }, 500);
    try { const g = await fs.doc('perfis/' + u.uid).get(); if (!g.exists) await fs.doc('perfis/' + u.uid).set({ nome: u.displayName || u.email.split('@')[0], email: (u.email || '').toLowerCase(), criadoEm: new Date().toISOString() }); } catch (e) {}
    prontoOk();
  });

  /* sair: tocar no nome/avatar no topo */
  document.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('[data-act="sair-conta"]')) { auth.signOut().then(() => location.reload()); return; }
    const q = ev.target.closest && ev.target.closest('.quem'); if (!q || !EU) return;
    if (confirm('Sair do painel (' + (EU.email || '') + ')?')) auth.signOut().then(() => location.reload()); });

  window.claude = {
    online: true, link: CFG.link || '',
    use: async nome => { await pronto;
      if (nome === 'db') return DB; if (nome === 'user') return USER; if (nome === 'assets') return ASSETS; if (nome === 'downloads') return DOWNLOADS; return null; },
    assetBytes: async id => { await pronto; return ASSETS.bytes(id); },
    _fs: () => fs, _assets: ASSETS, _enc: enc
  };
})();
