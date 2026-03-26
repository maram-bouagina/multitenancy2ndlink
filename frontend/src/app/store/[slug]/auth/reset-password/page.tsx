'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Loader2, CheckCircle } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

export default function CustomerResetPasswordPage() {
  return (
    <Suspense>
      <CustomerResetPasswordPageInner />
    </Suspense>
  );
}

function CustomerResetPasswordPageInner() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useStorefrontLanguage();

  const passwordRules = [
    { label: t.auth.passwordRuleLength, met: password.length >= 8 },
    { label: t.auth.passwordRuleUpper, met: /[A-Z]/.test(password) },
    { label: t.auth.passwordRuleLower, met: /[a-z]/.test(password) },
    { label: t.auth.passwordRuleNumber, met: /\d/.test(password) },
  ];

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{t.auth.invalidLink}</h1>
          <p style={{ color: 'var(--sf-text-muted)' }}>{t.auth.invalidLinkDesc}</p>
          <Link href={`/store/${slug}/auth/forgot-password`} className="text-(--sf-primary) hover:underline">
            {t.auth.requestNewLink}
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t.accountSecurity.mismatch);
      return;
    }
    if (!passwordRules.every(r => r.met)) {
      setError(t.accountSecurity.requirements);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (resetError) {
        setError(resetError.message || 'Reset failed');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(`/store/${slug}/auth/login`), 2000);
    } catch {
      setError('Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">{t.auth.resetSuccess}</h1>
          <p style={{ color: 'var(--sf-text-muted)' }}>{t.auth.resetRedirecting}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.auth.resetPasswordTitle}</h1>
          <p className="mt-1" style={{ color: 'var(--sf-text-muted)' }}>{t.auth.resetPasswordDesc}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">{t.auth.newPassword}</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
            {password && (
              <div className="mt-2 space-y-1">
                {passwordRules.map((rule) => (
                  <div key={rule.label} className={`text-xs flex items-center gap-1 ${rule.met ? 'text-green-600' : ''}`}
                    style={rule.met ? undefined : { color: 'var(--sf-text-muted)' }}>
                    <span>{rule.met ? '✓' : '○'}</span> {rule.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium mb-1">{t.auth.confirmNewPassword}</label>
            <input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t.auth.resetPasswordBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
