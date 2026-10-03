import type { MetadataRoute } from "next";
import { SITE_URL, supabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = ["", "/collections", "/categories", "/search", "/map", "/where", "/offers", "/events", "/real-estate", "/cars", "/jobs", "/live/pharmacies", "/live/fuel", "/live/water"].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now }));
  if (!supabaseConfigured) return entries;
  const sb = createPublicClient();
  const [{ data: cats }, { data: biz }] = await Promise.all([
    sb.from("categories").select("slug").eq("is_active", true),
    sb.from("businesses").select("slug, updated_at").eq("status", "active").limit(5000),
  ]);
  const { data: cols } = await sb.from("collections").select("slug").eq("status", "published");
  cols?.forEach((c) => entries.push({ url: `${SITE_URL}/collections/${c.slug}`, lastModified: now }));
  cats?.forEach((c) => entries.push({ url: `${SITE_URL}/categories/${c.slug}`, lastModified: now }));
  biz?.forEach((b) => entries.push({ url: `${SITE_URL}/business/${b.slug}`, lastModified: new Date(b.updated_at) }));
  return entries;
}
