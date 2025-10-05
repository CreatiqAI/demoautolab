import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface WalletData {
  points_balance: number;
  credit_balance: number;
  total_earned_points: number;
  total_spent_points: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export default function MerchantWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      // Get customer profile
      const { data: profile } = await supabase
        .from('customer_profiles' as any)
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Get wallet data
      const { data: walletData } = await supabase
        .from('merchant_wallets' as any)
        .select('*')
        .eq('customer_id', (profile as any).id)
        .single();

      setWallet(walletData as any);

      // Get transactions
      const { data: txData } = await supabase
        .from('wallet_transactions' as any)
        .select('*')
        .eq('customer_id', (profile as any).id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions((txData as any) || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Wallet</h1>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : wallet ? (
          <>
            {/* Wallet Balance Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Points Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{wallet.points_balance.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground">Available points</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Total Earned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{wallet.total_earned_points.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground">Lifetime earnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Total Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{wallet.total_spent_points.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground">Lifetime spending</p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Recent wallet transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4" />
                              {formatDate(tx.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type.includes('EARN') ? 'default' : 'secondary'}>
                              {tx.type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className={tx.type.includes('EARN') ? 'text-green-600' : 'text-red-600'}>
                              {tx.type.includes('EARN') ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {tx.balance_after.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No wallet found. Your wallet will be created once your merchant application is approved.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
