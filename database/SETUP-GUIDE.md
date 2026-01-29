# Setup Guide: OTP Login & Enhanced Merchant Registration

This guide covers the setup steps required to enable OTP-based login and the enhanced merchant registration features.

---

## 1. Run SQL Migrations

Execute these SQL files in order in your **Supabase SQL Editor**:

```
1. database/car-makes-models.sql
2. database/user-registration-enhancements.sql
3. database/merchant-registration-enhancements.sql
4. database/storage-merchant-documents.sql
5. database/enable-realtime-user-sessions.sql
```

---

## 2. Configure Twilio for OTP

Supabase uses Twilio for sending SMS OTPs. Follow these steps:

### Step 1: Create a Twilio Account

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account (or use existing)
3. Verify your email and phone number

### Step 2: Get Your Twilio Credentials

From the Twilio Console Dashboard, note down:
- **Account SID** (starts with `AC...`)
- **Auth Token** (click to reveal)

### Step 3: Create a Messaging Service

1. In Twilio Console, go to: **Messaging > Services**
2. Click **Create Messaging Service**
3. Name it something like "AutoLab OTP"
4. Select **Notify my users** as the use case
5. Click **Create Messaging Service**
6. Add a phone number:
   - Go to **Sender Pool** tab
   - Click **Add Senders**
   - Select **Phone Number**
   - Either buy a new number or use an existing one
7. Note down the **Messaging Service SID** (starts with `MG...`)

### Step 4: Configure Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to: **Authentication > Providers**
3. Find and enable **Phone**
4. Fill in the Twilio settings:

| Setting | Value |
|---------|-------|
| **Twilio Account SID** | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| **Twilio Auth Token** | Your auth token |
| **Twilio Message Service SID** | `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| **SMS OTP Expiry Seconds** | `300` (5 minutes, recommended) |
| **SMS OTP Length** | `6` |
| **SMS Template** | `Your AutoLab verification code is: {{ .Code }}` |

5. Click **Save**

### Step 5: Test OTP

You can test using Twilio's test credentials or by sending a real OTP to your phone.

---

## 3. Create Storage Bucket

The SQL file `storage-merchant-documents.sql` creates the bucket automatically. Alternatively, you can create it manually:

### Via Supabase Dashboard:

1. Go to: **Storage** in sidebar
2. Click **New bucket**
3. Configure:
   - **Name**: `merchant-documents`
   - **Public bucket**: ✅ Enabled
   - **File size limit**: `10MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp, application/pdf`
4. Click **Create bucket**

### Set Storage Policies (if created manually):

Go to **Storage > merchant-documents > Policies** and add:

**Upload Policy (INSERT)**:
```sql
bucket_id = 'merchant-documents'
```
Target roles: `authenticated`

**Read Policy (SELECT)**:
```sql
bucket_id = 'merchant-documents'
```
Target roles: `public`

---

## 4. Enable Realtime for user_sessions

This enables the single-device session enforcement feature.

### Option A: Via SQL (Recommended)

Run the `enable-realtime-user-sessions.sql` file:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;
```

### Option B: Via Dashboard

1. Go to: **Database > Replication**
2. Under **supabase_realtime** publication, click **Manage**
3. Find `user_sessions` table and **enable** it
4. Click **Save**

### Option C: Via Table Editor

1. Go to: **Table Editor > user_sessions**
2. Click the **gear icon** (table settings)
3. Toggle **Enable Realtime** to ON
4. Save

---

## 5. Verify Setup

### Test OTP Login:
1. Go to `/auth` on your site
2. Enter a valid Malaysian phone number (+60...)
3. Click "Get OTP"
4. You should receive an SMS with a 6-digit code
5. Enter the code to complete login

### Test Single-Device Session:
1. Login on Device A (e.g., laptop)
2. Login with same account on Device B (e.g., phone)
3. Device A should automatically be logged out

### Test Merchant Registration:
1. Go to `/merchant-register`
2. Enter a valid access code
3. Fill the form including:
   - Upload SSM document
   - Upload bank proof
   - Upload 2+ workshop photos
   - (Optional) Enter referral code like `AUTOLAB2024`
4. Submit and verify in admin panel

### Test Admin Features:
1. Go to `/admin/salesmen` to manage salesmen
2. Go to `/admin/customers` > Merchant Applications tab
3. Review an application - you should see all new fields:
   - Documents (SSM, Bank Proof)
   - Workshop photos
   - Social media links
   - Referral information

---

## Troubleshooting

### OTP Not Received
- Check Twilio credentials are correct
- Verify phone number format (+60...)
- Check Twilio logs in their console
- Ensure Messaging Service has a sender phone number

### Storage Upload Fails
- Check bucket exists and is public
- Verify file size is under 10MB
- Ensure MIME type is allowed
- Check storage policies are set correctly

### Realtime Not Working
- Verify publication includes user_sessions
- Check RLS policies allow reading sessions
- Ensure client subscribes to correct channel

### Session Invalidation Not Working
- Check user_sessions table has data
- Verify Realtime is enabled
- Check browser console for subscription errors

---

## Quick Reference: Sample Data

### Test Referral Codes (from seed data):
| Code | Salesman |
|------|----------|
| `AHMAD001` | Ahmad Salesman |
| `ALI002` | Ali Salesman |
| `MUTHU003` | Muthu Salesman |
| `TAN004` | Tan Salesman |
| `AUTOLAB2024` | Company Referral |

### Phone Format:
- Malaysian: `+60123456789`
- Must include country code
