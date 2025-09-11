# PDF Processing Debugging Guide

## Quick Fixes Applied:

### 1. Added Comprehensive Error Handling
- Added console logging to track processing steps
- Created fallback processing when edge function fails
- Added detailed error messages

### 2. Direct Text Processing Fallback
- If edge function fails, system will use pattern-based extraction
- Looks for numbered lists, bullet points, and policy keywords
- Extracts individual terms as separate entries

### 3. Database Schema Check

**IMPORTANT: Run this SQL in your database first:**
```sql
ALTER TABLE kb_documents 
ADD COLUMN IF NOT EXISTS file_data TEXT;
```

## Testing Steps:

### Step 1: Upload a PDF
1. Go to Admin > Knowledge Base > PDF Documents tab
2. Click "Upload PDF"
3. Select your terms & conditions PDF
4. Set "Maximum entries" to 50 or 100
5. Click "Upload PDF"

### Step 2: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for these messages:
   - "Starting AI analysis for document..."
   - "Text length: [number]"
   - "AI analysis result: ..."
   - "Processing [X] entries for insertion"
   - "Successfully inserted [X] entries"

### Step 3: If Edge Function Fails
You should see: "Edge function failed, trying direct fallback"
- This means the fallback processing will run instead
- Should still extract your terms as individual entries

### Step 4: Check Database
After processing completes, check if entries were created:
1. Go to Knowledge Base Entries tab
2. Look for entries with "AI Generated" badge
3. Should be marked as "Needs Review" (not approved yet)

## Common Issues & Solutions:

### Issue 1: "Analyzing for so long"
- **Cause**: Edge function timeout or OpenAI API issues
- **Solution**: System will auto-fallback to direct processing

### Issue 2: "Completed but no entries"
- **Cause**: AI returned empty results or database insertion failed
- **Solution**: Check console logs for specific error messages

### Issue 3: Only getting 5 entries instead of 14
- **Cause**: Old edge function still deployed
- **Solution**: 
  ```bash
  npx supabase functions deploy analyze-pdf
  ```

## Test Your PDF Content:

Try uploading a PDF with content like:
```
Terms and Conditions:
1. All sales are final
2. Returns must be made within 30 days
3. Items must be in original packaging
4. Shipping fees are non-refundable
5. Processing takes 3-5 business days
...etc
```

The system should extract each numbered item as a separate knowledge base entry.

## Still Having Issues?

1. Check browser console for error messages
2. Verify the `file_data` column exists in `kb_documents` table
3. Ensure edge function is deployed: `npx supabase functions deploy analyze-pdf`
4. Try with a simple PDF first (not complex formatting)