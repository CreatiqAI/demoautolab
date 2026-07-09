import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Shield, Phone, Loader2, ArrowRight, Store, Briefcase } from 'lucide-react';
import OTPInput from '@/components/OTPInput';
import { registerDeviceSession } from '@/hooks/useSessionEnforcement';
import { getVendorByUserId } from '@/lib/vendorAuth';

type AuthStep = 'contact' | 'password' | 'otp' | 'partner' | 'register-choice';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [authStep, setAuthStep] = useState<AuthStep>('contact');
  const [isNewUser, setIsNewUser] = useState(false);
  // The account resolved from the entered phone number (drives password vs OTP).
  const [resolved, setResolved] = useState<{ email: string; account_type: string } | null>(null);

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

  // Partner (vendor) login — admin-issued username + password.
  const [partnerForm, setPartnerForm] = useState({
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

  // ==========================================
  // STEP 1 — Enter phone, detect account type, branch to the right method.
  //   B2C customer  -> password
  //   B2B merchant  -> OTP
  //   unknown       -> offer to register
  // ==========================================
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(customerForm.phone)) {
      toast.error('Please enter a valid Malaysian phone number');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(customerForm.phone);

    try {
      // customer_profiles is no longer anon-readable, so resolve via SECURITY DEFINER RPC.
      const { data: acct, error: lookupErr } = await (supabase.rpc as any)('lookup_account_by_phone', {
        p_phone: normalizedPhone,
      });

      if (lookupErr) {
        toast.error('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      if (!acct?.exists || !acct?.email) {
        // Unknown number — let them pick how to register.
        setResolved(null);
        setAuthStep('register-choice');
        setLoading(false);
        return;
      }

      if (acct.account_type === 'merchant') {
        // Merchant (B2B) → send OTP and go to the verify step.
        const { error } = await sendPhoneOTP(normalizedPhone, { testMode: testOtpMode });
        if (error) {
          toast.error(error.message || 'Failed to send OTP. Please try again.');
          setLoading(false);
          return;
        }
        toast.success(testOtpMode ? 'Test mode: Use OTP 123456' : 'OTP sent to your phone!');
        setResolved({ email: acct.email, account_type: 'merchant' });
        setMerchantOtpForm({ phone: customerForm.phone, otp: '' });
        setOtpSent(true);
        setResendTimer(60);
        setAuthStep('otp');
      } else {
        // Normal customer (B2C) → ask for their password.
        setResolved({ email: acct.email, account_type: acct.account_type || 'normal' });
        setCustomerForm((f) => ({ ...f, password: '' }));
        setAuthStep('password');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    }

    setLoading(false);
  };

  // STEP 2a — Customer signs in with the password for the resolved account.
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolved?.email) {
      setAuthStep('contact');
      return;
    }
    if (!customerForm.password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    const { error } = await signInWithPassword(resolved.email, customerForm.password);
    if (error) {
      toast.error(
        error.message?.includes('Invalid login credentials')
          ? 'Incorrect password. Please try again.'
          : error.message || 'Failed to sign in. Please try again.',
      );
      setLoading(false);
      return;
    }
    toast.success('Welcome back!');
    // Return the user to wherever they came from (only allow internal paths).
    const dest = searchParams.get('redirect');
    navigate(dest && dest.startsWith('/') ? dest : '/');
    setLoading(false);
  };

  // STEP 2b — Merchant verifies the OTP and is signed in via magic-link token.
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (merchantOtpForm.otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(customerForm.phone);
    const { error, isNewUser: newUser, tokenHash } = await verifyPhoneOTP(normalizedPhone, merchantOtpForm.otp);

    if (error) {
      toast.error(error.message || 'Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }

    if (newUser) {
      toast.info('No account found. Please register as a merchant first.');
      navigate('/merchant-register');
    } else if (tokenHash) {
      const { error: signInError, userId } = await signInWithToken(tokenHash);
      if (signInError) {
        toast.error('Failed to sign in. Please try again.');
      } else {
        if (userId) {
          // Wait for the client to propagate the JWT before the RLS-guarded insert.
          await new Promise((resolve) => setTimeout(resolve, 500));
          const { error: sessionError } = await registerDeviceSession(userId);
          if (sessionError) {
            console.error('[Session] Failed to register device session:', sessionError);
          }
        }
        toast.success('Welcome back, Merchant!');
        navigate('/');
      }
    } else {
      toast.error('Account found but auto sign-in failed. Please contact support.');
    }

    setLoading(false);
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    const normalizedPhone = normalizePhone(customerForm.phone);
    const { error } = await sendPhoneOTP(normalizedPhone, { testMode: testOtpMode });

    if (error) {
      toast.error('Failed to resend OTP');
    } else {
      toast.success(testOtpMode ? 'Test mode: Use OTP 123456' : 'OTP resent to your phone!');
      setResendTimer(60);
    }
    setLoading(false);
  };


  // Partner login — admin-issued username + password.
  // Username maps to a synthetic email: <username>@partner.autolab.local
  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = partnerForm.username.trim().toLowerCase();
    if (!username) {
      toast.error('Enter your partner username.');
      return;
    }
    if (!partnerForm.password) {
      toast.error('Enter your partner password.');
      return;
    }
    setLoading(true);
    const email = `${username}@partner.autolab.local`;
    const { error } = await signInWithPassword(email, partnerForm.password);
    if (error) {
      toast.error(
        error.message?.includes('Invalid login credentials')
          ? 'Incorrect username or password.'
          : error.message || 'Sign-in failed. Please try again.'
      );
      setLoading(false);
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error('Sign-in succeeded but session is missing. Please retry.');
      setLoading(false);
      return;
    }
    const vendor = await getVendorByUserId(authUser.id);
    if (!vendor) {
      toast.error('No partner profile linked to this account. Contact AutoLab admin.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (vendor.status !== 'APPROVED') {
      navigate('/vendor/dashboard'); // ProtectedVendorRoute renders the status page
    } else {
      toast.success(`Welcome back, ${vendor.business_name}!`);
      navigate('/vendor/dashboard');
    }
    setLoading(false);
  };

  const handleBackToContact = () => {
    setAuthStep('contact');
    setOtpSent(false);
    setMerchantOtpForm((prev) => ({ ...prev, otp: '' }));
    setCustomerForm((f) => ({ ...f, password: '' }));
    setResolved(null);
    setIsNewUser(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left Side - Brand panel */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#0a0a0a]">
        <img
          src="/hero/hero-static-night.jpg"
          alt="12V — premium car accessories"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/40"></div>
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 w-[440px] h-[280px] rounded-full bg-lime-500/15 blur-[120px]"></div>

        {/* Wordmark */}
        <div className="absolute top-8 left-12 flex items-center gap-2.5 text-white z-10">
          <span className="font-heading font-black text-2xl tracking-tight">12V</span>
          <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] border-l border-white/20 pl-2.5">By Auto Lab</span>
        </div>

        <div className="absolute inset-0 flex flex-col justify-end px-12 pb-14">
          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-lime-400 font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400"></span> Premium Car Accessories
            </span>
            <h1 className="font-heading font-black uppercase text-4xl xl:text-5xl text-white leading-[0.95] mb-6">
              Upgrade<br />
              <span className="text-lime-400 italic">your ride.</span>
            </h1>
            <p className="text-gray-300 text-base leading-relaxed max-w-sm">
              Malaysia's premier automotive accessories network — quality parts, fast dispatch, trusted since 2007.
            </p>
            <div className="flex items-center gap-6 mt-8">
              <div>
                <div className="font-heading text-3xl font-black text-lime-400">17+</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Years</div>
              </div>
              <div className="w-px h-10 bg-white/15"></div>
              <div>
                <div className="font-heading text-3xl font-black text-lime-400">10+</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Partners</div>
              </div>
              <div className="w-px h-10 bg-white/15"></div>
              <div>
                <div className="font-heading text-3xl font-black text-lime-400">10K+</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Products</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/12v-logo.png" alt="12V" className="h-10 w-auto object-contain" />
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
            <h2 className="font-heading font-bold uppercase tracking-tight text-3xl text-gray-900 mb-2">
              {authStep === 'otp'
                ? 'Verify Code'
                : authStep === 'password'
                ? 'Enter Password'
                : authStep === 'partner'
                ? 'Partner Login'
                : authStep === 'register-choice'
                ? 'Create an account'
                : 'Welcome'}
            </h2>
            <p className="text-gray-500 text-sm">
              {authStep === 'otp'
                ? `We sent a code to +60${customerForm.phone}`
                : authStep === 'password'
                ? `Signing in as +60${customerForm.phone}`
                : authStep === 'partner'
                ? 'Vendor & partner accounts issued by AutoLab'
                : authStep === 'register-choice'
                ? `No account found for +60${customerForm.phone}`
                : 'Sign in to your 12V account'}
            </p>
          </div>

          {/* STEP 2b — Merchant OTP Verification */}
          {authStep === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
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
                      onClick={handleResendOTP}
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

          {/* STEP 1 — Enter phone number (single flow for customer + merchant) */}
          {authStep === 'contact' && (
            <div className="space-y-5">
              <form onSubmit={handleContinue} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
                  <div className="flex">
                    <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                      +60
                    </div>
                    <Input
                      id="login-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="12345678"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, '') })}
                      required
                      autoFocus
                      className="rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Enter your number — we'll continue with your password or a one-time code.</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</>
                  ) : (
                    <>Continue<ArrowRight className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </form>

              {/* Register links */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => navigate('/register')} className="text-lime-600 font-medium hover:text-lime-700">
                    Register here
                  </button>
                </p>
              </div>

              <div className="p-4 bg-lime-50 border border-lime-100 rounded-xl">
                <p className="text-sm text-gray-700">
                  Are you a business?{' '}
                  <button type="button" onClick={() => navigate('/merchant-register')} className="text-lime-600 font-medium hover:text-lime-700">
                    Register as a Merchant
                  </button>
                </p>
              </div>

              {/* Partner / vendor entry */}
              <div className="text-center">
                <button type="button" onClick={() => setAuthStep('partner')} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> Partner / Vendor login
                </button>
              </div>

              {/* Dev-only test-mode toggle for the merchant OTP path */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <span className="text-xs font-medium text-gray-700">Test Mode (merchant OTP)</span>
                  <p className="text-[10px] text-gray-500">{testOtpMode ? 'OTP fixed to 123456 (no SMS sent)' : 'Real SMS will be sent'}</p>
                </div>
                <Switch checked={testOtpMode} onCheckedChange={setTestOtpMode} />
              </div>
            </div>
          )}

          {/* STEP 2a — Customer password */}
          {authStep === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-700 text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={customerForm.password}
                    onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                    required
                    autoFocus
                    className="pr-10 border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors" disabled={loading}>
                {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</>) : (<>Sign In<ArrowRight className="h-4 w-4 ml-2" /></>)}
              </Button>

              <div className="text-center">
                <button type="button" onClick={handleBackToContact} className="text-sm text-gray-500 hover:text-gray-800">
                  Use a different number
                </button>
              </div>
            </form>
          )}

          {/* Unknown number — choose how to register */}
          {authStep === 'register-choice' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">We couldn't find an account for that number. How would you like to join?</p>
              <Button onClick={() => navigate('/register')} className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg">
                <Phone className="h-4 w-4 mr-2" /> Register as a Customer
              </Button>
              <Button onClick={() => navigate('/merchant-register')} variant="outline" className="w-full h-11 rounded-lg border-gray-200">
                <Store className="h-4 w-4 mr-2" /> Register as a Merchant
              </Button>
              <div className="text-center">
                <button type="button" onClick={handleBackToContact} className="text-sm text-gray-500 hover:text-gray-800">Try a different number</button>
              </div>
            </div>
          )}

          {/* Partner / vendor login (admin-issued username + password) */}
          {authStep === 'partner' && (
            <div className="space-y-5">
              <div className="p-3 bg-lime-50 border border-lime-200 rounded-lg">
                <p className="text-xs text-lime-900 font-medium">
                  Partner accounts are issued by AutoLab admin. Use the username &amp; password your admin shared with you.
                </p>
              </div>
              <form onSubmit={handlePartnerLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="partner-username" className="text-gray-700 text-sm font-medium">Username</Label>
                  <Input id="partner-username" type="text" autoComplete="username" placeholder="e.g. soundstream" value={partnerForm.username} onChange={(e) => setPartnerForm({ ...partnerForm, username: e.target.value })} required className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-password" className="text-gray-700 text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input id="partner-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} required className="pr-10 border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11" />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors" disabled={loading}>
                  {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</>) : (<>Sign In<ArrowRight className="h-4 w-4 ml-2" /></>)}
                </Button>
              </form>
              <div className="text-center">
                <button type="button" onClick={handleBackToContact} className="text-xs text-gray-500 hover:text-gray-800">Back to phone login</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
