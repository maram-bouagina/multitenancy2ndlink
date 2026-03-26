'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Check, Shield, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError(t.security.passwordMismatch);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t.security.passwordTooShort);
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordError('');
      setPasswordSuccess('');
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      setPasswordSuccess(t.security.passwordSuccess);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError(t.security.passwordFailed);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setTwoFALoading(true);
      setTwoFAError('');
      const res = await authClient.twoFactor.enable({
        password: currentPassword || undefined!,
      });
      if (res.data) {
        setQrUri(res.data.totpURI);
        setBackupCodes(res.data.backupCodes);
        setShowSetup(true);
      } else {
        setTwoFAError(t.security.enable2FANote);
      }
    } catch {
      setTwoFAError(t.security.failedEnable2FA);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setTwoFALoading(true);
      setTwoFAError('');
      await authClient.twoFactor.verifyTotp({ code: totpCode });
      setShowSetup(false);
      setQrUri('');
      setTotpCode('');
    } catch {
      setTwoFAError(t.security.verifyFailed);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setTwoFALoading(true);
      setTwoFAError('');
      await authClient.twoFactor.disable({ password: currentPassword || undefined! });
      setShowSetup(false);
    } catch {
      setTwoFAError(t.security.failedDisable2FA);
    } finally {
      setTwoFALoading(false);
    }
  };

  const is2FAEnabled = user?.twoFactorEnabled;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.security.title}</h1>
          <p className="text-sm text-gray-500">{t.security.subtitle}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.security.changePassword}</CardTitle>
          <CardDescription>{t.security.changePasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && <Alert variant="destructive"><AlertDescription>{passwordError}</AlertDescription></Alert>}
            {passwordSuccess && <Alert><Check className="h-4 w-4" /><AlertDescription>{passwordSuccess}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t.security.currentPassword}</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t.security.newPassword}</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.security.confirmPassword}</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t.security.changePasswordBtn}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {is2FAEnabled ? <Shield className="h-5 w-5 text-green-500" /> : <ShieldOff className="h-5 w-5 text-gray-400" />}
            {t.security.twoFA}
          </CardTitle>
          <CardDescription>{is2FAEnabled ? t.security.twoFAEnabled : t.security.twoFADisabled}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFAError && <Alert variant="destructive"><AlertDescription>{twoFAError}</AlertDescription></Alert>}

          {!is2FAEnabled && !showSetup && (
            <Button onClick={handleEnable2FA} disabled={twoFALoading}>
              {twoFALoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t.security.enable2FA}
            </Button>
          )}

          {showSetup && qrUri && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t.security.scanQR}</p>
              <div className="inline-block rounded border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                />
              </div>
              <p className="break-all text-xs text-gray-500">{t.security.manualEntry} {qrUri}</p>

              {backupCodes.length > 0 && (
                <div className="space-y-2 rounded border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm font-medium text-yellow-800">{t.security.saveBackupCodes}</p>
                  <p className="text-xs text-yellow-700">{t.security.backupCodesNote}</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <span key={index} className="rounded border bg-white px-2 py-1">{code}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="totpCode">{t.security.verificationCode}</Label>
                  <Input id="totpCode" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="000000" maxLength={6} />
                </div>
                <Button onClick={handleVerify2FA} disabled={twoFALoading || totpCode.length !== 6}>
                  {twoFALoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t.security.verifyAndActivate}
                </Button>
              </div>
            </div>
          )}

          {is2FAEnabled && !showSetup && (
            <Button variant="destructive" onClick={handleDisable2FA} disabled={twoFALoading}>
              {twoFALoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t.security.disable2FA}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
