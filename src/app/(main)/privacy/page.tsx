import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "سياسة الخصوصية | Privacy" };

export default function Privacy() {
  return <LegalPage title={{ ar: "سياسة الخصوصية", en: "Privacy policy" }} updated="2026-10-03"
    ar={[
      { h: "ما الذي نجمعه", p: ["رقم هاتفك أو بريدك الإلكتروني لتسجيل الدخول، واسمك وصورتك إن أضفتهما.", "المحتوى الذي تنشره: منشورات، تقييمات، اقتراحات أماكن، صور، وإعلانات.", "أحداث استخدام مجمّعة (مشاهدة، اتصال، اتجاهات، حفظ) لنعرض لأصحاب الأنشطة إحصائيات عن نشاطهم ولنحسّن المنصة.", "موقعك الجغرافي لا يُجمع إلا عند ضغطك على «الأقرب إليّ» أو «استخدم موقعي»، ويُستخدم لحساب المسافات فقط ولا يُخزَّن."] },
      { h: "كيف نستخدمها", p: ["لتشغيل حسابك، وعرض صفحات الأنشطة والتقييمات، ومنع السبام والاحتيال، وإرسال إشعارات تتعلق بنشاطك داخل المنصة.", "لا نبيع بياناتك الشخصية لأي طرف."] },
      { h: "ما يراه الآخرون", p: ["اسمك وصورتك ومنشوراتك وتقييماتك العلنية تظهر للجميع. رقم هاتفك وبريدك لا يظهران للمستخدمين الآخرين.", "المستندات التي ترفعها لإثبات ملكية نشاط تُحفظ في مخزن خاص ولا يطّلع عليها إلا فريق المراجعة."] },
      { h: "حقوقك", p: ["يمكنك تعديل بياناتك من صفحة «حسابي» في أي وقت.", "يمكنك حذف حسابك نهائياً من «حسابي ← حذف حسابي»؛ يُحذف حسابك ومنشوراتك وتقييماتك ومحفوظاتك. الأنشطة التي تملكها تبقى منشورة بدون مالك.", "للاستفسار أو لطلب مساعدة تواصل معنا عبر زر الإبلاغ داخل المنصة."] },
      { h: "الأمان والاحتفاظ", p: ["نستخدم اتصالاً مشفراً وصلاحيات وصول صارمة على قاعدة البيانات. لا يوجد نظام آمن بالكامل، لكننا نراجع الصلاحيات بشكل دوري.", "نحتفظ ببيانات الحساب ما دام حسابك قائماً، وبسجلات المراجعة الإدارية مدة محدودة لأغراض الأمان."] },
    ]}
    en={[
      { h: "What we collect", p: ["Your phone number or email to sign you in, plus your name and photo if you add them.", "Content you publish: posts, reviews, place suggestions, photos and ads.", "Aggregated usage events (view, call, directions, save) so business owners can see how their page performs and so we can improve the product.", "Your location is only read when you tap “Near me” or “Use my location”; it is used to compute distances and is not stored."] },
      { h: "How we use it", p: ["To run your account, show business pages and reviews, prevent spam and fraud, and send in-app notifications about your activity.", "We do not sell your personal data."] },
      { h: "What others can see", p: ["Your name, photo, posts and public reviews are visible to everyone. Your phone number and email are not shown to other users.", "Documents you upload to prove business ownership are kept in a private store visible only to the review team."] },
      { h: "Your rights", p: ["You can edit your details from “My account” at any time.", "You can permanently delete your account from My account → Delete my account; your account, posts, reviews and saved items are removed. Businesses you own stay published without an owner.", "For questions or help, contact us through the in-app report button."] },
      { h: "Security & retention", p: ["We use encrypted connections and strict database access rules. No system is perfectly secure, but we review permissions regularly.", "We keep account data while your account exists, and administrative audit logs for a limited time for security purposes."] },
    ]} />;
}
