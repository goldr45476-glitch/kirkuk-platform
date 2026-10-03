export type Locale = "ar" | "ku" | "tr" | "en";
export type UserRole = "user" | "owner" | "moderator" | "admin";

export interface Category {
  id: number;
  parent_id: number | null;
  slug: string;
  name_ar: string;
  name_ku: string | null;
  name_tr: string | null;
  name_en: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

export interface District {
  id: number;
  slug: string;
  name_ar: string;
  name_ku: string | null;
  name_tr: string | null;
  name_en: string | null;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  is_verified: boolean;
  is_featured: boolean;
  rating_avg: number;
  rating_count: number;
  lat?: number | null;
  lng?: number | null;
  is_open?: boolean;
  distance_km?: number | null;
  district: { name_ar: string; name_ku: string | null; name_tr: string | null; name_en: string | null } | null;
}

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  role: UserRole;
  locale: Locale;
}

export interface BusinessHour { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }
export interface Product { id: string; name: string; description: string | null; price: number | null; currency: "IQD" | "USD"; is_available: boolean }

export interface BusinessDetail extends Business {
  website: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  cover_url: string | null;
  followers_count: number;
  views_count: number;
  category_id: number;
  hours: BusinessHour[];
  images: { id: string; url: string; caption: string | null }[];
  products: Product[];
  is_open: boolean;
}

export interface MapBusiness {
  id: string; slug: string; name: string; lat: number; lng: number;
  is_verified: boolean; root_slug: string; color: string; address: string | null; phone: string | null;
}

export interface SearchParams {
  q?: string; category?: string; district?: number; minRating?: number; open?: boolean; verified?: boolean;
  lat?: number; lng?: number; sort?: "relevance" | "nearest" | "rating" | "newest"; page?: number;
}
