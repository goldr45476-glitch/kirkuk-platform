// UI strings. Arabic is the source of truth; other locales must match its shape.
const ar = {
  appName: "دليل كركوك",
  tagline: "كل ما تحتاجه في كركوك، في مكان واحد",
  nav: { home: "الرئيسية", categories: "الأقسام", account: "حسابي", login: "دخول" },
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
};

export type Dictionary = typeof ar;

const ku: Dictionary = {
  appName: "ڕێنمای کەرکووک",
  tagline: "هەموو پێداویستییەکانت لە کەرکووک، لە یەک شوێن",
  nav: { home: "سەرەکی", categories: "بەشەکان", account: "هەژمارەکەم", login: "چوونەژوورەوە" },
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
};

const tr: Dictionary = {
  appName: "Kerkük Rehberi",
  tagline: "Kerkük'te ihtiyacınız olan her şey, tek yerde",
  nav: { home: "Ana Sayfa", categories: "Kategoriler", account: "Hesabım", login: "Giriş" },
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
};

const en: Dictionary = {
  appName: "Kirkuk Guide",
  tagline: "Everything you need in Kirkuk, in one place",
  nav: { home: "Home", categories: "Categories", account: "Account", login: "Log in" },
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
};

export const dictionaries: Record<"ar" | "ku" | "tr" | "en", Dictionary> = { ar, ku, tr, en };
