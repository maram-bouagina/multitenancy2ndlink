'use client';

import { useRef, useState } from 'react';
import { useCustomerAuth } from '@/lib/hooks/use-customer-auth';
import { customerUpdateProfile } from '@/lib/api/customer-client';
import { Loader2, Check, Camera } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

function resizeToDataURL(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function CustomerProfilePage() {
  const { customer, slug, refresh } = useCustomerAuth();
  const { t } = useStorefrontLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(customer?.firstName || '');
  const [lastName, setLastName] = useState(customer?.lastName || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const initials = `${(customer?.firstName || '')[0] ?? ''}${(customer?.lastName || '')[0] ?? ''}`.toUpperCase() || '?';
  const currentAvatar = avatarPreview ?? (customer as { avatar?: string } | null)?.avatar ?? null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    try {
      const dataUrl = await resizeToDataURL(file, 256);
      setAvatarPreview(dataUrl);
      setAvatarData(dataUrl);
      setError('');
    } catch { setError('Could not read image.'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await customerUpdateProfile(slug, {
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        ...(avatarData ? { avatar: avatarData } : {}),
      });
      await refresh();
      setSuccess(t.account.saved);
      setAvatarData(null);
    } catch {
      setError(t.account.saveFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t.account.profileTitle}</h2>

      {/* Avatar section */}
      <div className="flex items-center gap-5">
        <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
          <div className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-secondary)' }}>
            {currentAvatar
              ? <img src={currentAvatar} alt={initials} className="h-full w-full object-cover" />
              : initials}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-medium px-3 py-1.5 border rounded-md transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)' }}
          >
            {t.account.changePhoto}
          </button>
          <p className="text-xs mt-1" style={{ color: 'var(--sf-text-muted)' }}>JPG, PNG, WebP · max 5 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" /> {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t.account.firstName}</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t.account.lastName}</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t.account.email}</label>
          <input value={customer?.email || ''} disabled
            className="w-full px-3 py-2 border rounded-md"
            style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-muted)' }} />
          <p className="text-xs mt-1" style={{ color: 'var(--sf-text-muted)' }}>{t.account.emailNote}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t.account.phone}</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213XXXXXXXXX"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
            style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
        </div>

        <button type="submit" disabled={loading}
          className="py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.account.save}
        </button>
      </form>
    </div>
  );
}
