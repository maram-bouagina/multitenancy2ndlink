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
import { useEffect, useMemo } from "react";

interface Props {
  store: StorePublic;
  products: ProductPublic[];
  categories: CategoryPublic[];
  collections: CollectionPublic[];
  layoutOverride?: string;
}

export function PuckStorefrontRenderer({
  store,
  products,
  categories,
  collections,
  layoutOverride,
}: Props) {
  const config = useMemo(
    () => buildPuckConfig(createCatalogFieldOptions({ store, products, categories, collections }), store.language === "ar" ? "ar" : store.language === "fr" ? "fr" : "en"),
    [categories, collections, products, store],
  );

  useEffect(() => {
    setStorefrontData({
      store,
      products,
      categories,
      collections,
    } satisfies StorefrontData);
  }, [categories, collections, products, store]);

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
    return parsed && parsed.content.length > 0 ? parsed : getDefaultPuckData(lang);
  }, [layoutOverride, store.language, store.storefront_layout]);

  return <Render config={config} data={data} />;
}
