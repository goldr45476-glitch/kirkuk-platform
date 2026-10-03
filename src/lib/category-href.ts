/** Some categories are served by dedicated classifieds sections instead of business lists. */
const SPECIAL: Record<string, string> = { "real-estate": "/real-estate", jobs: "/jobs", pharmacies: "/live/pharmacies", fuel: "/live/fuel", water: "/live/water" };
export const categoryHref = (slug: string) => SPECIAL[slug] ?? `/categories/${slug}`;
