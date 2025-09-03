import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DirectAdminSetup() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone: '+60',
    password: '',
    fullName: 'Admin User'
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const createAuthUser = async () => {
    setLoading(true);
    try {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        phone: formData.phone,
        password: formData.password,
        options: {
          data: {
            phone_e164: formData.phone,
            full_name: formData.fullName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Auth User Created!",
          description: `User ID: ${data.user.id}. Now create profile in Step 2.`,
        });
        setStep(2);
        return data.user.id;
      }
    } catch (error: any) {
      console.error('Error creating auth user:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
    return null;
  };

  const checkProfiles = async () => {
    setLoading(true);
    try {
      // Try to query profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

      if (error) {
        toast({
          title: "RLS Issue Detected",
          description: "Cannot query profiles due to RLS policies. Use the SQL method instead.",
          variant: "destructive"
        });
        console.error('RLS Error:', error);
      } else {
        toast({
          title: "Success!",
          description: `Found ${data.length} profiles. RLS is working correctly.`,
        });
      }
    } catch (error: any) {
      console.error('Error checking profiles:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Direct Admin Setup</CardTitle>
          <CardDescription>
            Step-by-step admin creation when RLS policies cause issues
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          
          {step === 1 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Step 1:</strong> First, let's create the authentication user. 
                  This will give us a user ID to use in Step 2.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    placeholder="Admin User"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+60123456789"
                  />
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
                  />
                </div>

                <Button onClick={createAuthUser} disabled={loading} className="w-full">
                  {loading ? 'Creating Auth User...' : 'Step 1: Create Auth User'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Step 2:</strong> Now go to your Supabase SQL Editor and run this command:
                </AlertDescription>
              </Alert>

              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap">
{`-- Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create admin profile
INSERT INTO public.profiles (
    id,
    role,
    full_name, 
    phone_e164,
    is_phone_verified,
    created_at,
    updated_at
) SELECT 
    id,
    'admin'::user_role,
    '${formData.fullName}',
    '${formData.phone}',
    true,
    NOW(),
    NOW()
FROM auth.users 
WHERE phone = '${formData.phone}'
ON CONFLICT (id) DO UPDATE SET role = 'admin'::user_role;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Check if admin was created
SELECT * FROM public.profiles WHERE role = 'admin';`}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button onClick={checkProfiles} disabled={loading} variant="outline">
                  {loading ? 'Checking...' : 'Test Profile Access'}
                </Button>
                <Button onClick={() => navigate('/auth')} className="flex-1">
                  Go to Sign In
                </Button>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Alternative: Quick SQL Method</h3>
            <p className="text-sm text-muted-foreground mb-3">
              If you prefer to skip Step 1, run this in Supabase SQL Editor:
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm">
              <pre>{`-- Create admin directly (bypass auth)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
UPDATE public.profiles SET role = 'admin' WHERE phone_e164 = '${formData.phone}';
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`}</pre>
            </div>
          </div>

          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}