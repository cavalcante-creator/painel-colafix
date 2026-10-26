/* Firebase "compat" simulado, só para testes locais (sem internet).
   Servidor = localStorage '__srv' (compartilhado entre abas/recargas). Cache local do aparelho = '__cache'.
   Controles em localStorage '__ctl': {offline, enumProt, latenciaMs}. */
(function () {
  const L = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
  };
  const ctl = () => L.get('__ctl', {});
  const srv = () => L.get('__srv', { docs: {}, users: {} });
  const salvaSrv = s => L.set('__srv', s);
  const cache = () => L.get('__cache', {});
  const salvaCache = c => L.set('__cache', c);
  const espera = () => new Promise(r => setTimeout(r, ctl().latenciaMs || 5));
  const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  const err = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  window.__mockLog = []; window.__leit = 0; /* leituras cobradas: documentos vindos do servidor */

  class Timestamp { constructor(ms) { this.ms = ms; } toDate() { return new Date(this.ms); } static now() { return new Timestamp(Date.now()); } }
  class Blob { constructor(u) { this.u = u; } static fromUint8Array(u) { return new Blob(Array.from(u)); } toUint8Array() { return new Uint8Array(this.u); } }
  const SERVER_TS = { __srvts: true };
  const resolve = v => { if (v && v.__srvts) return new Date().toISOString(); if (Array.isArray(v)) return v.map(resolve); if (v && typeof v === 'object' && !(v instanceof Blob)) { const o = {}; for (const k in v) o[k] = resolve(v[k]); return o; } return v; };
  const merge = (a, b) => { const o = Object.assign({}, a || {}); for (const k in b) { const v = b[k]; if (v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) o[k] = merge(o[k], v); else o[k] = v; } return o; };

  /* ---------- listeners ---------- */
  const ouvintes = new Set();
  function notifica() { ouvintes.forEach(l => { try { l.servidor(); } catch (e) { console.error(e); } }); }
  window.__mockReconnect = notifica;

  function lerDoc(path, doServidor) {
    if (doServidor) { const d = srv().docs[path]; if (d !== undefined) { const c = cache(); c[path] = d; salvaCache(c); } return { d: clone(d), fromCache: false }; }
    const c = cache(); return { d: clone(c[path]), fromCache: true, temCache: path in c };
  }
  function DocSnap(path, d, fromCache) { return { id: path.split('/').pop(), exists: d !== undefined && d !== null, data: () => clone(d), ref: Ref(path), metadata: { fromCache, hasPendingWrites: false } }; }
  function gravar(path, fn) {
    if (ctl().negar && ctl().negar.some(p => path.startsWith(p))) return Promise.reject(err('permission-denied'));
    const s = srv(); const novo = fn(s.docs[path]); if (novo === undefined) delete s.docs[path]; else s.docs[path] = resolve(novo); salvaSrv(s);
    const c = cache(); if (novo === undefined) delete c[path]; else c[path] = s.docs[path]; salvaCache(c);
    window.__mockLog.push(['grava', path]);
    setTimeout(notifica, 0); return Promise.resolve();
  }

  function Ref(path) {
    return {
      id: path.split('/').pop(), path,
      get: async (o) => { await espera(); const off = ctl().offline; if (off) { if (o && o.source === 'server') throw err('unavailable'); const r = lerDoc(path, false); return DocSnap(path, r.d, true); } const r = lerDoc(path, true); window.__leit++; return DocSnap(path, r.d, false); },
      set: async (d, o) => { await espera(); if (ctl().offline) throw err('unavailable'); return gravar(path, ant => (o && o.merge) ? merge(ant, d) : clone(d)); },
      update: async d => { await espera(); return gravar(path, ant => { if (ant === undefined) throw err('not-found'); return merge(ant, d); }); },
      delete: async () => { await espera(); return gravar(path, () => undefined); },
      onSnapshot: function (a, b, c) {
        let opts = {}, ok, er; if (typeof a === 'function') { ok = a; er = b; } else { opts = a || {}; ok = b; er = c; }
        let ultimo = '__nada__', vivo = true;
        let primeira = true; const l = { servidor: () => { if (!vivo || ctl().offline) return; const r = lerDoc(path, true); if (primeira) { window.__leit++; primeira = false; } const k = JSON.stringify(r.d === undefined ? null : r.d) + '|s';
          if (k !== ultimo) { ultimo = k; ok(DocSnap(path, r.d, false)); } } };
        ouvintes.add(l);
        setTimeout(() => {
          if (!vivo) return;
          const r = lerDoc(path, false);
          /* como o SDK real: sem internet, responde com o cache (inclusive "não existe" se não houver cópia) */
          if (ctl().offline) { ultimo = JSON.stringify(r.d === undefined ? null : r.d) + '|c'; ok(DocSnap(path, r.d, true)); return; }
          if (r.temCache) { ultimo = JSON.stringify(r.d) + '|c'; ok(DocSnap(path, r.d, true)); }
          setTimeout(() => l.servidor(), ctl().latenciaMs || 5);
        }, 0);
        return () => { vivo = false; ouvintes.delete(l); };
      }
    };
  }
  function Query(col, filtros, ordem, lim) {
    const exec = (doServidor) => {
      const base = doServidor ? srv().docs : cache();
      let ds = Object.keys(base).filter(p => p.startsWith(col + '/') && p.split('/').length === col.split('/').length + 1).map(p => ({ p, d: clone(base[p]) }));
      filtros.forEach(([c, op, v]) => { ds = ds.filter(x => { const a = x.d && x.d[c];
        return op === '==' ? a === v : op === '!=' ? a !== v : op === '<' ? a < v : op === '<=' ? a <= v : op === '>' ? a > v : op === '>=' ? a >= v : op === 'in' ? v.includes(a) : op === 'array-contains' ? Array.isArray(a) && a.includes(v) : true; }); });
      ordem.forEach(([c, dir]) => { ds = ds.filter(x => x.d && x.d[c] !== undefined); });
      if (ordem.length) ds.sort((x, y) => { for (const [c, dir] of ordem) { const a = x.d[c], b = y.d[c]; if (a < b) return dir === 'desc' ? 1 : -1; if (a > b) return dir === 'desc' ? -1 : 1; } return 0; });
      else ds.sort((x, y) => x.p.localeCompare(y.p));
      if (lim) ds = ds.slice(0, lim);
      if (doServidor) { const c = cache(); ds.forEach(x => c[x.p] = x.d); salvaCache(c); }
      const docs = ds.map(x => DocSnap(x.p, x.d, !doServidor));
      return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), metadata: { fromCache: !doServidor } };
    };
    return {
      where: (c, op, v) => Query(col, filtros.concat([[c, op, v]]), ordem, lim),
      orderBy: (c, d) => Query(col, filtros, ordem.concat([[c, d || 'asc']]), lim),
      limit: n => Query(col, filtros, ordem, n),
      get: async (o) => { await espera(); if (ctl().offline) { if (o && o.source === 'server') throw err('unavailable'); return exec(false); } const q = exec(true); window.__leit += Math.max(1, q.docs.length); return q; },
      onSnapshot: function (a, b, c) { let ok, er; if (typeof a === 'function') { ok = a; er = b; } else { ok = b; er = c; }
        let ultimo = '', vivo = true;
        let primeira = true; const l = { servidor: () => { if (!vivo || ctl().offline) return; const q = exec(true); if (primeira) { window.__leit += Math.max(1, q.docs.length); primeira = false; } const k = JSON.stringify(q.docs.map(d => [d.id, d.data()])); if (k !== ultimo) { ultimo = k; ok(q); } } };
        ouvintes.add(l); setTimeout(() => { if (!vivo) return; if (ctl().offline) { ok(exec(false)); return; } l.servidor(); }, 0);
        return () => { vivo = false; ouvintes.delete(l); }; },
      add: async d => { await espera(); const id = Math.random().toString(36).slice(2, 12); await gravar(col + '/' + id, () => clone(d)); return Ref(col + '/' + id); },
      doc: id => Ref(col + '/' + (id || Math.random().toString(36).slice(2, 12)))
    };
  }
  let terminado = false;
  function Firestore() {
    return {
      settings() {}, useEmulator() {}, enablePersistence: () => Promise.resolve(),
      doc: p => Ref(p), collection: p => Query(p, [], [], 0),
      runTransaction: async fn => { await espera(); if (ctl().offline) throw err('unavailable'); if (ctl().txErro) throw err(ctl().txErro); /* ex.: 'resource-exhausted' (cota de leituras do Firebase) */
        const pend = []; const t = {
          get: async r => { const d = srv().docs[r.path]; return DocSnap(r.path, clone(d), false); },
          set: (r, d, o) => { pend.push([r.path, ant => (o && o.merge) ? merge(ant, d) : clone(d)]); return t; },
          update: (r, d) => { pend.push([r.path, ant => merge(ant, d)]); return t; },
          delete: r => { pend.push([r.path, () => undefined]); return t; } };
        const res = await fn(t); for (const [p, f] of pend) await gravar(p, f); window.__mockLog.push(['transacao', pend.map(x => x[0])]); return res; },
      batch: () => { const pend = []; const b = { set: (r, d) => { pend.push([r.path, () => clone(d)]); return b; }, commit: async () => { for (const [p, f] of pend) await gravar(p, f); } }; return b; },
      waitForPendingWrites: () => ctl().pendentes ? new Promise(() => {}) : Promise.resolve(),
      terminate: async () => { terminado = true; window.__mockLog.push(['terminate']); },
      clearPersistence: async () => { localStorage.removeItem('__cache'); window.__mockLog.push(['clearPersistence']); }
    };
  }
  const FS = Firestore();

  /* ---------- auth ---------- */
  const authCbs = [];
  function User(r) { if (!r) return null; return { uid: r.uid, email: r.email || null, isAnonymous: !!r.anon, displayName: r.nome || null,
    updateProfile: async p => { const s = srv(); if (s.users[r.email]) { s.users[r.email].nome = p.displayName; salvaSrv(s); } },
    reauthenticateWithCredential: async c => { const s = srv(); if (!s.users[r.email] || s.users[r.email].pass !== c.p) throw err('auth/invalid-credential'); },
    updatePassword: async p => { if (String(p).length < 6) throw err('auth/weak-password'); const s = srv(); s.users[r.email].pass = p; salvaSrv(s); } }; }
  function Auth(nome) {
    const KEY = '__sess_' + (nome || 'def');
    let atual = L.get(KEY, null);
    const muda = r => { atual = r; if (r) L.set(KEY, r); else localStorage.removeItem(KEY); if (!nome || nome === 'def') { const u = User(r); authCbs.forEach(cb => setTimeout(() => cb(u), 0)); } };
    return {
      get currentUser() { return User(atual); },
      useEmulator() {},
      onAuthStateChanged: cb => { authCbs.push(cb); window.__mockLog.push(['onAuthStateChanged']); setTimeout(() => cb(User(atual)), ctl().authMs || 20); return () => {}; },
      signInWithEmailAndPassword: async (em, p) => { await espera(); const c = ctl(); window.__mockLog.push(['signIn', em]);
        if (c.offline) throw err('auth/network-request-failed');
        if (c.tooMany) throw err('auth/too-many-requests');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) throw err('auth/invalid-email');
        const u = srv().users[em];
        if (!u) throw err(c.enumProt === false ? 'auth/user-not-found' : 'auth/invalid-credential');
        if (u.disabled) throw err('auth/user-disabled');
        if (u.pass !== p) throw err(c.enumProt === false ? 'auth/wrong-password' : 'auth/invalid-credential');
        muda({ uid: u.uid, email: em, nome: u.nome }); return { user: User(atual) }; },
      createUserWithEmailAndPassword: async (em, p) => { await espera(); const s = srv(); if (s.users[em]) throw err('auth/email-already-in-use'); const uid = 'u' + Math.random().toString(36).slice(2, 10); s.users[em] = { uid, pass: p }; salvaSrv(s); const r = { uid, email: em }; if (nome && nome !== 'def') { atual = r; return { user: User(r) }; } muda(r); return { user: User(r) }; },
      signInAnonymously: async () => { if (ctl().semAnon) throw err('auth/operation-not-allowed'); muda({ uid: 'anon' + Math.random().toString(36).slice(2, 8), anon: true }); return { user: User(atual) }; },
      signOut: async () => { window.__mockLog.push(['signOut']); muda(null); }
    };
  }
  const apps = []; const auths = {};
  function App(cfg, name) { const n = name || '[DEFAULT]'; const a = { name: n, options: cfg,
    auth: () => auths[n] || (auths[n] = Auth(n === '[DEFAULT]' ? 'def' : n)), firestore: () => FS,
    container: { getProvider: () => ({ getImmediate: () => FS }) } }; apps.push(a); return a; }
  const firebase = window.firebase = {
    apps, initializeApp: (cfg, name) => App(cfg, name), app: n => apps.find(a => a.name === (n || '[DEFAULT]')),
    auth: () => firebase.app().auth(), firestore: () => FS
  };
  firebase.auth.EmailAuthProvider = { credential: (e, p) => ({ e, p }) };
  firebase.firestore.Timestamp = Timestamp; firebase.firestore.Blob = Blob;
  firebase.firestore.FieldValue = { serverTimestamp: () => SERVER_TS };
  firebase.firestore.Firestore = function () { return FS; };
})();
