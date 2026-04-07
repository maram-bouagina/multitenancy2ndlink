"use client";

import { Render, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import {
  buildPuckConfig,
  createCatalogFieldOptions,
  setStorefrontData,
  getDefaultPuckData,
  type StorefrontData,
} from "@/lib/puck/config";
import type {
  StorePublic,
  ProductPublic,
  CategoryPublic,
  CollectionPublic,
} from "@/lib/types/storefront";
import type { StorefrontPageListItem } from "@/lib/api/storefront-client";
import { useMemo } from "react";

interface Props {
  store: StorePublic;
  products: ProductPublic[];
  categories: CategoryPublic[];
  collections: CollectionPublic[];
  pages?: StorefrontPageListItem[];
  layoutOverride?: string;
}

export function PuckStorefrontRenderer({
  store,
  products,
  categories,
  collections,
  pages,
  layoutOverride,
}: Props) {
  const config = useMemo(
    () => buildPuckConfig(createCatalogFieldOptions({ store, products, categories, collections }), store.language === "ar" ? "ar" : store.language === "fr" ? "fr" : "en"),
    [categories, collections, products, store],
  );

  // Call synchronously during render so getStorefrontData() returns data
  // when Puck's Render executes component render functions.
  setStorefrontData({ store, products, categories, collections, pages } satisfies StorefrontData);

  const data = useMemo(() => {
    let parsed: Data | null = null;
    try {
      const raw = layoutOverride ?? store.storefront_layout;
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object" && Array.isArray(obj.content)) {
          parsed = obj as Data;
        }
      }
    } catch {
      parsed = null;
    }

    const lang = store.language === "ar" ? "ar" : store.language === "fr" ? "fr" : "en";
    const full = parsed && parsed.content.length > 0 ? parsed : getDefaultPuckData(lang);

    // Strip shell components — header/nav/footer are rendered by StorefrontView
    const SHELL_TYPES = new Set(["StoreHeader", "StoreNavigation", "StoreFooter"]);
    return {
      ...full,
      content: full.content.filter((item) => !SHELL_TYPES.has(item.type)),
    };
  }, [layoutOverride, store.language, store.storefront_layout]);

  return (
    <div data-puck-page>
      <Render config={config} data={data} />
    </div>
  );
}
