'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Loader2, Mail } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

export default function CustomerForgotPasswordPage() {
  const { slug } = useParams<{ slug: string }>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useStorefrontLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authClient.requestPasswordReset({
        email,
        redirectTo: `/store/${slug}/auth/reset-password`,
      });
    } catch { /* always show success to prevent enumeration */ }
    finally {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">{t.auth.checkEmailTitle}</h1>
          <p style={{ color: 'var(--sf-text-muted)' }}>
            {t.auth.checkEmailDesc.replace('{email}', email)}
          </p>
          <Link href={`/store/${slug}/auth/login`} className="text-(--sf-primary) hover:underline text-sm">
            {t.auth.backToSignIn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.auth.forgotPasswordTitle}</h1>
          <p className="mt-1" style={{ color: 'var(--sf-text-muted)' }}>{t.auth.forgotPasswordDesc}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">{t.auth.email}</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t.auth.sendResetLink}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link href={`/store/${slug}/auth/login`} className="text-(--sf-primary) hover:underline">
            {t.auth.backToSignIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
