/**
 * Service Worker for 2FA Studio
 * Provides offline functionality and caching
 */

const CACHE_NAME = '2fa-studio-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/google-drive-icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Cache-first strategy files (fonts, images)
const CACHE_FIRST_ROUTES = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:woff|woff2|ttf|otf)$/
];

// Network-first strategy files (API calls, dynamic content)
const NETWORK_FIRST_ROUTES = [
  /^https:\/\/www\.googleapis\.com/,
  /^https:\/\/accounts\.google\.com/,
  /^https:\/\/firebaseapp\.com/,
  /^https:\/\/firebaseio\.com/,
  /\/api\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE;
            })
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and devtools requests
  if (url.protocol === 'chrome-extension:' || 
      url.hostname === 'localhost' && url.port === '5173') {
    return;
  }

  // Determine caching strategy
  if (shouldUseCacheFirst(request)) {
    event.respondWith(cacheFirst(request));
  } else if (shouldUseNetworkFirst(request)) {
    event.respondWith(networkFirst(request));
  } else {
    // Default: network first, fallback to cache
    event.respondWith(networkFirst(request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return createOfflineResponse();
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For navigation requests, return the offline page
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    return createOfflineResponse();
  }
}

// Check if request should use cache-first strategy
function shouldUseCacheFirst(request) {
  const url = request.url;
  
  return CACHE_FIRST_ROUTES.some(pattern => {
    return pattern.test(url);
  });
}

// Check if request should use network-first strategy
function shouldUseNetworkFirst(request) {
  const url = request.url;
  
  return NETWORK_FIRST_ROUTES.some(pattern => {
    return pattern.test(url);
  });
}

// Create offline response
function createOfflineResponse() {
  return new Response(
    '<h1>Offline</h1><p>You are currently offline. Some features may be limited.</p>',
    {
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Background sync for backup operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-backups') {
    event.waitUntil(syncBackups());
  }
});

async function syncBackups() {
  console.log('[SW] Syncing backups...');
  // This would sync pending backups when online
  // Implementation depends on your backup strategy
}

// Push notifications (for future implementation)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('2FA Studio', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Message handler for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});