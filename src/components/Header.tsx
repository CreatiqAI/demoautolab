import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingCart,
  User,
  Menu,
  LogOut,
  Store,
  XCircle,
  AlertCircle,
  X,
  ChevronDown,
  Settings,
  Package,
  RotateCcw,
  Gift
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCartDB';
import { useToast } from '@/hooks/use-toast';
import ProfileModal from './ProfileModal';
import CartDrawer from './CartDrawer';
import { supabase } from '@/lib/supabase';

const Header = () => {
  const { user, signOut } = useAuth();
  const { getTotalItems } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMerchant, setIsMerchant] = useState<boolean | null>(null);
  const [partnership, setPartnership] = useState<any>(null);
  const [showExpiryBanner, setShowExpiryBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isHoveringNavbar, setIsHoveringNavbar] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  const isHomePage = location.pathname === '/';

  // Fetch categories and brands for megamenu
  useEffect(() => {
    const fetchMegaMenuData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, slug')
          .eq('active', true)
          .order('name', { ascending: true })
          .limit(8);

        // Fetch unique brands
        const { data: productsData } = await supabase
          .from('products_new' as any)
          .select('brand')
          .eq('active', true);

        const uniqueBrands = [...new Set((productsData || []).map((item: any) => item.brand).filter(Boolean))].slice(0, 8);

        setCategories(categoriesData || []);
        setBrands(uniqueBrands.map(brand => ({ id: brand, name: brand })));
      } catch (error) {
      }
    };

    fetchMegaMenuData();
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged out successfully",
      description: "You have been signed out of your account.",
    });
    navigate('/');
  };

  // Check if user is a merchant
  useEffect(() => {
    const checkMerchantStatus = async () => {
      if (!user) {
        setIsMerchant(false);
        setPartnership(null);
        return;
      }

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
        localStorage.setItem(`merchant_status_${user.id}`, String(isMerchantUser));

        if (isMerchantUser && profile?.id) {
          try {
            const { data: partnershipData, error: partnershipError } = await supabase
              .from('premium_partnerships' as any)
              .select('subscription_end_date, subscription_status, admin_approved, subscription_plan')
              .eq('merchant_id', profile.id)
              .maybeSingle();

            if (!partnershipError) {
              setPartnership(partnershipData);
            }
          } catch {
            // premium_partnerships table may not exist yet - silently ignore
          }
        }
      } catch (error) {
        setIsMerchant(false);
      }
    };

    checkMerchantStatus();
  }, [user]);

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

  // Navbar becomes solid white on hover, scroll, or non-homepage
  const isSolidWhite = isHoveringNavbar || mobileMenuOpen || scrolled || !isHomePage;

  // Dynamic navbar classes - solid white background
  const navClasses = 'bg-white border-b border-gray-200 shadow-sm';

  // Text color: dark on both states since navbar has white background
  const textColor = 'text-gray-900';
  const linkHoverColor = 'hover:text-gray-500';
  const borderColor = 'border-gray-900/30 hover:border-gray-500';

  return (
    <>
      {/* Main Navigation - exactly like sample-design */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${navClasses} h-20 font-sans`}
        onMouseEnter={() => setIsHoveringNavbar(true)}
        onMouseLeave={() => setIsHoveringNavbar(false)}
      >
        <div className="container mx-auto px-4 md:px-8 h-20">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Using image from public folder - Made bigger */}
            <div
              onClick={handleLogoClick}
              className="flex items-center gap-2 cursor-pointer group z-50"
            >
              <img
                src="/autolab_logo.png"
                alt="Auto Lab"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>

            {/* Center Navigation - Desktop */}
            <nav className={`hidden lg:flex items-center gap-8 xl:gap-10 ${textColor} h-full transition-colors duration-300`}>
              {/* Catalog with Megamenu */}
              <div className="group/megamenu h-full flex items-center relative static">
                <Link
                  to="/catalog"
                  className={`relative h-full flex items-center text-xs font-bold tracking-widest uppercase transition-all duration-300 ${linkHoverColor} gap-1.5 liquid-underline`}
                >
                  Catalog
                  <ChevronDown className="w-3 h-3 group-hover/megamenu:rotate-180 transition-transform duration-300" />
                </Link>

                {/* Megamenu Dropdown - Full Width */}
                <div className="fixed top-20 left-0 right-0 w-full opacity-0 invisible group-hover/megamenu:opacity-100 group-hover/megamenu:visible transition-all duration-300 pointer-events-none group-hover/megamenu:pointer-events-auto">
                  <div className="bg-white border-b border-gray-200 shadow-md">
                    <div className="container mx-auto px-4 md:px-8">
                      <div className="grid grid-cols-3 gap-8 py-6">
                        {/* Categories Column */}
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                            Categories
                          </h3>
                          <ul className="space-y-2">
                            {categories.map((category) => (
                              <li key={category.id}>
                                <Link
                                  to={`/catalog?category=${category.id}`}
                                  className="block text-sm text-gray-600 hover:text-gray-900 hover:translate-x-1 transition-all duration-200 py-0.5"
                                >
                                  {category.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Brands Column */}
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                            Brands
                          </h3>
                          <ul className="space-y-2">
                            {brands.map((brand) => (
                              <li key={brand.id}>
                                <Link
                                  to={`/catalog?brand=${brand.id}`}
                                  className="block text-sm text-gray-600 hover:text-gray-900 hover:translate-x-1 transition-all duration-200 py-0.5"
                                >
                                  {brand.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Call to Action Column */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200/40 rounded-lg p-5 flex flex-col justify-center items-center text-center">
                          <h3 className="text-sm font-bold text-gray-900 mb-1.5 uppercase tracking-wider">
                            Explore All Products
                          </h3>
                          <p className="text-xs text-gray-600 mb-3">
                            Browse our complete collection of premium automotive parts
                          </p>
                          <Link
                            to="/catalog"
                            className="px-5 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all duration-300 hover:shadow-lg"
                          >
                            View Catalog
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to="/find-shops"
                className={`relative h-full flex items-center text-xs font-bold tracking-widest uppercase transition-all duration-300 ${linkHoverColor} liquid-underline`}
              >
                Find Shops
              </Link>

              <Link
                to="/about"
                className={`relative h-full flex items-center text-xs font-bold tracking-widest uppercase transition-all duration-300 ${linkHoverColor} liquid-underline`}
              >
                About Us
              </Link>

            </nav>

            {/* Right Actions */}
            <div className={`flex items-center gap-3 md:gap-4 z-50 ${textColor} transition-colors duration-300`}>
              {/* Cart */}
              {user ? (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className={`relative p-2 ${linkHoverColor} transition-colors duration-300`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-lime-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {getTotalItems()}
                    </span>
                  )}
                </button>
              ) : (
                <div className="relative p-2 opacity-50 cursor-not-allowed" title="Please sign in to access cart">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              )}

              {/* Account Actions */}
              {user ? (
                <>
                  {/* User Account Dropdown */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className={`hidden sm:block relative p-2 ${linkHoverColor} transition-colors duration-300 focus:outline-none`}>
                        <User className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 p-2">
                      <div className="px-3 py-2.5 mb-1">
                        <p className="text-xs text-gray-500 font-medium truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator className="mb-1" />
                      <DropdownMenuItem asChild>
                        <Link to="/my-orders" className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">My Orders</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/my-returns" className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900">
                          <RotateCcw className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">My Returns</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/my-vouchers" className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900">
                          <Gift className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">Rewards & Vouchers</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900">
                          <Settings className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">Account Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      {isMerchant && partnership?.subscription_plan === 'panel' && (
                        <DropdownMenuItem asChild>
                          <Link to="/merchant-console" className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900">
                            <Store className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Merchant Console</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm font-medium">Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link
                  to="/auth"
                  className={`hidden sm:block px-6 py-2.5 rounded-full border ${borderColor} transition-all uppercase text-[10px] font-bold tracking-widest hover:bg-gray-900 hover:border-gray-900 hover:text-white`}
                >
                  Login
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="lg:hidden focus:outline-none p-1">
                    <Menu className="h-6 w-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-80 bg-white" aria-describedby={undefined}>
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="flex flex-col gap-6 mt-8">
                    {/* Navigation */}
                    <nav className="flex flex-col gap-1">
                      {[
                        { label: 'Catalog', path: '/catalog' },
                        { label: 'Find Shops', path: '/find-shops' },
                        { label: 'About Us', path: '/about' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-bold text-gray-900 hover:text-gray-900 transition-colors py-3 border-b border-gray-100"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>

                    {/* My Account Section */}
                    {user && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">My Account</p>
                        <nav className="flex flex-col gap-1">
                          <Link to="/my-orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-gray-700 hover:text-gray-900 transition-colors">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">My Orders</span>
                          </Link>
                          <Link to="/my-returns" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-gray-700 hover:text-gray-900 transition-colors">
                            <RotateCcw className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">My Returns</span>
                          </Link>
                          <Link to="/my-vouchers" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-gray-700 hover:text-gray-900 transition-colors">
                            <Gift className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Rewards & Vouchers</span>
                          </Link>
                          <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-gray-700 hover:text-gray-900 transition-colors">
                            <Settings className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Account Settings</span>
                          </Link>
                          {isMerchant && partnership?.subscription_plan === 'panel' && (
                            <Link to="/merchant-console" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-gray-700 hover:text-gray-900 transition-colors">
                              <Store className="h-4 w-4" />
                              <span className="text-sm font-medium">Merchant Console</span>
                            </Link>
                          )}
                        </nav>
                      </div>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex flex-col gap-3 mt-auto">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setIsCartOpen(true);
                        }}
                        className="bg-gray-900 text-white font-bold uppercase tracking-widest px-8 py-3.5 w-full rounded-full text-center text-sm"
                      >
                        Cart ({getTotalItems()})
                      </button>

                      {user ? (
                        <Button
                          className="w-full border border-gray-200 text-gray-600 font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleSignOut();
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      ) : (
                        <Link
                          to="/auth"
                          onClick={() => setMobileMenuOpen(false)}
                          className="border border-gray-900 text-gray-900 font-bold uppercase tracking-widest px-8 py-3.5 w-full rounded-full hover:bg-gray-900 hover:text-white transition-colors text-center text-sm"
                        >
                          Login
                        </Link>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* Subscription Expiry Banner */}
      {isMerchant && subscriptionStatus && showExpiryBanner && (
        <div className={`fixed top-20 left-0 right-0 z-40 transition-all duration-300 ${
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
                      <Link to="/merchant-console" className="underline ml-1 font-semibold">Renew now</Link>
                    </span>
                  ) : (
                    <span>
                      <strong>Expiring Soon:</strong> Your subscription expires in {subscriptionStatus.daysUntilExpiry} day{subscriptionStatus.daysUntilExpiry !== 1 ? 's' : ''}.
                      <Link to="/merchant-console" className="underline ml-1 font-semibold">Renew now</Link>
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

      {/* Spacer for fixed header - Only on non-homepage */}
      {!isHomePage && <div className="h-20 transition-all duration-300" />}
    </>
  );
};

export default Header;
