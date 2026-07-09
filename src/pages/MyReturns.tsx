import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReturns, type Return, type ReturnStatus } from '@/hooks/useReturns';
import { ArrowLeft, Loader2, PackageOpen, Check, X } from 'lucide-react';

const fmtRM = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n ?? 0);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

// Map the DB status enum onto a simple 5-step customer timeline.
const STEPS = ['Requested', 'Approved', 'In transit / inspection', 'Refund / exchange', 'Completed'] as const;

function stepIndex(status: ReturnStatus): number {
  switch (status) {
    case 'PENDING': return 0;
    case 'APPROVED': return 1;
    case 'ITEM_SHIPPED':
    case 'ITEM_RECEIVED':
    case 'INSPECTING': return 2;
    case 'REFUND_PROCESSING':
    case 'EXCHANGE_PROCESSING': return 3;
    case 'COMPLETED': return 4;
    default: return 0; // REJECTED / CANCELLED handled separately
  }
}

const STATUS_LABEL: Record<ReturnStatus, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ITEM_SHIPPED: 'Return in transit',
  ITEM_RECEIVED: 'Item received',
  INSPECTING: 'Inspecting',
  REFUND_PROCESSING: 'Refund processing',
  EXCHANGE_PROCESSING: 'Exchange processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function Timeline({ status }: { status: ReturnStatus }) {
  const terminalBad = status === 'REJECTED' || status === 'CANCELLED';
  const current = stepIndex(status);
  if (terminalBad) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 text-xs font-medium">
          <X className="h-3.5 w-3.5" /> {STATUS_LABEL[status]}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold
                ${done ? 'bg-lime-500 text-white' : active ? 'bg-lime-100 text-lime-700 ring-2 ring-lime-400' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`mt-1 text-[10px] text-center leading-tight w-16 ${active ? 'text-lime-700 font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < current ? 'bg-lime-500' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function MyReturns() {
  const { returns, loading, cancelReturn } = useReturns();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      <Header />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <Link to="/my-orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to my orders
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <PackageOpen className="h-7 w-7 text-lime-600" />
          <h1 className="font-heading font-bold uppercase tracking-tight text-2xl text-gray-900">My Returns</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>
        ) : returns.length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't requested any returns yet.</p>
            <Button onClick={() => (window.location.href = '/my-orders')} className="bg-lime-600 hover:bg-lime-700 text-white">Go to My Orders</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {returns.map((r: Return) => (
              <Card key={r.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Return {r.return_no}</p>
                      <p className="text-xs text-gray-500">
                        {r.order?.order_no ? `Order #${r.order.order_no} · ` : ''}Submitted {fmtDate(r.created_at)}
                      </p>
                    </div>
                    <span className="text-xs rounded-full bg-gray-100 border border-gray-200 text-gray-700 px-2.5 py-1 font-medium whitespace-nowrap">
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>

                  <Timeline status={r.status} />

                  <div className="flex items-center justify-between text-sm border-t pt-3">
                    <span className="text-gray-500">
                      {r.return_items?.length ?? 0} item(s) · {r.reason.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    {r.refund_amount != null && r.refund_amount > 0 && (
                      <span>Refund: <span className="font-semibold">{fmtRM(r.refund_amount)}</span></span>
                    )}
                  </div>

                  {r.rejection_reason && (
                    <div className="text-xs rounded-lg bg-red-50 border border-red-200 text-red-800 p-3">
                      <span className="font-medium">Reason: </span>{r.rejection_reason}
                    </div>
                  )}

                  {r.status === 'PENDING' && (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => cancelReturn(r.id)}>
                        Cancel request
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
