import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';

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
    const digits = phone.replace(/\D/g, '');
    return `+60${digits}`;
  };

  const validatePhone = (phone: string) => {
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

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        toast.success('Welcome back!');
        navigate('/');
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
      const { data, error } = await (supabase.rpc as any)('admin_login', {
        p_username: adminForm.username,
        p_password: adminForm.password
      });

      if (error) {
        console.error('Admin login RPC error:', error);
        toast.error('Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      if (!data || !(data as any).success) {
        toast.error((data as any)?.message || 'Invalid username or password');
        setLoading(false);
        return;
      }

      const adminData = (data as any).admin;
      localStorage.setItem('admin_user', JSON.stringify(adminData));

      toast.success(`Welcome back, ${adminData.full_name}!`);
      navigate('/admin');
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left Side - Background Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000"
          alt="Sports Car"
          className="w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-gray-900"></div>
        {/* Content on image */}
        <div className="absolute inset-0 flex flex-col justify-center px-12">
          <div className="max-w-md">
            <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white italic leading-tight mb-6">
              UPGRADE<br />
              <span className="text-lime-400">YOUR RIDE</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Join Malaysia's premier automotive accessories wholesaler. Quality parts, fast delivery, exceptional service since 2007.
            </p>
            <div className="flex items-center gap-6 mt-8">
              <div className="text-center">
                <div className="font-heading text-3xl font-bold text-lime-400">17+</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Years</div>
              </div>
              <div className="w-px h-12 bg-gray-600"></div>
              <div className="text-center">
                <div className="font-heading text-3xl font-bold text-lime-400">500+</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Partners</div>
              </div>
              <div className="w-px h-12 bg-gray-600"></div>
              <div className="text-center">
                <div className="font-heading text-3xl font-bold text-lime-400">100+</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Products</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src="/autolab_logo.png"
              alt="Auto Lab"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 -ml-3 text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Button>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to your account to continue</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg h-11">
              <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm text-gray-600">Customer</TabsTrigger>
              <TabsTrigger value="admin" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm text-gray-600">Admin</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm text-gray-600">Sign Up</TabsTrigger>
            </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
                    <div className="flex">
                      <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                        +60
                      </div>
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="12345678"
                        value={loginForm.phone}
                        onChange={(e) => setLoginForm({...loginForm, phone: e.target.value})}
                        required
                        className="rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-gray-700 text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        required
                        className="pr-10 border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username" className="text-gray-700 text-sm font-medium">Username</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="Enter username"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                      required
                      className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password" className="text-gray-700 text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                        required
                        className="pr-10 border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold h-11 rounded-lg transition-colors" disabled={loading}>
                    <Shield className="h-4 w-4 mr-2" />
                    {loading ? 'Signing in...' : 'Admin Sign In'}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Need an admin account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/admin-register')}
                      className="text-lime-600 hover:text-lime-700 font-medium"
                    >
                      Register here
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {/* Merchant Registration Link */}
                <div className="mb-6 p-4 bg-lime-50 border border-lime-100 rounded-xl">
                  <p className="text-sm text-gray-700">
                    Are you a business?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/merchant-register')}
                      className="text-lime-600 font-medium hover:text-lime-700"
                    >
                      Register as a Merchant
                    </button>
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-gray-700 text-sm font-medium">Username</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="Choose a username"
                      value={signupForm.username}
                      onChange={(e) => setSignupForm({...signupForm, username: e.target.value})}
                      required
                      minLength={3}
                      className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
                    <div className="flex">
                      <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                        +60
                      </div>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="12345678"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({...signupForm, phone: e.target.value})}
                        required
                        className="rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-gray-700 text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                          required
                          minLength={8}
                          className="pr-10 border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-gray-700 text-sm font-medium">Confirm</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                        required
                        minLength={8}
                        className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors mt-2" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
