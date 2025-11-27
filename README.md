# AutoLab - Automotive Accessories Wholesale Platform

Malaysia's premier B2B wholesale platform for automotive accessories and installation services.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup and feature documentation
- **[database/README.md](./database/README.md)** - Database migration guide

## 🎯 Key Features

### For Customers
- **5-Tier Loyalty System** - Automatic tier upgrades based on monthly spending
- **Points & Rewards** - Earn points on purchases, redeem for vouchers
- **Product Reviews** - Rate and review products with photos
- **Smart Vouchers** - Discount codes with validation
- **Order Tracking** - Real-time order status updates

### For Merchants (Premium Partners)
- **Professional Plan** (RM99/year) - Basic wholesale features
- **Enterprise Plan** (RM388/year) - Includes installation video guides
- **Merchant Console** - Manage products, orders, subscriptions
- **Installation Guides** - Video tutorials for product installation
- **Analytics Dashboard** - View performance metrics

### For Admins
- **Customer Tier Management** - Configure tier requirements and benefits
- **Premium Partner Management** - Handle merchant subscriptions
- **Installation Guide Manager** - Upload and manage video guides
- **Review Moderation** - Approve/reject customer reviews
- **Voucher Management** - Create and manage discount codes
- **Order Management** - Process and track all orders

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Routing:** React Router v6
- **State:** React Context + Hooks

## 📁 Project Structure

```
autolab-website/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   │   ├── admin/       # Admin panel pages
│   │   ├── Auth.tsx     # Login/signup
│   │   ├── Home.tsx     # Homepage
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities & Supabase client
│   └── index.css        # Global styles
├── database/            # SQL migration scripts
│   ├── README.md        # Database setup guide
│   └── *.sql            # Migration files (24 essential files)
├── public/              # Static assets
├── SETUP_GUIDE.md       # Complete setup guide
└── README.md            # This file
```

## 🔧 Environment Setup

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Database Setup

1. Create a Supabase project
2. Run migration scripts in order (see [database/README.md](./database/README.md))
3. Create default admin user (username: `admin`, password: `admin123`)
4. Change admin password after first login

## 👤 Admin Access

**Login URL:** `/auth` → Click "Admin" tab

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change this password immediately!**

## 📦 Main Dependencies

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "@supabase/supabase-js": "^2.45.4",
  "tailwindcss": "^3.4.1",
  "lucide-react": "^0.441.0",
  "sonner": "^1.5.0"
}
```

## 🚢 Deployment

### Using Lovable (Recommended)
1. Visit [Lovable Project](https://lovable.dev/projects/633a3b76-ccce-40bd-8c8f-2b69e01353d5)
2. Click Share → Publish
3. Connect custom domain (optional)

### Manual Deployment
```bash
npm run build
# Deploy the 'dist' folder to any static hosting
```

## 📝 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. Contact the team for contribution guidelines.

---

**Version:** 2.0
**Last Updated:** November 2024
