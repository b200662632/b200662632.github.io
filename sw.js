const CACHE_NAME = 'quran-app-cache-v1';

// الملفات الأساسية والخطوط التي يجب حفظها فوراً
const urlsToCache = [
  './index.html',
  './Bazzi Uthmani @Am9li9.ttf',
  './surah-name-v1.woff',
  './quran-common.woff',
  './QCF_SurahHeader_COLOR-Regular.woff',
  './ligatures.json'
];

// حدث التثبيت (حفظ الملفات الأساسية)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم فتح الكاش');
        return cache.addAll(urlsToCache);
      })
  );
});

// حدث الجلب (جلب الملفات من الكاش إذا لم يكن هناك إنترنت)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا كان الملف موجوداً في الكاش (الذاكرة)، قم بإرجاعه
        if (response) {
          return response;
        }
        
        // إذا لم يكن موجوداً، اطلبه من الإنترنت (مثل بيانات القرآن من API)
        return fetch(event.request).then(
          function(networkResponse) {
            // التحقق من صحة الاستجابة
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              return networkResponse;
            }

            // حفظ نسخة من الاستجابة في الكاش لاستخدامها لاحقاً بدون إنترنت
            var responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                // لا نقم بحفظ طلبات POST، فقط GET
                if(event.request.method === 'GET') {
                  cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        );
      })
  );
});