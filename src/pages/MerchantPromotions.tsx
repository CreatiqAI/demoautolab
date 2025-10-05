import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Calendar, Percent, Package } from 'lucide-react';

interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

export default function MerchantPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const { data } = await supabase
        .from('merchant_promotions' as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setPromotions((data as any) || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Merchant Promotions</h1>
        <p className="text-muted-foreground mb-8">
          Exclusive promotional offers available for merchant accounts
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : promotions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active promotions available at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((promo) => (
              <Card key={promo.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="default" className="text-sm">
                      {promo.code}
                    </Badge>
                    {promo.type === 'PERCENTAGE_DISCOUNT' ? (
                      <Percent className="h-5 w-5 text-green-600" />
                    ) : (
                      <Package className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <CardTitle className="text-xl">{promo.name}</CardTitle>
                  <CardDescription>{promo.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm text-muted-foreground">Discount</span>
                    <span className="font-semibold">
                      {promo.type === 'PERCENTAGE_DISCOUNT'
                        ? `${promo.discount_value}%`
                        : `RM ${promo.discount_value}`
                      }
                    </span>
                  </div>

                  {promo.min_purchase_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Min. Purchase</span>
                      <span className="font-medium">RM {promo.min_purchase_amount}</span>
                    </div>
                  )}

                  {promo.max_discount_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Max. Discount</span>
                      <span className="font-medium">RM {promo.max_discount_amount}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Valid until {formatDate(promo.valid_until)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
