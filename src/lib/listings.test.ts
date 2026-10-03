import { describe, expect, it } from "vitest";
import { detailsSchema, listingSchema } from "./listings";
import { formatPrice, listingFacts } from "./listing-facts";
import { dictionaries } from "./i18n/dictionaries";

const base = { kind: "property", title: "شقة للإيجار", description: "", price: "450000", currency: "IQD", districtId: "3", phone: "07701234567", images: [], details: {} };

describe("listingSchema", () => {
  it("coerces form strings", () => {
    const r = listingSchema.parse(base);
    expect(r.price).toBe(450000); expect(r.districtId).toBe(3); expect(r.description).toBeNull();
  });
  it("empty price means negotiable", () => expect(listingSchema.parse({ ...base, price: "" }).price).toBeNull());
  it.each([{ title: "ab" }, { phone: "abc" }, { currency: "EUR" }, { kind: "boat" }])("rejects %j", (o) =>
    expect(listingSchema.safeParse({ ...base, ...o }).success).toBe(false));
});

describe("detailsSchema", () => {
  it("property requires deal/type/area", () => {
    expect(detailsSchema.property.safeParse({ deal: "rent", type: "apartment", area_m2: "120", rooms: "" }).success).toBe(true);
    expect(detailsSchema.property.safeParse({ deal: "rent", type: "apartment" }).success).toBe(false);
    expect(detailsSchema.property.safeParse({ deal: "lease", type: "apartment", area_m2: 1 }).success).toBe(false);
  });
  it("vehicle year range", () => {
    expect(detailsSchema.vehicle.safeParse({ deal: "sale", type: "car", year: "2018" }).success).toBe(true);
    expect(detailsSchema.vehicle.safeParse({ deal: "sale", type: "car", year: "1800" }).success).toBe(false);
  });
  it("strips unknown keys", () => {
    const r = detailsSchema.job.parse({ type: "offer", employment: "full", evil: "<script>" });
    expect(r).not.toHaveProperty("evil");
  });
});

describe("listing facts", () => {
  const t = dictionaries.en;
  it("formats price", () => {
    expect(formatPrice(450000, "IQD", t, "en")).toBe("450,000 IQD");
    expect(formatPrice(null, "USD", t, "en")).toBe(t.listings.negotiable);
  });
  it("property facts", () =>
    expect(listingFacts({ kind: "property", details: { deal: "rent", type: "apartment", area_m2: 130, rooms: 3 } }, t)).toEqual(["For rent", "Apartment", "130 m²", "3 rooms"]));
});
