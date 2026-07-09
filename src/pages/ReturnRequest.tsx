import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useReturns, RETURN_REASONS, reasonConfig, type ReturnReason, type ResolutionType } from '@/hooks/useReturns';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, PackageOpen, ShieldCheck, Minus, Plus, Upload, X, Camera } from 'lucide-react';

interface OrderItemRow {
  id: string;
  component_sku: string;
  component_name: string;
  product_context: string | null;
  quantity: number;
  unit_price: number;
}

const fmtRM = (n: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);

export default function ReturnRequest() {
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const navigate = useNavigate();
  const { createReturn, checkEligibility, loading: submitting } = useReturns();

  const [loadingOrder, setLoadingOrder] = useState(true);
  const [order, setOrder] = useState<{ id: string; order_no: string; status: string } | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason: string; days_remaining: number } | null>(null);
  const [selected, setSelected] = useState<Record<string, { checked: boolean; qty: number }>>({});
  const [reason, setReason] = useState<ReturnReason>('DEFECTIVE');
  const [details, setDetails] = useState('');
  const [outcome, setOutcome] = useState<'REFUND' | 'EXCHANGE'>('REFUND');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const cfg = reasonConfig(reason);

  useEffect(() => {
    if (!orderId) { setLoadingOrder(false); return; }
    (async () => {
      setLoadingOrder(true);
      const { data: o } = await supabase.from('orders').select('id, order_no, status').eq('id', orderId).maybeSingle();
      setOrder(o as any);
      const { data: its } = await supabase
        .from('order_items')
        .select('id, component_sku, component_name, product_context, quantity, unit_price')
        .eq('order_id', orderId);
      const rows = (its as OrderItemRow[] | null) ?? [];
      setItems(rows);
      const sel: Record<string, { checked: boolean; qty: number }> = {};
      rows.forEach((it) => { sel[it.id] = { checked: false, qty: it.quantity }; });
      setSelected(sel);
      setEligibility(await checkEligibility(orderId));
      setLoadingOrder(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const chosen = items.filter((it) => selected[it.id]?.checked);
  const refundEstimate = chosen.reduce((s, it) => s + Number(it.unit_price) * (selected[it.id]?.qty ?? 0), 0);

  const setQty = (id: string, delta: number, max: number) =>
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], qty: Math.min(max, Math.max(1, (prev[id]?.qty ?? 1) + delta)) } }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 5);
    setFiles(next);
  };

  const uploadEvidence = async (): Promise<{ url: string }[]> => {
    const out: { url: string }[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop() || 'jpg';
      const path = `${orderId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('return-evidence').upload(path, f, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('return-evidence').getPublicUrl(path);
        out.push({ url: data.publicUrl });
      }
    }
    return out;
  };

  const submit = async () => {
    if (chosen.length === 0) { toast.error('Select at least one item to return.'); return; }
    if (cfg.requiresEvidence && files.length === 0) {
      toast.error('Please add at least one photo or video as evidence for this reason.');
      return;
    }
    if (cfg.requiresEvidence && details.trim().length < 5) {
      toast.error('Please briefly describe the issue so our team can help.');
      return;
    }

    const resolution_type: ResolutionType = !cfg.requiresReturn
      ? 'REFUND_ONLY'
      : outcome === 'EXCHANGE' ? 'EXCHANGE' : 'RETURN_REFUND';

    setUploading(true);
    const evidence = files.length ? await uploadEvidence() : [];
    setUploading(false);

    const res = await createReturn({
      order_id: orderId!,
      reason,
      reason_details: details.trim() || undefined,
      refund_method: resolution_type === 'EXCHANGE' ? 'EXCHANGE' : 'ORIGINAL_PAYMENT',
      resolution_type,
      return_shipping_paid_by: cfg.requiresReturn ? cfg.shippingPaidBy : undefined,
      items: chosen.map((it) => ({
        order_item_id: it.id,
        component_sku: it.component_sku,
        component_name: it.component_name,
        quantity: selected[it.id].qty,
        unit_price: Number(it.unit_price),
      })),
      evidence,
    });
    if (res) navigate('/my-returns');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      <Header />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <Link to="/my-orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to my orders
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <PackageOpen className="h-7 w-7 text-lime-600" />
          <h1 className="font-heading font-bold uppercase tracking-tight text-2xl text-gray-900">Request a Return</h1>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Submit a return or refund request online. Our team reviews it and you can track the status in{' '}
          <Link to="/my-returns" className="text-lime-600 font-medium hover:underline">My Returns</Link>.
        </p>

        {loadingOrder ? (
          <div className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading order…</div>
        ) : !orderId || !order ? (
          <Card><CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Choose which order you'd like to return from your order history.</p>
            <Button onClick={() => navigate('/my-orders')} className="bg-lime-600 hover:bg-lime-700 text-white">Go to My Orders</Button>
          </CardContent></Card>
        ) : eligibility && !eligibility.eligible ? (
          <Card><CardContent className="p-6">
            <p className="text-sm font-medium text-gray-900 mb-1">Order #{order.order_no}</p>
            <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">{eligibility.reason}</div>
            <Button variant="outline" onClick={() => navigate('/my-orders')} className="mt-4">Back to orders</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-5">
            <Card><CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Order #{order.order_no}</p>
                  <p className="text-xs text-gray-500">Delivered · return window {eligibility?.days_remaining ?? 0} day(s) left</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-lime-700 bg-lime-50 border border-lime-200 rounded-full px-2.5 py-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> 14-day returns
                </span>
              </div>
            </CardContent></Card>

            {/* Items */}
            <Card><CardContent className="p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Which items are you returning?</p>
              {items.map((it) => {
                const s = selected[it.id];
                return (
                  <div key={it.id} className={`flex items-center gap-3 p-3 rounded-lg border ${s?.checked ? 'border-lime-300 bg-lime-50/40' : 'border-gray-200'}`}>
                    <Checkbox checked={s?.checked ?? false} onCheckedChange={(c) => setSelected((prev) => ({ ...prev, [it.id]: { ...prev[it.id], checked: !!c } }))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{it.component_name}</p>
                      <p className="text-xs text-gray-500 truncate">{it.component_sku}{it.product_context ? ` · ${it.product_context}` : ''}</p>
                      <p className="text-xs text-gray-500">{fmtRM(Number(it.unit_price))} · ordered {it.quantity}</p>
                    </div>
                    {s?.checked && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(it.id, -1, it.quantity)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-6 text-center text-sm tabular-nums">{s.qty}</span>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(it.id, 1, it.quantity)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent></Card>

            {/* Reason */}
            <Card><CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-900">Reason for return</Label>
                <Select value={reason} onValueChange={(v) => { setReason(v as ReturnReason); setOutcome('REFUND'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">{cfg.hint}</p>
              </div>

              {/* Resolution — driven by the reason */}
              {!cfg.requiresReturn ? (
                <div className="text-sm rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <span className="font-medium">Refund only</span> — you won't need to ship anything back.
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">What would you like?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOutcome('REFUND')}
                      className={`p-3 rounded-lg border text-sm text-left ${outcome === 'REFUND' ? 'border-lime-400 bg-lime-50' : 'border-gray-200'}`}>
                      <div className="font-medium">Refund</div>
                      <div className="text-xs text-gray-500">Return the item for your money back.</div>
                    </button>
                    {cfg.allowExchange && (
                      <button type="button" onClick={() => setOutcome('EXCHANGE')}
                        className={`p-3 rounded-lg border text-sm text-left ${outcome === 'EXCHANGE' ? 'border-lime-400 bg-lime-50' : 'border-gray-200'}`}>
                        <div className="font-medium">Exchange</div>
                        <div className="text-xs text-gray-500">Return it for a replacement.</div>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Return shipping is <span className="font-medium">{cfg.shippingPaidBy === 'VENDOR' ? 'free (paid by the seller)' : 'paid by you'}</span> for this reason.
                  </p>
                </div>
              )}

              {/* Details */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-900">Details {cfg.requiresEvidence && <span className="text-red-500">*</span>}</Label>
                <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what's wrong (and anything that helps us resolve it faster)…" rows={3} />
              </div>

              {/* Evidence */}
              {(cfg.requiresEvidence || files.length > 0) && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Camera className="h-4 w-4" /> Photos / video {cfg.requiresEvidence && <span className="text-red-500">*</span>}
                  </Label>
                  <p className="text-xs text-gray-500">Clear photos of the issue (and packaging for damage). Up to 5 files. An unboxing video helps for high-value parts.</p>
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border bg-gray-50">
                        {f.type.startsWith('video') ? (
                          <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                        ) : (
                          <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        )}
                        <button type="button" onClick={() => setFiles((prev) => prev.filter((_, n) => n !== i))}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    {files.length < 5 && (
                      <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-lime-400 text-gray-400">
                        <Upload className="h-5 w-5" />
                        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                      </label>
                    )}
                  </div>
                </div>
              )}
            </CardContent></Card>

            {/* Summary + submit */}
            <Card><CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">{chosen.length} item(s) selected</span>
                {outcome === 'REFUND' && (
                  <span className="text-sm">Estimated refund: <span className="font-semibold">{fmtRM(refundEstimate)}</span></span>
                )}
              </div>
              <Button onClick={submit} disabled={submitting || uploading || chosen.length === 0} className="w-full bg-lime-600 hover:bg-lime-700 text-white h-11">
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading evidence…</>
                  : submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                  : 'Submit return request'}
              </Button>
              <p className="text-[11px] text-gray-400 text-center mt-2">The final refund amount is confirmed by our team after review.</p>
            </CardContent></Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
