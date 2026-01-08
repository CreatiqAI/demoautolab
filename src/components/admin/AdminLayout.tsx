import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  BarChart3,
  Package,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Menu,
  Home,
  Layers,
  UserCog,
  CheckCircle,
  Warehouse,
  BookOpen,
  Bell,
  Archive,
  Tag,
  Crown,
  Star,
  Award,
  Video,
  ShoppingCart,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  exact?: boolean;
}

interface NavigationGroup {
  name: string;
  icon: any;
  items: NavigationItem[];
}

type NavigationElement = NavigationItem | NavigationGroup;

function isGroup(item: NavigationElement): item is NavigationGroup {
  return 'items' in item;
}

const navigation: NavigationElement[] = [
  // Standalone items
  { name: 'Dashboard', href: '/admin', icon: BarChart3, exact: true },
  { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },

  // Orders group
  {
    name: 'Orders',
    icon: ShoppingBag,
    items: [
      { name: 'All Orders', href: '/admin/orders', icon: ShoppingBag },
      { name: 'Warehouse Operations', href: '/admin/warehouse-operations', icon: Warehouse },
      { name: 'Archived Orders', href: '/admin/archived-orders', icon: Archive },
    ]
  },

  // Products group
  {
    name: 'Products',
    icon: Package,
    items: [
      { name: 'Products', href: '/admin/products-enhanced', icon: Package },
      { name: 'Component Library', href: '/admin/component-library', icon: Layers },
      { name: 'Installation Guides', href: '/admin/installation-guides', icon: Video },
      { name: 'Review Moderation', href: '/admin/review-moderation', icon: Star },
      { name: 'Inventory Alerts', href: '/admin/inventory-alerts', icon: Bell },
    ]
  },

  // Customers group
  {
    name: 'Customers',
    icon: Users,
    items: [
      { name: 'Customers', href: '/admin/customers', icon: Users },
      { name: 'Panel Partners', href: '/admin/premium-partners', icon: Crown },
    ]
  },

  // Rewards & Loyalty group
  {
    name: 'Rewards & Loyalty',
    icon: Award,
    items: [
      { name: 'Vouchers', href: '/admin/vouchers', icon: Tag },
      { name: 'Points & Rewards', href: '/admin/points-rewards', icon: TrendingUp },
    ]
  },

  // Secondhand Marketplace (standalone)
  { name: 'Secondhand Marketplace', href: '/admin/secondhand-moderation', icon: ShoppingCart },

  // System group
  {
    name: 'System',
    icon: Settings,
    items: [
      { name: 'Staff Management', href: '/admin/users', icon: UserCog },
      { name: 'Knowledge Base', href: '/admin/knowledge-base', icon: BookOpen },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ]
  },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    'Orders': false,
    'Products': false,
    'Customers': false,
    'Rewards & Loyalty': false,
    'System': false,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const isCurrentPath = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const isGroupActive = (group: NavigationGroup) => {
    return group.items.some(item => isCurrentPath(item.href, item.exact));
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/admin" className="flex items-center space-x-2">
          <Package className="h-8 w-8" />
          <span className="text-xl font-bold">Admin Panel</span>
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {navigation.map((item) => {
          if (isGroup(item)) {
            // Render group with collapsible sub-items
            const Icon = item.icon;
            const isExpanded = expandedGroups[item.name];
            const groupActive = isGroupActive(item);

            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    groupActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center">
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                    {item.items.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isActive = isCurrentPath(subItem.href, subItem.exact);

                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className={cn(
                            'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <SubIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
            // Render standalone item
            const Icon = item.icon;
            const isActive = isCurrentPath(item.href, item.exact);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          }
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center space-x-3 pb-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email || 'Admin'}
            </p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <Link
            to="/"
            className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <Home className="mr-3 h-5 w-5 flex-shrink-0" />
            Back to Store
          </Link>
          
          <button
            onClick={handleSignOut}
            className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}