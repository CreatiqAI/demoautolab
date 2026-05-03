import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, RefreshCw, Search, Trash2, Edit, DollarSign, Package, Clock, Users, Video, Wrench, Upload, X, Play, Link, GripVertical, Eye, RotateCcw, AlertTriangle, Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';
import { isEmbeddableUrl, getEmbedUrl } from '@/components/ui/video-upload';
import { useUploadQueue, PRODUCT_MEDIA_UPLOADED_EVENT, PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT, INSTALLATION_VIDEO_UPLOADED_EVENT, INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT, type ProductMediaUploadedDetail, type InstallationVideoUploadedDetail } from '@/hooks/useUploadQueue';
import { deleteStorageFiles, findOrphanStorageFiles, deleteOrphans } from '@/lib/storageCleanup';

interface ComponentSearchResult {
  id: string;
  component_sku: string;
  name: string;
  description: string;
  component_type: string;
  stock_level: number;
  normal_price: number;
  merchant_price: number;
  default_image_url?: string;
  relevance_score?: number;
}

interface SelectedComponent extends ComponentSearchResult {
  selected: boolean;
  remark?: string;
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

interface ProductFormData {
  name: string;
  description: string;
  brand: string;
  model: string;
  category_id: string;
  year_from: number | null;
  year_to: number | null;
  screen_size: string[];
  slug: string;
  active: boolean;
  featured: boolean;
  images: Array<{
    url: string;
    is_primary: boolean;
    alt_text?: string;
    media_type: 'image' | 'video';
    _uploadId?: string;
    _uploading?: boolean;
    _uploadFileName?: string;
    _uploadFileSize?: number;
  }>;
  selectedComponents: SelectedComponent[];
  installation: InstallationFormData;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

const SCREEN_SIZES = [
  { value: '9', label: '9 inch' },
  { value: '10', label: '10 inch' },
  { value: '12.5', label: '12.5 inch' }
];

export default function ProductsPro() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]);
  const [productListTab, setProductListTab] = useState('active');
  const [duplicateProducts, setDuplicateProducts] = useState<{name: string; count: number; items: any[]}[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingImageInfo, setViewingImageInfo] = useState<{url: string, title: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [mediaDragIndex, setMediaDragIndex] = useState<number | null>(null);
  const [mediaDragOverIndex, setMediaDragOverIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all-brands');
  const [screenSizeFilter, setScreenSizeFilter] = useState('all-sizes');
  const [statusFilter, setStatusFilter] = useState('all-status');
  const [searchResults, setSearchResults] = useState<ComponentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allComponents, setAllComponents] = useState<ComponentSearchResult[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // Snapshot of media URLs that existed in DB when the modal opened. Used by
  // the diff-based save so background-uploaded videos that arrive after open
  // are NOT touched (they're in DB but not in this snapshot).
  const [originalMediaUrls, setOriginalMediaUrls] = useState<string[]>([]);
  const [originalInstallationVideoUrls, setOriginalInstallationVideoUrls] = useState<string[]>([]);

  // Orphan-storage cleanup tool state
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupScanning, setCleanupScanning] = useState(false);
  const [cleanupDeleting, setCleanupDeleting] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    orphans: { bucket: string; path: string }[];
    totalScanned: number;
    referencedCount: number;
  } | null>(null);

  const { toast } = useToast();
  const { enqueueVideoUpload, cancelUpload } = useUploadQueue();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    brand: '',
    model: '',
    category_id: 'no-category',
    year_from: null,
    year_to: null,
    screen_size: [],
    slug: '',
    active: true,
    featured: false,
    images: [],
    selectedComponents: [],
    installation: {
      has_installation_guide: false,
      recommended_time: '',
      workman_power: 1,
      installation_price: 0,
      installation_videos: [],
      difficulty_level: 'medium',
      notes: ''
    }
  });

  useEffect(() => {
    fetchProducts();
    fetchDeletedProducts();
    fetchAllComponents();
    fetchCategories();
  }, []);

  // Sync placeholder slots with background upload events. When a background upload finishes,
  // find the matching placeholder by upload ID and replace it with the real URL. When an
  // upload is cancelled or fails, remove the placeholder.
  useEffect(() => {
    const completedHandler = (e: Event) => {
      const detail = (e as CustomEvent<ProductMediaUploadedDetail>).detail;
      if (!editingProduct?.id || detail.productId !== editingProduct.id) return;
      setFormData(prev => {
        const idx = prev.images.findIndex(img => img._uploadId === detail.media.uploadId);
        if (idx === -1) {
          if (prev.images.some(img => img.url === detail.media.url)) return prev;
          return {
            ...prev,
            images: [
              ...prev.images,
              {
                url: detail.media.url,
                is_primary: false,
                alt_text: `${prev.name} - Video`,
                media_type: 'video' as const,
              },
            ],
          };
        }
        const next = [...prev.images];
        next[idx] = {
          url: detail.media.url,
          is_primary: next[idx].is_primary,
          alt_text: `${prev.name} - Video`,
          media_type: 'video' as const,
        };
        return { ...prev, images: next };
      });
    };
    const removedHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ uploadId: string }>).detail;
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter(img => img._uploadId !== detail.uploadId),
      }));
    };
    const installCompletedHandler = (e: Event) => {
      const detail = (e as CustomEvent<InstallationVideoUploadedDetail>).detail;
      if (!editingProduct?.id || detail.productId !== editingProduct.id) return;
      setFormData(prev => {
        const idx = prev.installation.installation_videos.findIndex(v => v._uploadId === detail.uploadId);
        if (idx === -1) {
          if (prev.installation.installation_videos.some(v => v.url === detail.url)) return prev;
          return {
            ...prev,
            installation: {
              ...prev.installation,
              installation_videos: [
                ...prev.installation.installation_videos,
                { url: detail.url, title: detail.title, duration: detail.duration },
              ],
            },
          };
        }
        const next = [...prev.installation.installation_videos];
        next[idx] = {
          url: detail.url,
          title: next[idx].title,
          duration: next[idx].duration,
        };
        return {
          ...prev,
          installation: { ...prev.installation, installation_videos: next },
        };
      });
    };
    const installRemovedHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ uploadId: string }>).detail;
      setFormData(prev => ({
        ...prev,
        installation: {
          ...prev.installation,
          installation_videos: prev.installation.installation_videos.filter(
            v => v._uploadId !== detail.uploadId
          ),
        },
      }));
    };

    window.addEventListener(PRODUCT_MEDIA_UPLOADED_EVENT, completedHandler);
    window.addEventListener(PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT, removedHandler);
    window.addEventListener(INSTALLATION_VIDEO_UPLOADED_EVENT, installCompletedHandler);
    window.addEventListener(INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT, installRemovedHandler);
    return () => {
      window.removeEventListener(PRODUCT_MEDIA_UPLOADED_EVENT, completedHandler);
      window.removeEventListener(PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT, removedHandler);
      window.removeEventListener(INSTALLATION_VIDEO_UPLOADED_EVENT, installCompletedHandler);
      window.removeEventListener(INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT, installRemovedHandler);
    };
  }, [editingProduct?.id]);

  // Upload a video file. For existing products, kicks off a background upload that survives
  // navigation, with a placeholder slot rendered immediately so the admin sees the file is
  // in progress. For new products (no id yet), falls back to a synchronous upload so the URL
  // is available before the user clicks Save.
  const processVideoFile = async (file: File): Promise<void> => {
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast({ title: 'Video too large', description: `${file.name} exceeds 2GB`, variant: 'destructive' });
      return;
    }
    if (editingProduct?.id) {
      const uploadId = enqueueVideoUpload({
        file,
        productId: editingProduct.id,
        productName: formData.name || 'Untitled product',
      });
      setFormData(prev => ({
        ...prev,
        images: [
          ...prev.images,
          {
            url: '',
            is_primary: false,
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
    toast({ title: 'Uploading video...', description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) — large videos may take several minutes, please keep this tab open` });
    const fileExt = file.name.split('.').pop() || 'mp4';
    const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('product-videos').upload(filePath, file, { contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('product-videos').getPublicUrl(filePath);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { url: publicUrl, is_primary: false, alt_text: `${prev.name} - Video`, media_type: 'video' as const }],
    }));
  };

  // Upload an installation video. For existing products, uses the background queue
  // and shows a placeholder card immediately. The queue auto-upserts the entry into
  // product_installation_guides.installation_videos when the upload completes, so
  // closing the modal mid-upload is safe — the entry will still appear after refresh.
  const processInstallationVideoFile = async (file: File, index: number): Promise<void> => {
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast({ title: 'Video too large', description: `${file.name} exceeds 2GB`, variant: 'destructive' });
      return;
    }
    const currentVideo = formData.installation.installation_videos[index] ?? { url: '', title: '', duration: '' };
    if (editingProduct?.id) {
      const uploadId = enqueueVideoUpload({
        file,
        productId: editingProduct.id,
        productName: formData.name || 'Untitled product',
        target: 'installation-video',
        installationMeta: { title: currentVideo.title, duration: currentVideo.duration },
      });
      setFormData(prev => {
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
    // New product (no id yet) — sync upload so URL is captured before save.
    toast({ title: 'Uploading installation video...', description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)` });
    const fileExt = file.name.split('.').pop() || 'mp4';
    const filePath = `installation-videos/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('product-videos').upload(filePath, file, { contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('product-videos').getPublicUrl(filePath);
    setFormData(prev => {
      const videos = [...prev.installation.installation_videos];
      videos[index] = { ...videos[index], url: publicUrl };
      return { ...prev, installation: { ...prev.installation, installation_videos: videos } };
    });
  };

  // Filter products based on search and filters
  useEffect(() => {
    let filtered = products;

    if (productSearchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.model.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(productSearchTerm.toLowerCase())
      );
    }

    if (brandFilter && brandFilter !== 'all-brands') {
      filtered = filtered.filter(product => product.brand === brandFilter);
    }

    if (screenSizeFilter && screenSizeFilter !== 'all-sizes') {
      filtered = filtered.filter(product => 
        product.screen_size && product.screen_size.includes(screenSizeFilter)
      );
    }

    if (statusFilter && statusFilter !== 'all-status') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(product => product.active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(product => !product.active);
      } else if (statusFilter === 'featured') {
        filtered = filtered.filter(product => product.featured);
      }
    }

    setFilteredProducts(filtered);
  }, [products, productSearchTerm, brandFilter, screenSizeFilter, statusFilter]);

  // Debounced search for components
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        searchComponents(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Try with category join first
      let { data, error } = await supabase
        .from('products_new' as any)
        .select(`
          *,
          categories!products_new_category_id_fkey(
            id,
            name,
            description
          ),
          product_components (
            id
          )
        `)
        .order('updated_at', { ascending: false, nullsFirst: false });

      // If the join fails, try without category join
      if (error) {
        const fallbackResult = await supabase
          .from('products_new' as any)
          .select(`
            *,
            product_components (
              id
            )
          `)
          .order('updated_at', { ascending: false, nullsFirst: false });

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      const productList = (data as any) || [];
      setProducts(productList);
      setFilteredProducts(productList);

      // Detect duplicate product names/slugs
      const nameMap = new Map<string, any[]>();
      productList.forEach((p: any) => {
        const key = (p.slug || p.name || '').toLowerCase().trim();
        if (!key) return;
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(p);
      });
      setDuplicateProducts(
        Array.from(nameMap.entries())
          .filter(([, items]) => items.length > 1)
          .map(([, items]) => ({ name: items[0].name, count: items.length, items }))
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products_new' as any)
        .select('id, name, brand, model, slug, active, updated_at')
        .eq('active', false)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (!error) setDeletedProducts((data as any) || []);
    } catch {
      // No deleted products
    }
  };

  const handleSoftDeleteProduct = async (product: any) => {
    if (!confirm(`Delete "${product.name}"? It will be moved to Recently Deleted.`)) return;
    try {
      const { error } = await supabase
        .from('products_new' as any)
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) throw error;
      setDeletedProducts(prev => [{ ...product, active: false }, ...prev]);
      setProducts(prev => prev.filter(p => p.id !== product.id));
      setFilteredProducts(prev => prev.filter(p => p.id !== product.id));
      toast({ title: "Deleted", description: `${product.name} moved to Recently Deleted` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const handleRestoreProduct = async (product: any) => {
    try {
      const { error } = await supabase
        .from('products_new' as any)
        .update({ active: true, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) throw error;
      setDeletedProducts(prev => prev.filter(p => p.id !== product.id));
      fetchProducts();
      toast({ title: "Restored", description: `${product.name} has been restored` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to restore", variant: "destructive" });
    }
  };

  const handleScanOrphans = async () => {
    setCleanupScanning(true);
    setCleanupResult(null);
    try {
      const result = await findOrphanStorageFiles();
      setCleanupResult(result);
      toast({
        title: 'Scan complete',
        description: `Scanned ${result.totalScanned} files · ${result.orphans.length} orphan${result.orphans.length === 1 ? '' : 's'} found`,
      });
    } catch (err: any) {
      toast({
        title: 'Scan failed',
        description: err?.message || 'Unable to list storage',
        variant: 'destructive',
      });
    } finally {
      setCleanupScanning(false);
    }
  };

  const handleDeleteOrphans = async () => {
    if (!cleanupResult || cleanupResult.orphans.length === 0) return;
    if (!confirm(`Delete ${cleanupResult.orphans.length} orphaned file(s) from storage? This cannot be undone.`)) return;
    setCleanupDeleting(true);
    try {
      const { deleted, failed } = await deleteOrphans(cleanupResult.orphans as any);
      toast({
        title: 'Cleanup complete',
        description: `Deleted ${deleted} file${deleted === 1 ? '' : 's'}${failed > 0 ? ` · ${failed} failed` : ''}`,
        variant: failed > 0 ? 'destructive' : 'default',
      });
      setCleanupResult(null);
    } catch (err: any) {
      toast({ title: 'Cleanup failed', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setCleanupDeleting(false);
    }
  };

  const handlePermanentDeleteProduct = async (product: any) => {
    if (!confirm(`PERMANENTLY delete "${product.name}"? This cannot be undone.`)) return;
    try {
      // Snapshot media URLs before the cascade delete so we can clean up storage.
      const { data: mediaRows } = await supabase
        .from('product_images_new' as any)
        .select('url')
        .eq('product_id', product.id);
      const mediaUrls = (mediaRows as any[] | null)?.map(r => r.url).filter(Boolean) ?? [];

      const { error } = await supabase
        .from('products_new' as any)
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      if (mediaUrls.length > 0) {
        void deleteStorageFiles(mediaUrls);
      }

      setDeletedProducts(prev => prev.filter(p => p.id !== product.id));
      toast({ title: "Permanently Deleted", description: `${product.name} has been permanently removed` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to permanently delete", variant: "destructive" });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories' as any)
        .select('id, name, description, active')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategories((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const slug = newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data, error } = await supabase
        .from('categories' as any)
        .insert({ name: newCategoryName.trim(), slug, active: true })
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, category_id: (data as any).id }));
      setNewCategoryName('');
      setIsCreatingCategory(false);
      toast({ title: "Category created", description: `"${newCategoryName.trim()}" has been added` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create category", variant: "destructive" });
    }
  };

  const fetchAllComponents = async () => {
    try {
      // Try using the helper function first
      const { data: functionData, error: functionError } = await (supabase
        .rpc as any)('get_active_components');

      if (!functionError && functionData) {
        setAllComponents((functionData as any));
        return;
      }


      // Fallback to direct table query
      const { data, error } = await supabase
        .from('component_library' as any)
        .select('id, component_sku, name, description, component_type, stock_level, normal_price, merchant_price, default_image_url')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAllComponents((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load components. Please check permissions and ensure the database schema is updated.",
        variant: "destructive"
      });
    }
  };

  const searchComponents = async (term: string) => {
    try {
      setSearchLoading(true);
      const { data, error } = await (supabase
        .rpc as any)('search_components', { search_term: term });

      if (error) throw error;
      setSearchResults((data as any) || []);
    } catch (error: any) {
      // Fallback to direct query if function doesn't exist — search by SKU or name
      const { data, error: fallbackError } = await supabase
        .from('component_library' as any)
        .select('id, component_sku, name, description, component_type, stock_level, normal_price, merchant_price, default_image_url')
        .or(`component_sku.ilike.%${term}%,name.ilike.%${term}%`)
        .eq('is_active', true)
        .limit(20);
      
      if (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to search components",
          variant: "destructive"
        });
      } else {
        setSearchResults((data as any) || []);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto-generate slug when name changes
  const generateSlug = async (name: string) => {
    if (!name.trim()) return '';
    
    try {
      const { data, error } = await (supabase
        .rpc as any)('generate_unique_slug', { 
          base_name: name,
          table_name: 'products_new'
        });
        
      if (error) throw error;
      return data || '';
    } catch (error) {
      return name.toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
    }
  };

  const handleNameChange = async (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    if (name) {
      const slug = await generateSlug(name);
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const addComponentToProduct = (component: ComponentSearchResult) => {
    const isAlreadyAdded = formData.selectedComponents.find(c => c.id === component.id);
    if (isAlreadyAdded) {
      toast({
        title: "Component Already Added",
        description: "This component is already in your product",
        variant: "destructive"
      });
      return;
    }

    const newComponent: SelectedComponent = {
      ...component,
      selected: true,
      remark: ''
    };

    setFormData(prev => ({
      ...prev,
      selectedComponents: [...prev.selectedComponents, newComponent]
    }));

    toast({
      title: "Component Added",
      description: `${component.component_sku} added to product`
    });
  };

  const removeComponent = (componentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedComponents: prev.selectedComponents.filter(comp => comp.id !== componentId)
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (formData.selectedComponents.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one component to the product",
          variant: "destructive"
        });
        return;
      }

      // 1. Create the product
      const productData = {
        name: formData.name,
        description: formData.description,
        brand: formData.brand,
        model: formData.model,
        category_id: formData.category_id === 'no-category' ? null : formData.category_id,
        year_from: formData.year_from,
        year_to: formData.year_to,
        screen_size: formData.screen_size,
        slug: formData.slug,
        active: formData.active,
        featured: formData.featured
      };

      let product;
      if (editingProduct) {
        // Update existing product
        const { data: updatedProduct, error: productError } = await supabase
          .from('products_new' as any)
          .update(productData)
          .eq('id', editingProduct.id)
          .select()
          .single();
        
        if (productError) throw productError;
        product = updatedProduct;
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('products_new' as any)
          .insert([productData])
          .select()
          .single();
        
        if (productError) throw productError;
        product = newProduct;
      }

      // 2. Handle product images via DIFF-BASED save. Comparing against the
      // snapshot taken when the modal opened means background-uploaded videos
      // (added to product_images_new directly by the queue while the modal was
      // open) are never touched. The user can save other changes mid-upload.
      const realFormImages = formData.images.filter(image => image.url && !image._uploading);
      const realFormUrls = new Set(realFormImages.map(i => i.url));

      if (editingProduct) {
        // a) DELETE rows the user removed via slot X.
        //    Identify by: was in original snapshot, no longer in formData.
        const removedUrls = originalMediaUrls.filter(u => !realFormUrls.has(u));
        if (removedUrls.length > 0) {
          const { error: delErr } = await supabase
            .from('product_images_new' as any)
            .delete()
            .eq('product_id', product.id)
            .in('url', removedUrls);
          if (delErr) throw delErr;
          void deleteStorageFiles(removedUrls);
        }

        // b) UPDATE metadata (sort_order, is_primary, alt_text) for items the
        //    user kept — they may have reordered or changed the primary.
        const originalSet = new Set(originalMediaUrls);
        for (let i = 0; i < realFormImages.length; i++) {
          const img = realFormImages[i];
          if (!originalSet.has(img.url)) continue; // not a kept item
          const { error: updErr } = await supabase
            .from('product_images_new' as any)
            .update({
              sort_order: i,
              is_primary: img.is_primary,
              alt_text: img.alt_text,
            })
            .eq('product_id', product.id)
            .eq('url', img.url);
          if (updErr) throw updErr;
        }

        // c) INSERT items that are new since the snapshot (e.g. the admin
        //    pasted a YouTube URL or completed a sync image upload).
        //    Background-uploaded videos already INSERTed themselves.
        const newItems = realFormImages
          .map((img, index) => ({ img, index }))
          .filter(({ img }) => !originalSet.has(img.url))
          .map(({ img, index }) => ({
            product_id: product.id,
            url: img.url,
            alt_text: img.alt_text,
            is_primary: img.is_primary,
            sort_order: index,
            media_type: img.media_type || 'image',
          }));
        if (newItems.length > 0) {
          const { error: insErr } = await supabase
            .from('product_images_new' as any)
            .insert(newItems);
          if (insErr) throw insErr;
        }
      } else {
        // Create mode: simple bulk insert.
        const allMedia = realFormImages.map((image, index) => ({
          product_id: product.id,
          url: image.url,
          alt_text: image.alt_text,
          is_primary: image.is_primary,
          sort_order: index,
          media_type: image.media_type || 'image',
        }));
        if (allMedia.length > 0) {
          const { error: imageError } = await supabase
            .from('product_images_new' as any)
            .insert(allMedia);
          if (imageError) throw imageError;
        }
      }

      // 3. Handle product components
      if (editingProduct) {
        // Clear existing component relationships for edit mode
        await supabase
          .from('product_components' as any)
          .delete()
          .eq('product_id', product.id);
      }

      // Link components to product (SIMPLIFIED)
      for (let i = 0; i < formData.selectedComponents.length; i++) {
        const comp = formData.selectedComponents[i];

        // Direct link between product and component (no variants needed)
        const { error: linkError } = await supabase
          .from('product_components' as any)
          .insert([{
            product_id: product.id,
            component_id: comp.id,
            is_required: false,
            is_default: i === 0,
            display_order: i,
            remark: comp.remark || null
          }]);

        if (linkError) {
        }
      }

      // 4. Handle product installation guide. Same race-safe pattern as media:
      // re-read the current installation_videos JSONB so any entries inserted
      // by the queue while the modal was open are preserved (not overwritten
      // by stale formData).
      if (formData.installation.has_installation_guide) {
        const formVideos = formData.installation.installation_videos
          .filter(v => v.url && !v._uploading)
          .map(v => ({ url: v.url, title: v.title, duration: v.duration }));
        const formUrls = new Set(formVideos.map(v => v.url));

        let finalVideos = formVideos;
        if (editingProduct) {
          const { data: dbRow } = await supabase
            .from('product_installation_guides' as any)
            .select('installation_videos')
            .eq('product_id', product.id)
            .maybeSingle();
          const dbVideos: Array<{ url: string; title?: string; duration?: string }> =
            ((dbRow as any)?.installation_videos as any[] | undefined) ?? [];
          const snapshotSet = new Set(originalInstallationVideoUrls);
          const queueInserted = dbVideos.filter(v => !snapshotSet.has(v.url) && !formUrls.has(v.url));
          finalVideos = [...formVideos, ...queueInserted];
        }

        const installationData = {
          product_id: product.id,
          recommended_time: formData.installation.recommended_time || null,
          workman_power: formData.installation.workman_power || 1,
          installation_price: formData.installation.installation_price || null,
          installation_videos: finalVideos,
          difficulty_level: formData.installation.difficulty_level || 'medium',
          notes: formData.installation.notes || null
        };

        const { error: installError } = await supabase
          .from('product_installation_guides' as any)
          .upsert(installationData, { onConflict: 'product_id' });

        if (installError) throw installError;

        // Clean up storage for installation videos the user explicitly removed.
        if (editingProduct && originalInstallationVideoUrls.length > 0) {
          const removedUrls = originalInstallationVideoUrls.filter(u => !formUrls.has(u));
          if (removedUrls.length > 0) void deleteStorageFiles(removedUrls);
        }
      } else {
        // Remove installation guide if unchecked. Snapshot URLs first so we can
        // clean up the storage files that go with them.
        if (editingProduct) {
          const { data: dbRow } = await supabase
            .from('product_installation_guides' as any)
            .select('installation_videos')
            .eq('product_id', product.id)
            .maybeSingle();
          const dbVideos: Array<{ url: string }> = ((dbRow as any)?.installation_videos as any[] | undefined) ?? [];
          const urlsToWipe = dbVideos.map(v => v.url).filter(Boolean);
          if (urlsToWipe.length > 0) void deleteStorageFiles(urlsToWipe);
        }
        await supabase
          .from('product_installation_guides' as any)
          .delete()
          .eq('product_id', product.id);
      }

      const inFlightImages = formData.images.filter(img => img._uploading).length;
      const inFlightInstall = formData.installation.installation_videos.filter(v => v._uploading).length;
      const inFlightCount = inFlightImages + inFlightInstall;
      toast({
        title: "Success",
        description: editingProduct
          ? `Product "${formData.name}" updated${inFlightCount > 0 ? ` · ${inFlightCount} video${inFlightCount === 1 ? '' : 's'} still uploading in background` : '!'}`
          : `Product "${formData.name}" created successfully!`
      });

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      brand: '',
      model: '',
      category_id: 'no-category',
      year_from: null,
      year_to: null,
      screen_size: [],
      slug: '',
      active: true,
      featured: false,
      images: [],
      selectedComponents: [],
      installation: {
        has_installation_guide: false,
        recommended_time: '',
        workman_power: 1,
        installation_price: 0,
        installation_videos: [],
        difficulty_level: 'medium',
        notes: ''
      }
    });
    setEditingProduct(null);
    setOriginalMediaUrls([]);
    setOriginalInstallationVideoUrls([]);
    setActiveTab('basic');
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleEditProduct = async (product: any) => {
    try {
      // Fetch product components
      const { data: productComponents, error: compError } = await supabase
        .from('product_components' as any)
        .select(`
          remark,
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      // Fetch product images
      const { data: productImages, error: imgError } = await supabase
        .from('product_images_new' as any)
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order');

      // Fetch installation guide
      const { data: installationData, error: installError } = await supabase
        .from('product_installation_guides' as any)
        .select('*')
        .eq('product_id', product.id)
        .maybeSingle();


      const components = (productComponents as any)?.map((pc: any) => ({
        ...pc.component_library,
        selected: true,
        remark: pc.remark || ''
      })) || [];

      // Format all media for the form (unified slots)
      const allMedia = (productImages as any) || [];
      const formattedImages = allMedia
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((img: any) => ({
          url: img.url,
          is_primary: img.is_primary || false,
          alt_text: img.alt_text || '',
          media_type: (img.media_type || 'image') as 'image' | 'video'
        }));

      // Format installation data
      const installationFormData: InstallationFormData = installationData ? {
        has_installation_guide: true,
        recommended_time: installationData.recommended_time || '',
        workman_power: installationData.workman_power || 1,
        installation_price: installationData.installation_price || 0,
        installation_videos: installationData.installation_videos || [],
        difficulty_level: installationData.difficulty_level || 'medium',
        notes: installationData.notes || ''
      } : {
        has_installation_guide: false,
        recommended_time: '',
        workman_power: 1,
        installation_price: 0,
        installation_videos: [],
        difficulty_level: 'medium',
        notes: ''
      };

      setFormData({
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        model: product.model || '',
        category_id: product.category_id || 'no-category',
        year_from: product.year_from || null,
        year_to: product.year_to || null,
        screen_size: product.screen_size || [],
        slug: product.slug || '',
        active: product.active ?? true,
        featured: product.featured ?? false,
        images: formattedImages,
        selectedComponents: components,
        installation: installationFormData
      });

      setOriginalMediaUrls(formattedImages.map((img: any) => img.url).filter(Boolean));
      setOriginalInstallationVideoUrls((installationFormData.installation_videos as any[]).map(v => v.url).filter(Boolean));
      setEditingProduct(product);
      setIsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load product for editing',
        variant: 'destructive'
      });
    }
  };

  const handlePreviewProduct = async (product: any) => {
    try {
      // Fetch product components - same query as ProductDetails.tsx
      const { data: productComponentData, error: compError } = await supabase
        .from('product_components' as any)
        .select(`
          remark,
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      // Fetch product images
      const { data: productImages, error: imgError } = await supabase
        .from('product_images_new' as any)
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order');


      // Transform components data same as ProductDetails.tsx
      const transformedComponents = (productComponentData || []).map((item: any, index: number) => {
        const component = item.component_library;
        return {
          id: component.id,
          component_sku: component.component_sku,
          name: component.name,
          description: component.description || 'Product component',
          component_type: component.component_type || 'component',
          stock_level: component.stock_level || 0,
          normal_price: component.normal_price || 0,
          merchant_price: component.merchant_price || component.normal_price || 0,
          default_image_url: component.default_image_url || null,
          remark: item.remark || null
        };
      });

      const enhancedProduct = {
        ...product,
        components: transformedComponents,
        images: productImages || []
      };

      setPreviewProduct(enhancedProduct);
      setIsPreviewOpen(true);
    } catch (error: any) {
      // Still show preview but without components/images
      setPreviewProduct(product);
      setIsPreviewOpen(true);
    }
  };

  // Get unique brands for filter
  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const uniqueScreenSizes = [...new Set(products.flatMap(p => p.screen_size || []))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Create products using components from your library</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchProducts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={cleanupOpen} onOpenChange={(open) => { setCleanupOpen(open); if (!open) setCleanupResult(null); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" title="Find and delete orphaned media files in storage">
                <Trash2 className="mr-2 h-4 w-4" />
                Storage Cleanup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Storage Cleanup</DialogTitle>
                <DialogDescription>
                  Scan Supabase Storage for files in <code>product-videos/uploads</code> and <code>product-images/uploads</code> that are no longer referenced by any product, then delete them to reclaim storage space.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {!cleanupResult ? (
                  <div className="text-sm text-muted-foreground">
                    This may take a minute on large storage. Safe to run anytime — only files not referenced by <code>product_images_new</code> are deleted.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-2xl font-semibold">{cleanupResult.totalScanned}</div>
                        <div className="text-xs text-muted-foreground">Files in storage</div>
                      </div>
                      <div className="bg-green-50 rounded p-3">
                        <div className="text-2xl font-semibold text-green-700">{cleanupResult.referencedCount}</div>
                        <div className="text-xs text-muted-foreground">In use</div>
                      </div>
                      <div className={cleanupResult.orphans.length > 0 ? 'bg-amber-50 rounded p-3' : 'bg-gray-50 rounded p-3'}>
                        <div className={`text-2xl font-semibold ${cleanupResult.orphans.length > 0 ? 'text-amber-700' : ''}`}>{cleanupResult.orphans.length}</div>
                        <div className="text-xs text-muted-foreground">Orphans</div>
                      </div>
                    </div>
                    {cleanupResult.orphans.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded text-xs">
                        {cleanupResult.orphans.slice(0, 50).map((o, i) => (
                          <div key={i} className="px-2 py-1 border-b last:border-b-0 truncate font-mono text-gray-600">
                            {o.bucket}/{o.path}
                          </div>
                        ))}
                        {cleanupResult.orphans.length > 50 && (
                          <div className="px-2 py-1 text-gray-500 italic">...and {cleanupResult.orphans.length - 50} more</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCleanupOpen(false)} disabled={cleanupScanning || cleanupDeleting}>Close</Button>
                  {!cleanupResult ? (
                    <Button onClick={handleScanOrphans} disabled={cleanupScanning}>
                      {cleanupScanning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning...</> : 'Scan for orphans'}
                    </Button>
                  ) : cleanupResult.orphans.length > 0 ? (
                    <Button variant="destructive" onClick={handleDeleteOrphans} disabled={cleanupDeleting}>
                      {cleanupDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : `Delete ${cleanupResult.orphans.length} orphan${cleanupResult.orphans.length === 1 ? '' : 's'}`}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setCleanupResult(null)}>Scan again</Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Edit your product and its components' : 'Create a product by adding components from your library'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                  <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                    <TabsTrigger value="basic" className="text-xs sm:text-sm px-1 sm:px-3">
                      <span className="hidden sm:inline">Product Details</span>
                      <span className="sm:hidden">Details</span>
                    </TabsTrigger>
                    <TabsTrigger value="components" className="text-xs sm:text-sm px-1 sm:px-3">
                      <span className="hidden sm:inline">Components</span>
                      <span className="sm:hidden">Parts</span>
                      <span className="ml-1">({formData.selectedComponents.length})</span>
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

                  {/* Basic Product Info */}
                  <TabsContent value="basic" className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1 pb-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g., Audi A4 9/10 Inch Casing Kit"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="auto-generated"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category_id">Category</Label>
                        {isCreatingCategory ? (
                          <div className="flex gap-2">
                            <Input
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="New category name"
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }}
                              autoFocus
                            />
                            <Button type="button" size="sm" onClick={createCategory} disabled={!newCategoryName.trim()}>
                              Add
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setIsCreatingCategory(false)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Select
                              value={formData.category_id}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                            >
                              <SelectTrigger>
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
                            <Button type="button" size="sm" variant="outline" onClick={() => setIsCreatingCategory(true)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand">Brand *</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="e.g., Audi"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model *</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                          placeholder="e.g., A4"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Screen Size</Label>
                        <Select
                          value={formData.screen_size[0] || ''}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, screen_size: value ? [value] : [] }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select screen size" />
                          </SelectTrigger>
                          <SelectContent>
                            {SCREEN_SIZES.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Year Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="year_from" className="text-sm text-muted-foreground">From</Label>
                            <Input
                              id="year_from"
                              type="number"
                              value={formData.year_from ?? ''}
                              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                              onChange={(e) => setFormData(prev => ({ ...prev, year_from: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="e.g., 2020"
                            />
                          </div>
                          <div>
                            <Label htmlFor="year_to" className="text-sm text-muted-foreground">To</Label>
                            <Input
                              id="year_to"
                              type="number"
                              value={formData.year_to ?? ''}
                              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                              onChange={(e) => setFormData(prev => ({ ...prev, year_to: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="e.g., 2025"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                          />
                          <div>
                            <Label className="font-medium">Active</Label>
                            <p className="text-xs text-muted-foreground">Available for purchase</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.featured}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                          />
                          <div>
                            <Label className="font-medium">Featured</Label>
                            <p className="text-xs text-muted-foreground">Show on homepage</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Component Selection */}
                  <TabsContent value="components" className="flex-1 min-h-0">
                    {/* Selected Components Summary Bar */}
                    {formData.selectedComponents.length > 0 && (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-green-800">
                            {formData.selectedComponents.length} component{formData.selectedComponents.length !== 1 ? 's' : ''} selected
                          </span>
                          <span className="text-xs text-green-600">
                            Total: RM{formData.selectedComponents.reduce((sum, c) => sum + c.normal_price, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                          {formData.selectedComponents.map((c) => (
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
                      {/* Left: Component Library */}
                      <div className="flex flex-col min-h-0 h-[35vh] sm:h-[40vh] lg:h-full">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            {searchTerm ? `Results (${searchResults.length})` : `Library (${allComponents.length})`}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => window.open('/admin/component-library', '_blank')}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            New Component
                          </Button>
                        </div>
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search SKU, name, or type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9"
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                          {searchLoading && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              Searching...
                            </div>
                          )}
                          {(searchTerm ? searchResults : allComponents).map((component) => {
                            const isAdded = formData.selectedComponents.some(c => c.id === component.id);
                            return (
                              <div
                                key={component.id}
                                className={`flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${isAdded ? 'bg-green-50/50' : ''}`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {component.default_image_url ? (
                                    <img src={component.default_image_url} alt={component.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-mono text-xs text-blue-600">{component.component_sku}</div>
                                    <div className="text-sm font-medium truncate">{component.name}</div>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{component.component_type}</Badge>
                                      <span className="text-[10px] text-muted-foreground">Stock: {component.stock_level}</span>
                                      <span className="text-[10px] text-muted-foreground">RM{component.normal_price}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isAdded ? 'secondary' : 'default'}
                                  className="h-7 text-xs flex-shrink-0"
                                  onClick={() => addComponentToProduct(component)}
                                  disabled={isAdded}
                                >
                                  {isAdded ? 'Added' : 'Add'}
                                </Button>
                              </div>
                            );
                          })}
                          {!searchLoading && (searchTerm ? searchResults : allComponents).length === 0 && (
                            <div className="text-center py-8">
                              <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                {searchTerm ? 'No components found.' : 'No components yet.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Selected Components */}
                      <div className="flex flex-col min-h-0 h-[25vh] sm:h-[30vh] lg:h-full">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            Selected ({formData.selectedComponents.length})
                          </h4>
                          {formData.selectedComponents.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Total: RM{formData.selectedComponents.reduce((sum, c) => sum + c.normal_price, 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto border rounded-lg min-h-0 bg-gray-50/50">
                          {formData.selectedComponents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                              <Package className="h-10 w-10 text-muted-foreground/30 mb-2" />
                              <p className="text-sm text-muted-foreground">No components selected</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="hidden lg:inline">Add components from the library on the left</span>
                                <span className="lg:hidden">Add components from the library above</span>
                              </p>
                            </div>
                          ) : (
                            formData.selectedComponents.map((component, index) => (
                              <div
                                key={component.id}
                                draggable={dragIndex === index}
                                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                                onDragLeave={() => setDragOverIndex(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return; }
                                  setFormData(prev => {
                                    const items = [...prev.selectedComponents];
                                    const [moved] = items.splice(dragIndex, 1);
                                    items.splice(index, 0, moved);
                                    return { ...prev, selectedComponents: items };
                                  });
                                  setDragIndex(null);
                                  setDragOverIndex(null);
                                }}
                                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                                className={`flex items-center justify-between gap-1 px-2 py-2 border-b last:border-b-0 transition-colors ${
                                  dragIndex === index ? 'opacity-40 bg-gray-100' : dragOverIndex === index ? 'bg-lime-50 border-t-2 border-t-lime-400' : 'bg-white hover:bg-green-50/50'
                                }`}
                              >
                                <div
                                  className="cursor-grab active:cursor-grabbing flex-shrink-0 p-0.5 text-gray-300 hover:text-gray-500"
                                  onMouseDown={() => setDragIndex(index)}
                                  onMouseUp={() => { if (!dragOverIndex && dragOverIndex !== 0) setDragIndex(null); }}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {component.default_image_url ? (
                                    <img src={component.default_image_url} alt={component.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="font-mono text-xs text-blue-600">{component.component_sku}</div>
                                    <div className="text-sm font-medium truncate">{component.name}</div>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{component.component_type}</Badge>
                                      <span className="text-[10px]">RM{component.normal_price}</span>
                                      <span className="text-[10px] text-muted-foreground">(cost: RM{component.merchant_price})</span>
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Remark e.g. H Spec, X Spec"
                                      value={component.remark || ''}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const newRemark = e.target.value;
                                        setFormData(prev => ({
                                          ...prev,
                                          selectedComponents: prev.selectedComponents.map(c =>
                                            c.id === component.id ? { ...c, remark: newRemark } : c
                                          )
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

                  {/* Product Media (Images & Videos) */}
                  <TabsContent value="images" className="space-y-4 flex-1 min-h-0 pr-1">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">Product Media</h3>
                        <span className="text-xs text-gray-400">{formData.images.length}/15 slots used</span>
                      </div>
                      {/* Row 1: 5 slots */}
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {[...Array(5)].map((_, index) => {
                          const media = formData.images[index];
                          const isVideo = media?.media_type === 'video';
                          return (
                            <div
                              key={index}
                              className="relative"
                              onDragOver={(e) => { if (mediaDragIndex !== null) { e.preventDefault(); setMediaDragOverIndex(index); } }}
                              onDragLeave={() => setMediaDragOverIndex(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (mediaDragIndex === null || mediaDragIndex === index) { setMediaDragIndex(null); setMediaDragOverIndex(null); return; }
                                setFormData(prev => {
                                  const items = [...prev.images];
                                  const [moved] = items.splice(mediaDragIndex, 1);
                                  items.splice(index > mediaDragIndex ? index - (index >= items.length + 1 ? 1 : 0) : index, 0, moved);
                                  return { ...prev, images: items.map((img, i) => ({ ...img, is_primary: i === 0 })) };
                                });
                                setMediaDragIndex(null);
                                setMediaDragOverIndex(null);
                              }}
                            >
                              {media?._uploading ? (
                                <div className="aspect-square rounded-lg border-2 border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 p-2 relative">
                                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                  <span className="text-[9px] font-medium text-blue-700 truncate w-full text-center px-1" title={media._uploadFileName}>{media._uploadFileName}</span>
                                  <span className="text-[8px] text-blue-600">{((media._uploadFileSize || 0) / 1024 / 1024).toFixed(0)}MB · Uploading...</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (media._uploadId) cancelUpload(media._uploadId);
                                      setFormData(prev => ({ ...prev, images: prev.images.filter(img => img._uploadId !== media._uploadId) }));
                                    }}
                                    className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                    title="Cancel upload"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : media?.url ? (
                                <div
                                  className={`relative group aspect-square rounded-lg border overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing ${mediaDragIndex === index ? 'opacity-40' : ''} ${mediaDragOverIndex === index ? 'ring-2 ring-lime-400' : ''}`}
                                  draggable
                                  onDragStart={() => setMediaDragIndex(index)}
                                  onDragEnd={() => { setMediaDragIndex(null); setMediaDragOverIndex(null); }}
                                >
                                  {isVideo ? (
                                    isEmbeddableUrl(media.url) ? (
                                      <iframe src={getEmbedUrl(media.url)!} className="w-full h-full" allowFullScreen />
                                    ) : (
                                      <video src={media.url} className="w-full h-full object-cover" preload="metadata" />
                                    )
                                  ) : (
                                    <img src={media.url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                                  )}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                    {!isVideo && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingImage(media.url);
                                          setViewingImageInfo({ url: media.url, title: `Product Image ${index + 1}` });
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
                                        const newImages = formData.images.filter((_, i) => i !== index);
                                        if (newImages.length > 0 && !newImages.some(img => img.is_primary)) {
                                          newImages[0] = { ...newImages[0], is_primary: true };
                                        }
                                        setFormData(prev => ({ ...prev, images: newImages }));
                                      }}
                                      className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {index === 0 && <span className="absolute top-1 left-1 text-[8px] bg-black/70 text-white px-1 rounded">Primary</span>}
                                  {isVideo && (
                                    <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 text-white px-1 rounded flex items-center gap-0.5">
                                      <Play className="h-2 w-2" /> Video
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <label className={`aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex flex-col items-center justify-center transition-colors bg-gray-50/50 cursor-pointer ${mediaDragOverIndex === index ? 'ring-2 ring-lime-400 border-lime-400' : ''}`}>
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
                                      const slotsAvailable = 15 - formData.images.length;
                                      const filesToUpload = files.slice(0, slotsAvailable);
                                      for (const file of filesToUpload) {
                                        const isVideoFile = file.type.startsWith('video/');
                                        try {
                                          if (isVideoFile) {
                                            await processVideoFile(file);
                                          } else {
                                            const imageCompression = (await import('browser-image-compression')).default;
                                            const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' });
                                            const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
                                            const { error } = await supabase.storage.from('product-images').upload(filePath, compressed, { contentType: 'image/webp' });
                                            if (error) throw error;
                                            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                            setFormData(prev => ({
                                              ...prev,
                                              images: [...prev.images, { url: publicUrl, is_primary: prev.images.length === 0, alt_text: `${prev.name} - Image`, media_type: 'image' as const }]
                                            }));
                                          }
                                        } catch (err: any) {
                                          toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                                        }
                                      }
                                      {
                                        const isEditingExisting = !!editingProduct?.id;
                                        const videos = filesToUpload.filter(f => f.type.startsWith('video/')).length;
                                        const images = filesToUpload.length - videos;
                                        const parts: string[] = [];
                                        if (images > 0) parts.push(`${images} image${images === 1 ? '' : 's'} uploaded`);
                                        if (videos > 0) {
                                          if (isEditingExisting) parts.push(`${videos} video${videos === 1 ? '' : 's'} uploading in background`);
                                          else parts.push(`${videos} video${videos === 1 ? '' : 's'} uploaded`);
                                        }
                                        if (parts.length > 0) toast({ title: 'Files added', description: parts.join(', ') });
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
                      {/* Row 2: 5 slots */}
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {[...Array(5)].map((_, i) => {
                          const index = i + 5;
                          const media = formData.images[index];
                          const isVideo = media?.media_type === 'video';
                          return (
                            <div
                              key={index}
                              className="relative"
                              onDragOver={(e) => { if (mediaDragIndex !== null) { e.preventDefault(); setMediaDragOverIndex(index); } }}
                              onDragLeave={() => setMediaDragOverIndex(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (mediaDragIndex === null || mediaDragIndex === index) { setMediaDragIndex(null); setMediaDragOverIndex(null); return; }
                                setFormData(prev => {
                                  const items = [...prev.images];
                                  const [moved] = items.splice(mediaDragIndex, 1);
                                  items.splice(index > mediaDragIndex ? index - (index >= items.length + 1 ? 1 : 0) : index, 0, moved);
                                  return { ...prev, images: items.map((img, i) => ({ ...img, is_primary: i === 0 })) };
                                });
                                setMediaDragIndex(null);
                                setMediaDragOverIndex(null);
                              }}
                            >
                              {media?._uploading ? (
                                <div className="aspect-square rounded-lg border-2 border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 p-2 relative">
                                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                  <span className="text-[9px] font-medium text-blue-700 truncate w-full text-center px-1" title={media._uploadFileName}>{media._uploadFileName}</span>
                                  <span className="text-[8px] text-blue-600">{((media._uploadFileSize || 0) / 1024 / 1024).toFixed(0)}MB · Uploading...</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (media._uploadId) cancelUpload(media._uploadId);
                                      setFormData(prev => ({ ...prev, images: prev.images.filter(img => img._uploadId !== media._uploadId) }));
                                    }}
                                    className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                    title="Cancel upload"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : media?.url ? (
                                <div
                                  className={`relative group aspect-square rounded-lg border overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing ${mediaDragIndex === index ? 'opacity-40' : ''} ${mediaDragOverIndex === index ? 'ring-2 ring-lime-400' : ''}`}
                                  draggable
                                  onDragStart={() => setMediaDragIndex(index)}
                                  onDragEnd={() => { setMediaDragIndex(null); setMediaDragOverIndex(null); }}
                                >
                                  {isVideo ? (
                                    isEmbeddableUrl(media.url) ? (
                                      <iframe src={getEmbedUrl(media.url)!} className="w-full h-full" allowFullScreen />
                                    ) : (
                                      <video src={media.url} className="w-full h-full object-cover" preload="metadata" />
                                    )
                                  ) : (
                                    <img src={media.url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                                  )}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                    {!isVideo && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingImage(media.url);
                                          setViewingImageInfo({ url: media.url, title: `Product Image ${index + 1}` });
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
                                        const newImages = formData.images.filter((_, i) => i !== index);
                                        if (newImages.length > 0 && !newImages.some(img => img.is_primary)) {
                                          newImages[0] = { ...newImages[0], is_primary: true };
                                        }
                                        setFormData(prev => ({ ...prev, images: newImages }));
                                      }}
                                      className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {isVideo && (
                                    <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 text-white px-1 rounded flex items-center gap-0.5">
                                      <Play className="h-2 w-2" /> Video
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <label className={`aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex flex-col items-center justify-center transition-colors bg-gray-50/50 cursor-pointer ${mediaDragOverIndex === index ? 'ring-2 ring-lime-400 border-lime-400' : ''}`}>
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
                                      const slotsAvailable = 15 - formData.images.length;
                                      const filesToUpload = files.slice(0, slotsAvailable);
                                      for (const file of filesToUpload) {
                                        const isVideoFile = file.type.startsWith('video/');
                                        try {
                                          if (isVideoFile) {
                                            await processVideoFile(file);
                                          } else {
                                            const imageCompression = (await import('browser-image-compression')).default;
                                            const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' });
                                            const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
                                            const { error } = await supabase.storage.from('product-images').upload(filePath, compressed, { contentType: 'image/webp' });
                                            if (error) throw error;
                                            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                            setFormData(prev => ({
                                              ...prev,
                                              images: [...prev.images, { url: publicUrl, is_primary: prev.images.length === 0, alt_text: `${prev.name} - Image`, media_type: 'image' as const }]
                                            }));
                                          }
                                        } catch (err: any) {
                                          toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                                        }
                                      }
                                      {
                                        const isEditingExisting = !!editingProduct?.id;
                                        const videos = filesToUpload.filter(f => f.type.startsWith('video/')).length;
                                        const images = filesToUpload.length - videos;
                                        const parts: string[] = [];
                                        if (images > 0) parts.push(`${images} image${images === 1 ? '' : 's'} uploaded`);
                                        if (videos > 0) {
                                          if (isEditingExisting) parts.push(`${videos} video${videos === 1 ? '' : 's'} uploading in background`);
                                          else parts.push(`${videos} video${videos === 1 ? '' : 's'} uploaded`);
                                        }
                                        if (parts.length > 0) toast({ title: 'Files added', description: parts.join(', ') });
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
                      {/* Row 3: 5 slots */}
                      <div className="grid grid-cols-5 gap-2">
                        {[...Array(5)].map((_, i) => {
                          const index = i + 10;
                          const media = formData.images[index];
                          const isVideo = media?.media_type === 'video';
                          return (
                            <div
                              key={index}
                              className="relative"
                              onDragOver={(e) => { if (mediaDragIndex !== null) { e.preventDefault(); setMediaDragOverIndex(index); } }}
                              onDragLeave={() => setMediaDragOverIndex(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (mediaDragIndex === null || mediaDragIndex === index) { setMediaDragIndex(null); setMediaDragOverIndex(null); return; }
                                setFormData(prev => {
                                  const items = [...prev.images];
                                  const [moved] = items.splice(mediaDragIndex, 1);
                                  items.splice(index > mediaDragIndex ? index - (index >= items.length + 1 ? 1 : 0) : index, 0, moved);
                                  return { ...prev, images: items.map((img, i) => ({ ...img, is_primary: i === 0 })) };
                                });
                                setMediaDragIndex(null);
                                setMediaDragOverIndex(null);
                              }}
                            >
                              {media?._uploading ? (
                                <div className="aspect-square rounded-lg border-2 border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 p-2 relative">
                                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                  <span className="text-[9px] font-medium text-blue-700 truncate w-full text-center px-1" title={media._uploadFileName}>{media._uploadFileName}</span>
                                  <span className="text-[8px] text-blue-600">{((media._uploadFileSize || 0) / 1024 / 1024).toFixed(0)}MB · Uploading...</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (media._uploadId) cancelUpload(media._uploadId);
                                      setFormData(prev => ({ ...prev, images: prev.images.filter(img => img._uploadId !== media._uploadId) }));
                                    }}
                                    className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                    title="Cancel upload"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : media?.url ? (
                                <div
                                  className={`relative group aspect-square rounded-lg border overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing ${mediaDragIndex === index ? 'opacity-40' : ''} ${mediaDragOverIndex === index ? 'ring-2 ring-lime-400' : ''}`}
                                  draggable
                                  onDragStart={() => setMediaDragIndex(index)}
                                  onDragEnd={() => { setMediaDragIndex(null); setMediaDragOverIndex(null); }}
                                >
                                  {isVideo ? (
                                    isEmbeddableUrl(media.url) ? (
                                      <iframe src={getEmbedUrl(media.url)!} className="w-full h-full" allowFullScreen />
                                    ) : (
                                      <video src={media.url} className="w-full h-full object-cover" preload="metadata" />
                                    )
                                  ) : (
                                    <img src={media.url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                                  )}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                    {!isVideo && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingImage(media.url);
                                          setViewingImageInfo({ url: media.url, title: `Product Image ${index + 1}` });
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
                                        const newImages = formData.images.filter((_, i) => i !== index);
                                        if (newImages.length > 0 && !newImages.some(img => img.is_primary)) {
                                          newImages[0] = { ...newImages[0], is_primary: true };
                                        }
                                        setFormData(prev => ({ ...prev, images: newImages }));
                                      }}
                                      className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {isVideo && (
                                    <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 text-white px-1 rounded flex items-center gap-0.5">
                                      <Play className="h-2 w-2" /> Video
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <label className={`aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex flex-col items-center justify-center transition-colors bg-gray-50/50 cursor-pointer ${mediaDragOverIndex === index ? 'ring-2 ring-lime-400 border-lime-400' : ''}`}>
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
                                      const slotsAvailable = 15 - formData.images.length;
                                      const filesToUpload = files.slice(0, slotsAvailable);
                                      for (const file of filesToUpload) {
                                        const isVideoFile = file.type.startsWith('video/');
                                        try {
                                          if (isVideoFile) {
                                            await processVideoFile(file);
                                          } else {
                                            const imageCompression = (await import('browser-image-compression')).default;
                                            const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' });
                                            const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
                                            const { error } = await supabase.storage.from('product-images').upload(filePath, compressed, { contentType: 'image/webp' });
                                            if (error) throw error;
                                            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                            setFormData(prev => ({
                                              ...prev,
                                              images: [...prev.images, { url: publicUrl, is_primary: prev.images.length === 0, alt_text: `${prev.name} - Image`, media_type: 'image' as const }]
                                            }));
                                          }
                                        } catch (err: any) {
                                          toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                                        }
                                      }
                                      {
                                        const isEditingExisting = !!editingProduct?.id;
                                        const videos = filesToUpload.filter(f => f.type.startsWith('video/')).length;
                                        const images = filesToUpload.length - videos;
                                        const parts: string[] = [];
                                        if (images > 0) parts.push(`${images} image${images === 1 ? '' : 's'} uploaded`);
                                        if (videos > 0) {
                                          if (isEditingExisting) parts.push(`${videos} video${videos === 1 ? '' : 's'} uploading in background`);
                                          else parts.push(`${videos} video${videos === 1 ? '' : 's'} uploaded`);
                                        }
                                        if (parts.length > 0) toast({ title: 'Files added', description: parts.join(', ') });
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
                              const currentCount = formData.images.length;
                              const slotsAvailable = 15 - currentCount;
                              if (files.length > slotsAvailable) {
                                toast({ title: `Only ${slotsAvailable} slots available`, description: `Selected ${files.length} files, uploading first ${slotsAvailable}`, variant: 'destructive' });
                              }
                              const filesToUpload = files.slice(0, slotsAvailable);
                              for (const file of filesToUpload) {
                                const isVideoFile = file.type.startsWith('video/');
                                try {
                                  if (isVideoFile) {
                                    await processVideoFile(file);
                                  } else {
                                    const imageCompression = (await import('browser-image-compression')).default;
                                    const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' });
                                    const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
                                    const { error } = await supabase.storage.from('product-images').upload(filePath, compressed, { contentType: 'image/webp' });
                                    if (error) throw error;
                                    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                    setFormData(prev => ({
                                      ...prev,
                                      images: [...prev.images, { url: publicUrl, is_primary: prev.images.length === 0, alt_text: `${prev.name} - Image`, media_type: 'image' as const }]
                                    }));
                                  }
                                } catch (err: any) {
                                  toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                                }
                              }
                              {
                                const isEditingExisting = !!editingProduct?.id;
                                const videos = filesToUpload.filter(f => f.type.startsWith('video/')).length;
                                const images = filesToUpload.length - videos;
                                const parts: string[] = [];
                                if (images > 0) parts.push(`${images} image${images === 1 ? '' : 's'} uploaded`);
                                if (videos > 0) {
                                  if (isEditingExisting) parts.push(`${videos} video${videos === 1 ? '' : 's'} uploading in background`);
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
                              if (formData.images.length >= 15) {
                                toast({ title: 'All slots full', description: 'Remove a media item first', variant: 'destructive' });
                                return;
                              }
                              const isVideoUrl = isEmbeddableUrl(url) || /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
                              setFormData(prev => ({
                                ...prev,
                                images: [...prev.images, {
                                  url,
                                  is_primary: prev.images.length === 0,
                                  alt_text: `${prev.name} - ${isVideoUrl ? 'Video' : 'Image'}`,
                                  media_type: isVideoUrl ? 'video' : 'image'
                                }]
                              }));
                              (e.target as HTMLInputElement).value = '';
                              if (isVideoUrl) toast({ title: 'Video added', description: isEmbeddableUrl(url) ? 'YouTube/Vimeo video added' : 'Video URL added' });
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Click any empty slot or "Select Files" for batch upload. Images & videos auto-detected. Paste URLs for YouTube/Vimeo.</p>
                    </div>
                  </TabsContent>

                  {/* Installation Guide */}
                  <TabsContent value="installation" className="space-y-6 overflow-y-auto flex-1 min-h-0 pr-1">
                    <div className="space-y-4">
                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center space-x-3 pb-4 border-b">
                        <Switch
                          checked={formData.installation.has_installation_guide}
                          onCheckedChange={(checked) => setFormData(prev => ({
                            ...prev,
                            installation: { ...prev.installation, has_installation_guide: checked }
                          }))}
                        />
                        <div>
                          <Label className="text-base font-medium">Include Installation Guide</Label>
                          <p className="text-sm text-muted-foreground">
                            Add installation information and videos for this product
                          </p>
                        </div>
                      </div>

                      {formData.installation.has_installation_guide && (
                        <>
                          {/* Installation Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Recommended Time
                              </Label>
                              <Input
                                value={formData.installation.recommended_time}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  installation: { ...prev.installation, recommended_time: e.target.value }
                                }))}
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
                                value={formData.installation.workman_power}
                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  installation: { ...prev.installation, workman_power: parseInt(e.target.value) || 1 }
                                }))}
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
                                value={formData.installation.installation_price}
                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  installation: { ...prev.installation, installation_price: parseFloat(e.target.value) || 0 }
                                }))}
                              />
                            </div>
                          </div>

                          {/* Difficulty Level */}
                          <div className="space-y-2">
                            <Label>Difficulty Level</Label>
                            <Select
                              value={formData.installation.difficulty_level}
                              onValueChange={(value: 'easy' | 'medium' | 'hard' | 'expert') => setFormData(prev => ({
                                ...prev,
                                installation: { ...prev.installation, difficulty_level: value }
                              }))}
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
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  installation: {
                                    ...prev.installation,
                                    installation_videos: [
                                      ...prev.installation.installation_videos,
                                      { url: '', title: '', duration: '' }
                                    ]
                                  }
                                }))}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Video
                              </Button>
                            </div>

                            {formData.installation.installation_videos.length === 0 && (
                              <p className="text-sm text-muted-foreground">No videos added yet. Click "Add Video" to include installation videos.</p>
                            )}

                            {formData.installation.installation_videos.map((video, index) => (
                              <Card key={index} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <Label className="text-xs text-muted-foreground pt-1">Video {index + 1} — paste a YouTube/Vimeo URL or upload an MP4 (max 2GB)</Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const videos = formData.installation.installation_videos.filter((_, i) => i !== index);
                                        setFormData(prev => ({
                                          ...prev,
                                          installation: { ...prev.installation, installation_videos: videos }
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
                                        <p className="text-sm font-medium truncate" title={video._uploadFileName}>{video._uploadFileName}</p>
                                        <p className="text-xs text-blue-700">{((video._uploadFileSize || 0) / 1024 / 1024).toFixed(1)}MB · uploading in background — safe to save and close this modal, but don't refresh until done</p>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                        onClick={() => {
                                          if (video._uploadId) cancelUpload(video._uploadId);
                                          const videos = formData.installation.installation_videos.filter(v => v._uploadId !== video._uploadId);
                                          setFormData(prev => ({
                                            ...prev,
                                            installation: { ...prev.installation, installation_videos: videos }
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
                                          <iframe src={getEmbedUrl(video.url)!} className="w-full h-full" allowFullScreen />
                                        ) : (
                                          <video src={`${video.url}#t=0.1`} className="w-full h-full object-contain" controls preload="metadata" />
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                          const videos = [...formData.installation.installation_videos];
                                          videos[index] = { ...videos[index], url: '' };
                                          setFormData(prev => ({
                                            ...prev,
                                            installation: { ...prev.installation, installation_videos: videos }
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
                                          <span className="text-xs text-gray-500 mt-1">MP4, WebM, MOV — up to 2GB</span>
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
                                                toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
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
                                              const videos = [...formData.installation.installation_videos];
                                              videos[index] = { ...videos[index], url };
                                              setFormData(prev => ({
                                                ...prev,
                                                installation: { ...prev.installation, installation_videos: videos }
                                              }));
                                            }
                                          }}
                                        />
                                        <p className="text-xs text-gray-500">Press Enter to apply. YouTube and Vimeo links are embedded.</p>
                                      </TabsContent>
                                    </Tabs>
                                  )}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Title</Label>
                                      <Input
                                        value={video.title}
                                        onChange={(e) => {
                                          const videos = [...formData.installation.installation_videos];
                                          videos[index] = { ...videos[index], title: e.target.value };
                                          setFormData(prev => ({
                                            ...prev,
                                            installation: { ...prev.installation, installation_videos: videos }
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
                                          const videos = [...formData.installation.installation_videos];
                                          videos[index] = { ...videos[index], duration: e.target.value };
                                          setFormData(prev => ({
                                            ...prev,
                                            installation: { ...prev.installation, installation_videos: videos }
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

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                              value={formData.installation.notes}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                installation: { ...prev.installation, notes: e.target.value }
                              }))}
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
                  <Button type="submit" className="flex-1">
                    {editingProduct ? 'Save Changes' : 'Create Product'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsDialogOpen(false); resetForm(); }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Products List */}
      <Tabs value={productListTab} onValueChange={setProductListTab}>
        <TabsList>
          <TabsTrigger value="active">Active ({filteredProducts.length})</TabsTrigger>
          <TabsTrigger value="deleted" className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Recently Deleted ({deletedProducts.length})
          </TabsTrigger>
          {duplicateProducts.length > 0 && (
            <TabsTrigger value="duplicates" className="gap-1.5 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Duplicates ({duplicateProducts.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products ({filteredProducts.length})</CardTitle>
              <CardDescription>Manage your products and their components</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Section */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products by name, brand, model..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-brands">All Brands</SelectItem>
                    {uniqueBrands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={screenSizeFilter} onValueChange={setScreenSizeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="All Sizes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-sizes">All Sizes</SelectItem>
                    {uniqueScreenSizes.map(size => (
                      <SelectItem key={size} value={size}>{size} inch</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="featured">Featured Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products created yet. Create your first product!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Brand / Model</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Edited</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {product.brand} {product.model}
                        </div>
                        {product.year_from && product.year_to && (
                          <div className="text-sm text-muted-foreground">
                            {product.year_from}–{product.year_to}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(product.categories || product.category) && (
                          <Badge variant="secondary">
                            {(product.categories?.name || product.category?.name || 'Category')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.screen_size && product.screen_size.length > 0 &&
                          product.screen_size.map((size: string) => (
                            <Badge key={size} variant="outline">
                              {size}"
                            </Badge>
                          ))
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {product.product_components?.length || 0} SKU
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={product.active ? 'default' : 'secondary'}>
                            {product.active ? 'Active' : 'Inactive'}
                          </Badge>
                          {product.featured && <Badge variant="outline">Featured</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.updated_at ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground" title={new Date(product.updated_at).toLocaleString()}>
                            <Clock className="h-3.5 w-3.5" />
                            {formatTimeAgo(product.updated_at)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePreviewProduct(product)}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSoftDeleteProduct(product)}
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
        </TabsContent>

        <TabsContent value="deleted">
          <Card>
            <CardHeader>
              <CardTitle>Recently Deleted Products</CardTitle>
              <CardDescription>Products that have been soft-deleted. Restore or permanently remove them.</CardDescription>
            </CardHeader>
            <CardContent>
              {deletedProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trash2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No recently deleted products</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Brand / Model</TableHead>
                      <TableHead>Deleted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedProducts.map((product) => (
                      <TableRow key={product.id} className="opacity-60">
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{product.brand} {product.model}</TableCell>
                        <TableCell>
                          {product.updated_at && (
                            <span className="text-sm text-muted-foreground">{formatTimeAgo(product.updated_at)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleRestoreProduct(product)}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Restore
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handlePermanentDeleteProduct(product)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {duplicateProducts.length > 0 && (
          <TabsContent value="duplicates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Duplicate Products
                </CardTitle>
                <CardDescription>Products with identical slugs/names. Review and resolve duplicates.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {duplicateProducts.map(({ name, count, items }) => (
                    <div key={name} className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Copy className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-800">{name}</span>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">{count} duplicates</Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map((product) => (
                          <div key={product.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border">
                            <div>
                              <p className="text-sm font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.brand} {product.model} · Slug: {product.slug}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditProduct(product)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleSoftDeleteProduct(product)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Product Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Preview</DialogTitle>
            <DialogDescription>
              Customer view of this product
            </DialogDescription>
          </DialogHeader>
          
          {previewProduct && (
            <div className="space-y-6">
              {/* Product Header */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold">{previewProduct.name}</h1>
                    <p className="text-xl text-muted-foreground">
                      {previewProduct.brand} {previewProduct.model}
                      {previewProduct.year_from && previewProduct.year_to && (
                        <span> ({previewProduct.year_from}-{previewProduct.year_to})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {previewProduct.active && (
                      <Badge variant="default">Available</Badge>
                    )}
                    {previewProduct.featured && (
                      <Badge variant="outline">⭐ Featured</Badge>
                    )}
                  </div>
                </div>
                
                {/* Screen Sizes */}
                {previewProduct.screen_size && previewProduct.screen_size.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Available Screen Sizes</h3>
                    <div className="flex gap-2">
                      {previewProduct.screen_size.map((size: string) => (
                        <Badge key={size} variant="secondary">
                          {size}" Screen
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Description */}
                {previewProduct.description && (
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {previewProduct.description}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Product Images */}
              {previewProduct.images && previewProduct.images.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-2">Product Images</h3>
                  <p className="text-sm text-muted-foreground mb-4">Click any image to view in full size</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewProduct.images.map((image: any, index: number) => {
                      const isVideo = image.media_type === 'video';
                      return (
                        <div
                          key={index}
                          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group hover:shadow-lg transition-all duration-200"
                          onClick={isVideo ? undefined : () => {
                            const imageInfo = {url: image.url, title: `Product Image ${index + 1}`};
                            setViewingImage(image.url);
                            setViewingImageInfo(imageInfo);
                          }}
                          style={isVideo ? undefined : { cursor: 'pointer' }}
                          title={isVideo ? undefined : "Click to enlarge"}
                        >
                          {isVideo ? (
                            <video
                              src={image.url}
                              className="w-full h-full object-contain bg-black"
                              controls
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={image.url}
                              alt={image.alt_text || `Product image ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-image.png';
                              }}
                            />
                          )}
                          {image.is_primary && (
                            <Badge className="absolute top-2 left-2 z-10" variant="default">
                              Primary
                            </Badge>
                          )}
                          {isVideo && (
                            <Badge className="absolute top-2 right-2 z-10" variant="secondary">
                              Video
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Available Components/Variants Section */}
              <div className="border-t pt-6">
                <h3 className="font-medium mb-2">Available Components</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select components and specify quantities. Click component images to enlarge.
                </p>
                {previewProduct.components && previewProduct.components.length > 0 ? (
                  <div className="grid gap-4">
                    {previewProduct.components.map((component: any, index: number) => {
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                          {component.default_image_url && (
                            <div
                              className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border cursor-pointer group hover:shadow-md transition-all duration-200"
                              onClick={() => {
                                const imageInfo = {url: component.default_image_url, title: `${component.name} - Component Image`};
                                setViewingImage(component.default_image_url);
                                setViewingImageInfo(imageInfo);
                              }}
                              title="Click to enlarge component image"
                            >
                              <img
                                src={component.default_image_url}
                                alt={component.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const imageInfo = {url: component.default_image_url, title: `${component.name} - Component Image`};
                                  setViewingImage(component.default_image_url);
                                  setViewingImageInfo(imageInfo);
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{component.name}</h4>
                            {component.remark && (
                              <span className="text-xs text-amber-600 font-medium">{component.remark}</span>
                            )}
                            <p className="text-sm text-muted-foreground">{component.component_sku}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Stock: {component.stock_level} available
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">RM {component.normal_price?.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">-</Button>
                              <span className="w-12 text-center border rounded px-2 py-1 bg-white">1</span>
                              <Button size="sm" variant="outline">+</Button>
                            </div>
                            <Button size="sm" variant="default">Add</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    <p>No components available for this product</p>
                  </div>
                )}
              </div>
              
              {/* Shopping Cart Summary */}
              <div className="border-t pt-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Your Selection</h4>
                  <div className="text-sm text-muted-foreground mb-3">
                    <p>• No components selected yet</p>
                    <p className="font-medium mt-2">Total: RM 0.00</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1">Add to Cart</Button>
                    <Button className="flex-1">Buy Now</Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  This is how customers will see your product - they select components and quantities
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <Dialog open={!!viewingImage} onOpenChange={() => {
          setViewingImage(null);
          setViewingImageInfo(null);
        }}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {viewingImageInfo?.title || 'Image Viewer'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                View image in full size
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center overflow-hidden">
              <img
                src={viewingImage}
                alt={viewingImageInfo?.title || "Full size view"}
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
    </div>
  );
}