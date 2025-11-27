# AutoCount Integration Guide for AutoMot Hub
## Complete Implementation Strategy for Auto Lab Sdn Bhd

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Integration Methods Overview](#integration-methods-overview)
3. [Recommended Approach](#recommended-approach)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Technical Implementation](#technical-implementation)
6. [Data Mapping Specifications](#data-mapping-specifications)
7. [Code Examples](#code-examples)
8. [Testing & Deployment](#testing--deployment)
9. [Cost & Timeline](#cost--timeline)
10. [Support & Maintenance](#support--maintenance)

---

## 🎯 Executive Summary

**Goal**: Seamlessly integrate AutoMot Hub (React + Supabase) with AutoCount Accounting Software

**Business Need**:
- Automatic synchronization of sales orders → AutoCount invoices
- Real-time inventory updates between systems
- Automated debtor/creditor management
- Eliminate duplicate data entry

**Recommended Solution**: **3-Phase Hybrid Approach**
1. **Phase 1** (Immediate): Excel/CSV Export-Import (2 weeks)
2. **Phase 2** (Month 1-2): RESTful API Integration (4-6 weeks)
3. **Phase 3** (Month 3): Real-time Sync & Automation (4 weeks)

**Total Timeline**: 3-4 months
**Estimated Investment**: RM 60,000 - 90,000

---

## 🔌 Integration Methods Overview

Based on AutoCount's official documentation, there are **7 integration methods** available:

### Method Comparison Matrix

| Method | Ease | Cost | Real-time | Best For |
|--------|------|------|-----------|----------|
| **1. Excel Import/Export** | ⭐⭐⭐⭐⭐ Easy | FREE | ❌ No | Quick start, small volume |
| **2. RESTful API (AOTG)** | ⭐⭐⭐ Medium | RM 3,000-5,000 | ✅ Yes | Modern integration, cloud |
| **3. .NET Desktop API** | ⭐⭐ Hard | RM 5,000-8,000 | ✅ Yes | Desktop app, full control |
| **4. XML Data Import** | ⭐⭐⭐ Medium | FREE | ❌ No | Batch processing |
| **5. AutoCount Cloud API** | ⭐⭐⭐ Medium | RM 4,000-6,000 | ✅ Yes | Cloud-to-cloud only |
| **6. Web Service** | ⭐⭐ Hard | RM 6,000-10,000 | ✅ Yes | Complex workflows |
| **7. Plug-In Development** | ⭐ Very Hard | RM 10,000-15,000 | ✅ Yes | Deep customization |

### ✅ **Our Recommendation: Start with #1 + #2**

**Why?**
- Excel/CSV gives you immediate functionality (within 2 weeks)
- RESTful API provides long-term automation
- Lower cost compared to .NET or Plug-in approach
- No need to access AutoCount desktop application
- Works with both AutoCount Desktop and Cloud versions

---

## 🏗️ Recommended Approach: 3-Phase Implementation

### **PHASE 1: Excel/CSV Integration (Week 1-2)**
**Investment**: RM 8,000 - 12,000

**What You Get**:
- Export orders from AutoMot Hub → Excel/CSV
- Import into AutoCount with templates
- Export stock data from AutoCount → Update AutoMot Hub
- Manual trigger (admin clicks "Sync to AutoCount")

**Deliverables**:
1. Excel export module in AutoMot Hub
2. AutoCount import templates (pre-configured)
3. User guide for import process

**Timeline**: 2 weeks

---

### **PHASE 2: RESTful API Integration (Week 3-10)**
**Investment**: RM 35,000 - 50,000

**What You Get**:
- Automatic order → invoice sync (every 15 minutes)
- Real-time stock level sync
- Customer data synchronization
- Error handling and logging
- Admin dashboard showing sync status

**Deliverables**:
1. Node.js/TypeScript integration service
2. AutoCount API connector module
3. Data mapping configuration
4. Sync scheduler (configurable intervals)
5. Error monitoring dashboard

**Timeline**: 6-8 weeks

---

### **PHASE 3: Advanced Automation (Week 11-14)**
**Investment**: RM 17,000 - 28,000

**What You Get**:
- Bi-directional sync (AutoCount ↔ AutoMot Hub)
- Automated debtor statement generation
- Stock transfer tracking
- Purchase order integration
- Webhook-based instant updates

**Deliverables**:
1. Webhook listeners
2. Conflict resolution system
3. Advanced reporting
4. Mobile notifications for sync errors

**Timeline**: 4 weeks

---

## 🛠️ Technical Implementation

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AutoMot Hub (Frontend)                   │
│                   React + TypeScript + Vite                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                      │
│  Tables: orders, order_items, component_library, customers  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Integration Middleware (NEW!)                   │
│                Node.js + Express + TypeScript                │
│                                                              │
│  Components:                                                 │
│  ├─ Supabase Listener (watches for new orders)             │
│  ├─ Data Transformer (AutoMot → AutoCount format)          │
│  ├─ AutoCount API Client (AOTG RESTful API)                │
│  ├─ Sync Scheduler (cron jobs)                             │
│  ├─ Error Handler & Logger                                  │
│  └─ Webhook Receiver (for AutoCount updates)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AutoCount Accounting Software                   │
│                (Desktop or Cloud Version)                    │
│                                                              │
│  Modules:                                                    │
│  ├─ Sales Invoice                                           │
│  ├─ Stock Item                                              │
│  ├─ Debtor (Customer)                                       │
│  ├─ Payment                                                  │
│  └─ Reports                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Mapping Specifications

### 1. **Order → Sales Invoice Mapping**

| AutoMot Hub Field | AutoCount Field | Type | Notes |
|-------------------|-----------------|------|-------|
| `order_no` | `DocNo` | String | Invoice number |
| `customer_name` | `DebtorCode` (lookup) | String | Must exist in Debtor master |
| `created_at` | `DocDate` | Date | Invoice date |
| `delivery_address.address` | `Address1` - `Address4` | String | Split into 4 lines |
| `customer_phone` | `Phone1` | String | |
| `customer_email` | `EmailAddress` | String | |
| `subtotal` | `SubTotal` | Decimal | Before tax/discount |
| `tax` | `TaxAmount` | Decimal | SST 6% |
| `discount` + `voucher_discount` | `Discount` | Decimal | Combined discounts |
| `total` | `FinalTotal` | Decimal | Grand total |
| `notes` | `Description` | String | Invoice remarks |
| `payment_method` | `TermsCode` | String | "CASH" or "CREDIT" |

### 2. **Order Items → Invoice Details Mapping**

| AutoMot Hub Field | AutoCount Field | Type | Notes |
|-------------------|-----------------|------|-------|
| `component_sku` | `ItemCode` | String | Must exist in Stock Item |
| `component_name` | `Description` | String | Item description |
| `quantity` | `Qty` | Decimal | Quantity sold |
| `unit_price` | `UnitPrice` | Decimal | Price per unit |
| `total_price` | `Amount` | Decimal | Line total |
| `product_context` | `Description2` | String | Additional info |

### 3. **Component → Stock Item Mapping**

| AutoMot Hub Field | AutoCount Field | Type | Notes |
|-------------------|-----------------|------|-------|
| `component_sku` | `ItemCode` | String | Unique identifier |
| `name` | `Description` | String | Item name |
| `component_type` | `ItemGroup` | String | Product category |
| `stock_level` | `Qty` | Decimal | Current stock |
| `normal_price` | `SalesPrice` | Decimal | Selling price |
| `merchant_price` | `CostPrice` | Decimal | Purchase cost |
| `warehouse_location` | `Location` | String | Warehouse code |
| `is_active` | `Active` | Boolean | Active status |

### 4. **Customer → Debtor Mapping**

| AutoMot Hub Field | AutoCount Field | Type | Notes |
|-------------------|-----------------|------|-------|
| `customer_phone` (unique) | `DebtorCode` | String | Use phone as code |
| `customer_name` | `CompanyName` | String | |
| `customer_email` | `EmailAddress` | String | |
| `delivery_address.*` | `Address1-4` | String | Billing address |
| `credit_limit` | `CreditLimit` | Decimal | Credit limit (RM) |

---

## 💻 Code Examples

### Phase 1: Excel Export from AutoMot Hub

#### Step 1: Create Excel Export Utility

```typescript
// src/lib/autocount-export.ts

import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

interface AutoCountInvoiceRow {
  DocNo: string;
  DocDate: string;
  DebtorCode: string;
  CompanyName: string;
  Address1: string;
  Address2: string;
  Phone1: string;
  EmailAddress: string;
  ItemCode: string;
  Description: string;
  Qty: number;
  UnitPrice: number;
  Amount: number;
  Discount: number;
  TaxAmount: number;
  FinalTotal: number;
  TermsCode: string;
  Description2: string;
}

export async function exportOrdersToAutoCount(
  startDate: Date,
  endDate: Date
): Promise<Blob> {
  // Fetch orders with items from Supabase
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .in('status', ['PAYMENT_VERIFIED', 'PROCESSING', 'COMPLETED']);

  if (error) throw error;

  const excelRows: AutoCountInvoiceRow[] = [];

  orders?.forEach((order) => {
    order.order_items.forEach((item: any) => {
      // Split address into 4 lines (AutoCount requirement)
      const addressLines = splitAddress(order.delivery_address?.address || '');

      excelRows.push({
        DocNo: order.order_no,
        DocDate: new Date(order.created_at).toLocaleDateString('en-GB'), // DD/MM/YYYY
        DebtorCode: formatDebtorCode(order.customer_phone), // e.g., "C-0123456789"
        CompanyName: order.customer_name,
        Address1: addressLines[0] || '',
        Address2: addressLines[1] || '',
        Phone1: order.customer_phone,
        EmailAddress: order.customer_email || '',
        ItemCode: item.component_sku,
        Description: item.component_name,
        Qty: item.quantity,
        UnitPrice: item.unit_price,
        Amount: item.total_price,
        Discount: calculateItemDiscount(order, item),
        TaxAmount: calculateItemTax(item.total_price, order.tax, order.subtotal),
        FinalTotal: order.total,
        TermsCode: order.payment_method === 'online-banking' ? 'CASH' : 'CREDIT',
        Description2: item.product_context || ''
      });
    });
  });

  // Create Excel workbook
  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Invoice');

  // Add header formatting
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cell]) continue;
    worksheet[cell].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'FFFF00' } }
    };
  }

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function splitAddress(address: string): string[] {
  // AutoCount requires max 4 lines, 40 chars each
  const lines: string[] = [];
  const words = address.split(/[\n,]+/);
  let currentLine = '';

  words.forEach((word) => {
    const trimmedWord = word.trim();
    if ((currentLine + ' ' + trimmedWord).length <= 40) {
      currentLine += (currentLine ? ' ' : '') + trimmedWord;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = trimmedWord;
    }
  });

  if (currentLine) lines.push(currentLine);

  // Pad to 4 lines
  while (lines.length < 4) lines.push('');

  return lines.slice(0, 4);
}

function formatDebtorCode(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  // Format as C-XXXXXXXXXX
  return `C-${digits}`;
}

function calculateItemDiscount(order: any, item: any): number {
  // Proportional discount allocation
  const discountRatio = (order.discount + (order.voucher_discount || 0)) / order.subtotal;
  return item.total_price * discountRatio;
}

function calculateItemTax(itemTotal: number, totalTax: number, subtotal: number): number {
  // Proportional tax allocation
  return (itemTotal / subtotal) * totalTax;
}
```

#### Step 2: Add Export Button to Admin UI

```typescript
// src/pages/admin/Orders.tsx (add this component)

import { exportOrdersToAutoCount } from '@/lib/autocount-export';
import { Download } from 'lucide-react';

export function AutoCountExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Export last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const blob = await exportOrdersToAutoCount(startDate, endDate);

      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AutoCount_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Orders exported to Excel format for AutoCount import"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? 'Exporting...' : 'Export to AutoCount'}
    </Button>
  );
}
```

---

### Phase 2: RESTful API Integration

#### Step 1: Setup Integration Service (Backend)

```typescript
// integration-service/src/autocount-client.ts

import axios, { AxiosInstance } from 'axios';

interface AutoCountConfig {
  apiUrl: string;
  apiKey: string;
  companyCode: string;
  username: string;
  password: string;
}

interface AutoCountInvoice {
  DocKey?: string;
  DocNo?: string;
  DocDate: string;
  DebtorCode: string;
  Description?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  Address4?: string;
  Phone1?: string;
  EmailAddress?: string;
  TermsCode: string;
  Detail: AutoCountInvoiceDetail[];
}

interface AutoCountInvoiceDetail {
  ItemCode: string;
  Description: string;
  Qty: number;
  UnitPrice: number;
  Discount?: number;
  TaxCode?: string;
}

export class AutoCountClient {
  private client: AxiosInstance;
  private config: AutoCountConfig;
  private authToken: string | null = null;

  constructor(config: AutoCountConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      }
    });
  }

  /**
   * Authenticate with AutoCount API
   */
  async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/api/auth/login', {
        CompanyCode: this.config.companyCode,
        Username: this.config.username,
        Password: this.config.password
      });

      this.authToken = response.data.token;
      this.client.defaults.headers['Authorization'] = `Bearer ${this.authToken}`;

      console.log('✅ AutoCount authentication successful');
    } catch (error) {
      console.error('❌ AutoCount authentication failed:', error);
      throw new Error('Failed to authenticate with AutoCount API');
    }
  }

  /**
   * Create Sales Invoice in AutoCount
   */
  async createSalesInvoice(invoice: AutoCountInvoice): Promise<string> {
    if (!this.authToken) {
      await this.authenticate();
    }

    try {
      const response = await this.client.post('/api/sales/invoice', invoice);

      console.log('✅ Invoice created:', response.data.DocNo);
      return response.data.DocKey; // Return DocKey for reference
    } catch (error: any) {
      console.error('❌ Failed to create invoice:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Stock Item from AutoCount
   */
  async getStockItem(itemCode: string): Promise<any> {
    if (!this.authToken) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get(`/api/stock/item/${itemCode}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Item not found
      }
      throw error;
    }
  }

  /**
   * Create or Update Stock Item
   */
  async upsertStockItem(item: {
    ItemCode: string;
    Description: string;
    ItemGroup?: string;
    SalesPrice: number;
    CostPrice: number;
    Qty?: number;
    Active?: boolean;
  }): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const existing = await this.getStockItem(item.ItemCode);

    if (existing) {
      // Update existing item
      await this.client.put(`/api/stock/item/${item.ItemCode}`, item);
      console.log(`✅ Stock item updated: ${item.ItemCode}`);
    } else {
      // Create new item
      await this.client.post('/api/stock/item', item);
      console.log(`✅ Stock item created: ${item.ItemCode}`);
    }
  }

  /**
   * Get or Create Debtor (Customer)
   */
  async upsertDebtor(debtor: {
    DebtorCode: string;
    CompanyName: string;
    Address1?: string;
    Address2?: string;
    Address3?: string;
    Address4?: string;
    Phone1?: string;
    EmailAddress?: string;
    CreditLimit?: number;
    TermsCode?: string;
  }): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }

    try {
      // Try to get existing debtor
      const response = await this.client.get(`/api/debtor/${debtor.DebtorCode}`);

      // Update if exists
      await this.client.put(`/api/debtor/${debtor.DebtorCode}`, debtor);
      console.log(`✅ Debtor updated: ${debtor.DebtorCode}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Create new debtor
        await this.client.post('/api/debtor', debtor);
        console.log(`✅ Debtor created: ${debtor.DebtorCode}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Sync Stock Levels from AutoCount to AutoMot Hub
   */
  async getAllStockLevels(): Promise<Array<{ ItemCode: string; Qty: number }>> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const response = await this.client.get('/api/stock/levels');
    return response.data;
  }
}
```

#### Step 2: Order Sync Service

```typescript
// integration-service/src/order-sync.ts

import { createClient } from '@supabase/supabase-js';
import { AutoCountClient } from './autocount-client';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export class OrderSyncService {
  private autocount: AutoCountClient;

  constructor(autocount: AutoCountClient) {
    this.autocount = autocount;
  }

  /**
   * Sync new orders to AutoCount
   */
  async syncNewOrders(): Promise<void> {
    console.log('🔄 Starting order sync to AutoCount...');

    // Get orders that haven't been synced yet
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .is('autocount_doc_key', null) // Not synced yet
      .eq('payment_state', 'APPROVED') // Only approved payments
      .in('status', ['PAYMENT_VERIFIED', 'PROCESSING', 'PACKING', 'DISPATCHED'])
      .order('created_at', { ascending: true })
      .limit(50); // Process in batches

    if (error) {
      console.error('❌ Failed to fetch orders:', error);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No new orders to sync');
      return;
    }

    console.log(`📦 Found ${orders.length} orders to sync`);

    for (const order of orders) {
      try {
        await this.syncOrder(order);

        // Wait 1 second between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to sync order ${order.order_no}:`, error);

        // Log error in database
        await supabase
          .from('sync_errors')
          .insert({
            entity_type: 'order',
            entity_id: order.id,
            error_message: error instanceof Error ? error.message : String(error),
            created_at: new Date().toISOString()
          });
      }
    }

    console.log('✅ Order sync completed');
  }

  /**
   * Sync a single order
   */
  private async syncOrder(order: any): Promise<void> {
    console.log(`🔄 Syncing order: ${order.order_no}`);

    // 1. Ensure customer exists in AutoCount
    const debtorCode = `C-${order.customer_phone.replace(/\D/g, '')}`;
    const addressLines = this.splitAddress(order.delivery_address?.address || '');

    await this.autocount.upsertDebtor({
      DebtorCode: debtorCode,
      CompanyName: order.customer_name,
      Address1: addressLines[0],
      Address2: addressLines[1],
      Address3: addressLines[2],
      Address4: addressLines[3],
      Phone1: order.customer_phone,
      EmailAddress: order.customer_email || '',
      CreditLimit: 0, // Can be updated later
      TermsCode: order.payment_method === 'online-banking' ? 'CASH' : 'CREDIT'
    });

    // 2. Ensure all items exist in AutoCount stock
    for (const item of order.order_items) {
      await this.autocount.upsertStockItem({
        ItemCode: item.component_sku,
        Description: item.component_name,
        ItemGroup: 'AUTO_PARTS', // Can be customized
        SalesPrice: item.unit_price,
        CostPrice: item.unit_price * 0.7, // Estimate, update with actual cost
        Active: true
      });
    }

    // 3. Create invoice in AutoCount
    const invoice = {
      DocDate: new Date(order.created_at).toISOString().split('T')[0],
      DebtorCode: debtorCode,
      Description: `Order: ${order.order_no}`,
      Address1: addressLines[0],
      Address2: addressLines[1],
      Address3: addressLines[2],
      Address4: addressLines[3],
      Phone1: order.customer_phone,
      EmailAddress: order.customer_email || '',
      TermsCode: order.payment_method === 'online-banking' ? 'CASH' : 'CREDIT',
      Detail: order.order_items.map((item: any) => ({
        ItemCode: item.component_sku,
        Description: item.component_name,
        Qty: item.quantity,
        UnitPrice: item.unit_price,
        TaxCode: 'SR' // SST 6%
      }))
    };

    const docKey = await this.autocount.createSalesInvoice(invoice);

    // 4. Update order with AutoCount reference
    await supabase
      .from('orders')
      .update({
        autocount_doc_key: docKey,
        autocount_synced_at: new Date().toISOString()
      })
      .eq('id', order.id);

    console.log(`✅ Order ${order.order_no} synced successfully (DocKey: ${docKey})`);
  }

  private splitAddress(address: string): string[] {
    const lines: string[] = [];
    const words = address.split(/[\n,]+/);
    let currentLine = '';

    words.forEach((word) => {
      const trimmedWord = word.trim();
      if ((currentLine + ' ' + trimmedWord).length <= 40) {
        currentLine += (currentLine ? ' ' : '') + trimmedWord;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = trimmedWord;
      }
    });

    if (currentLine) lines.push(currentLine);
    while (lines.length < 4) lines.push('');

    return lines.slice(0, 4);
  }
}
```

#### Step 3: Main Scheduler

```typescript
// integration-service/src/index.ts

import cron from 'node-cron';
import { AutoCountClient } from './autocount-client';
import { OrderSyncService } from './order-sync';
import { StockSyncService } from './stock-sync';

const autocount = new AutoCountClient({
  apiUrl: process.env.AUTOCOUNT_API_URL!,
  apiKey: process.env.AUTOCOUNT_API_KEY!,
  companyCode: process.env.AUTOCOUNT_COMPANY_CODE!,
  username: process.env.AUTOCOUNT_USERNAME!,
  password: process.env.AUTOCOUNT_PASSWORD!
});

const orderSync = new OrderSyncService(autocount);
const stockSync = new StockSyncService(autocount);

// Sync orders every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('⏰ Running scheduled order sync...');
  await orderSync.syncNewOrders();
});

// Sync stock levels every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('⏰ Running scheduled stock sync...');
  await stockSync.syncStockFromAutoCount();
});

// Manual sync endpoints
import express from 'express';
const app = express();

app.post('/sync/orders', async (req, res) => {
  try {
    await orderSync.syncNewOrders();
    res.json({ success: true, message: 'Order sync completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/sync/stock', async (req, res) => {
  try {
    await stockSync.syncStockFromAutoCount();
    res.json({ success: true, message: 'Stock sync completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.listen(3001, () => {
  console.log('🚀 AutoCount Integration Service running on port 3001');
});
```

---

## 📋 Database Schema Changes

Add these columns to your existing tables:

```sql
-- Add AutoCount sync tracking to orders table
ALTER TABLE orders
ADD COLUMN autocount_doc_key TEXT,
ADD COLUMN autocount_synced_at TIMESTAMPTZ;

-- Create sync error log table
CREATE TABLE sync_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sync status tracking
CREATE TABLE sync_status (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'orders', 'stock', 'customers'
  last_sync_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'idle' -- 'idle', 'running', 'error'
);

INSERT INTO sync_status (sync_type) VALUES
  ('orders'),
  ('stock'),
  ('customers');
```

---

## 🧪 Testing & Deployment

### Testing Checklist

**Phase 1 Testing (Excel Export)**:
- [ ] Export 1 order with 1 item
- [ ] Export 1 order with multiple items
- [ ] Export multiple orders
- [ ] Verify address splitting (max 40 chars per line)
- [ ] Import into AutoCount successfully
- [ ] Verify debtor created in AutoCount
- [ ] Verify invoice totals match

**Phase 2 Testing (API Integration)**:
- [ ] Authentication successful
- [ ] Create new debtor via API
- [ ] Update existing debtor via API
- [ ] Create stock item via API
- [ ] Create sales invoice via API
- [ ] Verify invoice in AutoCount matches AutoMot Hub order
- [ ] Test error handling (invalid data)
- [ ] Test retry logic
- [ ] Monitor sync logs

### Deployment Steps

**Step 1: Prepare AutoCount**
1. Purchase AutoCount API license (AOTG API module)
2. Enable API access in AutoCount settings
3. Create API user with appropriate permissions
4. Note down API URL and credentials

**Step 2: Deploy Integration Service**
1. Setup Node.js server (DigitalOcean/AWS/Azure)
2. Install dependencies: `npm install`
3. Configure environment variables
4. Run: `npm start`
5. Verify service is running: `curl http://localhost:3001/health`

**Step 3: Configure Supabase**
1. Run database migration (add sync columns)
2. Create Supabase database webhook (optional for real-time)
3. Test connection from integration service

**Step 4: Initial Data Migration**
1. Export existing customers to AutoCount
2. Export existing products to AutoCount
3. Sync historical orders (if needed)

**Step 5: Go Live**
1. Enable cron scheduler
2. Monitor first 24 hours closely
3. Check sync logs regularly
4. Train staff on new workflow

---

## 💰 Cost & Timeline Breakdown

### **PHASE 1: Excel Integration**

**Development**:
- Excel export module: 3 days (RM 3,000)
- UI integration: 1 day (RM 1,000)
- Testing & documentation: 1 day (RM 1,000)
- **Subtotal**: RM 5,000

**No licensing cost** (uses Excel, free)

**Total Phase 1**: RM 5,000 | **Timeline**: 1 week

---

### **PHASE 2: API Integration**

**Development**:
- AutoCount API client: 5 days (RM 7,500)
- Order sync service: 5 days (RM 7,500)
- Stock sync service: 3 days (RM 4,500)
- Customer sync: 2 days (RM 3,000)
- Error handling & logging: 3 days (RM 4,500)
- Admin dashboard: 3 days (RM 4,500)
- Testing & debugging: 5 days (RM 7,500)
- **Subtotal**: RM 39,000

**Licensing**:
- AutoCount AOTG API module: RM 3,000 - RM 5,000 (one-time)
- Server hosting (DigitalOcean): RM 60/month

**Total Phase 2**: RM 42,000 - RM 44,000 | **Timeline**: 6 weeks

---

### **PHASE 3: Advanced Automation**

**Development**:
- Bi-directional sync: 4 days (RM 6,000)
- Webhook integration: 3 days (RM 4,500)
- Conflict resolution: 3 days (RM 4,500)
- Advanced reporting: 2 days (RM 3,000)
- **Subtotal**: RM 18,000

**Total Phase 3**: RM 18,000 | **Timeline**: 3 weeks

---

### **GRAND TOTAL**

**Development**: RM 62,000
**Licensing & Infrastructure**: RM 3,000 - RM 5,000 (one-time) + RM 60/month
**Total First Year**: RM 65,720 - RM 67,720

**Ongoing**: RM 720/year (hosting only)

---

## 🎯 Success Metrics

### Key Performance Indicators (KPIs)

1. **Sync Success Rate**: Target 99%+
2. **Sync Time**: < 1 hour for daily orders
3. **Error Rate**: < 1% of transactions
4. **Manual Intervention**: < 5% of cases
5. **Time Saved**: 15-20 hours/week vs manual entry

### Monitoring Dashboard

Create admin dashboard showing:
- Orders synced today / this week / this month
- Failed syncs (with error details)
- Last successful sync time
- Stock discrepancies
- Manual sync trigger buttons

---

## 📞 Support & Maintenance

### Recommended Support Package

**Basic Support** (RM 2,000/month):
- Bug fixes
- Minor enhancements
- Email support (response within 24 hours)
- Monthly sync health report

**Premium Support** (RM 3,500/month):
- Everything in Basic
- Priority support (4-hour response)
- Monthly optimization review
- Quarterly feature updates
- On-call support during business hours

---

## 🚀 Getting Started Checklist

**Before Development**:
- [ ] Purchase AutoCount software (if not already owned)
- [ ] Purchase AutoCount API license (AOTG API module)
- [ ] Confirm AutoCount version (Desktop vs Cloud)
- [ ] Prepare test company database in AutoCount
- [ ] Assign technical point of contact

**Week 1-2** (Phase 1):
- [ ] Develop Excel export
- [ ] Test with sample orders
- [ ] Train staff on import process
- [ ] Go live with manual export/import

**Week 3-8** (Phase 2):
- [ ] Setup integration server
- [ ] Develop API integration
- [ ] Parallel testing (Excel + API)
- [ ] Cut over to automated sync

**Week 9-12** (Phase 3):
- [ ] Implement advanced features
- [ ] Final testing
- [ ] Documentation handover
- [ ] Staff training

---

## 📚 Additional Resources

### AutoCount Documentation
- API Documentation: https://wiki.autocountsoft.com/wiki/Integration_Methods
- Developer Portal: Contact AutoCount support for access
- Sample Code: Available upon API license purchase

### Support Contacts
- **AutoCount Support**: support@autocountsoft.com | 1800-18-7798
- **Integration Developer**: (To be assigned)
- **AutoMot Hub Support**: (Your development team)

---

## ✅ Conclusion

This integration guide provides **3 viable pathways** to connect AutoMot Hub with AutoCount:

1. **Quick Start (2 weeks)**: Excel export/import - simple, free, manual
2. **Automated (8 weeks)**: RESTful API - automated, reliable, scalable
3. **Advanced (12 weeks)**: Full bi-directional sync - enterprise-grade

**Recommended Path for ALSB**:
- Start with Phase 1 (Excel) immediately to begin using both systems
- Develop Phase 2 (API) in parallel over next 2 months
- Add Phase 3 (Advanced) based on business growth

**Total Investment**: RM 65,000 - 70,000 (one-time development)
**Time to Value**: 2 weeks (basic), 3 months (full automation)

This solution ensures **zero data loss**, **minimal manual work**, and **seamless integration** between your modern e-commerce platform and AutoCount accounting system.

---

**Document Version**: 1.0
**Last Updated**: 2025-01-10
**Prepared For**: Auto Lab Sdn Bhd
**Prepared By**: Claude Code Analysis & Integration Design
