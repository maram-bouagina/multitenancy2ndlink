"use client";

import Link from "next/link";
import { User, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function StorefrontAuthButton({ slug }: { slug: string }) {
  const { data: session, isPending } = authClient.useSession();

  const isCustomer = !!session?.user && (session.user as { role?: string }).role === 'customer';

  if (isPending) {
    return (
      <div className="p-2 rounded-md" style={{ color: 'var(--sf-text-muted)' }}>
        <User className="w-5 h-5" />
      </div>
    );
  }

  if (isCustomer) {
    return (
      <Link
        href={`/store/${slug}/account`}
        className="p-2 rounded-md transition-colors"
        style={{ color: 'var(--sf-text-muted)' }}
        aria-label="Mon compte"
        title="Mon compte"
      >
        <User className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <Link
      href={`/store/${slug}/auth/login`}
      className="p-2 rounded-md transition-colors"
      style={{ color: 'var(--sf-text-muted)' }}
      aria-label="Se connecter"
      title="Se connecter"
    >
      <LogIn className="w-5 h-5" />
    </Link>
  );
}
