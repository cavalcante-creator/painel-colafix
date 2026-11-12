/* Ponte com o Conectwork (12/11/2026, "assim que o RH faz o cadastro no painel já pré-cadastra no Conectwork"; escolha: fila automática).
   O painel e o Conectwork são projetos Firebase separados. Aqui o painel abre uma segunda conexão (app 'conectwork') com a configuração
   pública do Conectwork e o login do Conectwork de quem é admin ou RH da Colafix lá (e-mail e senha ou Google; fica lembrado neste
   aparelho). Com ele, cada PJ das prestadoras vai para a fila `filamei/{CNPJ}` do Conectwork; a equipe Conectwork pré-cadastra e o
   resultado (convite) volta para cá. Só nome, CNPJ, prestadora, celular e e-mail: nunca CPF. A segurança é das regras do Conectwork.
   window.CwPonte = { estado, ligar, conectar, google, sair, sincronizar, resultados, ouvir }. Nos testes: window.__CwPonteFake. */
(function () {
  if (window.__CwPonteFake) { window.CwPonte = window.__CwPonteFake; return; }
  const CFG = { apiKey: 'AIzaSyCRXQAaDuQt0W8paod9rzUCwHIVMPlRdXQ', authDomain: 'conectwork-4c285.firebaseapp.com', projectId: 'conectwork-4c285',
    storageBucket: 'conectwork-4c285.firebasestorage.app', messagingSenderId: '468863538962', appId: '1:468863538962:web:55a0bc24e1ed4a8a69c5cb' };
  const LIG = 'colafix.cwPonte';
  const dig = v => String(v == null ? '' : v).replace(/\D/g, '');
  const E = { on: false, email: '', empresaId: '', empresaNome: '', erro: '', carregando: false, res: {}, resOk: false };
  let app = null, cnpjTomador = '', unsub = null; const fns = new Set();
  const avisa = () => fns.forEach(f => { try { f(E); } catch (e) { /* tela */ } });
  const apl = () => { if (app) return app; if (!window.firebase) throw new Error('Firebase não carregou.');
    app = (firebase.apps || []).find(a => a.name === 'conectwork') || firebase.initializeApp(CFG, 'conectwork');
    app.auth().onAuthStateChanged(u => { if (u) achaEmpresa(u); else { Object.assign(E, { on: false, email: '', empresaId: '', empresaNome: '', res: {}, resOk: false }); if (unsub) { unsub(); unsub = null; } avisa(); } });
    return app; };
  async function achaEmpresa(u) {
    E.carregando = true; E.email = u.email || ''; avisa();
    try {
      const db = app.firestore(), acs = (await db.collection('acessos').where('uid', '==', u.uid).get()).docs.map(d => d.data()).filter(a => a.ativo && ['admin', 'rh'].includes(a.cargo));
      let achou = null;
      for (const a of acs) { const e = await db.doc('empresas/' + a.empresaId).get(); const x = e.exists ? e.data() : null;
        if (x && (!cnpjTomador || dig(x.cnpj) === cnpjTomador)) { achou = { id: a.empresaId, nome: x.nome || x.razao || '' }; break; } }
      if (!achou) { Object.assign(E, { on: false, carregando: false, erro: 'Este login do Conectwork (' + (u.email || '') + ') não é administrador(a) nem RH da Colafix no Conectwork. Entre com outro login ou peça o acesso ao administrador.' }); avisa(); return; }
      Object.assign(E, { on: true, erro: '', carregando: false, empresaId: achou.id, empresaNome: achou.nome });
      try { localStorage.setItem(LIG, '1'); } catch (e) { /* sem armazenamento */ }
      if (unsub) unsub();
      unsub = db.collection('filamei').where('empresaId', '==', achou.id).onSnapshot(s => { const r = {}; s.forEach(d => { r[d.id] = d.data(); }); E.res = r; E.resOk = true; avisa(); }, err => { E.erro = 'Não deu para ler a fila do Conectwork: ' + (err && err.message || ''); avisa(); });
      avisa();
    } catch (err) { Object.assign(E, { on: false, carregando: false, erro: 'Não deu para ligar ao Conectwork: ' + (err && err.message || '') }); avisa(); }
  }
  const msgErro = err => { const c = err && err.code || ''; return /wrong-password|invalid-credential|invalid-login/.test(c) ? 'E-mail ou senha do Conectwork não conferem.' : /user-not-found/.test(c) ? 'Não há conta no Conectwork com esse e-mail.' : /too-many/.test(c) ? 'Muitas tentativas. Espere um pouco e tente de novo.' : /popup/.test(c) ? 'A janela do Google foi fechada ou bloqueada.' : (err && err.message) || 'Não deu para entrar.'; };
  window.CwPonte = {
    estado: () => E,
    /* liga sozinho se este aparelho já foi conectado antes (o login do Conectwork fica lembrado) */
    ligar(cnpj) { cnpjTomador = dig(cnpj); let l = ''; try { l = localStorage.getItem(LIG) || ''; } catch (e) { /* */ } if (l) try { apl(); } catch (e) { /* sem firebase */ } },
    async conectar(email, senha, cnpj) { cnpjTomador = dig(cnpj) || cnpjTomador; E.erro = ''; try { await apl().auth().signInWithEmailAndPassword(String(email).trim(), senha); } catch (err) { E.erro = msgErro(err); avisa(); throw new Error(E.erro); } },
    async google(cnpj) { cnpjTomador = dig(cnpj) || cnpjTomador; E.erro = ''; try { await apl().auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); } catch (err) { E.erro = msgErro(err); avisa(); throw new Error(E.erro); } },
    async sair() { try { localStorage.removeItem(LIG); } catch (e) { /* */ } if (app) await app.auth().signOut(); },
    resultados: () => E.res,
    ouvir(fn) { fns.add(fn); return () => fns.delete(fn); },
    /* itens: [{cnpjNum, cnpj, nome, email, tel, prestadora, prestCnpj}]; só grava o que é novo ou mudou */
    async sincronizar(itens, quem) {
      if (!E.on || !E.resOk) return { novos: 0, mudados: 0 };
      const db = app.firestore(), ts = firebase.firestore.FieldValue.serverTimestamp(), u = app.auth().currentUser; let novos = 0, mudados = 0;
      for (const x of itens) {
        const r = E.res[x.cnpjNum], base = { nome: x.nome, email: x.email, tel: x.tel, prestadora: x.prestadora, prestCnpj: x.prestCnpj || '' };
        if (r && ['nome', 'email', 'tel', 'prestadora'].every(k => String(r[k] || '') === String(base[k] || ''))) continue;
        const up = Object.assign({}, base, { enviadoPor: u.uid, enviadoPorNome: String(quem || u.email || '').slice(0, 80), em: ts, st: 'pendente' });
        if (r) { await db.doc('filamei/' + x.cnpjNum).update(up); mudados++; }
        else { await db.doc('filamei/' + x.cnpjNum).set(Object.assign({ cnpj: x.cnpj, cnpjNum: x.cnpjNum, empresaId: E.empresaId }, up)); novos++; }
        E.res[x.cnpjNum] = Object.assign({}, r || {}, base, { st: 'pendente' });
      }
      if (novos || mudados) avisa();
      return { novos, mudados };
    }
  };
})();
