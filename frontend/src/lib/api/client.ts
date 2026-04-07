import axios, { AxiosInstance } from 'axios';
import {
  Tenant,
  Store,
  Product,
  ProductRelationsResponse,
  Category,
  Collection,
  Tag,
  ProductImage,
  LoginRequest,
  LoginResponse,
  CreateTenantRequest,
  CreateStoreRequest,
  UpdateStoreRequest,
  UpdateStoreStatusRequest,
  CreateProductRequest,
  ReplaceProductRelationsRequest,
  CloneProductRequest,
  CloneProductResponse,
  CreateTagRequest,
  CreateCategoryRequest,
  CreateCollectionRequest,
  CollectionWithProductsResponse,
  PaginatedResponse,
  ProductFilters,
  AdminCustomer,
  AdminCustomerAddress,
  CustomerGroup,
  CreatePageRequest,
  StorefrontPage,
  UpdatePageRequest,
} from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  private cleanPayload<T extends object>(data: T): Partial<T> {
    const cleanedEntries = Object.entries(data as Record<string, unknown>).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'number' && Number.isNaN(value)) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    });
    return Object.fromEntries(cleanedEntries) as Partial<T>;
  }

  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Don't redirect on 401 — let the AuthProvider / dashboard layout
        // handle the redirect based on session state. This prevents race
        // conditions where a stale request 401 causes a premature redirect.
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/auth/tenant/login', data);
    return response.data;
  }

  async me(): Promise<LoginResponse['tenant']> {
    const response = await this.client.get<{ tenant: LoginResponse['tenant'] }>('/api/auth/tenant/me');
    return response.data.tenant;
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/tenant/logout');
  }

  async createTenant(data: CreateTenantRequest): Promise<Tenant> {
    const response = await this.client.post<Tenant>('/api/tenants', data);
    return response.data;
  }

  // Store endpoints
  async createStore(data: CreateStoreRequest): Promise<Store> {
    const response = await this.client.post<Store>('/api/stores', data);
    return response.data;
  }

  async getStores(): Promise<Store[]> {
    const response = await this.client.get<Store[]>('/api/stores');
    return response.data;
  }

  async getStore(id: string): Promise<Store> {
    const response = await this.client.get<Store>(`/api/stores/${id}`);
    return response.data;
  }

  async updateStore(id: string, data: UpdateStoreRequest): Promise<Store> {
    const response = await this.client.put<Store>(`/api/stores/${id}`, data);
    return response.data;
  }

  async uploadStoreLogo(storeId: string, file: File): Promise<Store> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post<Store>(`/api/stores/${storeId}/logo`, formData);
    return response.data;
  }

  async uploadStoreMedia(storeId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post<{ url: string }>(`/api/stores/${storeId}/media`, formData);
    return response.data;
  }

  async updateStoreStatus(id: string, data: UpdateStoreStatusRequest): Promise<Store> {
    const response = await this.client.patch<Store>(`/api/stores/${id}/status`, data);
    return response.data;
  }

  async publishStoreCustomization(id: string, useDraftLayout = true): Promise<Store> {
    const response = await this.client.post<Store>(`/api/stores/${id}/customization/publish`, {
      use_draft_layout: useDraftLayout,
    });
    return response.data;
  }

  async deleteStore(id: string): Promise<void> {
    await this.client.delete(`/api/stores/${id}`);
  }

  // Product endpoints
  async createProduct(storeId: string, data: CreateProductRequest): Promise<Product> {
    const payload = this.cleanPayload(data);
    const response = await this.client.post<Product>(`/api/stores/${storeId}/products`, payload);
    return response.data;
  }

  async getProducts(storeId: string, filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.client.get<PaginatedResponse<Product>>(
      `/api/stores/${storeId}/products?${params.toString()}`
    );
    return response.data;
  }

  async getProduct(storeId: string, productId: string): Promise<Product> {
    const response = await this.client.get<Product>(`/api/stores/${storeId}/products/${productId}`);
    return response.data;
  }

  async updateProduct(storeId: string, productId: string, data: Partial<CreateProductRequest>): Promise<Product> {
    const payload = this.cleanPayload(data as Record<string, unknown>);
    const response = await this.client.put<Product>(`/api/stores/${storeId}/products/${productId}`, payload);
    return response.data;
  }

  async getProductRelations(storeId: string, productId: string): Promise<ProductRelationsResponse> {
    const response = await this.client.get<ProductRelationsResponse>(`/api/stores/${storeId}/products/${productId}/relations`);
    return response.data;
  }

  async replaceProductRelations(storeId: string, productId: string, data: ReplaceProductRelationsRequest): Promise<ProductRelationsResponse> {
    const response = await this.client.put<ProductRelationsResponse>(`/api/stores/${storeId}/products/${productId}/relations`, data);
    return response.data;
  }

  async deleteProduct(storeId: string, productId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/products/${productId}`);
  }

  async cloneProduct(storeId: string, productId: string, data: CloneProductRequest): Promise<CloneProductResponse> {
    const payload = this.cleanPayload({ ...data });
    const response = await this.client.post<CloneProductResponse>(`/api/stores/${storeId}/products/${productId}/clone`, payload);
    return response.data;
  }

  // Category endpoints
  async createCategory(storeId: string, data: CreateCategoryRequest): Promise<Category> {
    const response = await this.client.post<Category>(`/api/stores/${storeId}/categories`, this.cleanPayload(data));
    return response.data;
  }

  async getCategories(storeId: string): Promise<Category[]> {
    const response = await this.client.get<Category[]>(`/api/stores/${storeId}/categories`);
    return response.data;
  }

  async getCategory(storeId: string, categoryId: string): Promise<Category> {
    const response = await this.client.get<Category>(`/api/stores/${storeId}/categories/${categoryId}`);
    return response.data;
  }

  async updateCategory(storeId: string, categoryId: string, data: Partial<CreateCategoryRequest>): Promise<Category> {
    const response = await this.client.put<Category>(`/api/stores/${storeId}/categories/${categoryId}`, this.cleanPayload(data));
    return response.data;
  }

  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/categories/${categoryId}`);
  }

  // Collection endpoints
  async createCollection(storeId: string, data: CreateCollectionRequest): Promise<Collection> {
    const response = await this.client.post<Collection>(`/api/stores/${storeId}/collections`, this.cleanPayload(data));
    return response.data;
  }

  async getCollections(storeId: string): Promise<Collection[]> {
    const response = await this.client.get<Collection[]>(`/api/stores/${storeId}/collections`);
    return response.data;
  }

  async getCollection(storeId: string, collectionId: string): Promise<Collection> {
    const response = await this.client.get<Collection>(`/api/stores/${storeId}/collections/${collectionId}`);
    return response.data;
  }

  async updateCollection(storeId: string, collectionId: string, data: Partial<CreateCollectionRequest>): Promise<Collection> {
    const response = await this.client.put<Collection>(`/api/stores/${storeId}/collections/${collectionId}`, this.cleanPayload(data));
    return response.data;
  }

  async deleteCollection(storeId: string, collectionId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/collections/${collectionId}`);
  }

  async getCollectionProducts(storeId: string, collectionId: string, page = 1, limit = 100): Promise<CollectionWithProductsResponse> {
    const response = await this.client.get<CollectionWithProductsResponse>(`/api/stores/${storeId}/collections/${collectionId}/products`, {
      params: { page, limit },
    });
    return response.data;
  }

  async addProductToCollection(storeId: string, collectionId: string, productId: string): Promise<void> {
    await this.client.post(`/api/stores/${storeId}/collections/${collectionId}/products/${productId}`);
  }

  async removeProductFromCollection(storeId: string, collectionId: string, productId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/collections/${collectionId}/products/${productId}`);
  }

  // Tag endpoints
  async createTag(storeId: string, data: CreateTagRequest): Promise<Tag> {
    const response = await this.client.post<Tag>(`/api/stores/${storeId}/tags`, this.cleanPayload(data));
    return response.data;
  }

  async getTags(storeId: string): Promise<Tag[]> {
    const response = await this.client.get<Tag[]>(`/api/stores/${storeId}/tags`);
    return response.data;
  }

  async getTag(storeId: string, tagId: string): Promise<Tag> {
    const response = await this.client.get<Tag>(`/api/stores/${storeId}/tags/${tagId}`);
    return response.data;
  }

  async updateTag(storeId: string, tagId: string, data: Partial<CreateTagRequest>): Promise<Tag> {
    const response = await this.client.put<Tag>(`/api/stores/${storeId}/tags/${tagId}`, this.cleanPayload(data));
    return response.data;
  }

  async deleteTag(storeId: string, tagId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/tags/${tagId}`);
  }

  async assignTagsToProduct(storeId: string, productId: string, tagIds: string[]): Promise<void> {
    await this.client.post(`/api/stores/${storeId}/products/${productId}/tags`, {
      tag_ids: tagIds,
    });
  }

  // Product Image endpoints
  async getProductImages(storeId: string, productId: string): Promise<ProductImage[]> {
    const response = await this.client.get<ProductImage[]>(`/api/stores/${storeId}/products/${productId}/images`);
    return response.data;
  }

  async createProductImage(
    storeId: string,
    productId: string,
    data: { file: File; alt_text?: string; caption?: string; position?: number }
  ): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.alt_text) formData.append('alt_text', data.alt_text);
    if (data.caption) formData.append('caption', data.caption);
    if (typeof data.position === 'number') formData.append('position', String(data.position));

    const response = await this.client.post<ProductImage>(`/api/stores/${storeId}/products/${productId}/images`, formData);
    return response.data;
  }

  async updateProductImage(storeId: string, productId: string, imageId: string, data: Partial<{ alt_text?: string; caption?: string; position: number }>): Promise<ProductImage> {
    const response = await this.client.put<ProductImage>(`/api/stores/${storeId}/products/${productId}/images/${imageId}`, data);
    return response.data;
  }

  async deleteProductImage(storeId: string, productId: string, imageId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/products/${productId}/images/${imageId}`);
  }

  async reorderProductImages(storeId: string, productId: string, imageIds: string[]): Promise<void> {
    await this.client.post(`/api/stores/${storeId}/products/${productId}/images/reorder`, {
      images: imageIds.map((id, index) => ({ id, position: index })),
    });
  }

  async exportProducts(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/products/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async importProducts(storeId: string, file: File): Promise<{ imported: number; updated: number; skipped: number; warnings?: string[]; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(`/api/stores/${storeId}/products/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async downloadProductImportTemplate(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/products/import/template`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async exportCategories(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/categories/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async importCategories(storeId: string, file: File): Promise<{ imported: number; updated: number; skipped: number; warnings?: string[]; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(`/api/stores/${storeId}/categories/import`, formData);
    return response.data;
  }

  async downloadCategoryImportTemplate(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/categories/import/template`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  // ── Tags Import/Export ─────────────────────────────────────────────────────

  async exportTags(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/tags/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async importTags(storeId: string, file: File): Promise<{ imported: number; updated: number; skipped: number; warnings?: string[]; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/api/stores/${storeId}/tags/import`, formData);
    return response.data;
  }

  async downloadTagImportTemplate(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/tags/import/template`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  // ── Collections Import/Export ──────────────────────────────────────────────

  async exportCollections(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/collections/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async importCollections(storeId: string, file: File): Promise<{ imported: number; updated: number; skipped: number; warnings?: string[]; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/api/stores/${storeId}/collections/import`, formData);
    return response.data;
  }

  async downloadCollectionImportTemplate(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/collections/import/template`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  // ── Full Catalog Operations ────────────────────────────────────────────────

  async exportFullCatalog(storeId: string): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/catalog/export`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async purgeCatalog(storeId: string): Promise<{ products: number; categories: number; tags: number; collections: number; images: number; relations: number }> {
    const response = await this.client.delete(`/api/stores/${storeId}/catalog/purge`);
    return response.data;
  }

  async findDuplicates(storeId: string): Promise<{ duplicates: Array<{ field: string; value: string; products: Array<{ id: string; title: string; sku: string; slug: string }> }> }> {
    const response = await this.client.get(`/api/stores/${storeId}/catalog/duplicates`);
    return response.data;
  }

  // ── Admin Customer Management ──────────────────────────────────────────────

  async getCustomers(storeId: string, params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<{
    data: AdminCustomer[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const response = await this.client.get(`/api/stores/${storeId}/customers`, { params });
    return response.data;
  }

  async getCustomer(storeId: string, customerId: string): Promise<{ customer: AdminCustomer; addresses: AdminCustomerAddress[] }> {
    const response = await this.client.get(`/api/stores/${storeId}/customers/${customerId}`);
    return response.data;
  }

  async updateCustomer(storeId: string, customerId: string, data: { status?: string; first_name?: string; last_name?: string; phone?: string }): Promise<AdminCustomer> {
    const response = await this.client.put(`/api/stores/${storeId}/customers/${customerId}`, data);
    return response.data;
  }

  async deleteCustomer(storeId: string, customerId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/customers/${customerId}`);
  }

  async exportCustomers(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/customers/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async importCustomers(storeId: string, file: File): Promise<{ imported: number; updated: number; skipped: number; warnings?: string[]; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/api/stores/${storeId}/customers/import`, formData);
    return response.data;
  }

  async downloadCustomerImportTemplate(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/customers/import/template`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  // ── Customer Groups ────────────────────────────────────────────────────────

  async getCustomerGroups(storeId: string): Promise<CustomerGroup[]> {
    const response = await this.client.get(`/api/stores/${storeId}/customer-groups`);
    return response.data;
  }

  async getCustomerGroup(storeId: string, groupId: string): Promise<{ group: CustomerGroup; members: AdminCustomer[] }> {
    const response = await this.client.get(`/api/stores/${storeId}/customer-groups/${groupId}`);
    return response.data;
  }

  async createCustomerGroup(storeId: string, data: { name: string; description?: string; discount: number }): Promise<CustomerGroup> {
    const response = await this.client.post(`/api/stores/${storeId}/customer-groups`, data);
    return response.data;
  }

  async updateCustomerGroup(storeId: string, groupId: string, data: { name: string; description?: string; discount: number }): Promise<CustomerGroup> {
    const response = await this.client.put(`/api/stores/${storeId}/customer-groups/${groupId}`, data);
    return response.data;
  }

  async deleteCustomerGroup(storeId: string, groupId: string): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/customer-groups/${groupId}`);
  }

  async addCustomerGroupMembers(storeId: string, groupId: string, customerIds: string[]): Promise<void> {
    await this.client.post(`/api/stores/${storeId}/customer-groups/${groupId}/members`, { customer_ids: customerIds });
  }

  async removeCustomerGroupMembers(storeId: string, groupId: string, customerIds: string[]): Promise<void> {
    await this.client.delete(`/api/stores/${storeId}/customer-groups/${groupId}/members`, { data: { customer_ids: customerIds } });
  }

  async exportCustomerGroups(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/customer-groups/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async importCustomerGroups(storeId: string, file: File): Promise<{ imported: number; updated: number; skipped: number; warnings?: string[]; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/api/stores/${storeId}/customer-groups/import`, formData);
    return response.data;
  }

  async downloadCustomerGroupImportTemplate(storeId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.get(`/api/stores/${storeId}/customer-groups/import/template`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  // ── Storefront Pages ──────────────────────────────────────────────────────

async getPages(storeId: string): Promise<StorefrontPage[]> {
  const r = await this.client.get<StorefrontPage[]>(`/api/stores/${storeId}/pages`)
  return r.data
}

async getPage(storeId: string, pageId: string): Promise<StorefrontPage> {
  const r = await this.client.get<StorefrontPage>(`/api/stores/${storeId}/pages/${pageId}`)
  return r.data
}

async createPage(storeId: string, data: CreatePageRequest): Promise<StorefrontPage> {
  const r = await this.client.post<StorefrontPage>(`/api/stores/${storeId}/pages`, data)
  return r.data
}

async updatePage(storeId: string, pageId: string, data: UpdatePageRequest): Promise<StorefrontPage> {
  const r = await this.client.put<StorefrontPage>(`/api/stores/${storeId}/pages/${pageId}`, data)
  return r.data
}

async publishPage(storeId: string, pageId: string): Promise<StorefrontPage> {
  const r = await this.client.post<StorefrontPage>(`/api/stores/${storeId}/pages/${pageId}/publish`)
  return r.data
}

async deletePage(storeId: string, pageId: string): Promise<void> {
  await this.client.delete(`/api/stores/${storeId}/pages/${pageId}`)
}
}

export const apiClient = new ApiClient();