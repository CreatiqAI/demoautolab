# 🎯 **Supabase Storage Policy Templates (Easy Setup)**

## 📋 **Method 1: Use Pre-built Templates (Easiest)**

### **Step 1: Create Bucket**
1. Go to **Supabase Dashboard → Storage**
2. Click **"Create Bucket"**
3. Name: `product-images`
4. **Public**: ✅ **CHECKED** 
5. Click **"Save"**

### **Step 2: Use Policy Templates**
1. Click on your `product-images` bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"**
4. You'll see **"Get started quickly"** templates:

#### **Template 1: Enable insert for authenticated users only**
- Just **click this template**
- It automatically creates the upload policy
- **No code needed!**

#### **Template 2: Enable read access for all users** 
- **Click this template**
- It automatically creates public viewing policy
- **No code needed!**

That's it! These two templates handle 90% of use cases.

---

## 📋 **Method 2: Manual Policy Code (If Templates Don't Work)**

If you need to create custom policies, here are the exact codes:

### **Policy 1: Allow Uploads (INSERT)**
- **Policy Name**: `Allow authenticated uploads`
- **Allowed Operation**: `INSERT`
- **Target Roles**: `authenticated`
- **USING Expression**: (leave empty)
- **WITH CHECK Expression**: 
```sql
bucket_id = 'product-images'
```

### **Policy 2: Allow Public Viewing (SELECT)**  
- **Policy Name**: `Allow public viewing`
- **Allowed Operation**: `SELECT`
- **Target Roles**: `public` (or leave empty for all)
- **USING Expression**:
```sql
bucket_id = 'product-images'
```
- **WITH CHECK Expression**: (leave empty)

### **Policy 3: Allow Updates (UPDATE)**
- **Policy Name**: `Allow authenticated updates`
- **Allowed Operation**: `UPDATE` 
- **Target Roles**: `authenticated`
- **USING Expression**:
```sql
bucket_id = 'product-images'
```
- **WITH CHECK Expression**:
```sql
bucket_id = 'product-images'
```

### **Policy 4: Allow Deletes (DELETE)**
- **Policy Name**: `Allow authenticated deletes`
- **Allowed Operation**: `DELETE`
- **Target Roles**: `authenticated`  
- **USING Expression**:
```sql
bucket_id = 'product-images'
```
- **WITH CHECK Expression**: (leave empty)

---

## 📋 **Method 3: One-Click SQL (Copy & Paste)**

If you prefer SQL, run this in **SQL Editor**:

```sql
-- Create bucket first (or use Dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Policy 1: Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy 2: Allow public viewing  
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Policy 3: Allow authenticated updates
CREATE POLICY "Allow authenticated updates" ON storage.objects  
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Policy 4: Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images');
```

---

## ✅ **Recommended Approach**

1. **Use Method 1** (Templates) - it's the easiest and most reliable
2. Only use Method 2/3 if templates don't work
3. **The pre-built templates handle all the complexity for you!**

## 🔍 **What Each Template Does**

- **"Enable insert for authenticated users only"** = Logged-in users can upload
- **"Enable read access for all users"** = Anyone can view images (needed for public bucket)
- **"Enable update for authenticated users only"** = Logged-in users can modify files  
- **"Enable delete for authenticated users only"** = Logged-in users can delete files

**Just use the first two templates and you're done!** 🎉