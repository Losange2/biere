
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(function(error) {
        console.log('Service Worker registration failed:', error);
    });
}

const ressourceToCache = [
    './',
    './index.html',
    './ajout.js',
    './app.js',
    './style.css',
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('v1').then(function(cache) {
            return cache.addAll(ressourceToCache);
        })
    );
})

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            if (response) {
                return response; // Ressource trouvée dans le cache
            }
            return fetch(event.request); // Ressource non trouvée, faire une requête réseau
            const responseToCache = response.clone();
            caches.open('v1')
              .then(cache => {
                  cache.put(event.request, responseToCache);
              });
            return response;
        })
    );
})