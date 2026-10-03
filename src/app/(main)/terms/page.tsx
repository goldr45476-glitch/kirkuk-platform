import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "شروط الاستخدام | Terms" };

export default function Terms() {
  return <LegalPage title={{ ar: "شروط الاستخدام", en: "Terms of use" }} updated="2026-10-03"
    ar={[
      { h: "القبول", p: ["باستخدامك المنصة فإنك توافق على هذه الشروط وعلى سياسة الخصوصية وسياسة المحتوى."] },
      { h: "الحسابات", p: ["أنت مسؤول عن نشاط حسابك، ويجب أن تكون المعلومات التي تقدمها صحيحة.", "يحق لنا إيقاف الحسابات التي تخالف الشروط أو تسيء لغيرها."] },
      { h: "أصحاب الأنشطة", p: ["المعلومات التي تضيفها عن نشاطك (ساعات، أسعار، عروض) تقع مسؤوليتها عليك، ونطلب تحديثها باستمرار.", "العروض تنتهي تلقائياً بانتهاء تاريخها. يحق للمراجعين تعديل أو إخفاء أي محتوى مخالف أو مضلل.", "الشارات («موثّق»، «مميّز») تمنحها الإدارة بعد مراجعة، وقد تُسحب عند مخالفة الشروط."] },
      { h: "التقييمات", p: ["تقييم واحد لكل مستخدم لكل مكان، ويجب أن يعكس تجربة حقيقية. يُمنع التقييم المدفوع أو الانتقامي أو المزيف."] },
      { h: "الإعلانات المبوّبة", p: ["المنصة وسيط عرض فقط ولا تتحقق من السلع أو تضمن الصفقات. تحقّق من البائع والسلعة قبل الدفع والتقِ في مكان عام."] },
      { h: "المسؤولية", p: ["نبذل جهدنا لتكون المعلومات صحيحة (ويظهر تاريخ «آخر تحقق») لكننا لا نضمن دقتها دائماً، ولا نتحمل مسؤولية قرارات تُبنى عليها دون تحقق.", "في الحالات العاجلة اتصل بالجهات المختصة مباشرة."] },
      { h: "التعديل", p: ["قد نحدّث هذه الشروط، وسنعرض تاريخ آخر تحديث أعلى الصفحة."] },
    ]}
    en={[
      { h: "Acceptance", p: ["By using the platform you agree to these terms, the privacy policy and the content policy."] },
      { h: "Accounts", p: ["You are responsible for activity on your account and for the accuracy of what you provide.", "We may suspend accounts that break the rules or harm others."] },
      { h: "Business owners", p: ["You are responsible for the information you add (hours, prices, offers) and should keep it up to date.", "Offers end automatically on their end date. Reviewers may edit or hide misleading or non-compliant content.", "Badges (“Verified”, “Featured”) are granted by the team after review and may be withdrawn."] },
      { h: "Reviews", p: ["One review per user per place, reflecting a real experience. Paid, retaliatory or fake reviews are prohibited."] },
      { h: "Classifieds", p: ["The platform only displays ads; it does not verify goods or guarantee deals. Check the seller and the item before paying and meet in a public place."] },
      { h: "Liability", p: ["We work to keep information accurate (a “last verified” date is shown) but cannot guarantee it, and we are not liable for decisions made without verification.", "In emergencies contact the relevant authorities directly."] },
      { h: "Changes", p: ["We may update these terms; the last-updated date is shown above."] },
    ]} />;
}
