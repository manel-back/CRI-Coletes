// Service worker: deixa o site abrir sem internet.
// Os dados dos times ficam offline pelo cache do próprio Firestore; aqui guardamos só os arquivos do site.
// - Arquivos de /assets/ têm hash no nome (nunca mudam): cache primeiro.
// - Todo o resto (páginas, ícones, manifesto): rede primeiro, cache se estiver offline.

// O marcador de versão abaixo é trocado a cada build (vite.config.js): cada deploy gera um cache novo.
const CACHE = 'cri-coletes-__VERSAO__';

// Na instalação, guarda a página inicial e os arquivos que ela usa, para que o site
// abra offline já na visita seguinte. O cache da versão anterior é apagado ao ativar.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const pagina = await fetch('/', { cache: 'no-cache' });
      const html = await pagina.clone().text();
      const arquivos = [...new Set(html.match(/\/assets\/[^"']+/g) ?? [])];
      await cache.addAll(['/manifest.webmanifest', '/icons/icone-192.png', ...arquivos]);
      await cache.put('/', pagina);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Firebase (login, banco) e outros domínios passam direto.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/__/')) {
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((salvo) => salvo || buscarEGuardar(request)),
    );
    return;
  }

  event.respondWith(
    buscarEGuardar(request).catch(() =>
      caches.match(request).then((salvo) => salvo || (request.mode === 'navigate' ? caches.match('/') : Response.error())),
    ),
  );
});

async function buscarEGuardar(request) {
  const resposta = await fetch(request);
  if (resposta.ok) {
    const copia = resposta.clone();
    caches.open(CACHE).then((c) => c.put(request, copia));
  }
  return resposta;
}
