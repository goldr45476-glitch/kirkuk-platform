import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Counts the click, then redirects to the advertiser's link (https only) or the business page. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // req.url carries the internal host behind the proxy; build absolute URLs from the public site URL.
  const base = SITE_URL.replace(/\/$/, "");
  const home = new URL("/", base);
  if (!z.string().uuid().safeParse(id).success) return NextResponse.redirect(home);
  const supabase = await createClient();
  const { data: target } = await supabase.rpc("ad_target", { p_id: id });
  if (typeof target !== "string") return NextResponse.redirect(home);
  await supabase.rpc("track_ad", { p_id: id, p_kind: "click" });
  const dest = target.startsWith("/") && !target.startsWith("//") ? new URL(target, base) : /^https:\/\//.test(target) ? new URL(target) : home;
  return NextResponse.redirect(dest, 307);
}
