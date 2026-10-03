import { z } from "zod";

/**
 * Normalises an Iraqi mobile number to E.164 (+9647XXXXXXXXX).
 * Accepts 07XXXXXXXXX, 7XXXXXXXXX, 009647…, +9647…, and Arabic-Indic digits.
 * Returns null when invalid.
 */
export function normalizeIraqiPhone(input: string): string | null {
  const digits = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[^\d+]/g, "");
  const m = digits.replace(/^\+/, "").replace(/^00/, "").match(/^(?:964)?0?(7\d{9})$/);
  return m ? `+964${m[1]}` : null;
}

export const phoneSchema = z.string().transform((v, ctx) => {
  const n = normalizeIraqiPhone(v);
  if (!n) ctx.addIssue({ code: "custom", message: "invalid_phone" });
  return n as string;
});
