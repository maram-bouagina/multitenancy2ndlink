'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import {
  useStoreRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useStoreMembers,
} from '@/lib/hooks/use-api';
import { type StoreRole, type Permission, PERMISSION_GROUPS } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Shield, Plus, Pencil, Trash2, Check, X, Search, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Export helper ─────────────────────────────────────────────────────────────

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Role form (shared for create & edit) ─────────────────────────────────────

interface RoleFormProps {
  initial?: StoreRole;
  onSave: (name: string, description: string, permissions: Permission[]) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  tt: Record<string, string>;
}

function RoleForm({ initial, onSave, onCancel, isPending, tt }: RoleFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [selectedPerms, setSelectedPerms] = useState<Set<Permission>>(
    new Set((initial?.permissions ?? []) as Permission[])
  );

  function toggle(perm: Permission) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(name.trim(), description.trim(), Array.from(selectedPerms));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="role-name">{tt.nameLabel}</Label>
        <Input
          id="role-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tt.namePlaceholder}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="role-desc">{tt.descriptionLabel}</Label>
        <Textarea
          id="role-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={tt.descriptionPlaceholder}
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label>{tt.permissionsLabel}</Label>
        {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
          const groupKey = `permGroup${group}` as const;
          const groupLabel = tt[groupKey] ?? group;
          return (
            <div key={group} className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-700">{groupLabel}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {perms.map((perm) => {
                  const permLabel = tt[perm] ?? perm;
                  return (
                    <div key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`perm-${perm}`}
                        checked={selectedPerms.has(perm)}
                        onChange={() => toggle(perm)}
                        className="h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer"
                      />
                      <label
                        htmlFor={`perm-${perm}`}
                        className="text-sm cursor-pointer select-none"
                      >
                        {permLabel}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? initial
              ? tt.saving
              : tt.creating
            : initial
            ? tt.saveChanges
            : tt.create}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tt.cancel}
        </Button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { currentStore, user } = useAuth();
  const { t } = useLanguage();
  const tt = t.roles as Record<string, string>;
  const storeId = currentStore?.id;

  const { data: rolesData, isLoading } = useStoreRoles(storeId);
  const { data: membersData } = useStoreMembers(storeId);
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<StoreRole | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Search
  const [roleSearch, setRoleSearch] = useState('');

  // Bulk selection
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Only owners (role === 'owner') can manage roles
  const myMember = membersData?.members?.find((m) => m.user_id === user?.id);
  const isOwner = myMember?.role === 'owner';

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  // ── Filtered data ──────────────────────────────────────────────────────────

  const allRoles = rolesData?.roles ?? [];
  const filteredRoles = allRoles.filter((r) => {
    if (!roleSearch.trim()) return true;
    const q = roleSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.permissions?.some((p) => p.toLowerCase().includes(q))
    );
  });

  // ── Bulk helpers ───────────────────────────────────────────────────────────

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectableRoles = filteredRoles.filter((r) => !r.is_system);
  const allRolesSelected = selectedRoleIds.size > 0 && selectedRoleIds.size === selectableRoles.length;

  function toggleAllRoles() {
    if (allRolesSelected) {
      setSelectedRoleIds(new Set());
    } else {
      setSelectedRoleIds(new Set(selectableRoles.map((r) => r.id)));
    }
  }

  async function handleBulkDeleteRoles() {
    if (!storeId || selectedRoleIds.size === 0) return;
    if (!confirm(`Delete ${selectedRoleIds.size} role(s)? Members assigned to them will lose custom permissions.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedRoleIds].map((id) => deleteRole.mutateAsync({ storeId, roleId: id })));
      setSelectedRoleIds(new Set());
      showSuccess(`${selectedRoleIds.size} role(s) deleted.`);
    } catch {
      alert('Error deleting some roles.');
    } finally {
      setBulkDeleting(false);
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  function handleExportRoles() {
    const data = allRoles.map((r) => ({
      name: r.name,
      description: r.description,
      permissions: r.permissions,
    }));
    downloadJSON('roles.json', data);
  }

  function handleDownloadTemplate() {
    downloadJSON('role_template.json', [
      { name: 'Example Role', description: 'Role description', permissions: ['products:create', 'products:edit'] },
    ]);
  }

  async function handleCreate(name: string, description: string, permissions: Permission[]) {
    if (!storeId) return;
    await createRole.mutateAsync({ storeId, data: { name, description, permissions } });
    setShowCreateForm(false);
    showSuccess(tt.roleCreated);
  }

  async function handleUpdate(roleId: string, name: string, description: string, permissions: Permission[]) {
    if (!storeId) return;
    await updateRole.mutateAsync({ storeId, roleId, data: { name, description, permissions } });
    setEditingRole(null);
    showSuccess(tt.roleUpdated);
  }

  async function handleDelete(roleId: string) {
    if (!storeId || !confirm(tt.deleteConfirm)) return;
    await deleteRole.mutateAsync({ storeId, roleId });
    showSuccess(tt.roleDeleted);
  }

  if (!storeId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">{tt.title}</h1>
        <p className="mt-2 text-gray-500">{tt.noStore}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {tt.title}
          </h1>
          <p className="text-gray-600">{tt.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              placeholder="Search name, permission…"
              className="pl-8 w-52"
            />
          </div>
          {/* Template download */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} title="Download role JSON template">
            Template
          </Button>
          {/* Export JSON */}
          <Button variant="outline" size="sm" onClick={handleExportRoles} title="Export roles as JSON">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          {isOwner && !showCreateForm && (
            <Button onClick={() => { setShowCreateForm(true); setEditingRole(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              {tt.createRole}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {isOwner && selectedRoleIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <span className="text-sm text-red-700 font-medium">{selectedRoleIds.size} selected</span>
          <Button size="sm" variant="destructive" disabled={bulkDeleting} onClick={handleBulkDeleteRoles}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedRoleIds(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Select all for bulk */}
      {isOwner && selectableRoles.length > 0 && !showCreateForm && !editingRole && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="select-all-roles"
            checked={allRolesSelected}
            onChange={toggleAllRoles}
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
          />
          <label htmlFor="select-all-roles" className="text-sm text-gray-500 cursor-pointer">
            Select all custom roles
          </label>
        </div>
      )}

      {/* Success alert */}
      {successMsg && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Create form */}
      {showCreateForm && isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tt.createRole}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RoleForm
              onSave={handleCreate}
              onCancel={() => setShowCreateForm(false)}
              isPending={createRole.isPending}
              tt={tt}
            />
          </CardContent>
        </Card>
      )}

      {/* Roles list */}
      {isLoading ? (
        <p className="text-sm text-gray-500">{tt.loading}</p>
      ) : filteredRoles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500">{roleSearch ? 'No results.' : tt.noRoles}</p>
            {isOwner && !roleSearch && (
              <Button className="mt-4" variant="outline" onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {tt.createRole}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRoles.map((role) =>
            editingRole?.id === role.id ? (
              <Card key={role.id} className="col-span-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tt.editRole}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setEditingRole(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <RoleForm
                    initial={role}
                    onSave={(name, desc, perms) => handleUpdate(role.id, name, desc, perms)}
                    onCancel={() => setEditingRole(null)}
                    isPending={updateRole.isPending}
                    tt={tt}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card
                key={role.id}
                className={cn(
                  'flex flex-col',
                  role.is_system && 'opacity-70',
                  selectedRoleIds.has(role.id) && 'ring-2 ring-red-400'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {isOwner && !role.is_system && (
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.has(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-primary cursor-pointer"
                        />
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-base">{role.name}</CardTitle>
                        {role.description && (
                          <CardDescription className="mt-0.5">{role.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    {role.is_system && (
                      <Badge variant="secondary" className="shrink-0">System</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {tt.membersCount.replace('{count}', String(role.member_count ?? 0))}
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex flex-wrap gap-1">
                    {(role.permissions ?? []).map((p) => (
                      <Badge key={p} variant="outline" className="text-xs font-normal">
                        {tt[p] ?? p}
                      </Badge>
                    ))}
                    {(role.permissions ?? []).length === 0 && (
                      <p className="text-xs text-gray-400">—</p>
                    )}
                  </div>
                </CardContent>
                {isOwner && !role.is_system && (
                  <div className="flex gap-1 p-3 pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setEditingRole(role); setShowCreateForm(false); }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      {tt.editRole}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(role.id)}
                      disabled={deleteRole.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
