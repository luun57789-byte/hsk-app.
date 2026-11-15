// Offline support: network first for pages, cache first for dictionary data.
const CACHE = "hsk-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isData = url.pathname.includes("/data/") || url.pathname.includes("/hanzi/") || url.hostname === "cdn.jsdelivr.net";
  if (url.origin !== location.origin && !isData) return;
  const put = (res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
    return res;
  };
  if (isData) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put)));
  } else {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true })));
  }
});
