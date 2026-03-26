'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import { ArrowLeft, Save, Loader2, Trash2, MapPin, Mail, Phone, Shield, Calendar } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id ?? '';

  const { data, isLoading } = useCustomer(storeId, id);
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState('');

  const customer = data?.customer;
  const addresses = data?.addresses || [];

  const startEditing = () => {
    if (!customer) return;
    setFirstName(customer.first_name);
    setLastName(customer.last_name);
    setPhone(customer.phone || '');
    setStatus(customer.status);
    setEditing(true);
    setSuccess('');
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        storeId,
        customerId: id,
        data: { first_name: firstName, last_name: lastName, phone: phone || undefined, status },
      });
      setEditing(false);
      setSuccess(t.customerDetailPage.updatedSuccess);
    } catch {
      // error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.customerDetailPage.deleteConfirm)) return;
    await deleteMutation.mutateAsync({ storeId, customerId: id });
    router.push('/dashboard/customers');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/customers"><ArrowLeft className="mr-2 h-4 w-4" /> {t.customerDetailPage.back}</Link>
        </Button>
        <p className="text-gray-500">{t.customerDetailPage.notFound}</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/customers"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.first_name} {customer.last_name}</h1>
            <p className="text-gray-500 text-sm">{customer.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button variant="outline" onClick={startEditing}>Edit</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>{t.customerDetailPage.cancel}</Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> {t.customerDetailPage.save}
              </Button>
            </>
          )}
          <Button variant="ghost" className="text-red-600" onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md">{success}</div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.customerDetailPage.profileInformation}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.customerDetailPage.firstName}</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.customerDetailPage.lastName}</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.customerDetailPage.phone}</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.customerDetailPage.phonePlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.customerDetailPage.status}</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm">
                    <option value="active">{t.customersPage.active}</option>
                    <option value="pending">{t.customersPage.pending}</option>
                    <option value="suspended">{t.customersPage.suspended}</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{customer.email}</span>
                  {customer.email_verified && (
                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{t.customerDetailPage.verified}</span>
                  )}
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[customer.status] || 'bg-gray-100'}`}>
                    {customer.status === 'active' ? t.customersPage.active : customer.status === 'pending' ? t.customersPage.pending : customer.status === 'suspended' ? t.customersPage.suspended : customer.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{t.customerDetailPage.joined} {new Date(customer.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.customerDetailPage.accountDetails}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t.customerDetailPage.emailVerified}</span>
                <span>{customer.email_verified ? t.customerDetailPage.yes : t.customerDetailPage.no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t.customerDetailPage.twoFactorAuth}</span>
                <span>{customer.two_factor_enabled ? t.customerDetailPage.enabled : t.customerDetailPage.disabled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t.customerDetailPage.marketingConsent}</span>
                <span>{customer.accepts_marketing ? t.customerDetailPage.optedIn : t.customerDetailPage.optedOut}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {t.customerDetailPage.addresses}
          </CardTitle>
          <CardDescription>{t.customerDetailPage.addressesOnFile.replace('{count}', String(addresses.length))}</CardDescription>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">{t.customerDetailPage.noAddresses}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.customerDetailPage.label}</TableHead>
                    <TableHead>{t.customerDetailPage.name}</TableHead>
                    <TableHead>{t.customerDetailPage.address}</TableHead>
                    <TableHead>{t.customerDetailPage.city}</TableHead>
                    <TableHead>{t.customerDetailPage.country}</TableHead>
                    <TableHead>{t.customerDetailPage.default}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addresses.map((addr) => (
                    <TableRow key={addr.id}>
                      <TableCell className="capitalize text-sm">{addr.label}</TableCell>
                      <TableCell className="text-sm">{addr.first_name} {addr.last_name}</TableCell>
                      <TableCell className="text-sm">{addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}</TableCell>
                      <TableCell className="text-sm">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code}</TableCell>
                      <TableCell className="text-sm">{addr.country}</TableCell>
                      <TableCell>
                        {addr.is_default && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{t.customerDetailPage.default}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
