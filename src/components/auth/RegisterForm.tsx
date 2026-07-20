import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

interface RegisterFormProps {
  /** Slide back to the login view (in-page) instead of a route navigation. */
  onBackToLogin: () => void;
}

/**
 * The customer registration form — extracted so it can live inside the shared
 * Auth two-panel shell and slide in from the right. No outer page chrome here.
 */
export default function RegisterForm({ onBackToLogin }: RegisterFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const normalizePhone = (phone: string) => `+60${phone.replace(/\D/g, '')}`;
  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 11;
  };
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAddCar = () => {
    if (cars.length >= 5) return;
    setCars([...cars, { makeId: '', makeName: '', modelId: '', modelName: '' }]);
  };

  const handleRemoveCar = (index: number) => {
    if (cars.length <= 1) return;
    setCars(cars.filter((_, i) => i !== index));
  };

  const handleCarMakeChange = (index: number, makeId: string, makeName: string) => {
    setCars(cars.map((c, i) => (i === index ? { ...c, makeId, makeName, modelId: '', modelName: '' } : c)));
  };

  const handleCarModelChange = (index: number, modelId: string, modelName: string) => {
    setCars(cars.map((c, i) => (i === index ? { ...c, modelId, modelName } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim()) { toast.error('Please enter your full name'); return; }
    if (!validatePhone(form.phone)) { toast.error('Please enter a valid Malaysian phone number'); return; }
    if (!validateEmail(form.email)) { toast.error('Please enter a valid email address'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (!form.dateOfBirth) { toast.error('Please enter your date of birth'); return; }

    const validCars = cars.filter((c) => c.makeId && c.modelId);
    if (validCars.length === 0) { toast.error('Please select at least 1 car (brand and model)'); return; }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(form.phone);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        toast.error(
          authError.message?.includes('already registered')
            ? 'This email is already registered. Please sign in instead.'
            : authError.message || 'Failed to create account',
        );
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

      const { error: profileError } = await supabase.from('customer_profiles').insert(profileData);
      if (profileError) {
        // Profile may already exist from an auth trigger — update instead.
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

      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

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

      toast.success('Account created successfully! Welcome to 12V.');
      const dest = searchParams.get('redirect');
      navigate(dest && dest.startsWith('/') ? dest : '/');
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      {/* Mobile Logo */}
      <div className="lg:hidden flex justify-center mb-8">
        <img src="/12v-logo.png" alt="12V" className="h-10 w-auto object-contain" />
      </div>

      <Button
        variant="ghost"
        onClick={onBackToLogin}
        className="mb-6 -ml-3 text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to login
      </Button>

      <div className="mb-8">
        <h2 className="font-heading font-bold uppercase tracking-tight text-3xl text-gray-900 mb-2">Create Account</h2>
        <p className="text-gray-500 text-sm">Fill in your details to get started</p>
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
          <Label htmlFor="reg-phone" className="text-gray-700 text-sm font-medium flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <div className="flex">
            <div className="shrink-0 flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-4 text-sm text-gray-500 font-medium">
              +60
            </div>
            <Input
              id="reg-phone"
              type="tel"
              placeholder="12345678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              required
              className="min-w-0 flex-1 rounded-l-none border-gray-200 focus:border-lime-500 focus:ring-lime-500 h-11"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-gray-700 text-sm font-medium">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-email"
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
          <Label htmlFor="reg-password" className="text-gray-700 text-sm font-medium">
            Password <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-password"
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
          <Label htmlFor="reg-confirm" className="text-gray-700 text-sm font-medium">
            Confirm Password <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-confirm"
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
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account...</>
          ) : (
            <>Create Account<ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>

        {/* Login Link */}
        <div className="text-center pb-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <button type="button" onClick={onBackToLogin} className="text-lime-600 font-medium hover:text-lime-700">
              Sign in
            </button>
          </p>
        </div>
      </form>
    </>
  );
}
