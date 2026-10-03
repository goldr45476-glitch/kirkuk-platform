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
