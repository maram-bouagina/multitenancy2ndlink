'use client';

import { useState } from 'react';
import { CheckCircle, Heart, Share2, ShoppingCart } from 'lucide-react';

export function StorefrontProductActions({
  inStock,
}: {
  inStock: boolean;
}) {
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    setAddedToCart(true);
    window.setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Ignore clipboard failures in unsupported browsers.
    }
  };

  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!inStock}
        className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-semibold transition-all ${
          !inStock
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : addedToCart
            ? 'bg-green-600 text-white'
            : 'text-white'
        }`}
        style={!inStock || addedToCart ? undefined : { backgroundColor: 'var(--sf-primary)' }}
      >
        {addedToCart ? (
          <>
            <CheckCircle className="w-4 h-4" /> Ajouté !
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            {inStock ? 'Ajouter au panier' : 'Produit indisponible'}
          </>
        )}
      </button>
      <button type="button" className="p-3 rounded-full border transition-colors" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}>
        <Heart className="w-5 h-5" style={{ color: 'var(--sf-text-muted)' }} />
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="p-3 rounded-full border transition-colors"
        style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}
      >
        <Share2 className="w-5 h-5" style={{ color: 'var(--sf-text-muted)' }} />
      </button>
    </div>
  );
}