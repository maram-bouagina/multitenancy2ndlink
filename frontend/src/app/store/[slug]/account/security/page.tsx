'use client';

import { useState } from 'react';
import { useCustomerAuth } from '@/lib/hooks/use-customer-auth';
import { authClient } from '@/lib/auth-client';
import { Loader2, Check, Shield, ShieldOff } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

export default function CustomerSecurityPage() {
  const { customer } = useCustomerAuth();
  const { t } = useStorefrontLanguage();

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 2FA
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFASuccess, setTwoFASuccess] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [passwordFor2FA, setPasswordFor2FA] = useState('');

  const passwordRules = [
    { label: t.auth.passwordRuleLength, met: newPassword.length >= 8 },
    { label: t.auth.passwordRuleUpper, met: /[A-Z]/.test(newPassword) },
    { label: t.auth.passwordRuleLower, met: /[a-z]/.test(newPassword) },
    { label: t.auth.passwordRuleNumber, met: /\d/.test(newPassword) },
  ];

  const is2FAEnabled = customer?.twoFactorEnabled;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError(t.accountSecurity.mismatch); return; }
    if (!passwordRules.every(r => r.met)) { setError(t.accountSecurity.requirements); return; }
    try {
      setLoading(true); setError(''); setSuccess('');
      const { error: pwErr } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (pwErr) { setError(pwErr.message || t.accountSecurity.failed); return; }
      setSuccess(t.accountSecurity.success);
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch {
      setError(t.accountSecurity.failed);
    } finally { setLoading(false); }
  };

  const handleEnable2FA = async () => {
    if (!passwordFor2FA) { setTwoFAError(t.accountSecurity.enterPasswordEnable); return; }
    try {
      setTwoFALoading(true); setTwoFAError(''); setTwoFASuccess('');
      const res = await authClient.twoFactor.enable({ password: passwordFor2FA });
      if (res.data) {
        setQrUri(res.data.totpURI);
        setBackupCodes(res.data.backupCodes);
        setShowSetup(true);
      } else {
        setTwoFAError(t.accountSecurity.failedEnable);
      }
    } catch {
      setTwoFAError(t.accountSecurity.failedEnable);
    } finally { setTwoFALoading(false); }
  };

  const handleVerify2FA = async () => {
    try {
      setTwoFALoading(true); setTwoFAError('');
      await authClient.twoFactor.verifyTotp({ code: totpCode });
      setShowSetup(false); setQrUri(''); setTotpCode(''); setPasswordFor2FA('');
      setTwoFASuccess(t.accountSecurity.enabled2FA);
    } catch {
      setTwoFAError(t.accountSecurity.invalidCode);
    } finally { setTwoFALoading(false); }
  };

  const handleDisable2FA = async () => {
    if (!passwordFor2FA) { setTwoFAError(t.accountSecurity.enterPasswordDisable); return; }
    try {
      setTwoFALoading(true); setTwoFAError(''); setTwoFASuccess('');
      await authClient.twoFactor.disable({ password: passwordFor2FA });
      setShowSetup(false); setPasswordFor2FA('');
      setTwoFASuccess(t.accountSecurity.disabled2FA);
    } catch {
      setTwoFAError(t.accountSecurity.failedDisable);
    } finally { setTwoFALoading(false); }
  };

  return (
    <div className="space-y-8">
      {/* ── Change Password ── */}
      <div className="space-y-4 max-w-lg">
        <h2 className="text-lg font-semibold">{t.accountSecurity.changePassword}</h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}
          {success && (
            <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md flex items-center gap-2">
              <Check className="h-4 w-4" /> {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t.accountSecurity.currentPassword}</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t.accountSecurity.newPassword}</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
            {newPassword && (
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
            <label className="block text-sm font-medium mb-1">{t.accountSecurity.confirmPassword}</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>
          <button type="submit" disabled={loading}
            className="py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center">
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t.accountSecurity.changeBtn}
          </button>
        </form>
      </div>

      <hr style={{ borderColor: 'var(--sf-border)' }} />

      {/* ── Two-Factor Authentication ── */}
      <div className="space-y-4 max-w-lg">
        <div className="flex items-center gap-2">
          {is2FAEnabled ? <Shield className="h-5 w-5 text-green-500" /> : <ShieldOff className="h-5 w-5" style={{ color: 'var(--sf-text-muted)' }} />}
          <h2 className="text-lg font-semibold">{t.accountSecurity.twoFA}</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>
          {is2FAEnabled
            ? t.accountSecurity.twoFAEnabled
            : t.accountSecurity.twoFADisabled}
        </p>

        {twoFAError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{twoFAError}</div>}
        {twoFASuccess && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" /> {twoFASuccess}
          </div>
        )}

        {/* Password input for 2FA actions */}
        {!showSetup && (
          <div>
            <label className="block text-sm font-medium mb-1">{t.accountSecurity.passwordFor2FA}</label>
            <input type="password" value={passwordFor2FA} onChange={(e) => setPasswordFor2FA(e.target.value)} placeholder={t.accountSecurity.enterPasswordPlaceholder}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>
        )}

        {!is2FAEnabled && !showSetup && (
          <button onClick={handleEnable2FA} disabled={twoFALoading}
            className="py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center">
            {twoFALoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t.accountSecurity.enable}
          </button>
        )}

        {showSetup && qrUri && (
          <div className="space-y-4 border rounded-lg p-4" style={{ borderColor: 'var(--sf-border)' }}>
            <p className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>{t.accountSecurity.scanQR}</p>
            <div className="bg-white p-4 rounded border inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
                alt="2FA QR Code" width={200} height={200}
              />
            </div>
            <p className="text-xs break-all" style={{ color: 'var(--sf-text-muted)' }}>{t.accountSecurity.manualEntry} {qrUri}</p>

            {backupCodes.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-yellow-800">{t.accountSecurity.saveBackup}</p>
                <p className="text-xs text-yellow-700">{t.accountSecurity.backupNote}</p>
                <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                  {backupCodes.map((code, i) => (
                    <span key={i} className="bg-white px-2 py-1 rounded border">{code}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">{t.accountSecurity.verifyCode}</label>
                <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="000000" maxLength={6}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--sf-primary)"
                  style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
              </div>
              <button onClick={handleVerify2FA} disabled={twoFALoading || totpCode.length !== 6}
                className="py-2 px-4 rounded-md text-white font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center">
                {twoFALoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t.accountSecurity.verifyBtn}
              </button>
            </div>
          </div>
        )}

        {is2FAEnabled && !showSetup && (
          <button onClick={handleDisable2FA} disabled={twoFALoading}
            className="py-2 px-4 rounded-md border border-red-300 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 flex items-center">
            {twoFALoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t.accountSecurity.disable}
          </button>
        )}
      </div>
    </div>
  );
}
