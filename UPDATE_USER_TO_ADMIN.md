# How to Create Admin Access

## Method 1: Use the Create Admin Page (Easiest)

1. **Navigate to**: `http://localhost:8080/create-admin`
2. **Fill out the form**:
   - Full Name: Your admin name
   - Phone Number: Include country code (e.g., +1234567890)
   - Password: At least 6 characters
   - Confirm Password: Same as above

3. **Click "Create Admin Account"**
4. **Sign in**: Go to `/auth` and sign in with your new admin credentials
5. **Access Admin Panel**: Navigate to `/admin`

⚠️ **Important**: After creating your admin account, remove the `/create-admin` route from App.tsx for security.

---

## Method 2: Update Existing User (Supabase Dashboard)

If you already have a user account:

1. **Open Supabase Dashboard**: Go to your Supabase project
2. **Navigate to**: Table Editor → profiles table
3. **Find your user**: Look for your phone number or user ID
4. **Edit the role**: Change the `role` column from `customer` to `admin`
5. **Save changes**
6. **Sign in**: Use your existing credentials at `/auth`
7. **Access Admin Panel**: Navigate to `/admin`

---

## Method 3: SQL Command (Advanced)

Run this SQL in your Supabase SQL Editor:

```sql
-- Update existing user to admin role
UPDATE profiles 
SET role = 'admin', updated_at = NOW() 
WHERE phone_e164 = '+YOUR_PHONE_NUMBER'; -- Replace with your actual phone

-- Or create new admin profile (if you have the user ID from auth.users)
INSERT INTO profiles (
  id,
  full_name,
  phone_e164,
  role,
  created_at,
  updated_at
) VALUES (
  'YOUR_USER_ID', -- Get this from auth.users table
  'Admin User',
  '+1234567890',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---

## Verification Steps

After creating/updating your admin account:

1. **Sign in** at `http://localhost:8080/auth`
2. **Navigate to** `http://localhost:8080/admin`
3. **You should see** the admin dashboard with:
   - Statistics cards (Revenue, Orders, Customers, Products)
   - Navigation sidebar with admin sections
   - No "Access Denied" message

---

## Troubleshooting

### "Access Denied" Message
- Check that your user's role in the `profiles` table is set to `admin` or `staff`
- Verify you're signed in with the correct account
- Clear browser cache and try again

### Can't Sign In
- Verify phone number format includes country code
- Check password is correct
- Ensure the user exists in both `auth.users` and `profiles` tables

### 404 on /admin
- Make sure the admin routes are properly added to App.tsx
- Check that the development server is running
- Verify the protected route component is working

---

## Security Note

After setting up your admin access:
1. Remove the `/create-admin` route from App.tsx
2. Delete the CreateAdmin.tsx component
3. Consider implementing additional security measures for production