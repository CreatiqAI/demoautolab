
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Menu, 
  Car, 
  Phone,
  MapPin,
  LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCartDB';
import ProfileModal from './ProfileModal';

const Header = () => {
  const { user, signOut } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">+60 3-1234 5678</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Kuala Lumpur, Malaysia</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span>Free shipping on orders over RM 200</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Updated name and made clickable */}
          <div onClick={handleLogoClick} className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2 bg-gradient-hero rounded-lg shadow-glow group-hover:shadow-premium transition-smooth">
              <Car className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Autolab</h1>
              <p className="text-sm text-muted-foreground">Car Parts & More</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/catalog" className="text-foreground hover:text-primary transition-fast font-medium">
              Catalog
            </Link>
            {user && (
              <Link to="/my-orders" className="text-foreground hover:text-primary transition-fast font-medium">
                My Orders
              </Link>
            )}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search car parts, brands, models..." 
                className="pl-10 pr-4 w-full"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            {user ? (
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link to="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
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
                <ShoppingCart className="h-5 w-5" />
              </Button>
            )}

            {/* Account */}
            {user ? (
              <div className="flex items-center gap-2">
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
              <Button asChild variant="hero">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-6 mt-6">
                  {/* Mobile Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search parts..." 
                      className="pl-10"
                    />
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col gap-4">
                    <Link to="/catalog" className="text-foreground hover:text-primary transition-fast font-medium py-2">
                      Catalog
                    </Link>
                    {user && (
                      <Link to="/my-orders" className="text-foreground hover:text-primary transition-fast font-medium py-2">
                        My Orders
                      </Link>
                    )}
                  </nav>

                  <div className="pt-4 border-t border-border">
                    {user ? (
                      <div className="space-y-2">
                        <Button 
                          className="w-full" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsProfileModalOpen(true)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                        <Button className="w-full" variant="outline" size="sm" onClick={handleSignOut}>
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
  );
};

export default Header;
