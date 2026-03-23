"use client";

import { Render, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import {
  puckConfig,
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
import { useEffect, useState } from "react";

interface Props {
  store: StorePublic;
  products: ProductPublic[];
  categories: CategoryPublic[];
  collections: CollectionPublic[];
}

export function PuckStorefrontRenderer({
  store,
  products,
  categories,
  collections,
}: Props) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    // Inject storefront data for Puck components
    setStorefrontData({
      store,
      products,
      categories,
      collections,
    } satisfies StorefrontData);

    // Parse the published layout
    let parsed: Data | null = null;
    try {
      const raw = store.storefront_layout;
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object" && Array.isArray(obj.content)) {
          parsed = obj as Data;
        }
      }
    } catch {
      /* ignore */
    }

    setData(parsed && parsed.content.length > 0 ? parsed : getDefaultPuckData());
  }, [store, products, categories, collections]);

  if (!data) return null;

  return <Render config={puckConfig} data={data} />;
}
