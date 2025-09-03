# Database Tables Guide - What You Need vs Don't Need

## ✅ **ESSENTIAL TABLES (Keep These)**

### **Core Product System**
- **`products_new`** - Your main products table (Audi A4 products, etc.)
- **`product_images_new`** - Product images with upload functionality
- **`component_library`** - Your component inventory (casings, sockets, etc.)
- **`component_variants`** - Component variants for products
- **`product_component_variants`** - Links products to their available components

### **Authentication & Admin**
- **`profiles`** - User profiles (if using Supabase auth)
- **`admin_users`** - Admin access control

### **Storage**
- **`buckets`** - Supabase storage buckets (for images)
- **`objects`** - Uploaded files

## ❌ **NON-ESSENTIAL TABLES (Safe to Remove)**

### **Old/Legacy Tables**
- **`products`** - Old products table (replaced by `products_new`)
- **`product_images`** - Old images table (replaced by `product_images_new`)
- **`categories`** - Not using categories in your new system
- **`product_variants`** - Legacy variant system

### **E-commerce Features You May Not Need**
- **`orders`** - Only if you're not handling orders yet
- **`order_items`** - Related to orders
- **`customers`** - If you're using Supabase auth instead
- **`shopping_cart`** - We're building cart in React state/localStorage
- **`inventory_movements`** - Unless you need detailed inventory tracking
- **`suppliers`** - Unless you manage suppliers

### **Advanced Features**
- **`product_reviews`** - Customer reviews (future feature)
- **`wishlist`** - Wishlist functionality (future feature)
- **`coupons`** - Discount system (future feature)
- **`shipping_methods`** - Shipping options (future feature)

## 🎯 **MINIMAL WORKING SETUP**

For your automotive parts system to work, you only need:

1. **`products_new`** - Your products (Audi A4, BMW, etc.)
2. **`product_images_new`** - Product photos
3. **`component_library`** - Your parts inventory (casings, sockets, cables)
4. **`component_variants`** - Component options
5. **`product_component_variants`** - Which components go with which products
6. **Storage buckets** - For image uploads

## 📋 **Current System Architecture**

```
Product (Audi A4 10" System) 
├── Product Images (multiple photos)
└── Available Components:
    ├── Casing (RM 299.99, Stock: 25)
    ├── Canbus Socket (RM 199.99, Stock: 50)
    ├── Power Cable (RM 49.99, Stock: 100)
    └── USB Adapter (RM 89.99, Stock: 80)

Customer selects:
├── Casing × 1 = RM 299.99
├── Socket × 1 = RM 199.99
└── Cable × 2 = RM 99.98
Total: RM 599.96
```

## 🚀 **Next Steps**

1. **Run `rebuild-essential-tables.sql`** to restore your component system
2. **Keep only the essential tables** listed above
3. **Remove the non-essential tables** to clean up your database
4. **Test the component library and product creation** in admin panel

Your system will be clean, fast, and exactly what you need for automotive parts e-commerce!