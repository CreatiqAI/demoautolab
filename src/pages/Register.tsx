import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Phone, User, Calendar, Car, Plus, X } from 'lucide-react';
import CarSelector from '@/components/CarSelector';

interface CarEntry {
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
}

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
  });

  const [cars, setCars] = useState<CarEntry[]>([
    { makeId: '', makeName: '', modelId: '', modelName: '' },
  ]);

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

  const handleAddCar = () => {
    if (cars.length >= 5) {
      toast.error('You can add up to 5 cars maximum');
      return;
    }
    setCars([...cars, { makeId: '', makeName: '', modelId: '', modelName: '' }]);
  };

  const handleRemoveCar = (index: number) => {
    if (cars.length <= 1) {
      toast.error('You must have at least 1 car');
      return;
    }
    setCars(cars.filter((_, i) => i !== index));
  };

  const handleCarMakeChange = (index: number, makeId: string, makeName: string) => {
    const updated = [...cars];
    updated[index] = { ...updated[index], makeId, makeName, modelId: '', modelName: '' };
    setCars(updated);
  };

  const handleCarModelChange = (index: number, modelId: string, modelName: string) => {
    const updated = [...cars];
    updated[index] = { ...updated[index], modelId, modelName };
    setCars(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!validatePhone(form.phone)) {
      toast.error('Please enter a valid Malaysian phone number');
      return;
    }

    if (!validateEmail(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!form.dateOfBirth) {
      toast.error('Please enter your date of birth');
      return;
    }

    // Validate cars - at least 1 must be fully selected
    const validCars = cars.filter(c => c.makeId && c.modelId);
    if (validCars.length === 0) {
      toast.error('Please select at least 1 car (brand and model)');
      return;
    }

    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(form.phone);

      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        if (authError.message?.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(authError.message || 'Failed to create account');
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error('Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const primaryCar = validCars[0];

      // 2. Create or update customer_profiles entry
      // Try insert first, fall back to update if profile already exists (e.g. from DB trigger)
      const profileData = {
        user_id: userId,
        username: `user_${userId.slice(0, 8)}`,
        full_name: form.fullName.trim(),
        phone: normalizedPhone,
        email: form.email,
        date_of_birth: form.dateOfBirth,
        customer_type: 'normal' as const,
        car_make_id: primaryCar.makeId || null,
        car_model_id: primaryCar.modelId || null,
        car_make_name: primaryCar.makeName || null,
        car_model_name: primaryCar.modelName || null,
      };

      const { error: profileError } = await supabase
        .from('customer_profiles')
        .insert(profileData);

      if (profileError) {
        // Profile may already exist from auth trigger — update instead
        const { error: updateError } = await supabase
          .from('customer_profiles')
          .update({
            full_name: profileData.full_name,
            phone: profileData.phone,
            email: profileData.email,
            date_of_birth: profileData.date_of_birth,
            car_make_id: profileData.car_make_id,
            car_model_id: profileData.car_model_id,
            car_make_name: profileData.car_make_name,
            car_model_name: profileData.car_model_name,
          })
          .eq('user_id', userId);

        if (updateError) {
          toast.error('Account created but profile setup failed. Please contact support.');
          setLoading(false);
          return;
        }
      }

      // 3. Save all cars to customer_cars table
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (customerProfile) {
        const carsToInsert = validCars.map((car, index) => ({
          customer_id: customerProfile.id,
          car_make_id: car.makeId || null,
          car_model_id: car.modelId || null,
          car_make_name: car.makeName,
          car_model_name: car.modelName,
          is_primary: index === 0,
          sort_order: index,
        }));

        await supabase.from('customer_cars' as any).insert(carsToInsert);
      }

      toast.success('Account created successfully! Welcome to AutoLab.');
      navigate('/');
    } catch (err) {
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-gray-900"></div>
        <div className="absolute inset-0 flex flex-col justify-center px-12">
          <div className="max-w-md">
            <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white italic leading-tight mb-6">
              CREATE YOUR<br /><span className="text-lime-400">ACCOUNT</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">Join Malaysia's premier automotive accessories platform.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto p-6 lg:p-12">
          <div className="w-full max-w-[480px] mx-auto">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <img src="/autolab_logo.png" alt="Auto Lab" className="h-12 w-auto object-contain" />
            </div>

            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="mb-6 -ml-3 text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Button>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-500">Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="flex">
                  <div className="flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
                    +60
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="12345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                    required
                    className="rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 text-sm font-medium">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-lime-600 hover:text-lime-700 font-medium"
                >
                  {showPassword ? 'Hide passwords' : 'Show passwords'}
                </button>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-gray-700 text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  required
                  className="border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
                />
                <p className="text-xs text-gray-400">Used for birthday promotions and exclusive offers.</p>
              </div>

              {/* Car Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    Your Cars <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-gray-400">{cars.length}/5 cars</span>
                </div>
                <p className="text-xs text-gray-500">Select at least 1 car, up to 5 maximum. This helps us recommend the right products for your vehicle.</p>

                <div className="space-y-4">
                  {cars.map((car, index) => (
                    <div key={index} className="relative border border-gray-200 rounded-lg p-4">
                      {/* Car number & remove button */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-500">Car {index + 1}</span>
                        {cars.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCar(index)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove car"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <CarSelector
                        selectedMakeId={car.makeId}
                        selectedModelId={car.modelId}
                        onMakeChange={(makeId, makeName) => handleCarMakeChange(index, makeId, makeName)}
                        onModelChange={(modelId, modelName) => handleCarModelChange(index, modelId, modelName)}
                        showLabels={true}
                        required={index === 0}
                      />
                    </div>
                  ))}
                </div>

                {cars.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCar}
                    className="w-full border-dashed border-gray-300 text-gray-500 hover:text-lime-600 hover:border-lime-400 h-10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Car
                  </Button>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold h-11 rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center pb-6">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="text-lime-600 font-medium hover:text-lime-700"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
