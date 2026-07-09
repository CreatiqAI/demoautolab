import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Trash2, Shield, User, Phone, Mail, Calendar, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string | null;
  is_active: boolean;
  created_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  auth_email: string | null;
  auth_phone: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  registered_at: string;
  last_sign_in_at: string | null;
  created_by_email: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'admin' });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const { toast } = useToast();

  // Only the master admin (super_admin) may provision new admin accounts.
  const currentRole = (() => {
    try { return (JSON.parse(localStorage.getItem('admin_user') || '{}').role || '') as string; }
    catch { return ''; }
  })();
  const canManageAdmins = currentRole === 'super_admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let usersData: any[] = [];
      
      // Try the admin users function first
      const { data: functionData, error: functionError } = await (supabase
        .rpc as any)('get_admin_users');

      if (!functionError && functionData) {
        usersData = functionData;
      } else {
        
        // Fallback: try to query admin profiles directly
        const { data: viewData, error: viewError } = await supabase
          .from('admin_profiles' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!viewError && viewData) {
          usersData = viewData;
        } else {
          // Create mock data if tables don't exist
          usersData = [];
        }
      }

      // Transform data to match expected interface
      const transformedUsers = usersData.map((user: any) => ({
        id: user.id,
        user_id: user.user_id || user.id,
        username: user.username || 'admin',
        full_name: user.full_name || 'Administrator',
        email: user.email || user.auth_email || '',
        phone: user.phone || user.auth_phone || '',
        role: user.role || 'admin',
        department: user.department || null,
        is_active: user.is_active !== false,
        created_by: user.created_by || null,
        last_login_at: user.last_login_at || user.last_sign_in_at || null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        auth_email: user.auth_email || user.email || null,
        auth_phone: user.auth_phone || user.phone || null,
        email_confirmed_at: user.email_confirmed_at || null,
        phone_confirmed_at: user.phone_confirmed_at || null,
        registered_at: user.registered_at || user.created_at,
        last_sign_in_at: user.last_sign_in_at || user.last_login_at || null,
        created_by_email: user.created_by_email || null
      }));

      setUsers(transformedUsers);

    } catch (error: any) {
      setUsers([]);
      // Don't show error toast since this is expected when database isn't fully set up
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!email || !form.fullName.trim()) {
      toast({
        title: 'Missing details',
        description: 'Enter an email and a full name.',
        variant: 'destructive',
      });
      return;
    }
    setCreating(true);
    try {
      // Provision a REAL Supabase Auth user (admin role in app_metadata) with NO
      // known password; the edge function returns a one-time set-password link the
      // invitee uses to choose their own. The caller's JWT is attached automatically.
      const { data, error } = await supabase.functions.invoke('provision-admin', {
        body: {
          email,
          fullName: form.fullName.trim(),
          role: form.role,
          redirectTo: `${window.location.origin}/admin/set-password`,
        },
      });
      if (error) throw error;
      if (data && data.success === false) {
        toast({ title: 'Could not create admin', description: data.message || 'Failed to create admin.', variant: 'destructive' });
        return;
      }
      fetchUsers();
      if (data?.inviteLink) {
        setInviteLink(data.inviteLink);
        setInvitedEmail(email);
        toast({ title: 'Admin invited', description: `Copy the set-password link and send it to ${email}.` });
      } else {
        toast({ title: 'Admin created', description: data?.message || 'Invite link unavailable — the invitee can use "Forgot password" on the sign-in page.' });
        closeAddDialog();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create admin.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const closeAddDialog = () => {
    setIsAddOpen(false);
    setInviteLink(null);
    setInvitedEmail(null);
    setForm({ email: '', fullName: '', password: '', role: 'admin' });
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({ title: 'Copied', description: 'Set-password link copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select and copy the link manually.', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_delete_account', { p_id: selectedUser.id });
      if (error) throw error;
      if (data && data.success === false) {
        toast({ title: 'Could not delete', description: data.message || 'Failed to delete admin.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Admin removed', description: `${selectedUser.full_name} (@${selectedUser.username}) has been deleted.` });
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete admin.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.id?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-amber-500 hover:bg-amber-500 text-white"><Shield className="h-3 w-3 mr-1" />Master</Badge>;
      case 'admin':
        return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'manager':
        return <Badge variant="default"><Shield className="h-3 w-3 mr-1" />Manager</Badge>;
      case 'staff':
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Staff</Badge>;
      default:
        return <Badge variant="outline"><User className="h-3 w-3 mr-1" />{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">Manage staff members and administrators</p>
        </div>
        {canManageAdmins && (
          <Button onClick={() => setIsAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        )}
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          {canManageAdmins
            ? 'As the master admin you can invite new admins here. Each invitee gets a one-time link to set their own password.'
            : 'Only the master admin can create or remove admin accounts.'}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>
            System administrators and staff members
          </CardDescription>
          
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {searchTerm ? 'No staff members found matching your search.' : 'No staff members found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id || user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "destructive"}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(user.last_sign_in_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManageAdmins && user.role !== 'super_admin' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Dialog — master admin only */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) closeAddDialog(); else setIsAddOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{inviteLink ? 'Admin invited' : 'Add Admin'}</DialogTitle>
            <DialogDescription>
              {inviteLink
                ? 'Send this one-time link to the new admin. They open it to set their own password — then sign in on the admin tab.'
                : 'Enter the new admin’s email, name and role. They’ll get a link to set their own password (no password needed from you).'}
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Set-password link{invitedEmail ? ` for ${invitedEmail}` : ''}</Label>
                <div className="flex gap-2">
                  <Input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} className="text-xs" />
                  <Button type="button" onClick={copyInviteLink}>Copy</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link expires and can only be used once. If it expires, the invitee can use “Forgot password” on the sign-in page.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={closeAddDialog}>Done</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" required value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-name">Full name</Label>
                <Input id="admin-name" required value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeAddDialog}>Cancel</Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Inviting…</> : 'Send Invite'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Staff Instructions Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete admin account</DialogTitle>
            <DialogDescription>
              This permanently removes the account and revokes their access. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {selectedUser.full_name || 'Unknown'}</div>
                  <div><strong>Email:</strong> {selectedUser.username}</div>
                  <div><strong>Role:</strong> {selectedUser.role}</div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
                  {isDeleting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</>) : 'Delete Admin'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}