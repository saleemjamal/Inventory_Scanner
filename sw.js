const CACHE_NAME = 'inventory-scanner-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/camera.js',
    '/js/storage.js',
    '/js/api.js',
    '/manifest.json',
    '/icons/icon-192x192.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'inventory-sync') {
        event.waitUntil(syncPendingEntries());
    }
});

async function syncPendingEntries() {
    try {
        const db = await openDB();
        const transaction = db.transaction(['pending'], 'readonly');
        const store = transaction.objectStore('pending');
        const pendingEntries = await store.getAll();
        
        for (const entry of pendingEntries) {
            try {
                const response = await fetch('/api/submit-inventory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(entry.data)
                });
                
                if (response.ok) {
                    const deleteTransaction = db.transaction(['pending'], 'readwrite');
                    const deleteStore = deleteTransaction.objectStore('pending');
                    await deleteStore.delete(entry.id);
                }
            } catch (error) {
                console.error('Failed to sync entry:', error);
            }
        }
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('InventoryDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending')) {
                db.createObjectStore('pending', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('stores')) {
                db.createObjectStore('stores', { keyPath: 'name' });
            }
        };
    });
}