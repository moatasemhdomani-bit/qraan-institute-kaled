// عامل الخدمة للتطبيق المثبَّت. لا يخزّن أي بيانات للمعهد (كلها خلف تسجيل الدخول وتتغيّر لحظيًا) —
// كل الطلبات تذهب للخادم كما هي، ولا يتدخّل إلا عند انقطاع الشبكة فيعرض صفحة «لا يوجد اتصال».
const CACHE = "khs-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
