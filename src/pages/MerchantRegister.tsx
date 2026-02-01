import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Store, ArrowLeft, CheckCircle2, Upload, X, Plus, Globe, FileText, Building, Image, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SocialMediaLink {
  platform: string;
  url: string;
}

const MerchantRegister = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1); // 1: Code validation, 2: Registration form
  const [codeValidated, setCodeValidated] = useState(false);
  const [codeData, setCodeData] = useState<any>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [salesmanCode, setSalesmanCode] = useState('');
  const [salesmanData, setSalesmanData] = useState<{ id: string; name: string } | null>(null);

  const [merchantForm, setMerchantForm] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    businessRegistrationNo: '',
    taxId: '',
    businessType: '',
    address: '',
    // Additional fields
    companyProfileUrl: '',
    socialMediaLinks: [] as SocialMediaLink[],
    ssmDocumentUrl: '',
    bankProofUrl: '',
    workshopPhotos: [] as string[]
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

    if (!salesmanCode.trim()) {
      toast.error('Please enter a salesman code');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await (supabase.rpc as any)('validate_referral_code', {
        p_code: salesmanCode.toUpperCase()
      });

      if (error) {
        toast.error('Failed to validate code');
        console.error(error);
        setLoading(false);
        return;
      }

      // validate_referral_code returns an array with the result
      if (data && data[0]?.valid) {
        toast.success(`Code validated! Referred by ${data[0].salesman_name}`);
        setCodeValidated(true);
        setSalesmanData({
          id: data[0].salesman_id,
          name: data[0].salesman_name
        });
        setCodeData(data[0]);
        setStep(2);
      } else {
        toast.error('Invalid salesman code. Please contact your sales representative.');
      }
    } catch (error: any) {
      console.error('Code validation error:', error);
      toast.error('Failed to validate code');
    }

    setLoading(false);
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('merchant-documents')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('merchant-documents')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  };

  // Handle SSM document upload
  const handleSSMUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    const url = await uploadFile(file, 'ssm');
    if (url) {
      setMerchantForm({ ...merchantForm, ssmDocumentUrl: url });
      toast.success('SSM document uploaded');
    } else {
      toast.error('Failed to upload SSM document');
    }
    setUploading(false);
  };

  // Handle bank proof upload
  const handleBankProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    const url = await uploadFile(file, 'bank-proof');
    if (url) {
      setMerchantForm({ ...merchantForm, bankProofUrl: url });
      toast.success('Bank proof uploaded');
    } else {
      toast.error('Failed to upload bank proof');
    }
    setUploading(false);
  };

  // Handle workshop photos upload
  const handleWorkshopPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (merchantForm.workshopPhotos.length + files.length > 5) {
      toast.error('Maximum 5 workshop photos allowed');
      return;
    }

    setUploading(true);
    const newPhotos: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const url = await uploadFile(file, 'workshop-photos');
      if (url) {
        newPhotos.push(url);
      }
    }

    if (newPhotos.length > 0) {
      setMerchantForm({
        ...merchantForm,
        workshopPhotos: [...merchantForm.workshopPhotos, ...newPhotos]
      });
      toast.success(`${newPhotos.length} photo(s) uploaded`);
    }
    setUploading(false);
  };

  // Remove workshop photo
  const removeWorkshopPhoto = (index: number) => {
    const newPhotos = merchantForm.workshopPhotos.filter((_, i) => i !== index);
    setMerchantForm({ ...merchantForm, workshopPhotos: newPhotos });
  };

  // Add social media link
  const addSocialMediaLink = () => {
    setMerchantForm({
      ...merchantForm,
      socialMediaLinks: [
        ...merchantForm.socialMediaLinks,
        { platform: 'facebook', url: '' }
      ]
    });
  };

  // Remove social media link
  const removeSocialMediaLink = (index: number) => {
    const newLinks = merchantForm.socialMediaLinks.filter((_, i) => i !== index);
    setMerchantForm({ ...merchantForm, socialMediaLinks: newLinks });
  };

  // Update social media link
  const updateSocialMediaLink = (index: number, field: 'platform' | 'url', value: string) => {
    const newLinks = [...merchantForm.socialMediaLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setMerchantForm({ ...merchantForm, socialMediaLinks: newLinks });
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

    if (!merchantForm.businessRegistrationNo.trim()) {
      toast.error('Business registration number is required');
      return;
    }

    if (!merchantForm.address.trim()) {
      toast.error('Business address is required');
      return;
    }

    if (!merchantForm.ssmDocumentUrl) {
      toast.error('SSM document is required');
      return;
    }

    if (!merchantForm.bankProofUrl) {
      toast.error('Bank proof is required');
      return;
    }

    if (merchantForm.workshopPhotos.length < 2) {
      toast.error('Please upload at least 2 workshop photos');
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

      if (profileFetchError || !customerProfile) {
        console.error('Profile fetch error:', profileFetchError);
        toast.error('Failed to get customer profile');
        setLoading(false);
        return;
      }

      // Create merchant registration application
      const { error: registrationError } = await supabase
        .from('merchant_registrations' as any)
        .insert({
          customer_id: (customerProfile as any).id,
          code_id: null, // No longer using merchant_codes table
          company_name: merchantForm.companyName,
          business_registration_no: merchantForm.businessRegistrationNo,
          tax_id: merchantForm.taxId || null,
          business_type: merchantForm.businessType,
          address: merchantForm.address,
          status: 'PENDING',
          // New fields
          company_profile_url: merchantForm.companyProfileUrl || null,
          social_media_links: merchantForm.socialMediaLinks.filter(l => l.url),
          ssm_document_url: merchantForm.ssmDocumentUrl,
          bank_proof_url: merchantForm.bankProofUrl,
          workshop_photos: merchantForm.workshopPhotos,
          referral_code: salesmanCode.toUpperCase() || null, // Use the salesman code used for access
          referred_by_salesman_id: salesmanData?.id || null // Use the salesman who gave them access
        } as any);

      if (registrationError) {
        console.error('Registration error:', registrationError);
        toast.error(`Failed to submit merchant application: ${registrationError.message}`);
        setLoading(false);
        return;
      }

      toast.success('Merchant application submitted successfully! Please wait for admin approval.');

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
            {step === 1 ? 'Back to Login' : 'Back to Salesman Code'}
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
              {step === 1 ? 'Enter Salesman Code' : 'Complete Your Registration'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 1
                ? 'Enter the code provided by your sales representative'
                : 'Fill in your business details to complete registration'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Salesman Code Validation */}
            {step === 1 && (
              <form onSubmit={handleValidateCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="salesman-code">Salesman Code</Label>
                  <Input
                    id="salesman-code"
                    type="text"
                    placeholder="Enter salesman code (e.g., AHMAD2K9L)"
                    value={salesmanCode}
                    onChange={(e) => setSalesmanCode(e.target.value.toUpperCase())}
                    required
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your salesman code from your AutoLab sales representative
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Validating...' : 'Verify Salesman Code'}
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
                      Salesman code verified
                    </p>
                    {salesmanData && (
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Referred by: {salesmanData.name}
                      </p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleMerchantSignup} className="space-y-6">
                  {/* Account Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase flex items-center gap-2">
                      <Building className="h-4 w-4" />
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

                    <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  {/* Business Information */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Business Information
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company-name">Business Name *</Label>
                        <Input
                          id="company-name"
                          type="text"
                          placeholder="Your business name"
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
                            <SelectValue placeholder="Select type" />
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="business-reg">Business Registration No. *</Label>
                        <Input
                          id="business-reg"
                          type="text"
                          placeholder="e.g., 123456-X"
                          value={merchantForm.businessRegistrationNo}
                          onChange={(e) => setMerchantForm({...merchantForm, businessRegistrationNo: e.target.value})}
                          required
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
                      <Label htmlFor="address">Business Address *</Label>
                      <Textarea
                        id="address"
                        placeholder="Enter your full business address"
                        value={merchantForm.address}
                        onChange={(e) => setMerchantForm({...merchantForm, address: e.target.value})}
                        rows={2}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company-profile" className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        Company Website / Profile URL
                      </Label>
                      <Input
                        id="company-profile"
                        type="url"
                        placeholder="https://www.yourcompany.com or Facebook page"
                        value={merchantForm.companyProfileUrl}
                        onChange={(e) => setMerchantForm({...merchantForm, companyProfileUrl: e.target.value})}
                      />
                    </div>

                    {/* Social Media Links */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>Social Media Links</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSocialMediaLink}
                          disabled={merchantForm.socialMediaLinks.length >= 4}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </Label>
                      {merchantForm.socialMediaLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <Select
                            value={link.platform}
                            onValueChange={(value) => updateSocialMediaLink(index, 'platform', value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="tiktok">TikTok</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="URL"
                            value={link.url}
                            onChange={(e) => updateSocialMediaLink(index, 'url', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSocialMediaLink(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Required Documents
                    </h3>

                    {/* SSM Document */}
                    <div className="space-y-2">
                      <Label>SSM Document *</Label>
                      <div className="border-2 border-dashed rounded-lg p-4">
                        {merchantForm.ssmDocumentUrl ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="text-sm">SSM document uploaded</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setMerchantForm({...merchantForm, ssmDocumentUrl: ''})}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center cursor-pointer">
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Upload SSM Document</span>
                            <span className="text-xs text-muted-foreground">(PDF or Image, max 10MB)</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handleSSMUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Bank Proof */}
                    <div className="space-y-2">
                      <Label>Business Bank Proof *</Label>
                      <div className="border-2 border-dashed rounded-lg p-4">
                        {merchantForm.bankProofUrl ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="text-sm">Bank proof uploaded</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setMerchantForm({...merchantForm, bankProofUrl: ''})}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center cursor-pointer">
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Upload Bank Statement/Proof</span>
                            <span className="text-xs text-muted-foreground">(PDF or Image, max 10MB)</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handleBankProofUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Workshop Photos */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        Workshop Photos * (min 2, max 5)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {merchantForm.workshopPhotos.map((photo, index) => (
                          <div key={index} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                            <img src={photo} alt={`Workshop ${index + 1}`} className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removeWorkshopPhoto(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {merchantForm.workshopPhotos.length < 5 && (
                          <label className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Add Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleWorkshopPhotoUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || uploading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      'Submit Merchant Application'
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Your application will be reviewed by our team. You'll be notified once approved.
                  </p>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info box */}
        {step === 1 && (
          <Card className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Don't have a salesman code?
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Contact our sales team to get your unique salesman code. Each salesman has a unique code
                (e.g., AHMAD2K9L) that you'll need to start your merchant registration.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MerchantRegister;
