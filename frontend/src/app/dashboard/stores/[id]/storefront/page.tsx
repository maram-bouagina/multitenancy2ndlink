'use client';

import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { StorefrontSection, StorefrontSectionType } from '@/lib/types';
import { useStore } from '@/lib/hooks/use-api';

function parseLayout(raw?: string): StorefrontSection[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validTypes: StorefrontSectionType[] = ['hero', 'featured_products', 'categories_grid', 'newsletter', 'footer'];
    return parsed
      .filter((item) => item && typeof item === 'object' && validTypes.includes(item.type))
      .map((item) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `${item.type}-${Date.now()}`,
        type: item.type as StorefrontSectionType,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
        title: typeof item.title === 'string' ? item.title : undefined,
        subtitle: typeof item.subtitle === 'string' ? item.subtitle : undefined,
        cta_label: typeof item.cta_label === 'string' ? item.cta_label : undefined,
        cta_href: typeof item.cta_href === 'string' ? item.cta_href : undefined,
      }));
  } catch {
    return [];
  }
}

function Navbar({ name, logo, primary, font }: { name: string; logo?: string; primary: string; font: string }) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-sm px-6 py-4 flex items-center justify-between shadow-sm" style={{ fontFamily: font }}>
      <div className="flex items-center gap-3">
        {logo ? (
          <Image src={logo} alt={name} width={120} height={32} className="h-8 w-auto object-contain" unoptimized />
        ) : (
          <span className="text-lg font-bold" style={{ color: primary }}>{name}</span>
        )}
      </div>
      <div className="flex items-center gap-6">
        {['Products', 'Categories', 'About'].map((link) => (
          <a key={link} href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{link}</a>
        ))}
        <a href="#" className="px-4 py-2 rounded-full text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: primary }}>
          Cart (0)
        </a>
      </div>
    </nav>
  );
}

function HeroSection({ section, primaryColor, fontFamily }: { section: StorefrontSection; primaryColor: string; fontFamily: string }) {
  return (
    <section className="w-full py-20 px-6 flex flex-col items-center justify-center text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}18 0%, ${primaryColor}08 100%)`, fontFamily, borderBottom: `3px solid ${primaryColor}22` }}>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 max-w-2xl leading-tight" style={{ color: primaryColor }}>{section.title || 'Welcome to our store'}</h1>
      {section.subtitle && <p className="text-lg text-gray-600 mb-8 max-w-xl">{section.subtitle}</p>}
      {section.cta_label && (
        <a href={section.cta_href || '/products'} className="inline-block px-8 py-3 rounded-full text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: primaryColor }}>
          {section.cta_label}
        </a>
      )}
    </section>
  );
}

function FeaturedProductsSection({ section, primaryColor, fontFamily }: { section: StorefrontSection; primaryColor: string; fontFamily: string }) {
  return (
    <section className="w-full py-14 px-6" style={{ fontFamily }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-gray-900" style={{ borderLeft: `4px solid ${primaryColor}`, paddingLeft: '12px' }}>{section.title || 'Featured Products'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-40 w-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                <span className="text-3xl">🛍</span>
              </div>
              <div className="p-3">
                <div className="h-3 rounded-full bg-gray-200 mb-2 w-3/4" />
                <div className="h-3 rounded-full bg-gray-100 mb-3 w-1/2" />
                <div className="text-xs font-bold px-3 py-1.5 rounded-full text-white text-center" style={{ backgroundColor: primaryColor }}>View product</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoriesGridSection({ section, primaryColor, fontFamily }: { section: StorefrontSection; primaryColor: string; fontFamily: string }) {
  const categories = ['Electronics', 'Clothing', 'Home', 'Sports', 'Beauty', 'Books'];
  return (
    <section className="w-full py-14 px-6 bg-gray-50" style={{ fontFamily }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-gray-900" style={{ borderLeft: `4px solid ${primaryColor}`, paddingLeft: '12px' }}>{section.title || 'Browse Categories'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <a key={cat} href="#" className="flex items-center justify-between rounded-2xl border bg-white px-5 py-4 font-semibold text-sm text-gray-700 hover:shadow-sm transition-all">
              {cat} <span className="text-gray-300">→</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ section, primaryColor, fontFamily }: { section: StorefrontSection; primaryColor: string; fontFamily: string }) {
  return (
    <section className="w-full py-16 px-6 text-center" style={{ fontFamily, backgroundColor: `${primaryColor}10`, borderTop: `1px solid ${primaryColor}22` }}>
      <div className="max-w-lg mx-auto">
        <div className="text-3xl mb-3">✉️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{section.title || 'Stay in the loop'}</h2>
        <p className="text-gray-500 text-sm mb-6">Get the latest deals and new arrivals straight to your inbox.</p>
        <div className="flex gap-2 max-w-sm mx-auto">
          <input type="email" placeholder="your@email.com" className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none" />
          <button className="px-5 py-2 rounded-full text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: primaryColor }}>Subscribe</button>
        </div>
      </div>
    </section>
  );
}

function FooterSection({ storeName, secondaryColor, fontFamily }: { storeName: string; secondaryColor: string; fontFamily: string }) {
  return (
    <footer className="w-full py-10 px-6" style={{ fontFamily, backgroundColor: secondaryColor, color: '#f8fafc' }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {['Shop', 'Help', 'Company', 'Legal'].map((col) => (
            <div key={col}>
              <p className="font-semibold text-sm mb-3 opacity-80">{col}</p>
              <ul className="space-y-2">
                {['Link 1', 'Link 2', 'Link 3'].map((link) => (
                  <li key={link}><a href="#" className="text-xs opacity-50 hover:opacity-80 transition-opacity">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs opacity-40">© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <div className="flex gap-4">
            {['Privacy', 'Terms', 'Cookies'].map((link) => (
              <a key={link} href="#" className="text-xs opacity-40 hover:opacity-70 transition-opacity">{link}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function RenderSection({ section, storeName, primary, secondary, font }: { section: StorefrontSection; storeName: string; primary: string; secondary: string; font: string }) {
  if (!section.enabled) return null;

  switch (section.type) {
    case 'hero':
      return <HeroSection section={section} primaryColor={primary} fontFamily={font} />;
    case 'featured_products':
      return <FeaturedProductsSection section={section} primaryColor={primary} fontFamily={font} />;
    case 'categories_grid':
      return <CategoriesGridSection section={section} primaryColor={primary} fontFamily={font} />;
    case 'newsletter':
      return <NewsletterSection section={section} primaryColor={primary} fontFamily={font} />;
    case 'footer':
      return <FooterSection storeName={storeName} secondaryColor={secondary} fontFamily={font} />;
    default:
      return null;
  }
}

export default function StorefrontPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { data: store, isLoading } = useStore(id || '');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading storefront...</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Store not found or inaccessible.</div>
      </div>
    );
  }

  const isPreview = searchParams.get('preview') === 'true';
  const rawLayout = isPreview ? store.storefront_layout_draft : store.storefront_layout_published;
  const sections = parseLayout(rawLayout);
  const primary = store.theme_primary_color || '#2563eb';
  const secondary = store.theme_secondary_color || '#0f172a';
  const font = store.theme_font_family || 'Inter';
  const isDark = store.theme_mode === 'dark';

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontFamily: font }}>
      {isPreview && (
        <div className="w-full bg-amber-400 text-amber-900 text-xs font-semibold text-center py-2 px-4">
          👁 Preview mode — this is your draft, not yet published.{' '}
          <a href={`/dashboard/stores/${id}/customize`} className="underline">Back to editor</a>
        </div>
      )}

      <Navbar name={store.name || 'Store'} logo={store.logo} primary={primary} font={font} />

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400">
          <p className="text-4xl mb-4">🏗</p>
          <p className="text-lg font-semibold">Store is being set up</p>
          <p className="text-sm mt-1">Add sections and publish from the editor.</p>
        </div>
      ) : (
        sections.map((section) => (
          <RenderSection
            key={section.id}
            section={section}
            storeName={store.name || 'Store'}
            primary={primary}
            secondary={secondary}
            font={font}
          />
        ))
      )}
    </div>
  );
}
