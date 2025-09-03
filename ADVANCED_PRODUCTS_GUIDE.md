# Advanced Products System Guide

## Overview

I've designed and implemented a flexible, component-based product system similar to Shopee that allows:

- **Products without SKUs**: Products are containers for variants
- **Component-based variants**: Reusable components with their own SKUs, prices, and stock
- **Multiple images**: Both product-level and component-level images  
- **Flexible combinations**: Pre-defined or dynamic component combinations
- **Shared components**: Same component can be used across multiple products

## 🏗️ Database Architecture

### Core Tables

#### 1. `products_new` - Base Products
```sql
- id, name, description, category_id
- brand, model, slug
- active, featured  
- weight_kg, dimensions_cm, year_from, year_to
- keywords[], tags[]
- NO SKU, NO PRICE, NO STOCK (these are in components)
```

#### 2. `component_variants` - Reusable Components
```sql
- id, sku (unique), name, description
- cost_price, selling_price, stock_quantity, reorder_level
- component_type (color/size/storage/etc), component_value
- weight_kg, dimensions_cm, active
```

#### 3. `product_component_variants` - Links Products to Components  
```sql
- product_id, component_variant_id
- is_required, is_default, display_order
```

#### 4. Image Tables
- `product_images_new` - Product-level images
- `component_variant_images` - Component-specific images

#### 5. `product_variant_combinations` - Pre-defined Combinations
```sql
- product_id, combination_name, combination_sku
- component_variant_ids[] (array of component IDs)
- override_price, discount_percentage, override_stock
```

## 🎯 How It Works

### Example: iPhone 15 Pro

**1. Base Product:**
```
Name: iPhone 15 Pro
Description: Latest iPhone with Pro features  
Brand: Apple
Model: iPhone 15 Pro
```

**2. Component Variants (reusable across products):**
```
Storage Components:
- SKU: STOR-128GB, Name: "128GB Storage", Price: $100, Stock: 50
- SKU: STOR-256GB, Name: "256GB Storage", Price: $200, Stock: 30

Color Components:  
- SKU: COL-SPACE-BLACK, Name: "Space Black", Price: $0, Stock: 100
- SKU: COL-GOLD, Name: "Gold", Price: $50, Stock: 80
```

**3. Product-Component Links:**
```
iPhone 15 Pro -> 128GB Storage (required, default)
iPhone 15 Pro -> 256GB Storage (required)  
iPhone 15 Pro -> Space Black (required, default)
iPhone 15 Pro -> Gold (required)
```

**4. Customer Experience:**
- Selects: 256GB + Gold = Total: $250 ($200 + $50)
- Stock: Limited by minimum stock (min(30, 80) = 30 available)
- Images: Shows product images + gold color images

## 🛠️ Admin Panel Features

### Advanced Products Page (`/admin/products-advanced`)

**Multi-tab Product Creation:**

#### Tab 1: Basic Information
- Product name, description, category
- Brand, model, slug
- Physical properties, year range
- Active/Featured status

#### Tab 2: Product Images
- Multiple product-level images
- Primary image selection
- Alt text for accessibility

#### Tab 3: Component Variants  
- Add multiple component types (color, size, storage, etc.)
- Each component has:
  - Unique SKU and name
  - Cost and selling price
  - Stock quantity and reorder level
  - Component type and value
  - Own images
  - Required/Default/Active settings

#### Tab 4: Pre-defined Combinations
- Create specific combinations with custom pricing
- Override stock levels for combinations
- Bulk discount percentages

## 🎨 Customer Interface Features

### ProductAdvanced Component

**Dynamic Product Display:**
- Shows product images + selected component images  
- Component selection updates price in real-time
- Stock calculated from selected components (minimum stock)
- Image gallery updates based on selected variants

**Smart Features:**
- Auto-selects default components
- Shows stock availability per selection
- Prevents out-of-stock selections
- Price calculation from all selected components

## 🔄 Migration Strategy

### Phase 1: Database Setup
1. Run `new-product-schema.sql` to create new tables
2. Keep existing `products` table for backward compatibility
3. Admin panel shows both old and new products

### Phase 2: Data Migration (Optional)
```sql
-- Migrate existing products to new system
INSERT INTO products_new (name, description, brand, ...)
SELECT name, description, brand, ... FROM products;

-- Create component variants from existing product variants
INSERT INTO component_variants (sku, name, selling_price, ...)  
SELECT sku, name, price_regular, ... FROM product_variants;
```

### Phase 3: Feature Rollout
1. Admin creates new products using Advanced Products
2. Customer pages support both old and new product types
3. Gradually migrate high-priority products

## 📊 Key Benefits

### For Merchants (Admin)
- **Reusable Components**: Create color/size options once, use everywhere
- **Centralized Inventory**: Update component stock affects all products using it  
- **Flexible Pricing**: Components can add cost or be included free
- **Rich Media**: Multiple images per product and per component
- **Easy Management**: Shopee-like interface for complex products

### For Customers
- **Visual Selection**: See exactly what they're buying with component images
- **Real-time Pricing**: Price updates as they select options
- **Stock Visibility**: Clear stock availability for their selections  
- **Rich Experience**: Multiple images, detailed specifications

### For Developers
- **Type Safety**: Full TypeScript support with generated types
- **Scalable**: Component system supports any product complexity
- **Extensible**: Easy to add new component types and features
- **Clean Architecture**: Separation of concerns between products and variants

## 🚀 Usage Examples

### Simple Product: T-Shirt
```
Product: "Cotton T-Shirt"
Components:
- Color: Red (+$0), Blue (+$0), Black (+$5)
- Size: S (+$0), M (+$0), L (+$2), XL (+$5)

Customer selects: Black + XL = $5 + $5 = $10 extra
```

### Complex Product: Gaming Laptop  
```
Product: "Gaming Laptop Pro"
Components:
- Processor: i5 (+$0), i7 (+$200), i9 (+$500)
- RAM: 8GB (+$0), 16GB (+$150), 32GB (+$400)  
- Storage: 256GB SSD (+$0), 512GB SSD (+$100), 1TB SSD (+$300)
- GPU: RTX 3060 (+$0), RTX 3070 (+$300), RTX 3080 (+$600)

Customer selects: i7 + 16GB + 512GB + RTX 3070 = $750 extra
```

## 📋 Next Steps

1. **Run the SQL schema** to create new tables
2. **Access Advanced Products** at `/admin/products-advanced`  
3. **Create your first advanced product** with components
4. **Test the customer experience** with the ProductAdvanced component
5. **Gradually migrate** existing products to the new system

The system is designed to be flexible and grow with your business needs while providing a modern, Shopee-like experience for both merchants and customers.

## 🔧 Implementation Status

✅ **Complete:**
- Database schema with all tables and relationships
- TypeScript types for full type safety  
- Advanced Products admin interface with multi-tab form
- Customer-facing ProductAdvanced component
- Image management for products and components
- Real-time price calculation and stock management

🚧 **To Implement:**
- Cart integration with new product system
- Order processing with component selections  
- Inventory management and stock alerts
- Bulk product import/export
- Advanced search and filtering
- Component-based discounts and promotions