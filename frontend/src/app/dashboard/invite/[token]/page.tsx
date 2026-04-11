'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAcceptInvitation } from '@/lib/hooks/use-api';
import { apiClient } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Users2, Store, User, Check, X } from 'lucide-react';

type Preview = {
  email: string;
  role: string;
  role_name: string;
  role_description: string;
  store_name: string;
  inviter_name: string;
  expires_at: string;
  status: string;
  user_exists: boolean;
};

type PageStatus = 'loading' | 'invalid' | 'form' | 'accepting' | 'success' | 'error';

function PasswordRequirements({ password }: { password: string }) {
  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter',  ok: /[a-z]/.test(password) },
    { label: 'One number',            ok: /[0-9]/.test(password) },
  ];
  return (
    <ul className="mt-1.5 space-y-0.5">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
          {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const { isAuthenticated, user, isLoading: authLoading, refreshStores } = useAuth();
  const acceptInvitation = useAcceptInvitation();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Per-store profile (new users only)
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  // Fetch public invitation preview on mount (no auth needed)
  useEffect(() => {
    if (!token) return;
    apiClient.getInvitationPreview(token)
      .then((data) => {
        if (data.status !== 'pending') {
          setPageStatus('invalid');
          setErrorMessage(
            data.status === 'accepted'
              ? 'This invitation has already been accepted.'
              : 'This invitation is no longer valid.',
          );
          return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setPageStatus('invalid');
          setErrorMessage('This invitation has expired.');
          return;
        }
        setPreview(data);
        setPageStatus('form');
      })
      .catch(() => {
        setPageStatus('invalid');
        setErrorMessage('Invitation not found or has expired.');
      });
  }, [token]);

  // If already logged in as the right user, skip auth forms
  const alreadyCorrectUser =
    isAuthenticated && user?.email?.toLowerCase() === preview?.email?.toLowerCase();

  // Auto-accept for existing users: sign them in via invite-signin and accept immediately
  const [autoAcceptTriggered, setAutoAcceptTriggered] = useState(false);
  useEffect(() => {
    if (pageStatus !== 'form' || !preview?.user_exists || alreadyCorrectUser || autoAcceptTriggered) return;
    setAutoAcceptTriggered(true);

    (async () => {
      setPageStatus('accepting');
      try {
        const res = await fetch('/api/auth/invite-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Authentication failed');
        if (data.sessionToken) {
          apiClient.setAuthToken(data.sessionToken);
        }
        // Accept the invitation
        const result = await acceptInvitation.mutateAsync({ token, profile: { display_name: '', phone: '', bio: '' } });
        if (result?.store_id) {
          localStorage.setItem('selectedStaffStoreId', result.store_id);
        }
        window.location.href = '/dashboard';
      } catch {
        // Auto-sign-in failed — fall back to showing the form so the user
        // can register or sign in manually, instead of showing a hard error.
        setAutoAcceptTriggered(false);
        setPageStatus('form');
      }
    })();
  }, [pageStatus, preview, alreadyCorrectUser, autoAcceptTriggered, token, acceptInvitation]);

  async function doAccept() {
    setPageStatus('accepting');
    try {
      const result = await acceptInvitation.mutateAsync({
        token,
        profile: {
          display_name: displayName.trim(),
          phone: phone.trim(),
          bio: '',
        },
      });
      // Store the accepted store's ID so the auth hook can auto-select it on load
      if (result?.store_id) {
        localStorage.setItem('selectedStaffStoreId', result.store_id);
      }
      // Full page reload so the auth provider re-initialises and reads the
      // session cookie (invite-signin creates the session server-side, so the
      // client-side useSession() hook doesn't know about it yet).
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setPageStatus('error');
      setErrorMessage(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to accept the invitation.',
      );
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!preview || !firstName || !lastName || !password) return;
    // Enforce password requirements before hitting the server
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setErrorMessage('Password does not meet the requirements listed below.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setErrorMessage('');
    setPageStatus('accepting');
    try {
      const { error } = await authClient.signUp.email({
        email: preview.email,
        password,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phone: phone || '',
        plan: 'free',
        role: 'staff',
        userStatus: 'active',
        storeId: '',
        storeSlug: '',
      });
      if (error) {
        setPageStatus('form');
        // Better Auth returns a 409-based error when the email already exists.
        // In that case, try signing in with the provided password instead.
        const isExistingEmail =
          error.status === 409 ||
          error.message?.toLowerCase().includes('already') ||
          error.message?.toLowerCase().includes('exists');
        if (isExistingEmail) {
          const { error: signInError } = await authClient.signIn.email({
            email: preview.email,
            password,
          });
          if (signInError) {
            setErrorMessage('An account with this email already exists. Please enter your existing password.');
            return;
          }
          await doAccept();
          return;
        }
        setErrorMessage(error.message || 'Registration failed.');
        return;
      }
      // The invitation proves the user owns this email — mark it verified
      // so sign-in isn't blocked by requireEmailVerification.
      await apiClient.verifyEmailViaInvitation(token);
      // Now sign in to obtain a session, then accept the invitation
      const { error: signInError } = await authClient.signIn.email({
        email: preview.email,
        password,
      });
      if (signInError) {
        setPageStatus('form');
        setErrorMessage(signInError.message || 'Sign-in after registration failed.');
        return;
      }
      await doAccept();
    } catch {
      setPageStatus('form');
      setErrorMessage('Registration failed. Please try again.');
    }
  }


  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (pageStatus === 'loading' || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // â”€â”€ Invalid / expired â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (pageStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="font-semibold text-lg">Invalid invitation</p>
            <p className="text-sm text-gray-500">{errorMessage}</p>
            <Link href="/auth/login"><Button variant="outline">Back to login</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // â”€â”€ Success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (pageStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-lg text-green-700">You&apos;re in!</p>
            <p className="text-sm text-gray-500">Redirecting to your spacesâ€¦</p>
            <Link href="/dashboard/space"><Button>Go to My Spaces</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // â”€â”€ Error after accepting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (pageStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="font-semibold text-lg">Could not accept invitation</p>
            <p className="text-sm text-gray-500">{errorMessage}</p>
            <Button variant="outline" onClick={() => setPageStatus('form')}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // â”€â”€ Per-store profile block (reused in both register and login flows) â”€â”€â”€â”€â”€â”€
  const profileSection = (
    <div className="space-y-3 rounded-lg border bg-blue-50/50 p-4">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
        Your profile in {preview?.store_name}
      </p>
      <div className="space-y-1">
        <Label htmlFor="displayName">
          Display name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How you appear in this store"
          required
        />
        <p className="text-xs text-gray-400">Can differ from your account name.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="storePhone">
          Phone <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Input
          id="storePhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          type="tel"
        />
      </div>
    </div>
  );

  // â”€â”€ Main form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <Users2 className="h-7 w-7 text-blue-600" />
          </div>
          <CardTitle className="text-xl">You&apos;ve been invited!</CardTitle>
          <CardDescription className="mt-1">
            <span className="font-medium text-gray-700">{preview?.inviter_name}</span> invited you
            to join{' '}
            <span className="font-medium text-gray-700">{preview?.store_name}</span> as{' '}
            <span className="inline-flex items-center gap-1 rounded-full border bg-blue-50 border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {preview?.role_name}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Invited-as row */}
          <div className="flex items-center gap-3 rounded-lg border bg-gray-50 px-4 py-3 text-sm">
            <Store className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-gray-600">Invited as</span>
            <span className="ml-auto font-mono text-xs text-gray-500 truncate">{preview?.email}</span>
          </div>

          {/* Role description banner */}
          {preview?.role_name && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <span className="font-semibold">{preview.role_name}:</span>{' '}
              {preview.role_description || 'Custom role assigned by the store owner.'}
            </div>
          )}

          {alreadyCorrectUser ? (
            // Already signed in as the right user — one click to accept
            <Button
              className="w-full"
              disabled={pageStatus === 'accepting'}
              onClick={doAccept}
            >
              {pageStatus === 'accepting' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Accepting…</>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          ) : preview?.user_exists ? (
            // Existing account — auto-accepting (the useEffect handles it)
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">Signing you in and accepting the invitation…</p>
            </div>
          ) : (
            // New user — show registration form
            <>
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName">First name <span className="text-red-500">*</span></Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName">Last name <span className="text-red-500">*</span></Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {preview?.email}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    required
                  />
                  {password && <PasswordRequirements password={password} />}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">
                    Confirm password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                  />
                  {confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 mt-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                      {password === confirmPassword
                        ? <><Check className="h-3 w-3" /> Passwords match</>
                        : <><X className="h-3 w-3" /> Passwords do not match</>}
                    </p>
                  )}
                </div>
                {profileSection}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    pageStatus === 'accepting' ||
                    !displayName.trim() ||
                    !firstName || !lastName || !password ||
                    password !== confirmPassword
                  }
                >
                  {pageStatus === 'accepting' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : 'Create account & accept'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
