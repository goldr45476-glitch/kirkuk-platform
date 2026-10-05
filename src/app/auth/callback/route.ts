import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";

// OAuth / email-confirmation landing: exchanges the code for a session cookie.
export async function GET(request: NextRequest) {
  // Behind Railway's proxy nextUrl.origin is the internal host (localhost:8080), so redirect to the public site URL.
  const { searchParams } = request.nextUrl;
  const origin = SITE_URL.replace(/\/$/, "");
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
