"use client";

import { Download, FileUp } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toImportRows, type ImportTable } from "@/lib/csv";
import { importPlacesAction, type ImportReport } from "./actions";

const CODE_AR: Record<string, string> = {
  name: "الاسم ناقص أو غير صالح", category: "القسم غير معروف (استخدم slug من الجدول)", district: "الحي غير معروف", coords: "الإحداثيات ناقصة أو خارج النطاق",
  far_from_city: "الموقع بعيد عن المدينة (تحقق من lat/lng)", hours: "الساعات يجب أن تكون HH:MM معاً (open و close)", price: "مستوى السعر 1 إلى 4",
};

export function ImportForm() {
  const file = useRef<HTMLInputElement>(null);
  const [table, setTable] = useState<ImportTable | null>(null);
  const [name, setName] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = async (f: File | undefined) => {
    if (!f) return;
    setReport(null); setMsg(null); setName(f.name);
    setTable(toImportRows(await f.text()));
  };
  const run = (dry: boolean) => start(async () => {
    if (!table) return;
    setMsg(null);
    const r = await importPlacesAction(table.rows, dry);
    if (!r.ok) return setMsg(r.error === "not_allowed" ? "غير مصرّح" : r.error === "invalid" ? "الملف غير صالح أو يزيد عن 1000 صف" : "تعذّر التنفيذ");
    setReport(r.report);
    if (!dry) { setMsg(`تم إدخال ${r.report.inserted} مكاناً (غير موثّقة بعد: ابدأ جولات التحقق)`); setTable(null); setName(""); if (file.current) file.current.value = ""; }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <a href="/templates/places-template.csv" download className="inline-flex items-center gap-2 text-sm font-bold text-primary underline"><Download className="size-4" aria-hidden />تنزيل قالب CSV</a>
        <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => load(e.target.files?.[0])} />
        <Button variant="outline" onClick={() => file.current?.click()}><FileUp aria-hidden />{name || "اختر ملف CSV"}</Button>
      </div>

      {table && (
        <Card className="space-y-3 p-4">
          <p className="text-sm"><b>{table.rows.length}</b> صفاً في الملف.{table.unknownHeaders.length > 0 && <> أعمدة غير معروفة (ستُهمل): <bdi dir="ltr">{table.unknownHeaders.join(", ")}</bdi>.</>}</p>
          {table.missing.length > 0 ? <p role="alert" className="font-semibold text-destructive">أعمدة مطلوبة ناقصة: <bdi dir="ltr">{table.missing.join(", ")}</bdi></p> : (
            <div className="flex gap-2"><Button disabled={pending} onClick={() => run(true)}>فحص الملف (بدون حفظ)</Button>
              {report?.dry_run && report.valid > 0 && <Button variant="success" disabled={pending} onClick={() => { if (confirm(`إدخال ${report.valid} مكاناً؟`)) run(false); }}>إدخال {report.valid} مكاناً</Button>}</div>
          )}
        </Card>
      )}

      {report && (
        <Card className="space-y-3 p-4" aria-live="polite">
          <p className="flex flex-wrap items-center gap-2 font-bold">نتيجة الفحص <Badge tone="success">صالح {report.valid}</Badge><Badge tone="accent">أخطاء {report.errors.length}</Badge><Badge>مكرر {report.duplicates.length}</Badge></p>
          {report.errors.length > 0 && (
            <ul className="max-h-60 space-y-1 overflow-auto text-sm">{report.errors.map((e) => <li key={e.row}><b>صف {e.row + 1}</b> {e.name && <span className="text-muted-foreground">({e.name})</span>}: {CODE_AR[e.code] ?? e.code}</li>)}</ul>
          )}
          {report.duplicates.length > 0 && (
            <details className="text-sm"><summary className="cursor-pointer font-semibold">الصفوف المكررة (ستُتجاهل)</summary>
              <ul className="mt-1 list-disc ps-5">{report.duplicates.map((d) => <li key={d.row}>صف {d.row + 1}: {d.name}</li>)}</ul></details>
          )}
        </Card>
      )}
      {msg && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm font-semibold text-success">{msg}</p>}
    </div>
  );
}
