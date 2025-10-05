# Shop Photos Feature for Premium Partners

## ✅ Feature Implemented

Premium partners can now upload **up to 4 shop photos** to showcase their business on the Find Shops page.

## 📋 Setup Instructions

### 1. Run Database Migration
Run this SQL in your Supabase SQL Editor:
```
database/add-shop-photos.sql
```

This adds the `shop_photos` column (TEXT[]) to the `premium_partnerships` table.

### 2. Create Storage Bucket in Supabase

1. Go to **Supabase Dashboard** → **Storage**
2. Create a new bucket named: `premium-partners`
3. Set it to **Public** bucket
4. Configure storage policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload shop photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'premium-partners' AND (storage.foldername(name))[1] = 'shop-photos');

-- Allow public read access
CREATE POLICY "Public can view shop photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'premium-partners');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own shop photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'premium-partners');
```

## 🎨 Features

### For Merchants (Premium Partner Page):
- ✅ Upload up to 4 photos
- ✅ Preview photos before upload
- ✅ Remove existing photos
- ✅ Remove photos before submitting
- ✅ Photo counter badge (X/4)
- ✅ Grid layout (2 cols mobile, 4 cols desktop)
- ✅ Hover effects with delete button
- ✅ Upload progress indication

### For Customers (Find Shops Page):
- Display shop photos in a carousel/gallery
- Photos serve as shop background/showcase images
- Helps customers see the actual shop before visiting

## 📝 Implementation Details

### Database Schema
```sql
ALTER TABLE premium_partnerships
ADD COLUMN shop_photos TEXT[] DEFAULT '{}';
```

### Photo Storage
- **Bucket**: `premium-partners`
- **Folder**: `shop-photos/`
- **Filename format**: `{merchant_id}_{timestamp}_{random}.{ext}`
- **Example**: `abc123_1705392847_x7k9p2.jpg`

### Limits
- Maximum 4 photos per shop
- Image files only (image/*)
- Photos stored as array of public URLs

## 🎯 Next Steps

To display the shop photos on the Find Shops page:
1. Update `FindShops.tsx` to read `shop_photos` array
2. Add image carousel/gallery component
3. Display photos in shop detail view or as background

## 💡 Usage

### Merchant Flow:
1. Login as merchant
2. Go to **Premium Partner** page
3. Fill out application form
4. Click **"Upload Shop Photos"**
5. Select up to 4 images
6. Review and remove if needed
7. Submit application
8. Photos are uploaded to Supabase Storage
9. URLs saved to database

### Benefits:
- Visual showcase of the shop
- Builds customer trust
- Increases click-through rates
- Professional appearance
- Differentiates from text-only listings
