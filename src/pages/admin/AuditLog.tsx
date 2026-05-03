import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollText, Search, RefreshCw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

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

const ACTION_PALETTE: Record<string, string> = {
  'customer.suspend': 'border-orange-300 text-orange-700 bg-orange-50',
  'customer.delete': 'border-red-300 text-red-700 bg-red-50',
  'customer.demote': 'border-amber-300 text-amber-700 bg-amber-50',
  'customer.reactivate': 'border-green-300 text-green-700 bg-green-50',
  'panel.promote': 'border-amber-300 text-amber-700 bg-amber-50',
  'panel.cancel': 'border-red-300 text-red-700 bg-red-50',
  'subscription.renew': 'border-blue-300 text-blue-700 bg-blue-50',
  'admin.create': 'border-green-300 text-green-700 bg-green-50',
  'admin.delete': 'border-red-300 text-red-700 bg-red-50',
};

function actionPalette(action: string): string {
  return ACTION_PALETTE[action] ?? 'border-gray-200 text-gray-700 bg-gray-50';
}

function formatDate(s: string) {
  return new Date(s).toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    fetchLog();
  }, []);

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
        r.notes?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-7 w-7" />
            Audit Log
          </h2>
          <p className="text-muted-foreground">Recent admin actions across the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLog}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Showing last {rows.length} entries (limit 500). Click a row for before/after detail.</CardDescription>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actor, entity, action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
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
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const isExpanded = expanded.has(r.id);
                    const hasDetail = r.before_data || r.after_data;
                    return (
                      <Fragment key={r.id}>
                        <TableRow
                          className={hasDetail ? 'cursor-pointer hover:bg-muted/40' : ''}
                          onClick={() => hasDetail && toggle(r.id)}
                        >
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                          <TableCell className="text-sm">
                            {r.actor_username ? (
                              <span className="font-medium">{r.actor_username}</span>
                            ) : (
                              <span className="text-muted-foreground italic">system</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {hasDetail && (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                              <Badge variant="outline" className={actionPalette(r.action)}>
                                {r.action}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{r.entity_label ?? '—'}</div>
                            <div className="text-xs text-muted-foreground">{r.entity_type}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ''}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md truncate">{r.notes ?? ''}</TableCell>
                        </TableRow>
                        {isExpanded && hasDetail && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={5} className="p-0">
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {r.before_data && (
                                  <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Before</div>
                                    <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">{JSON.stringify(r.before_data, null, 2)}</pre>
                                  </div>
                                )}
                                {r.after_data && (
                                  <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">After</div>
                                    <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">{JSON.stringify(r.after_data, null, 2)}</pre>
                                  </div>
                                )}
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
