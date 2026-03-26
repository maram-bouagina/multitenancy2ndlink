'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/lib/hooks/use-customer-auth';
import { customerUpdatePrivacy, customerDeleteAccount } from '@/lib/api/customer-client';
import { authClient } from '@/lib/auth-client';
import { Loader2, Check, AlertTriangle, Download } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

export default function CustomerPrivacyPage() {
  const { customer, slug, refresh } = useCustomerAuth();
  const router = useRouter();
  const [marketing, setMarketing] = useState(customer?.accepts_marketing || false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const { t } = useStorefrontLanguage();

  const handleSavePrivacy = async () => {
    try {
      setLoading(true);
      setSuccess('');
      await customerUpdatePrivacy(slug, { accepts_marketing: marketing });
      await refresh();
      setSuccess(t.accountPrivacy.prefsSaved);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      setExportDone(false);
      // Gather profile data from Better Auth session + Go profile
      const { data: session } = await authClient.getSession();
      const userData = {
        profile: {
          email: session?.user?.email,
          name: session?.user?.name,
          firstName: customer?.firstName,
          lastName: customer?.lastName,
          phone: customer?.phone,
          emailVerified: customer?.emailVerified,
          createdAt: customer?.createdAt,
        },
        preferences: { accepts_marketing: marketing },
      };
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportDone(true);
    } catch { /* ignore */ }
    finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await customerDeleteAccount(slug);
      await authClient.signOut();
      router.push(`/store/${slug}`);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t.accountPrivacy.marketingTitle}</h2>

        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" /> {success}
          </div>
        )}

        <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:opacity-90" style={{ borderColor: 'var(--sf-border)' }}>
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
            className="mt-1" />
          <div>
            <p className="font-medium text-sm">{t.accountPrivacy.marketingLabel}</p>
            <p className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>{t.accountPrivacy.marketingDesc}</p>
          </div>
        </label>

        <button onClick={handleSavePrivacy} disabled={loading}
          className="py-2 px-4 rounded-md text-white text-sm font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center">
          {loading && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
          {t.accountPrivacy.savePrefs}
        </button>
      </div>

      <hr style={{ borderColor: 'var(--sf-border)' }} />

      {/* ── Data Export ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download className="h-5 w-5" /> {t.accountPrivacy.dataTitle}
        </h2>
        <p className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>
          {t.accountPrivacy.dataDesc}
        </p>
        {exportDone && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" /> {t.accountPrivacy.exportDone}
          </div>
        )}
        <button onClick={handleExportData} disabled={exporting}
          className="py-2 px-4 rounded-md border text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center"
          style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)' }}>
          {exporting && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
          {t.accountPrivacy.exportBtn}
        </button>
      </div>

      <hr style={{ borderColor: 'var(--sf-border)' }} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> {t.accountPrivacy.dangerTitle}
        </h2>
        <p className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>
          {t.accountPrivacy.dangerDesc}
        </p>

        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)}
            className="py-2 px-4 rounded-md border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50">
            {t.accountPrivacy.deleteBtn}
          </button>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg space-y-3">
            <p className="text-sm text-red-700 font-medium">{t.accountPrivacy.deleteConfirmMsg}</p>
            <p className="text-xs text-red-600">{t.accountPrivacy.deleteConfirmDesc}</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} disabled={deleting}
                className="py-2 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center">
                {deleting && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
                {t.accountPrivacy.deleteConfirmBtn}
              </button>
              <button onClick={() => setDeleteConfirm(false)}
                className="py-2 px-4 rounded-md border text-sm hover:opacity-90"
                style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)' }}>
                {t.accountPrivacy.cancelBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
