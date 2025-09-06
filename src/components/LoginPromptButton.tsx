import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';

interface LoginPromptButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  redirectTo?: string; // Where to redirect after login
}

export default function LoginPromptButton({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  redirectTo
}: LoginPromptButtonProps) {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    // Store current page for redirect after login
    const currentPath = window.location.pathname + window.location.search;
    const redirectPath = redirectTo || currentPath;
    
    // Navigate to login page with redirect parameter
    navigate(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLoginClick}
    >
      {children || (
        <>
          <User className="w-4 h-4 mr-2" />
          Login to Add to Cart
        </>
      )}
    </Button>
  );
}