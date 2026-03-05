---
name: new-component
description: Create a reusable UI component following shadcn/ui patterns with TypeScript props, Tailwind styling, and composition patterns
user-invocable: true
disable-model-invocation: false
---

Create a new reusable component for the AutoLab project.

Component description: $ARGUMENTS

## Requirements

1. Determine the right location:
   - General shared component: `src/components/<Name>.tsx`
   - Admin-specific component: `src/components/admin/<Name>.tsx`
   - Feature-specific components: `src/components/<feature>/<Name>.tsx` (e.g., `reviews/`, `warehouse/`)
   - Low-level UI primitive: `src/components/ui/<name>.tsx` (only if it's a design system primitive)

2. Follow existing component patterns from files like:
   - `src/components/ProductCard.tsx` (display component)
   - `src/components/CartDrawer.tsx` (interactive drawer)
   - `src/components/CheckoutModal.tsx` (modal with form)
   - `src/components/reviews/ReviewForm.tsx` (feature-specific)

## Component Template
```tsx
import { useState } from 'react';
import { cn } from '@/lib/utils';
// Import shadcn/ui primitives as needed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Import icons from lucide-react
import { IconName } from 'lucide-react';

interface ComponentNameProps {
  // Required props
  title: string;
  // Optional props with defaults
  variant?: 'default' | 'compact';
  className?: string;
  // Event handlers
  onAction?: () => void;
}

export default function ComponentName({
  title,
  variant = 'default',
  className,
  onAction,
}: ComponentNameProps) {
  return (
    <div className={cn('base-classes', className)}>
      {/* Component content */}
    </div>
  );
}
```

## Key Patterns
- Always accept `className` prop and merge with `cn()` from `@/lib/utils`
- Use TypeScript interfaces for all props (not `type`)
- Use `export default function` pattern (consistent with project)
- Compose from shadcn/ui primitives (Card, Button, Badge, Dialog, etc.)
- Use lucide-react for icons
- Responsive by default (mobile-first Tailwind)
- Use the lime green palette for accents: `lime-500`, `lime-600`, `bg-lime-50`
- Use Framer Motion for animations only when needed: `import { motion } from 'framer-motion'`
- MYR formatting: `new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)`
