import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  LoginRequest,
  CreateTenantRequest,
  CreateStoreRequest,
  UpdateStoreRequest,
  UpdateStoreStatusRequest,
  CreateProductRequest,
  CloneProductRequest,
  CreateTagRequest,
  CreateCategoryRequest,
  CreateCollectionRequest,
  ProductFilters,
  ProductRelation,
  CreatePageRequest,
  UpdatePageRequest,
} from '@/lib/types';

// Auth hooks
export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data),
  });
}

export function useCreateTenant() {
  return useMutation({
    mutationFn: (data: CreateTenantRequest) => apiClient.createTenant(data),
  });
}

// Store hooks
export function useStores(enabled = true) {
  return useQuery({
    queryKey: ['stores'],
    queryFn: () => apiClient.getStores(),
    enabled,
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ['stores', id],
    queryFn: () => apiClient.getStore(id),
    enabled: !!id,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStoreRequest) => apiClient.createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStoreRequest }) =>
      apiClient.updateStore(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useUploadStoreLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, file }: { storeId: string; file: File }) =>
      apiClient.uploadStoreLogo(storeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useUpdateStoreStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStoreStatusRequest }) =>
      apiClient.updateStoreStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function usePublishStoreCustomization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, useDraftLayout }: { id: string; useDraftLayout?: boolean }) =>
      apiClient.publishStoreCustomization(id, useDraftLayout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

// Product hooks
export function useProducts(storeId: string, filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', storeId, filters],
    queryFn: () => apiClient.getProducts(storeId, filters),
    enabled: !!storeId,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useProduct(storeId: string, productId: string) {
  return useQuery({
    queryKey: ['products', storeId, productId],
    queryFn: () => apiClient.getProduct(storeId, productId),
    enabled: !!storeId && !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: CreateProductRequest }) =>
      apiClient.createProduct(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId, data }: { storeId: string; productId: string; data: Partial<CreateProductRequest> }) =>
      apiClient.updateProduct(storeId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductRelations(storeId: string, productId: string) {
  return useQuery({
    queryKey: ['product-relations', storeId, productId],
    queryFn: () => apiClient.getProductRelations(storeId, productId),
    enabled: !!storeId && !!productId,
  });
}

export function useReplaceProductRelations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId, relations }: { storeId: string; productId: string; relations: ProductRelation[] }) =>
      apiClient.replaceProductRelations(storeId, productId, {
        relations: relations.map((relation, index) => ({
          related_product_id: relation.related_product_id,
          relation_type: relation.relation_type,
          position: index,
        })),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-relations', variables.storeId, variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.storeId, variables.productId] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId }: { storeId: string; productId: string }) =>
      apiClient.deleteProduct(storeId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useCloneProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      storeId,
      productId,
      data,
    }: {
      storeId: string;
      productId: string;
      data: CloneProductRequest;
    }) => apiClient.cloneProduct(storeId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Category hooks
export function useCategories(storeId: string) {
  return useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => apiClient.getCategories(storeId),
    enabled: !!storeId,
  });
}

export function useCategory(storeId: string, categoryId: string) {
  return useQuery({
    queryKey: ['categories', storeId, categoryId],
    queryFn: () => apiClient.getCategory(storeId, categoryId),
    enabled: !!storeId && !!categoryId,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: CreateCategoryRequest }) =>
      apiClient.createCategory(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, categoryId, data }: { storeId: string; categoryId: string; data: Partial<CreateCategoryRequest> }) =>
      apiClient.updateCategory(storeId, categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, categoryId }: { storeId: string; categoryId: string }) =>
      apiClient.deleteCategory(storeId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// Collection hooks
export function useCollections(storeId: string) {
  return useQuery({
    queryKey: ['collections', storeId],
    queryFn: () => apiClient.getCollections(storeId),
    enabled: !!storeId,
  });
}

export function useCollection(storeId: string, collectionId: string) {
  return useQuery({
    queryKey: ['collections', storeId, collectionId],
    queryFn: () => apiClient.getCollection(storeId, collectionId),
    enabled: !!storeId && !!collectionId,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: CreateCollectionRequest }) =>
      apiClient.createCollection(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, collectionId, data }: { storeId: string; collectionId: string; data: Partial<CreateCollectionRequest> }) =>
      apiClient.updateCollection(storeId, collectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, collectionId }: { storeId: string; collectionId: string }) =>
      apiClient.deleteCollection(storeId, collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (error: any) => {
      // If 404, the collection doesn't exist in the DB (stale cache) — just refresh the list
      if (error?.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['collections'] });
      }
    },
  });
}

export function useCollectionProducts(storeId: string, collectionId: string, page = 1, limit = 100) {
  return useQuery({
    queryKey: ['collections', storeId, collectionId, 'products', page, limit],
    queryFn: () => apiClient.getCollectionProducts(storeId, collectionId, page, limit),
    enabled: !!storeId && !!collectionId,
  });
}

export function useAddProductToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, collectionId, productId }: { storeId: string; collectionId: string; productId: string }) =>
      apiClient.addProductToCollection(storeId, collectionId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collections', variables.storeId, variables.collectionId, 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.storeId, variables.productId] });
    },
  });
}

export function useRemoveProductFromCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, collectionId, productId }: { storeId: string; collectionId: string; productId: string }) =>
      apiClient.removeProductFromCollection(storeId, collectionId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collections', variables.storeId, variables.collectionId, 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.storeId, variables.productId] });
    },
  });
}

// Tag hooks
export function useTags(storeId: string) {
  return useQuery({
    queryKey: ['tags', storeId],
    queryFn: () => apiClient.getTags(storeId),
    enabled: !!storeId,
  });
}

export function useTag(storeId: string, tagId: string) {
  return useQuery({
    queryKey: ['tags', storeId, tagId],
    queryFn: () => apiClient.getTag(storeId, tagId),
    enabled: !!storeId && !!tagId,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: CreateTagRequest }) =>
      apiClient.createTag(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, tagId, data }: { storeId: string; tagId: string; data: Partial<CreateTagRequest> }) =>
      apiClient.updateTag(storeId, tagId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, tagId }: { storeId: string; tagId: string }) =>
      apiClient.deleteTag(storeId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useAssignProductTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId, tagIds }: { storeId: string; productId: string; tagIds: string[] }) =>
      apiClient.assignTagsToProduct(storeId, productId, tagIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.storeId, variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.storeId] });
    },
  });
}

// Product Image hooks
export function useProductImages(storeId: string, productId: string) {
  return useQuery({
    queryKey: ['product-images', storeId, productId],
    queryFn: () => apiClient.getProductImages(storeId, productId),
    enabled: !!storeId && !!productId,
  });
}

export function useCreateProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId, file, alt_text, caption, position }: { storeId: string; productId: string; file: File; alt_text?: string; caption?: string; position?: number }) =>
      apiClient.createProductImage(storeId, productId, { file, alt_text, caption, position }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', variables.storeId, variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.storeId, variables.productId] });
    },
  });
}

export function useUpdateProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId, imageId, data }: { storeId: string; productId: string; imageId: string; data: Partial<{ alt_text?: string; caption?: string; position: number }> }) =>
      apiClient.updateProductImage(storeId, productId, imageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', variables.storeId, variables.productId] });
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId, imageId }: { storeId: string; productId: string; imageId: string }) =>
      apiClient.deleteProductImage(storeId, productId, imageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', variables.storeId, variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.storeId, variables.productId] });
    },
  });
}

export function useReorderProductImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId, imageIds }: { storeId: string; productId: string; imageIds: string[] }) =>
      apiClient.reorderProductImages(storeId, productId, imageIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', variables.storeId, variables.productId] });
    },
  });
}

// ── Admin Customer hooks ─────────────────────────────────────────────────────

export function useCustomers(storeId: string, params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['customers', storeId, params],
    queryFn: () => apiClient.getCustomers(storeId, params),
    enabled: !!storeId,
  });
}

export function useCustomer(storeId: string, customerId: string) {
  return useQuery({
    queryKey: ['customers', storeId, customerId],
    queryFn: () => apiClient.getCustomer(storeId, customerId),
    enabled: !!storeId && !!customerId,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, customerId, data }: { storeId: string; customerId: string; data: { status?: string; first_name?: string; last_name?: string; phone?: string } }) =>
      apiClient.updateCustomer(storeId, customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', variables.storeId] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, customerId }: { storeId: string; customerId: string }) =>
      apiClient.deleteCustomer(storeId, customerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', variables.storeId] });
    },
  });
}

// ── Customer Group hooks ─────────────────────────────────────────────────────

export function useCustomerGroups(storeId: string) {
  return useQuery({
    queryKey: ['customer-groups', storeId],
    queryFn: () => apiClient.getCustomerGroups(storeId),
    enabled: !!storeId,
  });
}

export function useCustomerGroup(storeId: string, groupId: string) {
  return useQuery({
    queryKey: ['customer-groups', storeId, groupId],
    queryFn: () => apiClient.getCustomerGroup(storeId, groupId),
    enabled: !!storeId && !!groupId,
  });
}

export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: { name: string; description?: string; discount: number } }) =>
      apiClient.createCustomerGroup(storeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups', variables.storeId] });
    },
  });
}

export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, groupId, data }: { storeId: string; groupId: string; data: { name: string; description?: string; discount: number } }) =>
      apiClient.updateCustomerGroup(storeId, groupId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups', variables.storeId] });
    },
  });
}

export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, groupId }: { storeId: string; groupId: string }) =>
      apiClient.deleteCustomerGroup(storeId, groupId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups', variables.storeId] });
    },
  });
}

export function useAddCustomerGroupMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, groupId, customerIds }: { storeId: string; groupId: string; customerIds: string[] }) =>
      apiClient.addCustomerGroupMembers(storeId, groupId, customerIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups', variables.storeId, variables.groupId] });
    },
  });
}

export function useRemoveCustomerGroupMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, groupId, customerIds }: { storeId: string; groupId: string; customerIds: string[] }) =>
      apiClient.removeCustomerGroupMembers(storeId, groupId, customerIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups', variables.storeId, variables.groupId] });
    },
  });
}

// ── Catalog Import/Export Hooks ──────────────────────────────────────────────

export function useExportProducts() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.exportProducts(storeId, format),
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, file }: { storeId: string; file: File }) =>
      apiClient.importProducts(storeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDownloadProductTemplate() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.downloadProductImportTemplate(storeId, format),
  });
}

export function useExportCategories() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.exportCategories(storeId, format),
  });
}

export function useImportCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, file }: { storeId: string; file: File }) =>
      apiClient.importCategories(storeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDownloadCategoryTemplate() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.downloadCategoryImportTemplate(storeId, format),
  });
}

export function useExportTags() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.exportTags(storeId, format),
  });
}

export function useImportTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, file }: { storeId: string; file: File }) =>
      apiClient.importTags(storeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDownloadTagTemplate() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.downloadTagImportTemplate(storeId, format),
  });
}

export function useExportCollections() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.exportCollections(storeId, format),
  });
}

export function useImportCollections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, file }: { storeId: string; file: File }) =>
      apiClient.importCollections(storeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useDownloadCollectionTemplate() {
  return useMutation({
    mutationFn: ({ storeId, format }: { storeId: string; format: 'csv' | 'xlsx' }) =>
      apiClient.downloadCollectionImportTemplate(storeId, format),
  });
}

export function useExportFullCatalog() {
  return useMutation({
    mutationFn: ({ storeId }: { storeId: string }) =>
      apiClient.exportFullCatalog(storeId),
  });
}

export function usePurgeCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId }: { storeId: string }) =>
      apiClient.purgeCatalog(storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useFindDuplicates() {
  return useMutation({
    mutationFn: ({ storeId }: { storeId: string }) =>
      apiClient.findDuplicates(storeId),
  });
}

// ── Pages ──────────────────────────────────────────────────────────────────

export function usePages(storeId: string) {
  return useQuery({
    queryKey: ['pages', storeId],
    queryFn: () => apiClient.getPages(storeId),
    enabled: !!storeId,
  })
}

export function usePage(storeId: string, pageId: string) {
  return useQuery({
    queryKey: ['pages', storeId, pageId],
    queryFn: () => apiClient.getPage(storeId, pageId),
    enabled: !!storeId && !!pageId,
  })
}

export function useCreatePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: CreatePageRequest }) =>
      apiClient.createPage(storeId, data),
    onSuccess: (_, { storeId }) => qc.invalidateQueries({ queryKey: ['pages', storeId] }),
  })
}

export function useUpdatePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, pageId, data }: { storeId: string; pageId: string; data: UpdatePageRequest }) =>
      apiClient.updatePage(storeId, pageId, data),
    onSuccess: (_, { storeId, pageId }) => {
      qc.invalidateQueries({ queryKey: ['pages', storeId] })
      qc.invalidateQueries({ queryKey: ['pages', storeId, pageId] })
    },
  })
}

export function usePublishPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, pageId }: { storeId: string; pageId: string }) =>
      apiClient.publishPage(storeId, pageId),
    onSuccess: (_, { storeId, pageId }) => {
      qc.invalidateQueries({ queryKey: ['pages', storeId] })
      qc.invalidateQueries({ queryKey: ['pages', storeId, pageId] })
    },
  })
}

export function useDeletePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, pageId }: { storeId: string; pageId: string }) =>
      apiClient.deletePage(storeId, pageId),
    onSuccess: (_, { storeId }) => qc.invalidateQueries({ queryKey: ['pages', storeId] }),
  })
}