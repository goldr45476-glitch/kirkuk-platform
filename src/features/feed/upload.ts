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
