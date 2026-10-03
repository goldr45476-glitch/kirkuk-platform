# دليل كركوك العام — Kirkuk Guide

منصة اجتماعية + دليل أعمال لمحافظة كركوك. Next.js 15 (App Router) · TypeScript · Tailwind · Supabase.

## الحالة: المرحلة 1 ✅
هيكل المشروع، نظام التصميم (RTL + وضع ليلي)، i18n (ar / ku / tr / en)، قاعدة البيانات الكاملة مع RLS،
تسجيل الدخول (هاتف OTP + بريد + Google)، الصفحة الرئيسية والأقسام وحساب المستخدم.

## التشغيل المحلي
```bash
npm install
cp .env.example .env.local     # ثم املأ مفاتيح Supabase
npm run dev                    # http://localhost:3000
```
بدون مفاتيح Supabase يعمل التطبيق بحالة فارغة مع تنبيه (لا ينهار).

### 1) إنشاء مشروع Supabase
1. أنشئ مشروعاً على supabase.com، وانسخ `Project URL` و`anon key` إلى `.env.local`.
2. في **SQL Editor** نفّذ بالترتيب: `supabase/migrations/0001_schema.sql` ثم `supabase/seed.sql`
   (أو `supabase db push` عبر Supabase CLI).
3. **Authentication → Providers**:
   - *Phone*: فعّله واربطه بمزوّد SMS (Twilio / MessageBird / Vonage). الـ OTP يتطلب مزوّداً مدفوعاً؛ استخدم *Test phone numbers* أثناء التطوير.
   - *Email*: مفعّل افتراضياً. *Google*: أضف Client ID/Secret.
   - **URL Configuration**: ضع Site URL = رابط موقعك، وأضف `<site>/auth/callback` إلى Redirect URLs.
4. ترقية أول مدير (بعد أن تسجّل دخولك مرة):
```sql
update public.profiles set role = 'admin' where id = '<UUID-من-auth.users>';
```

### الفحوصات
```bash
node scripts/check-migration.mjs   # يشغّل migration + seed على Postgres داخل الذاكرة (PGlite)
npm test                           # اختبارات الوحدة
npm run typecheck && npm run lint
```

## البنية
```
src/app/            الصفحات (App Router): (main)/ للواجهة، login/، auth/callback
src/components/     ui/ (Button, Input, Card…) و layout/ (Header, BottomNav…)
src/features/       منطق كل ميزة (auth …)
src/lib/            supabase/ (client, server, middleware)، i18n/، data.ts، phone.ts
supabase/           migrations/ و seed.sql
```

## قرارات تقنية
- **i18n بالكوكي** (`locale`) بدل بادئة المسار: أبسط وأسرع الآن؛ يمكن الانتقال لـ `/ar/...` لاحقاً لتحسين SEO متعدد اللغات.
- **التركمانية** بكود `tr` (لهجة تركمان العراق اللاتينية قريبة من التركية)؛ الترجمات تحتاج مراجعة متحدث أصلي.
- **Tailwind v3 + مكونات على نمط shadcn** مكتوبة يدوياً (بدون CLI) لاستقرار البناء.
- **حماية الامتيازات في قاعدة البيانات**: triggers تمنع المستخدم من ترقية دوره أو توثيق/تمييز نشاطه بنفسه، وحدود معدّل على المنشورات والتعليقات والتقييمات والرسائل والبلاغات.
- **البحث**: عمود `search_norm` مُطبَّع (إزالة التشكيل وتوحيد الألف/الياء/التاء المربوطة) + فهرس `pg_trgm`؛ واجهة البحث في المرحلة 2.
- **التوقيت**: «مفتوح الآن» والمناوبات بتوقيت `Asia/Baghdad`.

## النشر (Vercel)
استورد المستودع، أضف متغيرات `.env.example` في إعدادات المشروع ثم Deploy. لا أسرار في الكود؛ `SUPABASE_SERVICE_ROLE_KEY` للخادم فقط.
