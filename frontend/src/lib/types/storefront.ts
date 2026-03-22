// Public storefront types — safe for unauthenticated consumption.
// No tenant IDs, no draft layouts, no private fields.

export interface StorePublic {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency: string;
  language: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_mode: 'light' | 'dark' | 'auto';
  theme_font_family: string;
  storefront_layout: string; // published layout JSON
}

export interface CategoryPublic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  children?: CategoryPublic[];
}

export interface CollectionPublic {
  id: string;
  name: string;
  slug: string;
}

export interface ProductImagePublic {
  url: string;
  url_thumbnail: string;
  url_medium: string;
  url_large: string;
  alt_text?: string;
  position: number;
}

export interface ProductPublic {
  id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  effective_price: number;
  is_on_sale: boolean;
  sale_price?: number;
  sale_end?: string; // RFC3339
  currency: string;
  brand?: string;
  sku?: string;
  weight?: number;
  dimensions?: string;
  tax_class?: string;
  track_stock: boolean;
  in_stock: boolean;
  stock: number;
  low_stock_threshold?: number;
  category_id?: string;
  category?: CategoryPublic;
  collections?: CollectionPublic[];
  images: ProductImagePublic[];
  created_at: string;
}

export interface PaginatedProducts {
  products: ProductPublic[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CollectionPage {
  collection: CollectionPublic;
  products: PaginatedProducts;
}

export interface ProductDetail {
  product: ProductPublic;
  related: ProductPublic[];
}

export type StorefrontSectionType =
  | 'hero'
  | 'featured_products'
  | 'categories_grid'
  | 'newsletter'
  | 'footer';

export interface StorefrontSection {
  id: string;
  type: StorefrontSectionType;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_href?: string;
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}
