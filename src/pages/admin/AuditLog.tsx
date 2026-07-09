import { useEffect, useState, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollText, Search, RefreshCw, Loader2, ChevronDown, ChevronRight, ArrowRight, Plus, Pencil, Trash2 } from 'lucide-react';

interface AuditRow {
  id: string;
  actor_admin_id: string | null;
  actor_username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  before_data: any;
  after_data: any;
  notes: string | null;
  created_at: string;
}

// ---- Plain-English helpers -------------------------------------------------

const ENTITY_WORD: Record<string, string> = {
  product: 'product', component: 'component', stock: 'stock movement', order: 'order',
  order_item: 'order item', return: 'return', merchant: 'merchant', vendor: 'vendor',
  vendor_payout: 'vendor payout', vendor_fulfilment: 'vendor fulfilment',
  customer: 'customer', voucher: 'voucher', admin: 'admin', category: 'category',
};

// Nice sentences for known/custom actions; otherwise derived from entity.verb.
const CUSTOM_ACTION: Record<string, string> = {
  'customer.demote': 'Demoted customer', 'customer.suspend': 'Suspended customer',
  'customer.reactivate': 'Reactivated customer', 'panel.promote': 'Promoted to panel',
  'panel.cancel': 'Cancelled panel subscription', 'subscription.renew': 'Renewed subscription',
  'admin.create': 'Invited admin', 'admin.delete': 'Removed admin',
  'vendor.create': 'Created vendor', 'vendor.delete': 'Deleted vendor', 'vendor.approve': 'Approved vendor',
  'product.approve': 'Approved product', 'product.reject': 'Rejected product',
  'product.hide': 'Hid product', 'product.unhide': 'Unhid product', 'stock.create': 'Added stock',
};

function humanAction(r: AuditRow): string {
  if (CUSTOM_ACTION[r.action]) return CUSTOM_ACTION[r.action];
  const [ent, op] = r.action.split('.');
  const word = ENTITY_WORD[ent] ?? (ent ?? '').replace(/_/g, ' ') ?? r.action;
  const verb = op === 'create' ? 'Created' : op === 'delete' ? 'Deleted' : op === 'update' ? 'Edited' : 'Changed';
  return `${verb} ${word}`;
}

function opKind(action: string): 'create' | 'update' | 'delete' | 'other' {
  const op = action.split('.')[1];
  return op === 'create' || op === 'update' || op === 'delete' ? op : 'other';
}

// Fields that are noise for a human reader.
const HIDE_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'user_id', 'search_vector', 'last_spending_reset_date',
  'tsv', 'slug', 'password_hash',
]);

const FIELD_LABEL: Record<string, string> = {
  stock_level: 'Stock level', approval_status: 'Approval status', normal_price: 'Price',
  merchant_price: 'Merchant price', is_active: 'Active', is_publicly_listed: 'Publicly listed',
  status: 'Status', payment_state: 'Payment', subscription_status: 'Subscription',
  admin_approved: 'Approved', tier_id: 'Tier', current_month_spending: 'Monthly spending',
  reorder_point: 'Reorder point', component_type: 'Type', full_name: 'Name',
};

function prettyField(k: string): string {
  return FIELD_LABEL[k] ?? k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function fmtVal(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return Array.isArray(v) ? `${v.length} item(s)` : '…';
  const s = String(v);
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}

interface Change { field: string; from: any; to: any; }

function diffFields(before: any, after: any): Change[] {
  const b = before ?? {}, a = after ?? {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter((k) => !HIDE_FIELDS.has(k));
  const out: Change[] = [];
  for (const k of keys) {
    const bv = b[k], av = a[k];
    if (JSON.stringify(bv) === JSON.stringify(av)) continue;
    // skip object↔object churn (nested arrays/blobs) — not human-friendly
    if (bv && av && typeof bv === 'object' && typeof av === 'object') continue;
    out.push({ field: k, from: bv, to: av });
  }
  return out;
}

// Notable scalar fields to show for a create/delete record.
function notableFields(row: any): Change[] {
  if (!row) return [];
  return Object.keys(row)
    .filter((k) => !HIDE_FIELDS.has(k))
    .filter((k) => {
      const v = row[k];
      return v !== null && v !== '' && typeof v !== 'object';
    })
    .slice(0, 8)
    .map((k) => ({ field: k, from: undefined, to: row[k] }));
}

// One-line summary shown on the collapsed row.
function summarize(r: AuditRow): string {
  const kind = opKind(r.action);
  if (kind === 'update') {
    const ch = diffFields(r.before_data, r.after_data);
    if (ch.length === 0) return '';
    if (ch.length <= 2) return ch.map((c) => `${prettyField(c.field)}: ${fmtVal(c.from)} → ${fmtVal(c.to)}`).join(', ');
    return `${ch.length} fields changed`;
  }
  return '';
}

function actionColor(action: string): string {
  const kind = opKind(action);
  if (kind === 'create') return 'text-green-700';
  if (kind === 'delete') return 'text-red-700';
  if (action.includes('reject') || action.includes('suspend') || action.includes('cancel') || action.includes('demote'))
    return 'text-amber-700';
  return 'text-blue-700';
}

function formatDate(s: string) {
  return new Date(s).toLocaleString('en-MY', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// ---- Component -------------------------------------------------------------

export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rawOpen, setRawOpen] = useState<Set<string>>(new Set());

  const fetchLog = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('admin_audit_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      setRows((data as any[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLog(); }, []);

  const actions = Array.from(new Set(rows.map((r) => r.action))).sort();
  const entities = Array.from(new Set(rows.map((r) => r.entity_type))).sort();

  const filtered = rows.filter((r) => {
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    if (entityFilter !== 'all' && r.entity_type !== entityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.actor_username?.toLowerCase().includes(s) ||
        r.entity_label?.toLowerCase().includes(s) ||
        r.action.toLowerCase().includes(s) ||
        humanAction(r).toLowerCase().includes(s) ||
        r.notes?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const toggle = (id: string, set: typeof setExpanded) =>
    set((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const OpIcon = ({ action }: { action: string }) => {
    const k = opKind(action);
    if (k === 'create') return <Plus className="h-3.5 w-3.5 text-green-600" />;
    if (k === 'delete') return <Trash2 className="h-3.5 w-3.5 text-red-600" />;
    return <Pencil className="h-3.5 w-3.5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-7 w-7" />
            Audit Log
          </h2>
          <p className="text-muted-foreground">Every action admins take across the platform — who did what, and what changed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLog}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Showing last {rows.length} entries (limit 500). Click a row to see exactly what changed.</CardDescription>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admin, item, action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[210px]"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{CUSTOM_ACTION[a] ?? a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>{ENTITY_WORD[e] ?? e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No entries match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">When</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>What they did</TableHead>
                    <TableHead>Item</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const isOpen = expanded.has(r.id);
                    const hasDetail = !!(r.before_data || r.after_data);
                    const summary = summarize(r);
                    const kind = opKind(r.action);
                    const changes = kind === 'update'
                      ? diffFields(r.before_data, r.after_data)
                      : notableFields(kind === 'delete' ? r.before_data : r.after_data);
                    return (
                      <Fragment key={r.id}>
                        <TableRow
                          className={hasDetail ? 'cursor-pointer hover:bg-muted/40' : ''}
                          onClick={() => hasDetail && toggle(r.id, setExpanded)}
                        >
                          <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                          <TableCell className="text-sm">
                            {r.actor_username
                              ? <span className="font-medium">{r.actor_username}</span>
                              : <span className="text-muted-foreground italic">system</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {hasDetail && (isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)}
                              <OpIcon action={r.action} />
                              <span className={`font-medium ${actionColor(r.action)}`}>{humanAction(r)}</span>
                            </div>
                            {summary && <div className="text-xs text-muted-foreground mt-0.5 pl-8">{summary}</div>}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{r.entity_label ?? '—'}</div>
                            <div className="text-xs text-muted-foreground">{ENTITY_WORD[r.entity_type] ?? r.entity_type}</div>
                          </TableCell>
                        </TableRow>

                        {isOpen && hasDetail && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={4} className="p-0">
                              <div className="p-4 space-y-3">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  {kind === 'update' ? 'What changed' : kind === 'create' ? 'Created with' : 'Removed record'}
                                </div>

                                {changes.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">No human-readable field changes (see raw data).</div>
                                ) : (
                                  <div className="rounded-lg border divide-y bg-white">
                                    {changes.map((c) => (
                                      <div key={c.field} className="flex items-center gap-3 px-3 py-2 text-sm">
                                        <div className="w-40 shrink-0 text-muted-foreground">{prettyField(c.field)}</div>
                                        {kind === 'update' ? (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 line-through decoration-red-300">{fmtVal(c.from)}</span>
                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">{fmtVal(c.to)}</span>
                                          </div>
                                        ) : (
                                          <div className="font-medium">{fmtVal(c.to)}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div>
                                  <button
                                    className="text-xs text-muted-foreground hover:text-foreground underline"
                                    onClick={(e) => { e.stopPropagation(); toggle(r.id, setRawOpen); }}
                                  >
                                    {rawOpen.has(r.id) ? 'Hide raw data' : 'Show raw data'}
                                  </button>
                                  {rawOpen.has(r.id) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                      {r.before_data && (
                                        <div>
                                          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Before</div>
                                          <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">{JSON.stringify(r.before_data, null, 2)}</pre>
                                        </div>
                                      )}
                                      {r.after_data && (
                                        <div>
                                          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">After</div>
                                          <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">{JSON.stringify(r.after_data, null, 2)}</pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
