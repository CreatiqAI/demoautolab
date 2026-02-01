import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Shield, Phone, User, Calendar, Loader2, ArrowRight, Car } from 'lucide-react';
import OTPInput from '@/components/OTPInput';
import CarSelector from '@/components/CarSelector';

type AuthStep = 'contact' | 'otp' | 'details' | 'google-complete';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [authStep, setAuthStep] = useState<AuthStep>('contact');
  const [isNewUser, setIsNewUser] = useState(false);

  const {
    sendPhoneOTP,
    verifyPhoneOTP,
    signUpWithPhoneOTP,
    signInWithGoogle,
    completeGoogleRegistration,
    user
  } = useAuth();
  const navigate = useNavigate();

  // Check if user needs to complete profile (came from Google OAuth)
  useEffect(() => {
    const step = searchParams.get('step');
    if (step === 'complete-profile' && user) {
      setAuthStep('google-complete');
      // Pre-fill name from Google if available
      const googleName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      setRegistrationForm(prev => ({ ...prev, fullName: googleName }));
    }
  }, [searchParams, user]);

  // Phone OTP form
  const [otpForm, setOtpForm] = useState({
    phone: '',
    otp: ''
  });

  // Registration details (for new users after OTP verification)
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

  // Handle Phone OTP Send (Simulated/Dummy)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(otpForm.phone)) {
      toast.error('Please enter a valid Malaysian phone number');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(otpForm.phone);
    const { error, code } = await sendPhoneOTP(normalizedPhone);

    if (error) {
      toast.error(error.message || 'Failed to send OTP. Please try again.');
      setLoading(false);
      return;
    }

    // Show the dummy OTP code in development (for testing)
    if (code) {
      toast.success(`OTP sent! For testing, use code: ${code}`, { duration: 10000 });
    } else {
      toast.success('OTP sent to your phone!');
    }

    setOtpSent(true);
    setAuthStep('otp');
    setResendTimer(60);
    setLoading(false);
  };

  // Handle OTP Verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpForm.otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(otpForm.phone);
    const { error, isNewUser: newUser } = await verifyPhoneOTP(normalizedPhone, otpForm.otp);

    if (error) {
      toast.error(error.message || 'Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }

    if (newUser) {
      // New user - need to collect additional details
      setIsNewUser(true);
      setAuthStep('details');
      setRegistrationForm(prev => ({ ...prev, phone: otpForm.phone }));
      toast.info('Please complete your registration');
    } else {
      // Existing user - redirect
      toast.success('Welcome back!');
      navigate('/');
    }

    setLoading(false);
  };

  // Handle Registration Completion (for new users after OTP)
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registrationForm.fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!registrationForm.email || !validateEmail(registrationForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!registrationForm.carMakeId || !registrationForm.carModelId) {
      toast.error('Please select your current car');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(otpForm.phone);

    const { error } = await signUpWithPhoneOTP(normalizedPhone, otpForm.otp, {
      fullName: registrationForm.fullName,
      email: registrationForm.email,
      phone: normalizedPhone,
      dateOfBirth: registrationForm.dateOfBirth || undefined,
      carMakeId: registrationForm.carMakeId || undefined,
      carMakeName: registrationForm.carMakeName || undefined,
      carModelId: registrationForm.carModelId || undefined,
      carModelName: registrationForm.carModelName || undefined
    });

    if (error) {
      toast.error(error.message || 'Failed to complete registration');
      setLoading(false);
      return;
    }

    toast.success('Account created successfully!');
    navigate('/');
    setLoading(false);
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    const normalizedPhone = normalizePhone(otpForm.phone);
    const { error, code } = await sendPhoneOTP(normalizedPhone);

    if (error) {
      toast.error('Failed to resend OTP');
    } else {
      if (code) {
        toast.success(`OTP resent! For testing, use code: ${code}`, { duration: 10000 });
      } else {
        toast.success('OTP resent to your phone!');
      }
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

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      toast.error(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
    // If successful, user will be redirected to Google, then to /auth/callback
  };

  // Handle Google Registration Completion
  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registrationForm.fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!registrationForm.phone || !validatePhone(registrationForm.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!registrationForm.carMakeId || !registrationForm.carModelId) {
      toast.error('Please select your current car');
      return;
    }

    setLoading(true);

    const { error } = await completeGoogleRegistration({
      fullName: registrationForm.fullName,
      phone: registrationForm.phone,
      dateOfBirth: registrationForm.dateOfBirth || undefined,
      carMakeId: registrationForm.carMakeId || undefined,
      carMakeName: registrationForm.carMakeName || undefined,
      carModelId: registrationForm.carModelId || undefined,
      carModelName: registrationForm.carModelName || undefined
    });

    if (error) {
      toast.error(error.message || 'Failed to complete registration');
      setLoading(false);
      return;
    }

    toast.success('Account setup complete!');
    navigate('/');
    setLoading(false);
  };

  // Reset to contact entry step
  const handleBackToContact = () => {
    setAuthStep('contact');
    setOtpSent(false);
    setOtpForm({ ...otpForm, otp: '' });
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

          {/* Back Button - Don't show for google-complete as user must complete profile */}
          {authStep !== 'google-complete' && (
            <Button
              variant="ghost"
              onClick={() => authStep !== 'contact' ? handleBackToContact() : navigate('/')}
              className="mb-6 -ml-3 text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {authStep !== 'contact' ? 'Back' : 'Back to home'}
            </Button>
          )}

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {authStep === 'details' ? 'Complete Your Profile' :
               authStep === 'google-complete' ? 'Complete Your Profile' :
               authStep === 'otp' ? 'Enter Verification Code' :
               'Welcome'}
            </h2>
            <p className="text-gray-500">
              {authStep === 'details' ? 'Tell us a bit about yourself' :
               authStep === 'google-complete' ? 'Just a few more details to get started' :
               authStep === 'otp' ? `We sent a code to +60${otpForm.phone}` :
               'Sign in or create an account'}
            </p>
          </div>

          {/* OTP Registration Details Form */}
          {authStep === 'details' && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={registrationForm.fullName}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, fullName: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={registrationForm.email}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, email: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
                <p className="text-xs text-gray-500">For order updates and notifications</p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={registrationForm.dateOfBirth}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, dateOfBirth: e.target.value })}
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
                <p className="text-xs text-gray-500">For birthday promotions</p>
              </div>

              {/* Current Car */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  Your Current Car <span className="text-red-500">*</span>
                </Label>
                <CarSelector
                  selectedMakeId={registrationForm.carMakeId}
                  selectedModelId={registrationForm.carModelId}
                  onMakeChange={(makeId, makeName) => setRegistrationForm({
                    ...registrationForm,
                    carMakeId: makeId,
                    carMakeName: makeName,
                    carModelId: '',
                    carModelName: ''
                  })}
                  onModelChange={(modelId, modelName) => setRegistrationForm({
                    ...registrationForm,
                    carModelId: modelId,
                    carModelName: modelName
                  })}
                  showLabels={false}
                  required={true}
                />
                <p className="text-xs text-gray-500">For personalized product recommendations</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors mt-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Complete Registration
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* OTP Verification Form */}
          {authStep === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-4">
                <OTPInput
                  value={otpForm.otp}
                  onChange={(value) => setOtpForm({ ...otpForm, otp: value })}
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
                disabled={loading || otpForm.otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </Button>
            </form>
          )}

          {/* Google Registration Completion Form */}
          {authStep === 'google-complete' && (
            <form onSubmit={handleCompleteGoogleRegistration} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="googleFullName" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="googleFullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={registrationForm.fullName}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, fullName: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="googlePhone" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="flex">
                  <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                    +60
                  </div>
                  <Input
                    id="googlePhone"
                    type="tel"
                    placeholder="12345678"
                    value={registrationForm.phone}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value.replace(/\D/g, '') })}
                    required
                    className="rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                  />
                </div>
                <p className="text-xs text-gray-500">For order updates and delivery notifications</p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="googleDob" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date of Birth
                </Label>
                <Input
                  id="googleDob"
                  type="date"
                  value={registrationForm.dateOfBirth}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, dateOfBirth: e.target.value })}
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
                <p className="text-xs text-gray-500">For birthday promotions</p>
              </div>

              {/* Current Car */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  Your Current Car <span className="text-red-500">*</span>
                </Label>
                <CarSelector
                  selectedMakeId={registrationForm.carMakeId}
                  selectedModelId={registrationForm.carModelId}
                  onMakeChange={(makeId, makeName) => setRegistrationForm({
                    ...registrationForm,
                    carMakeId: makeId,
                    carMakeName: makeName,
                    carModelId: '',
                    carModelName: ''
                  })}
                  onModelChange={(modelId, modelName) => setRegistrationForm({
                    ...registrationForm,
                    carModelId: modelId,
                    carModelName: modelName
                  })}
                  showLabels={false}
                  required={true}
                />
                <p className="text-xs text-gray-500">For personalized product recommendations</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors mt-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing Setup...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Contact Entry & Tabs (Initial Step) */}
          {authStep === 'contact' && (
            <Tabs defaultValue="customer" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg h-11">
                <TabsTrigger value="customer" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-1" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {/* Customer Login Tab */}
              <TabsContent value="customer">
                <div className="space-y-5">
                  {/* Google Sign In Button - Primary */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-2 border-gray-200 hover:bg-gray-50 hover:text-gray-900 font-medium text-base text-gray-700"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or use phone number</span>
                    </div>
                  </div>

                  {/* Phone OTP Form */}
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
                      <div className="flex">
                        <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                          +60
                        </div>
                        <Input
                          id="otp-phone"
                          type="tel"
                          placeholder="12345678"
                          value={otpForm.phone}
                          onChange={(e) => setOtpForm({ ...otpForm, phone: e.target.value.replace(/\D/g, '') })}
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
                          Get OTP
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

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

              {/* Admin Login Tab */}
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
