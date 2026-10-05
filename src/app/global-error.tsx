"use client";

/** Last-resort boundary (root layout itself failed): no Tailwind/fonts guaranteed, so inline styles. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", background: "#faf8f3", color: "#1b2330" }}>
        <div>
          <h1 style={{ fontSize: 22 }}>حدث خطأ غير متوقع</h1>
          <p style={{ color: "#666" }}>Something went wrong</p>
          <button onClick={reset} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 10, border: 0, background: "#0f766e", color: "#fff", fontWeight: 700 }}>حاول مجدداً / Retry</button>
        </div>
      </body>
    </html>
  );
}
