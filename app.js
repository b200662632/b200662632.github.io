let slider;
let pagesData = {}; 
let pagesElements = []; 
let surahsList = []; // لتخزين قائمة السور
let allAyahsList = []; // لتخزين جميع الآيات للبحث

// تحويل الأرقام
function toArabicNumber(num) {
  return num.toString().replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

// إزالة التشكيل من النص لتسهيل البحث
function removeTashkeel(text) {
  return text.replace(/[\u0617-\u061A\u064B-\u0652]/g, "");
}

async function loadQuran() {
  const res = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
  const data = await res.json();

  // الخطوة المصححة: جلب ملف ligatures مرة واحدة هنا وتخزينه في متغير
  const ligaturesRes = await fetch('ligatures.json');
  const ligaturesData = await ligaturesRes.json();

  slider = document.getElementById('slider');

  // 1. ترتيب وتخزين البيانات
  data.data.surahs.forEach(surah => {
    
    // حفظ السورة في الفهرس مع رقم صفحة أول آية فيها
    surahsList.push({
      name: surah.name,
      page: surah.ayahs[0].page
    });

    surah.ayahs.forEach(ayah => {
      // حفظ الآية في مصفوفة البحث السريع
      allAyahsList.push({
        text: ayah.text,
        textClean: removeTashkeel(ayah.text), // نص بدون تشكيل للبحث
        surah: surah.name,
        number: ayah.numberInSurah,
        page: ayah.page
      });

      if (!pagesData[ayah.page]) pagesData[ayah.page] = [];
      
      pagesData[ayah.page].push({
        text: ayah.text,
        number: ayah.numberInSurah,
        surah: surah.name,
        juz: ayah.juz,
        numberSurah : surah.number,
        sajda: ayah.sajda,
      });
    });
  });
  console.log(data.data);
  const sortedPages = Object.keys(pagesData).sort((a,b) => a - b);
  const fragment = document.createDocumentFragment();

  // 2. إنشاء إطارات فارغة لجميع الصفحات
  sortedPages.forEach((pageNum, index) => {
    const div = document.createElement('div');
    div.className = "page";
    div.dataset.page = pageNum;
    div.dataset.index = index; 
    div.dataset.loaded = "false";
    fragment.appendChild(div);
  });
  
  slider.appendChild(fragment);
  pagesElements = document.querySelectorAll('.page');

  // 3. دالة رسم الآيات 
  function renderPage(div) {
    if (div.dataset.loaded === "true") return; 

    const pageNum = div.dataset.page;
    const pageAyahs = pagesData[pageNum];

    let contentHTML = "";
    pageAyahs.forEach(a => { 
      // الخطوة المصححة: إضافة رأس السورة باستخدام البيانات التي جلبناها مسبقاً
      if (a.number == 1) {
        const headerText = ligaturesData["surah-" + a.numberSurah] || "";
        contentHTML += `<div class="head">${headerText}</div>`; 
      }
      
      contentHTML += `${a.text} <span class="num">${toArabicNumber(a.number)}</span>`;
      /*if (a.sajda.recommended === true ) {
        console.log(a);
         contentHTML += ` ۩`; 
      }*/

    });
    
    const formatNumber = (num) => {
      // Convert number to string, then pad to a length of 3 with '0'
      return String(num).padStart(3, '0');
    };

    div.innerHTML = `
    <div class="head_page">
      <span class="surah">  surah${formatNumber(pageAyahs[0].numberSurah)}</span>
      <span class="juz">juz${formatNumber(pageAyahs[0].juz)}</span>
    </div>
      <div class="content">${contentHTML}</div>
      <span>الصفحة ${toArabicNumber(pageNum)}</span>
    `;
    
    div.dataset.loaded = "true";
  }

  // 4. استخدام IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const div = entry.target;
        renderPage(div);
        localStorage.setItem('page', div.dataset.index);
      }
    });
  }, {
    root: slider,
    rootMargin: "100% 0px 100% 0px", 
    threshold: 0.1
  });

  pagesElements.forEach(page => observer.observe(page));

  // 5. استعادة الصفحة المحفوظة
  const savedIndex = localStorage.getItem('page');
  if (savedIndex !== null && pagesElements[savedIndex]) {
    setTimeout(() => {
      pagesElements[savedIndex].scrollIntoView({ behavior: 'auto', block: 'start', inline: 'start' });
    }, 50);
  }

  // تجهيز الفهرس الافتراضي (قائمة السور)
  renderSurahIndex();
}

loadQuran();

// ==========================================
// وظائف الفهرس والبحث والانتقال للصفحات
// ==========================================

// دالة الانتقال المباشر لصفحة معينة
function goToPage(pageNum) {
  const targetDiv = document.querySelector(`.page[data-page="${pageNum}"]`);
  if (targetDiv) {
    // التمرير السلس للصفحة المطلوبة
    targetDiv.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
    closeMenu(); // إغلاق شاشة البحث
    toggleControls(); // إخفاء القوائم العلوية والسفلية
  }
}

// عرض قائمة السور الافتراضية
function renderSurahIndex() {
  const resultsDiv = document.getElementById('menu-results');
  resultsDiv.innerHTML = ""; // مسح القديم
  
  surahsList.forEach(surah => {
    resultsDiv.innerHTML += `
      <div class="result-item" onclick="goToPage(${surah.page})">
        <h4>سورة ${surah.name}</h4>
        <p style="font-size: 14px; color: #888;">تبدأ في صفحة ${toArabicNumber(surah.page)}</p>
      </div>
    `;
  });
}

// دالة البحث عند الكتابة
function handleSearch() {
  const query = document.getElementById('search-input').value.trim();
  const queryClean = removeTashkeel(query);
  const resultsDiv = document.getElementById('menu-results');

  // إذا كان الحقل فارغاً، نعرض الفهرس (السور)
  if (queryClean === "") {
    renderSurahIndex();
    return;
  }

  resultsDiv.innerHTML = ""; // مسح النتائج
  
  // البحث في السور أولاً
  const matchedSurahs = surahsList.filter(s => removeTashkeel(s.name).includes(queryClean));
  matchedSurahs.forEach(surah => {
    resultsDiv.innerHTML += `
      <div class="result-item" onclick="goToPage(${surah.page})">
        <h4>سورة ${surah.name}</h4>
        <p style="font-size: 14px; color: #888;">انتقال إلى بداية السورة</p>
      </div>
    `;
  });

  // البحث في الآيات
  const matchedAyahs = allAyahsList.filter(a => a.textClean.includes(queryClean)).slice(0, 50); // نعرض أول 50 نتيجة فقط لعدم إرهاق المتصفح
  
  matchedAyahs.forEach(ayah => {
    resultsDiv.innerHTML += `
      <div class="result-item" onclick="goToPage(${ayah.page})">
        <h4>سورة ${ayah.surah} - آية ${toArabicNumber(ayah.number)}</h4>
        <p>${ayah.text}</p>
      </div>
    `;
  });

  if (matchedSurahs.length === 0 && matchedAyahs.length === 0) {
    resultsDiv.innerHTML = `<div style="text-align:center; padding: 20px;">لا توجد نتائج مطابقة</div>`;
  }
}

// وظائف إظهار وإخفاء النوافذ
let controlsVisible = false;

function toggleControls() {
  const controls = document.getElementById('controls');
  controlsVisible = !controlsVisible;
  if (controlsVisible) {
    controls.classList.remove('hidden');
  } else {
    controls.classList.add('hidden');
  }
}

function openMenu() {
  document.getElementById('menu-modal').classList.remove('hidden');
  renderSurahIndex(); // التأكد من عرض الفهرس عند الفتح
}

function closeMenu() {
  document.getElementById('menu-modal').classList.add('hidden');
  document.getElementById('search-input').value = ""; // تفريغ حقل البحث
}

document.addEventListener('click', (e) => {
  const controls = document.getElementById('controls');
  const menuModal = document.getElementById('menu-modal');

  // تجاهل الضغطات إذا كانت على القوائم أو شاشة البحث
  if (controls.contains(e.target) || menuModal.contains(e.target)) return;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const x = e.clientX;
  const y = e.clientY;

  const inMiddleX = x > screenWidth * 0.3 && x < screenWidth * 0.7;
  const inMiddleY = y > screenHeight * 0.3 && y < screenHeight * 0.7;

  // فتح وإغلاق القوائم عند الضغط في منتصف الشاشة (ولكن فقط إذا لم تكن شاشة البحث مفتوحة)
  if (inMiddleX && inMiddleY && menuModal.classList.contains('hidden')) {
    toggleControls();
  }
});