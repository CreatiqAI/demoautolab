import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function VendorPayouts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          Payouts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your earnings, pending balance, and monthly payout history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
          <CardDescription>
            Payout ledger and history UI will land in Phase 6 of the marketplace rollout.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-500">
          Earnings are paid out monthly to the bank account on file: gross sales minus the 8% platform fee, minus any
          customer refunds processed during the period.
        </CardContent>
      </Card>
    </div>
  );
}
