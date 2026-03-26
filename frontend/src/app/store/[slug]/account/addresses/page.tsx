'use client';

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '@/lib/hooks/use-customer-auth';
import {
  customerListAddresses,
  customerCreateAddress,
  customerUpdateAddress,
  customerDeleteAddress,
  type CustomerAddress,
} from '@/lib/api/customer-client';
import { Loader2, Plus, Trash2, Pencil, X } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

const emptyAddr = {
  label: 'home', first_name: '', last_name: '', company: null as string | null,
  address1: '', address2: null as string | null, city: '', state: null as string | null,
  postal_code: '', country: '', phone: null as string | null, is_default: false,
};

export default function CustomerAddressesPage() {
  const { slug } = useCustomerAuth();
  const { t } = useStorefrontLanguage();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(emptyAddr);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await customerListAddresses(slug);
      setAddresses(data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (addr: CustomerAddress) => {
    setEditing(addr.id);
    setForm({
      label: addr.label, first_name: addr.first_name, last_name: addr.last_name,
      company: addr.company ?? null, address1: addr.address1, address2: addr.address2 ?? null,
      city: addr.city, state: addr.state ?? null, postal_code: addr.postal_code,
      country: addr.country, phone: addr.phone ?? null, is_default: addr.is_default,
    });
  };

  const startNew = () => {
    setEditing('new');
    setForm(emptyAddr);
  };

  const cancel = () => { setEditing(null); setError(''); };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      if (editing === 'new') {
        await customerCreateAddress(slug, form);
      } else if (editing) {
        await customerUpdateAddress(slug, editing, form);
      }
      setEditing(null);
      await load();
    } catch {
      setError(t.accountAddresses.failedSave);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.accountAddresses.deleteConfirm)) return;
    try {
      await customerDeleteAddress(slug, id);
      await load();
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--sf-text-muted)' }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.accountAddresses.title}</h2>
        {!editing && (
          <button onClick={startNew}
            className="flex items-center gap-1 text-sm text-(--sf-primary) hover:underline">
            <Plus className="h-4 w-4" /> {t.accountAddresses.addAddress}
          </button>
        )}
      </div>

      {editing && (
        <div className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}>
          {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <input placeholder={t.accountAddresses.firstName} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} required />
            <input placeholder={t.accountAddresses.lastName} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} required />
          </div>
          <input placeholder={t.accountAddresses.company} value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value || null })}
            className="w-full px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          <input placeholder={t.accountAddresses.address1} value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} required />
          <input placeholder={t.accountAddresses.address2} value={form.address2 || ''} onChange={(e) => setForm({ ...form, address2: e.target.value || null })}
            className="w-full px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          <div className="grid grid-cols-3 gap-3">
            <input placeholder={t.accountAddresses.city} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} required />
            <input placeholder={t.accountAddresses.state} value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value || null })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
            <input placeholder={t.accountAddresses.postalCode} value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder={t.accountAddresses.country} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} required />
            <input placeholder={t.accountAddresses.phone} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }} />
          </div>
          <div className="flex items-center gap-3">
            <select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}>
              <option value="home">{t.accountAddresses.home}</option>
              <option value="work">{t.accountAddresses.work}</option>
              <option value="other">{t.accountAddresses.other}</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              {t.accountAddresses.defaultLabel}
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="py-2 px-4 rounded-md text-white text-sm font-medium bg-(--sf-primary) hover:opacity-90 disabled:opacity-50 flex items-center">
              {saving && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
              {editing === 'new' ? t.accountAddresses.addBtn : t.accountAddresses.saveBtn}
            </button>
            <button onClick={cancel} className="py-2 px-4 rounded-md border text-sm flex items-center gap-1 hover:opacity-80"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)' }}>
              <X className="h-3 w-3" /> {t.accountAddresses.cancel}
            </button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !editing && (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--sf-text-muted)' }}>{t.accountAddresses.noAddresses}</p>
      )}

      <div className="space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className="border rounded-lg p-4 flex justify-between items-start" style={{ borderColor: 'var(--sf-border)' }}>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium" style={{ color: 'var(--sf-text-primary)' }}>{addr.first_name} {addr.last_name}</span>
                <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: 'var(--sf-hover-bg)', color: 'var(--sf-text-secondary)' }}>{addr.label}</span>
                {addr.is_default && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t.accountAddresses.defaultBadge}</span>}
              </div>
              <p style={{ color: 'var(--sf-text-secondary)' }}>{addr.address1}</p>
              {addr.address2 && <p style={{ color: 'var(--sf-text-secondary)' }}>{addr.address2}</p>}
              <p style={{ color: 'var(--sf-text-secondary)' }}>{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code}</p>
              <p style={{ color: 'var(--sf-text-secondary)' }}>{addr.country}</p>
              {addr.phone && <p className="mt-1" style={{ color: 'var(--sf-text-muted)' }}>{addr.phone}</p>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(addr)} className="p-2 rounded-md hover:opacity-80" style={{ color: 'var(--sf-text-muted)' }}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(addr.id)} className="p-2 hover:bg-red-50 rounded-md">
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
