'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { getStore } from '@/lib/api/storefront-client';
import { Loader2, Chrome, Facebook } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

const GOOGLE_ENABLED = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;
const FACEBOOK_ENABLED = !!process.env.NEXT_PUBLIC_FACEBOOK_ENABLED;

export default function CustomerLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { t } = useStorefrontLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    getStore(slug).then((s) => setStoreId(s.id)).catch(() => {});
  }, [slug]);

  const callbackURL = `/store/${slug}`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
        callbackURL,
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('verify')) {
          router.push(`/store/${slug}/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        if (authError.message?.toLowerCase().includes('two factor') ||
            authError.message?.toLowerCase().includes('2fa') ||
            authError.message?.toLowerCase().includes('otp')) {
          setRequires2FA(true);
          return;
        }
        setError(authError.message || 'Invalid credentials');
        return;
      }

      if ((data as Record<string, unknown>)?.twoFactorRedirect) {
        setRequires2FA(true);
        return;
      }

      router.push(callbackURL);
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode) return;
    try {
      setLoading(true);
      setError('');
      const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code: totpCode });
      if (verifyError) {
        setError(verifyError.message || 'Invalid code');
        return;
      }
      router.push(callbackURL);
    } catch {
      setError('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setError('');
      await authClient.signIn.social({ provider, callbackURL: `/store/${slug}/auth/social-callback?storeId=${storeId}&storeSlug=${slug}` });
    } catch {
      setError(`Failed to sign in with ${provider}`);
    }
  };

  if (requires2FA) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t.auth.twoFATitle}</h1>
            <p className="mt-1" style={{ color: 'var(--sf-text-muted)' }}>{t.auth.twoFADesc}</p>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}

            <div>
              <label htmlFor="totp" className="block text-sm font-medium mb-1">{t.auth.verificationCode}</label>
              <input
                id="totp" type="text" inputMode="numeric" autoComplete="one-time-code"
                placeholder="000000" maxLength={6}
                value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border rounded-md text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
                style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
              />
            </div>

            <button type="submit" disabled={loading || totpCode.length !== 6}
              className="w-full py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t.auth.verify}
            </button>
          </form>

          <p className="text-center text-sm">
            <button onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }}
              className="text-(--sf-primary) hover:underline">
              {t.auth.backToLogin}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.auth.signIn}</h1>
          <p className="mt-1" style={{ color: 'var(--sf-text-muted)' }}>{t.auth.signInWelcome}</p>
        </div>

        {/* Social Login Buttons */}
        {(GOOGLE_ENABLED || FACEBOOK_ENABLED) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {GOOGLE_ENABLED && (
                <button onClick={() => handleSocialLogin('google')} type="button"
                  className="w-full py-2 px-4 border rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:opacity-80"
                  style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)', backgroundColor: 'var(--sf-surface)' }}>
                  <Chrome className="h-4 w-4" /> Google
                </button>
              )}
              {FACEBOOK_ENABLED && (
                <button onClick={() => handleSocialLogin('facebook')} type="button"
                  className="w-full py-2 px-4 border rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:opacity-80"
                  style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)', backgroundColor: 'var(--sf-surface)' }}>
                  <Facebook className="h-4 w-4" /> Facebook
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="px-2" style={{ backgroundColor: 'var(--sf-page-bg)', color: 'var(--sf-text-muted)' }}>{t.auth.or}</span></div>
            </div>
          </>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">{t.auth.email}</label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">{t.auth.password}</label>
            <input id="password" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <Link href={`/store/${slug}/auth/forgot-password`} className="text-(--sf-primary) hover:underline">
              {t.auth.forgotPassword}
            </Link>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t.auth.signIn}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: 'var(--sf-text-muted)' }}>
          {t.auth.noAccount}{' '}
          <Link href={`/store/${slug}/auth/register`} className="text-(--sf-primary) hover:underline">
            {t.auth.createOne}
          </Link>
        </p>
      </div>
    </div>
  );
}
