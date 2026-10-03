"use client";

import { ImagePlus, Send, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createPostAction } from "./actions";
import { uploadImage } from "./upload";

interface Photo { url: string; width: number; height: number; preview: string }

export function Composer({ t, userName, avatar, businesses }: {
  t: Dictionary; userName: string; avatar: string | null; businesses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const c = t.composer;
  const file = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [as, setAs] = useState<string>("");
  const [offer, setOffer] = useState(false);
  const [ends, setEnds] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null); setUploading(true);
    try {
      const room = 4 - photos.length;
      const added: Photo[] = [];
      for (const f of Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room)) {
        const r = await uploadImage(f, "post-media");
        added.push({ ...r, preview: r.url });
      }
      setPhotos((p) => [...p, ...added]);
    } catch { setError(c.uploadError); }
    setUploading(false);
    if (file.current) file.current.value = "";
  };

  const submit = () => {
    if (!body.trim() && photos.length === 0) return setError(c.emptyPost);
    setError(null);
    start(async () => {
      const r = await createPostAction({
        body, businessId: as || null, isOffer: !!as && offer,
        offerEndsAt: offer && ends ? new Date(`${ends}T23:59:59+03:00`).toISOString() : null,
        media: photos.map(({ url, width, height }) => ({ url, width, height })),
      });
      if (!r.ok) return setError(r.error === "rate_limited" || r.error === "account_banned" ? t.post.errors[r.error] : t.post.errors.generic);
      setBody(""); setPhotos([]); setOffer(false); setEnds("");
      router.refresh();
    });
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex gap-3">
        <Avatar src={avatar} name={userName} />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} placeholder={c.placeholder} aria-label={c.placeholder} className="min-h-16 flex-1 resize-none border-0 bg-muted/50" />
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <li key={p.url} className="relative aspect-square overflow-hidden rounded-lg">
              <Image src={p.preview} alt="" fill sizes="25vw" className="object-cover" />
              <button type="button" aria-label={c.remove} onClick={() => setPhotos((l) => l.filter((_, j) => j !== i))} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"><X className="size-3.5" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}

      {businesses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="font-semibold" htmlFor="postas">{c.postAs}</label>
          <select id="postas" value={as} onChange={(e) => { setAs(e.target.value); if (!e.target.value) setOffer(false); }} className="h-9 rounded-lg border border-input bg-card px-2">
            <option value="">{c.me}</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {as && (
            <>
              <label className="flex items-center gap-1.5 font-semibold"><input type="checkbox" checked={offer} onChange={(e) => setOffer(e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" />{c.isOffer}</label>
              {offer && <Input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} aria-label={c.offerEnds} className="h-9 w-auto" min={new Date().toISOString().slice(0, 10)} />}
            </>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <div>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
          <Button type="button" variant="ghost" size="sm" onClick={() => file.current?.click()} disabled={uploading || photos.length >= 4} title={c.maxPhotos}>
            <ImagePlus aria-hidden />{uploading ? t.common.loading : c.addPhotos}
          </Button>
        </div>
        <Button onClick={submit} disabled={pending || uploading}><Send className="rtl:-scale-x-100" aria-hidden />{pending ? c.publishing : c.publish}</Button>
      </div>
    </Card>
  );
}
