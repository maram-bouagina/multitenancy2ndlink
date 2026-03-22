// API Types based on backend models
export interface Tenant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'pending' | 'suspended' | 'unpaid';
  email_verified: boolean;
}

export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  currency: string;
  timezone: string;
  language: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_mode: 'light' | 'dark' | 'auto';
  theme_font_family: string;
  storefront_layout_draft: string;
  storefront_layout_published: string;
  theme_version: number;
  tax_number?: string;
  status?: string;
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

export interface Product {
  id: string;
  store_id: string;
  title: string;
  description?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private';
  price: number;
  sale_price?: number;
  sale_start?: string;
  sale_end?: string;
  currency: string;
  sku?: string;
  track_stock: boolean;
  stock: number;
  low_stock_threshold?: number;
  weight?: number;
  dimensions?: string;
  brand?: string;
  tax_class?: string;
  category_id?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  collections?: Collection[];
  tags?: Tag[];
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: 'public' | 'private';
  parent_id?: string;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface Collection {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  type: 'manual' | 'automatic';
  rule?: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithProductsResponse extends Collection {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CollectionRule {
  column: string;
  relation: string;
  condition: string;
}

export interface Tag {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  url_thumbnail: string;
  url_medium: string;
  url_large: string;
  alt_text?: string;
  caption?: string;
  position: number;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  tenant: Tenant;
}

export interface CreateTenantRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  plan: 'free' | 'pro' | 'enterprise';
}

export interface CreateStoreRequest {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  currency: string;
  timezone: string;
  language: string;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  theme_font_family?: string;
  storefront_layout_draft?: string;
  tax_number?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  currency?: string;
  timezone?: string;
  language?: string;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  theme_font_family?: string;
  storefront_layout_draft?: string;
  tax_number?: string;
  status?: 'active' | 'suspended' | 'inactive';
}

export interface CreateProductRequest {
  title: string;
  description?: string;
  slug?: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private';
  price: number;
  sale_price?: number;
  sale_start?: string;
  sale_end?: string;
  currency: string;
  sku?: string;
  track_stock: boolean;
  stock: number;
  low_stock_threshold?: number;
  weight?: number;
  dimensions?: string;
  brand?: string;
  tax_class?: string;
  category_id?: string;
  published_at?: string;
}

export interface CreateProductImageRequest {
  file: File;
  alt_text?: string;
  caption?: string;
  position?: number;
}

export interface CreateTagRequest {
  name: string;
  slug: string;
  color?: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  visibility: 'public' | 'private';
  parent_id?: string;
}

export interface CreateCollectionRequest {
  name: string;
  slug?: string;
  type: 'manual' | 'automatic';
  rule?: string;
}

// Generic API Response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ProductFilters extends PaginationParams {
  search?: string;
  category_id?: string;
  collection_id?: string;
  tag_id?: string;
  status?: string;
  visibility?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}