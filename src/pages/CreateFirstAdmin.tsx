import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function CreateFirstAdmin() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '+',
    password: '',
    fullName: '',
    confirmPassword: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error", 
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone: formData.phone,
        password: formData.password,
        options: {
          data: {
            phone_e164: formData.phone,
            full_name: formData.fullName
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Step 2: Wait a moment for any triggers to run
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 3: Check if profile was created by trigger
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (checkError && checkError.code === 'PGRST116') {
          // Profile doesn't exist, create it manually
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              full_name: formData.fullName,
              phone_e164: formData.phone,
              role: 'admin',
              is_phone_verified: true // Skip verification for admin
            });

          if (profileError) throw profileError;
        } else if (!checkError) {
          // Profile exists, update it to admin role
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: 'admin',
              full_name: formData.fullName,
              is_phone_verified: true
            })
            .eq('id', authData.user.id);

          if (updateError) throw updateError;
        } else {
          throw checkError;
        }

        toast({
          title: "Success!",
          description: "Admin account created successfully. You can now sign in and access the admin panel.",
        });

        // Redirect to auth page
        navigate('/auth');
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create First Admin</CardTitle>
          <CardDescription>
            Set up your first admin account to access the admin panel.
            <br />
            <br />
            <strong>⚠️ Remove this page after creating your admin account for security.</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                placeholder="Admin User"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+60123456789"
                required
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +60 for Malaysia, +1 for US)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter secure password"
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Confirm password"
                minLength={6}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              I already have an account - Sign In
            </Button>
            
            <div className="text-xs text-muted-foreground">
              After creating your admin account, remove this page by:
              <br />
              1. Deleting /create-first-admin from App.tsx
              <br />
              2. Deleting CreateFirstAdmin.tsx file
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}