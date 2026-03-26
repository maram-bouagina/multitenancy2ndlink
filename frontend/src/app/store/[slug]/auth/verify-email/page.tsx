'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

export default function CustomerVerifyEmailPage() {
  return (
    <Suspense>
      <CustomerVerifyEmailPageInner />
    </Suspense>
  );
}

function CustomerVerifyEmailPageInner() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { t } = useStorefrontLanguage();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
          <Mail className="h-8 w-8 text-(--sf-primary)" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">{t.auth.verifyEmailTitle}</h1>
          <p className="mt-2" style={{ color: 'var(--sf-text-muted)' }}>
            {t.auth.verifyEmailDesc.replace('{email}', email ?? '')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--sf-text-muted)' }}>
            {t.auth.verifyEmailNote}
          </p>
        </div>

        <Link
          href={`/store/${slug}/auth/login`}
          className="inline-block py-2 px-6 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90"
        >
          {t.auth.goToSignIn}
        </Link>
      </div>
    </div>
  );
}
