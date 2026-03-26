'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MailCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    try {
      setIsSending(true);
      setError('');
      await authClient.sendVerificationEmail({ email });
      setSent(true);
    } catch {
      setError('Failed to resend verification email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <MailCheck className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            {email ? (
              <>We sent a verification link to <strong>{email}</strong></>
            ) : (
              'We sent a verification link to your email'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {sent && (
            <Alert>
              <AlertDescription>Verification email sent! Check your inbox.</AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-gray-500 text-center">
            Click the link in the email to verify your account. If you don&apos;t see it, check your spam folder.
          </p>

          <div className="text-sm text-gray-500 text-center bg-amber-50 border border-amber-200 rounded-lg p-3">
            <strong>Development mode:</strong> Check your terminal/console for the verification URL.
          </div>

          {email && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isSending || sent}
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sent ? 'Email sent!' : 'Resend verification email'}
            </Button>
          )}

          <div className="text-center">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
