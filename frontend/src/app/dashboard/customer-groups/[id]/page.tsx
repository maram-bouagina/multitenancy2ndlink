'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCustomerGroup,
  useUpdateCustomerGroup,
  useDeleteCustomerGroup,
  useAddCustomerGroupMembers,
  useRemoveCustomerGroupMembers,
  useCustomers,
} from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import { ArrowLeft, Save, Trash2, UserPlus, X, Loader2 } from 'lucide-react';

export default function CustomerGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id ?? '';

  const { data, isLoading } = useCustomerGroup(storeId, id);
  const updateMutation = useUpdateCustomerGroup();
  const deleteMutation = useDeleteCustomerGroup();
  const addMembersMutation = useAddCustomerGroupMembers();
  const removeMembersMutation = useRemoveCustomerGroupMembers();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('0');

  // Add member search
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const { data: searchResults } = useCustomers(storeId, {
    search: memberSearch,
    limit: 10,
  });

  const group = data?.group;
  const members = data?.members ?? [];

  const startEdit = () => {
    if (!group) return;
    setName(group.name);
    setDescription(group.description ?? '');
    setDiscount(String(group.discount));
    setEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      storeId,
      groupId: id,
      data: { name, description: description || undefined, discount: parseFloat(discount) || 0 },
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(t.customerGroupDetailPage.deleteConfirm)) return;
    await deleteMutation.mutateAsync({ storeId, groupId: id });
    router.push('/dashboard/customer-groups');
  };

  const handleAddMember = async (customerId: string) => {
    await addMembersMutation.mutateAsync({ storeId, groupId: id, customerIds: [customerId] });
    setMemberSearch('');
  };

  const handleRemoveMember = async (customerId: string) => {
    await removeMembersMutation.mutateAsync({ storeId, groupId: id, customerIds: [customerId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!group) {
    return <p className="text-center text-gray-500 py-12">{t.customerGroupDetailPage.notFound}</p>;
  }

  // Exclude already-added members from search results
  const memberIds = new Set(members.map((m) => m.id));
  const addableCandidates = (searchResults?.data ?? []).filter((c) => !memberIds.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/customer-groups">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              {t.customerGroupDetailPage.edit}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-red-600" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> {t.customerGroupDetailPage.delete}
          </Button>
        </div>
      </div>

      {/* Group details / edit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.customerGroupDetailPage.details}</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-3 max-w-lg">
              <div>
                <label className="block text-sm font-medium mb-1">{t.customerGroupsPage.name}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.customerGroupsPage.description}</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.customerGroupsPage.discount}</label>
                <Input type="number" min="0" max="100" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-1 h-4 w-4" /> {t.customerGroupDetailPage.save}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  {t.customerGroupDetailPage.cancel}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-gray-500">{t.customerGroupsPage.name}</dt>
                <dd className="font-medium">{group.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t.customerGroupsPage.description}</dt>
                <dd>{group.description || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t.customerGroupsPage.discount}</dt>
                <dd>{group.discount > 0 ? `${group.discount}%` : t.customerGroupDetailPage.none}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t.customerGroupDetailPage.membersTitle.replace('{count}', String(members.length))}</CardTitle>
            <CardDescription>{t.customerGroupDetailPage.membersDesc}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(!showAddMember)}>
            {showAddMember ? <X className="mr-1 h-4 w-4" /> : <UserPlus className="mr-1 h-4 w-4" />}
            {showAddMember ? t.customerGroupDetailPage.close : t.customerGroupDetailPage.addMember}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddMember && (
            <div className="border rounded-md p-3 space-y-2">
              <Input
                placeholder={t.customerGroupDetailPage.searchPlaceholder}
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              {memberSearch.length >= 2 && addableCandidates.length > 0 && (
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {addableCandidates.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-50">
                      <span className="text-sm">
                        {c.first_name} {c.last_name} — <span className="text-gray-500">{c.email}</span>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddMember(c.id)}
                        disabled={addMembersMutation.isPending}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {memberSearch.length >= 2 && addableCandidates.length === 0 && (
                <p className="text-sm text-gray-500 px-2">{t.customerGroupDetailPage.noMatchingCustomers}</p>
              )}
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.customerGroupDetailPage.customer}</TableHead>
                  <TableHead>{t.customerGroupDetailPage.email}</TableHead>
                  <TableHead>{t.customerGroupDetailPage.status}</TableHead>
                  <TableHead>{t.customerGroupDetailPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{member.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : member.status === 'suspended'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {member.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removeMembersMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" /> {t.customerGroupDetailPage.remove}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {t.customerGroupDetailPage.empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
