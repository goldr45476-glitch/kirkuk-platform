import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "سياسة المحتوى | Content policy" };

export default function ContentPolicy() {
  return <LegalPage title={{ ar: "سياسة المحتوى", en: "Content policy" }} updated="2026-10-03"
    ar={[
      { h: "المبدأ", p: ["منصة لكل أهل كركوك بمختلف مكوناتهم: العرب والكرد والتركمان والمسيحيون وغيرهم. نلتزم الحياد التام ونمنع كل محتوى يحرّض على الكراهية أو التمييز أو العنف."] },
      { h: "ممنوع", p: ["الإساءة الشخصية والتهديد والتحرش، والمحتوى الجنسي أو العنيف.", "الاحتيال والإعلانات الوهمية والتقييمات المزيفة أو المدفوعة.", "السلع والخدمات غير القانونية، وانتحال شخصية أو جهة.", "نشر بيانات خاصة عن أشخاص دون إذنهم.", "الدعاية السياسية أو الحزبية في صفحات الأنشطة والتقييمات."] },
      { h: "كيف نطبّق", p: ["يمكنك الإبلاغ عن أي منشور أو تعليق أو تقييم أو إعلان أو نشاط. يراجع فريق بشري كل بلاغ ويمكنه إخفاء المحتوى أو إيقاف الحساب.", "اقتراحات الأماكن والفعاليات تُراجع قبل النشر."] },
      { h: "الاعتراض", p: ["إن رأيت أن إجراءً اتُّخذ ضدك خاطئ فتواصل معنا وسنعيد المراجعة."] },
    ]}
    en={[
      { h: "Principle", p: ["A platform for everyone in Kirkuk — Arabs, Kurds, Turkmens, Christians and others. We stay strictly neutral and prohibit content that incites hatred, discrimination or violence."] },
      { h: "Not allowed", p: ["Personal abuse, threats and harassment; sexual or violent content.", "Fraud, fake listings and fake or paid reviews.", "Illegal goods or services; impersonation.", "Publishing people's private data without permission.", "Political or party propaganda on business pages and reviews."] },
      { h: "Enforcement", p: ["You can report any post, comment, review, ad or business. A human team reviews every report and may hide content or suspend accounts.", "Place and event suggestions are reviewed before they go live."] },
      { h: "Appeals", p: ["If you believe an action against you was wrong, contact us and we will review it again."] },
    ]} />;
}
