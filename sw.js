/* Painel de Operação Colafix — service worker (app instalável).
   Arquivos do próprio site: busca na rede primeiro (versão nova entra na hora) e usa a cópia guardada sem internet.
   Bibliotecas (Firebase, jsPDF, pdf.js...): usa a cópia guardada e atualiza por trás.
   O banco (Firestore) e o login não passam por aqui. */
const VERSAO = 'painel-v1';
const BASE = ['./', 'index.html', 'config.js', 'painel-firebase.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
const LIBS = ['https://www.gstatic.com/firebasejs/', 'https://cdnjs.cloudflare.com/'];
self.addEventListener('install', ev => { ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', ev => { ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', ev => {
  const r = ev.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    ev.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
    return;
  }
  if (LIBS.some(p => r.url.startsWith(p))) {
    ev.respondWith(caches.open(VERSAO).then(c => c.match(r).then(x => { const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => x); return x || net; })));
  }
});
