'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import {
  useStoreMembers,
  useStoreInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  useUpdateMemberRole,
  useRemoveMember,
  useStoreRoles,
} from '@/lib/hooks/use-api';
import { type MemberRole } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Trash2, RefreshCw, X, Check, Search, Download, Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';


function roleBadgeVariant(role: MemberRole): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (role) {
    case 'owner': return 'default';
    case 'designer': return 'secondary';
    default: return 'outline';
  }
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'pending': return 'secondary';
    case 'accepted': return 'default';
    case 'revoked': return 'destructive';
    default: return 'outline';
  }
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
    );
}

export default function TeamPage() {
  const { currentStore, myStores, user } = useAuth();
  const { t } = useLanguage();
  const tt = t.team;
  const storeId = currentStore?.id;

  const { data: membersData, isLoading: loadingMembers } = useStoreMembers(storeId);
  const { data: invitationsData, isLoading: loadingInvitations } = useStoreInvitations(storeId);
  // Roles for the current store (used in the members table role-change dropdown)
  const { data: rolesData } = useStoreRoles(storeId);

  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleValue, setInviteRoleValue] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [inviteStoreId, setInviteStoreId] = useState<string | undefined>(undefined);
  const effectiveInviteStoreId = inviteStoreId ?? storeId;
  const { data: inviteRolesData } = useStoreRoles(effectiveInviteStoreId);

  // Search
  const [memberSearch, setMemberSearch] = useState('');
  const [invitationSearch, setInvitationSearch] = useState('');

  // Bulk selection
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // CSV import
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  const myMember = membersData?.members?.find((m) => m.user_id === user?.id);
  const isOwner = myMember?.role === 'owner';

  function roleLabel(role: MemberRole) {
    switch (role) {
      case 'owner': return tt.roleOwner;
      case 'designer': return tt.roleDesigner;
      case 'editor': return tt.roleEditor;
      case 'viewer': return tt.roleViewer;
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'pending': return tt.statusPending;
      case 'accepted': return tt.statusAccepted;
      case 'expired': return tt.statusExpired;
      case 'revoked': return tt.statusRevoked;
      default: return status;
    }
  }

  // ── Filtered data ──────────────────────────────────────────────────────────

  const allMembers = membersData?.members ?? [];
  const filteredMembers = allMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    const roleName = m.store_role?.name ?? roleLabel(m.role) ?? '';
    return (
      m.name?.toLowerCase().includes(q) ||
      m.display_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      roleName.toLowerCase().includes(q)
    );
  });

  const allInvitations = invitationsData?.invitations ?? [];
  const filteredInvitations = allInvitations.filter((inv) => {
    if (!invitationSearch.trim()) return true;
    const q = invitationSearch.toLowerCase();
    const roleName = inv.store_role?.name ?? roleLabel(inv.role) ?? '';
    return (
      inv.email?.toLowerCase().includes(q) ||
      roleName.toLowerCase().includes(q) ||
      inv.status?.toLowerCase().includes(q)
    );
  });

  // ── Bulk helpers ───────────────────────────────────────────────────────────

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleInvitation(id: string) {
    setSelectedInvitationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllMembers() {
    if (selectedMemberIds.size === filteredMembers.filter((m) => m.role !== 'owner').length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(filteredMembers.filter((m) => m.role !== 'owner').map((m) => m.id)));
    }
  }

  function toggleAllInvitations() {
    if (selectedInvitationIds.size === filteredInvitations.length) {
      setSelectedInvitationIds(new Set());
    } else {
      setSelectedInvitationIds(new Set(filteredInvitations.map((inv) => inv.id)));
    }
  }

  async function handleBulkDeleteMembers() {
    if (!storeId || selectedMemberIds.size === 0) return;
    if (!confirm(`Remove ${selectedMemberIds.size} member(s) from the store?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedMemberIds].map((id) => removeMember.mutateAsync({ storeId, memberId: id })));
      setSelectedMemberIds(new Set());
      showSuccess(`${selectedMemberIds.size} member(s) removed.`);
    } catch {
      alert('Error removing some members.');
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkRevokeInvitations() {
    if (!storeId || selectedInvitationIds.size === 0) return;
    if (!confirm(`Revoke/delete ${selectedInvitationIds.size} invitation(s)?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedInvitationIds].map((id) => revokeInvitation.mutateAsync({ invitationId: id, storeId })));
      setSelectedInvitationIds(new Set());
      showSuccess(`${selectedInvitationIds.size} invitation(s) revoked.`);
    } catch {
      alert('Error revoking some invitations.');
    } finally {
      setBulkDeleting(false);
    }
  }

  // ── Import/Export ──────────────────────────────────────────────────────────

  function handleExportMembers() {
    const rows = [
      ['name', 'email', 'role', 'custom_role', 'joined'],
      ...allMembers.map((m) => [
        m.name || m.display_name || '',
        m.email,
        m.store_role ? m.store_role.name : roleLabel(m.role),
        m.store_role?.name ?? '',
        new Date(m.created_at).toLocaleDateString(),
      ]),
    ];
    downloadCSV('members.csv', rows);
  }

  function handleExportInvitations() {
    const rows = [
      ['email', 'role_name', 'status', 'expires_at'],
      ...allInvitations.map((inv) => [
        inv.email,
        inv.store_role ? inv.store_role.name : roleLabel(inv.role),
        inv.status,
        new Date(inv.expires_at).toLocaleDateString(),
      ]),
    ];
    downloadCSV('invitations.csv', rows);
  }

  function handleDownloadTemplate() {
    const rows = [
      ['email', 'role_name'],
      ['colleague@example.com', 'Content Manager'],
    ];
    downloadCSV('invitation_template.csv', rows);
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !effectiveInviteStoreId) return;
    e.target.value = '';
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { alert('CSV is empty or has no data rows.'); return; }
    const header = rows[0].map((h) => h.toLowerCase());
    const emailIdx = header.indexOf('email');
    const roleIdx = header.indexOf('role_name');
    if (emailIdx === -1) { alert('CSV must have an "email" column.'); return; }

    const roles = inviteRolesData?.roles ?? rolesData?.roles ?? [];
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    for (const row of rows.slice(1)) {
      const email = row[emailIdx]?.trim();
      const roleName = roleIdx !== -1 ? row[roleIdx]?.trim() : '';
      if (!email) continue;
      const matchedRole = roleName ? roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase()) : null;
      try {
        await createInvitation.mutateAsync({
          storeId: effectiveInviteStoreId,
          data: {
            email,
            role: 'viewer',
            store_role_id: matchedRole?.id,
          },
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setImporting(false);
    showSuccess(`Imported: ${successCount} sent${errorCount > 0 ? `, ${errorCount} failed` : ''}.`);
  }

  // ── Form handlers ──────────────────────────────────────────────────────────

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const targetStoreId = effectiveInviteStoreId;
    if (!targetStoreId) return;
    try {
      const isCustom = inviteRoleValue.startsWith('custom:');
      await createInvitation.mutateAsync({
        storeId: targetStoreId,
        data: {
          email: inviteEmail,
          role: isCustom ? 'viewer' : (inviteRoleValue as 'designer' | 'editor' | 'viewer'),
          store_role_id: isCustom ? inviteRoleValue.slice('custom:'.length) : undefined,
        },
      });
      showSuccess(tt.inviteSuccess);
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRoleValue('');
      setInviteStoreId(undefined);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 409) {
        alert(msg || tt.inviteError);
      } else {
        alert(tt.inviteError);
      }
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!storeId || !confirm(tt.revokeConfirm)) return;
    try {
      await revokeInvitation.mutateAsync({ invitationId, storeId });
      showSuccess(tt.invitationRevoked);
    } catch {
      alert('Error');
    }
  }

  async function handleRoleChange(memberId: string, roleValue: string) {
    if (!storeId) return;
    try {
      const isCustom = roleValue.startsWith('custom:');
      await updateRole.mutateAsync({
        storeId,
        memberId,
        data: {
          role: isCustom ? 'viewer' : (roleValue as 'designer' | 'editor' | 'viewer'),
          store_role_id: isCustom ? roleValue.slice('custom:'.length) : null,
        },
      });
      showSuccess(tt.roleUpdated);
    } catch {
      alert('Error');
    }
  }

  async function handleRemove(memberId: string) {
    if (!storeId || !confirm(tt.removeConfirm)) return;
    try {
      await removeMember.mutateAsync({ storeId, memberId });
      showSuccess(tt.memberRemoved);
    } catch {
      alert('Error');
    }
  }

  if (!storeId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">{tt.title}</h1>
        <p className="mt-2 text-gray-500">{tt.noStore}</p>
      </div>
    );
  }

  const selectableMembersCount = filteredMembers.filter((m) => m.role !== 'owner').length;
  const allMembersSelected = selectedMemberIds.size > 0 && selectedMemberIds.size === selectableMembersCount;
  const allInvitationsSelected = selectedInvitationIds.size > 0 && selectedInvitationIds.size === filteredInvitations.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tt.title}</h1>
          <p className="text-gray-600">{tt.subtitle}</p>
        </div>
        {(isOwner || myMember?.role === 'editor') && (
          <Button onClick={() => setShowInviteForm((v) => !v)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {tt.inviteMember}
          </Button>
        )}
      </div>

      {successMsg && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Invite form */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tt.inviteTitle}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowInviteForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              {myStores.length > 1 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Boutique</label>
                  <Select
                    value={effectiveInviteStoreId ?? ''}
                    onValueChange={(v) => { setInviteStoreId(v); setInviteRoleValue(''); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une boutique" />
                    </SelectTrigger>
                    <SelectContent>
                      {myStores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">{tt.emailLabel}</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={tt.emailPlaceholder}
                    required
                  />
                </div>
                <div className="w-48 space-y-1">
                  <label className="text-sm font-medium">{tt.roleLabel}</label>
                  <Select value={inviteRoleValue} onValueChange={setInviteRoleValue}>
                    <SelectTrigger>
                      <SelectValue placeholder={tt.selectRole} />
                    </SelectTrigger>
                    <SelectContent>
                      {inviteRolesData?.roles && inviteRolesData.roles.length > 0 ? (
                        inviteRolesData.roles.map((r) => (
                          <SelectItem key={r.id} value={`custom:${r.id}`}>
                            {r.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-400">No custom roles yet</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createInvitation.isPending}>
                  {createInvitation.isPending ? tt.sending : tt.send}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                  {tt.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {(['members', 'invitations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedMemberIds(new Set());
              setSelectedInvitationIds(new Set());
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab === 'members' ? tt.membersTab : tt.invitationsTab}
          </button>
        ))}
      </div>

      {/* Members table */}
      {activeTab === 'members' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{tt.membersTab}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search name, email, role…"
                    className="pl-8 w-56"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleExportMembers} title="Export members as CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Bulk action bar for members */}
            {isOwner && selectedMemberIds.size > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 mt-2">
                <span className="text-sm text-red-700 font-medium">{selectedMemberIds.size} selected</span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkDeleting}
                  onClick={handleBulkDeleteMembers}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remove selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedMemberIds(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loadingMembers ? (
              <p className="text-sm text-gray-500">{tt.loading}</p>
            ) : !filteredMembers.length ? (
              <p className="text-sm text-gray-500">{memberSearch ? 'No results.' : tt.noMembers}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isOwner && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allMembersSelected}
                          onChange={toggleAllMembers}
                          className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                        />
                      </TableHead>
                    )}
                    <TableHead>{tt.name}</TableHead>
                    <TableHead>{tt.email}</TableHead>
                    <TableHead>{tt.role}</TableHead>
                    <TableHead>{tt.joined}</TableHead>
                    {isOwner && <TableHead>{tt.actions}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className={selectedMemberIds.has(member.id) ? 'bg-red-50/50' : ''}>
                      {isOwner && (
                        <TableCell>
                          {member.role !== 'owner' && (
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.has(member.id)}
                              onChange={() => toggleMember(member.id)}
                              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{member.name || '—'}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {isOwner && member.role !== 'owner' ? (
                            <Select
                              value={member.store_role_id ? `custom:${member.store_role_id}` : ''}
                              onValueChange={(v) => handleRoleChange(member.id, v)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {rolesData?.roles && rolesData.roles.length > 0 ? (
                                  rolesData.roles.map((r) => (
                                    <SelectItem key={r.id} value={`custom:${r.id}`}>
                                      {r.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-sm text-gray-400">No custom roles yet</div>
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={member.role === 'owner' ? 'default' : 'outline'}>
                              {member.store_role ? member.store_role.name : roleLabel(member.role)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                      {isOwner && (
                        <TableCell>
                          {member.role !== 'owner' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemove(member.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invitations table */}
      {activeTab === 'invitations' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{tt.invitationsTab}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={invitationSearch}
                    onChange={(e) => setInvitationSearch(e.target.value)}
                    placeholder="Search email, role, status…"
                    className="pl-8 w-56"
                  />
                </div>
                {/* Template download */}
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} title="Download CSV template">
                  <FileText className="mr-1 h-4 w-4" />
                  Template
                </Button>
                {/* Import CSV */}
                {isOwner && (
                  <>
                    <input
                      ref={importRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleImportCSV}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={importing}
                      onClick={() => importRef.current?.click()}
                      title="Import invitations from CSV"
                    >
                      <Upload className="mr-1 h-4 w-4" />
                      {importing ? 'Importing…' : 'Import'}
                    </Button>
                  </>
                )}
                {/* Export CSV */}
                <Button variant="outline" size="sm" onClick={handleExportInvitations} title="Export invitations as CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Bulk action bar for invitations */}
            {isOwner && selectedInvitationIds.size > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 mt-2">
                <span className="text-sm text-red-700 font-medium">{selectedInvitationIds.size} selected</span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkDeleting}
                  onClick={handleBulkRevokeInvitations}
                >
                  <X className="mr-1 h-4 w-4" />
                  Revoke selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedInvitationIds(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loadingInvitations ? (
              <p className="text-sm text-gray-500">{tt.loading}</p>
            ) : !filteredInvitations.length ? (
              <p className="text-sm text-gray-500">{invitationSearch ? 'No results.' : tt.noInvitations}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isOwner && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allInvitationsSelected}
                          onChange={toggleAllInvitations}
                          className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                        />
                      </TableHead>
                    )}
                    <TableHead>{tt.email}</TableHead>
                    <TableHead>{tt.role}</TableHead>
                    <TableHead>{tt.status}</TableHead>
                    <TableHead>{tt.expires}</TableHead>
                    {isOwner && <TableHead>{tt.actions}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.map((inv) => (
                    <TableRow key={inv.id} className={selectedInvitationIds.has(inv.id) ? 'bg-red-50/50' : ''}>
                      {isOwner && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedInvitationIds.has(inv.id)}
                            onChange={() => toggleInvitation(inv.id)}
                            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                          />
                        </TableCell>
                      )}
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {inv.store_role ? inv.store_role.name : roleLabel(inv.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(inv.status)}>
                          {statusLabel(inv.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                      {isOwner && (
                        <TableCell>
                          {inv.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRevoke(inv.id)}
                              title="Revoke invitation"
                            >
                              <X className="h-4 w-4 text-orange-500" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRevoke(inv.id)}
                              title="Delete invitation"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

