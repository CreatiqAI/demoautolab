import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, EyeOff, Car, ArrowLeft, Shield } from 'lucide-react';

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    phone: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [adminForm, setAdminForm] = useState({
    username: '',
    password: ''
  });

  const normalizePhone = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Always prepend +60 to the entered digits
    return `+60${digits}`;
  };

  const validatePhone = (phone: string) => {
    // Check if it's 9-10 digits (Malaysian mobile numbers without +60)
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 10;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(loginForm.phone)) {
      toast.error('Please enter a valid Malaysian phone number');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(loginForm.phone);

    const { error } = await signIn(normalizedPhone, loginForm.password);

    if (error) {
      toast.error(error.message || 'Failed to sign in');
      setLoading(false);
      return;
    }

    // Check if user is a merchant
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('customer_profiles' as any)
          .select('customer_type')
          .eq('user_id', user.id)
          .single();

        if ((profile as any)?.customer_type === 'merchant') {
          toast.success('Welcome back!');
          navigate('/');
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Error checking user type:', err);
      navigate('/');
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupForm.username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (signupForm.username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }

    if (!validatePhone(signupForm.phone)) {
      toast.error('Please enter a valid Malaysian phone number (8-10 digits)');
      return;
    }

    if (signupForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(signupForm.phone);
    
    const { error } = await signUp(normalizedPhone, signupForm.password, signupForm.username);
    
    if (error) {
      if (error.message?.includes('already registered')) {
        toast.error('This phone number is already registered. Try signing in instead.');
      } else if (error.message?.includes('username')) {
        toast.error('This username is already taken. Please choose a different one.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } else {
      toast.success('Account created successfully!');
      navigate('/');
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminForm.username || !adminForm.password) {
      toast.error('Please enter both username and password');
      return;
    }

    setLoading(true);
    
    try {
      // Try the admin login function first
      const { data, error } = await (supabase.rpc as any)('admin_login', {
        p_username: adminForm.username,
        p_password: adminForm.password
      });

      if (!error && data && (data as any).success) {
        toast.success(`Welcome back, ${(data as any).admin.username}!`);
        // Store admin session data
        localStorage.setItem('admin_user', JSON.stringify((data as any).admin));
        // Redirect to admin panel
        navigate('/admin');
      } else if (!error && data) {
        toast.error((data as any).message || 'Invalid username or password');
      } else {
        // Fallback: Show message about database setup
        console.warn('Admin login function failed:', error);
        toast.error('Admin login is not yet configured. Please set up the admin authentication system.');
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast.error('Admin login is not yet configured. Please set up the admin authentication system.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Homepage Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Car className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Autolab</h1>
          <p className="text-muted-foreground mt-2">Your trusted automotive parts partner</p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-card-border shadow-premium">
          <CardHeader>
            <CardTitle className="text-center text-card-foreground">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="login">Customer</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone">Phone Number</Label>
                    <div className="flex">
                      <div className="flex items-center bg-muted border border-r-0 rounded-l-md px-3 text-sm text-muted-foreground">
                        +60
                      </div>
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="12345678"
                        value={loginForm.phone}
                        onChange={(e) => setLoginForm({...loginForm, phone: e.target.value})}
                        required
                        className="rounded-l-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your Malaysian phone number without the +60 prefix
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Username</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="admin_username"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    <Shield className="h-4 w-4 mr-2" />
                    {loading ? 'Signing in...' : 'Admin Sign In'}
                  </Button>
                  
                  <div className="text-center">
                    <Button 
                      variant="link" 
                      onClick={() => navigate('/admin-register')}
                      className="text-sm"
                    >
                      Need admin account? Register here
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {/* Merchant Registration Link */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Are you a business?
                    <Button
                      variant="link"
                      onClick={() => navigate('/merchant-register')}
                      className="text-blue-600 dark:text-blue-400 p-0 h-auto ml-1"
                    >
                      Register as a Merchant
                    </Button>
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="Enter your username"
                      value={signupForm.username}
                      onChange={(e) => setSignupForm({...signupForm, username: e.target.value})}
                      required
                      minLength={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Choose a unique username (minimum 3 characters)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <div className="flex">
                      <div className="flex items-center bg-muted border border-r-0 rounded-l-md px-3 text-sm text-muted-foreground">
                        +60
                      </div>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="12345678"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({...signupForm, phone: e.target.value})}
                        required
                        className="rounded-l-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your Malaysian phone number (8-10 digits)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 characters required
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;