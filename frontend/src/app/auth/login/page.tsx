'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Chrome, Facebook } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

const GOOGLE_ENABLED = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;
const FACEBOOK_ENABLED = !!process.env.NEXT_PUBLIC_FACEBOOK_ENABLED;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const callbackURL = searchParams.get('callbackURL') || '/dashboard/space';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsLoading(true);
      setError('');

      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
        callbackURL,
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('verify')) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        if (authError.message?.toLowerCase().includes('two factor') ||
            authError.message?.toLowerCase().includes('2fa') ||
            authError.message?.toLowerCase().includes('otp')) {
          setRequires2FA(true);
          setIsLoading(false);
          return;
        }
        setError(authError.message || 'Invalid credentials');
        return;
      }

      if ((data as Record<string, unknown>)?.twoFactorRedirect) {
        setRequires2FA(true);
        setIsLoading(false);
        return;
      }

      router.push(callbackURL);
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode) return;

    try {
      setIsLoading(true);
      setError('');

      const { error: verifyError } = await authClient.twoFactor.verifyTotp({
        code: totpCode,
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid code');
        return;
      }

      router.push(callbackURL);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setError('');
      await authClient.signIn.social({
        provider,
        callbackURL,
      });
    } catch {
      setError(`Failed to sign in with ${provider}`);
    }
  };

  // 2FA verification screen
  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-center">
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify2FA} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="totp">Verification Code</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || totpCode.length !== 6}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Social Login Buttons — only shown when OAuth is configured */}
          {(GOOGLE_ENABLED || FACEBOOK_ENABLED) && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {GOOGLE_ENABLED && (
                  <Button
                    variant="outline"
                    onClick={() => handleSocialLogin('google')}
                    type="button"
                    className="w-full"
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                )}
                {FACEBOOK_ENABLED && (
                  <Button
                    variant="outline"
                    onClick={() => handleSocialLogin('facebook')}
                    type="button"
                    className="w-full"
                  >
                    <Facebook className="mr-2 h-4 w-4" />
                    Facebook
                  </Button>
                )}
              </div>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}