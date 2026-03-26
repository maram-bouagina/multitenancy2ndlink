"use client";

import { useState, useEffect, type FormEvent } from "react";
import { newsletterSubscribe } from "@/lib/api/customer-client";
import { authClient } from "@/lib/auth-client";

interface Props {
  slug: string;
  buttonLabel: string;
  primaryColor: string;
  variant: "inline" | "banner" | "card";
  collectName?: boolean;
  emailPlaceholder?: string;
  successMessage?: string;
}

export function NewsletterForm({
  slug,
  buttonLabel,
  primaryColor,
  variant,
  collectName = false,
  emailPlaceholder = "your@email.com",
  successMessage: customSuccessMessage,
}: Props) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Auto-fill from Better Auth session if logged-in customer
  const { data: session } = authClient.useSession();
  useEffect(() => {
    const user = session?.user as { role?: string; email?: string; firstName?: string; name?: string } | null;
    if (user?.role === "customer") {
      if (user.email && !email) setEmail(user.email);
      if (collectName && (user.firstName || user.name) && !firstName) setFirstName(user.firstName || user.name || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, collectName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await newsletterSubscribe(slug, email.trim(), collectName ? firstName.trim() : undefined);
      setStatus("success");
      setMessage(customSuccessMessage || res.message || "Subscribed successfully!");
      setFirstName("");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Subscription failed. Please try again.");
    }
  };

  if (status === "success") {
    const textClass = variant === "banner" || variant === "card" ? "text-white/90" : "text-green-600";
    return (
      <p className={`text-sm font-medium ${textClass}`}>
        ✓ {message}
      </p>
    );
  }

  const inputBase = "rounded-full px-5 py-2.5 text-sm outline-none";
  const isInline = variant === "inline";

  const inputClass = isInline
    ? "rounded-full px-4 py-2 text-sm border border-gray-300 outline-none focus:ring-2 focus:ring-offset-1"
    : variant === "banner"
      ? `flex-1 ${inputBase} text-gray-900`
      : `flex-1 ${inputBase} text-gray-900 border-2 border-transparent focus:border-white/40`;

  return (
    <form onSubmit={handleSubmit} className={isInline ? "flex flex-wrap items-center gap-2" : "space-y-3 max-w-md mx-auto"}>
      <div className={isInline ? "flex gap-2" : "flex gap-3"}>
        {collectName && (
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setStatus("idle"); }}
            className={inputClass}
            style={isInline ? { "--tw-ring-color": primaryColor } as React.CSSProperties : undefined}
          />
        )}
        <input
          type="email"
          required
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
          className={inputClass}
          style={isInline ? { "--tw-ring-color": primaryColor } as React.CSSProperties : undefined}
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className={
          isInline
            ? "rounded-full px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            : `w-full rounded-full ${variant === "banner" || variant === "card" ? "bg-white" : ""} px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60`
        }
        style={
          isInline || variant === "banner" || variant === "card"
            ? isInline
              ? { backgroundColor: primaryColor }
              : { color: primaryColor }
            : { backgroundColor: primaryColor, color: "#fff" }
        }
      >
        {status === "loading" ? "..." : buttonLabel}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-400 mt-1">{message}</p>
      )}
    </form>
  );
}
