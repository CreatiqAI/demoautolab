# 🔧 Supabase Storage Setup Guide

## 📋 The Issue
- Getting "row-level security policy" error when uploading images
- Need to create storage bucket and set proper policies

## 🎯 **Method 1: Dashboard Setup (Recommended)**

### Step 1: Create Storage Bucket
1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the sidebar
3. Click **"Create Bucket"**
4. Set the following:
   - **Name**: `product-images`
   - **Public**: ✅ **Enabled** (so images can be viewed publicly)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

### Step 2: Set Storage Policies
1. Still in **Storage** section
2. Click on your `product-images` bucket
3. Go to **Policies** tab
4. Click **"Add Policy"**
5. Create these policies:

#### Policy 1: Allow Uploads
- **Policy Name**: `Allow authenticated uploads`
- **Allowed Operation**: `INSERT`
- **Target Roles**: `authenticated`
- **USING Expression**: (leave empty)
- **WITH CHECK Expression**: `bucket_id = 'product-images'`

#### Policy 2: Allow Viewing
- **Policy Name**: `Allow public viewing`  
- **Allowed Operation**: `SELECT`
- **Target Roles**: `public` (or `anon`)
- **USING Expression**: `bucket_id = 'product-images'`

#### Policy 3: Allow Updates
- **Policy Name**: `Allow authenticated updates`
- **Allowed Operation**: `UPDATE` 
- **Target Roles**: `authenticated`
- **USING Expression**: `bucket_id = 'product-images'`
- **WITH CHECK Expression**: `bucket_id = 'product-images'`

#### Policy 4: Allow Deletions
- **Policy Name**: `Allow authenticated deletions`
- **Allowed Operation**: `DELETE`
- **Target Roles**: `authenticated` 
- **USING Expression**: `bucket_id = 'product-images'`

## 🎯 **Method 2: SQL Approach (Alternative)**

If the dashboard doesn't work, try this SQL script:

```sql
-- Run in Supabase SQL Editor
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to product-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY IF NOT EXISTS "Allow public viewing of product-images"  
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'product-images');

CREATE POLICY IF NOT EXISTS "Allow authenticated updates to product-images"
ON storage.objects FOR UPDATE TO authenticated  
USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

CREATE POLICY IF NOT EXISTS "Allow authenticated deletions to product-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');
```

## 🎯 **Method 3: Quick Test (Temporary)**

If you just want to test quickly, run this to temporarily disable RLS:

⚠️ **WARNING**: Only for testing - makes storage publicly writable!

```sql
-- Temporarily disable RLS for testing
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

Then after testing works:
```sql  
-- Re-enable RLS and add proper policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## ✅ **How to Verify It's Working**

1. Try uploading an image in your admin panel
2. Check the browser console for any errors
3. Check if the image appears in your Supabase Storage bucket
4. Verify the public URL works when clicking on the uploaded file

## 🔍 **Troubleshooting**

If still getting errors:

1. **Check Authentication**: Make sure you're logged in as admin
2. **Check Bucket Exists**: Verify `product-images` bucket exists in Storage
3. **Check Policies**: Make sure all 4 policies are created and enabled
4. **Check Console**: Look for detailed error messages in browser console

The **Dashboard Method** is usually most reliable since it handles all the permissions automatically.