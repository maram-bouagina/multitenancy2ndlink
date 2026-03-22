'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Eye, EyeOff, GripVertical, Plus, Save, Send, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePublishStoreCustomization, useStore, useUpdateStore } from '@/lib/hooks/use-api';
import { StorefrontSection, StorefrontSectionType } from '@/lib/types';

const SECTION_CATALOG: { type: StorefrontSectionType; label: string; description: string }[] = [
  { type: 'hero', label: 'Hero', description: 'Main banner and CTA' },
  { type: 'featured_products', label: 'Featured Products', description: 'Highlight products' },
  { type: 'categories_grid', label: 'Categories Grid', description: 'Category navigation' },
  { type: 'newsletter', label: 'Newsletter', description: 'Email subscription block' },
  { type: 'footer', label: 'Footer', description: 'Links and legal info' },
];

const SECTION_LABEL: Record<StorefrontSectionType, string> = {
  hero: 'Hero',
  featured_products: 'Featured Products',
  categories_grid: 'Categories Grid',
  newsletter: 'Newsletter',
  footer: 'Footer',
};

const DEFAULT_LAYOUT: StorefrontSection[] = [
  { id: 'hero-1', type: 'hero', enabled: true, title: 'Welcome to our store', subtitle: 'Discover our latest products', cta_label: 'Shop now', cta_href: '/products' },
  { id: 'featured-1', type: 'featured_products', enabled: true, title: 'Featured products' },
  { id: 'categories-1', type: 'categories_grid', enabled: true, title: 'Shop by category' },
  { id: 'newsletter-1', type: 'newsletter', enabled: true, title: 'Get updates' },
  { id: 'footer-1', type: 'footer', enabled: true, title: 'Footer' },
];

const FONT_OPTIONS = ['Inter', 'Sora', 'Outfit', 'DM Sans', 'Nunito', 'Playfair Display'];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

function parseLayout(raw?: string): StorefrontSection[] {
  if (!raw) return DEFAULT_LAYOUT;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT;

    const validTypes: StorefrontSectionType[] = ['hero', 'featured_products', 'categories_grid', 'newsletter', 'footer'];
    const normalized = parsed
      .filter((item) => item && typeof item === 'object' && validTypes.includes(item.type))
      .map((item) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `${item.type}-${uid()}`,
        type: item.type as StorefrontSectionType,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
        title: typeof item.title === 'string' ? item.title : undefined,
        subtitle: typeof item.subtitle === 'string' ? item.subtitle : undefined,
        cta_label: typeof item.cta_label === 'string' ? item.cta_label : undefined,
        cta_href: typeof item.cta_href === 'string' ? item.cta_href : undefined,
      }));

    return normalized.length ? normalized : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { error?: string } } }).response?.data?.error
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }

  return fallback;
}

function SortableSectionRow({
  section,
  index,
  onToggle,
  onRemove,
}: {
  section: StorefrontSection;
  index: number;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      className={`flex items-center justify-between rounded-lg border bg-white p-3 ${!section.enabled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Drag section"
        >
          <GripVertical size={15} />
        </button>
        <div>
          <p className="text-sm font-medium text-slate-900">{SECTION_LABEL[section.type]}</p>
          <p className="text-xs text-slate-500">{section.id}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={() => onToggle(index)}>
          {section.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
          <Trash2 size={15} className="text-red-500" />
        </Button>
      </div>
    </div>
  );
}

export default function StoreCustomizePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');

  const { data: store, isLoading } = useStore(id || '');
  const updateMutation = useUpdateStore();
  const publishMutation = usePublishStoreCustomization();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const [logo, setLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('light');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [sections, setSections] = useState<StorefrontSection[]>(DEFAULT_LAYOUT);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!store) return;
    setLogo(store.logo || '');
    setPrimaryColor(store.theme_primary_color || '#2563eb');
    setSecondaryColor(store.theme_secondary_color || '#0f172a');
    setThemeMode(store.theme_mode || 'light');
    setFontFamily(store.theme_font_family || 'Inter');
    setSections(parseLayout(store.storefront_layout_draft));
  }, [store]);

  const activeLabel = useMemo(() => {
    if (!activeSectionId) return '';
    const current = sections.find((section) => section.id === activeSectionId);
    if (!current) return 'Section';
    return SECTION_LABEL[current.type];
  }, [activeSectionId, sections]);

  const persistDraft = async () => {
    if (!id) return;

    const normalizedPrimary = isHexColor(primaryColor) ? primaryColor : '#2563eb';
    const normalizedSecondary = isHexColor(secondaryColor) ? secondaryColor : '#0f172a';

    await updateMutation.mutateAsync({
      id,
      data: {
        logo: logo || undefined,
        theme_primary_color: normalizedPrimary,
        theme_secondary_color: normalizedSecondary,
        theme_mode: themeMode,
        theme_font_family: fontFamily,
        storefront_layout_draft: JSON.stringify(sections),
      },
    });
  };

  const saveDraft = async () => {
    setMessage(null);
    setSaving(true);
    try {
      await persistDraft();
      setMessage({ type: 'success', text: 'Draft saved successfully.' });
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getApiErrorMessage(error, 'Failed to save draft.') });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!id) return;
    setMessage(null);
    setSaving(true);
    try {
      await persistDraft();
      await publishMutation.mutateAsync({ id, useDraftLayout: true });
      setMessage({ type: 'success', text: 'Storefront published successfully.' });
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getApiErrorMessage(error, 'Failed to publish storefront.') });
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveSectionId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSectionId(null);
    if (!over || active.id === over.id) return;

    setSections((current) => {
      const oldIndex = current.findIndex((section) => section.id === active.id);
      const newIndex = current.findIndex((section) => section.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const addSection = (type: StorefrontSectionType) => {
    setSections((current) => [...current, { id: `${type}-${uid()}`, type, enabled: true, title: SECTION_LABEL[type] }]);
  };

  const toggleSection = (index: number) => {
    setSections((current) => current.map((section, idx) => (idx === index ? { ...section, enabled: !section.enabled } : section)));
  };

  const removeSection = (index: number) => {
    setSections((current) => current.filter((_, idx) => idx !== index));
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading customization...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Storefront customization</h1>
          <p className="text-sm text-slate-500">Clean editor for layout and branding. Changes are saved as draft until published.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={saveDraft} disabled={saving}>
            <Save className="mr-1 h-4 w-4" /> Save Draft
          </Button>
          <Button type="button" onClick={publish} disabled={saving}>
            <Send className="mr-1 h-4 w-4" /> Publish
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link href={`/dashboard/stores/${id}/storefront?preview=true`} target="_blank">Preview</Link>
          </Button>
        </div>
      </div>

      {message && (
        <div className={`rounded-md border px-3 py-2 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Layout builder</CardTitle>
            <CardDescription>Drag sections to reorder. Toggle visibility or remove sections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {SECTION_CATALOG.map((item) => (
                <Button key={item.type} variant="outline" type="button" className="h-auto justify-start whitespace-normal py-2 text-left" onClick={() => addSection(item.type)}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.description}</span>
                  </span>
                </Button>
              ))}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveSectionId(null)}
            >
              <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <SortableSectionRow key={section.id} section={section} index={index} onToggle={toggleSection} onRemove={removeSection} />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeSectionId ? (
                  <div className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow">
                    <GripVertical className="mr-2 inline h-4 w-4" />
                    {activeLabel}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Update visual identity settings for your storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="logo">Logo URL</Label>
              <Input id="logo" value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="https://example.com/logo.png" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="primaryColor">Primary</Label>
                <div className="flex items-center gap-2">
                  <input id="primaryColor" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="h-9 w-10 cursor-pointer rounded border" />
                  <Input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="secondaryColor">Secondary</Label>
                <div className="flex items-center gap-2">
                  <input id="secondaryColor" type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="h-9 w-10 cursor-pointer rounded border" />
                  <Input value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="font-mono text-xs" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Theme Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'auto'] as const).map((mode) => (
                  <Button key={mode} type="button" variant={themeMode === mode ? 'default' : 'outline'} onClick={() => setThemeMode(mode)}>
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fontFamily">Font Family</Label>
              <Input id="fontFamily" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} list="font-options" />
              <datalist id="font-options">
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font} />
                ))}
              </datalist>
            </div>

            <div className="rounded-lg border p-3" style={{ borderColor: secondaryColor, fontFamily }}>
              <p className="mb-2 text-xs font-medium text-slate-500">Quick preview</p>
              <div className="rounded-md p-3" style={{ backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff' }}>
                <p className="text-sm font-semibold" style={{ color: primaryColor }}>Store title</p>
                <p className="mt-1 text-xs" style={{ color: themeMode === 'dark' ? '#cbd5e1' : '#64748b' }}>Sample text with current style settings.</p>
                <div className="mt-3 inline-flex items-center rounded px-2 py-1 text-xs font-medium text-white" style={{ backgroundColor: primaryColor }}>
                  <Check className="mr-1 h-3 w-3" /> CTA Button
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}