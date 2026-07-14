import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Plus, Trash2, ExternalLink, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  useSiteSettings,
  useUpdateSiteSettings,
  type SiteSettings as Settings,
  type OfficeHour,
} from '@/hooks/useSiteSettings';

export default function SiteSettings() {
  const { settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const { toast } = useToast();

  const [form, setForm] = useState<Settings | null>(null);

  // Seed the form once the row arrives; afterwards the form owns its own state so
  // typing isn't clobbered by a background refetch.
  useEffect(() => {
    if (!isLoading && !form) setForm(settings);
  }, [isLoading, settings, form]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setHour = (index: number, patch: Partial<OfficeHour>) =>
    setForm((f) =>
      f
        ? { ...f, office_hours: f.office_hours.map((h, i) => (i === index ? { ...h, ...patch } : h)) }
        : f,
    );

  const addHour = () =>
    setForm((f) =>
      f ? { ...f, office_hours: [...f.office_hours, { days: '', open: '9:00am', close: '6:00pm' }] } : f,
    );

  const removeHour = (index: number) =>
    setForm((f) => (f ? { ...f, office_hours: f.office_hours.filter((_, i) => i !== index) } : f));

  const handleSave = async () => {
    if (!form) return;
    try {
      const { updated_at, ...patch } = form;
      await updateSettings.mutateAsync(patch);
      toast({ title: 'Saved', description: 'Your changes are live on the site.' });
    } catch (error) {
      toast({
        title: "Couldn't save",
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Settings</h1>
          <p className="text-gray-600">
            Your contact details and policy pages. Changes appear on the site immediately.
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save changes
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="legal">Legal pages</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        {/* ---------------- Company ---------------- */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
              <CardDescription>
                Shown in the footer, on invoices, and in the site's search-engine listing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trading_name">Trading name</Label>
                <Input
                  id="trading_name"
                  value={form.trading_name}
                  onChange={(e) => set('trading_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_name">Registered name</Label>
                <Input
                  id="legal_name"
                  value={form.legal_name}
                  onChange={(e) => set('legal_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+6014-309 8767"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  placeholder="Leave blank to hide the WhatsApp link"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">One-line description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address_line1">Street address</Label>
                <Input
                  id="address_line1"
                  value={form.address_line1}
                  onChange={(e) => set('address_line1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_postcode">Postcode</Label>
                <Input
                  id="address_postcode"
                  value={form.address_postcode}
                  onChange={(e) => set('address_postcode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_city">City</Label>
                <Input
                  id="address_city"
                  value={form.address_city}
                  onChange={(e) => set('address_city', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address_state">State</Label>
                <Input
                  id="address_state"
                  value={form.address_state}
                  onChange={(e) => set('address_state', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Opening hours</CardTitle>
                  <CardDescription>Clear both times to mark a day as closed.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addHour}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.office_hours.length === 0 && (
                <p className="text-sm text-gray-500">No hours set. Add a row to show them in the footer.</p>
              )}
              {form.office_hours.map((hour, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    aria-label="Days"
                    className="sm:flex-1"
                    value={hour.days}
                    onChange={(e) => setHour(i, { days: e.target.value })}
                    placeholder="Monday – Friday"
                  />
                  <Input
                    aria-label="Opening time"
                    className="sm:w-32"
                    value={hour.open ?? ''}
                    onChange={(e) => setHour(i, { open: e.target.value || null })}
                    placeholder="9:30am"
                  />
                  <Input
                    aria-label="Closing time"
                    className="sm:w-32"
                    value={hour.close ?? ''}
                    onChange={(e) => setHour(i, { close: e.target.value || null })}
                    placeholder="6:00pm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHour(i)}
                    aria-label={`Remove ${hour.days || 'row'}`}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social links</CardTitle>
              <CardDescription>Leave blank to hide the icon in the footer.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facebook_url">Facebook</Label>
                <Input
                  id="facebook_url"
                  value={form.facebook_url}
                  onChange={(e) => set('facebook_url', e.target.value)}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input
                  id="instagram_url"
                  value={form.instagram_url}
                  onChange={(e) => set('instagram_url', e.target.value)}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Legal ---------------- */}
        <TabsContent value="legal" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Start a line with <code className="text-xs">## </code> to make it a heading. Blank lines
              separate paragraphs.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Privacy Policy</CardTitle>
                  <CardDescription>Published at /privacy</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/privacy" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View page
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                aria-label="Privacy policy text"
                rows={16}
                className="font-mono text-sm"
                value={form.privacy_policy}
                onChange={(e) => set('privacy_policy', e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Terms &amp; Conditions</CardTitle>
                  <CardDescription>Published at /terms</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/terms" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View page
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                aria-label="Terms and conditions text"
                rows={16}
                className="font-mono text-sm"
                value={form.terms_conditions}
                onChange={(e) => set('terms_conditions', e.target.value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Returns ---------------- */}
        <TabsContent value="returns" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Return policy</CardTitle>
                  <CardDescription>
                    These values drive the Return Policy page and the returns flow.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/return-policy" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View page
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="return_window_days">Return window (days)</Label>
                  <Input
                    id="return_window_days"
                    type="number"
                    min={0}
                    value={form.return_window_days}
                    onChange={(e) => set('return_window_days', Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">
                    How long after delivery a customer can open a return.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="free_return_shipping">Free return shipping</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      id="free_return_shipping"
                      checked={form.free_return_shipping}
                      onCheckedChange={(v) => set('free_return_shipping', v)}
                    />
                    <span className="text-sm text-gray-600">
                      {form.free_return_shipping ? 'We pay return postage' : 'Customer pays return postage'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return_policy_intro">Intro text</Label>
                <Textarea
                  id="return_policy_intro"
                  rows={4}
                  value={form.return_policy_intro}
                  onChange={(e) => set('return_policy_intro', e.target.value)}
                  placeholder="Shown at the top of the Return Policy page."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
