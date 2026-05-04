import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentVendor } from '@/lib/vendorAuth';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  LogOut,
  Menu,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { name: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Products', href: '/vendor/products', icon: Package },
  { name: 'Orders', href: '/vendor/orders', icon: ShoppingBag },
  { name: 'Payouts', href: '/vendor/payouts', icon: Wallet },
  { name: 'Settings', href: '/vendor/settings', icon: Settings },
];

export default function VendorLayout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { vendor } = useCurrentVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6 border-b">
        <Link to="/" className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-lime-600" />
          <div>
            <div className="text-sm font-bold tracking-tight">Vendor Console</div>
            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
              {vendor?.business_name ?? 'Loading…'}
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-lime-50 text-lime-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              )
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <div className="flex flex-col flex-grow bg-white border-r overflow-y-auto">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
