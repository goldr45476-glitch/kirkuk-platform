/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, newlines inside quotes, BOM, `,` or `;` delimiter). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** Accepted header names (English and Arabic) -> canonical field. */
export const HEADER_ALIASES: Record<string, string> = {
  name: "name", "الاسم": "name", "اسم_المكان": "name",
  category: "category", "القسم": "category", "التصنيف": "category",
  district: "district", "الحي": "district", "المنطقة": "district",
  phone: "phone", "الهاتف": "phone", "رقم_الهاتف": "phone",
  address: "address", "العنوان": "address",
  lat: "lat", latitude: "lat", "خط_العرض": "lat",
  lng: "lng", lon: "lng", longitude: "lng", "خط_الطول": "lng",
  open: "open", "يفتح": "open", "الفتح": "open",
  close: "close", "يغلق": "close", "الإغلاق": "close",
  price_level: "price_level", price: "price_level", "مستوى_السعر": "price_level",
  description: "description", "الوصف": "description",
};

export interface ImportTable { rows: Record<string, string>[]; unknownHeaders: string[]; missing: string[] }

export function toImportRows(text: string): ImportTable {
  const grid = parseCsv(text);
  if (grid.length === 0) return { rows: [], unknownHeaders: [], missing: ["name", "category"] };
  const headers = grid[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase().replace(/\s+/g, "_")] ?? "");
  const unknownHeaders = grid[0].filter((_, i) => !headers[i]).map((h) => h.trim()).filter(Boolean);
  const missing = ["name", "category"].filter((f) => !headers.includes(f));
  const rows = grid.slice(1).map((cells) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) o[h] = (cells[i] ?? "").trim(); });
    return o;
  });
  return { rows, unknownHeaders, missing };
}
