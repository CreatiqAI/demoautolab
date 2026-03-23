import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Shield, Phone, User, Calendar, Loader2, ArrowRight, Store } from 'lucide-react';
import OTPInput from '@/components/OTPInput';
import { registerDeviceSession } from '@/hooks/useSessionEnforcement';

type AuthStep = 'contact' | 'otp' | 'details' | 'merchant-otp';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [authStep, setAuthStep] = useState<AuthStep>('contact');
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'customer');

  const {
    sendPhoneOTP,
    verifyPhoneOTP,
    signInWithToken,
    signInWithPassword,
    signUpWithPhoneOTP,
    user
  } = useAuth();

  const navigate = useNavigate();


  // Customer login form (phone + password)
  const [customerForm, setCustomerForm] = useState({
    phone: '',
    password: ''
  });

  // Merchant OTP form
  const [merchantOtpForm, setMerchantOtpForm] = useState({
    phone: '',
    otp: ''
  });

  // Test mode toggle — when ON, uses fixed OTP 123456 instead of real SMS
  const [testOtpMode, setTestOtpMode] = useState(true);

  // Registration details (for new users)
  const [registrationForm, setRegistrationForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    carMakeId: '',
    carMakeName: '',
    carModelId: '',
    carModelName: ''
  });

  // Admin form
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: ''
  });

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `+60${digits}`;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 11;
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ==========================================
  // CUSTOMER LOGIN - Phone + Password (simple)
  // ==========================================
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(customerForm.phone)) {
      toast.error('Please enter a valid Malaysian phone number');
      return;
    }

    if (!customerForm.password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(customerForm.phone);

    // Look up the user's email by phone number from customer_profiles
    try {
      const { data: profile, error: profileError } = await supabase
        .from('customer_profiles')
        .select('email, user_id, customer_type')
        .eq('phone', normalizedPhone)
        .single();

      if (profileError || !profile?.email) {
        toast.error('No account found with this phone number. Please register first.');
        setLoading(false);
        return;
      }

      // Block merchant accounts from logging in through customer portal
      if (profile.customer_type === 'merchant') {
        toast.error('This is a merchant account. Please use the Merchant tab and verify with OTP.');
        setLoading(false);
        return;
      }

      // Sign in with email + password
      const { error } = await signInWithPassword(profile.email, customerForm.password);

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          toast.error('Incorrect password. Please try again.');
        } else {
          toast.error(error.message || 'Failed to sign in. Please try again.');
        }
        setLoading(false);
        return;
      }

      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    }

    setLoading(false);
  };

  // ==========================================
  // MERCHANT LOGIN - Phone OTP (secure)
  // ==========================================
  const handleMerchantSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(merchantOtpForm.phone)) {
      toast.error('Please enter a valid Malaysian phone number');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(merchantOtpForm.phone);
    const { error } = await sendPhoneOTP(normalizedPhone, { testMode: testOtpMode });

    if (error) {
      toast.error(error.message || 'Failed to send OTP. Please try again.');
      setLoading(false);
      return;
    }

    toast.success(testOtpMode ? 'Test mode: Use OTP 123456' : 'OTP sent to your phone!');

    setOtpSent(true);
    setAuthStep('merchant-otp');
    setResendTimer(60);
    setLoading(false);
  };

  // Handle Merchant OTP Verification
  const handleMerchantVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (merchantOtpForm.otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(merchantOtpForm.phone);
    const { error, isNewUser: newUser, tokenHash } = await verifyPhoneOTP(normalizedPhone, merchantOtpForm.otp);

    if (error) {
      toast.error(error.message || 'Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }

    if (newUser) {
      // New merchant - redirect to merchant registration
      toast.info('No account found. Please register as a merchant first.');
      navigate('/merchant-register');
    } else if (tokenHash) {
      // Existing merchant — auto sign-in using magic link token (no password needed)
      const { error: signInError, userId } = await signInWithToken(tokenHash);
      if (signInError) {
        toast.error('Failed to sign in. Please try again.');
      } else {
        // Register device session for single-device enforcement
        if (userId) {
          await registerDeviceSession(userId);
        }
        toast.success('Welcome back, Merchant!');
        navigate('/');
      }
    } else {
      toast.error('Account found but auto sign-in failed. Please contact support.');
    }

    setLoading(false);
  };

  // Resend OTP for merchant
  const handleMerchantResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    const normalizedPhone = normalizePhone(merchantOtpForm.phone);
    const { error } = await sendPhoneOTP(normalizedPhone, { testMode: testOtpMode });

    if (error) {
      toast.error('Failed to resend OTP');
    } else {
      toast.success(testOtpMode ? 'Test mode: Use OTP 123456' : 'OTP resent to your phone!');
      setResendTimer(60);
    }
    setLoading(false);
  };

  // Admin login
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

      if (error || !data?.success) {
        toast.error(data?.message || 'Invalid credentials');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_user', JSON.stringify(data.admin));
      toast.success(`Welcome back, ${data.admin.full_name}!`);
      navigate('/admin');
    } catch {
      toast.error('An error occurred. Please try again.');
    }

    setLoading(false);
  };

  // Reset to contact entry step
  const handleBackToContact = () => {
    setAuthStep('contact');
    setOtpSent(false);
    setMerchantOtpForm(prev => ({ ...prev, otp: '' }));
    setIsNewUser(false);
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-gray-900"></div>
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
            <img src="/autolab_logo.png" alt="Auto Lab" className="h-12 w-auto object-contain" />
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => authStep !== 'contact' ? handleBackToContact() : navigate('/')}
            className="mb-6 -ml-3 text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {authStep !== 'contact' ? 'Back' : 'Back to home'}
          </Button>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {authStep === 'merchant-otp' ? 'Enter Verification Code' :
               'Welcome'}
            </h2>
            <p className="text-gray-500">
              {authStep === 'merchant-otp' ? `We sent a code to +60${merchantOtpForm.phone}` :
               'Sign in to your account'}
            </p>
          </div>

          {/* Merchant OTP Verification Form */}
          {authStep === 'merchant-otp' && (
            <form onSubmit={handleMerchantVerifyOTP} className="space-y-6">
              <div className="space-y-4">
                <OTPInput
                  value={merchantOtpForm.otp}
                  onChange={(value) => setMerchantOtpForm({ ...merchantOtpForm, otp: value })}
                  disabled={loading}
                />

                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-500">
                      Resend code in <span className="font-medium">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleMerchantResendOTP}
                      disabled={loading}
                      className="text-sm text-lime-600 hover:text-lime-700 font-medium"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors"
                disabled={loading || merchantOtpForm.otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
            </form>
          )}

          {/* Contact Entry & Tabs (Initial Step) */}
          {authStep === 'contact' && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg h-11">
                <TabsTrigger value="customer" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-xs text-gray-600">
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="merchant" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-xs text-gray-600">
                  <Store className="h-3.5 w-3.5 mr-1" />
                  Merchant
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-xs text-gray-600">
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {/* ===================== */}
              {/* Customer Login Tab    */}
              {/* Phone + Password      */}
              {/* ===================== */}
              <TabsContent value="customer">
                <div className="space-y-5">
                  <form onSubmit={handleCustomerLogin} className="space-y-4">
                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label htmlFor="customer-phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
                      <div className="flex">
                        <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                          +60
                        </div>
                        <Input
                          id="customer-phone"
                          type="tel"
                          placeholder="12345678"
                          value={customerForm.phone}
                          onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, '') })}
                          required
                          className="rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <Label htmlFor="customer-password" className="text-gray-700 text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="customer-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={customerForm.password}
                          onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
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

                    <Button
                      type="submit"
                      className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Register Link */}
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/register')}
                        className="text-lime-600 font-medium hover:text-lime-700"
                      >
                        Register here
                      </button>
                    </p>
                  </div>

                  {/* Merchant Registration Link */}
                  <div className="mt-4 p-4 bg-lime-50 border border-lime-100 rounded-xl">
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
                </div>
              </TabsContent>

              {/* ===================== */}
              {/* Merchant Login Tab    */}
              {/* Phone OTP (secure)    */}
              {/* ===================== */}
              <TabsContent value="merchant">
                <div className="space-y-5">
                  {/* Info banner */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800 font-medium">
                      Merchant accounts require OTP verification for security.
                    </p>
                  </div>

                  {/* Test mode toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <span className="text-xs font-medium text-gray-700">Test Mode</span>
                      <p className="text-[10px] text-gray-500">{testOtpMode ? 'OTP fixed to 123456 (no SMS sent)' : 'Real SMS will be sent'}</p>
                    </div>
                    <Switch checked={testOtpMode} onCheckedChange={setTestOtpMode} />
                  </div>

                  <form onSubmit={handleMerchantSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="merchant-phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
                      <div className="flex">
                        <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                          +60
                        </div>
                        <Input
                          id="merchant-phone"
                          type="tel"
                          placeholder="12345678"
                          value={merchantOtpForm.phone}
                          onChange={(e) => setMerchantOtpForm({ ...merchantOtpForm, phone: e.target.value.replace(/\D/g, '') })}
                          required
                          className="rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                        />
                      </div>
                      <p className="text-xs text-gray-500">We'll send you a 6-digit verification code</p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          Request OTP
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Merchant Registration Link */}
                  <div className="mt-4 p-4 bg-lime-50 border border-lime-100 rounded-xl">
                    <p className="text-sm text-gray-700">
                      Not yet a merchant?{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/merchant-register')}
                        className="text-lime-600 font-medium hover:text-lime-700"
                      >
                        Register as a Merchant
                      </button>
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ===================== */}
              {/* Admin Login Tab       */}
              {/* ===================== */}
              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username" className="text-gray-700 text-sm font-medium">Username</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="Enter username"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
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
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
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

                  <Button
                    type="submit"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold h-11 rounded-lg transition-colors"
                    disabled={loading}
                  >
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
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
