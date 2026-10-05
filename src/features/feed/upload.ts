import { compressToWebp } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

/** Compresses and uploads to `<bucket>/<uid>/<uuid>.webp`; returns the public URL. */
export async function uploadImage(file: File, bucket: "post-media" | "business-media") {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not_authenticated");
  const { blob, width, height } = await compressToWebp(file);
  const path = `${auth.user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return { url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, width, height };
}

/** Private bucket (ownership proofs). Returns the storage path; only staff and the uploader can read it. */
export async function uploadPrivate(file: File) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not_authenticated");
  const { blob } = await compressToWebp(file, 1800, 0.85);
  const path = `${auth.user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("verification").upload(path, blob, { contentType: "image/webp" });
  if (error) throw error;
  return path;
}

export const MAX_REEL_BYTES = 30 * 1024 * 1024;
export const MAX_REEL_SECONDS = 90;

/** Uploads a short video to `reels/<uid>/<uuid>.<ext>`; returns the public URL. */
export async function uploadReel(file: File) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not_authenticated");
  const ext = file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4";
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("reels").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("reels").getPublicUrl(path).data.publicUrl;
}

/** Reads the duration without uploading; rejects files the browser can't decode. */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    v.src = url;
  });
}
