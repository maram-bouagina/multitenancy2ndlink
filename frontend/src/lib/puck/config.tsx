"use client";

import type { Config, Data } from "@puckeditor/core";
import {
  ArrowRight,
  Star,
  ShoppingBag,
  Mail,
  Phone,
  MapPin,
  Tag,
  Quote,
  ChevronRight,
  Clock,
  Truck,
  Shield,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/api/media-url";
import type {
  StorePublic,
  ProductPublic,
  CategoryPublic,
  CollectionPublic,
} from "@/lib/types/storefront";

/* ────────────────────────── dynamic data ──────────────────────────────── */

export interface StorefrontData {
  store: StorePublic;
  products: ProductPublic[];
  categories: CategoryPublic[];
  collections: CollectionPublic[];
}

/** Global context that every Puck component can consume. Injected via <Puck root>. */
let _sfData: StorefrontData | null = null;

export function setStorefrontData(data: StorefrontData) {
  _sfData = data;
}
export function getStorefrontData(): StorefrontData | null {
  return _sfData;
}

/* ─────────────────── helper: price formatter ─────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    price
  );
}

/* ─────────────────────────── Puck Config ─────────────────────────────── */

type PuckProps = {
  HeroBlock: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaLink: string;
    alignment: "left" | "center" | "right";
    showOverlay: boolean;
    backgroundImage: string;
    minHeight: string;
  };
  AnnouncementBar: {
    text: string;
    backgroundColor: string;
    textColor: string;
    link: string;
  };
  FeaturedProducts: {
    title: string;
    subtitle: string;
    columns: number;
    maxProducts: number;
    showViewAll: boolean;
  };
  CategoriesGrid: {
    title: string;
    subtitle: string;
    columns: number;
    style: "cards" | "circles" | "minimal";
  };
  CollectionsShowcase: {
    title: string;
    subtitle: string;
    columns: number;
  };
  Newsletter: {
    title: string;
    subtitle: string;
    buttonLabel: string;
    style: "banner" | "card" | "inline";
  };
  RichText: {
    content: string;
    alignment: "left" | "center" | "right";
    maxWidth: string;
  };
  ImageBanner: {
    imageUrl: string;
    alt: string;
    link: string;
    height: string;
    overlay: boolean;
    overlayText: string;
  };
  Spacer: {
    height: string;
  };
  Divider: {
    style: "solid" | "dashed" | "dotted";
    color: string;
    width: string;
  };
  Testimonials: {
    title: string;
    items: {
      quote: string;
      author: string;
      role: string;
      rating: number;
    }[];
  };
  FeatureColumns: {
    title: string;
    columns: {
      icon: string;
      heading: string;
      description: string;
    }[];
  };
  TrustBadges: {
    items: {
      icon: string;
      label: string;
      description: string;
    }[];
    style: "horizontal" | "grid";
  };
  VideoEmbed: {
    url: string;
    title: string;
    aspectRatio: "16:9" | "4:3" | "1:1";
  };
  FAQ: {
    title: string;
    items: { question: string; answer: string }[];
  };
  CallToAction: {
    title: string;
    subtitle: string;
    buttonLabel: string;
    buttonLink: string;
    style: "primary" | "secondary" | "outline";
  };
  StoreInfo: {
    showEmail: boolean;
    showPhone: boolean;
    showAddress: boolean;
    title: string;
  };
  CustomHTML: {
    code: string;
  };
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  shield: Shield,
  refresh: RefreshCw,
  clock: Clock,
  star: Star,
  tag: Tag,
  mail: Mail,
  phone: Phone,
  "shopping-bag": ShoppingBag,
};

export const puckConfig: Config<PuckProps> = {
  categories: {
    hero: { title: "Hero & Banners", components: ["HeroBlock", "AnnouncementBar", "ImageBanner"] },
    products: { title: "Products & Collections", components: ["FeaturedProducts", "CategoriesGrid", "CollectionsShowcase"] },
    content: { title: "Content", components: ["RichText", "Testimonials", "FeatureColumns", "FAQ", "VideoEmbed"] },
    marketing: { title: "Marketing", components: ["Newsletter", "CallToAction", "TrustBadges"] },
    layout: { title: "Layout", components: ["Spacer", "Divider"] },
    advanced: { title: "Advanced", components: ["StoreInfo", "CustomHTML"] },
  },

  components: {
    /* ─────────── Hero Block ─────────── */
    HeroBlock: {
      label: "Hero Banner",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        ctaLabel: { type: "text", label: "Button text" },
        ctaLink: { type: "text", label: "Button link" },
        alignment: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        backgroundImage: { type: "text", label: "Background image URL" },
        showOverlay: { type: "radio", label: "Dark overlay", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        minHeight: { type: "text", label: "Min height (CSS)" },
      },
      defaultProps: {
        title: "Welcome to Our Store",
        subtitle: "Discover our latest products and exclusive offers",
        ctaLabel: "Shop Now",
        ctaLink: "/products",
        alignment: "center",
        backgroundImage: "",
        showOverlay: false,
        minHeight: "420px",
      },
      render: ({ title, subtitle, ctaLabel, ctaLink, alignment, backgroundImage, showOverlay, minHeight }) => {
        const data = getStorefrontData();
        const store = data?.store;
        const primary = store?.theme_primary_color || "#2563eb";
        const secondary = store?.theme_secondary_color || "#0f172a";
        const slug = store?.slug || "";
        const href = ctaLink.startsWith("/") ? `/store/${slug}${ctaLink}` : ctaLink;
        const alignClass = alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";

        return (
          <section
            className="relative overflow-hidden px-4"
            style={{
              minHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: backgroundImage
                ? `url(${backgroundImage}) center/cover no-repeat`
                : `linear-gradient(135deg, ${primary}15 0%, ${secondary}10 100%)`,
            }}
          >
            {showOverlay && backgroundImage && (
              <div className="absolute inset-0 bg-black/40" />
            )}
            <div className={`relative mx-auto max-w-4xl py-20 ${alignClass}`}>
              <h1
                className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 ${
                  showOverlay && backgroundImage ? "text-white" : "text-gray-900"
                }`}
              >
                {title}
              </h1>
              <p
                className={`text-lg sm:text-xl mb-10 max-w-2xl ${alignment === "center" ? "mx-auto" : ""} ${
                  showOverlay && backgroundImage ? "text-white/90" : "text-gray-600"
                }`}
              >
                {subtitle}
              </p>
              {ctaLabel && (
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-105"
                  style={{ backgroundColor: primary }}
                >
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Announcement Bar ─────────── */
    AnnouncementBar: {
      label: "Announcement Bar",
      fields: {
        text: { type: "text", label: "Message" },
        backgroundColor: { type: "text", label: "Background color" },
        textColor: { type: "text", label: "Text color" },
        link: { type: "text", label: "Link (optional)" },
      },
      defaultProps: {
        text: "🎉 Free shipping on orders over €50!",
        backgroundColor: "#1e293b",
        textColor: "#ffffff",
        link: "",
      },
      render: ({ text, backgroundColor, textColor, link }) => {
        const inner = (
          <div
            className="py-2.5 px-4 text-center text-sm font-medium"
            style={{ backgroundColor, color: textColor }}
          >
            {text}
          </div>
        );
        if (link) {
          const data = getStorefrontData();
          const slug = data?.store?.slug || "";
          const href = link.startsWith("/") ? `/store/${slug}${link}` : link;
          return <Link href={href}>{inner}</Link>;
        }
        return inner;
      },
    },

    /* ─────────── Featured Products ─────────── */
    FeaturedProducts: {
      label: "Featured Products",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ],
        },
        maxProducts: {
          type: "select",
          label: "Max products",
          options: [
            { label: "4", value: 4 },
            { label: "6", value: 6 },
            { label: "8", value: 8 },
            { label: "12", value: 12 },
          ],
        },
        showViewAll: { type: "radio", label: "Show 'View All' link", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
      },
      defaultProps: {
        title: "Our Products",
        subtitle: "",
        columns: 4,
        maxProducts: 8,
        showViewAll: true,
      },
      render: ({ title, subtitle, columns, maxProducts, showViewAll }) => {
        const data = getStorefrontData();
        if (!data) return <div className="py-16 text-center text-gray-400">Loading products…</div>;

        const { store, products } = data;
        const shown = products.slice(0, maxProducts);
        const gridClass =
          columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : columns === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

        return (
          <section className="py-16 px-4">
            <div className="mx-auto max-w-7xl">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
                  {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
                </div>
                {showViewAll && (
                  <Link
                    href={`/store/${store.slug}/products`}
                    className="text-sm font-medium flex items-center gap-1 hover:opacity-80"
                    style={{ color: store.theme_primary_color }}
                  >
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className={`grid ${gridClass} gap-4 sm:gap-6`}>
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} slug={store.slug} primary={store.theme_primary_color} currency={store.currency} />
                ))}
              </div>
              {shown.length === 0 && (
                <p className="text-center text-gray-400 py-12">No products to display yet.</p>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Categories Grid ─────────── */
    CategoriesGrid: {
      label: "Categories Grid",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "3", value: 3 },
            { label: "4", value: 4 },
            { label: "6", value: 6 },
          ],
        },
        style: {
          type: "select",
          label: "Card style",
          options: [
            { label: "Cards", value: "cards" },
            { label: "Circles", value: "circles" },
            { label: "Minimal", value: "minimal" },
          ],
        },
      },
      defaultProps: { title: "Shop by Category", subtitle: "", columns: 6, style: "cards" },
      render: ({ title, subtitle, columns, style }) => {
        const data = getStorefrontData();
        if (!data) return <></>;
        const { store, categories } = data;
        if (categories.length === 0) return <></>;
        const primary = store.theme_primary_color;
        const gridClass =
          columns === 3
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            : columns === 4
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

        return (
          <section className="py-16 px-4" style={{ background: `${primary}08` }}>
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
                {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
              </div>
              <div className={`grid ${gridClass} gap-4`}>
                {categories.map((cat) => {
                  if (style === "circles") {
                    return (
                      <Link
                        key={cat.id}
                        href={`/store/${store.slug}/categories/${cat.slug}`}
                        className="flex flex-col items-center gap-3 p-4 hover:opacity-80 transition-opacity"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
                          style={{ backgroundColor: primary }}
                        >
                          {cat.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                      </Link>
                    );
                  }
                  if (style === "minimal") {
                    return (
                      <Link
                        key={cat.id}
                        href={`/store/${store.slug}/categories/${cat.slug}`}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-white/80 transition-colors text-gray-700 hover:text-gray-900"
                      >
                        <ChevronRight className="w-4 h-4" style={{ color: primary }} />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </Link>
                    );
                  }
                  // cards (default)
                  return (
                    <Link
                      key={cat.id}
                      href={`/store/${store.slug}/categories/${cat.slug}`}
                      className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all text-center"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: primary }}
                      >
                        {cat.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Collections Showcase ─────────── */
    CollectionsShowcase: {
      label: "Collections Showcase",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ],
        },
      },
      defaultProps: { title: "Our Collections", subtitle: "", columns: 3 },
      render: ({ title, subtitle, columns }) => {
        const data = getStorefrontData();
        if (!data) return <></>;
        const { store, collections } = data;
        if (collections.length === 0) return <></>;
        const primary = store.theme_primary_color;
        const gridClass =
          columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : columns === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

        return (
          <section className="py-16 px-4">
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
                {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
              </div>
              <div className={`grid ${gridClass} gap-6`}>
                {collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/store/${store.slug}/collections/${col.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-gray-100 hover:shadow-lg transition-all"
                  >
                    <div
                      className="h-48 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${primary}20, ${primary}05)` }}
                    >
                      <ShoppingBag className="w-12 h-12 text-gray-300 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-gray-900 group-hover:underline">{col.name}</h3>
                      <span className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        Browse collection <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Newsletter ─────────── */
    Newsletter: {
      label: "Newsletter",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "text", label: "Subtitle" },
        buttonLabel: { type: "text", label: "Button text" },
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Banner (full-width)", value: "banner" },
            { label: "Card (centered)", value: "card" },
            { label: "Inline", value: "inline" },
          ],
        },
      },
      defaultProps: {
        title: "Stay Updated",
        subtitle: "Subscribe for exclusive offers and updates.",
        buttonLabel: "Subscribe",
        style: "card",
      },
      render: ({ title, subtitle, buttonLabel, style: nlStyle }) => {
        const data = getStorefrontData();
        const primary = data?.store?.theme_primary_color || "#2563eb";

        if (nlStyle === "inline") {
          return (
            <section className="py-10 px-4">
              <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="rounded-full px-4 py-2 text-sm border border-gray-300 outline-none focus:ring-2 focus:ring-offset-1"
                    style={{ "--tw-ring-color": primary } as React.CSSProperties}
                  />
                  <button
                    type="button"
                    className="rounded-full px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                    style={{ backgroundColor: primary }}
                  >
                    {buttonLabel}
                  </button>
                </div>
              </div>
            </section>
          );
        }

        if (nlStyle === "banner") {
          return (
            <section className="py-12 px-4" style={{ backgroundColor: primary }}>
              <div className="mx-auto max-w-3xl text-center text-white">
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                <p className="text-white/80 mb-6">{subtitle}</p>
                <div className="flex gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 rounded-full px-5 py-2.5 text-gray-900 text-sm outline-none"
                  />
                  <button
                    type="button"
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
                    style={{ color: primary }}
                  >
                    {buttonLabel}
                  </button>
                </div>
              </div>
            </section>
          );
        }

        // card (default)
        return (
          <section className="py-16 px-4">
            <div
              className="mx-auto max-w-2xl rounded-2xl p-10 text-center text-white"
              style={{ backgroundColor: primary }}
            >
              <h2 className="text-2xl font-bold mb-3">{title}</h2>
              <p className="text-white/80 mb-8">{subtitle}</p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 rounded-full px-5 py-2.5 text-gray-900 text-sm outline-none border-2 border-transparent focus:border-white/40"
                />
                <button
                  type="button"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
                  style={{ color: primary }}
                >
                  {buttonLabel}
                </button>
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Rich Text ─────────── */
    RichText: {
      label: "Rich Text",
      fields: {
        content: { type: "textarea", label: "Content (HTML supported)" },
        alignment: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        maxWidth: { type: "text", label: "Max width" },
      },
      defaultProps: { content: "<p>Add your content here...</p>", alignment: "center", maxWidth: "800px" },
      render: ({ content, alignment, maxWidth }) => (
        <section className="py-12 px-4">
          <div
            className={`mx-auto prose prose-gray text-${alignment}`}
            style={{ maxWidth, textAlign: alignment }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </section>
      ),
    },

    /* ─────────── Image Banner ─────────── */
    ImageBanner: {
      label: "Image Banner",
      fields: {
        imageUrl: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt text" },
        link: { type: "text", label: "Link (optional)" },
        height: { type: "text", label: "Height" },
        overlay: { type: "radio", label: "Dark overlay", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        overlayText: { type: "text", label: "Overlay text" },
      },
      defaultProps: {
        imageUrl: "",
        alt: "Banner image",
        link: "",
        height: "300px",
        overlay: false,
        overlayText: "",
      },
      render: ({ imageUrl, alt, link, height, overlay, overlayText }) => {
        const data = getStorefrontData();
        const slug = data?.store?.slug || "";
        const href = link?.startsWith("/") ? `/store/${slug}${link}` : link;
        const inner = (
          <div className="relative overflow-hidden" style={{ height }}>
            {imageUrl ? (
              <Image
                src={resolveMediaUrl(imageUrl)}
                alt={alt}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400">
                No image set
              </div>
            )}
            {overlay && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {overlayText && (
                  <p className="text-white text-2xl sm:text-3xl font-bold">{overlayText}</p>
                )}
              </div>
            )}
          </div>
        );
        if (href) {
          return <Link href={href}>{inner}</Link>;
        }
        return inner;
      },
    },

    /* ─────────── Spacer ─────────── */
    Spacer: {
      label: "Spacer",
      fields: {
        height: { type: "text", label: "Height (CSS value)" },
      },
      defaultProps: { height: "48px" },
      render: ({ height }) => <div style={{ height }} />,
    },

    /* ─────────── Divider ─────────── */
    Divider: {
      label: "Divider",
      fields: {
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ],
        },
        color: { type: "text", label: "Color" },
        width: { type: "text", label: "Max width" },
      },
      defaultProps: { style: "solid", color: "#e5e7eb", width: "100%" },
      render: ({ style: borderStyle, color, width }) => (
        <div className="px-4 py-4">
          <hr
            className="mx-auto border-0"
            style={{
              borderTop: `1px ${borderStyle} ${color}`,
              maxWidth: width,
            }}
          />
        </div>
      ),
    },

    /* ─────────── Testimonials ─────────── */
    Testimonials: {
      label: "Testimonials",
      fields: {
        title: { type: "text", label: "Section title" },
        items: {
          type: "array",
          label: "Testimonials",
          arrayFields: {
            quote: { type: "textarea", label: "Quote" },
            author: { type: "text", label: "Author" },
            role: { type: "text", label: "Role / Location" },
            rating: {
              type: "select",
              label: "Rating",
              options: [
                { label: "5 stars", value: 5 },
                { label: "4 stars", value: 4 },
                { label: "3 stars", value: 3 },
              ],
            },
          },
          defaultItemProps: {
            quote: "Amazing products and fast delivery!",
            author: "Customer",
            role: "",
            rating: 5,
          },
        },
      },
      defaultProps: {
        title: "What Our Customers Say",
        items: [
          { quote: "Amazing products and fast delivery!", author: "Sarah L.", role: "Verified Buyer", rating: 5 },
          { quote: "Great quality, will order again.", author: "Marc D.", role: "Verified Buyer", rating: 5 },
        ],
      },
      render: ({ title, items }) => {
        const data = getStorefrontData();
        const primary = data?.store?.theme_primary_color || "#2563eb";
        return (
          <section className="py-16 px-4">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">{title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: item.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Quote className="w-6 h-6" style={{ color: primary }} />
                    <p className="text-gray-700 text-sm leading-relaxed">{item.quote}</p>
                    <div className="pt-2 border-t border-gray-50">
                      <p className="font-medium text-gray-900 text-sm">{item.author}</p>
                      {item.role && <p className="text-xs text-gray-500">{item.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Feature Columns ─────────── */
    FeatureColumns: {
      label: "Feature Columns",
      fields: {
        title: { type: "text", label: "Section title" },
        columns: {
          type: "array",
          label: "Features",
          arrayFields: {
            icon: {
              type: "select",
              label: "Icon",
              options: [
                { label: "Truck (shipping)", value: "truck" },
                { label: "Shield (security)", value: "shield" },
                { label: "Refresh (returns)", value: "refresh" },
                { label: "Clock (24/7)", value: "clock" },
                { label: "Star", value: "star" },
                { label: "Tag (deals)", value: "tag" },
              ],
            },
            heading: { type: "text", label: "Heading" },
            description: { type: "textarea", label: "Description" },
          },
          defaultItemProps: {
            icon: "star",
            heading: "Feature",
            description: "Description of this feature.",
          },
        },
      },
      defaultProps: {
        title: "",
        columns: [
          { icon: "truck", heading: "Free Shipping", description: "On all orders over €50" },
          { icon: "shield", heading: "Secure Payment", description: "100% secure checkout" },
          { icon: "refresh", heading: "Easy Returns", description: "30-day return policy" },
          { icon: "clock", heading: "24/7 Support", description: "We're here to help" },
        ],
      },
      render: ({ title, columns }) => {
        const data = getStorefrontData();
        const primary = data?.store?.theme_primary_color || "#2563eb";
        return (
          <section className="py-14 px-4">
            <div className="mx-auto max-w-7xl">
              {title && (
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">{title}</h2>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {columns.map((col, i) => {
                  const IconComponent = ICON_MAP[col.icon] || Star;
                  return (
                    <div key={i} className="text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}15` }}>
                        <span style={{ color: primary }}><IconComponent className="w-6 h-6" /></span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{col.heading}</h3>
                      <p className="text-sm text-gray-500">{col.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Trust Badges ─────────── */
    TrustBadges: {
      label: "Trust Badges",
      fields: {
        items: {
          type: "array",
          label: "Badges",
          arrayFields: {
            icon: {
              type: "select",
              label: "Icon",
              options: [
                { label: "Shield", value: "shield" },
                { label: "Truck", value: "truck" },
                { label: "Refresh", value: "refresh" },
                { label: "Clock", value: "clock" },
                { label: "Star", value: "star" },
              ],
            },
            label: { type: "text", label: "Label" },
            description: { type: "text", label: "Description" },
          },
          defaultItemProps: { icon: "shield", label: "Trustworthy", description: "" },
        },
        style: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Horizontal", value: "horizontal" },
            { label: "Grid", value: "grid" },
          ],
        },
      },
      defaultProps: {
        items: [
          { icon: "shield", label: "Secure Payment", description: "256-bit SSL" },
          { icon: "truck", label: "Free Delivery", description: "Over €50" },
          { icon: "refresh", label: "Free Returns", description: "30 days" },
        ],
        style: "horizontal",
      },
      render: ({ items, style: badgeStyle }) => {
        const data = getStorefrontData();
        const primary = data?.store?.theme_primary_color || "#2563eb";
        const layoutClass = badgeStyle === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-4" : "flex flex-wrap justify-center gap-8";

        return (
          <section className="py-8 px-4 border-y border-gray-100">
            <div className={`mx-auto max-w-5xl ${layoutClass}`}>
              {items.map((item, i) => {
                const IconComponent = ICON_MAP[item.icon] || Shield;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span style={{ color: primary }}><IconComponent className="w-5 h-5 shrink-0" /></span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Video Embed ─────────── */
    VideoEmbed: {
      label: "Video Embed",
      fields: {
        url: { type: "text", label: "Video URL (YouTube/Vimeo embed URL)" },
        title: { type: "text", label: "Title" },
        aspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: [
            { label: "16:9", value: "16:9" },
            { label: "4:3", value: "4:3" },
            { label: "1:1", value: "1:1" },
          ],
        },
      },
      defaultProps: { url: "", title: "", aspectRatio: "16:9" },
      render: ({ url, title, aspectRatio }) => {
        const padding = aspectRatio === "4:3" ? "75%" : aspectRatio === "1:1" ? "100%" : "56.25%";
        return (
          <section className="py-12 px-4">
            <div className="mx-auto max-w-4xl">
              {title && <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{title}</h2>}
              {url ? (
                <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: padding }}>
                  <iframe
                    src={url}
                    title={title || "Video"}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-gray-100 flex items-center justify-center" style={{ paddingBottom: padding, position: "relative" }}>
                  <p className="absolute inset-0 flex items-center justify-center text-gray-400">Enter a video embed URL</p>
                </div>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── FAQ ─────────── */
    FAQ: {
      label: "FAQ",
      fields: {
        title: { type: "text", label: "Section title" },
        items: {
          type: "array",
          label: "Questions",
          arrayFields: {
            question: { type: "text", label: "Question" },
            answer: { type: "textarea", label: "Answer" },
          },
          defaultItemProps: { question: "Your question?", answer: "Your answer." },
        },
      },
      defaultProps: {
        title: "Frequently Asked Questions",
        items: [
          { question: "What payment methods do you accept?", answer: "We accept Visa, Mastercard, and PayPal." },
          { question: "How long does shipping take?", answer: "Standard shipping takes 3-5 business days." },
        ],
      },
      render: ({ title, items }) => (
        <section className="py-16 px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">{title}</h2>
            <div className="space-y-4">
              {items.map((item, i) => (
                <details key={i} className="group rounded-xl border border-gray-200 bg-white">
                  <summary className="cursor-pointer px-6 py-4 font-medium text-gray-900 flex items-center justify-between">
                    {item.question}
                    <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ),
    },

    /* ─────────── CallToAction ─────────── */
    CallToAction: {
      label: "Call to Action",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        buttonLabel: { type: "text", label: "Button text" },
        buttonLink: { type: "text", label: "Button link" },
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Primary (filled)", value: "primary" },
            { label: "Secondary (subtle)", value: "secondary" },
            { label: "Outline", value: "outline" },
          ],
        },
      },
      defaultProps: {
        title: "Ready to get started?",
        subtitle: "Browse our full catalog and find what you need.",
        buttonLabel: "Shop Now",
        buttonLink: "/products",
        style: "primary",
      },
      render: ({ title, subtitle, buttonLabel, buttonLink, style: ctaStyle }) => {
        const data = getStorefrontData();
        const store = data?.store;
        const primary = store?.theme_primary_color || "#2563eb";
        const slug = store?.slug || "";
        const href = buttonLink.startsWith("/") ? `/store/${slug}${buttonLink}` : buttonLink;

        const bgStyle =
          ctaStyle === "primary"
            ? { backgroundColor: primary, color: "#fff" }
            : ctaStyle === "secondary"
            ? { backgroundColor: `${primary}10`, color: "#111827" }
            : { backgroundColor: "transparent", color: "#111827", border: `2px solid ${primary}` };

        const btnClass =
          ctaStyle === "primary"
            ? "bg-white hover:opacity-90"
            : "text-white hover:opacity-90";
        const btnStyle =
          ctaStyle === "primary"
            ? { color: primary }
            : { backgroundColor: primary };

        return (
          <section className="py-16 px-4">
            <div className="mx-auto max-w-3xl rounded-2xl p-10 text-center" style={bgStyle}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">{title}</h2>
              {subtitle && <p className="opacity-80 mb-8">{subtitle}</p>}
              <Link
                href={href}
                className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold transition-all ${btnClass}`}
                style={btnStyle}
              >
                {buttonLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Store Info ─────────── */
    StoreInfo: {
      label: "Store Info",
      fields: {
        title: { type: "text", label: "Section title" },
        showEmail: { type: "radio", label: "Show email", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showPhone: { type: "radio", label: "Show phone", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showAddress: { type: "radio", label: "Show address", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
      },
      defaultProps: { title: "Contact Us", showEmail: true, showPhone: true, showAddress: true },
      render: ({ title, showEmail, showPhone, showAddress }) => {
        const data = getStorefrontData();
        const store = data?.store;
        if (!store) return <></>;
        const primary = store.theme_primary_color;
        return (
          <section className="py-12 px-4">
            <div className="mx-auto max-w-2xl text-center space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <div className="space-y-3 text-gray-600">
                {showEmail && store.email && (
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: primary }} />
                    <a href={`mailto:${store.email}`} className="hover:underline">{store.email}</a>
                  </div>
                )}
                {showPhone && store.phone && (
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" style={{ color: primary }} />
                    <a href={`tel:${store.phone}`} className="hover:underline">{store.phone}</a>
                  </div>
                )}
                {showAddress && store.address && (
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: primary }} />
                    <span>{store.address}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Custom HTML ─────────── */
    CustomHTML: {
      label: "Custom HTML",
      fields: {
        code: { type: "textarea", label: "HTML code" },
      },
      defaultProps: { code: "" },
      render: ({ code }) => {
        if (!code) return <></>;
        return (
          <section className="py-4 px-4">
            <div className="mx-auto max-w-7xl" dangerouslySetInnerHTML={{ __html: code }} />
          </section>
        );
      },
    },
  },
};

/* ─────────────── Shared product card ─────────────────────────────────── */

function ProductCard({
  product,
  slug,
  primary,
  currency,
}: {
  product: ProductPublic;
  slug: string;
  primary: string;
  currency: string;
}) {
  const image = product.images?.[0];
  return (
    <Link
      href={`/store/${slug}/products/${product.slug}`}
      className="group flex flex-col rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {image ? (
          <Image
            src={resolveMediaUrl(image.url_medium || image.url)}
            alt={image.alt_text || product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <Tag className="w-12 h-12" />
          </div>
        )}
        {product.is_on_sale && (
          <span
            className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: "#ef4444" }}
          >
            Sale
          </span>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        {product.brand && (
          <p className="text-xs text-gray-400 uppercase tracking-wide">{product.brand}</p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{product.title}</h3>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(product.effective_price, currency)}
          </span>
          {product.is_on_sale && (
            <span className="text-sm line-through text-gray-400">
              {formatPrice(product.price, currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────── Empty data for Puck ─────────────────────────────────── */

export const emptyPuckData: Data = {
  root: { props: {} },
  content: [],
};

export function getDefaultPuckData(): Data {
  return {
    root: { props: {} },
    content: [
      {
        type: "HeroBlock",
        props: {
          id: "hero-default",
          title: "Welcome to Our Store",
          subtitle: "Discover our latest products and exclusive offers",
          ctaLabel: "Shop Now",
          ctaLink: "/products",
          alignment: "center",
          backgroundImage: "",
          showOverlay: false,
          minHeight: "420px",
        },
      },
      {
        type: "TrustBadges",
        props: {
          id: "badges-default",
          items: [
            { icon: "shield", label: "Secure Payment", description: "256-bit SSL" },
            { icon: "truck", label: "Free Delivery", description: "Over €50" },
            { icon: "refresh", label: "Free Returns", description: "30 days" },
          ],
          style: "horizontal",
        },
      },
      {
        type: "FeaturedProducts",
        props: {
          id: "products-default",
          title: "Our Products",
          subtitle: "",
          columns: 4,
          maxProducts: 8,
          showViewAll: true,
        },
      },
      {
        type: "CategoriesGrid",
        props: {
          id: "categories-default",
          title: "Shop by Category",
          subtitle: "",
          columns: 6,
          style: "cards",
        },
      },
      {
        type: "Newsletter",
        props: {
          id: "newsletter-default",
          title: "Stay Updated",
          subtitle: "Subscribe for exclusive offers and updates.",
          buttonLabel: "Subscribe",
          style: "card",
        },
      },
    ],
  };
}
