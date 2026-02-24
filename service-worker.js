// Service Worker for Financial Planner PWA
const CACHE_NAME = 'financial-planner-v19.5'; // עדכון גרסה לכפיית רענון
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style_v3.css',      // תיקון שם הקובץ לפי המאגר שלך
    './script.js',
    './pwa-register.js',   // הוספת הקובץ שחסר ברשימה
    './manifest.json',
    './icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                // הוספנו טיפול בשגיאות לכל קובץ בנפרד כדי למנוע קריסה טוטאלית
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('Service Worker: Cache addAll failed:', err))
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // אל תבצע Cache לבקשות שהן לא GET (כמו שליחת נתונים)
    if (event.request.method !== 'GET') return;
    
    // דילוג על קריאות ל-Supabase או API חיצוני
    if (event.request.url.includes('supabase.co')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request)
                    .then((fetchResponse) => {
                        // שמירת קבצים מוצלחים בלבד ב-Cache
                        if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
                            const responseToCache = fetchResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return fetchResponse;
                    });
            })
            .catch(() => {
                // במקרה של חוסר אינטרנט מוחלט - הצג את index.html
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            })
    );
});
