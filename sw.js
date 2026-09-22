// ══ SERVICE WORKER — ACCIÓN FÚTBOL ══
// Maneja notificaciones push en background

self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  let data = {};
  try { data = event.data.json(); } 
  catch(e) { data = { title: 'Acción Fútbol', body: event.data.text() }; }

  const title   = data.notification?.title || data.title || 'Acción Fútbol';
  const options = {
    body:    data.notification?.body  || data.body  || '',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    vibrate: [200, 100, 200],
    data:    { url: data.data?.url || '/' },
    actions: [{ action: 'open', title: '¡Ver ficha! 🎂' }]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Cache básico para funcionamiento offline
const CACHE = 'af-v1';
self.addEventListener('install',  e => e.waitUntil(caches.open(CACHE)));
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch',    e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request).catch(() => r))
));
