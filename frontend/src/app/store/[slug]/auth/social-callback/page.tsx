'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

export default function SocialCallbackPage() {
  return (
    <Suspense>
      <SocialCallbackInner />
    </Suspense>
  );
}

function SocialCallbackInner() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');

  const storeId = searchParams.get('storeId');
  const storeSlug = searchParams.get('storeSlug');

  useEffect(() => {
    async function syncCustomerRole() {
      try {
        // Wait for Better Auth session to be ready
        const session = await authClient.getSession();
        if (!session?.data?.user) {
          setError('Authentication failed');
          return;
        }

        const user = session.data.user as Record<string, unknown>;

        // If user doesn't have customer role yet, update it
        if (user.role !== 'customer' && storeId && storeSlug) {
          await authClient.updateUser({
            role: 'customer',
            storeId,
            storeSlug,
          });
        }

        router.push(`/store/${slug}`);
      } catch {
        setError('Failed to complete sign-in');
      }
    }

    syncCustomerRole();
  }, [slug, storeId, storeSlug, router]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
            <a href={`/store/${slug}/auth/login`} className="text-(--sf-primary) hover:underline text-sm">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-(--sf-primary)" />
        <p className="text-gray-500">Completing sign-in...</p>
      </div>
    </div>
  );
}
