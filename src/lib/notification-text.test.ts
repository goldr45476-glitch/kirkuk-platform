import { describe, expect, it } from "vitest";
import { dictionaries } from "./i18n/dictionaries";
import { notificationHref, notificationText } from "./notification-text";

const base = { data: null, post_id: null, actor_name: null, business_name: "كافيه", business_slug: "cafe" };
describe("notification text", () => {
  it("fills actor/business placeholders per locale", () => {
    expect(notificationText({ ...base, type: "follow", actor_name: "علي" }, dictionaries.ar.notifications)).toBe("علي بدأ بمتابعة كافيه");
    expect(notificationText({ ...base, type: "like" }, dictionaries.en.notifications)).toBe("Someone liked your post");
  });
  it("system events use the excerpt, unknown ones fall back", () => {
    expect(notificationText({ ...base, type: "system", data: { event: "offer_ending", excerpt: "خصم" } }, dictionaries.en.notifications)).toBe("Your saved offer “خصم” ends soon");
    expect(notificationText({ ...base, type: "system", data: { event: "zzz" } }, dictionaries.en.notifications)).toBe("New notification");
  });
  it("builds deep links", () => {
    expect(notificationHref({ ...base, type: "review" })).toBe("/business/cafe#reviews");
    expect(notificationHref({ ...base, type: "comment", post_id: "p1" })).toBe("/post/p1");
    expect(notificationHref({ ...base, type: "system", business_slug: null })).toBe("/notifications");
  });
});
