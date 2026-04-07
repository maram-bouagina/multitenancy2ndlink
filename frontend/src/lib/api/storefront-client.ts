import axios from 'axios';
import type {
  StorePublic,
  CategoryPublic,
  CollectionPublic,
  CollectionPage,
  PaginatedProducts,
  ProductDetail,
  ProductFilters,
} from '@/lib/types/storefront';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const sf = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function getStore(slug: string): Promise<StorePublic> {
  const res = await sf.get(`/api/public/stores/${slug}`);
  return res.data;
}

export async function getCategories(slug: string): Promise<CategoryPublic[]> {
  const res = await sf.get(`/api/public/stores/${slug}/categories`);
  return res.data;
}

export async function getCollections(slug: string): Promise<CollectionPublic[]> {
  const res = await sf.get(`/api/public/stores/${slug}/collections`);
  return res.data;
}

export async function getProducts(slug: string, filters?: ProductFilters): Promise<PaginatedProducts> {
  const res = await sf.get(`/api/public/stores/${slug}/products`, { params: filters });
  return res.data;
}

export async function getProduct(slug: string, productSlug: string): Promise<ProductDetail> {
  const res = await sf.get(`/api/public/stores/${slug}/products/${productSlug}`);
  return res.data;
}

export async function getCollectionProducts(
  slug: string,
  colSlug: string,
  page = 1,
  limit = 20,
): Promise<CollectionPage> {
  const res = await sf.get(`/api/public/stores/${slug}/collections/${colSlug}`, {
    params: { page, limit },
  });
  return res.data;
}


export interface StorefrontPagePublic {
  slug: string
  title: string
  layout_published: string
  meta_title?: string
  meta_description?: string
}

export interface StorefrontPageListItem {
  slug: string
  title: string
}

export async function getStorePages(slug: string): Promise<StorefrontPageListItem[]> {
  const res = await sf.get(`/api/public/stores/${slug}/pages`)
  return res.data
}

export async function getStorefrontPage(slug: string, pageSlug: string): Promise<StorefrontPagePublic> {
  const res = await sf.get(`/api/public/stores/${slug}/pages/${pageSlug}`)
  return res.data
}