import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function VendorProducts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Products
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your catalog. New products go through admin approval before they appear on the customer-facing
          catalog.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
          <CardDescription>
            Product upload UI will land in Phase 3 of the marketplace rollout. For now, contact AutoLab admin to seed
            your initial product list.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-500">
          Once available you'll be able to: add products with images, define components and pricing, and view their
          approval status.
        </CardContent>
      </Card>
    </div>
  );
}
