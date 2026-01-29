// New Product System Types
export interface ProductNew {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  brand?: string;
  model?: string;
  slug: string;
  active: boolean;
  featured: boolean;
  weight_kg?: number;
  dimensions_cm?: string;
  year_from?: number;
  year_to?: number;
  keywords?: string[];
  tags?: string[];
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentVariant {
  id: string;
  sku: string;
  name: string;
  description?: string;
  
  // Pricing and inventory
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  
  // Component details
  component_type: string; // "color", "size", "storage", etc.
  component_value: string; // "red", "large", "64gb", etc.
  
  // Physical properties
  weight_kg?: number;
  dimensions_cm?: string;
  
  // Status
  active: boolean;
  
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentVariantImage {
  id: string;
  component_variant_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductComponentVariant {
  id: string;
  product_id: string;
  component_variant_id: string;
  is_required: boolean;
  is_default: boolean;
  display_order: number;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantCombination {
  id: string;
  product_id: string;
  combination_name?: string;
  combination_sku: string;
  component_variant_ids: string[];
  override_price?: number;
  discount_percentage: number;
  override_stock?: number;
  active: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

// Extended types for UI
export interface ProductWithDetails extends ProductNew {
  images: ProductImage[];
  categories?: { name: string };
  component_variants: (ProductComponentVariant & {
    component_variant: ComponentVariant & {
      images: ComponentVariantImage[];
    };
  })[];
  variant_combinations: ProductVariantCombination[];
}

export interface ComponentVariantWithImages extends ComponentVariant {
  images: ComponentVariantImage[];
}

// For product creation/editing forms
export interface ProductFormData {
  name: string;
  description?: string;
  category_id?: string;
  brand?: string;
  model?: string;
  slug: string;
  active: boolean;
  featured: boolean;
  weight_kg?: number;
  dimensions_cm?: string;
  year_from?: number;
  year_to?: number;
  keywords?: string[];
  tags?: string[];
  images: { url: string; alt_text?: string; is_primary: boolean }[];
  component_variants: {
    id?: string; // If editing existing
    sku: string;
    name: string;
    description?: string;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    reorder_level: number;
    component_type: string;
    component_value: string;
    weight_kg?: number;
    dimensions_cm?: string;
    active: boolean;
    is_required: boolean;
    is_default: boolean;
    display_order: number;
    images: { url: string; alt_text?: string; is_primary: boolean }[];
  }[];
  variant_combinations: {
    combination_name?: string;
    component_variant_skus: string[];
    override_price?: number;
    discount_percentage: number;
    override_stock?: number;
    active: boolean;
  }[];
}

// Component types for organizing variants
export type ComponentType = 
  | 'color' 
  | 'size' 
  | 'storage' 
  | 'memory' 
  | 'processor' 
  | 'material' 
  | 'style' 
  | 'capacity' 
  | 'power' 
  | 'connectivity'
  | 'custom';

export interface ComponentTypeGroup {
  type: ComponentType;
  label: string;
  description?: string;
  variants: ComponentVariantWithImages[];
}

// Cart and order integration
export interface CartItemNew {
  id: string;
  cart_id: string;
  product_id?: string; // For old products
  product_variant_combination_id?: string; // For new products
  component_variant_ids?: string[]; // Array of selected components
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItemNew {
  id: string;
  order_id: string;
  product_id?: string; // For old products
  product_variant_combination_id?: string; // For new products
  component_variant_ids?: string[]; // Array of selected components
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

// Installation Guide Types
export interface InstallationVideo {
  url: string;
  title?: string;
  duration?: string;
}

export interface ProductInstallationGuide {
  id: string;
  product_id: string;
  recommended_time?: string;
  workman_power?: number;
  installation_price?: number;
  installation_videos: InstallationVideo[];
  difficulty_level?: 'easy' | 'medium' | 'hard' | 'expert';
  notes?: string;
  created_at: string;
  updated_at: string;
}