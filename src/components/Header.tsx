
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ShoppingCart,
  User,
  Menu,
  Car,
  Phone,
  MapPin,
  LogOut,
  Tag,
  Crown,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCartDB';
import ProfileModal from './ProfileModal';
import { supabase } from '@/lib/supabase';

const Header = () => {
  const { user, signOut } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMerchant, setIsMerchant] = useState<boolean | null>(null); // null = loading, true/false = loaded
  const [partnership, setPartnership] = useState<any>(null);
  const [showExpiryBanner, setShowExpiryBanner] = useState(true);

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Check if user is a merchant - optimized to prevent flickering
  useEffect(() => {
    const checkMerchantStatus = async () => {
      if (!user) {
        setIsMerchant(false);
        setPartnership(null);
        return;
      }

      // Check localStorage cache first to prevent flickering
      const cachedStatus = localStorage.getItem(`merchant_status_${user.id}`);
      if (cachedStatus !== null) {
        setIsMerchant(cachedStatus === 'true');
      }

      try {
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('customer_type, id')
          .eq('user_id', user.id)
          .single();

        const isMerchantUser = profile?.customer_type === 'merchant';
        setIsMerchant(isMerchantUser);

        // Cache the result
        localStorage.setItem(`merchant_status_${user.id}`, String(isMerchantUser));

        // If merchant, fetch partnership data to check subscription status
        if (isMerchantUser && profile?.id) {
          const { data: partnershipData } = await supabase
            .from('premium_partnerships' as any)
            .select('subscription_end_date, subscription_status, admin_approved')
            .eq('merchant_id', profile.id)
            .single();

          setPartnership(partnershipData);
        }
      } catch (error) {
        console.error('Error checking merchant status:', error);
        setIsMerchant(false);
      }
    };

    checkMerchantStatus();
  }, [user]);

  // Calculate subscription expiry status
  const getSubscriptionStatus = () => {
    if (!partnership || !partnership.subscription_end_date) return null;

    const endDate = new Date(partnership.subscription_end_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (partnership.subscription_status === 'ACTIVE' && partnership.admin_approved) {
      if (daysUntilExpiry < 0) {
        return { type: 'expired', daysUntilExpiry, endDate };
      } else if (daysUntilExpiry <= 7) {
        return { type: 'expiring', daysUntilExpiry, endDate };
      }
    }

    return null;
  };

  const subscriptionStatus = getSubscriptionStatus();

  return (
    <>
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-3 sm:px-4 py-2">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <div className="flex items-center gap-1 sm:gap-2">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">03-4297 7668</span>
                <span className="sm:hidden">Call</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Cheras, Kuala Lumpur</span>
                <span className="sm:hidden">MY</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span>Premium Automotive Parts & Accessories</span>
            </div>
            <div className="md:hidden text-xs">
              <span>Auto Parts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-8 lg:gap-12">
          {/* Logo - Updated name and made clickable */}
          <div onClick={handleLogoClick} className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
            <div className="p-1.5 sm:p-2 bg-gradient-hero rounded-lg transition-smooth">
              <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Autolab</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Car Parts & More</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10">
            <Link to="/catalog" className="text-foreground hover:text-primary transition-fast font-medium text-sm lg:text-base whitespace-nowrap">
              Catalog
            </Link>
            <Link to="/find-shops" className="text-foreground hover:text-primary transition-fast font-medium text-sm lg:text-base whitespace-nowrap">
              Find Shops
            </Link>
            {user && (
              <>
                <Link to="/my-orders" className="text-foreground hover:text-primary transition-fast font-medium text-sm lg:text-base whitespace-nowrap">
                  My Orders
                </Link>
                <Link to="/my-vouchers" className="text-foreground hover:text-primary transition-fast font-medium text-sm lg:text-base flex items-center gap-1.5 whitespace-nowrap">
                  <Tag className="h-4 w-4" />
                  My Vouchers
                </Link>
                {isMerchant && (
                  <Link to="/premium-partner" className="text-foreground hover:text-primary transition-fast font-medium text-sm lg:text-base flex items-center gap-1.5 whitespace-nowrap">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    Premium Partner
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart */}
            {user ? (
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link to="/cart">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  {getTotalItems() > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {getTotalItems()}
                    </Badge>
                  )}
                </Link>
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative opacity-60" 
                title="Please sign in to access cart"
                disabled
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}

            {/* Account */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsProfileModalOpen(true)}
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-80">
                <div className="flex flex-col gap-4 sm:gap-6 mt-4 sm:mt-6">
                  {/* Mobile Navigation */}
                  <nav className="flex flex-col gap-3 sm:gap-4">
                    <Link to="/catalog" className="text-foreground hover:text-primary transition-fast font-medium py-2 text-base">
                      Catalog
                    </Link>
                    <Link to="/find-shops" className="text-foreground hover:text-primary transition-fast font-medium py-2 text-base">
                      Find Shops
                    </Link>
                    {user && (
                      <>
                        <Link to="/my-orders" className="text-foreground hover:text-primary transition-fast font-medium py-2 text-base">
                          My Orders
                        </Link>
                        <Link to="/my-vouchers" className="text-foreground hover:text-primary transition-fast font-medium py-2 text-base flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          My Vouchers
                        </Link>
                        {isMerchant && (
                          <Link to="/premium-partner" className="text-foreground hover:text-primary transition-fast font-medium py-2 text-base flex items-center gap-2">
                            <Crown className="h-4 w-4 text-yellow-600" />
                            Premium Partner
                          </Link>
                        )}
                      </>
                    )}
                  </nav>

                  <div className="pt-3 sm:pt-4 border-t border-border">
                    {user ? (
                      <div className="space-y-2">
                        <Button 
                          className="w-full justify-start" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsProfileModalOpen(true)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                        <Button className="w-full justify-start" variant="outline" size="sm" onClick={handleSignOut}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full" variant="hero" asChild>
                        <Link to="/auth">Sign In / Register</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>

    {/* Subscription Expiry Banner - Shows below header for merchants */}
    {isMerchant && subscriptionStatus && showExpiryBanner && (
      <div className={`${
        subscriptionStatus.type === 'expired'
          ? 'bg-red-500'
          : 'bg-orange-500'
      } text-white`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {subscriptionStatus.type === 'expired' ? (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <div className="text-sm">
                {subscriptionStatus.type === 'expired' ? (
                  <span>
                    <strong>Subscription Expired:</strong> Your shop is no longer visible on Find Shops.
                    <Link to="/premium-partner" className="underline ml-1 font-semibold">Renew now</Link>
                  </span>
                ) : (
                  <span>
                    <strong>Expiring Soon:</strong> Your subscription expires in {subscriptionStatus.daysUntilExpiry} day{subscriptionStatus.daysUntilExpiry !== 1 ? 's' : ''}.
                    <Link to="/premium-partner" className="underline ml-1 font-semibold">Renew now</Link>
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20 flex-shrink-0"
              onClick={() => setShowExpiryBanner(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Header;
