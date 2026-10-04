import { describe, expect, it } from "vitest";
import { buildPayload, dispatch, type PendingPush } from "./push-dispatch";

const sub = (e: string) => ({ endpoint: e, keys: { p256dh: "a", auth: "b" } });
const n = (id: string, subs: string[], over: Partial<PendingPush> = {}): PendingPush => ({
  id, user_id: "u", type: "review", data: null, post_id: null, actor_name: "علي", business_name: "كافيه", business_slug: "cafe", locale: "ar", subscriptions: subs.map(sub), ...over,
});

describe("push dispatch", () => {
  it("builds a localized payload with deep link", () => {
    expect(buildPayload(n("1", ["x"], { locale: "en" }))).toEqual({ title: "Notifications", body: "علي reviewed كافيه", url: "/business/cafe#reviews", tag: "1" });
    expect(buildPayload(n("1", ["x"], { locale: null })).title).toBe("الإشعارات");
  });
  it("marks delivered, deletes gone endpoints, retries transient failures", async () => {
    const send = async (s: { endpoint: string }) => (s.endpoint === "ok" ? { ok: true as const } : s.endpoint === "gone" ? { ok: false as const, gone: true } : { ok: false as const, gone: false });
    const r = await dispatch([n("a", ["ok", "gone"]), n("b", ["gone"]), n("c", ["flaky"]), n("d", ["flaky", "ok"])], send);
    expect(r.done.sort()).toEqual(["a", "b", "d"]);
    expect(r.dead).toEqual(["gone"]);
    expect(r.sent).toBe(2); expect(r.failed).toBe(4);
  });
  it("a throwing sender counts as a transient failure", async () => {
    const r = await dispatch([n("a", ["x"])], async () => { throw new Error("boom"); });
    expect(r.done).toEqual([]);
  });
});
