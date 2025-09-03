import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Trash2, Shield, User, Phone, Mail, Calendar } from 'lucide-react';
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
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // First try to use the admin users function
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_admin_users');

      if (!functionError && functionData) {
        setUsers(functionData);
        return;
      }

      // Fallback: try to query admin profiles directly
      const { data: viewData, error: viewError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!viewError && viewData) {
        // Enhance with auth data
        const enhancedUsers = await Promise.all(
          viewData.map(async (admin) => {
            const { data: authData } = await supabase
              .from('user_profiles')
              .select('email, phone, created_at, last_sign_in_at')
              .eq('id', admin.user_id)
              .single();

            return {
              ...admin,
              auth_email: authData?.email || null,
              auth_phone: authData?.phone || null,
              registered_at: authData?.created_at || admin.created_at,
              last_sign_in_at: authData?.last_sign_in_at || null,
              email_confirmed_at: authData?.email_confirmed_at || null,
              phone_confirmed_at: authData?.phone_confirmed_at || null,
            };
          })
        );
        
        setUsers(enhancedUsers);
        return;
      }

      // If both fail, show an error
      throw viewError || functionError || new Error('Failed to fetch admin users');

    } catch (error: any) {
      console.error('Error fetching admin users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin users. Make sure you have admin privileges and the database schema is set up correctly.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);
    try {
      // Note: In production, you should create a proper admin function to delete users
      // For now, we'll show instructions to delete via SQL
      toast({
        title: "Staff Deletion",
        description: `To delete ${selectedUser.full_name} (@${selectedUser.username}), run this SQL in Supabase: DELETE FROM public.admin_profiles WHERE id = '${selectedUser.id}';`
      });

      setIsDeleteDialogOpen(false);
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
        <p className="text-muted-foreground">Manage staff members and administrators</p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          This page shows users registered through Supabase Auth. To delete users safely, use the provided SQL commands in your Supabase dashboard.
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Staff Instructions Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Account</DialogTitle>
            <DialogDescription>
              To safely delete this staff account, run the following SQL command in your Supabase SQL Editor:
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">Staff Details:</p>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {selectedUser.full_name || 'Unknown'}</div>
                  <div><strong>Username:</strong> @{selectedUser.username}</div>
                  <div><strong>Role:</strong> {selectedUser.role}</div>
                  <div><strong>ID:</strong> <code>{selectedUser.id}</code></div>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium mb-2 text-red-800">SQL Command:</p>
                <code className="block p-2 bg-red-100 rounded text-sm text-red-800">
                  DELETE FROM public.admin_profiles WHERE id = '{selectedUser.id}';
                </code>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. The staff member will be permanently deleted from the system.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                >
                  I Understand - Show SQL
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}