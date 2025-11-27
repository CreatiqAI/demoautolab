import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  ShoppingCart,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

const Profile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      if (user) {
        const { data, error } = await supabase.rpc('get_my_profile');

        if (error) throw error;

        if (data && Object.keys(data).length > 0) {
          setProfile(data as ProfileData);
          return;
        }
      }

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
              email: adminData.phone || `${adminData.username}@autolab-admin.local`,
              phone: adminData.phone,
              role: adminData.role,
              created_at: new Date().toISOString(),
            };
            setProfile(adminProfile);
            return;
          } catch (parseError) {
            console.error('Error parsing stored admin user:', parseError);
            localStorage.removeItem('admin_user');
          }
        }

        navigate('/auth');
        return;
      }

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
        address: typeof profile.address === 'object' ? JSON.stringify(profile.address, null, 2) : (profile.address || ''),
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

        if (error) throw error;

        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      } else if (profile.type === 'admin') {
        const { data, error } = await supabase
          .from('admin_profiles')
          .update({
            username: editForm.username,
            full_name: editForm.full_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
          .select();

        if (error) throw error;

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

  const getCustomerTypeBadge = (customerType?: string) => {
    if (!customerType) return null;

    switch (customerType) {
      case 'merchant':
        return <Badge className="bg-lime-100 text-lime-800 border-lime-200"><Store className="h-3 w-3 mr-1" />B2B Merchant</Badge>;
      case 'normal':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><ShoppingCart className="h-3 w-3 mr-1" />B2C Customer</Badge>;
      default:
        return <Badge variant="outline">{customerType}</Badge>;
    }
  };

  const inputClass = "w-full bg-white/50 border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-lime-600 focus:bg-white transition-all rounded-lg shadow-sm focus:shadow-md placeholder-gray-400";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <User className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
            <p className="text-gray-500 text-sm">Loading profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {profile ? (
          <div className="max-w-3xl mx-auto">
            {/* Profile Header Card - Compact */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl p-5 md:p-6 shadow-lg mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-lime-600 rounded-xl flex items-center justify-center text-white font-heading font-bold text-xl md:text-2xl italic">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h1 className="text-lg md:text-xl font-heading font-bold text-gray-900 uppercase italic">{profile.full_name}</h1>
                    <p className="text-xs text-gray-500">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {profile.type === 'customer' && getCustomerTypeBadge(profile.customer_type)}
                      {profile.type === 'admin' && (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="px-5 py-2.5 bg-gray-900 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-lime-600 transition-all rounded-lg flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Unified Profile Details Card */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl p-5 md:p-6 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className={labelClass}>Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.full_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{profile.full_name || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className={labelClass}>Email</label>
                  {isEditing && profile.type === 'customer' ? (
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate">{profile.email || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className={labelClass}>Phone</label>
                  {isEditing && profile.type === 'customer' ? (
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{profile.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Member Since */}
                <div>
                  <label className={labelClass}>Member Since</label>
                  <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{formatDate(profile.created_at)}</span>
                  </div>
                </div>

                {/* Account Type - Customer only */}
                {profile.type === 'customer' && profile.customer_type && (
                  <div>
                    <label className={labelClass}>Account Type</label>
                    <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                      {profile.customer_type === 'merchant' ? (
                        <Store className="w-4 h-4 text-lime-600" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700">
                        {profile.customer_type === 'merchant' ? 'B2B Merchant' : 'B2C Customer'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Username - Admin only */}
                {profile.type === 'admin' && (
                  <div>
                    <label className={labelClass}>Username</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.username || ''}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className={inputClass}
                      />
                    ) : (
                      <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                        <span className="text-sm text-gray-700">@{profile.username || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Role - Admin only */}
                {profile.type === 'admin' && profile.role && (
                  <div>
                    <label className={labelClass}>Role</label>
                    <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 capitalize">{profile.role}</span>
                    </div>
                  </div>
                )}

                {/* Address - Full width, Customer only */}
                {profile.type === 'customer' && (
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Address</label>
                    {isEditing ? (
                      <Textarea
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className={inputClass}
                        rows={2}
                        placeholder="Enter your address"
                      />
                    ) : (
                      <div className="flex items-start gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
                          {typeof profile.address === 'object' ? (
                            <>
                              {profile.address?.address && <span>{profile.address.address}</span>}
                              {profile.address?.city && profile.address?.state && (
                                <span>, {profile.address.city}, {profile.address.state} {profile.address.postcode}</span>
                              )}
                            </>
                          ) : (
                            profile.address || 'Not provided'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-5 py-2.5 border border-gray-200 text-gray-700 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-5 py-2.5 bg-lime-600 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-lime-700 transition-all rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">No profile information available</p>
            <button
              onClick={() => navigate('/auth')}
              className="mt-4 px-6 py-2.5 bg-lime-600 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-lime-700 transition-all rounded-lg"
            >
              Sign In
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
