import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag } from 'lucide-react';

export default function VendorOrders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
          Orders
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fulfil customer orders containing your items. Each fulfilment is one shipment from you to the buyer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
          <CardDescription>
            Order fulfilment UI will land in Phase 5 of the marketplace rollout. You'll be able to mark items as shipped
            and add courier tracking numbers.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-500">
          We'll notify you here when a customer purchases your items. AutoLab handles payment collection — you handle
          shipping.
        </CardContent>
      </Card>
    </div>
  );
}
