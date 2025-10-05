import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Store, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MerchantRegister = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Code validation, 2: Registration form
  const [codeValidated, setCodeValidated] = useState(false);
  const [codeData, setCodeData] = useState<any>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [accessCode, setAccessCode] = useState('');

  const [merchantForm, setMerchantForm] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    businessRegistrationNo: '',
    taxId: '',
    businessType: '',
    address: ''
  });

  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `+60${digits}`;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 10;
  };

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await (supabase.rpc as any)('validate_merchant_code', {
        p_code: accessCode.toUpperCase()
      });

      if (error) {
        toast.error('Failed to validate code');
        console.error(error);
        setLoading(false);
        return;
      }

      if (data && (data as any).valid) {
        toast.success('Access code validated successfully!');
        setCodeValidated(true);
        setCodeData(data);
        setStep(2);
      } else {
        toast.error((data as any)?.message || 'Invalid or expired access code');
      }
    } catch (error: any) {
      console.error('Code validation error:', error);
      toast.error('Failed to validate code');
    }

    setLoading(false);
  };

  const handleMerchantSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!merchantForm.username.trim() || merchantForm.username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }

    if (!validatePhone(merchantForm.phone)) {
      toast.error('Please enter a valid Malaysian phone number (8-10 digits)');
      return;
    }

    if (merchantForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (merchantForm.password !== merchantForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!merchantForm.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    if (!merchantForm.businessType) {
      toast.error('Please select a business type');
      return;
    }

    setLoading(true);
    const normalizedPhone = normalizePhone(merchantForm.phone);

    try {
      // First, create the user account
      const { error: signUpError } = await signUp(
        normalizedPhone,
        merchantForm.password,
        merchantForm.username
      );

      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          toast.error('This phone number is already registered');
        } else if (signUpError.message?.includes('username')) {
          toast.error('This username is already taken');
        } else {
          toast.error(signUpError.message || 'Failed to create account');
        }
        setLoading(false);
        return;
      }

      // Get the created user ID and customer profile
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Failed to get user information');
        setLoading(false);
        return;
      }

      // Wait a bit for the customer profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get customer profile ID
      const { data: customerProfile, error: profileFetchError } = await supabase
        .from('customer_profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileFetchError) {
        console.error('Profile fetch error:', profileFetchError);
        toast.error(`Failed to get customer profile: ${profileFetchError.message}`);
        setLoading(false);
        return;
      }

      if (!customerProfile) {
        console.error('Customer profile not found for user:', user.id);
        toast.error('Customer profile was not created. Please contact support.');
        setLoading(false);
        return;
      }

      console.log('Customer profile found:', (customerProfile as any).id);
      console.log('Code ID:', codeData.code_id);

      // Create merchant registration application
      const { data: registrationData, error: registrationError } = await supabase
        .from('merchant_registrations' as any)
        .insert({
          customer_id: (customerProfile as any).id,
          code_id: codeData.code_id,
          company_name: merchantForm.companyName,
          business_registration_no: merchantForm.businessRegistrationNo || null,
          tax_id: merchantForm.taxId || null,
          business_type: merchantForm.businessType,
          address: merchantForm.address || null,
          status: 'PENDING'
        } as any)
        .select()
        .single();

      if (registrationError) {
        console.error('Registration error:', registrationError);
        toast.error(`Failed to submit merchant application: ${registrationError.message}`);
        setLoading(false);
        return;
      }

      console.log('Merchant registration created:', registrationData);

      toast.success('Merchant application submitted successfully! Please wait for admin approval.');

      // Redirect to homepage or pending approval page
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('Merchant signup error:', error);
      toast.error('An error occurred during registration');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => step === 1 ? navigate('/auth') : setStep(1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? 'Back to Login' : 'Back to Code Entry'}
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Store className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Merchant Registration</h1>
          <p className="text-muted-foreground mt-2">
            Join our merchant partner program
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-card-border shadow-premium">
          <CardHeader>
            <CardTitle className="text-center text-card-foreground">
              {step === 1 ? 'Enter Access Code' : 'Complete Your Registration'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 1
                ? 'You need a valid merchant access code to register'
                : 'Fill in your business details to complete registration'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Access Code Validation */}
            {step === 1 && (
              <form onSubmit={handleValidateCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-code">Merchant Access Code</Label>
                  <Input
                    id="access-code"
                    type="text"
                    placeholder="Enter your access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    required
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact your sales representative to obtain an access code
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Validating...' : 'Validate Code'}
                </Button>
              </form>
            )}

            {/* Step 2: Registration Form */}
            {step === 2 && codeValidated && (
              <>
                {/* Success Badge */}
                <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Access code validated
                    </p>
                    {codeData?.description && (
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {codeData.description}
                      </p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleMerchantSignup} className="space-y-4">
                  {/* Account Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                      Account Information
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Choose a username"
                        value={merchantForm.username}
                        onChange={(e) => setMerchantForm({...merchantForm, username: e.target.value})}
                        required
                        minLength={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="flex">
                        <div className="flex items-center bg-muted border border-r-0 rounded-l-md px-3 text-sm text-muted-foreground">
                          +60
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="12345678"
                          value={merchantForm.phone}
                          onChange={(e) => setMerchantForm({...merchantForm, phone: e.target.value})}
                          required
                          className="rounded-l-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={merchantForm.password}
                          onChange={(e) => setMerchantForm({...merchantForm, password: e.target.value})}
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

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password *</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={merchantForm.confirmPassword}
                        onChange={(e) => setMerchantForm({...merchantForm, confirmPassword: e.target.value})}
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                      Business Information
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name *</Label>
                      <Input
                        id="company-name"
                        type="text"
                        placeholder="Your company name"
                        value={merchantForm.companyName}
                        onChange={(e) => setMerchantForm({...merchantForm, companyName: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business-type">Business Type *</Label>
                      <Select
                        value={merchantForm.businessType}
                        onValueChange={(value) => setMerchantForm({...merchantForm, businessType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                          <SelectItem value="Retailer">Retailer</SelectItem>
                          <SelectItem value="Workshop">Workshop</SelectItem>
                          <SelectItem value="Dealer">Dealer</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="business-reg">Business Registration No.</Label>
                        <Input
                          id="business-reg"
                          type="text"
                          placeholder="Optional"
                          value={merchantForm.businessRegistrationNo}
                          onChange={(e) => setMerchantForm({...merchantForm, businessRegistrationNo: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tax-id">Tax ID / GST No.</Label>
                        <Input
                          id="tax-id"
                          type="text"
                          placeholder="Optional"
                          value={merchantForm.taxId}
                          onChange={(e) => setMerchantForm({...merchantForm, taxId: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Business Address</Label>
                      <Textarea
                        id="address"
                        placeholder="Enter your business address (optional)"
                        value={merchantForm.address}
                        onChange={(e) => setMerchantForm({...merchantForm, address: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Submitting Application...' : 'Submit Merchant Application'}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Your application will be reviewed by our team. You'll be notified once approved.
                  </p>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sample Codes Info (for demo) */}
        {step === 1 && (
          <Card className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Demo Access Codes (for testing):
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">MERCHANT2024</code> - General merchant registration</li>
                <li>• <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">DEALER100</code> - Dealer program</li>
                <li>• <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">WORKSHOP50</code> - Workshop partner</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MerchantRegister;
