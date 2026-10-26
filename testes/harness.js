/* funciona aqui e dentro do repositório (pasta testes/): playwright local ou global; Chrome do playwright se não houver outro */
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path');
const RAIZ = process.env.RAIZ || (require('fs').existsSync(require('path').join(__dirname, '..', 'index.html')) ? require('path').join(__dirname, '..') : '/home/claude/painel-colafix-main');
const MOCK = fs.readFileSync(__dirname + '/mock-firebase.js', 'utf8');
const BASE = 'http://painel.test/';
const CHROME = process.env.CHROME || (() => { try { const d = '/home/claude/.cache/puppeteer/chrome'; const v = fs.readdirSync(d)[0]; return path.join(d, v, 'chrome-linux64/chrome'); } catch (e) { return undefined; } })();

async function abrir(op) {
  op = op || {};
  const args = ['--no-sandbox']; if (op.camera) args.push('--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + op.camera, '--unsafely-treat-insecure-origin-as-secure=http://painel.test');
  const browser = await chromium.launch(Object.assign({ args }, CHROME ? { executablePath: CHROME } : {}));
  const ctx = await browser.newContext({ viewport: op.viewport || { width: 1280, height: 900 }, acceptDownloads: true });
  if (op.decodificador) { /* faz o papel do leitor de QR nativo do tablet Android (BarcodeDetector), usando o OpenCV */
    const { spawn } = require('child_process'); const py = spawn('python3', [__dirname + '/cam.py', 'servidor']); const fila = []; let buf = '';
    py.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); const r = fila.shift(); r && r(l); } });
    browser.on('disconnected', () => py.kill());
    await ctx.exposeFunction('__decodifica', url => new Promise(r => { fila.push(r); py.stdin.write(url + '\n'); }));
    await ctx.addInitScript(() => { window.BarcodeDetector = class { constructor() {} static async getSupportedFormats() { return ['qr_code']; }
      async detect(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); const t = await window.__decodifica(c.toDataURL('image/png')); return t ? [{ rawValue: t, format: 'qr_code' }] : []; } }; });
  }
  if (op.negarCamera) await ctx.addInitScript(() => { if (!navigator.mediaDevices) return; navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('negado'), { name: 'NotAllowedError' })); });
  await ctx.route('**/*', async route => {
    const u = route.request().url();
    if (u.includes('gstatic.com/firebasejs/')) return route.fulfill({ contentType: 'text/javascript', body: u.includes('app-compat') ? MOCK : '' });
    if (u.includes('cdnjs.cloudflare.com') && u.includes('pptxgenjs') && fs.existsSync(__dirname + '/node_modules/pptxgenjs/dist/pptxgen.bundle.js')) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(__dirname + '/node_modules/pptxgenjs/dist/pptxgen.bundle.js', 'utf8') }); /* PowerPoint de verdade (npm i --no-save pptxgenjs@3.12.0) */
    if (u.includes('cdnjs.cloudflare.com') && u.includes('/exceljs/') && fs.existsSync(__dirname + '/node_modules/exceljs/dist/exceljs.min.js')) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(__dirname + '/node_modules/exceljs/dist/exceljs.min.js', 'utf8') }); /* npm i --no-save exceljs@4.4.0 */
    if (u.includes('cdnjs.cloudflare.com')) return route.fulfill({ contentType: 'text/javascript', body: u.includes('jspdf') ? fs.readFileSync(process.env.JSPDF_REAL ? __dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js' : __dirname + '/jspdf-falso.js', 'utf8') : '' }); /* JSPDF_REAL=1: PDF de verdade (npm i --no-save jspdf@2.5.1) */
    if (u.startsWith(BASE)) { let p = decodeURIComponent(new URL(u).pathname.slice(1)) || 'index.html';
      if (p === 'modulos/rh-epi-padrao.json' && !process.env.EPI_PADRAO) return route.fulfill({ status: 404, body: '' }); /* funções da planilha do EPI: só no teste que pede (EPI_PADRAO=1) */
      if (p === 'vazio.html') return route.fulfill({ contentType: 'text/html', body: '<html><body>vazio</body></html>' });
      if (p === 'config.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(RAIZ, p), 'utf8').replace('banco: "default"', 'banco: "(default)"') });
      const f = path.join(RAIZ, p);
      if (p === 'index.html' && fs.existsSync(f)) { let h = fs.readFileSync(f, 'utf8'); const k = '\niniciar();\n})();'; if (h.includes(k)) h = h.replace(k, '\nwindow.__T={ritk:(cp,f)=>{ const D=ritDados(cp,\'painel\'); return D?Object.assign({LS:D.LS,n:D.n,cut:D.cut,outros:D.outros},ritStats(D,f||{})):null; },views:()=>Object.keys(VIEWS),vo:v=>viewOk(v),fer:()=>{try{return {f:feriados(),sab:!!anlCfg().sab}}catch(e){return null}},S:()=>S,salvar:(c,d)=>salvar(c,d),proc:(i,e)=>siloProcessarEntrega(i,e),rec:()=>siloReconciliar(),prev:()=>previsaoCimento(),go:v=>go(v),rit:c=>{ const D=ritDados(c,\'painel\'); if(!D) return null; return {its:D.its.map(x=>({c:x.c,dv:x.dv,dvF:x.dvF,dif:x.dif,prev:x.prev})),al:ritAlertas(D).map(a=>a.t),meta:D.LS.map(l=>[l,Math.round(ritStats(D,{l}).T)])}; }};iniciar();\n})();'); else if (!h.includes('js/carregar.js')) throw new Error('gancho de teste'); return route.fulfill({ body: h, contentType: 'text/html; charset=utf-8' }); }
      if (/^js\/09-.*\.js$/.test(p) && fs.existsSync(f)) { let h = fs.readFileSync(f, 'utf8'); const k = '\niniciar();\n'; if (!h.endsWith(k)) throw new Error('gancho de teste (js)'); h = h.slice(0, -k.length) + '\nwindow.__T={ritk:(cp,f)=>{ const D=ritDados(cp,\'painel\'); return D?Object.assign({LS:D.LS,n:D.n,cut:D.cut,outros:D.outros},ritStats(D,f||{})):null; },views:()=>Object.keys(VIEWS),vo:v=>viewOk(v),fer:()=>{try{return {f:feriados(),sab:!!anlCfg().sab}}catch(e){return null}},S:()=>S,salvar:(c,d)=>salvar(c,d),proc:(i,e)=>siloProcessarEntrega(i,e),rec:()=>siloReconciliar(),prev:()=>previsaoCimento(),go:v=>go(v),rit:c=>{ const D=ritDados(c,\'painel\'); if(!D) return null; return {its:D.its.map(x=>({c:x.c,dv:x.dv,dvF:x.dvF,dif:x.dif,prev:x.prev})),al:ritAlertas(D).map(a=>a.t),meta:D.LS.map(l=>[l,Math.round(ritStats(D,{l}).T)])}; }};iniciar();\n})();'.replace(/\n\}\)\(\);$/, '\n'); return route.fulfill({ body: h, contentType: 'text/javascript; charset=utf-8' }); }
      if (fs.existsSync(f)) return route.fulfill({ body: fs.readFileSync(f), contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.html') ? 'text/html' : undefined });
      return route.fulfill({ status: 404, body: '' }); }
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  return { browser, ctx, page, erros };
}
/* banco inicial: dona, João (produção+silos), Carlos (só almox), Maria (sem perfil) */
function seed(extra) {
  const uid = { dona: 'uDONA', joao: 'uJOAO', carlos: 'uCARLOS', maria: 'uMARIA' };
  const d = { users: {
      'iasmyn@painel-colafix.app': { uid: uid.dona, pass: 'senha123', nome: 'Iasmyn' },
      'joao@painel-colafix.app': { uid: uid.joao, pass: 'joao123', nome: 'João' },
      'carlos@painel-colafix.app': { uid: uid.carlos, pass: 'carlos123', nome: 'Carlos' },
      'maria@painel-colafix.app': { uid: uid.maria, pass: 'maria123', nome: 'Maria' } },
    docs: {
      ['perfis/' + uid.dona]: { nome: 'Iasmyn', usuario: 'iasmyn' },
      ['perfis/' + uid.joao]: { nome: 'João', usuario: 'joao' },
      ['perfis/' + uid.carlos]: { nome: 'Carlos', usuario: 'carlos' },
      ['perfis/' + uid.maria]: { nome: 'Maria', usuario: 'maria' },
      ['acessos/' + uid.joao]: { perfil: 'outro', mods: ['inicio', 'producao', 'silos'], locais: [], ativo: true },
      ['acessos/' + uid.carlos]: { perfil: 'outro', mods: ['almox'], locais: ['a3'], contar: true, ativo: true },
      'config/geral': { silos: [{ id: 'c1', grupo: 'Cimento', nome: 'Silo Pequeno', cap: 30 }, { id: 'c2', grupo: 'Cimento', nome: 'Silo Grande', cap: 70 }, { id: 'c3', grupo: 'Cimento', nome: 'Silo Reserva', cap: 30 }, { id: 'a1', grupo: 'Areia', nome: 'Silo Verde', cap: 60 }],
        produtos: [{ id: 'ac3', nome: 'AC3', kgSaco: 4, sacosPremix: 100 }], linhas: ['Linha 1', 'Linha 2'], motivos: ['Falta de cimento', 'Outros'], limites: { normal: 50, atencao: 25 },
        linhasOrdem: ['Linha 1', 'Linha 2', 'Fixcol'], paletes: {}, paleteProd: {} },
      'itens/AC3001': { codigo: 'AC3001', kgCimento: 5, desc: 'Argamassa AC3' },
      'ordens/5001': { num: '5001', produto: 'AC3001 - ARGAMASSA AC3 20KG', linha: 'Linha 1', data: '2026-10-07', turno: 'Dia todo', total: 1000, status: 'aberta', criadaEm: '2026-10-01T10:00:00.000Z' },
      'ordens/5002': { num: '5002', produto: 'AC3001 - ARGAMASSA AC3 20KG', linha: 'Linha 2', data: '2026-10-07', turno: 'Dia todo', total: 1000, status: 'aberta', criadaEm: '2026-10-01T10:00:00.000Z' }
    } };
  if (extra) extra(d, uid);
  return { d, uid };
}
async function preparar(page, banco, ctl) {
  await page.goto(BASE + 'vazio.html');
  await page.evaluate(([b, c]) => { localStorage.clear(); localStorage.setItem('__srv', JSON.stringify(b)); localStorage.setItem('__ctl', JSON.stringify(c || {})); }, [banco, ctl]);
}
const ctlSet = (page, c) => page.evaluate(c => localStorage.setItem('__ctl', JSON.stringify(c)), c);
async function entrar(page, usuario, senha) {
  await page.waitForSelector('#lg-e', { timeout: 8000 });
  await page.fill('#lg-e', usuario); await page.fill('#lg-s', senha); await page.click('#lg .lg-go');
}
const txt = (page, sel) => page.$eval(sel, e => e.innerText).catch(() => null);
const dorme = ms => new Promise(r => setTimeout(r, ms));
module.exports = { abrir, seed, preparar, entrar, ctlSet, txt, dorme, BASE, RAIZ };
