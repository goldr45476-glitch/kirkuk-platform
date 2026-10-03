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
  is_open?: boolean | null;
  last_verified_at?: string | null;
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
  price_level: number | null;
  category_id: number;
  owner_id: string | null;
  hours: BusinessHour[];
  images: { id: string; url: string; caption: string | null }[];
  products: Product[];
  is_open: boolean | null;
}

export interface MapBusiness {
  id: string; slug: string; name: string; lat: number; lng: number;
  is_verified: boolean; root_slug: string; color: string; address: string | null; phone: string | null;
}

export interface SearchParams {
  q?: string; category?: string; district?: number; minRating?: number; open?: boolean; verified?: boolean;
  lat?: number; lng?: number; sort?: "relevance" | "nearest" | "rating" | "newest"; page?: number;
}

export interface FeedMedia { url: string; width: number | null; height: number | null }
export interface FeedPost {
  id: string; body: string; is_offer: boolean; offer_ends_at: string | null;
  likes_count: number; comments_count: number; created_at: string; liked: boolean;
  author: { id: string; full_name: string; username: string | null; avatar_url: string | null };
  business: { id: string; slug: string; name: string; logo_url: string | null; is_verified: boolean } | null;
  media: FeedMedia[];
}
export interface CommentRow {
  id: string; body: string; created_at: string;
  author: { id: string; full_name: string; username: string | null; avatar_url: string | null };
}
export interface StoryRing {
  business_id: string; slug: string; name: string; logo_url: string | null; is_verified: boolean; followed: boolean;
  stories: { id: string; media_url: string; caption: string | null; created_at: string }[];
}
export interface NotificationRow {
  id: string; type: string; created_at: string; read_at: string | null; post_id: string | null; business_id: string | null;
  data: { excerpt?: string };
  actor: { full_name: string } | null;
  business: { name: string; slug: string } | null;
}

export interface ReviewRow {
  id: string; rating: number; body: string | null; owner_reply: string | null; replied_at: string | null; created_at: string; user_id: string;
  author: { full_name: string; avatar_url: string | null };
}
export interface ListingCardRow {
  id: string; kind: "property" | "vehicle" | "job"; title: string; price: number | null; currency: "IQD" | "USD";
  details: Record<string, string | number | undefined>; district_id: number | null; is_featured: boolean; created_at: string; image: string | null; total_count: number;
}
export interface ListingDetail extends Omit<ListingCardRow, "image" | "total_count"> {
  description: string | null; phone: string | null; lat: number | null; lng: number | null; user_id: string; status: string; views_count: number;
  images: { id: string; url: string }[]; owner: { full_name: string };
}
export interface ServiceStatusRow {
  id: string; slug: string; name: string; address: string | null; phone: string | null; district_id: number | null; is_open: boolean;
  status: "available" | "unavailable" | "queue" | null; queue_level: number | null; note: string | null; reported_at: string | null; recent_reports: number;
}
export interface ListingFilters {
  q?: string; deal?: string; type?: string; district?: number; currency?: string; minPrice?: number; maxPrice?: number;
  minArea?: number; minRooms?: number; minYear?: number; employment?: string; sort?: "newest" | "price_asc" | "price_desc"; page?: number;
}

export interface OpenNowRow {
  id: string; slug: string; name: string; address: string | null; phone: string | null; whatsapp: string | null; district_id: number | null; category_id: number;
  rating_avg: number; rating_count: number; is_verified: boolean; price_level: number | null; distance_km: number | null; closes_at: string | null; last_verified_at: string | null;
}
export interface NewPlaceRow {
  id: string; slug: string; name: string; address: string | null; phone: string | null; whatsapp: string | null; district_id: number | null; category_id: number;
  rating_avg: number; rating_count: number; is_verified: boolean; created_at: string;
}
export interface OfferRow {
  id: string; title: string; details: string | null; image_url: string | null; starts_at: string; ends_at: string;
  business_id: string; business_slug: string; business_name: string; logo_url: string | null; phone: string | null; district_id: number | null;
}
export interface EventRow {
  id: string; title: string; details: string | null; category: string | null; starts_at: string; ends_at: string | null;
  venue_name: string | null; venue_slug: string | null; lat: number | null; lng: number | null; image_url: string | null;
}
export interface Recommendation {
  id: string; slug: string; name: string; address: string | null; phone: string | null; whatsapp: string | null; district: string | null;
  rating_avg: number; rating_count: number; price_level: number | null; distance_km: number | null; closes_at: string | null;
  audience: string | null; amenities: string[]; last_verified_at: string | null;
}
