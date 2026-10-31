// Fresh Keep: funciona offline. Ao atualizar o app, muda o número V (e em version.json e index.html).
const V = "1.0.0", SHELL = "fk-shell-" + V, RUN = "fk-run";
const FILES = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];
const LIBS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(FILES);
    for (const u of LIBS) { try { const r = await fetch(u, { mode: "cors" }); if (r.ok) await c.put(u, r); } catch (_) {} }
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("fk-shell-") && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("message", e => { if (e.data === "SKIP") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const q = e.request;
  if (q.method !== "GET") return;
  const u = new URL(q.url);
  if (u.hostname.endsWith("supabase.co")) return;      // dados: nunca pelo cache do app
  if (u.pathname.endsWith("version.json")) return;      // versão: sempre da rede
  if (u.origin === location.origin) {                   // ficheiros do app: abre já e atualiza em segundo plano
    e.respondWith(
      caches.match(q, { ignoreSearch: true }).then(hit => {
        const net = fetch(q).then(r => {
          if (r && r.ok) { const c = r.clone(); caches.open(SHELL).then(x => x.put(q, c)); }
          return r;
        });
        return hit || net.catch(() => caches.match("index.html"));
      })
    );
    return;
  }
  e.respondWith(                                        // bibliotecas externas: cache primeiro
    caches.match(q).then(hit => hit || fetch(q).then(r => {
      if (r && (r.ok || r.type === "opaque")) { const c = r.clone(); caches.open(RUN).then(x => x.put(q, c)); }
      return r;
    }))
  );
});
