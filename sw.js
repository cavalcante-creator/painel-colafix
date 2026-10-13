/* Painel de Operação Colafix — service worker (app instalável).
   Arquivos do próprio site: busca na rede primeiro (versão nova entra na hora) e usa a cópia guardada sem internet.
   Bibliotecas (Firebase, jsPDF, pdf.js...): usa a cópia guardada e atualiza por trás.
   O banco (Firestore) e o login não passam por aqui. */
const VERSAO = 'painel-v6';
const BASE = ['./', 'index.html', 'config.js', 'painel-firebase.js', 'css/painel.css', 'js/carregar.js', 'js/00-qrcode.js', 'js/01-base-producao.js', 'js/02-diario-calendario.js', 'js/03-analise.js', 'js/04-analise-paineis-acessos.js', 'js/05-almox-premix.js', 'js/06-manutencao-equipe.js', 'js/07-manutencao-coletor.js', 'js/08-tablet-acessos-avisos.js', 'js/09-silos-final.js', 'js/10-tablet-producao.js', 'js/11-meu-menu.js', 'js/12-organizacao.js', 'modulos/lista.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
const LIBS = ['https://www.gstatic.com/firebasejs/', 'https://cdnjs.cloudflare.com/', 'https://cdn.jsdelivr.net/npm/jsqr@'];
self.addEventListener('install', ev => { ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', ev => { ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', ev => {
  const r = ev.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    ev.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
    return;
  }
  if (LIBS.some(p => r.url.startsWith(p))) {
    ev.respondWith(caches.open(VERSAO).then(c => c.match(r).then(x => { const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => x); return x || net; })));
  }
});
