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

export default function CustomerRegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const { t } = useStorefrontLanguage();

  useEffect(() => {
    getStore(slug).then((s) => setStoreId(s.id)).catch(() => {});
  }, [slug]);

  const handleSocialSignUp = async (provider: 'google' | 'facebook') => {
    if (!storeId) {
      setError('Store not found');
      return;
    }
    try {
      setError('');
      await authClient.signIn.social({
        provider,
        callbackURL: `/store/${slug}/auth/social-callback?storeId=${storeId}&storeSlug=${slug}`,
      });
    } catch {
      setError(`Failed to sign up with ${provider}`);
    }
  };

  const passwordRules = [
    { label: t.auth.passwordRuleLength, met: password.length >= 8 },
    { label: t.auth.passwordRuleUpper, met: /[A-Z]/.test(password) },
    { label: t.auth.passwordRuleLower, met: /[a-z]/.test(password) },
    { label: t.auth.passwordRuleNumber, met: /\d/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t.accountSecurity.mismatch);
      return;
    }
    if (!passwordRules.every(r => r.met)) {
      setError(t.accountSecurity.requirements);
      return;
    }
    if (!storeId) {
      setError('Store not found');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phone: phone || '',
        plan: '',
        role: 'customer',
        userStatus: 'active',
        storeId,
        storeSlug: slug,
      });
      if (signUpError) {
        setError(signUpError.message || 'Registration failed');
        return;
      }
      router.push(`/store/${slug}/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.auth.signUp}</h1>
          <p className="mt-1" style={{ color: 'var(--sf-text-muted)' }}>{t.auth.signUpWelcome}</p>
        </div>

        {/* Social Sign-Up Buttons */}
        {(GOOGLE_ENABLED || FACEBOOK_ENABLED) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {GOOGLE_ENABLED && (
                <button onClick={() => handleSocialSignUp('google')} type="button"
                  className="w-full py-2 px-4 border rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:opacity-80"
                  style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)', backgroundColor: 'var(--sf-surface)' }}>
                  <Chrome className="h-4 w-4" /> Google
                </button>
              )}
              {FACEBOOK_ENABLED && (
                <button onClick={() => handleSocialSignUp('facebook')} type="button"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">{t.auth.firstName}</label>
              <input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
                style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">{t.auth.lastName}</label>
              <input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
                style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">{t.auth.email}</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">{t.auth.phone} <span style={{ color: 'var(--sf-text-muted)' }}>{t.auth.phoneOptional}</span></label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">{t.auth.password}</label>
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
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">{t.auth.confirmPassword}</label>
            <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
          >
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t.auth.signUp}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: 'var(--sf-text-muted)' }}>
          {t.auth.alreadyHaveAccount}{' '}
          <Link href={`/store/${slug}/auth/login`} className="text-(--sf-primary) hover:underline">
            {t.auth.signInLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
