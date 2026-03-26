'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Tag } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { ProductImagePublic } from '@/lib/types/storefront';

export function StorefrontProductImageGallery({
  images,
  title,
}: {
  images: ProductImagePublic[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-muted)' }}>
        <Tag className="w-20 h-20" />
      </div>
    );
  }

  const current = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--sf-surface-alt)' }}>
        <Image
          src={resolveMediaUrl(current.url_large || current.url_medium || current.url)}
          alt={current.alt_text || title}
          fill
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActive(index)}
              className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors"
              style={{ borderColor: index === active ? 'var(--sf-primary)' : 'transparent' }}
            >
              <Image
                src={resolveMediaUrl(image.url_thumbnail || image.url)}
                alt={image.alt_text || `${title} ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}