import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCurrentVendor } from '@/lib/vendorAuth';
import { useToast } from '@/hooks/use-toast';
import {
  useUploadQueue,
  PRODUCT_MEDIA_UPLOADED_EVENT,
  PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT,
  INSTALLATION_VIDEO_UPLOADED_EVENT,
  INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT,
  type ProductMediaUploadedDetail,
  type InstallationVideoUploadedDetail,
} from '@/hooks/useUploadQueue';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isEmbeddableUrl, getEmbedUrl } from '@/components/ui/video-upload';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  X,
  Upload,
  Wrench,
  Eye,
  Play,
  GripVertical,
  Video,
  Users,
  DollarSign,
} from 'lucide-react';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

interface VendorProduct {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  year_from: number | null;
  year_to: number | null;
  screen_size: string[] | null;
  normal_price: number | null;
  merchant_price: number | null;
  active: boolean;
  featured: boolean;
  category_id: string | null;
  vendor_id: string | null;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  primary_image_url?: string | null;
  component_count?: number;
}

interface VendorComponent {
  id: string;
  component_sku: string;
  name: string;
  description: string | null;
  component_type: string | null;
  stock_level: number | null;
  normal_price: number | null;
  merchant_price: number | null;
  default_image_url: string | null;
}

interface SelectedComponent extends VendorComponent {
  remark?: string;
}

interface ProductImage {
  id?: string;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  media_type: 'image' | 'video';
  _uploadId?: string;
  _uploading?: boolean;
  _uploadFileName?: string;
  _uploadFileSize?: number;
}

interface InstallationVideoForm {
  url: string;
  title: string;
  duration: string;
  _uploadId?: string;
  _uploading?: boolean;
  _uploadFileName?: string;
  _uploadFileSize?: number;
}

interface InstallationFormData {
  has_installation_guide: boolean;
  recommended_time: string;
  workman_power: number;
  installation_price: number;
  installation_videos: InstallationVideoForm[];
  difficulty_level: 'easy' | 'medium' | 'hard' | 'expert';
  notes: string;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  brand: string;
  model: string;
  year_from: number | null;
  year_to: number | null;
  screen_size: string[];
  normal_price: number | null;
  merchant_price: number | null;
  category_id: string;
  active: boolean;
  featured: boolean;
  selectedComponents: SelectedComponent[];
  images: ProductImage[];
  installation: InstallationFormData;
}

interface CategoryRow {
  id: string;
  name: string;
  active: boolean;
}

const SCREEN_SIZES = [
  { value: '9', label: '9 inch' },
  { value: '10', label: '10 inch' },
  { value: '12.5', label: '12.5 inch' },
];

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  brand: '',
  model: '',
  year_from: null,
  year_to: null,
  screen_size: [],
  normal_price: null,
  merchant_price: null,
  category_id: 'no-category',
  active: true,
  featured: false,
  selectedComponents: [],
  images: [],
  installation: {
    has_installation_guide: false,
    recommended_time: '',
    workman_power: 1,
    installation_price: 0,
    installation_videos: [],
    difficulty_level: 'medium',
    notes: '',
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const formatRM = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(n ?? 0));

function StatusBadge({ status }: { status: ApprovalStatus }) {
  // w-fit + text-xs keeps the pill compact even when used inside a flex-col cell.
  const base = 'w-fit text-[11px] font-medium px-2 py-0.5 inline-flex items-center';
  if (status === 'APPROVED') {
    return (
      <Badge className={`${base} bg-green-100 text-green-800 hover:bg-green-100 border-green-200`}>
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Approved
      </Badge>
    );
  }
  if (status === 'PENDING') {
    return (
      <Badge className={`${base} bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200`}>
        <Clock className="h-3 w-3 mr-1" />
        Pending review
      </Badge>
    );
  }
  if (status === 'REJECTED') {
    return (
      <Badge className={`${base} bg-red-100 text-red-800 hover:bg-red-100 border-red-200`}>
        <XCircle className="h-3 w-3 mr-1" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`${base} text-gray-600`}>
      Hidden
    </Badge>
  );
}

export default function VendorProducts() {
  const { vendor } = useCurrentVendor();
  const { toast } = useToast();
  const { enqueueVideoUpload, cancelUpload } = useUploadQueue();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [components, setComponents] = useState<VendorComponent[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [formTab, setFormTab] = useState('basic');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [originalCriticalSnapshot, setOriginalCriticalSnapshot] = useState<string>('');
  const [originalImageUrls, setOriginalImageUrls] = useState<string[]>([]);
  const [originalInstallationVideoUrls, setOriginalInstallationVideoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [componentSearch, setComponentSearch] = useState('');

  // Selected components reorder state (mirrors admin ProductsPro)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Media tab state — drag-and-drop reorder + image lightbox
  const [mediaDragIndex, setMediaDragIndex] = useState<number | null>(null);
  const [mediaDragOverIndex, setMediaDragOverIndex] = useState<number | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingImageInfo, setViewingImageInfo] = useState<{ url: string; title: string } | null>(null);

  // Load products + own components when vendor loaded
  useEffect(() => {
    if (!vendor?.id) return;
    void loadProducts(vendor.id);
    void loadComponents(vendor.id);
    void loadCategories();
  }, [vendor?.id]);

  // Sync background product-media uploads into open form
  useEffect(() => {
    const completedHandler = (e: Event) => {
      const detail = (e as CustomEvent<ProductMediaUploadedDetail>).detail;
      if (!detail) return;
      if (editingProduct?.id === detail.productId) {
        setForm((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img._uploadId === detail.media.uploadId
              ? {
                  ...img,
                  url: detail.media.url,
                  _uploading: false,
                  _uploadId: undefined,
                  media_type: 'video',
                }
              : img
          ),
        }));
      }
      if (vendor?.id) void loadProducts(vendor.id);
    };
    const removedHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ productId: string; uploadId: string }>).detail;
      if (!detail) return;
      if (editingProduct?.id === detail.productId) {
        setForm((prev) => ({
          ...prev,
          images: prev.images.filter((img) => img._uploadId !== detail.uploadId),
        }));
      }
    };
    window.addEventListener(PRODUCT_MEDIA_UPLOADED_EVENT, completedHandler);
    window.addEventListener(PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT, removedHandler);
    return () => {
      window.removeEventListener(PRODUCT_MEDIA_UPLOADED_EVENT, completedHandler);
      window.removeEventListener(PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT, removedHandler);
    };
  }, [editingProduct?.id, vendor?.id]);

  // Sync background installation-video uploads into open form
  useEffect(() => {
    const completedHandler = (e: Event) => {
      const detail = (e as CustomEvent<InstallationVideoUploadedDetail>).detail;
      if (!detail) return;
      if (editingProduct?.id !== detail.productId) return;
      setForm((prev) => {
        const idx = prev.installation.installation_videos.findIndex(
          (v) => v._uploadId === detail.uploadId
        );
        if (idx === -1) {
          if (prev.installation.installation_videos.some((v) => v.url === detail.url)) return prev;
          return {
            ...prev,
            installation: {
              ...prev.installation,
              installation_videos: [
                ...prev.installation.installation_videos,
                { url: detail.url, title: '', duration: '' },
              ],
            },
          };
        }
        const next = [...prev.installation.installation_videos];
        next[idx] = {
          ...next[idx],
          url: detail.url,
          _uploading: false,
          _uploadId: undefined,
          _uploadFileName: undefined,
          _uploadFileSize: undefined,
        };
        return { ...prev, installation: { ...prev.installation, installation_videos: next } };
      });
    };
    const removedHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ uploadId: string }>).detail;
      if (!detail) return;
      setForm((prev) => ({
        ...prev,
        installation: {
          ...prev.installation,
          installation_videos: prev.installation.installation_videos.filter(
            (v) => v._uploadId !== detail.uploadId
          ),
        },
      }));
    };
    window.addEventListener(INSTALLATION_VIDEO_UPLOADED_EVENT, completedHandler);
    window.addEventListener(INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT, removedHandler);
    return () => {
      window.removeEventListener(INSTALLATION_VIDEO_UPLOADED_EVENT, completedHandler);
      window.removeEventListener(INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT, removedHandler);
    };
  }, [editingProduct?.id]);

  const loadProducts = async (vendorId: string) => {
    setLoading(true);
    try {
      // SECURITY: scope query to vendor_id.
      const { data, error } = await supabase
        .from('products_new' as any)
        .select('*, product_components(id), product_images_new(url, is_primary, sort_order, media_type)')
        .eq('vendor_id', vendorId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const list = ((data as any[]) ?? []).map((p) => {
        const imgs = ((p.product_images_new as any[]) ?? []).filter((i) => i.media_type !== 'video');
        const primary =
          imgs.find((i) => i.is_primary)?.url ??
          imgs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.url ??
          null;
        return {
          ...p,
          primary_image_url: primary,
          component_count: (p.product_components as any[] | null)?.length ?? 0,
        } as VendorProduct;
      });

      setProducts(list);
    } catch (err: any) {
      toast({
        title: 'Failed to load products',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComponents = async (vendorId: string) => {
    try {
      // SECURITY: only this vendor's component library.
      const { data, error } = await supabase
        .from('component_library' as any)
        .select('id, component_sku, name, description, component_type, stock_level, normal_price, merchant_price, default_image_url')
        .eq('vendor_id', vendorId)
        .order('name');

      if (error) throw error;
      setComponents((data as any[]) ?? []);
    } catch {
      setComponents([]);
    }
  };

  const loadCategories = async () => {
    try {
      // Categories are public reads — shared across all vendors and admin.
      const { data, error } = await supabase
        .from('categories' as any)
        .select('id, name, active')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      setCategories(((data as any[]) ?? []) as CategoryRow[]);
    } catch {
      setCategories([]);
    }
  };

  // Inline new-category dialog state (vendors can create platform-wide
  // categories themselves; admin can clean up stale ones if needed)
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (name.length < 2) {
      toast({ title: 'Name too short', variant: 'destructive' });
      return;
    }
    setCreatingCategory(true);
    try {
      const slug = name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
      const { data, error } = await supabase
        .from('categories' as any)
        .insert({ name, slug, active: true })
        .select('id, name, active')
        .single();
      if (error) {
        if ((error as any).code === '23505') {
          toast({ title: 'Already exists', description: 'A category with that name already exists. Pick it from the list.', variant: 'destructive' });
          setCreatingCategory(false);
          return;
        }
        throw error;
      }
      const created = data as unknown as CategoryRow;
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, category_id: created.id }));
      toast({ title: 'Category added', description: created.name, variant: 'success' });
      setNewCategoryName('');
      setNewCategoryOpen(false);
    } catch (err: any) {
      toast({ title: 'Could not create category', description: err?.message ?? 'Try again.', variant: 'destructive' });
    } finally {
      setCreatingCategory(false);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.approval_status !== statusFilter) return false;
      if (!term) return true;
      return (
        p.name?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        p.slug?.toLowerCase().includes(term)
      );
    });
  }, [products, searchTerm, statusFilter]);

  const pendingCount = useMemo(
    () => products.filter((p) => p.approval_status === 'PENDING').length,
    [products]
  );
  const rejectedCount = useMemo(
    () => products.filter((p) => p.approval_status === 'REJECTED').length,
    [products]
  );

  const filteredComponents = useMemo(() => {
    const term = componentSearch.trim().toLowerCase();
    if (!term) return components;
    return components.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.component_sku?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.component_type?.toLowerCase().includes(term)
    );
  }, [components, componentSearch]);

  // Build a stable serialised snapshot of the "critical" fields that should
  // re-trigger admin review when changed. Cosmetic fields (brand/model/active)
  // are intentionally excluded.
  const criticalSnapshotFromForm = (f: FormState): string => {
    return JSON.stringify({
      name: f.name.trim(),
      description: (f.description ?? '').trim(),
      normal_price: f.normal_price,
      merchant_price: f.merchant_price,
      components: f.selectedComponents.map((c) => c.id).sort(),
      images: f.images
        .filter((i) => !i._uploading)
        .map((i) => i.url)
        .sort(),
    });
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      // Auto-update slug only if user hasn't manually edited it
      slug: prev.slug && prev.slug !== slugify(prev.name) ? prev.slug : slugify(name),
    }));
  };

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setOriginalCriticalSnapshot('');
    setOriginalImageUrls([]);
    setOriginalInstallationVideoUrls([]);
    setFormTab('basic');
    setDialogOpen(true);
  };

  const openEdit = async (product: VendorProduct) => {
    if (!vendor?.id) return;
    try {
      // SECURITY: every read filters by the parent product (which is already vendor-scoped).
      const { data: pcData } = await supabase
        .from('product_components' as any)
        .select('component_id, remark, display_order')
        .eq('product_id', product.id)
        .order('display_order');
      const pcRows = ((pcData as any[]) ?? []) as { component_id: string; remark: string | null; display_order: number }[];

      // Hydrate selectedComponents from the vendor's library.
      const compMap = new Map(components.map((c) => [c.id, c]));
      const selectedComponents: SelectedComponent[] = pcRows
        .map((r) => {
          const c = compMap.get(r.component_id);
          if (!c) return null;
          return { ...c, remark: r.remark ?? '' };
        })
        .filter(Boolean) as SelectedComponent[];

      const { data: imgData } = await supabase
        .from('product_images_new' as any)
        .select('id, url, alt_text, is_primary, sort_order, media_type')
        .eq('product_id', product.id)
        .order('sort_order');

      const images: ProductImage[] = ((imgData as any[]) ?? []).map((i, idx) => ({
        id: i.id,
        url: i.url,
        alt_text: i.alt_text ?? '',
        is_primary: !!i.is_primary,
        sort_order: i.sort_order ?? idx,
        media_type: (i.media_type ?? 'image') as 'image' | 'video',
      }));

      // Installation guide (optional, may not exist).
      const { data: installRow } = await supabase
        .from('product_installation_guides' as any)
        .select('recommended_time, workman_power, installation_price, installation_videos, difficulty_level, notes')
        .eq('product_id', product.id)
        .maybeSingle();
      const installRowData = installRow as any | null;

      const installation: InstallationFormData = installRowData
        ? {
            has_installation_guide: true,
            recommended_time: installRowData.recommended_time ?? '',
            workman_power: installRowData.workman_power ?? 1,
            installation_price: installRowData.installation_price ?? 0,
            installation_videos: ((installRowData.installation_videos as any[]) ?? []).map((v) => ({
              url: v.url ?? '',
              title: v.title ?? '',
              duration: v.duration ?? '',
            })),
            difficulty_level: (installRowData.difficulty_level as any) ?? 'medium',
            notes: installRowData.notes ?? '',
          }
        : {
            has_installation_guide: false,
            recommended_time: '',
            workman_power: 1,
            installation_price: 0,
            installation_videos: [],
            difficulty_level: 'medium',
            notes: '',
          };

      const nextForm: FormState = {
        name: product.name ?? '',
        slug: product.slug ?? slugify(product.name ?? ''),
        description: product.description ?? '',
        brand: product.brand ?? '',
        model: product.model ?? '',
        year_from: product.year_from,
        year_to: product.year_to,
        screen_size: (product.screen_size as string[]) ?? [],
        normal_price: product.normal_price,
        merchant_price: product.merchant_price,
        category_id: product.category_id ?? 'no-category',
        active: product.active,
        featured: !!product.featured,
        selectedComponents,
        images,
        installation,
      };

      setEditingProduct(product);
      setForm(nextForm);
      setOriginalCriticalSnapshot(criticalSnapshotFromForm(nextForm));
      setOriginalImageUrls(images.map((i) => i.url).filter(Boolean));
      setOriginalInstallationVideoUrls(
        installation.installation_videos.map((v) => v.url).filter(Boolean)
      );
      setFormTab('basic');
      setDialogOpen(true);
    } catch (err: any) {
      toast({
        title: 'Failed to open editor',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const addComponent = (component: VendorComponent) => {
    const exists = form.selectedComponents.some((c) => c.id === component.id);
    if (exists) return;
    setForm((prev) => ({
      ...prev,
      selectedComponents: [...prev.selectedComponents, { ...component, remark: '' }],
    }));
  };

  const removeComponent = (componentId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedComponents: prev.selectedComponents.filter((c) => c.id !== componentId),
    }));
  };

  // Upload a video file. For existing products, kicks off a background upload. For new
  // products, falls back to a synchronous upload.
  const processVideoFile = async (file: File): Promise<void> => {
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast({ title: 'Video too large', description: `${file.name} exceeds 2GB`, variant: 'destructive' });
      return;
    }
    if (editingProduct?.id) {
      const uploadId = enqueueVideoUpload({
        file,
        productId: editingProduct.id,
        productName: form.name || 'Untitled product',
        target: 'product-image',
      });
      const placeholderUrl = `pending-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setForm((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          {
            url: placeholderUrl,
            is_primary: false,
            sort_order: prev.images.length,
            alt_text: `${prev.name} - Video`,
            media_type: 'video' as const,
            _uploading: true,
            _uploadId: uploadId,
            _uploadFileName: file.name,
            _uploadFileSize: file.size,
          },
        ],
      }));
      return;
    }
    toast({
      title: 'Uploading video...',
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) — large videos may take several minutes, please keep this tab open`,
    });
    const fileExt = file.name.split('.').pop() || 'mp4';
    const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('product-videos').upload(filePath, file, { contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('product-videos').getPublicUrl(filePath);
    setForm((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          url: publicUrl,
          is_primary: false,
          sort_order: prev.images.length,
          alt_text: `${prev.name} - Video`,
          media_type: 'video' as const,
        },
      ],
    }));
  };

  // Installation video upload, mirrors admin behaviour.
  const processInstallationVideoFile = async (file: File, index: number): Promise<void> => {
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast({ title: 'Video too large', description: `${file.name} exceeds 2GB`, variant: 'destructive' });
      return;
    }
    const currentVideo =
      form.installation.installation_videos[index] ?? { url: '', title: '', duration: '' };
    if (editingProduct?.id) {
      const uploadId = enqueueVideoUpload({
        file,
        productId: editingProduct.id,
        productName: form.name || 'Untitled product',
        target: 'installation-video',
        installationMeta: { title: currentVideo.title, duration: currentVideo.duration },
      });
      setForm((prev) => {
        const videos = [...prev.installation.installation_videos];
        videos[index] = {
          ...videos[index],
          url: '',
          _uploading: true,
          _uploadId: uploadId,
          _uploadFileName: file.name,
          _uploadFileSize: file.size,
        };
        return { ...prev, installation: { ...prev.installation, installation_videos: videos } };
      });
      return;
    }
    toast({
      title: 'Uploading installation video...',
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    });
    const fileExt = file.name.split('.').pop() || 'mp4';
    const filePath = `installation-videos/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('product-videos').upload(filePath, file, { contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('product-videos').getPublicUrl(filePath);
    setForm((prev) => {
      const videos = [...prev.installation.installation_videos];
      videos[index] = { ...videos[index], url: publicUrl };
      return { ...prev, installation: { ...prev.installation, installation_videos: videos } };
    });
  };

  const handleSave = async () => {
    if (!vendor?.id) return;
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      setFormTab('basic');
      return;
    }
    if (form.selectedComponents.length === 0) {
      toast({
        title: 'Add at least one component',
        description: 'Vendor products are bundles of components from your component library.',
        variant: 'destructive',
      });
      setFormTab('components');
      return;
    }

    setSaving(true);
    try {
      const newSnapshot = criticalSnapshotFromForm(form);
      const criticalChanged = !!editingProduct && newSnapshot !== originalCriticalSnapshot;

      // Note: products_new has no price columns; prices live per-SKU on the
      // selected components (component_library.normal_price / merchant_price).
      const payload: Record<string, any> = {
        name: form.name.trim(),
        slug: form.slug?.trim() || slugify(form.name) || null,
        description: form.description.trim() || null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        year_from: form.year_from,
        year_to: form.year_to,
        screen_size: form.screen_size,
        category_id: form.category_id === 'no-category' ? null : form.category_id,
        active: form.active,
        featured: form.featured,
        vendor_id: vendor.id,
      };

      if (!editingProduct || criticalChanged) {
        payload.approval_status = 'PENDING';
      }

      let productId: string;
      if (editingProduct) {
        // SECURITY: scope update to vendor_id.
        const { data, error } = await supabase
          .from('products_new' as any)
          .update(payload)
          .eq('id', editingProduct.id)
          .eq('vendor_id', vendor.id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Product not found or access denied');
        productId = (data as any).id;
      } else {
        const { data, error } = await supabase
          .from('products_new' as any)
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        productId = (data as any).id;
      }

      // Sync product_components: delete and re-insert
      if (editingProduct) {
        const { error: delErr } = await supabase
          .from('product_components' as any)
          .delete()
          .eq('product_id', productId);
        if (delErr) throw delErr;
      }
      if (form.selectedComponents.length > 0) {
        const rows = form.selectedComponents.map((c, idx) => ({
          product_id: productId,
          component_id: c.id,
          is_required: false,
          is_default: idx === 0,
          display_order: idx,
          remark: c.remark || null,
        }));
        const { error: insErr } = await supabase
          .from('product_components' as any)
          .insert(rows);
        if (insErr) throw insErr;
      }

      // Sync images: diff-based to preserve background-uploaded videos
      const realImages = form.images.filter(
        (i) => !i._uploading && i.url && !i.url.startsWith('pending-upload-')
      );
      const realUrls = new Set(realImages.map((i) => i.url));
      const originalSet = new Set(originalImageUrls);

      if (editingProduct) {
        const removed = originalImageUrls.filter((u) => !realUrls.has(u));
        if (removed.length > 0) {
          const { error: delErr } = await supabase
            .from('product_images_new' as any)
            .delete()
            .eq('product_id', productId)
            .in('url', removed);
          if (delErr) throw delErr;
        }
        for (let i = 0; i < realImages.length; i++) {
          const img = realImages[i];
          if (!originalSet.has(img.url)) continue;
          const { error: updErr } = await supabase
            .from('product_images_new' as any)
            .update({
              sort_order: i,
              is_primary: img.is_primary,
              alt_text: img.alt_text ?? '',
            })
            .eq('product_id', productId)
            .eq('url', img.url);
          if (updErr) throw updErr;
        }
        const newRows = realImages
          .map((img, index) => ({ img, index }))
          .filter(({ img }) => !originalSet.has(img.url))
          .map(({ img, index }) => ({
            product_id: productId,
            url: img.url,
            alt_text: img.alt_text ?? '',
            is_primary: img.is_primary,
            sort_order: index,
            media_type: img.media_type ?? 'image',
          }));
        if (newRows.length > 0) {
          const { error: insErr } = await supabase
            .from('product_images_new' as any)
            .insert(newRows);
          if (insErr) throw insErr;
        }
      } else if (realImages.length > 0) {
        const rows = realImages.map((img, index) => ({
          product_id: productId,
          url: img.url,
          alt_text: img.alt_text ?? '',
          is_primary: img.is_primary,
          sort_order: index,
          media_type: img.media_type ?? 'image',
        }));
        const { error: insErr } = await supabase
          .from('product_images_new' as any)
          .insert(rows);
        if (insErr) throw insErr;
      }

      // Sync installation guide (race-safe with background queue)
      if (form.installation.has_installation_guide) {
        const formVideos = form.installation.installation_videos
          .filter((v) => v.url && !v._uploading)
          .map((v) => ({ url: v.url, title: v.title, duration: v.duration }));
        const formUrls = new Set(formVideos.map((v) => v.url));

        let finalVideos = formVideos;
        if (editingProduct) {
          const { data: dbRow } = await supabase
            .from('product_installation_guides' as any)
            .select('installation_videos')
            .eq('product_id', productId)
            .maybeSingle();
          const dbVideos: Array<{ url: string; title?: string; duration?: string }> =
            ((dbRow as any)?.installation_videos as any[] | undefined) ?? [];
          const snapshotSet = new Set(originalInstallationVideoUrls);
          const queueInserted = dbVideos.filter((v) => !snapshotSet.has(v.url) && !formUrls.has(v.url));
          finalVideos = [...formVideos, ...queueInserted];
        }

        const installationData = {
          product_id: productId,
          recommended_time: form.installation.recommended_time || null,
          workman_power: form.installation.workman_power || 1,
          installation_price: form.installation.installation_price || null,
          installation_videos: finalVideos,
          difficulty_level: form.installation.difficulty_level || 'medium',
          notes: form.installation.notes || null,
        };

        const { error: installError } = await supabase
          .from('product_installation_guides' as any)
          .upsert(installationData, { onConflict: 'product_id' });
        if (installError) throw installError;
      } else if (editingProduct) {
        await supabase
          .from('product_installation_guides' as any)
          .delete()
          .eq('product_id', productId);
      }

      const willReReview = !editingProduct || criticalChanged;
      toast({
        title: editingProduct ? 'Product updated' : 'Product created',
        description: willReReview
          ? 'Submitted for admin review — typically 1–2 business days.'
          : 'Cosmetic changes saved. Approval status unchanged.',
        variant: 'success',
      });

      setDialogOpen(false);
      setEditingProduct(null);
      void loadProducts(vendor.id);
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: VendorProduct) => {
    if (!vendor?.id) return;
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      // SECURITY: scope delete to vendor_id.
      const { error } = await supabase
        .from('products_new' as any)
        .delete()
        .eq('id', product.id)
        .eq('vendor_id', vendor.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${product.name} has been removed.`, variant: 'success' });
      void loadProducts(vendor.id);
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // ---- Render ----

  if (!vendor) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading vendor profile…
      </div>
    );
  }

  const hasNoComponents = components.length === 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Your catalog. New listings and edits to core fields go through admin review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => vendor?.id && loadProducts(vendor.id)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={openCreate}
            disabled={hasNoComponents}
            title={hasNoComponents ? 'Add components first to build product bundles' : undefined}
          >
            <Plus className="h-4 w-4 mr-2" />
            New product
          </Button>
        </div>
      </div>

      {/* Pending review banner */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">
                  {pendingCount} product{pendingCount === 1 ? '' : 's'} awaiting admin review
                </h3>
                <p className="text-sm text-amber-700">
                  AutoLab admins typically review listings within 1–2 business days. They'll appear on the customer
                  catalog once approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected banner */}
      {rejectedCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">
                  {rejectedCount} product{rejectedCount === 1 ? '' : 's'} were rejected
                </h3>
                <p className="text-sm text-red-700">
                  Review the rejection reason on each listing, edit the product to address it, and resubmit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No-components empty state */}
      {hasNoComponents && (
        <Card>
          <CardContent className="py-10 text-center">
            <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold mb-1">Start with a component</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Products are built by bundling SKUs from your component library. Create at least one component first, then come back here to publish it as a product.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/vendor/components">
                <Wrench className="h-4 w-4 mr-2" />
                Go to Components
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters + table */}
      {!hasNoComponents && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name, brand, model…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All ({products.length})</TabsTrigger>
                  <TabsTrigger value="PENDING">Pending ({pendingCount})</TabsTrigger>
                  <TabsTrigger value="APPROVED">
                    Approved ({products.filter((p) => p.approval_status === 'APPROVED').length})
                  </TabsTrigger>
                  <TabsTrigger value="REJECTED">Rejected ({rejectedCount})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading products…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold mb-1">
                  {products.length === 0 ? 'No products yet' : 'No matching products'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  {products.length === 0
                    ? 'Add your first listing — admin will review within 1–2 business days.'
                    : 'Try a different search or status filter.'}
                </p>
                {products.length === 0 && (
                  <Button variant="outline" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first product
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Components</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.primary_image_url ? (
                            <img
                              src={product.primary_image_url}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[product.brand, product.model].filter(Boolean).join(' · ') || '—'}
                          </div>
                          {product.approval_status === 'REJECTED' && product.rejection_reason && (
                            <div className="text-xs text-red-700 mt-1 max-w-md">
                              <strong>Reason:</strong> {product.rejection_reason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={product.approval_status} />
                            {!product.active && (
                              <Badge variant="outline" className="text-[11px] text-gray-500 w-fit px-2 py-0.5">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{product.component_count ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog — mirrors admin ProductsPro structure */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Edit your product and its components. Changes to core fields re-trigger admin review.'
                : 'Create a product by adding components from your library. New products are submitted for admin review.'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="flex flex-col min-h-0 flex-1 overflow-hidden"
          >
            <Tabs
              value={formTab}
              onValueChange={setFormTab}
              className="flex flex-col min-h-0 flex-1 overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                <TabsTrigger value="basic" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Product Details</span>
                  <span className="sm:hidden">Details</span>
                </TabsTrigger>
                <TabsTrigger value="components" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Components</span>
                  <span className="sm:hidden">Parts</span>
                  <span className="ml-1">({form.selectedComponents.length})</span>
                </TabsTrigger>
                <TabsTrigger value="images" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Images & Videos</span>
                  <span className="sm:hidden">Media</span>
                </TabsTrigger>
                <TabsTrigger value="installation" className="text-xs sm:text-sm px-1 sm:px-3">
                  <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">Installation</span>
                  <span className="sm:hidden">Install</span>
                </TabsTrigger>
              </TabsList>

              {/* === BASIC === */}
              <TabsContent value="basic" className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vp-name">Product Name *</Label>
                    <Input
                      id="vp-name"
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g., Honda Civic FC 9-inch Casing Kit"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vp-slug">URL Slug</Label>
                    <Input
                      id="vp-slug"
                      value={form.slug}
                      onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="auto-generated"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="vp-category">Category</Label>
                      <button
                        type="button"
                        onClick={() => { setNewCategoryName(''); setNewCategoryOpen(true); }}
                        className="text-xs text-primary hover:underline"
                      >
                        + New category
                      </button>
                    </div>
                    <Select
                      value={form.category_id}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger id="vp-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-category">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vp-brand">Brand *</Label>
                    <Input
                      id="vp-brand"
                      value={form.brand}
                      onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                      placeholder="e.g., Honda"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vp-model">Model *</Label>
                    <Input
                      id="vp-model"
                      value={form.model}
                      onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                      placeholder="e.g., Civic FC"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Screen Size <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select
                      value={form.screen_size[0] || 'none'}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, screen_size: value && value !== 'none' ? [value] : [] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Not applicable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not applicable</SelectItem>
                        {SCREEN_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Only relevant for head units / display products.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Year Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="vp-yf" className="text-sm text-muted-foreground">From</Label>
                        <Input
                          id="vp-yf"
                          type="number"
                          value={form.year_from ?? ''}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              year_from: e.target.value ? parseInt(e.target.value) : null,
                            }))
                          }
                          placeholder="e.g., 2020"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vp-yt" className="text-sm text-muted-foreground">To</Label>
                        <Input
                          id="vp-yt"
                          type="number"
                          value={form.year_to ?? ''}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              year_to: e.target.value ? parseInt(e.target.value) : null,
                            }))
                          }
                          placeholder="e.g., 2025"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Pricing:</span> price is set per component on the Components tab. Customers buy individual SKUs you bundle into this product.
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vp-desc">Description</Label>
                  <Textarea
                    id="vp-desc"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed product description..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="mt-6 pt-5 pb-2 border-t">
                  <h4 className="font-medium text-gray-900 mb-4">Product Settings</h4>
                  <div className="flex flex-wrap gap-8">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={form.active}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
                      />
                      <div>
                        <Label className="font-medium">Active</Label>
                        <p className="text-xs text-muted-foreground">Available for purchase</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={form.featured}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, featured: checked }))}
                      />
                      <div>
                        <Label className="font-medium">Featured</Label>
                        <p className="text-xs text-muted-foreground">Show on homepage (subject to admin approval)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* === COMPONENTS === */}
              <TabsContent value="components" className="flex-1 min-h-0">
                {/* Selected summary bar */}
                {form.selectedComponents.length > 0 && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-800">
                        {form.selectedComponents.length} component
                        {form.selectedComponents.length !== 1 ? 's' : ''} selected
                      </span>
                      <span className="text-xs text-green-600">
                        Total: RM
                        {form.selectedComponents
                          .reduce((sum, c) => sum + Number(c.normal_price ?? 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                      {form.selectedComponents.map((c) => (
                        <Badge
                          key={c.id}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-5 bg-white border border-green-200 cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors group"
                          onClick={() => removeComponent(c.id)}
                          title={`Remove ${c.name}`}
                        >
                          {c.component_sku}
                          <span className="ml-0.5 group-hover:text-red-500">×</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(55vh-3rem)] lg:h-[55vh]">
                  {/* Library */}
                  <div className="flex flex-col min-h-0 h-[35vh] sm:h-[40vh] lg:h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">
                        Library ({filteredComponents.length})
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        asChild
                      >
                        <Link to="/vendor/components">
                          <Plus className="mr-1 h-3 w-3" />
                          New Component
                        </Link>
                      </Button>
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search SKU, name, or type..."
                        value={componentSearch}
                        onChange={(e) => setComponentSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                      {filteredComponents.map((component) => {
                        const isAdded = form.selectedComponents.some((c) => c.id === component.id);
                        return (
                          <div
                            key={component.id}
                            className={`flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                              isAdded ? 'bg-green-50/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {component.default_image_url ? (
                                <img
                                  src={component.default_image_url}
                                  alt={component.name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-mono text-xs text-blue-600">
                                  {component.component_sku}
                                </div>
                                <div className="text-sm font-medium truncate">{component.name}</div>
                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                  {component.component_type && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                      {component.component_type}
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    Stock: {component.stock_level ?? 0}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    RM{Number(component.normal_price ?? 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={isAdded ? 'secondary' : 'default'}
                              className="h-7 text-xs flex-shrink-0"
                              onClick={() => addComponent(component)}
                              disabled={isAdded}
                            >
                              {isAdded ? 'Added' : 'Add'}
                            </Button>
                          </div>
                        );
                      })}
                      {filteredComponents.length === 0 && (
                        <div className="text-center py-8">
                          <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {componentSearch
                              ? 'No components found.'
                              : components.length === 0
                              ? 'You have no components yet.'
                              : 'No components yet.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected */}
                  <div className="flex flex-col min-h-0 h-[25vh] sm:h-[30vh] lg:h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Selected ({form.selectedComponents.length})</h4>
                      {form.selectedComponents.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Total: RM
                          {form.selectedComponents
                            .reduce((sum, c) => sum + Number(c.normal_price ?? 0), 0)
                            .toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto border rounded-lg min-h-0 bg-gray-50/50">
                      {form.selectedComponents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                          <Package className="h-10 w-10 text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">No components selected</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="hidden lg:inline">Add components from the library on the left</span>
                            <span className="lg:hidden">Add components from the library above</span>
                          </p>
                        </div>
                      ) : (
                        form.selectedComponents.map((component, index) => (
                          <div
                            key={component.id}
                            draggable={dragIndex === index}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverIndex(index);
                            }}
                            onDragLeave={() => setDragOverIndex(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (dragIndex === null || dragIndex === index) {
                                setDragIndex(null);
                                setDragOverIndex(null);
                                return;
                              }
                              setForm((prev) => {
                                const items = [...prev.selectedComponents];
                                const [moved] = items.splice(dragIndex, 1);
                                items.splice(index, 0, moved);
                                return { ...prev, selectedComponents: items };
                              });
                              setDragIndex(null);
                              setDragOverIndex(null);
                            }}
                            onDragEnd={() => {
                              setDragIndex(null);
                              setDragOverIndex(null);
                            }}
                            className={`flex items-center justify-between gap-1 px-2 py-2 border-b last:border-b-0 transition-colors ${
                              dragIndex === index
                                ? 'opacity-40 bg-gray-100'
                                : dragOverIndex === index
                                ? 'bg-lime-50 border-t-2 border-t-lime-400'
                                : 'bg-white hover:bg-green-50/50'
                            }`}
                          >
                            <div
                              className="cursor-grab active:cursor-grabbing flex-shrink-0 p-0.5 text-gray-300 hover:text-gray-500"
                              onMouseDown={() => setDragIndex(index)}
                              onMouseUp={() => {
                                if (!dragOverIndex && dragOverIndex !== 0) setDragIndex(null);
                              }}
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {component.default_image_url ? (
                                <img
                                  src={component.default_image_url}
                                  alt={component.name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-xs text-blue-600">
                                  {component.component_sku}
                                </div>
                                <div className="text-sm font-medium truncate">{component.name}</div>
                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                  {component.component_type && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                      {component.component_type}
                                    </Badge>
                                  )}
                                  <span className="text-[10px]">
                                    RM{Number(component.normal_price ?? 0).toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    (cost: RM{Number(component.merchant_price ?? 0).toFixed(2)})
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Remark e.g. H Spec, X Spec"
                                  value={component.remark || ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const newRemark = e.target.value;
                                    setForm((prev) => ({
                                      ...prev,
                                      selectedComponents: prev.selectedComponents.map((c) =>
                                        c.id === component.id ? { ...c, remark: newRemark } : c
                                      ),
                                    }));
                                  }}
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 mt-1 text-gray-600 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              onClick={() => removeComponent(component.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* === IMAGES === */}
              <TabsContent value="images" className="space-y-4 flex-1 min-h-0 pr-1">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Product Media</h3>
                    <span className="text-xs text-gray-400">{form.images.length}/15 slots used</span>
                  </div>

                  {[0, 5, 10].map((rowStart) => (
                    <div
                      key={rowStart}
                      className={`grid grid-cols-5 gap-2 ${rowStart < 10 ? 'mb-2' : ''}`}
                    >
                      {[...Array(5)].map((_, i) => {
                        const index = rowStart + i;
                        const media = form.images[index];
                        const isVideo = media?.media_type === 'video';
                        return (
                          <div
                            key={index}
                            className="relative"
                            onDragOver={(e) => {
                              if (mediaDragIndex !== null) {
                                e.preventDefault();
                                setMediaDragOverIndex(index);
                              }
                            }}
                            onDragLeave={() => setMediaDragOverIndex(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (mediaDragIndex === null || mediaDragIndex === index) {
                                setMediaDragIndex(null);
                                setMediaDragOverIndex(null);
                                return;
                              }
                              setForm((prev) => {
                                const items = [...prev.images];
                                const [moved] = items.splice(mediaDragIndex, 1);
                                items.splice(
                                  index > mediaDragIndex ? index - (index >= items.length + 1 ? 1 : 0) : index,
                                  0,
                                  moved
                                );
                                return {
                                  ...prev,
                                  images: items.map((img, idx) => ({ ...img, is_primary: idx === 0 })),
                                };
                              });
                              setMediaDragIndex(null);
                              setMediaDragOverIndex(null);
                            }}
                          >
                            {media?._uploading ? (
                              <div className="aspect-square rounded-lg border-2 border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 p-2 relative">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                <span
                                  className="text-[9px] font-medium text-blue-700 truncate w-full text-center px-1"
                                  title={media._uploadFileName}
                                >
                                  {media._uploadFileName}
                                </span>
                                <span className="text-[8px] text-blue-600">
                                  {((media._uploadFileSize || 0) / 1024 / 1024).toFixed(0)}MB · Uploading...
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (media._uploadId) cancelUpload(media._uploadId);
                                    setForm((prev) => ({
                                      ...prev,
                                      images: prev.images.filter((img) => img._uploadId !== media._uploadId),
                                    }));
                                  }}
                                  className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                  title="Cancel upload"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ) : media?.url ? (
                              <div
                                className={`relative group aspect-square rounded-lg border overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing ${
                                  mediaDragIndex === index ? 'opacity-40' : ''
                                } ${mediaDragOverIndex === index ? 'ring-2 ring-lime-400' : ''}`}
                                draggable
                                onDragStart={() => setMediaDragIndex(index)}
                                onDragEnd={() => {
                                  setMediaDragIndex(null);
                                  setMediaDragOverIndex(null);
                                }}
                              >
                                {isVideo ? (
                                  isEmbeddableUrl(media.url) ? (
                                    <iframe
                                      src={getEmbedUrl(media.url)!}
                                      className="w-full h-full"
                                      allowFullScreen
                                    />
                                  ) : (
                                    <video
                                      src={media.url}
                                      className="w-full h-full object-cover"
                                      preload="metadata"
                                    />
                                  )
                                ) : (
                                  <img
                                    src={media.url}
                                    alt={`Media ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                  {!isVideo && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingImage(media.url);
                                        setViewingImageInfo({
                                          url: media.url,
                                          title: `Product Image ${index + 1}`,
                                        });
                                      }}
                                      className="p-1.5 bg-white/90 rounded-full text-gray-700 hover:bg-white"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newImages = form.images.filter((_, i2) => i2 !== index);
                                      if (newImages.length > 0 && !newImages.some((img) => img.is_primary)) {
                                        newImages[0] = { ...newImages[0], is_primary: true };
                                      }
                                      setForm((prev) => ({ ...prev, images: newImages }));
                                    }}
                                    className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                                {index === 0 && (
                                  <span className="absolute top-1 left-1 text-[8px] bg-black/70 text-white px-1 rounded">
                                    Primary
                                  </span>
                                )}
                                {isVideo && (
                                  <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 text-white px-1 rounded flex items-center gap-0.5">
                                    <Play className="h-2 w-2" /> Video
                                  </span>
                                )}
                              </div>
                            ) : (
                              <label
                                className={`aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex flex-col items-center justify-center transition-colors bg-gray-50/50 cursor-pointer ${
                                  mediaDragOverIndex === index ? 'ring-2 ring-lime-400 border-lime-400' : ''
                                }`}
                              >
                                <Upload className="h-4 w-4 text-gray-300 mb-0.5" />
                                <span className="text-[9px] text-gray-400">{index + 1}</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                                  multiple
                                  className="hidden"
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (!files.length) return;
                                    const slotsAvailable = 15 - form.images.length;
                                    const filesToUpload = files.slice(0, slotsAvailable);
                                    for (const file of filesToUpload) {
                                      const isVideoFile = file.type.startsWith('video/');
                                      try {
                                        if (isVideoFile) {
                                          await processVideoFile(file);
                                        } else {
                                          const imageCompression = (await import('browser-image-compression')).default;
                                          const compressed = await imageCompression(file, {
                                            maxSizeMB: 0.5,
                                            maxWidthOrHeight: 1200,
                                            useWebWorker: true,
                                            fileType: 'image/webp',
                                          });
                                          const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
                                          const { error } = await supabase.storage
                                            .from('product-images')
                                            .upload(filePath, compressed, { contentType: 'image/webp' });
                                          if (error) throw error;
                                          const {
                                            data: { publicUrl },
                                          } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                          setForm((prev) => ({
                                            ...prev,
                                            images: [
                                              ...prev.images,
                                              {
                                                url: publicUrl,
                                                is_primary: prev.images.length === 0,
                                                sort_order: prev.images.length,
                                                alt_text: `${prev.name} - Image`,
                                                media_type: 'image' as const,
                                              },
                                            ],
                                          }));
                                        }
                                      } catch (err: any) {
                                        toast({
                                          title: 'Upload failed',
                                          description: err?.message ?? 'Unknown error',
                                          variant: 'destructive',
                                        });
                                      }
                                    }
                                    {
                                      const isEditingExisting = !!editingProduct?.id;
                                      const videos = filesToUpload.filter((f) => f.type.startsWith('video/')).length;
                                      const images = filesToUpload.length - videos;
                                      const parts: string[] = [];
                                      if (images > 0) parts.push(`${images} image${images === 1 ? '' : 's'} uploaded`);
                                      if (videos > 0) {
                                        if (isEditingExisting)
                                          parts.push(`${videos} video${videos === 1 ? '' : 's'} uploading in background`);
                                        else parts.push(`${videos} video${videos === 1 ? '' : 's'} uploaded`);
                                      }
                                      if (parts.length > 0)
                                        toast({ title: 'Files added', description: parts.join(', ') });
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Bulk Upload + URL Input */}
                  <div className="mt-3 flex gap-2">
                    <label className="flex items-center gap-1.5 px-3 h-8 bg-gray-900 text-white text-xs font-medium rounded-md cursor-pointer hover:bg-gray-800 transition-colors shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      Select Files
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          const currentCount = form.images.length;
                          const slotsAvailable = 15 - currentCount;
                          if (files.length > slotsAvailable) {
                            toast({
                              title: `Only ${slotsAvailable} slots available`,
                              description: `Selected ${files.length} files, uploading first ${slotsAvailable}`,
                              variant: 'destructive',
                            });
                          }
                          const filesToUpload = files.slice(0, slotsAvailable);
                          for (const file of filesToUpload) {
                            const isVideoFile = file.type.startsWith('video/');
                            try {
                              if (isVideoFile) {
                                await processVideoFile(file);
                              } else {
                                const imageCompression = (await import('browser-image-compression')).default;
                                const compressed = await imageCompression(file, {
                                  maxSizeMB: 0.5,
                                  maxWidthOrHeight: 1200,
                                  useWebWorker: true,
                                  fileType: 'image/webp',
                                });
                                const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
                                const { error } = await supabase.storage
                                  .from('product-images')
                                  .upload(filePath, compressed, { contentType: 'image/webp' });
                                if (error) throw error;
                                const {
                                  data: { publicUrl },
                                } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                setForm((prev) => ({
                                  ...prev,
                                  images: [
                                    ...prev.images,
                                    {
                                      url: publicUrl,
                                      is_primary: prev.images.length === 0,
                                      sort_order: prev.images.length,
                                      alt_text: `${prev.name} - Image`,
                                      media_type: 'image' as const,
                                    },
                                  ],
                                }));
                              }
                            } catch (err: any) {
                              toast({
                                title: 'Upload failed',
                                description: err?.message ?? 'Unknown error',
                                variant: 'destructive',
                              });
                            }
                          }
                          {
                            const isEditingExisting = !!editingProduct?.id;
                            const videos = filesToUpload.filter((f) => f.type.startsWith('video/')).length;
                            const images = filesToUpload.length - videos;
                            const parts: string[] = [];
                            if (images > 0) parts.push(`${images} image${images === 1 ? '' : 's'} uploaded`);
                            if (videos > 0) {
                              if (isEditingExisting)
                                parts.push(`${videos} video${videos === 1 ? '' : 's'} uploading in background`);
                              else parts.push(`${videos} video${videos === 1 ? '' : 's'} uploaded`);
                            }
                            if (parts.length > 0) toast({ title: 'Files added', description: parts.join(', ') });
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <Input
                      placeholder="Paste image/video URL and press Enter..."
                      className="text-xs h-8 border-gray-900"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const url = (e.target as HTMLInputElement).value.trim();
                          if (!url) return;
                          if (form.images.length >= 15) {
                            toast({
                              title: 'All slots full',
                              description: 'Remove a media item first',
                              variant: 'destructive',
                            });
                            return;
                          }
                          const isVideoUrl = isEmbeddableUrl(url) || /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
                          setForm((prev) => ({
                            ...prev,
                            images: [
                              ...prev.images,
                              {
                                url,
                                is_primary: prev.images.length === 0,
                                sort_order: prev.images.length,
                                alt_text: `${prev.name} - ${isVideoUrl ? 'Video' : 'Image'}`,
                                media_type: isVideoUrl ? 'video' : 'image',
                              },
                            ],
                          }));
                          (e.target as HTMLInputElement).value = '';
                          if (isVideoUrl)
                            toast({
                              title: 'Video added',
                              description: isEmbeddableUrl(url) ? 'YouTube/Vimeo video added' : 'Video URL added',
                            });
                        }
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Click any empty slot or "Select Files" for batch upload. Images & videos auto-detected. Paste URLs
                    for YouTube/Vimeo.
                  </p>
                </div>
              </TabsContent>

              {/* === INSTALLATION === */}
              <TabsContent value="installation" className="space-y-6 overflow-y-auto flex-1 min-h-0 pr-1">
                <div className="space-y-4">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center space-x-3 pb-4 border-b">
                    <Switch
                      checked={form.installation.has_installation_guide}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          installation: { ...prev.installation, has_installation_guide: checked },
                        }))
                      }
                    />
                    <div>
                      <Label className="text-base font-medium">Include Installation Guide</Label>
                      <p className="text-sm text-muted-foreground">
                        Add installation information and videos for this product
                      </p>
                    </div>
                  </div>

                  {form.installation.has_installation_guide && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Recommended Time
                          </Label>
                          <Input
                            value={form.installation.recommended_time}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                installation: { ...prev.installation, recommended_time: e.target.value },
                              }))
                            }
                            placeholder="e.g., 30-45 minutes"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Workman Power
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={form.installation.workman_power}
                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                installation: {
                                  ...prev.installation,
                                  workman_power: parseInt(e.target.value) || 1,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            Installation Price (RM)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.installation.installation_price}
                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                installation: {
                                  ...prev.installation,
                                  installation_price: parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select
                          value={form.installation.difficulty_level}
                          onValueChange={(value: 'easy' | 'medium' | 'hard' | 'expert') =>
                            setForm((prev) => ({
                              ...prev,
                              installation: { ...prev.installation, difficulty_level: value },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Installation Videos */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-1">
                            <Video className="h-4 w-4" />
                            Installation Videos
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                installation: {
                                  ...prev.installation,
                                  installation_videos: [
                                    ...prev.installation.installation_videos,
                                    { url: '', title: '', duration: '' },
                                  ],
                                },
                              }))
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Video
                          </Button>
                        </div>

                        {form.installation.installation_videos.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No videos added yet. Click "Add Video" to include installation videos.
                          </p>
                        )}

                        {form.installation.installation_videos.map((video, index) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <Label className="text-xs text-muted-foreground pt-1">
                                  Video {index + 1} — paste a YouTube/Vimeo URL or upload an MP4 (max 2GB)
                                </Label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const videos = form.installation.installation_videos.filter(
                                      (_, i) => i !== index
                                    );
                                    setForm((prev) => ({
                                      ...prev,
                                      installation: { ...prev.installation, installation_videos: videos },
                                    }));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              {video._uploading ? (
                                <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4 flex items-center gap-3">
                                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" title={video._uploadFileName}>
                                      {video._uploadFileName}
                                    </p>
                                    <p className="text-xs text-blue-700">
                                      {((video._uploadFileSize || 0) / 1024 / 1024).toFixed(1)}MB · uploading in
                                      background — safe to save and close this modal, but don't refresh until done
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => {
                                      if (video._uploadId) cancelUpload(video._uploadId);
                                      const videos = form.installation.installation_videos.filter(
                                        (v) => v._uploadId !== video._uploadId
                                      );
                                      setForm((prev) => ({
                                        ...prev,
                                        installation: { ...prev.installation, installation_videos: videos },
                                      }));
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : video.url ? (
                                <div className="relative group">
                                  <div className="aspect-video w-full max-w-xs rounded-lg border overflow-hidden bg-gray-900">
                                    {isEmbeddableUrl(video.url) ? (
                                      <iframe
                                        src={getEmbedUrl(video.url)!}
                                        className="w-full h-full"
                                        allowFullScreen
                                      />
                                    ) : (
                                      <video
                                        src={`${video.url}#t=0.1`}
                                        className="w-full h-full object-contain"
                                        controls
                                        preload="metadata"
                                      />
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      const videos = [...form.installation.installation_videos];
                                      videos[index] = { ...videos[index], url: '' };
                                      setForm((prev) => ({
                                        ...prev,
                                        installation: { ...prev.installation, installation_videos: videos },
                                      }));
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Tabs defaultValue="upload" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="upload">Upload File</TabsTrigger>
                                    <TabsTrigger value="url">From URL</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="upload" className="space-y-3">
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors">
                                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                      <span className="text-sm text-gray-600">Click to select a video file</span>
                                      <span className="text-xs text-gray-500 mt-1">
                                        MP4, WebM, MOV — up to 2GB
                                      </span>
                                      <input
                                        type="file"
                                        accept="video/mp4,video/webm,video/quicktime"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          try {
                                            await processInstallationVideoFile(file, index);
                                          } catch (err: any) {
                                            toast({
                                              title: 'Upload failed',
                                              description: err?.message ?? 'Unknown error',
                                              variant: 'destructive',
                                            });
                                          }
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                  </TabsContent>
                                  <TabsContent value="url" className="space-y-3">
                                    <Input
                                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const url = (e.target as HTMLInputElement).value.trim();
                                          if (!url) return;
                                          const videos = [...form.installation.installation_videos];
                                          videos[index] = { ...videos[index], url };
                                          setForm((prev) => ({
                                            ...prev,
                                            installation: {
                                              ...prev.installation,
                                              installation_videos: videos,
                                            },
                                          }));
                                        }
                                      }}
                                    />
                                    <p className="text-xs text-gray-500">
                                      Press Enter to apply. YouTube and Vimeo links are embedded.
                                    </p>
                                  </TabsContent>
                                </Tabs>
                              )}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Title</Label>
                                  <Input
                                    value={video.title}
                                    onChange={(e) => {
                                      const videos = [...form.installation.installation_videos];
                                      videos[index] = { ...videos[index], title: e.target.value };
                                      setForm((prev) => ({
                                        ...prev,
                                        installation: { ...prev.installation, installation_videos: videos },
                                      }));
                                    }}
                                    placeholder="e.g. Step-by-step installation"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Duration</Label>
                                  <Input
                                    value={video.duration}
                                    onChange={(e) => {
                                      const videos = [...form.installation.installation_videos];
                                      videos[index] = { ...videos[index], duration: e.target.value };
                                      setForm((prev) => ({
                                        ...prev,
                                        installation: { ...prev.installation, installation_videos: videos },
                                      }));
                                    }}
                                    placeholder="15:30"
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label>Additional Notes</Label>
                        <Textarea
                          value={form.installation.notes}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              installation: { ...prev.installation, notes: e.target.value },
                            }))
                          }
                          placeholder="Any additional notes for customers about installation..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-4 mt-4 border-t flex-shrink-0">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingProduct ? 'Save Changes' : 'Submit for Review'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal — opens when the Eye button is clicked on a media slot */}
      {viewingImage && (
        <Dialog
          open={!!viewingImage}
          onOpenChange={() => {
            setViewingImage(null);
            setViewingImageInfo(null);
          }}
        >
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {viewingImageInfo?.title || 'Image Viewer'}
              </DialogTitle>
              <DialogDescription className="text-sm">View image in full size</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center overflow-hidden">
              <img
                src={viewingImage}
                alt={viewingImageInfo?.title || 'Full size view'}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-image.png';
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create-category dialog (vendors can add platform-wide categories) */}
      <Dialog open={newCategoryOpen} onOpenChange={(o) => { if (!o && !creatingCategory) { setNewCategoryOpen(false); setNewCategoryName(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-name">Category name</Label>
              <Input
                id="new-cat-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Subwoofers"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleCreateCategory(); } }}
              />
              <p className="text-[10px] text-muted-foreground">Categories are shared across all sellers. Pick a clear, generic name.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setNewCategoryOpen(false); setNewCategoryName(''); }} disabled={creatingCategory}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={creatingCategory || newCategoryName.trim().length < 2}>
              {creatingCategory ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
