import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getStore, getCategories, getCollections, getProducts, getStorefrontPage, getStorePages } from '@/lib/api/storefront-client'
import { PuckStorefrontRenderer } from '@/app/store/[slug]/puck-renderer'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>
}): Promise<Metadata> {
  const { slug, pageSlug } = await params
  try {
    const page = await getStorefrontPage(slug, pageSlug)
    return {
      title: page.meta_title ?? page.title,
      description: page.meta_description ?? undefined,
    }
  } catch {
    return { title: 'Page' }
  }
}

export default async function DynamicStorePage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>
}) {
  const { slug, pageSlug } = await params

  let page
  try {
    page = await getStorefrontPage(slug, pageSlug)
  } catch {
    notFound()
  }

  const [store, categories, collections, { products }, pages] = await Promise.all([
    getStore(slug),
    getCategories(slug),
    getCollections(slug),
    getProducts(slug, { limit: 24, sort: 'newest' }),
    getStorePages(slug).catch(() => []),
  ])

  return (
    <PuckStorefrontRenderer
      store={store}
      products={products}
      categories={categories}
      collections={collections}
      pages={pages}
      layoutOverride={page.layout_published}
    />
  )
}