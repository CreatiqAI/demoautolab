import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { fetchVendorNames } from '@/lib/vendorNames';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShoppingCart, Package, Minus, Plus, ArrowLeft, Eye, ChevronDown, Clock, Users, DollarSign, Wrench, Video, Star, Info, PlayCircle, CheckCircle2, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCartDB';
import { useAuth } from '@/hooks/useAuth';
import { usePricing } from '@/hooks/usePricing';
import Header from '@/components/Header';
import LoginPromptButton from '@/components/LoginPromptButton';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ProductInstallationGuide } from '@/types/product-types';
import { cn } from '@/lib/utils';
import { transformImage } from '@/lib/imageTransform';
import CatalogProductCard, { type CatalogCardProduct } from '@/components/CatalogProductCard';

interface ComponentData {
  id: string;
  component_sku: string;
  name: string;
  description: string;
  component_type: string;
  stock_level: number;
  normal_price: number;
  merchant_price: number;
  default_image_url?: string;
  remark?: string;
  is_foc?: boolean;          // free gift when the main item is also bought
  foc_quantity?: number;     // free units per main item / per set (default 1)
  is_foc_trigger?: boolean;  // the main item; buying it unlocks the FOC gifts
  is_bundle_item?: boolean;  // part of the product's "buy the whole set" bundle
}

interface CartItem {
  component: ComponentData;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  model: string;
  year_from: number;
  year_to: number;
  screen_size: string[];
  active: boolean;
  featured: boolean;
  product_images: Array<{
    url: string;
    alt_text: string;
    is_primary: boolean;
    media_type?: 'image' | 'video';
  }>;
  vendor_id?: string | null;
  vendor?: { id: string; business_name: string } | null;
  // Bundle pricing: one fixed total for buying the whole (admin-picked) set.
  bundle_enabled?: boolean;
  bundle_price?: number | null;
  bundle_merchant_price?: number | null;
  bundle_label?: string | null;
}

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Return to the catalog with the filters/search the user came in with.
  // Falls back to in-app history, then a bare catalog, for direct landings.
  const handleBackToCatalog = () => {
    const catalogSearch = (location.state as { catalogSearch?: string } | null)?.catalogSearch;
    if (typeof catalogSearch === 'string') {
      navigate(catalogSearch ? `/catalog?${catalogSearch}` : '/catalog');
    } else if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/catalog');
    }
  };
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<CatalogCardProduct[]>([]);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Lightbox supports both images and videos in the same nav loop, so we
  // store the media type alongside the URL.
  const [lightboxMedia, setLightboxMedia] = useState<Array<{ url: string; mediaType?: string }>>([]);
  const [currentLightboxIndex, setCurrentLightboxIndex] = useState(0);
  // Lightbox zoom: a photo-viewer model — scroll wheel / +- button changes the
  // scale, and when zoomed you grab-and-drag to pan. Offset is a screen-px
  // translation applied before the scale, clamped so the image can't be dragged
  // off the frame.
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const zoomWrapRef = useRef<HTMLDivElement | null>(null);
  // `dragging` gates the pan; `moved` marks that an actual drag happened so the
  // trailing click (which can land on the backdrop) doesn't close the lightbox.
  const dragRef = useRef({ dragging: false, moved: false });
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;

  const resetZoom = () => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    dragRef.current.dragging = false;
  };

  // Keep the pan within the scaled image's overflow so it never leaves the frame.
  const clampOffset = (x: number, y: number, scale: number) => {
    const el = zoomWrapRef.current;
    if (!el) return { x, y };
    const rect = el.getBoundingClientRect(); // base (unscaled) frame size
    const maxX = (rect.width * (scale - 1)) / 2;
    const maxY = (rect.height * (scale - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const applyZoom = (nextScale: number) => {
    const s = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextScale));
    setZoomScale(s);
    setZoomOffset((o) => (s === 1 ? { x: 0, y: 0 } : clampOffset(o.x, o.y, s)));
  };

  const toggleZoom = () => (zoomScale > 1 ? resetZoom() : applyZoom(2.5));

  // Drag-to-pan via window listeners so the pan keeps tracking even when the
  // cursor leaves the image, and releasing outside never closes the lightbox.
  const beginDrag = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const originX = zoomOffset.x, originY = zoomOffset.y;
    const scale = zoomScale;
    dragRef.current.dragging = true;
    dragRef.current.moved = false;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      setZoomOffset(clampOffset(originX + dx, originY + dy, scale));
    };
    const onUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Backdrop click: if we just panned, ignore it; if zoomed, reset to original
  // size first; only close when the image is already at its original size.
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (dragRef.current.moved) { dragRef.current.moved = false; return; }
    if (zoomScale > 1) { resetZoom(); return; }
    closeLightbox();
  };
  const [installationGuide, setInstallationGuide] = useState<ProductInstallationGuide | null>(null);
  const [installationOpen, setInstallationOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const { toast } = useToast();
  const { addToCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const { getDisplayPrice, customerType } = usePricing();

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchProductComponents();
      fetchInstallationGuide();
    }
  }, [id]);

  // Recommend related products once the current product is loaded.
  useEffect(() => {
    if (product) {
      fetchSimilarProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const fetchSimilarProducts = async () => {
    if (!product) return;

    const brand = product.brand;
    const categoryId = (product as any).category_id as string | null | undefined;

    // Match on the same brand and/or category; bail if we have nothing to match on.
    const orFilters: string[] = [];
    if (brand) orFilters.push(`brand.eq.${brand}`);
    if (categoryId) orFilters.push(`category_id.eq.${categoryId}`);
    if (orFilters.length === 0) {
      setSimilarProducts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products_new' as any)
        .select(`
          id, name, slug, brand, model, year_from, year_to, category_id, featured, vendor_id,
          categories:category_id ( name ),
          product_components ( count ),
          product_images_new ( url, is_primary, sort_order, media_type )
        `)
        .eq('active', true)
        .eq('approval_status', 'APPROVED')
        .neq('id', product.id)
        .or(orFilters.join(','))
        .limit(24);

      if (error || !data) {
        setSimilarProducts([]);
        return;
      }

      // Pick the best thumbnail (primary first, prefer images over videos).
      const pickImage = (imgs: any[] | null) => {
        if (!imgs || imgs.length === 0) return { url: null, type: 'image' };
        const sorted = [...imgs].sort(
          (a, b) =>
            (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
            (a.sort_order ?? 999) - (b.sort_order ?? 999)
        );
        const chosen = sorted.find((i) => i.media_type !== 'video') || sorted[0];
        return { url: chosen.url, type: chosen.media_type || 'image' };
      };

      const relatedVendorNames = await fetchVendorNames((data as any[]).map((p) => p.vendor_id));

      // Rank by relevance: same model > same brand > same category.
      const scored = (data as any[]).map((p) => {
        const img = pickImage(p.product_images_new);
        const score =
          (p.model && product.model && p.model === product.model ? 4 : 0) +
          (p.brand && brand && p.brand === brand ? 2 : 0) +
          (p.category_id && categoryId && p.category_id === categoryId ? 1 : 0);
        return {
          score,
          item: {
            id: p.id,
            name: p.name,
            brand: p.brand,
            model: p.model,
            year_from: p.year_from,
            year_to: p.year_to,
            category_name: p.categories?.name ?? null,
            vendor_name: p.vendor_id ? relatedVendorNames[p.vendor_id] ?? null : null,
            component_count: p.product_components?.[0]?.count ?? 0,
            featured: !!p.featured,
            image_url: img.url,
            image_type: img.type,
          } as CatalogCardProduct,
        };
      });

      scored.sort((a, b) => b.score - a.score);
      setSimilarProducts(scored.slice(0, 8).map((s) => s.item));
    } catch {
      // Recommendations are best-effort; never block the page on failure.
      setSimilarProducts([]);
    }
  };

  // --- FOC (free-of-charge) bundle logic ---
  // A product may mark one component as the "main item" (is_foc_trigger) and one
  // or more as free gifts (is_foc). A gift is free only while the main item is in
  // the selection. Fallback: if no explicit trigger is set, any selected non-FOC
  // component acts as the trigger ("buy anything -> gift is free").
  const focComponents = components.filter(c => c.is_foc);
  const hasExplicitTrigger = components.some(c => c.is_foc_trigger);
  const triggerName = components.find(c => c.is_foc_trigger)?.name;

  // Number of "sets" the customer is buying = total quantity of the main item(s).
  // The free gift quantity scales with this (buy 2 casings -> 2 sets of gifts).
  // Fallback: if no explicit main is marked, any paid (non-FOC) item counts as
  // one set, so the gift still unlocks but does not multiply.
  const mainQty = hasExplicitTrigger
    ? localCart.reduce((sum, item) => item.component.is_foc_trigger ? sum + item.quantity : sum, 0)
    : (localCart.some(item => !item.component.is_foc && item.quantity >= 1) ? 1 : 0);
  const triggerSelected = mainQty > 0;

  // Free units of a given gift = its per-set quantity × number of sets bought.
  const focFreeQty = (component: ComponentData) => Math.max(1, component.foc_quantity ?? 1) * mainQty;

  // --- Bundle pricing ---
  // A product can define one fixed "buy the whole set" total (a separate price
  // for normal vs merchant customers). The admin flags which components make up
  // the set (is_bundle_item). When ALL bundle components are selected (qty >= 1),
  // those lines are re-priced so their sum equals the bundle total; anything else
  // stays at its individual price.
  const bundleComponents = components.filter(c => c.is_bundle_item);
  const bundleTotalRaw =
    customerType === 'merchant'
      ? (product?.bundle_merchant_price ?? product?.bundle_price)
      : product?.bundle_price;
  const bundleTotal = Number(bundleTotalRaw ?? 0);
  const bundleAvailable =
    !!product?.bundle_enabled && bundleComponents.length >= 2 && bundleTotal > 0;

  // Sum of the bundle components at their individual (undiscounted) prices.
  const bundleIndividualTotal = bundleComponents.reduce(
    (sum, c) => sum + getDisplayPrice(c.normal_price, c.merchant_price),
    0,
  );
  const bundleSavings = Math.max(0, bundleIndividualTotal - bundleTotal);

  // Is every bundle component currently in the selection (qty >= 1)?
  const bundleFullySelected =
    bundleAvailable &&
    bundleComponents.every(c =>
      localCart.some(item => item.component.id === c.id && item.quantity >= 1),
    );

  // Distribute the fixed bundle total across the bundle components in proportion
  // to their individual price; the last component absorbs the rounding remainder
  // so the line prices sum to exactly the bundle total.
  const bundleUnitPrices: Record<string, number> = (() => {
    const map: Record<string, number> = {};
    if (!bundleAvailable || bundleIndividualTotal <= 0) return map;
    let allocated = 0;
    bundleComponents.forEach((c, i) => {
      const indiv = getDisplayPrice(c.normal_price, c.merchant_price);
      const isLast = i === bundleComponents.length - 1;
      const share = isLast
        ? Math.round((bundleTotal - allocated) * 100) / 100
        : Math.round(bundleTotal * (indiv / bundleIndividualTotal) * 100) / 100;
      if (!isLast) allocated += share;
      map[c.id] = Math.max(0, share);
    });
    return map;
  })();

  // Price a component is charged at, factoring in FOC + bundle eligibility.
  const getEffectivePrice = (component: ComponentData) => {
    if (component.is_foc && triggerSelected) return 0;
    if (bundleFullySelected && component.is_bundle_item && bundleUnitPrices[component.id] != null) {
      return bundleUnitPrices[component.id];
    }
    return getDisplayPrice(component.normal_price, component.merchant_price);
  };

  // Auto-include free gifts when the main item is selected, scaling their quantity
  // to the number of sets; remove them when the main item leaves the selection.
  // Only mutates state when something actually changes, and never touches the main
  // quantity, so it cannot loop.
  useEffect(() => {
    if (focComponents.length === 0) return;
    setLocalCart(prev => {
      let next = prev;
      let changed = false;
      for (const foc of focComponents) {
        const idx = next.findIndex(i => i.component.id === foc.id);
        const freeQty = Math.max(1, foc.foc_quantity ?? 1) * mainQty;
        if (mainQty > 0) {
          if (idx === -1) {
            next = [...next, { component: foc, quantity: freeQty }];
            changed = true;
          } else if (next[idx].quantity !== freeQty) {
            next = next.map((item, n) => (n === idx ? { ...item, quantity: freeQty } : item));
            changed = true;
          }
        } else if (idx !== -1) {
          next = next.filter(i => i.component.id !== foc.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainQty, components]);

  const fetchInstallationGuide = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('product_installation_guides' as any)
        .select('*')
        .eq('product_id', id)
        .maybeSingle();

      if (!error && data) {
        setInstallationGuide(data as unknown as ProductInstallationGuide);
      }
    } catch (error) {
      // No installation guide for this product - that's fine
    }
  };

  // Helper function to get video embed
  const getVideoEmbed = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full rounded-lg"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Direct video file (uploaded MP4/WebM/MOV or any non-YouTube/Vimeo URL):
    // play it inline with native HTML5 controls.
    return (
      <video
        src={url}
        className="w-full h-full rounded-lg bg-black"
        controls
        playsInline
        preload="metadata"
      />
    );
  };

  const fetchProduct = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('products_new' as any)
        .select(`
          *,
          product_images_new (
            url,
            alt_text,
            is_primary,
            sort_order,
            media_type
          )
        `)
        .eq('id', id)
        .eq('active', true)
        .eq('approval_status', 'APPROVED')
        .single();

      if (error) {
        navigate('/catalog');
        return;
      }

      const vendorId = (data as any).vendor_id as string | null;
      const vendorNames = await fetchVendorNames([vendorId]);

      const productData: Product = {
        ...(data as any),
        product_images: (data as any).product_images_new || [],
        vendor: vendorId && vendorNames[vendorId]
          ? { id: vendorId, business_name: vendorNames[vendorId] }
          : null,
      };

      setProduct(productData);
    } catch (error) {
      navigate('/catalog');
    }
  };

  const fetchProductComponents = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data: productComponentData, error: productComponentError } = await supabase
        .from('product_components' as any)
        .select(`
          remark,
          is_foc,
          foc_quantity,
          is_foc_trigger,
          is_bundle_item,
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', id)
        .order('display_order', { ascending: true });

      if (productComponentError) {
        setComponents([]);
        return;
      }

      if (!productComponentData || productComponentData.length === 0) {
        setComponents([]);
        return;
      }

      const transformedComponents = (productComponentData as any).map((pc: any) => {
        const component = pc.component_library;
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
          remark: pc.remark || null,
          is_foc: pc.is_foc ?? false,
          foc_quantity: pc.foc_quantity ?? 1,
          is_foc_trigger: pc.is_foc_trigger ?? false,
          is_bundle_item: pc.is_bundle_item ?? false
        };
      });

      setComponents(transformedComponents);
    } catch (error: any) {
      setComponents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const updateLocalQuantity = (component: ComponentData, newQuantity: number) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to add items to your cart",
        variant: "destructive"
      });
      return;
    }

    if (newQuantity < 0) return;

    setLocalCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.component.id === component.id);

      if (newQuantity === 0) {
        return prevCart.filter(item => item.component.id !== component.id);
      }

      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex] = { ...newCart[existingIndex], quantity: newQuantity };
        return newCart;
      } else {
        return [...prevCart, { component, quantity: newQuantity }];
      }
    });
  };

  const getLocalCartQuantity = (componentId: string) => {
    const cartItem = localCart.find(item => item.component.id === componentId);
    return cartItem?.quantity || 0;
  };

  const getLocalCartTotal = () => {
    return localCart.reduce((total, item) => {
      return total + (getEffectivePrice(item.component) * item.quantity);
    }, 0);
  };

  const getLocalCartTotalQuantity = () => {
    return localCart.reduce((total, item) => total + item.quantity, 0);
  };

  const openLightbox = (media: Array<{ url: string; mediaType?: string }>, startIndex: number) => {
    setLightboxMedia(media);
    setCurrentLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxMedia([]);
    setCurrentLightboxIndex(0);
    resetZoom();
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (lightboxMedia.length === 0) return;
    const newIndex = direction === "prev"
      ? (currentLightboxIndex - 1 + lightboxMedia.length) % lightboxMedia.length
      : (currentLightboxIndex + 1) % lightboxMedia.length;
    setCurrentLightboxIndex(newIndex);
    resetZoom(); // reset zoom when switching media
  };

  // Keyboard navigation for the lightbox (arrows to move, Radix handles Esc).
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigateLightbox('prev');
      else if (e.key === 'ArrowRight') navigateLightbox('next');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, lightboxMedia.length, currentLightboxIndex]);

  // One-tap: add the complete bundle straight to the cart at the bundle price
  // (each component priced at its distributed share so the total = bundleTotal).
  const handleAddBundleToCart = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please sign in to add items to your cart',
        variant: 'destructive',
      });
      return;
    }
    if (!bundleAvailable) return;

    // One shared id + label tags every line of this bundle so the cart groups them
    // into a single bundle row at one price (instead of separate discounted items).
    const bundleId = crypto.randomUUID();
    const bundleLabelText = product?.bundle_label || 'Complete Bundle';

    bundleComponents.forEach(component => {
      addToCart({
        component_sku: component.component_sku,
        name: component.name,
        normal_price: bundleUnitPrices[component.id] ?? getDisplayPrice(component.normal_price, component.merchant_price),
        quantity: 1,
        product_name: product?.name || 'Unknown Product',
        component_image: component.default_image_url,
        is_foc: false,
        is_foc_trigger: false,
        bundle_id: bundleId,
        bundle_label: bundleLabelText,
      });
    });

    toast({
      title: 'Bundle added to cart!',
      description: `${product?.bundle_label || 'Bundle'} · ${bundleComponents.length} items for ${formatPrice(bundleTotal)}`,
    });
  };

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to add items to your cart",
        variant: "destructive"
      });
      return;
    }

    if (localCart.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please select at least one item',
        variant: 'destructive'
      });
      return;
    }

    localCart.forEach(cartItem => {
      const isFreeGift = !!(cartItem.component.is_foc && triggerSelected);
      // getEffectivePrice already resolves FOC (0) + bundle + individual pricing.
      const unitPrice = getEffectivePrice(cartItem.component);
      const quantity = isFreeGift ? focFreeQty(cartItem.component) : cartItem.quantity;
      addToCart({
        component_sku: cartItem.component.component_sku,
        name: cartItem.component.name,
        normal_price: unitPrice,
        quantity,
        product_name: product?.name || 'Unknown Product',
        component_image: cartItem.component.default_image_url,
        is_foc: isFreeGift,
        // Mark the trigger so the cart treats only it (not other paid add-ons
        // bought from this page) as the bundle's main item.
        is_foc_trigger: !isFreeGift && !!cartItem.component.is_foc_trigger,
      });
    });

    toast({
      title: 'Added to Cart!',
      description: `${getLocalCartTotalQuantity()} item${getLocalCartTotalQuantity() > 1 ? 's' : ''} added to your cart`,
    });

    setLocalCart([]);
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-lime-500"></div>
            <p className="text-gray-500 text-sm">Loading product…</p>
          </div>
        </div>
      </div>
    );
  }

  const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0f172a] font-sans pb-20 md:pb-8">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-12 max-w-7xl">
        {/* Breadcrumb / Back */}
        <nav className="mb-3 md:mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToCatalog}
            className="group text-xs uppercase tracking-[0.2em] font-bold px-0 text-slate-500 hover:bg-transparent hover:text-lime-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Catalog
          </Button>
        </nav>

        {/* Main Product Section */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_18px_50px_-28px_rgba(0,0,0,0.25)] border border-gray-200/70 overflow-hidden mb-6 md:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Product Images */}
            <div className="bg-[#f7f7f4] lg:border-r border-gray-200/70 flex flex-col select-none">
              {/* Main Image/Video */}
              {(() => {
                const currentMedia = product.product_images[selectedImage];
                const isVideo = currentMedia?.media_type === 'video';
                const isEmbed = isVideo && currentMedia?.url && /youtube\.com\/watch|youtu\.be\/|vimeo\.com\//i.test(currentMedia.url);
                const embedUrl = isEmbed ? (() => {
                  const ytMatch = currentMedia.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
                  const vimeoMatch = currentMedia.url.match(/vimeo\.com\/(\d+)/);
                  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
                  return null;
                })() : null;

                return (
                  <div
                    className="relative w-full min-h-[55vw] sm:min-h-[45vw] lg:min-h-[28vw] max-h-[70vw] sm:max-h-[55vw] lg:max-h-[35vw] bg-[#f7f7f4] group flex items-center justify-center overflow-hidden"
                    {...(!isVideo ? { onClick: () => openLightbox(product.product_images.map(img => ({ url: img.url, mediaType: img.media_type })), selectedImage), style: { cursor: 'zoom-in' } } : {})}
                  >
                    {isVideo ? (
                      embedUrl ? (
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <video
                          src={currentMedia?.url}
                          className="w-full h-full object-contain"
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      )
                    ) : (
                      <>
                        <img
                          src={transformImage(currentMedia?.url || primaryImage?.url || '/placeholder.svg', { width: 900 })}
                          alt={currentMedia?.alt_text || product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-300" />
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-white/70 rounded-full pl-2.5 pr-3 py-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]">
                          <Eye className="h-3.5 w-3.5 text-lime-600" />
                          <span className="text-[11px] font-semibold text-gray-800">Click to zoom</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Thumbnails */}
              {product.product_images.length > 1 && (
                <div className="flex gap-1.5 sm:gap-2 justify-start sm:justify-center p-2 sm:p-4 border-t border-gray-200/70 bg-white z-10 overflow-x-auto no-scrollbar">
                  {product.product_images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={cn(
                        "relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 bg-[#f7f7f4] transition-all duration-200 flex-shrink-0",
                        index === selectedImage
                          ? 'border-lime-400 ring-2 ring-lime-400/25'
                          : 'border-transparent hover:border-lime-200'
                      )}
                    >
                      {image.media_type === 'video' ? (() => {
                        const isEmbed = /youtube\.com\/watch|youtu\.be\/|vimeo\.com\//i.test(image.url);
                        const ytMatch = image.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
                        const ytThumb = ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg` : null;
                        return (
                          <div className="relative w-full h-full bg-gray-900">
                            {ytThumb ? (
                              <img src={ytThumb} alt={image.alt_text || `Video ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                            ) : isEmbed ? null : (
                              <video
                                src={`${image.url}#t=0.1`}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                                playsInline
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <PlayCircle className="h-6 w-6 text-white drop-shadow-md" />
                            </div>
                          </div>
                        );
                      })() : (
                        <img
                          src={transformImage(image.url, { width: 128, quality: 60 })}
                          alt={image.alt_text || `View ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col">
              {/* Product Header */}
              <div className="mb-4 sm:mb-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 rounded-md px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-none">
                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                    In Stock
                  </Badge>
                  {product.featured && (
                    <Badge className="bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100 rounded-md px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-none">
                      <Star className="h-3 w-3 mr-1.5 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl md:text-4xl font-heading font-bold text-[#0f172a] mb-2 sm:mb-3 uppercase tracking-wide leading-tight">
                  {product.name}
                </h1>

                {/* Sold by partner badge */}
                {product.vendor?.business_name && (
                  <div className="mb-3 sm:mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-lime-50 border border-lime-200 text-xs font-medium text-lime-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                      Sold by {product.vendor.business_name}
                    </span>
                  </div>
                )}

                {/* Brand/Model/Year */}
                <p className="text-sm sm:text-base text-slate-500 mb-3 sm:mb-5 font-normal">
                  <span className="font-semibold text-[#0f172a] pr-1">{product.brand}</span>
                  {product.model}
                  {product.year_from && product.year_to && (
                    <span className="text-slate-400 ml-2">
                      ({product.year_from}–{product.year_to})
                    </span>
                  )}
                </p>

                {/* Screen Sizes */}
                {product.screen_size && product.screen_size.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.screen_size.map((size) => (
                      <Badge key={size} variant="outline" className="text-xs">
                        {size}" Display
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-6">
                  <p className="text-slate-600 leading-relaxed font-light text-sm md:text-base">
                    {product.description}
                  </p>
                </div>
              )}

              <Separator className="my-5 border-slate-100" />

              {/* Component Selection */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#0f172a] uppercase tracking-wider">
                    Select Components
                  </h2>
                  <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">
                    {components.length} option{components.length !== 1 ? 's' : ''} available
                  </span>
                </div>

                {/* Complete Bundle offer — buy the whole set for one special price */}
                {!loading && bundleAvailable && (
                  <div className={cn(
                    "mb-4 rounded-2xl border p-4 shadow-sm transition-colors",
                    bundleFullySelected
                      ? "border-lime-300 bg-lime-50"
                      : "border-lime-200 bg-gradient-to-br from-lime-50 to-white"
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f172a]">
                            🎁 {product?.bundle_label || 'Complete Bundle'}
                          </h3>
                          {bundleSavings > 0 && (
                            <span className="text-[10px] font-bold text-lime-700 bg-lime-100 border border-lime-200 rounded-full px-2 py-0.5">
                              Save {formatPrice(bundleSavings)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Get all {bundleComponents.length} components together
                          {bundleFullySelected && (
                            <span className="text-lime-700 font-semibold"> · Applied ✓</span>
                          )}
                        </p>
                        <div className="flex items-baseline gap-2 mt-2">
                          {bundleSavings > 0 && (
                            <span className="text-sm text-slate-400 line-through">
                              {formatPrice(bundleIndividualTotal)}
                            </span>
                          )}
                          <span className="text-2xl font-bold text-[#0f172a]">
                            {formatPrice(bundleTotal)}
                          </span>
                        </div>
                      </div>

                      {user ? (
                        <Button
                          onClick={handleAddBundleToCart}
                          disabled={cartLoading}
                          className="flex-shrink-0 h-10 px-4 rounded bg-lime-600 text-white hover:bg-lime-700 transition-colors font-semibold text-xs shadow"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                          Add bundle
                        </Button>
                      ) : (
                        <LoginPromptButton
                          className="flex-shrink-0 h-10 px-4 rounded bg-lime-600 text-white hover:bg-lime-700 transition-colors font-semibold text-xs shadow"
                          redirectTo={`/product/${id}`}
                        >
                          Login
                        </LoginPromptButton>
                      )}
                    </div>

                    {/* What's included in the bundle */}
                    <div className="mt-3 border-t border-lime-200/70 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        What's included ({bundleComponents.length})
                      </p>
                      <ul className="space-y-1.5">
                        {bundleComponents.map((c) => (
                          <li key={c.id} className="flex items-center gap-2 text-xs text-slate-700">
                            {c.default_image_url ? (
                              <img
                                src={transformImage(c.default_image_url, { width: 64, quality: 70 })}
                                alt={c.name}
                                className="h-8 w-8 rounded object-cover border border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-slate-100 border border-slate-200 flex-shrink-0" />
                            )}
                            <span className="flex-1 min-w-0 truncate">{c.name}</span>
                            <span className="text-slate-400 line-through">
                              {formatPrice(getDisplayPrice(c.normal_price, c.merchant_price))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : components.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No components available</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                    {components.map((component) => {
                      const quantity = getLocalCartQuantity(component.id);
                      const isExpanded = expandedComponent === component.id;
                      const isFreeGift = !!component.is_foc && triggerSelected;
                      const price = getEffectivePrice(component);
                      const originalPrice = getDisplayPrice(component.normal_price, component.merchant_price);

                      return (
                        <div
                          key={component.id}
                          className={cn(
                            "border rounded-xl transition-all duration-200",
                            isExpanded ? 'border-gray-400 bg-gray-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white',
                            quantity > 0 && !isExpanded && 'border-gray-300 bg-gray-50/30'
                          )}
                        >
                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => setExpandedComponent(isExpanded ? null : component.id)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Thumbnail */}
                              {component.default_image_url && (
                                <div className={cn(
                                  "flex-shrink-0 rounded-lg overflow-hidden bg-white border transition-all duration-200",
                                  isExpanded ? 'w-16 h-20' : 'w-12 h-16'
                                )}>
                                  <img
                                    src={transformImage(component.default_image_url, { width: 160, quality: 75 })}
                                    alt={component.name}
                                    className="w-full h-full object-contain p-0.5"
                                    loading="lazy"
                                    decoding="async"
                                    onClick={(e) => {
                                      if (isExpanded) {
                                        e.stopPropagation();
                                        openLightbox([{ url: component.default_image_url!, mediaType: 'image' }], 0);
                                      }
                                    }}
                                  />
                                </div>
                              )}

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className={cn(
                                      "font-medium text-gray-900 transition-all",
                                      isExpanded ? 'text-base' : 'text-sm truncate'
                                    )}>
                                      {component.name}
                                    </h3>
                                    {component.remark && (
                                      <span className="text-xs text-amber-600 font-medium">{component.remark}</span>
                                    )}
                                    {component.is_bundle_item && bundleAvailable && (
                                      <span className="ml-1 inline-block text-[10px] font-semibold text-lime-700 bg-lime-50 border border-lime-200 rounded px-1.5 py-0.5">Bundle</span>
                                    )}
                                    {isFreeGift && (
                                      <span className="ml-1 inline-block text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded px-1.5 py-0.5">🎁 FREE GIFT</span>
                                    )}
                                    {component.is_foc && !triggerSelected && (
                                      <span className="block text-[11px] text-green-700 font-medium mt-0.5">🎁 FREE when you add {triggerName || 'the main item'}</span>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      {isFreeGift ? (
                                        <>
                                          <span className="font-bold text-green-700">FREE</span>
                                          {originalPrice > 0 && (
                                            <span className="text-xs text-gray-400 line-through">{formatPrice(originalPrice)}</span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="font-semibold text-primary">
                                          {formatPrice(price)}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">
                                        {component.stock_level} in stock
                                      </span>
                                    </div>
                                  </div>

                                  {/* Controls */}
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {isFreeGift ? (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                                        FREE ×{focFreeQty(component)}
                                      </div>
                                    ) : user && quantity > 0 ? (
                                      <div className="flex items-center border rounded border-slate-200 bg-white">
                                        <button
                                          onClick={() => updateLocalQuantity(component, quantity - 1)}
                                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-6 text-center font-medium text-[10px] sm:text-xs">{quantity}</span>
                                        <button
                                          onClick={() => updateLocalQuantity(component, quantity + 1)}
                                          disabled={quantity >= component.stock_level}
                                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50 text-slate-600"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : user ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateLocalQuantity(component, 1)}
                                        disabled={component.stock_level === 0}
                                        className="h-7 px-3 font-semibold text-[10px] uppercase tracking-wider border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-gray-900 rounded transition-colors"
                                      >
                                        Add
                                      </Button>
                                    ) : (
                                      <LoginPromptButton
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-3 font-semibold text-[10px] uppercase tracking-wider border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-gray-900 rounded transition-colors"
                                        redirectTo={`/product/${id}`}
                                      >
                                        Login
                                      </LoginPromptButton>
                                    )}

                                    <ChevronDown className={cn(
                                      "h-4 w-4 text-gray-400 transition-transform duration-200",
                                      isExpanded && "rotate-180"
                                    )} />
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm text-gray-600 mb-2">
                                      {component.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <span>SKU: {component.component_sku}</span>
                                      <span>Type: {component.component_type}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart Summary — Desktop */}
              {components.length > 0 && (
                <div className="hidden md:block mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-1">
                        {localCart.length > 0
                          ? `${getLocalCartTotalQuantity()} item${getLocalCartTotalQuantity() !== 1 ? 's' : ''} selected`
                          : 'No items selected'
                        }
                      </p>
                      {localCart.length > 0 && (
                        <p className="text-2xl font-bold text-[#0f172a]">
                          {formatPrice(getLocalCartTotal())}
                        </p>
                      )}
                      {bundleFullySelected && (
                        <p className="text-xs font-semibold text-lime-700 mt-0.5">
                          🎁 Bundle applied — you save {formatPrice(bundleSavings)}
                        </p>
                      )}
                    </div>

                    {user ? (
                      <Button
                        onClick={handleAddToCart}
                        disabled={cartLoading || localCart.length === 0}
                        className="h-10 px-6 rounded bg-[#0f172a] text-white hover:bg-lime-600 transition-all duration-300 font-semibold text-xs shadow"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                        {cartLoading ? 'Adding...' : 'Add to Cart'}
                      </Button>
                    ) : (
                      <LoginPromptButton
                        className="h-10 px-6 rounded bg-[#0f172a] text-white hover:bg-lime-600 transition-all duration-300 font-semibold text-xs shadow"
                        redirectTo={`/product/${id}`}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                        Login to Add
                      </LoginPromptButton>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Installation Guide Section — visible to merchant & panel customers only */}
        {installationGuide && customerType === 'merchant' && (
          <div className="mt-8">
            <Collapsible open={installationOpen} onOpenChange={setInstallationOpen}>
              <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-sm bg-white">
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between p-5 md:p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                        <Wrench className="h-5 w-5 text-gray-700" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-[#0f172a] tracking-wide">Installation Guide</h3>
                        <p className="text-sm text-slate-500 font-light">
                          {installationGuide.recommended_time && `${installationGuide.recommended_time}`}
                          {installationGuide.recommended_time && installationGuide.installation_price && ' • '}
                          {installationGuide.installation_price && `${formatPrice(installationGuide.installation_price)} fee`}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "h-5 w-5 text-gray-400 transition-transform duration-300",
                      installationOpen && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 sm:px-5 pb-4 sm:pb-5 space-y-4 sm:space-y-5">
                    <Separator className="border-slate-100" />

                    {/* Info Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {installationGuide.recommended_time && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <Clock className="h-5 w-5 text-slate-400 mb-2" />
                          <p className="text-xs font-medium text-slate-500 mb-1">Time Required</p>
                          <p className="font-semibold text-[#0f172a]">{installationGuide.recommended_time}</p>
                        </div>
                      )}

                      {installationGuide.workman_power && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <Users className="h-5 w-5 text-slate-400 mb-2" />
                          <p className="text-xs font-medium text-slate-500 mb-1">Workers Needed</p>
                          <p className="font-semibold text-[#0f172a]">
                            {installationGuide.workman_power} {installationGuide.workman_power === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      )}

                      {installationGuide.dealer_price && installationGuide.dealer_price > 0 && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <DollarSign className="h-5 w-5 text-slate-400 mb-2" />
                          <p className="text-xs font-medium text-slate-500 mb-1">Dealer Price</p>
                          <p className="font-semibold text-gray-700">{formatPrice(installationGuide.dealer_price)}</p>
                        </div>
                      )}

                      {installationGuide.rsp && installationGuide.rsp > 0 && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <DollarSign className="h-5 w-5 text-slate-400 mb-2" />
                          <p className="text-xs font-medium text-slate-500 mb-1">RSP</p>
                          <p className="font-semibold text-gray-700">{formatPrice(installationGuide.rsp)}</p>
                        </div>
                      )}

                      {installationGuide.installation_price && installationGuide.installation_price > 0 && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <DollarSign className="h-5 w-5 text-slate-400 mb-2" />
                          <p className="text-xs font-medium text-slate-500 mb-1">Installation Price</p>
                          <p className="font-semibold text-gray-700">{formatPrice(installationGuide.installation_price)}</p>
                        </div>
                      )}

                      {installationGuide.difficulty_level && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <Info className="h-5 w-5 text-slate-400 mb-2" />
                          <p className="text-xs font-medium text-slate-500 mb-1">Difficulty</p>
                          <Badge
                            className={cn(
                              "capitalize rounded-md px-2 py-0.5 font-medium text-xs shadow-none border",
                              installationGuide.difficulty_level === 'easy' && 'bg-green-50 text-green-700 hover:bg-green-50 border-green-100',
                              installationGuide.difficulty_level === 'medium' && 'bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-100',
                              installationGuide.difficulty_level === 'hard' && 'bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-100',
                              installationGuide.difficulty_level === 'expert' && 'bg-red-50 text-red-700 hover:bg-red-50 border-red-100'
                            )}
                          >
                            {installationGuide.difficulty_level}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Installation Videos */}
                    {installationGuide.installation_videos && installationGuide.installation_videos.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <PlayCircle className="h-4 w-4 text-gray-500" />
                          <h4 className="font-medium text-gray-900">Installation Videos</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {installationGuide.installation_videos.map((video, index) => (
                            <div key={index} className="rounded-xl overflow-hidden border">
                              <div className="aspect-video bg-gray-100">
                                {getVideoEmbed(video.url)}
                              </div>
                              {(video.title || video.duration) && (
                                <div className="p-3 bg-white">
                                  {video.title && <p className="font-medium text-sm">{video.title}</p>}
                                  {video.duration && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <Clock className="h-3 w-3" />
                                      {video.duration}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {installationGuide.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Installation Notes
                        </h4>
                        <p className="text-sm text-amber-800">{installationGuide.notes}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-6">
          <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
            <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-sm bg-white">
              <CollapsibleTrigger className="w-full group">
                <div className="flex items-center justify-between p-5 md:p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                      <Star className="h-5 w-5 text-gray-700" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg text-[#0f172a] tracking-wide">Customer Reviews</h3>
                      <p className="text-sm text-slate-500 font-light mt-0.5">See what others are saying about this product</p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-gray-400 transition-transform duration-300",
                    reviewsOpen && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 sm:px-6 md:px-8 pb-6 md:pb-8">
                  <Separator className="mb-8 border-slate-100" />
                  {showReviewForm ? (
                    <ReviewForm
                      productId={product.id}
                      onSuccess={() => {
                        setShowReviewForm(false);
                      }}
                      onCancel={() => setShowReviewForm(false)}
                    />
                  ) : (
                    <ReviewsSection
                      productId={product.id}
                      onWriteReview={() => {
                        // Reviews are tied to an account: guests must sign in first,
                        // then they're returned here to write it.
                        if (!user) {
                          toast({
                            title: 'Login required',
                            description: 'Please sign in to write a review.',
                          });
                          navigate(`/auth?redirect=${encodeURIComponent(`/product/${id}`)}`);
                          return;
                        }
                        setShowReviewForm(true);
                      }}
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-6 md:mt-8">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-[#0f172a] tracking-wide">Similar Products</h2>
                <p className="text-sm text-slate-500 font-light mt-0.5">You might also be interested in these</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {similarProducts.map((sp) => (
                <CatalogProductCard
                  key={sp.id}
                  product={sp}
                  onClick={() => navigate(`/product/${sp.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Cart Bar */}
      {components.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {localCart.length > 0 ? (
                <>
                  <p className="text-[10px] font-medium text-slate-400">{getLocalCartTotalQuantity()} item{getLocalCartTotalQuantity() !== 1 ? 's' : ''}</p>
                  <p className="text-lg font-bold text-[#0f172a]">{formatPrice(getLocalCartTotal())}</p>
                  {bundleFullySelected && (
                    <p className="text-[10px] font-semibold text-lime-700">🎁 Bundle · save {formatPrice(bundleSavings)}</p>
                  )}
                </>
              ) : bundleAvailable ? (
                <>
                  <p className="text-[10px] font-medium text-lime-700">🎁 {product?.bundle_label || 'Bundle'}</p>
                  <p className="text-lg font-bold text-[#0f172a]">{formatPrice(bundleTotal)}</p>
                </>
              ) : (
                <p className="text-xs text-slate-400">No items selected</p>
              )}
            </div>
            {user ? (
              <Button
                onClick={handleAddToCart}
                disabled={cartLoading || localCart.length === 0}
                className="h-10 px-5 rounded-lg bg-[#0f172a] text-white hover:bg-lime-600 transition-all font-semibold text-xs shadow shrink-0"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                {cartLoading ? 'Adding...' : 'Add to Cart'}
              </Button>
            ) : (
              <LoginPromptButton
                className="h-10 px-5 rounded-lg bg-[#0f172a] text-white hover:bg-lime-600 transition-all font-semibold text-xs shadow shrink-0"
                redirectTo={`/product/${id}`}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                Login to Add
              </LoginPromptButton>
            )}
          </div>
        </div>
      )}

      {/* Media Lightbox — frosted backdrop (matches Shop Details) + full-image zoom.
          Radix primitives are used directly so the OVERLAY itself carries the
          backdrop-blur (shadcn's DialogContent renders a fixed solid overlay). */}
      <DialogPrimitive.Root open={lightboxOpen} onOpenChange={(o) => { if (!o) closeLightbox(); }}>
        <DialogPrimitive.Portal>
          {/* Frosted overlay: the product page blurs through, gently tinted. */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-0 z-[60] flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <DialogPrimitive.Title className="sr-only">{product.name} media</DialogPrimitive.Title>
            {(() => {
              const current = lightboxMedia[currentLightboxIndex];
              if (!current) return null;
              const isVideo = current.mediaType === 'video';
              const ytMatch = isVideo ? current.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/) : null;
              const vimeoMatch = isVideo ? current.url.match(/vimeo\.com\/(\d+)/) : null;
              const embedUrl = ytMatch
                ? `https://www.youtube.com/embed/${ytMatch[1]}`
                : vimeoMatch
                  ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
                  : null;
              const canZoom = !isVideo;

              return (
                <>
                  {/* Top-right controls — white circles, matching Shop Details */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    {canZoom && (
                      <button
                        onClick={toggleZoom}
                        aria-label={zoomScale > 1 ? 'Zoom out' : 'Zoom in'}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-900 shadow-xl ring-1 ring-black/10 hover:bg-gray-100 hover:scale-105 transition"
                      >
                        {zoomScale > 1 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                      </button>
                    )}
                    <button
                      onClick={closeLightbox}
                      aria-label="Close"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-900 shadow-xl ring-1 ring-black/10 hover:bg-gray-100 hover:scale-105 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Stage */}
                  <div
                    className="relative flex-1 min-h-0 flex items-center justify-center p-4 sm:p-10"
                    onClick={handleBackdropClick}
                  >
                    {isVideo ? (
                      <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                        {embedUrl ? (
                          <iframe
                            key={currentLightboxIndex}
                            src={embedUrl}
                            className="w-[92vw] max-w-[1280px] aspect-video"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <video
                            key={currentLightboxIndex}
                            src={current.url}
                            className="max-w-[92vw] max-h-[86vh] w-auto h-auto"
                            controls
                            autoPlay
                            playsInline
                          />
                        )}
                      </div>
                    ) : (
                      // Photo-viewer zoom: scroll wheel or double-click to zoom,
                      // then grab-and-drag to pan. Offset is clamped to the frame.
                      <div
                        ref={zoomWrapRef}
                        className="relative overflow-hidden rounded-md shadow-2xl"
                        style={{ cursor: zoomScale > 1 ? 'grab' : 'zoom-in' }}
                        onWheel={(e) => { e.preventDefault(); applyZoom(zoomScale + (e.deltaY < 0 ? 0.3 : -0.3)); }}
                        onDoubleClick={toggleZoom}
                        onMouseDown={beginDrag}
                      >
                        <img
                          src={transformImage(current.url, { width: 2400, quality: 85 })}
                          alt={product.name}
                          className="block max-w-[94vw] max-h-[86vh] w-auto h-auto object-contain select-none"
                          style={{
                            transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`,
                            transition: dragRef.current.dragging ? 'none' : 'transform 0.18s ease-out',
                          }}
                          draggable={false}
                        />
                      </div>
                    )}

                    {/* Prev / Next — white circles */}
                    {lightboxMedia.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
                          aria-label="Previous"
                          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-900 rounded-full p-2.5 shadow-lg hover:scale-105 transition"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
                          aria-label="Next"
                          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-900 rounded-full p-2.5 shadow-lg hover:scale-105 transition"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Counter pill — bottom center */}
                  {lightboxMedia.length > 1 && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-white/95 text-gray-900 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                      {currentLightboxIndex + 1} / {lightboxMedia.length}
                    </div>
                  )}
                </>
              );
            })()}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
};

export default ProductDetails;
