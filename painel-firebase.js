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
  const ehDono = u => !!(u && u.email && DONOS.includes(u.email.toLowerCase()));
  async function perfis(ids) { const out = {};
    await Promise.all([...new Set(ids)].map(async id => {
      if (id in cacheNomes) { out[id] = cacheNomes[id]; return; }
      try { const g = await fs.doc('perfis/' + id).get(); const d = g.exists ? g.data() : null; cacheNomes[id] = d ? { name: d.nome || d.usuario || '', email: d.usuario || d.email || '' } : null; }
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

  /* ---------- tela de entrada ---------- */
  let pronto, prontoOk; pronto = new Promise(r => prontoOk = r);
  const css = `#lg{position:fixed;inset:0;z-index:2000;background:#fff;display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.45 "Segoe UI",system-ui,-apple-system,sans-serif;color:#1A1A1A;overflow:auto}
  #lg .bx{background:#F6F4EF;border:1px solid #E3DED4;border-radius:12px;box-shadow:0 10px 40px rgba(26,26,26,.06);padding:30px 32px 26px;width:100%;max-width:426px;display:flex;flex-direction:column;gap:0}
  #lg .lg-logo{display:block;height:46px;width:auto;margin:0 auto 14px}
  #lg h1{font-size:19px;font-weight:700;margin:0;text-align:center;color:#1A1A1A}#lg .lg-sub{margin:4px 0 22px;text-align:center;color:#9A948A;font-size:13px}
  #lg label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;color:#4A463D;margin:0 0 6px}
  #lg input{height:38px;border:1px solid #CFCAC0;border-radius:6px;padding:0 12px;font:inherit;font-size:14px;width:100%;box-sizing:border-box;background:#fff;margin:0 0 16px}
  #lg input:focus{outline:none;border-color:#1B5C7A;box-shadow:0 0 0 3px rgba(27,92,122,.14)}#lg input:-webkit-autofill{-webkit-box-shadow:0 0 0 40px #E8F0FE inset}
  #lg .lg-go{height:50px;border:0;border-radius:6px;background:#1B5C7A;color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer;margin-top:6px}#lg .lg-go:hover{background:#143F54}#lg .lg-go:disabled{opacity:.6}
  #lg .lk{border:0;background:none;color:#6B6558;padding:2px 0;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}#lg .lk:hover{color:#1B5C7A;text-decoration:underline}
  #lg .er{color:#A2453D;font-size:13px;min-height:0;margin:-6px 0 4px}#lg .er:empty{display:none}#lg .ok{color:#3F7D5C}
  #lg .rw{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:14px}`;
  function msgErro(e) { const c = (e && e.code) || ''; return ({ 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.', 'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.', 'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use "Entrar".', 'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos.', 'auth/network-request-failed': 'Sem internet.' })[c] || 'Não deu certo (' + c + ').'; }
  function telaEntrar(modo) {
    let el = document.getElementById('lg'); if (!el) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); el = document.createElement('div'); el.id = 'lg'; document.body.appendChild(el); }
    const pri = modo === 'primeiro';
    const logo = (document.querySelector('.brand img') || {}).src || '';
    el.innerHTML = `<form class="bx" autocomplete="on">${logo ? `<img class="lg-logo" src="${logo}" alt="Colafix">` : ''}<h1>Painel de Operação</h1><div class="lg-sub">${pri ? 'Primeiro acesso da responsável pelo PCP' : 'Produção · PCP · Almoxarifado'}</div>
      ${pri ? '<label for="lg-n">SEU NOME</label><input id="lg-n" autocomplete="name" required>' : ''}
      <label for="lg-e">USUÁRIO</label><input id="lg-e" autocomplete="username" autocapitalize="none" spellcheck="false" required>
      <label for="lg-s">SENHA</label><input id="lg-s" type="password" autocomplete="${pri ? 'new-password' : 'current-password'}" required minlength="6">
      <div class="er" id="lg-er"></div><button type="submit" class="lg-go">${pri ? 'Criar e entrar →' : 'Entrar →'}</button>
      <div class="rw"><span class="lk" style="cursor:default;text-decoration:none">${pri ? '' : 'Esqueceu a senha? Fale com o PCP.'}</span><button type="button" class="lk" id="lg-t">${pri ? 'Voltar' : 'Primeiro acesso'}</button></div></form>`;
    const f = el.querySelector('form'), er = el.querySelector('#lg-er');
    el.querySelector('#lg-t').onclick = () => telaEntrar(pri ? 'entrar' : 'primeiro');
    f.onsubmit = async ev => { ev.preventDefault(); const b = f.querySelector('button[type=submit]'); b.disabled = true; er.className = 'er'; er.textContent = '';
      const us = el.querySelector('#lg-e').value, em = emailDe(us), se = el.querySelector('#lg-s').value;
      try {
        if (pri) { if (!DONOS.includes(em)) { er.textContent = 'O primeiro acesso é só da responsável pelo PCP. As outras contas o PCP cria em Acessos.'; b.disabled = false; return; }
          const nome = el.querySelector('#lg-n').value.trim(); const c = await auth.createUserWithEmailAndPassword(em, se);
          await c.user.updateProfile({ displayName: nome }); await fs.doc('perfis/' + c.user.uid).set({ nome, usuario: usuarioDe(em), criadoEm: new Date().toISOString() }); }
        else await auth.signInWithEmailAndPassword(em, se);
      } catch (e) { er.textContent = e && e.code === 'auth/email-already-in-use' ? 'Esse usuário já existe. Volte e entre com ele.' : (e && (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password')) ? 'Usuário ou senha incorretos.' : msgErro(e); b.disabled = false; } };
    setTimeout(() => { const i = el.querySelector('input'); i && i.focus(); }, 50);
  }
  auth.onAuthStateChanged(async u => {
    if (!u) { if (EU) { location.reload(); return; } telaEntrar('entrar'); return; }
    if (EU && EU.uid !== u.uid) { location.reload(); return; }
    EU = u; const el = document.getElementById('lg'); if (el) el.remove(); setTimeout(() => { const q = document.querySelector('.quem'); if (q) { q.title = 'Usuário ' + usuarioDe(u.email) + ' · trocar senha ou sair'; q.style.cursor = 'pointer'; } }, 500);
    const ate = ms => new Promise((_, er) => setTimeout(() => er({ code: 'tempo-esgotado' }), ms));
    try { const g = await Promise.race([fs.doc('perfis/' + u.uid).get({ source: 'server' }), ate(15000)]);
      if (!g.exists) await fs.doc('perfis/' + u.uid).set({ nome: u.displayName || usuarioDe(u.email), usuario: usuarioDe(u.email), criadoEm: new Date().toISOString() }); }
    catch (e) { const c = (e && e.code) || 'erro'; console.warn('firestore', c, e && e.message);
      aviso(c === 'permission-denied' ? 'O banco recusou o acesso: as regras do Firestore não estão publicadas. No Firebase: Firestore Database → Regras → cole o firestore.rules → Publicar.'
        : 'O banco de dados não respondeu (' + c + '). No Firebase, confira se o Firestore Database foi criado (botão "Criar banco de dados").', [['Tentar de novo', () => location.reload()]]); }
    prontoOk();
  });
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
    await fs.doc('pedidos/' + uid).set({ em: new Date().toISOString(), criadoPeloPcp: true });
    return uid; }
  function telaCriar() { modal(`<h2>Criar usuário</h2><p>A pessoa entra com este usuário e senha. Depois de criar, escolha o cargo dela na lista de Acessos.</p>
      <label>NOME</label><input id="cu-n" required autocomplete="off"><label>USUÁRIO</label><input id="cu-u" required autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="ex.: joao.linha1">
      <label>SENHA INICIAL</label><input id="cu-s" required minlength="6" autocomplete="off" placeholder="mínimo 6 caracteres"><div class="er" id="cu-er"></div>
      <div class="rw"><button type="button" id="cu-x">Fechar</button><button class="p">Criar</button></div>`, f => {
      const n = f.querySelector('#cu-n'), u = f.querySelector('#cu-u');
      n.oninput = () => { if (!u.dataset.mexeu) u.value = usuarioLimpo(n.value.split(' ').slice(0, 2).join('.')); }; u.oninput = () => { u.dataset.mexeu = '1'; };
      f.querySelector('#cu-x').onclick = fecharModal;
      f.onsubmit = async ev => { ev.preventDefault(); const er = f.querySelector('#cu-er'), b = f.querySelector('.p'); b.disabled = true; er.className = 'er'; er.textContent = '';
        const us = usuarioLimpo(u.value), se = f.querySelector('#cu-s').value;
        try { await criarUsuario(us, n.value.trim(), se); er.className = 'er ok'; er.textContent = 'Criado: usuário ' + us + ' · senha ' + se + '. Passe para a pessoa e escolha o cargo na lista.'; f.reset(); delete u.dataset.mexeu; b.disabled = false; }
        catch (e) { er.textContent = e && e.code === 'auth/email-already-in-use' ? 'Já existe o usuário ' + us + '.' : e && e.code === 'usuario-vazio' ? 'Escreva o usuário.' : msgErro(e); b.disabled = false; } }; }); }

  /* botão "Criar usuário" na tela de Acessos (só a dona) + texto da tela */
  new MutationObserver(() => { if (!EU || !ehDono(EU)) return; const h = document.querySelector('#view .head h1');
    if (!h || h.textContent.trim() !== 'Acessos') return; document.querySelectorAll('#view section.card').forEach(c => { if (c.style.display !== 'none') { const tx = (c.innerText || '').trim(); if (/^COMO FUNCIONA/i.test(tx) || /^Criar acesso/.test(tx)) c.style.display = 'none'; } }); const head = h.closest('.head'); if (!head || head.querySelector('.pf-novo')) return;
    const sub = head.querySelector('.sub'); if (sub) sub.textContent = 'Você é a master: crie o usuário e a senha de cada pessoa e escolha o que ela pode ver.';
    document.querySelectorAll('#view section.card').forEach(c => { const tx = (c.innerText || '').trim(); if (/^COMO FUNCIONA/i.test(tx) || /^Criar acesso/.test(tx)) c.style.display = 'none'; });
    const b = document.createElement('button'); b.className = 'pf-novo'; b.type = 'button'; b.textContent = '+ Criar usuário'; b.onclick = telaCriar; head.appendChild(b);
    if (!mcssOk) { const st = document.createElement('style'); st.textContent = mcss; document.head.appendChild(st); mcssOk = true; } }).observe(document.documentElement, { childList: true, subtree: true });

  /* menu do usuário: tocar no nome/avatar no topo */
  document.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('[data-act="sair-conta"]')) { auth.signOut().then(() => location.reload()); return; }
    const mn = document.getElementById('pf-menu'); if (mn && !mn.contains(ev.target)) mn.remove();
    const q = ev.target.closest && ev.target.closest('.quem'); if (!q || !EU || mn) return;
    if (!mcssOk) { const st = document.createElement('style'); st.textContent = mcss; document.head.appendChild(st); mcssOk = true; }
    const r = q.getBoundingClientRect(), m = document.createElement('div'); m.id = 'pf-menu'; m.style.top = (r.bottom + 6) + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px';
    m.innerHTML = `<div>Usuário <b>${usuarioDe(EU.email)}</b></div><button data-m="senha">Trocar minha senha</button><button data-m="sair">Sair</button>`;
    m.onclick = e => { const k = e.target.dataset.m; if (!k) return; m.remove(); if (k === 'senha') trocarSenha(); else auth.signOut().then(() => location.reload()); };
    document.body.appendChild(m); });

  window.claude = {
    online: true, link: CFG.link || '',
    use: async nome => { await pronto;
      if (nome === 'db') return DB; if (nome === 'user') return USER; if (nome === 'assets') return ASSETS; if (nome === 'downloads') return DOWNLOADS; return null; },
    assetBytes: async id => { await pronto; return ASSETS.bytes(id); },
    _fs: () => fs, _assets: ASSETS, _enc: enc
  };
})();
