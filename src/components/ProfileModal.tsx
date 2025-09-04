import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Building2,
  MapPin,
  Edit,
  Save,
  X,
  Store,
  ShoppingCart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  type: 'admin' | 'customer';
  id: string;
  username?: string;
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
  date_of_birth?: string;
  gender?: string;
  address?: any;
  customer_type?: 'normal' | 'merchant';
  created_at: string;
  last_login_at?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // If user is authenticated via Supabase (customer), prioritize that
      if (user) {
        const { data, error } = await supabase
          .rpc('get_my_profile');

        if (error) throw error;

        if (data && Object.keys(data).length > 0) {
          setProfile(data as ProfileData);
          return;
        }
      }
      
      // Only check admin localStorage if no Supabase user is authenticated
      if (!user) {
        const storedAdminUser = localStorage.getItem('admin_user');
        if (storedAdminUser) {
          try {
            const adminData = JSON.parse(storedAdminUser);
            const adminProfile: ProfileData = {
              type: 'admin',
              id: adminData.id,
              username: adminData.username,
              full_name: adminData.full_name,
              email: adminData.phone || `${adminData.username}@autolab-admin.local`, // Use phone or generate email for display
              phone: adminData.phone,
              role: adminData.role,
              created_at: new Date().toISOString(), // Use current time as fallback
            };
            setProfile(adminProfile);
            return;
          } catch (parseError) {
            console.error('Error parsing stored admin user:', parseError);
            localStorage.removeItem('admin_user'); // Clean up invalid data
          }
        }
      }

      // If we get here, no profile was found
      toast({
        title: "Profile Not Found",
        description: "Unable to load your profile information.",
        variant: "destructive"
      });

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const startEditing = () => {
    if (profile) {
      setEditForm({
        username: profile.username || '',
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      if (profile.type === 'customer') {
        console.log('Updating customer profile:', {
          user_id: user?.id,
          updates: {
            full_name: editForm.full_name,
            email: editForm.email,
            phone: editForm.phone,
            address: editForm.address,
          }
        });

        // Update customer profile
        const { data, error } = await supabase
          .from('customer_profiles')
          .update({
            full_name: editForm.full_name,
            email: editForm.email,
            phone: editForm.phone,
            address: editForm.address,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id)
          .select();

        console.log('Update result:', { data, error });

        if (error) throw error;

        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      } else if (profile.type === 'admin') {
        console.log('Updating admin profile:', {
          profile_id: profile.id,
          updates: {
            username: editForm.username,
            full_name: editForm.full_name,
          }
        });

        // Update admin profile
        const { data, error } = await supabase
          .from('admin_profiles')
          .update({
            username: editForm.username,
            full_name: editForm.full_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
          .select();

        console.log('Admin update result:', { data, error });

        if (error) throw error;

        // Update localStorage for admin
        const storedAdminUser = localStorage.getItem('admin_user');
        if (storedAdminUser) {
          const adminData = JSON.parse(storedAdminUser);
          adminData.username = editForm.username;
          adminData.full_name = editForm.full_name;
          localStorage.setItem('admin_user', JSON.stringify(adminData));
        }

        toast({
          title: "Profile Updated",
          description: "Your admin profile has been successfully updated.",
        });
      }

      // Refresh profile data
      await fetchProfile();
      setIsEditing(false);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    
    switch (role) {
      case 'admin':
        return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'manager':
        return <Badge variant="default"><Shield className="h-3 w-3 mr-1" />Manager</Badge>;
      case 'staff':
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Staff</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getCustomerTypeBadge = (customerType?: string) => {
    if (!customerType) return null;
    
    switch (customerType) {
      case 'merchant':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200"><Store className="h-3 w-3 mr-1" />B2B Merchant</Badge>;
      case 'normal':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200"><ShoppingCart className="h-3 w-3 mr-1" />B2C Customer</Badge>;
      default:
        return <Badge variant="outline">{customerType}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </DialogTitle>
          <DialogDescription>
            View your account information and profile details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      {profile.type === 'admin' ? (
                        <Shield className="h-6 w-6 text-blue-600" />
                      ) : (
                        <User className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      {!isEditing ? (
                        <>
                          <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                          <CardDescription>
                            {profile.type === 'admin' && profile.username && `@${profile.username}`}
                            {profile.type === 'customer' && 'Customer'}
                          </CardDescription>
                        </>
                      ) : (
                        <div>
                          <Label htmlFor="edit-full-name">Full Name</Label>
                          <Input
                            id="edit-full-name"
                            value={editForm.full_name || ''}
                            onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                            placeholder="Enter your full name"
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.role && getRoleBadge(profile.role)}
                    {profile.type === 'customer' && profile.customer_type && getCustomerTypeBadge(profile.customer_type)}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <>
                    {profile.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">{profile.phone}</p>
                          {profile.type === 'customer' && (
                            <p className="text-xs text-muted-foreground">Primary contact method</p>
                          )}
                        </div>
                      </div>
                    )}

                    {profile.email && profile.type === 'customer' && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <p className="text-xs text-muted-foreground">Optional contact method</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    {profile.type === 'customer' && (
                      <>
                        <div>
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            placeholder="Enter your email"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-phone">Phone</Label>
                          <Input
                            id="edit-phone"
                            type="tel"
                            value={editForm.phone || ''}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                            placeholder="Enter your phone number"
                          />
                        </div>
                      </>
                    )}
                    {profile.type === 'admin' && (
                      <div>
                        <Label htmlFor="edit-username">Username</Label>
                        <Input
                          id="edit-username"
                          type="text"
                          value={editForm.username || ''}
                          onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                          placeholder="Enter your username"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin-specific Information */}
            {profile.type === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle>Work Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Role</p>
                      <p className="text-sm text-muted-foreground">{profile.role}</p>
                    </div>
                  </div>

                  {profile.department && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Department</p>
                        <p className="text-sm text-muted-foreground">{profile.department}</p>
                      </div>
                    </div>
                  )}

                  {profile.last_login_at && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Last Login</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(profile.last_login_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer-specific Information */}
            {profile.type === 'customer' && (
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isEditing ? (
                    <>
                      {/* Customer Type */}
                      <div className="flex items-center gap-3">
                        {profile.customer_type === 'merchant' ? (
                          <Store className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <p className="font-medium">Customer Type</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              {profile.customer_type === 'merchant' ? 'B2B Merchant Customer' : 'B2C Normal Customer'}
                            </p>
                            {getCustomerTypeBadge(profile.customer_type)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {profile.customer_type === 'merchant' 
                              ? 'You see wholesale/merchant pricing on products' 
                              : 'You see retail/normal pricing on products'
                            }
                          </p>
                        </div>
                      </div>

                      {profile.date_of_birth && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">Date of Birth</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(profile.date_of_birth)}
                            </p>
                          </div>
                        </div>
                      )}

                      {profile.gender && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">Gender</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {profile.gender}
                            </p>
                          </div>
                        </div>
                      )}

                      {profile.address && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">Address</p>
                            <div className="text-sm text-muted-foreground">
                              {typeof profile.address === 'object' ? (
                                <div>
                                  {profile.address.address && <p>{profile.address.address}</p>}
                                  {profile.address.city && profile.address.state && (
                                    <p>{profile.address.city}, {profile.address.state} {profile.address.postcode}</p>
                                  )}
                                </div>
                              ) : (
                                <p>{profile.address}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <Label htmlFor="edit-address">Address</Label>
                      <Textarea
                        id="edit-address"
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                        placeholder="Enter your address"
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(profile.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Account Type</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {profile.type} Account
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              {!isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={startEditing}
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                  
                  <Button onClick={onClose}>
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      className="flex items-center gap-2"
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">No profile information available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;