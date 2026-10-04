/**
 * Keeps sponsored/featured rows from crowding the list: at most one featured row per `every` rows
 * (positions 0, every, 2·every…). Order inside each group is preserved; if non-featured rows run out,
 * the remaining featured rows go last.
 */
export function spreadFeatured<T extends { is_featured?: boolean }>(rows: T[], every = 5): T[] {
  const feats = rows.filter((r) => r.is_featured);
  const rest = rows.filter((r) => !r.is_featured);
  if (feats.length === 0 || rest.length === 0) return rows;
  const out: T[] = [];
  let f = 0, r = 0;
  while (f < feats.length || r < rest.length) {
    if (out.length % every === 0 && f < feats.length) out.push(feats[f++]);
    else if (r < rest.length) out.push(rest[r++]);
    else out.push(feats[f++]);
  }
  return out;
}
