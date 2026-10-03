// Liveness probe for Railway (and uptime monitors). No database access on purpose.
export const dynamic = "force-dynamic";
export const GET = () => Response.json({ ok: true, time: new Date().toISOString() });
