import { createClient } from "@/lib/supabase/server";

export interface Overview {
  pending_submissions: number; pending_claims: number; open_reports: number; pending_events: number; pending_businesses: number;
  businesses: number; unverified: number; stale: number; users: number; weekly_active: number; events_7d: number; contacts_7d: number;
}
export async function getOverview(): Promise<Overview | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_overview");
  return (data as Overview | null) ?? null;
}

export interface QueueSubmission { id: string; type: string; payload: Record<string, string | number | boolean | null>; created_at: string; submitter: { full_name: string; phone: string | null } | null; business: { name: string } | null }
export interface QueueClaim { id: string; phone: string; created_at: string; proof_url: string | null; business: { id: string; name: string; slug: string } | null; claimant: { full_name: string } | null }
export interface QueueReport { id: string; target_type: string; target_id: string; reason: string; details: string | null; created_at: string; reporter: { full_name: string } | null; preview: string }
export interface QueueEvent { id: string; title: string; details: string | null; category: string | null; starts_at: string; venue_name: string | null; creator: { full_name: string } | null }

export async function getReviewQueues() {
  const supabase = await createClient();
  const [subs, claims, reports, events] = await Promise.all([
    supabase.from("submissions").select("id, type, payload, created_at, submitter:profiles!submissions_user_id_fkey(full_name, phone), business:businesses(name)").eq("status", "pending").order("created_at").limit(50),
    supabase.from("claims").select("id, phone, proof_path, created_at, business:businesses(id, name, slug), claimant:profiles!claims_user_id_fkey(full_name)").eq("status", "pending").order("created_at").limit(50),
    supabase.from("reports").select("id, target_type, target_id, reason, details, created_at, reporter:profiles!reports_reporter_id_fkey(full_name)").eq("status", "open").order("created_at").limit(50),
    supabase.from("events").select("id, title, details, category, starts_at, venue_name, creator:profiles!events_created_by_fkey(full_name)").eq("status", "pending").order("created_at").limit(50),
  ]);

  // proof photos live in the private bucket: short-lived signed URLs, staff only
  const claimRows = await Promise.all(((claims.data ?? []) as unknown as (Omit<QueueClaim, "proof_url"> & { proof_path: string | null })[]).map(async ({ proof_path, ...c }) => {
    const signed = proof_path ? await supabase.storage.from("verification").createSignedUrl(proof_path, 600) : null;
    return { ...c, proof_url: signed?.data?.signedUrl ?? null } as QueueClaim;
  }));

  // human-readable preview of what was reported
  const reportRows = await Promise.all(((reports.data ?? []) as unknown as Omit<QueueReport, "preview">[]).map(async (r) => {
    const table = { post: "posts", comment: "comments", review: "reviews", listing: "listings", business: "businesses" }[r.target_type];
    const col = { post: "body", comment: "body", review: "body", listing: "title", business: "name" }[r.target_type];
    let preview = "";
    if (table && col) { const { data } = await supabase.from(table).select(col).eq("id", r.target_id).maybeSingle(); preview = String((data as unknown as Record<string, string> | null)?.[col] ?? "").slice(0, 200); }
    return { ...r, preview } as QueueReport;
  }));

  return { submissions: (subs.data ?? []) as unknown as QueueSubmission[], claims: claimRows, reports: reportRows, events: (events.data ?? []) as unknown as QueueEvent[] };
}

export interface AdminBusiness { id: string; slug: string; name: string; status: string; is_verified: boolean; is_featured: boolean; featured_until: string | null; last_verified_at: string | null; created_at: string; owner_id: string | null }
export async function searchAdminBusinesses(q: string, filter: string): Promise<AdminBusiness[]> {
  const supabase = await createClient();
  let query = supabase.from("businesses").select("id, slug, name, status, is_verified, is_featured, featured_until, last_verified_at, created_at, owner_id").order("created_at", { ascending: false }).limit(60);
  if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_]/g, "")}%`);
  if (filter === "pending") query = query.eq("status", "pending");
  if (filter === "unverified") query = query.eq("status", "active").is("last_verified_at", null);
  if (filter === "stale") query = query.eq("status", "active").lt("last_verified_at", new Date(Date.now() - 60 * 86400e3).toISOString());
  if (filter === "suspended") query = query.eq("status", "suspended");
  const { data } = await query;
  return (data ?? []) as AdminBusiness[];
}

export interface AdminUser { id: string; full_name: string; phone: string | null; role: string; is_banned: boolean; created_at: string }
export async function searchAdminUsers(q: string): Promise<AdminUser[]> {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, full_name, phone, role, is_banned, created_at").order("created_at", { ascending: false }).limit(50);
  const s = q.trim().replace(/[%_,()]/g, "");
  if (s) query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%`);
  const { data } = await query;
  return (data ?? []) as AdminUser[];
}

export async function getAudit() {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("id, action, entity, entity_id, detail, created_at, actor_id").order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as { id: number; action: string; entity: string; entity_id: string | null; detail: Record<string, unknown>; created_at: string; actor_id: string | null }[];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));
  return rows.map((r) => ({ ...r, actor: r.actor_id ? { full_name: name.get(r.actor_id) ?? r.actor_id.slice(0, 8) } : null }));
}

export type PushStats = {
  subscribed_users: number; devices: number; backlog: number; oldest_backlog_min: number;
  pushed_24h: number; last_pushed_at: string | null; opted_out_social: number; prefs_rows: number;
};
export async function getPushStats(): Promise<PushStats | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_push_stats");
  return (data as PushStats) ?? null;
}
