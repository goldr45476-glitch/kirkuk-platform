import { z } from "zod";

export type ListingKind = "property" | "vehicle" | "job";

/** Route segment for each classifieds section. */
export const KIND_ROUTE: Record<ListingKind, string> = { property: "/real-estate", vehicle: "/cars", job: "/jobs" };
export const ROUTE_KIND: Record<string, ListingKind> = { "real-estate": "property", cars: "vehicle", jobs: "job" };

export const PROPERTY_TYPES = ["apartment", "house", "villa", "land", "shop", "office"] as const;
export const VEHICLE_TYPES = ["car", "motorcycle", "parts"] as const;
export const EMPLOYMENT = ["full", "part", "contract", "freelance"] as const;

const num = (max: number) => z.coerce.number().int().min(0).max(max);
const optNum = (max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), num(max).optional());
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

/** Kind-specific attributes stored in listings.details (validated on the server). */
export const detailsSchema = {
  property: z.object({
    deal: z.enum(["sale", "rent"]), type: z.enum(PROPERTY_TYPES), area_m2: num(1_000_000),
    rooms: optNum(50), baths: optNum(50), floor: optNum(200),
  }),
  vehicle: z.object({
    deal: z.enum(["sale", "wanted"]), type: z.enum(VEHICLE_TYPES), make: optText(40), model: optText(40),
    year: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1950).max(2100).optional()),
    mileage_km: optNum(2_000_000), fuel: optText(20),
  }),
  job: z.object({ type: z.enum(["offer", "seeking"]), employment: z.enum(EMPLOYMENT), salary: optText(60) }),
} as const;

export const listingSchema = z.object({
  kind: z.enum(["property", "vehicle", "job"]),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional().transform((v) => v || null),
  price: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(0).max(1e12).nullable()),
  currency: z.enum(["IQD", "USD"]),
  districtId: z.coerce.number().int().positive().nullable(),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/),
  images: z.array(z.string().url()).max(6),
  details: z.record(z.string(), z.unknown()),
});

export type ListingInput = z.input<typeof listingSchema>;
