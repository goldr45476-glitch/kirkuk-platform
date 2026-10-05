"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createReelAction } from "@/features/feed/actions";
import { MAX_REEL_BYTES, MAX_REEL_SECONDS, uploadReel, videoDuration } from "@/features/feed/upload";

const TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function ReelForm({ t, businesses }: { t: Dictionary; businesses: { id: string; name: string }[] }) {
  const r = t.reels;
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [biz, setBiz] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError(r.badType);
    if (f.size > MAX_REEL_BYTES) return setError(r.tooBig);
    try { if ((await videoDuration(f)) > MAX_REEL_SECONDS) return setError(r.tooLong); } catch { return setError(r.badType); }
    setFile(f); setPreview(URL.createObjectURL(f));
  };
  const publish = () => start(async () => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const videoUrl = await uploadReel(file);
      const res = await createReelAction({ businessId: biz || null, caption, videoUrl });
      if (!res.ok) throw new Error(res.error);
      router.push(`/reels?r=${res.data?.id ?? ""}`);
    } catch { setError(r.uploadError); setBusy(false); }
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">{r.newTitle}</h1>
      {preview ? <video src={preview} controls playsInline className="aspect-[9/16] max-h-[60dvh] w-full rounded-2xl bg-black object-contain" />
        : <input type="file" accept={TYPES.join(",")} onChange={(e) => pick(e.target.files?.[0])} aria-label={r.pick} className="block w-full rounded-2xl border-2 border-dashed p-8 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2.5 file:font-semibold file:text-primary-foreground" />}
      <p className="text-xs text-muted-foreground">{r.hint}</p>
      {businesses.length > 0 && (
        <select value={biz} onChange={(e) => setBiz(e.target.value)} aria-label={r.postAs} className="h-11 w-full rounded-lg border border-input bg-card px-3">
          <option value="">{r.personal}</option>
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      <Input value={caption} maxLength={300} onChange={(e) => setCaption(e.target.value)} placeholder={r.caption} />
      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
      <Button className="w-full" disabled={!file || busy || pending} onClick={publish}>{busy || pending ? r.publishing : r.publish}</Button>
    </div>
  );
}
