"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Puck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import {
  buildPuckConfig,
  createCatalogFieldOptions,
  setStorefrontData,
  getDefaultPuckData,
  type StorefrontData,
} from "@/lib/puck/config";
import {
  useStore,
  useUpdateStore,
  useUploadStoreLogo,
  usePublishStoreCustomization,
  useUpdatePage,
  usePublishPage,
  usePage,
} from "@/lib/hooks/use-api";
import { useLanguage } from "@/lib/hooks/use-language";
import { getStore, getCategories, getProducts, getCollections } from "@/lib/api/storefront-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Check, Eye, Monitor, Paintbrush, Palette, Save, Send,
  Smartphone, Store, Tablet, Type, Upload, X,
} from "lucide-react";

// ── Device switcher ──────────────────────────────────────────────────────────

type DeviceKey = "desktop" | "tablet" | "mobile";

const DEVICES: { key: DeviceKey; label: string; icon: typeof Monitor; width: string }[] = [
  { key: "desktop", label: "Desktop", icon: Monitor,    width: "100%"  },
  { key: "tablet",  label: "Tablet",  icon: Tablet,     width: "768px" },
  { key: "mobile",  label: "Mobile",  icon: Smartphone, width: "390px" },
];

// ── Color palettes ────────────────────────────────────────────────────────────

type ColorPalette = { key: string; primary: string; secondary: string; mode: "light" | "dark" };

const COLOR_PALETTES: ColorPalette[] = [
  { key: "paletteOcean",    primary: "#0ea5e9", secondary: "#0c4a6e", mode: "light" },
  { key: "paletteForest",   primary: "#16a34a", secondary: "#14532d", mode: "light" },
  { key: "paletteSunset",   primary: "#f97316", secondary: "#431407", mode: "light" },
  { key: "paletteRoyal",    primary: "#7c3aed", secondary: "#1e1b4b", mode: "dark"  },
  { key: "paletteMono",     primary: "#18181b", secondary: "#09090b", mode: "light" },
  { key: "paletteRose",     primary: "#e11d48", secondary: "#1c1917", mode: "light" },
  { key: "paletteTeal",     primary: "#14b8a6", secondary: "#134e4a", mode: "light" },
  { key: "paletteLavender", primary: "#a78bfa", secondary: "#1e1b4b", mode: "dark"  },
];

// ── Typography presets ────────────────────────────────────────────────────────

type TypoPreset = { key: string; font: string };

const TYPO_PRESETS: TypoPreset[] = [
  { key: "typoModern",    font: "Inter"            },
  { key: "typoElegant",   font: "Playfair Display" },
  { key: "typoFriendly",  font: "Nunito"           },
  { key: "typoGeometric", font: "Outfit"           },
  { key: "typoBold",      font: "Sora"             },
  { key: "typoClassic",   font: "DM Sans"          },
];

const FONT_OPTIONS = ["Inter", "Sora", "Outfit", "DM Sans", "Nunito", "Playfair Display"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePuckData(raw?: string): Data | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.content)) {
      return parsed as Data;
    }
  } catch {
    // fall back to defaults
  }
  return null;
}

function normalizeColor(value: string, fallback: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

function serializeData(data: Data) {
  return JSON.stringify(data);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoreBuilderPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const { t, lang }  = useLanguage();

  const id     = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const pageId = searchParams.get("pageId");

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: store,    isLoading: storeLoading } = useStore(id);
  const { data: pageData, isLoading: pageLoading  } = usePage(id, pageId ?? "");

  // Home page = no pageId, OR pageId is "index", OR the page slug is "index"
  const isHomePage = !pageId || pageId === "index" || pageData?.slug === "index";

  const updateMutation      = useUpdateStore();
  const updatePageMutation  = useUpdatePage();
  const publishPageMutation = usePublishPage();
  const uploadLogoMutation  = useUploadStoreLogo();
  const publishMutation     = usePublishStoreCustomization();
  const logoInputRef        = useRef<HTMLInputElement>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [currentData,     setCurrentData]     = useState<Data | null>(null);
  const [puckBootKey,     setPuckBootKey]     = useState(0);
  const [status,          setStatus]          = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logo,            setLogo]            = useState<string | null>(null);
  const [primaryColor,    setPrimaryColor]    = useState<string | null>(null);
  const [secondaryColor,  setSecondaryColor]  = useState<string | null>(null);
  const [themeMode,       setThemeMode]       = useState<"light" | "dark" | "auto" | null>(null);
  const [fontFamily,      setFontFamily]      = useState<string | null>(null);
  const [previewSeed,     setPreviewSeed]     = useState<StorefrontData | null>(null);
  const [device,           setDevice]           = useState<DeviceKey>("desktop");

  // ── Load catalogue data for Puck preview ────────────────────────────────────
  useEffect(() => {
    if (!store) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [publicStore, categories, collections, { products }] = await Promise.all([
          getStore(store.slug),
          getCategories(store.slug),
          getCollections(store.slug),
          getProducts(store.slug, { limit: 24, sort: "newest" }),
        ]);
        if (!cancelled) setPreviewSeed({ store: publicStore, products, categories, collections });
      } catch {
        if (!cancelled) {
          setPreviewSeed({
            store: {
              id: store.id, name: store.name, slug: store.slug,
              logo: store.logo, email: store.email, phone: store.phone,
              address: store.address, currency: store.currency,
              language: store.language,
              theme_primary_color:   store.theme_primary_color,
              theme_secondary_color: store.theme_secondary_color,
              theme_mode:            store.theme_mode,
              theme_font_family:     store.theme_font_family,
              storefront_layout:     store.storefront_layout_published || "[]",
            },
            products: [], categories: [], collections: [],
          });
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [store]);

  // ── Reset canvas when switching pages ───────────────────────────────────────
  useEffect(() => { setCurrentData(null); }, [pageId]);

  // ── Layout source ───────────────────────────────────────────────────────────
  const initialData = useMemo(() => {
    const raw = pageId ? pageData?.layout_draft : store?.storefront_layout_draft;
    return parsePuckData(raw) || getDefaultPuckData(lang);
  }, [lang, pageId, pageData?.layout_draft, store?.storefront_layout_draft]);

  const publishedData = useMemo(() => {
    const raw = pageId ? pageData?.layout_published : store?.storefront_layout_published;
    return parsePuckData(raw) || getDefaultPuckData(lang);
  }, [lang, pageId, pageData?.layout_published, store?.storefront_layout_published]);

  // ── Effective theme values ──────────────────────────────────────────────────
  const effectiveCurrentData    = currentData     || initialData;
  const effectiveLogo           = logo            ?? store?.logo                ?? "";
  const effectivePrimaryColor   = primaryColor    ?? store?.theme_primary_color   ?? "#2563eb";
  const effectiveSecondaryColor = secondaryColor  ?? store?.theme_secondary_color ?? "#0f172a";
  const effectiveThemeMode      = themeMode       ?? store?.theme_mode            ?? "light";
  const effectiveFontFamily     = fontFamily      ?? store?.theme_font_family     ?? "Inter";

  const normalizedPrimary   = useMemo(() => normalizeColor(effectivePrimaryColor,   "#2563eb"), [effectivePrimaryColor]);
  const normalizedSecondary = useMemo(() => normalizeColor(effectiveSecondaryColor, "#0f172a"), [effectiveSecondaryColor]);

  // ── Live preview seed ───────────────────────────────────────────────────────
  const livePreviewData = useMemo(() => {
    if (!previewSeed) return null;
    return {
      ...previewSeed,
      store: {
        ...previewSeed.store,
        logo:                  effectiveLogo || undefined,
        theme_primary_color:   normalizedPrimary,
        theme_secondary_color: normalizedSecondary,
        theme_mode:            effectiveThemeMode,
        theme_font_family:     effectiveFontFamily,
      },
    } satisfies StorefrontData;
  }, [effectiveFontFamily, effectiveLogo, effectiveThemeMode, normalizedPrimary, normalizedSecondary, previewSeed]);

  // Inject storefront data synchronously so Puck components have it on first render.
  if (livePreviewData) {
    setStorefrontData(livePreviewData);
  }

  useEffect(() => {
    if (livePreviewData) {
      setPuckBootKey((k) => (k === 0 ? 1 : k));
    }
  }, [livePreviewData]);

  // ── Puck config ─────────────────────────────────────────────────────────────
  const editorConfig = useMemo(
    () => buildPuckConfig(createCatalogFieldOptions(previewSeed || livePreviewData), lang),
    [lang, livePreviewData, previewSeed],
  );

  // ── Change detection ────────────────────────────────────────────────────────
  const hasUnsavedThemeChanges =
    effectiveLogo           !== (store?.logo                    ?? "")        ||
    effectivePrimaryColor   !== (store?.theme_primary_color     ?? "#2563eb") ||
    effectiveSecondaryColor !== (store?.theme_secondary_color   ?? "#0f172a") ||
    effectiveThemeMode      !== (store?.theme_mode              ?? "light")   ||
    effectiveFontFamily     !== (store?.theme_font_family       ?? "Inter");

  const hasUnsavedLayoutChanges     = useMemo(() => serializeData(effectiveCurrentData) !== serializeData(initialData),   [effectiveCurrentData, initialData]);
  const hasUnpublishedLayoutChanges = useMemo(() => serializeData(initialData)          !== serializeData(publishedData), [initialData, publishedData]);

  // ── Persist store draft + theme ─────────────────────────────────────────────
  const persistDraft = useCallback(async (layoutData: Data) => {
    if (!id) return;
    await updateMutation.mutateAsync({
      id,
      data: {
        logo:                    effectiveLogo        || undefined,
        theme_primary_color:     normalizedPrimary,
        theme_secondary_color:   normalizedSecondary,
        theme_mode:              effectiveThemeMode,
        theme_font_family:       effectiveFontFamily,
        storefront_layout_draft: JSON.stringify(layoutData),
      },
    });
  }, [effectiveFontFamily, effectiveLogo, effectiveThemeMode, id, normalizedPrimary, normalizedSecondary, updateMutation]);

  // ── Save draft ──────────────────────────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    if (!id) return;
    setStatus(null);
    try {
      if (pageId) {
        await updatePageMutation.mutateAsync({
          storeId: id, pageId,
          data: { layout_draft: JSON.stringify(effectiveCurrentData) },
        });
      } else {
        await persistDraft(effectiveCurrentData);
      }
      setStatus({ type: "success", text: t.storeEditorPage.draftSaved });
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus({ type: "error", text: t.storeEditorPage.draftSaveFailed });
    }
  }, [effectiveCurrentData, id, pageId, persistDraft, updatePageMutation, t.storeEditorPage.draftSaveFailed, t.storeEditorPage.draftSaved]);

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async (data: Data) => {
    if (!id) return;
    setStatus(null);
    try {
      if (pageId) {
        await updatePageMutation.mutateAsync({ storeId: id, pageId, data: { layout_draft: JSON.stringify(data) } });
        await publishPageMutation.mutateAsync({ storeId: id, pageId });
      } else {
        await persistDraft(data);
        await publishMutation.mutateAsync({ id, useDraftLayout: true });
      }
      setStatus({ type: "success", text: t.storeEditorPage.published });
      setTimeout(() => setStatus(null), 4000);
    } catch {
      setStatus({ type: "error", text: t.storeEditorPage.publishFailed });
    }
  }, [id, pageId, persistDraft, publishMutation, publishPageMutation, updatePageMutation, t.storeEditorPage.publishFailed, t.storeEditorPage.published]);

  // ── Loading guard ───────────────────────────────────────────────────────────
  if (storeLoading || !store || (pageId && pageLoading) || !previewSeed) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">{t.storeEditorPage.loadingEditor}</p>
        </div>
      </div>
    );
  }

  const isBusy = updateMutation.isPending || publishMutation.isPending || updatePageMutation.isPending || publishPageMutation.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-50">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 shrink-0 z-50">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Left */}
          <div className="space-y-1">
            <Link
              href={pageId ? `/dashboard/stores/${id}/pages` : `/dashboard/stores/${id}`}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              {pageId ? "Pages" : t.storeEditorPage.backToStore}
            </Link>
            <div className="flex items-center gap-2 text-slate-900">
              <Store className="h-4 w-4 text-blue-600" />
              <h1 className="text-base font-semibold">
                {store.name} · {pageId ? (pageData?.title ?? "Page") : t.storeEditorPage.title}
              </h1>
            </div>
          </div>

          {/* Center — device switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {DEVICES.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant={device === key ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setDevice(key)}
                title={label}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={() => void saveDraft()} disabled={isBusy}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {t.storeEditorPage.saveDraft}
            </Button>
            <Button type="button" size="sm" onClick={() => void handlePublish(effectiveCurrentData)} disabled={isBusy}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {t.storeEditorPage.publishAll}
            </Button>
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link
                href={pageId && pageData?.slug !== "index" ? `/store/${store.slug}/p/${pageData?.slug}` : `/store/${store.slug}`}
                target="_blank"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                {t.storeEditorPage.preview}
              </Link>
            </Button>
            {status && (
              <span className={`rounded px-2 py-1 text-xs font-medium ${
                status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}>
                {status.text}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── Editor body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">

        {/* Puck canvas */}
        <div
          data-device={device}
          className="min-w-0 min-h-0 overflow-hidden xl:border-r xl:border-gray-200 [&_.puck-Root]:h-full [&_.puck-Root]:flex [&_.puck-Root]:flex-col"
        >
          <Puck
            key={`${store.id}-${pageId ?? "home"}-${puckBootKey}`}
            config={editorConfig}
            data={currentData ?? initialData}
            onChange={(data) => setCurrentData(data)}
            headerTitle={store.name}
            headerPath={pageId && pageData?.slug !== "index" ? `/store/${store.slug}/p/${pageData?.slug}` : `/store/${store.slug}`}
            iframe={{ enabled: false }}
            overrides={{
              headerActions: () => <></>,
              preview: ({ children }) => {
                const isDark        = effectiveThemeMode === "dark";
                const pageBg        = isDark ? "#020617" : "#ffffff";
                const surface       = isDark ? "#0f172a" : "#ffffff";
                const surfaceAlt    = isDark ? "#111827" : "#f8fafc";
                const border        = isDark ? "rgba(148,163,184,0.18)" : "#e5e7eb";
                const textPrimary   = isDark ? "#f8fafc" : "#111827";
                const textSecondary = isDark ? "#cbd5e1" : "#4b5563";
                const textMuted     = isDark ? "#94a3b8" : "#9ca3af";
                return (
                  <div
                    style={{
                      width:      "100%",
                      background: pageBg,
                      minHeight:  "100%",
                      "--sf-primary":        normalizedPrimary,
                      "--sf-secondary":      normalizedSecondary,
                      "--sf-page-bg":        pageBg,
                      "--sf-surface":        surface,
                      "--sf-surface-alt":    surfaceAlt,
                      "--sf-border":         border,
                      "--sf-text-primary":   textPrimary,
                      "--sf-text-secondary": textSecondary,
                      "--sf-text-muted":     textMuted,
                      "--sf-font":           `'${effectiveFontFamily}', system-ui, sans-serif`,
                      fontFamily:            `'${effectiveFontFamily}', system-ui, sans-serif`,
                    } as React.CSSProperties}
                  >
                    {children}
                  </div>
                );
              },
            }}
          />
        </div>

        {/* Right panel */}
        <aside className="overflow-y-auto border-t border-gray-200 bg-slate-50 p-4 xl:border-l xl:border-t-0 space-y-4">

          {/* Draft status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.storeEditorPage.draftStatusTitle}</CardTitle>
              <CardDescription>{t.storeEditorPage.draftStatusDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className={`rounded-lg border px-3 py-2 ${
                hasUnsavedLayoutChanges || hasUnsavedThemeChanges
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}>
                {hasUnsavedLayoutChanges || hasUnsavedThemeChanges
                  ? t.storeEditorPage.unsavedChanges
                  : t.storeEditorPage.allChangesSaved}
              </div>
              <div className={`rounded-lg border px-3 py-2 ${
                hasUnpublishedLayoutChanges
                  ? "border-blue-200 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700"
              }`}>
                {hasUnpublishedLayoutChanges
                  ? t.storeEditorPage.unpublishedChanges
                  : t.storeEditorPage.publishedMatchesDraft}
              </div>
              <p>{t.storeEditorPage.themePublishNote}</p>
            </CardContent>
          </Card>

          {/* Theme — home only */}
          {isHomePage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Paintbrush className="h-4 w-4 text-blue-600" />
                  {t.storeEditorPage.themeTitle}
                </CardTitle>
                <CardDescription>{t.storeEditorPage.themeDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Logo */}
                <div className="space-y-1.5">
                  <Label>{t.storeEditorPage.logoUrl}</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file || !id) return;
                      uploadLogoMutation.mutate(
                        { storeId: id, file },
                        { onSuccess: (updated) => setLogo(updated.logo ?? "") },
                      );
                      event.target.value = "";
                    }}
                  />
                  {effectiveLogo && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                      <img
                        src={effectiveLogo.startsWith("/") ? `http://localhost:8000${effectiveLogo}` : effectiveLogo}
                        alt="Logo"
                        className="h-10 w-10 rounded object-contain"
                      />
                      <span className="flex-1 truncate text-xs text-slate-600">{effectiveLogo.split("/").pop()}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLogo("")}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <Button
                    type="button" variant="outline" className="w-full"
                    disabled={uploadLogoMutation.isPending}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadLogoMutation.isPending ? "Uploading..." : effectiveLogo ? "Change logo" : "Upload logo"}
                  </Button>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="builder-primary">{t.storeEditorPage.primaryColor}</Label>
                    <div className="flex items-center gap-2">
                      <input id="builder-primary" type="color" value={normalizedPrimary} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-10 rounded border" />
                      <Input value={effectivePrimaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="builder-secondary">{t.storeEditorPage.secondaryColor}</Label>
                    <div className="flex items-center gap-2">
                      <input id="builder-secondary" type="color" value={normalizedSecondary} onChange={(e) => setSecondaryColor(e.target.value)} className="h-9 w-10 rounded border" />
                      <Input value={effectiveSecondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="font-mono text-xs" />
                    </div>
                  </div>
                </div>

                {/* Theme mode */}
                <div className="space-y-1.5">
                  <Label>{t.storeEditorPage.themeMode}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["light", "dark", "auto"] as const).map((mode) => (
                      <Button key={mode} type="button" variant={effectiveThemeMode === mode ? "default" : "outline"} onClick={() => setThemeMode(mode)}>
                        {mode === "light" ? t.storeEditorPage.themeModeLight : mode === "dark" ? t.storeEditorPage.themeModeDark : t.storeEditorPage.themeModeAuto}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div className="space-y-1.5">
                  <Label htmlFor="builder-font">{t.storeEditorPage.fontFamily}</Label>
                  <Input id="builder-font" value={effectiveFontFamily} onChange={(e) => setFontFamily(e.target.value)} list="builder-font-options" />
                  <datalist id="builder-font-options">
                    {FONT_OPTIONS.map((font) => <option key={font} value={font} />)}
                  </datalist>
                </div>

                {/* Style preview */}
                <div className="rounded-lg border p-4" style={{ borderColor: normalizedSecondary, fontFamily: effectiveFontFamily }}>
                  <p className="mb-2 text-xs font-medium text-slate-500">{t.storeEditorPage.stylePreview}</p>
                  <div className="rounded-md p-4" style={{ backgroundColor: effectiveThemeMode === "dark" ? normalizedSecondary : "#ffffff" }}>
                    <p className="text-sm font-semibold" style={{ color: normalizedPrimary }}>{store.name}</p>
                    <p className="mt-1 text-xs" style={{ color: effectiveThemeMode === "dark" ? "#cbd5e1" : "#64748b" }}>
                      {t.storeEditorPage.stylePreviewDesc}
                    </p>
                    <div className="mt-3 inline-flex items-center rounded px-2 py-1 text-xs font-medium text-white" style={{ backgroundColor: normalizedPrimary }}>
                      CTA Button
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Color palettes — home only */}
          {isHomePage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-violet-600" />
                  {t.storeEditorPage.colorPalettes}
                </CardTitle>
                <CardDescription>{t.storeEditorPage.colorPalettesDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PALETTES.map((pal) => {
                    const active = normalizedPrimary === pal.primary && normalizedSecondary === pal.secondary;
                    return (
                      <button
                        key={pal.key}
                        type="button"
                        className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                          active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        onClick={() => { setPrimaryColor(pal.primary); setSecondaryColor(pal.secondary); setThemeMode(pal.mode); }}
                      >
                        <span className="flex shrink-0 gap-0.5">
                          <span className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: pal.primary }} />
                          <span className="h-5 w-5 rounded-full border border-white shadow-sm -ml-1.5" style={{ backgroundColor: pal.secondary }} />
                        </span>
                        <span className="truncate">{(t.storeEditorPage as Record<string, string>)[pal.key]}</span>
                        {active && <Check className="absolute right-2 h-3.5 w-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Typography presets — home only */}
          {isHomePage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Type className="h-4 w-4 text-emerald-600" />
                  {t.storeEditorPage.typographyPresets}
                </CardTitle>
                <CardDescription>{t.storeEditorPage.typographyPresetsDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {TYPO_PRESETS.map((tp) => {
                    const active = effectiveFontFamily === tp.font;
                    return (
                      <button
                        key={tp.key}
                        type="button"
                        className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          active ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        onClick={() => setFontFamily(tp.font)}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500">{(t.storeEditorPage as Record<string, string>)[tp.key]}</p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-slate-800" style={{ fontFamily: tp.font }}>{store.name}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500" style={{ fontFamily: tp.font }}>{tp.font}</p>
                        </div>
                        {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        </aside>
      </div>
    </div>
  );
}