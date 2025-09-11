# Deploy Edge Function to Fix CORS Issue

## 🚀 Deploy the Edge Function

Run this command in your terminal from the project root:

```bash
npx supabase functions deploy analyze-pdf
```

## 🔧 Alternative: Manual Deployment via Supabase Dashboard

If the CLI command doesn't work:

1. **Go to your Supabase project dashboard**
2. **Navigate to Edge Functions**
3. **Create a new function called `analyze-pdf`**
4. **Copy the code from `supabase/functions/analyze-pdf/index.ts`**
5. **Deploy the function**

## ✅ Test the Fix

After deployment:

1. **Go to `/admin/knowledge-base`**
2. **Upload your PDF**
3. **The OpenAI analysis should now work without CORS errors**

## 🎯 What This Fixes

- ✅ **CORS errors** - Edge function runs server-side
- ✅ **OpenAI API calls** - Now handled securely on the server
- ✅ **Browser restrictions** - Bypassed completely
- ✅ **PDF analysis** - Will work smoothly with AI processing

## 🔑 Security Note

Your OpenAI API key is now safely stored in the edge function server-side code, not exposed to the browser.

## 📋 If Deployment Fails

If you can't deploy the edge function, you can also:

1. **Move the OpenAI API call to your backend**
2. **Or use a proxy server** to handle the CORS issue
3. **Or temporarily disable CORS** in your browser for testing

But the edge function approach is the cleanest solution!