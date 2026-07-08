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
  Gift,
  Briefcase,
  ArrowRight,
  ArrowUpRight
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
  const [isApprovedVendor, setIsApprovedVendor] = useState<boolean>(false);
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
          .limit(14);

        // Fetch unique brands. Distinct is computed in Postgres via an RPC:
        // deriving it client-side truncates once products_new exceeds
        // Supabase's default 1000-row query cap.
        let uniqueBrands: string[] = [];
        const { data: brandRows, error: brandError } = await (supabase.rpc as any)('get_product_brands');
        if (brandError) {
          // Fallback with an explicit high limit if the RPC isn't available.
          const { data: productsData } = await supabase
            .from('products_new' as any)
            .select('brand')
            .eq('active', true)
            .limit(100000);
          uniqueBrands = [...new Set((productsData || []).map((item: any) => item.brand).filter(Boolean))];
        } else {
          uniqueBrands = [...new Set((brandRows || []).map((item: any) => item.brand).filter(Boolean))];
        }
        uniqueBrands = uniqueBrands.slice(0, 24);

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
        setIsApprovedVendor(false);
        return;
      }

      // Vendor (partner) check — only for partner-authenticated sessions.
      // Partners log in with @partner.autolab.local synthetic emails;
      // customers/merchants use phone-based ones. Without this guard, a
      // user who is BOTH a customer and a partner would see the Vendor
      // Console link even when signed in via the customer/merchant flow.
      try {
        const isPartnerSession = (user.email ?? '').toLowerCase().endsWith('@partner.autolab.local');
        if (!isPartnerSession) {
          setIsApprovedVendor(false);
        } else {
          const { data: vendorRow } = await supabase
            .from('vendors' as any)
            .select('status')
            .eq('user_id', user.id)
            .maybeSingle();
          setIsApprovedVendor((vendorRow as any)?.status === 'APPROVED');
        }
      } catch {
        setIsApprovedVendor(false);
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
          .maybeSingle();

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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${navClasses} h-16 sm:h-20 font-sans`}
        onMouseEnter={() => setIsHoveringNavbar(true)}
        onMouseLeave={() => setIsHoveringNavbar(false)}
      >
        <div className="container mx-auto px-4 md:px-8 h-16 sm:h-20">
          <div className="flex items-center justify-between h-full">
            {/* Logo — 12V */}
            <div
              onClick={handleLogoClick}
              className="flex items-center gap-2.5 cursor-pointer group z-50 select-none"
            >
              <img
                src="/12v-logo.png"
                alt="12V"
                className="h-8 sm:h-9 w-auto object-contain"
              />
              <span className="hidden sm:block text-[9px] uppercase tracking-[0.28em] text-gray-400 font-medium border-l border-gray-200 pl-2.5">
                by Auto Lab
              </span>
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
                <div className="fixed top-16 sm:top-20 left-0 right-0 w-full opacity-0 invisible translate-y-1 group-hover/megamenu:translate-y-0 group-hover/megamenu:opacity-100 group-hover/megamenu:visible transition-all duration-300 pointer-events-none group-hover/megamenu:pointer-events-auto">
                  <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shadow-[0_28px_50px_-22px_rgba(0,0,0,0.28)]">
                    <div className="container mx-auto px-4 md:px-8 py-8">
                      <div className="grid grid-cols-12 gap-8">
                        {/* Categories */}
                        <div className="col-span-12 lg:col-span-3">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">Categories</h3>
                          </div>
                          <ul className="space-y-0.5">
                            {categories.map((category) => (
                              <li key={category.id}>
                                <Link
                                  to={`/catalog?category=${category.id}`}
                                  className="group/mi flex items-center justify-between rounded-lg -mx-2 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-lime-50 transition-colors duration-200"
                                >
                                  <span className="truncate">{category.name}</span>
                                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-gray-300 opacity-0 -translate-x-1 group-hover/mi:opacity-100 group-hover/mi:translate-x-0 group-hover/mi:text-lime-600 transition-all duration-200" />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Car brands — multi-column */}
                        <div className="col-span-12 lg:col-span-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
                              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">Shop by Car Brand</h3>
                            </div>
                            <Link to="/catalog" className="inline-flex items-center gap-1 text-[11px] font-semibold text-lime-700 hover:text-lime-800 transition-colors">
                              View all <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5">
                            {brands.map((brand) => (
                              <li key={brand.id}>
                                <Link
                                  to={`/catalog?brand=${brand.id}`}
                                  className="block truncate rounded-lg -mx-2 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-lime-50 transition-colors duration-200"
                                >
                                  {brand.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Featured CTA card */}
                        <Link
                          to="/catalog"
                          className="group/cta col-span-12 lg:col-span-3 relative rounded-2xl overflow-hidden min-h-[220px] flex flex-col justify-end p-6"
                        >
                          <img
                            src="/hero/hero-static-night.jpg"
                            alt="Explore the 12V catalog"
                            className="absolute inset-0 w-full h-full object-cover group-hover/cta:scale-105 transition-transform duration-500"
                          />
                          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25"></div>
                          <div className="relative">
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-lime-400 font-semibold mb-2">
                              <span className="w-1 h-1 rounded-full bg-lime-400"></span> The full catalog
                            </span>
                            <h3 className="font-heading font-bold uppercase text-xl leading-tight text-white mb-4">
                              Explore all products
                            </h3>
                            <span className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-white text-gray-900 text-[11px] font-bold uppercase tracking-wider group-hover/cta:bg-lime-400 transition-colors duration-300">
                              View Catalog <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to="/new-arrivals"
                className={`relative h-full flex items-center text-xs font-bold tracking-widest uppercase transition-all duration-300 ${linkHoverColor} liquid-underline`}
              >
                New Arrivals
              </Link>

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
                      {isApprovedVendor && (
                        <DropdownMenuItem asChild>
                          <Link to="/vendor/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900">
                            <Briefcase className="h-4 w-4 text-lime-600" />
                            <span className="text-sm font-medium">Vendor Console</span>
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
                        { label: 'New Arrivals', path: '/new-arrivals' },
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
                          {isApprovedVendor && (
                            <Link to="/vendor/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-gray-700 hover:text-gray-900 transition-colors">
                              <Briefcase className="h-4 w-4 text-lime-600" />
                              <span className="text-sm font-medium">Vendor Console</span>
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
                        className="bg-gray-900 text-white font-bold uppercase tracking-widest px-8 py-3.5 w-full rounded-full text-center text-sm whitespace-nowrap"
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
        <div className={`fixed top-16 sm:top-20 left-0 right-0 z-40 transition-all duration-300 ${
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
      {!isHomePage && <div className="h-16 sm:h-20 transition-all duration-300" />}
    </>
  );
};

export default Header;
