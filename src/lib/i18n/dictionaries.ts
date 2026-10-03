// UI strings. Arabic is the source of truth; other locales must match its shape.
const ar = {
  appName: "دليل كركوك",
  tagline: "كل ما تحتاجه في كركوك، في مكان واحد",
  nav: { home: "الرئيسية", categories: "الأقسام", account: "حسابي", login: "دخول", search: "بحث", map: "الخريطة" },
  common: {
    call: "اتصال", whatsapp: "واتساب", verified: "موثّق", featured: "مميز", openNow: "مفتوح الآن",
    all: "الكل", empty: "لا توجد نتائج بعد", back: "رجوع", save: "حفظ", saving: "جارٍ الحفظ…",
    loading: "جارٍ التحميل…", theme: "تبديل الوضع", language: "اللغة", error: "حدث خطأ، حاول مجدداً",
  },
  home: {
    categories: "تصفّح الأقسام", duty: "الصيدليات المناوبة اليوم",
    dutyEmpty: "لم تُضف مناوبات اليوم بعد", districts: "الأحياء والمناطق",
    setupTitle: "المنصة غير موصولة بقاعدة البيانات بعد",
    setupBody: "أضف مفاتيح Supabase في ملف ‎.env.local‎ ثم أعد التشغيل (انظر README).",
  },
  category: { businesses: "الأنشطة", noBusinesses: "لا توجد أنشطة في هذا القسم بعد", sub: "أقسام فرعية" },
  auth: {
    title: "أهلاً بك في دليل كركوك", subtitle: "سجّل دخولك للمتابعة والتقييم والنشر",
    tabPhone: "رقم الهاتف", tabEmail: "البريد",
    phone: "رقم الهاتف", phoneHint: "مثال: 07701234567", sendCode: "إرسال رمز التحقق",
    code: "رمز التحقق", codeHint: "أدخل الرمز المكوّن من 6 أرقام المرسل إلى", verify: "تأكيد", changeNumber: "تغيير الرقم",
    resend: "إعادة إرسال الرمز", email: "البريد الإلكتروني", password: "كلمة المرور",
    signIn: "تسجيل الدخول", signUp: "إنشاء حساب", haveAccount: "لديك حساب؟", noAccount: "ليس لديك حساب؟",
    google: "المتابعة عبر Google", or: "أو", checkEmail: "تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول.",
    invalidPhone: "رقم هاتف عراقي غير صالح", invalidCode: "رمز غير صحيح", invalidEmail: "بريد غير صالح",
    shortPassword: "كلمة المرور 8 أحرف على الأقل", notConfigured: "خدمة الدخول غير مهيأة بعد",
    logout: "تسجيل الخروج", terms: "بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.",
  },
  account: {
    title: "حسابي", fullName: "الاسم الكامل", username: "اسم المستخدم", bio: "نبذة", saved: "تم الحفظ",
    usernameInvalid: "3–30 حرفاً: أحرف إنكليزية صغيرة وأرقام و _", nameRequired: "الاسم مطلوب",
    role: "الدور", roles: { user: "مستخدم", owner: "صاحب نشاط", moderator: "مشرف", admin: "مدير" },
    usernameTaken: "اسم المستخدم مستخدم مسبقاً",
  },

  search: {
    title: "البحث", placeholder: "ابحث عن مطعم، صيدلية، كهربائي…", submit: "بحث", filters: "الفلاتر", reset: "مسح الفلاتر",
    category: "القسم", district: "المنطقة / الحي", anyCategory: "كل الأقسام", anyDistrict: "كل المناطق",
    minRating: "التقييم", anyRating: "أي تقييم", ratingUp: "فأكثر", openNow: "مفتوح الآن", verifiedOnly: "موثّق فقط",
    sort: "الترتيب", sorts: { relevance: "الأنسب", nearest: "الأقرب", rating: "الأعلى تقييماً", newest: "الأحدث" },
    nearMe: "الأقرب إليّ", locating: "جارٍ تحديد موقعك…", locationDenied: "تعذّر تحديد موقعك. فعّل صلاحية الموقع.",
    results: "نتيجة", noResults: "لا توجد نتائج مطابقة. جرّب تعديل البحث أو الفلاتر.", prev: "السابق", next: "التالي", km: "كم",
  },
  business: {
    about: "نبذة", hours: "ساعات العمل", closed: "مغلق", open24: "٢٤ ساعة", open: "مفتوح الآن", closedNow: "مغلق الآن",
    days: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    products: "المنتجات والخدمات", gallery: "معرض الصور", address: "العنوان", openInMaps: "فتح في الخرائط",
    share: "مشاركة", copied: "تم نسخ الرابط", follow: "متابعة", following: "تتابعه", followers: "متابع", views: "مشاهدة",
    loginToFollow: "سجّل الدخول للمتابعة", rating: "التقييم", contact: "تواصل", currency: { IQD: "د.ع", USD: "$" }, unavailable: "غير متوفر",
  },
  map: {
    title: "الخريطة", all: "الكل", nearMe: "الأقرب إليّ", locating: "جارٍ تحديد موقعك…", locationDenied: "تعذّر تحديد موقعك",
    youAreHere: "موقعك", viewPage: "عرض الصفحة", nearest: "الأقرب إليك", places: "نشاط",
  },
};

export type Dictionary = typeof ar;

const ku: Dictionary = {
  appName: "ڕێنمای کەرکووک",
  tagline: "هەموو پێداویستییەکانت لە کەرکووک، لە یەک شوێن",
  nav: { home: "سەرەکی", categories: "بەشەکان", account: "هەژمارەکەم", login: "چوونەژوورەوە", search: "گەڕان", map: "نەخشە" },
  common: {
    call: "پەیوەندی", whatsapp: "واتساپ", verified: "پشتڕاستکراوە", featured: "تایبەت", openNow: "ئێستا کراوەیە",
    all: "هەموو", empty: "هێشتا هیچ ئەنجامێک نییە", back: "گەڕانەوە", save: "پاشەکەوتکردن", saving: "پاشەکەوت دەکرێت…",
    loading: "بارکردن…", theme: "گۆڕینی دۆخ", language: "زمان", error: "هەڵەیەک ڕوویدا، دووبارە هەوڵبدەرەوە",
  },
  home: {
    categories: "گەڕان بە بەشەکاندا", duty: "دەرمانخانە نۆبەتییەکانی ئەمڕۆ",
    dutyEmpty: "هێشتا نۆبەتی ئەمڕۆ زیاد نەکراوە", districts: "گەڕەک و ناوچەکان",
    setupTitle: "پلاتفۆرم هێشتا بە بنکەدراوە بەستراوە نییە",
    setupBody: "کلیلەکانی Supabase لە .env.local زیاد بکە و دووبارە دەستپێبکەرەوە (README ببینە).",
  },
  category: { businesses: "چالاکییەکان", noBusinesses: "هێشتا هیچ چالاکییەک لەم بەشەدا نییە", sub: "بەشە لاوەکییەکان" },
  auth: {
    title: "بەخێربێیت بۆ ڕێنمای کەرکووک", subtitle: "بچۆ ژوورەوە بۆ فۆڵۆکردن و هەڵسەنگاندن و بڵاوکردنەوە",
    tabPhone: "ژمارەی مۆبایل", tabEmail: "ئیمەیڵ",
    phone: "ژمارەی مۆبایل", phoneHint: "نموونە: 07701234567", sendCode: "ناردنی کۆدی پشتڕاستکردنەوە",
    code: "کۆدی پشتڕاستکردنەوە", codeHint: "کۆدی ٦ ژمارەیی نێردراو بۆ ئەم ژمارەیە بنووسە", verify: "پشتڕاستکردنەوە", changeNumber: "گۆڕینی ژمارە",
    resend: "دووبارە ناردنەوەی کۆد", email: "ئیمەیڵ", password: "وشەی نهێنی",
    signIn: "چوونەژوورەوە", signUp: "دروستکردنی هەژمار", haveAccount: "هەژمارت هەیە؟", noAccount: "هەژمارت نییە؟",
    google: "بەردەوامبوون بە Google", or: "یان", checkEmail: "ئیمەیڵەکەت بپشکنە بۆ پشتڕاستکردنەوە، پاشان بچۆ ژوورەوە.",
    invalidPhone: "ژمارەی مۆبایلی عێراقی دروست نییە", invalidCode: "کۆدەکە دروست نییە", invalidEmail: "ئیمەیڵ دروست نییە",
    shortPassword: "وشەی نهێنی بەلایەنی کەمەوە ٨ پیت بێت", notConfigured: "خزمەتگوزاری چوونەژوورەوە ئامادە نەکراوە",
    logout: "چوونەدەرەوە", terms: "بە بەردەوامبوون ڕازیت بە مەرجەکانی بەکارهێنان و سیاسەتی تایبەتمەندی.",
  },
  account: {
    title: "هەژمارەکەم", fullName: "ناوی تەواو", username: "ناوی بەکارهێنەر", bio: "کورتەیەک", saved: "پاشەکەوتکرا",
    usernameInvalid: "٣–٣٠ پیت: پیتی ئینگلیزی بچووک و ژمارە و _", nameRequired: "ناو پێویستە",
    role: "ڕۆڵ", roles: { user: "بەکارهێنەر", owner: "خاوەن چالاکی", moderator: "سەرپەرشتیار", admin: "بەڕێوەبەر" },
    usernameTaken: "ناوی بەکارهێنەر پێشتر بەکارهاتووە",
  },

  search: {
    title: "گەڕان", placeholder: "بگەڕێ بۆ چێشتخانە، دەرمانخانە، کارەبایی…", submit: "گەڕان", filters: "فلتەرەکان", reset: "سڕینەوەی فلتەر",
    category: "بەش", district: "ناوچە / گەڕەک", anyCategory: "هەموو بەشەکان", anyDistrict: "هەموو ناوچەکان",
    minRating: "هەڵسەنگاندن", anyRating: "هەر هەڵسەنگاندنێک", ratingUp: "و سەرووتر", openNow: "ئێستا کراوەیە", verifiedOnly: "تەنها پشتڕاستکراو",
    sort: "ڕیزبەندی", sorts: { relevance: "گونجاوترین", nearest: "نزیکترین", rating: "بەرزترین هەڵسەنگاندن", newest: "نوێترین" },
    nearMe: "نزیکترین بە من", locating: "شوێنەکەت دیاری دەکرێت…", locationDenied: "نەتوانرا شوێنەکەت دیاری بکرێت. ڕێگەپێدانی شوێن چالاک بکە.",
    results: "ئەنجام", noResults: "هیچ ئەنجامێکی گونجاو نییە. گەڕان یان فلتەرەکان بگۆڕە.", prev: "پێشوو", next: "دواتر", km: "کم",
  },
  business: {
    about: "دەربارە", hours: "کاتی کارکردن", closed: "داخراوە", open24: "٢٤ کاتژمێر", open: "ئێستا کراوەیە", closedNow: "ئێستا داخراوە",
    days: ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"],
    products: "کاڵا و خزمەتگوزارییەکان", gallery: "گەلەری وێنە", address: "ناونیشان", openInMaps: "کردنەوە لە نەخشە",
    share: "هاوبەشکردن", copied: "بەستەر کۆپی کرا", follow: "فۆڵۆکردن", following: "فۆڵۆت کردووە", followers: "فۆڵۆوەر", views: "بینین",
    loginToFollow: "بچۆ ژوورەوە بۆ فۆڵۆکردن", rating: "هەڵسەنگاندن", contact: "پەیوەندی", currency: { IQD: "د.ع", USD: "$" }, unavailable: "بەردەست نییە",
  },
  map: {
    title: "نەخشە", all: "هەموو", nearMe: "نزیکترین بە من", locating: "شوێنەکەت دیاری دەکرێت…", locationDenied: "نەتوانرا شوێنەکەت دیاری بکرێت",
    youAreHere: "شوێنی تۆ", viewPage: "بینینی پەڕە", nearest: "نزیکترینەکان", places: "چالاکی",
  },
};

const tr: Dictionary = {
  appName: "Kerkük Rehberi",
  tagline: "Kerkük'te ihtiyacınız olan her şey, tek yerde",
  nav: { home: "Ana Sayfa", categories: "Kategoriler", account: "Hesabım", login: "Giriş", search: "Ara", map: "Harita" },
  common: {
    call: "Ara", whatsapp: "WhatsApp", verified: "Onaylı", featured: "Öne çıkan", openNow: "Şimdi açık",
    all: "Tümü", empty: "Henüz sonuç yok", back: "Geri", save: "Kaydet", saving: "Kaydediliyor…",
    loading: "Yükleniyor…", theme: "Temayı değiştir", language: "Dil", error: "Bir hata oluştu, tekrar deneyin",
  },
  home: {
    categories: "Kategorilere göz at", duty: "Bugünün nöbetçi eczaneleri",
    dutyEmpty: "Bugünün nöbetçileri henüz eklenmedi", districts: "Mahalleler ve bölgeler",
    setupTitle: "Platform henüz veritabanına bağlı değil",
    setupBody: "Supabase anahtarlarını .env.local dosyasına ekleyip yeniden başlatın (README).",
  },
  category: { businesses: "İşletmeler", noBusinesses: "Bu kategoride henüz işletme yok", sub: "Alt kategoriler" },
  auth: {
    title: "Kerkük Rehberi'ne hoş geldiniz", subtitle: "Takip, değerlendirme ve paylaşım için giriş yapın",
    tabPhone: "Telefon", tabEmail: "E-posta",
    phone: "Telefon numarası", phoneHint: "Örnek: 07701234567", sendCode: "Doğrulama kodu gönder",
    code: "Doğrulama kodu", codeHint: "Şu numaraya gönderilen 6 haneli kodu girin:", verify: "Doğrula", changeNumber: "Numarayı değiştir",
    resend: "Kodu yeniden gönder", email: "E-posta", password: "Şifre",
    signIn: "Giriş yap", signUp: "Hesap oluştur", haveAccount: "Hesabınız var mı?", noAccount: "Hesabınız yok mu?",
    google: "Google ile devam et", or: "veya", checkEmail: "Hesabı onaylamak için e-postanızı kontrol edip giriş yapın.",
    invalidPhone: "Geçersiz Irak telefon numarası", invalidCode: "Kod hatalı", invalidEmail: "Geçersiz e-posta",
    shortPassword: "Şifre en az 8 karakter olmalı", notConfigured: "Giriş servisi henüz yapılandırılmadı",
    logout: "Çıkış yap", terms: "Devam ederek kullanım şartlarını ve gizlilik politikasını kabul edersiniz.",
  },
  account: {
    title: "Hesabım", fullName: "Ad soyad", username: "Kullanıcı adı", bio: "Hakkında", saved: "Kaydedildi",
    usernameInvalid: "3–30 karakter: küçük harf, rakam ve _", nameRequired: "Ad gerekli",
    role: "Rol", roles: { user: "Kullanıcı", owner: "İşletme sahibi", moderator: "Moderatör", admin: "Yönetici" },
    usernameTaken: "Kullanıcı adı alınmış",
  },

  search: {
    title: "Ara", placeholder: "Restoran, eczane, elektrikçi ara…", submit: "Ara", filters: "Filtreler", reset: "Filtreleri temizle",
    category: "Kategori", district: "Bölge / Mahalle", anyCategory: "Tüm kategoriler", anyDistrict: "Tüm bölgeler",
    minRating: "Puan", anyRating: "Herhangi", ratingUp: "ve üzeri", openNow: "Şimdi açık", verifiedOnly: "Sadece onaylı",
    sort: "Sırala", sorts: { relevance: "En uygun", nearest: "En yakın", rating: "En yüksek puan", newest: "En yeni" },
    nearMe: "Bana en yakın", locating: "Konumunuz belirleniyor…", locationDenied: "Konum alınamadı. Konum iznini açın.",
    results: "sonuç", noResults: "Eşleşen sonuç yok. Aramayı veya filtreleri değiştirin.", prev: "Önceki", next: "Sonraki", km: "km",
  },
  business: {
    about: "Hakkında", hours: "Çalışma saatleri", closed: "Kapalı", open24: "24 saat", open: "Şimdi açık", closedNow: "Şimdi kapalı",
    days: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
    products: "Ürünler ve hizmetler", gallery: "Galeri", address: "Adres", openInMaps: "Haritada aç",
    share: "Paylaş", copied: "Bağlantı kopyalandı", follow: "Takip et", following: "Takip ediliyor", followers: "takipçi", views: "görüntülenme",
    loginToFollow: "Takip için giriş yapın", rating: "Puan", contact: "İletişim", currency: { IQD: "IQD", USD: "$" }, unavailable: "Mevcut değil",
  },
  map: {
    title: "Harita", all: "Tümü", nearMe: "Bana en yakın", locating: "Konumunuz belirleniyor…", locationDenied: "Konum alınamadı",
    youAreHere: "Konumunuz", viewPage: "Sayfayı gör", nearest: "Size en yakın", places: "işletme",
  },
};

const en: Dictionary = {
  appName: "Kirkuk Guide",
  tagline: "Everything you need in Kirkuk, in one place",
  nav: { home: "Home", categories: "Categories", account: "Account", login: "Log in", search: "Search", map: "Map" },
  common: {
    call: "Call", whatsapp: "WhatsApp", verified: "Verified", featured: "Featured", openNow: "Open now",
    all: "All", empty: "Nothing here yet", back: "Back", save: "Save", saving: "Saving…",
    loading: "Loading…", theme: "Toggle theme", language: "Language", error: "Something went wrong, please try again",
  },
  home: {
    categories: "Browse categories", duty: "Pharmacies on duty today",
    dutyEmpty: "Today's duty roster hasn't been added yet", districts: "Neighbourhoods",
    setupTitle: "The platform isn't connected to a database yet",
    setupBody: "Add your Supabase keys to .env.local and restart (see README).",
  },
  category: { businesses: "Businesses", noBusinesses: "No businesses in this category yet", sub: "Subcategories" },
  auth: {
    title: "Welcome to Kirkuk Guide", subtitle: "Log in to follow, review and post",
    tabPhone: "Phone", tabEmail: "Email",
    phone: "Phone number", phoneHint: "e.g. 07701234567", sendCode: "Send verification code",
    code: "Verification code", codeHint: "Enter the 6-digit code sent to", verify: "Verify", changeNumber: "Change number",
    resend: "Resend code", email: "Email", password: "Password",
    signIn: "Log in", signUp: "Create account", haveAccount: "Already have an account?", noAccount: "No account yet?",
    google: "Continue with Google", or: "or", checkEmail: "Check your email to confirm your account, then log in.",
    invalidPhone: "Invalid Iraqi phone number", invalidCode: "Incorrect code", invalidEmail: "Invalid email",
    shortPassword: "Password must be at least 8 characters", notConfigured: "Login service is not configured yet",
    logout: "Log out", terms: "By continuing you agree to the Terms of Use and Privacy Policy.",
  },
  account: {
    title: "My account", fullName: "Full name", username: "Username", bio: "Bio", saved: "Saved",
    usernameInvalid: "3–30 chars: lowercase letters, digits and _", nameRequired: "Name is required",
    role: "Role", roles: { user: "User", owner: "Business owner", moderator: "Moderator", admin: "Admin" },
    usernameTaken: "Username already taken",
  },

  search: {
    title: "Search", placeholder: "Search restaurants, pharmacies, electricians…", submit: "Search", filters: "Filters", reset: "Clear filters",
    category: "Category", district: "Area / neighbourhood", anyCategory: "All categories", anyDistrict: "All areas",
    minRating: "Rating", anyRating: "Any rating", ratingUp: "& up", openNow: "Open now", verifiedOnly: "Verified only",
    sort: "Sort by", sorts: { relevance: "Best match", nearest: "Nearest", rating: "Top rated", newest: "Newest" },
    nearMe: "Near me", locating: "Finding your location…", locationDenied: "Couldn't get your location. Enable location access.",
    results: "results", noResults: "No matching results. Try changing your search or filters.", prev: "Previous", next: "Next", km: "km",
  },
  business: {
    about: "About", hours: "Opening hours", closed: "Closed", open24: "24 hours", open: "Open now", closedNow: "Closed now",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    products: "Products & services", gallery: "Gallery", address: "Address", openInMaps: "Open in maps",
    share: "Share", copied: "Link copied", follow: "Follow", following: "Following", followers: "followers", views: "views",
    loginToFollow: "Log in to follow", rating: "Rating", contact: "Contact", currency: { IQD: "IQD", USD: "$" }, unavailable: "Unavailable",
  },
  map: {
    title: "Map", all: "All", nearMe: "Near me", locating: "Finding your location…", locationDenied: "Couldn't get your location",
    youAreHere: "You are here", viewPage: "View page", nearest: "Nearest to you", places: "places",
  },
};

export const dictionaries: Record<"ar" | "ku" | "tr" | "en", Dictionary> = { ar, ku, tr, en };
