# النشر خطوة بخطوة (Supabase + Railway)

## 1) Supabase
1. أنشئ مشروعاً (المنطقة الأقرب: Frankfurt/Bahrain إن توفرت).
2. SQL Editor: ألصق `supabase/bundle/schema.sql` (يُولَّد بـ `node scripts/bundle-sql.mjs`) ونفّذه مرة واحدة. أو استخدم `supabase db push`.
3. نفّذ `supabase/seed.sql` (يضيف الأحياء والأقسام والخطط + بيانات تجريبية)، ثم **فوراً** `supabase/cleanup-demo.sql` (يحذف التجريبي ويُبقي المرجعي؛ يتطلب `set app.confirm_cleanup='yes'` في أول الملف).
4. Authentication → Providers: Email مفعّل؛ Phone + مزوّد SMS؛ Google (Client ID/Secret).
5. Authentication → URL Configuration: Site URL = نطاقك، وRedirect URLs تحوي `<site>/auth/callback`.
6. Project Settings → API: انسخ URL وanon key وservice_role key (الأخير سرّي).

## 2) Railway
1. New Project → Deploy from GitHub repo → اختر `goldr45476-glitch/kirkuk-platform` والفرع المطلوب (`railway.json` يضبط الأمر ومسار الصحة).
2. Variables (قبل أول بناء، لأن `NEXT_PUBLIC_*` تُدمج وقت البناء):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CITY=kirkuk`, `NEXT_PUBLIC_CONTACT_WHATSAPP`
   وللإشعارات: ناتج `node scripts/generate-vapid.mjs` (أربعة متغيرات).
3. Settings → Networking → Generate Domain (أو نطاقك الخاص)، ثم حدّث `NEXT_PUBLIC_SITE_URL` وSupabase Redirect URLs وأعد النشر.
4. Cron للإشعارات (خدمة Cron منفصلة، كل دقيقة):
   `curl -fsS -X POST -H "x-push-secret: $PUSH_DISPATCH_SECRET" "$SITE/api/push/dispatch"`

## 3) أول مدير
سجّل الدخول بحسابك على الموقع، ثم نفّذ `supabase/first-admin.sql` (بعد وضع بريدك/هاتفك).

## 4) تحقق
- محلياً قبل الدفع: `node --env-file=.env.local scripts/preflight.mjs --db` (يفحص المتغيرات وقاعدة البيانات والـ buckets).
- بعد النشر: `npm run smoke -- https://your-domain` ثم `/admin/push` و`/admin/kpis`.
- ثم استورد الأماكن عبر `/admin/import` وتابع `docs/LAUNCH.md`.
