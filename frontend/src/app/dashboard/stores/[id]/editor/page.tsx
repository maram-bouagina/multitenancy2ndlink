"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Puck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import {
  puckConfig,
  setStorefrontData,
  getDefaultPuckData,
  emptyPuckData,
  type StorefrontData,
} from "@/lib/puck/config";
import {
  useStore,
  useUpdateStore,
  usePublishStoreCustomization,
} from "@/lib/hooks/use-api";
import { getStore, getCategories, getProducts, getCollections } from "@/lib/api/storefront-client";
import { ArrowLeft, Send } from "lucide-react";

/* Keep a stable default so we don't re-parse inside effects */
function parsePuckData(raw?: string): Data | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Accept valid Puck shape: must have content array
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.content)) {
      return parsed as Data;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function PuckEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  const { data: store, isLoading: storeLoading } = useStore(id);
  const updateMutation = useUpdateStore();
  const publishMutation = usePublishStoreCustomization();

  const [dataReady, setDataReady] = useState(false);
  const [initialData, setInitialData] = useState<Data>(emptyPuckData);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Prevent repeated data init
  const didInit = useRef(false);

  /* ─── Load live storefront data for component previews ─── */
  useEffect(() => {
    if (!store || didInit.current) return;
    didInit.current = true;

    (async () => {
      try {
        const [publicStore, categories, collections, { products }] = await Promise.all([
          getStore(store.slug),
          getCategories(store.slug),
          getCollections(store.slug),
          getProducts(store.slug, { limit: 24, sort: "newest" }),
        ]);

        setStorefrontData({
          store: publicStore,
          products,
          categories,
          collections,
        } satisfies StorefrontData);
      } catch {
        // Storefront might not have data yet — that's fine
        setStorefrontData({
          store: {
            id: store.id,
            name: store.name,
            slug: store.slug,
            logo: store.logo,
            email: store.email,
            phone: store.phone,
            address: store.address,
            currency: store.currency,
            language: store.language,
            theme_primary_color: store.theme_primary_color,
            theme_secondary_color: store.theme_secondary_color,
            theme_mode: store.theme_mode,
            theme_font_family: store.theme_font_family,
            storefront_layout: store.storefront_layout_published || "[]",
          },
          products: [],
          categories: [],
          collections: [],
        });
      }

      // Parse stored draft or set defaults
      const parsed = parsePuckData(store.storefront_layout_draft);
      setInitialData(parsed || getDefaultPuckData());
      setDataReady(true);
    })();
  }, [store]);

  /* ─── Save (draft only) ─── */
  const handleSave = useCallback(
    async (data: Data) => {
      if (!id) return;
      setStatus(null);
      try {
        await updateMutation.mutateAsync({
          id,
          data: { storefront_layout_draft: JSON.stringify(data) },
        });
        setStatus({ type: "success", text: "Draft saved!" });
        setTimeout(() => setStatus(null), 3000);
      } catch {
        setStatus({ type: "error", text: "Failed to save draft." });
      }
    },
    [id, updateMutation]
  );

  /* ─── Publish ─── */
  const handlePublish = useCallback(
    async (data: Data) => {
      if (!id) return;
      setPublishing(true);
      setStatus(null);
      try {
        // Save draft first, then promote to published
        await updateMutation.mutateAsync({
          id,
          data: { storefront_layout_draft: JSON.stringify(data) },
        });
        await publishMutation.mutateAsync({ id, useDraftLayout: true });
        setStatus({ type: "success", text: "Storefront published! 🎉" });
        setTimeout(() => setStatus(null), 4000);
      } catch {
        setStatus({ type: "error", text: "Failed to publish." });
      } finally {
        setPublishing(false);
      }
    },
    [id, updateMutation, publishMutation]
  );

  if (storeLoading || !dataReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading editor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/stores/${id}`}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to store
          </Link>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm font-medium text-gray-900">
            {store?.name || "Store"} — Visual Editor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                status.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {status.text}
            </span>
          )}
        </div>
      </div>

      {/* Puck Editor */}
      <div className="flex-1 overflow-hidden">
        <Puck
          config={puckConfig}
          data={initialData}
          onPublish={async (data) => {
            await handlePublish(data);
          }}
          headerTitle={store?.name}
          headerPath={`/store/${store?.slug}`}
          overrides={{
            headerActions: ({ children }) => (
              <>
                {children}
                <button
                  type="button"
                  disabled={publishing}
                  className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  onClick={async () => {
                    /* Grab current data from Puck by triggering the publish callback
                       Puck's built-in Publish button already calls onPublish.
                       This extra button is kept in case user wants explicit UX */
                  }}
                >
                  <Send className="w-3 h-3" />
                  {publishing ? "Publishing…" : "Publish Live"}
                </button>
              </>
            ),
          }}
        />
      </div>
    </div>
  );
}
