# ADMIN DASHBOARD & ANALYTICS MODULE

## Overview

The Admin Dashboard & Analytics Module provides comprehensive business intelligence and operational oversight for the AutoLab platform. This module consists of two main components:

1. **Dashboard** - Real-time operational overview with actionable insights
2. **Analytics** - In-depth data analysis across 6 key business areas

**Access**: Available only to authenticated admin users via `/admin/dashboard` and `/admin/analytics`

---

## 1. DASHBOARD

### Purpose
The Dashboard serves as the command center for day-to-day operations, providing:
- Real-time performance metrics
- Order pipeline visibility
- Urgent action items requiring immediate attention
- Quick access to critical management functions

### Key Features

#### A. Today's Performance (vs Yesterday)

**1. Today's Revenue**
- **Metric**: Total revenue from successful payments today
- **Calculation**: Sum of all orders with `payment_state = 'SUCCESS' OR 'APPROVED'` created today
- **Comparison**: Shows percentage change vs yesterday with trend indicator (↑/↓)
- **Display**: Currency formatted in MYR
- **Business Value**: Track daily sales performance and identify revenue trends

**2. Today's Orders**
- **Metric**: Number of successful orders placed today
- **Filter**: Only counts orders with successful/approved payments
- **Comparison**: Percentage change vs yesterday, with yesterday's count shown
- **Business Value**: Monitor order volume and daily transaction trends

**3. New Customers**
- **Metric**: Number of customer accounts created today
- **Source**: `customer_profiles` table where `created_at >= today`
- **Business Value**: Track customer acquisition and growth

**4. Best Seller Today**
- **Metric**: Product with highest quantity sold today
- **Display**: Product name, units sold, and total revenue
- **Calculation**: Aggregates order items from all successful orders today
- **Note**: If no sales yet, displays "No sales yet"
- **Business Value**: Identify trending products and inventory demand

#### B. Order Pipeline

Visual representation of orders in different stages of fulfillment:

**1. Pending Orders**
- **Status**: PENDING or PAYMENT_PENDING
- **Meaning**: Orders awaiting payment confirmation
- **Action**: Click to filter orders by pending status
- **Business Value**: Monitor orders requiring payment follow-up

**2. Processing Orders**
- **Status**: PROCESSING or PICKING
- **Meaning**: Orders being prepared in warehouse
- **Highlight**: Blue indicator
- **Action**: Click to filter orders by processing status
- **Business Value**: Track order preparation workload

**3. Ready to Ship**
- **Status**: READY_FOR_DELIVERY or PACKING
- **Meaning**: Orders ready for dispatch
- **Highlight**: Green background, green text
- **Action**: Click to navigate to Warehouse Operations
- **Business Value**: Identify orders ready for immediate shipment

#### C. Latest Orders

**Display**: 8 most recent orders
**Information Shown**:
- Order number (e.g., #ORD-20260101-0001)
- Payment status badge (color-coded)
- Customer name
- Order date
- Total amount (bold, highlighted)

**Interaction**: Click any order to view details in Orders page
**Business Value**: Quick access to recent transactions for customer service

#### D. Needs Attention (Alerts)

Right sidebar with urgent action items:

**1. Failed Payments** (Red Alert)
- **Count**: Orders with `payment_state = 'FAILED' OR 'PENDING'`
- **Priority**: URGENT
- **Action**: Click to view failed payment orders
- **Business Value**: Recover potentially lost revenue

**2. Low Stock Alerts** (Orange Alert)
- **Count**: Products where `stock_level <= reorder_level`
- **Priority**: HIGH
- **Action**: Navigate to Inventory Alerts
- **Business Value**: Prevent stockouts and lost sales

**3. Merchant Applications** (Yellow Alert)
- **Count**: Premium partnerships with `subscription_status = 'PENDING'` and `admin_approved = false`
- **Priority**: MEDIUM
- **Action**: Navigate to Premium Partners page
- **Business Value**: Process new merchant onboarding

**4. Pending Reviews** (Purple Alert)
- **Count**: Product reviews with `status = 'pending'`
- **Priority**: MEDIUM
- **Action**: Navigate to Review Moderation
- **Business Value**: Maintain content quality and customer trust

**5. Ready to Ship** (Blue Alert)
- **Count**: Orders ready for dispatch
- **Priority**: MEDIUM-HIGH
- **Action**: Navigate to Warehouse Operations
- **Business Value**: Ensure timely order fulfillment

#### E. Dashboard Controls

**Refresh Button**
- **Function**: Manually reload all dashboard data
- **Display**: Shows last updated time
- **Use Case**: Get latest data without page reload

**Auto-update**: Data refreshes on page load

---

## 2. ANALYTICS

### Purpose
The Analytics page provides deep insights into business performance across 6 key areas, enabling data-driven decision making.

### General Features

**Navigation**: Tab-based interface with 6 analytics categories
**Data Range**: Configurable (primarily last 12 months for trends, last 30 days for daily data)
**Visualizations**: Interactive charts using Recharts library
**Export**: PDF export functionality (button provided)
**Refresh**: Manual refresh button to reload all analytics data

---

### A. REVENUE ANALYTICS TAB

#### Overview Cards

**1. Total Revenue**
- **Metric**: All-time revenue from successful orders
- **Calculation**: Sum of all orders with `payment_state = 'SUCCESS' OR 'APPROVED'`
- **Display**: MYR currency format

**2. This Month**
- **Metric**: Current month's revenue
- **Comparison**: Percentage change vs last month with trend indicator
- **Color Coding**: Green (up), Red (down)

**3. Last Month**
- **Metric**: Previous month's revenue
- **Purpose**: Baseline for comparison

**4. Avg Monthly**
- **Metric**: Average monthly revenue over last 12 months
- **Calculation**: Total last 12 months ÷ 12
- **Business Value**: Identify revenue patterns and seasonality

#### Charts

**1. Revenue Trend (Line Chart)**
- **Time Range**: Last 12 months
- **Data Points**: Monthly revenue
- **Lines**:
  - **Total Revenue** (Green): Combined B2C + B2B
  - **B2C Revenue** (Blue): Revenue from normal customers
  - **B2B Revenue** (Purple): Revenue from merchant customers
- **X-Axis**: Month and year (e.g., "Jan 2026")
- **Y-Axis**: Revenue in MYR
- **Business Value**: Identify growth trends, seasonality, and customer segment performance

**2. Revenue by Category (Pie Chart)**
- **Data**: Distribution of revenue across product categories
- **Source**: Aggregated from `order_items` in successful orders
- **Display**: Percentage and category name labels
- **Color Scheme**: 8-color palette
- **Business Value**: Understand which product categories drive revenue

---

### B. SALES ANALYTICS TAB

#### Overview Cards

**1. Total Units Sold** (Blue)
- **Metric**: Cumulative quantity of all products sold
- **Source**: Sum of `quantity` from all order items in successful orders
- **Display**: Number formatted with commas

**2. Total Products** (Green)
- **Metric**: Count of unique products that have been sold
- **Business Value**: Measure catalog utilization

**3. Best Seller** (Purple)
- **Metric**: Product with highest units sold
- **Display**: Product name and unit count
- **Ranking**: Sorted by quantity (not revenue)

**4. Average per Product** (Orange)
- **Metric**: Average units sold per product
- **Calculation**: Total units ÷ number of products with sales
- **Business Value**: Benchmark product performance

#### Top Selling Products Table

**Display**: Ranked list of top 10 products by quantity sold

**Visual Design**:
- **Rank Badges**:
  - #1: Gold gradient
  - #2: Silver gradient
  - #3: Bronze gradient
  - #4-10: Blue gradient
- **Information Shown**:
  - Product name
  - Units sold (with package icon)
  - Total revenue (with dollar icon)
  - Average price per unit
- **Sorting**: By quantity sold (highest to lowest)

**Business Value**:
- Identify best-performing products
- Guide inventory planning
- Inform marketing strategies
- Understand pricing effectiveness

#### Comparison Charts

**1. Units Sold Comparison (Bar Chart)**
- **Metric**: Quantity of units sold per product
- **Color**: Blue bars
- **X-Axis**: Product names (angled 45° for readability)
- **Y-Axis**: Unit count
- **Business Value**: Visual comparison of product popularity

**2. Revenue Comparison (Bar Chart)**
- **Metric**: Total revenue generated per product
- **Color**: Green bars
- **X-Axis**: Product names (angled 45°)
- **Y-Axis**: Revenue in MYR
- **Business Value**: Identify highest revenue-generating products

---

### C. CUSTOMERS ANALYTICS TAB

#### Overview Cards

**1. Total Customers**
- **Metric**: Total registered customer accounts
- **Source**: Count of all records in `customer_profiles`

**2. New This Month**
- **Metric**: Customers who registered in current month
- **Calculation**: Last data point from customer growth chart

**3. B2C Customers** (Blue)
- **Metric**: Normal customer accounts
- **Filter**: `customer_type != 'merchant'`

**4. B2B Merchants** (Purple)
- **Metric**: Merchant customer accounts
- **Filter**: `customer_type = 'merchant'`

#### Customer Growth Chart (Bar Chart)

- **Time Range**: Last 12 months
- **Metric**: New customer acquisitions per month
- **X-Axis**: Month abbreviations (Jan, Feb, Mar...)
- **Y-Axis**: Number of new customers
- **Color**: Blue bars
- **Business Value**: Track customer acquisition trends and identify growth periods

#### Customer Segmentation (Pie Chart)

- **Categories**:
  - Normal Customers
  - Merchants
- **Display**: Percentage labels
- **Business Value**: Understand customer base composition

#### Top Customers Table

**Criteria**: Ranked by total spending
**Display**: Top 10 customers
**Information Shown**:
- Customer ID
- Number of orders placed
- Total spending (MYR)
- Rank badge (numbered 1-10)

**Business Value**:
- Identify VIP customers
- Guide loyalty programs
- Inform personalized marketing

---

### D. ORDERS ANALYTICS TAB

#### Overview Cards

**1. Total Orders**
- **Metric**: All-time count of successful orders
- **Filter**: Only orders with successful payments

**2. Avg Order Value**
- **Metric**: Average transaction amount
- **Calculation**: Total revenue ÷ total orders
- **Display**: MYR currency format
- **Business Value**: Track pricing effectiveness and customer spending patterns

**3. Today's Orders**
- **Metric**: Orders placed today (last data point from daily chart)
- **Business Value**: Monitor daily activity

**4. Today's Revenue** (Purple)
- **Metric**: Revenue from today's orders
- **Business Value**: Track daily performance

#### Daily Orders Chart (Dual-Axis Line Chart)

- **Time Range**: Last 30 days
- **Lines**:
  - **Orders** (Blue, Left Y-Axis): Number of orders per day
  - **Revenue** (Green, Right Y-Axis): Revenue per day in MYR
- **X-Axis**: Dates (e.g., "1 Jan", "2 Jan")
- **Business Value**:
  - Identify daily patterns
  - Correlate order volume with revenue
  - Spot anomalies or trends

#### Order Status Distribution

**Pie Chart**:
- **Data**: Count of orders in each status
- **Statuses**: PLACED, PROCESSING, PACKING, DISPATCHED, DELIVERED, etc.
- **Display**: Status name and percentage labels
- **Color Scheme**: 8-color palette

**Status Legend**:
- Lists all statuses with color indicators
- Shows count per status
- Uses badge design

**Business Value**:
- Monitor order fulfillment pipeline
- Identify bottlenecks
- Track operational efficiency

---

### E. INVENTORY ANALYTICS TAB

#### Overview Cards

**1. Total Products**
- **Metric**: All SKUs in system
- **Source**: Count of all products in `component_library`

**2. Active Products** (Green)
- **Metric**: Products currently available for sale
- **Filter**: `is_active = true`

**3. Low Stock** (Orange Alert)
- **Metric**: Products at or below reorder level
- **Calculation**: `stock_quantity <= reorder_level`
- **Business Value**: Proactive inventory management

**4. Out of Stock** (Red Alert)
- **Metric**: Products with zero inventory
- **Calculation**: `stock_quantity = 0`
- **Priority**: URGENT - prevents lost sales

#### Inventory Summary Card

**Total Inventory Value**
- **Metric**: Total value of all stock on hand
- **Calculation**: Sum of (`stock_quantity × cost_price`) for all products
- **Display**: Large, prominent MYR amount
- **Business Value**: Understand capital tied up in inventory

**Stock Status Breakdown**:
1. **Well Stocked** (Green Badge)
   - Products above reorder level
   - Count displayed

2. **Low Stock** (Orange Badge)
   - Products at/below reorder level
   - Requires action

3. **Out of Stock** (Red Badge)
   - Zero inventory items
   - Urgent reorder needed

**Business Value**:
- Financial planning
- Cash flow management
- Inventory optimization
- Risk assessment

---

### F. MERCHANTS ANALYTICS TAB

#### Overview Cards

**1. Total Merchants**
- **Metric**: All merchant partnership accounts
- **Source**: Count of all records in `premium_partnerships`

**2. Pending Review** (Yellow)
- **Metric**: Applications awaiting admin approval
- **Filter**: `admin_approved = false`
- **Business Value**: Track onboarding pipeline

**3. Monthly Revenue** (Green - MRR)
- **Metric**: Monthly Recurring Revenue from subscriptions
- **Calculation**:
  - Professional: (count × RM99) ÷ 12
  - Panel: count × RM350
- **Business Value**: Predictable revenue stream

**4. Annual Revenue** (Purple - ARR)
- **Metric**: Annual Recurring Revenue from subscriptions
- **Calculation**:
  - Professional: count × RM99
  - Panel: count × RM350 × 12
- **Business Value**: Total subscription revenue potential

#### Subscription Plans Distribution (Pie Chart)

- **Plans**:
  - **Professional** (Blue): RM99/year
  - **Panel** (Purple): RM350/month
- **Display**: Plan name, count, and percentage
- **Business Value**: Understand merchant tier distribution

#### Revenue Breakdown Card

**Per Plan Analysis**:
For each subscription tier, shows:
- Plan name badge (color-coded)
- Number of merchants on plan
- Pricing structure
- Monthly revenue contribution
- Annual revenue contribution

**Example**:
```
Professional (5 merchants) - RM 99/year
├─ Monthly Revenue: RM 41.25
└─ Annual Revenue: RM 495

Panel (3 merchants) - RM 350/month
├─ Monthly Revenue: RM 1,050
└─ Annual Revenue: RM 12,600
```

**Business Value**:
- Revenue forecasting
- Tier performance analysis
- Pricing strategy validation

#### Merchant Program Metrics Card

**1. Total Merchant Revenue**
- **Metric**: Annual recurring revenue (ARR)
- **Display**: Large MYR amount
- **Business Value**: Total subscription income

**2. Avg Revenue per Merchant**
- **Metric**: ARR ÷ total merchants
- **Display**: Per year per merchant
- **Business Value**: Understand average merchant value

**3. Growth Potential** (Purple)
- **Metric**: Number of pending applications
- **Business Value**: Pipeline of new revenue opportunities

---

## 3. KEY METRICS DEFINITIONS

### Financial Metrics

**Revenue**
- Only counts orders with `payment_state = 'SUCCESS' OR 'APPROVED'`
- Excludes failed, pending, or cancelled payments
- Calculated from `order.total` field

**MRR (Monthly Recurring Revenue)**
- Predictable monthly income from subscriptions
- Professional plans: Annual fee divided by 12
- Panel plans: Monthly fee × active subscriptions

**ARR (Annual Recurring Revenue)**
- Total yearly subscription revenue
- Professional plans: Annual fee × count
- Panel plans: Monthly fee × 12 × count

**Average Order Value (AOV)**
- Total revenue ÷ number of orders
- Indicator of customer spending behavior

### Operational Metrics

**Order Status**
- `PENDING`: Awaiting payment
- `PROCESSING`: Payment confirmed, preparing order
- `PICKING`: Items being gathered from warehouse
- `PACKING`: Order being packaged
- `READY_FOR_DELIVERY`: Ready to ship
- `DISPATCHED`: Shipped to customer
- `DELIVERED`: Successfully delivered
- `COMPLETED`: Order fully completed
- `CANCELLED`: Order cancelled
- `REJECTED`: Order rejected

**Stock Levels**
- **Well Stocked**: Above reorder level
- **Low Stock**: At or below reorder level (needs reordering)
- **Out of Stock**: Zero quantity (urgent reorder)

### Customer Metrics

**Customer Types**
- **Normal**: B2C customers (individual consumers)
- **Merchant**: B2B partners with special pricing/features

**Customer Lifetime Value**
- Total spending per customer across all orders
- Used in "Top Customers" ranking

---

## 4. HOW TO USE THE MODULE

### Daily Operations Workflow

**Morning Routine**:
1. Open Dashboard
2. Check "Needs Attention" alerts
3. Review today's performance vs yesterday
4. Check order pipeline for bottlenecks
5. Address failed payments and low stock items

**Order Management**:
1. Monitor "Ready to Ship" count
2. Click to navigate to Warehouse Operations
3. Process pending orders from pipeline
4. Review recent orders for customer service issues

**Inventory Management**:
1. Check Low Stock alerts daily
2. Use Analytics → Inventory tab for detailed view
3. Review inventory value and stock status
4. Create purchase orders for low/out of stock items

### Strategic Planning Workflow

**Weekly Reviews**:
1. Analytics → Revenue tab
   - Compare this week vs last week
   - Identify revenue trends

2. Analytics → Sales tab
   - Review top-selling products
   - Plan inventory based on demand

3. Analytics → Customers tab
   - Track customer growth
   - Identify top customers for retention programs

**Monthly Reviews**:
1. Analytics → Revenue tab
   - Review monthly revenue trend chart
   - Compare month-over-month growth
   - Analyze revenue by category

2. Analytics → Orders tab
   - Review 30-day order trends
   - Calculate average order value
   - Analyze order status distribution

3. Analytics → Merchants tab
   - Track MRR and ARR growth
   - Review pending applications
   - Analyze plan distribution

**Quarterly Business Reviews**:
1. Export analytics data (PDF button)
2. Review 12-month revenue trends
3. Analyze customer acquisition patterns
4. Assess inventory turnover
5. Evaluate merchant program performance
6. Set targets for next quarter

---

## 5. TECHNICAL DETAILS

### Data Sources

**Orders Data**:
- Primary: `get_admin_orders()` RPC function
- Fallback 1: `admin_orders_enhanced` view
- Fallback 2: `orders` table direct query
- Order items: JSONB field `order_items` in orders table

**Customers Data**:
- Table: `customer_profiles`
- Filters by `customer_type` for segmentation

**Products Data**:
- Table: `component_library`
- Filters by `is_active` for active products

**Merchants Data**:
- Table: `premium_partnerships`
- Includes subscription plan and approval status

### Performance Optimizations

**Dashboard**:
- Loads on component mount
- Manual refresh via button
- Filters data client-side after single fetch
- Shows last updated timestamp

**Analytics**:
- Parallel data fetching with `Promise.all()`
- Separate processing functions per analytics area
- Client-side aggregations and calculations
- Responsive charts with lazy loading

### Chart Library

**Recharts Components Used**:
- `LineChart`: Trends over time
- `BarChart`: Comparisons
- `PieChart`: Distributions
- `ResponsiveContainer`: Adaptive sizing
- `Tooltip`: Interactive data display
- `Legend`: Chart key

### Date/Time Handling

**Today Calculation**:
```javascript
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
```

**Monthly Aggregation**:
- Loops through last 12 months
- Filters by month and year match
- Sorts chronologically

**Currency Formatting**:
```javascript
new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 0
})
```

### Permissions & Access Control

**Authentication**:
- Protected by admin authentication
- Uses custom admin login (not Supabase Auth)
- Accessed via admin panel routes only

**RLS Considerations**:
- Dashboard/Analytics use service role or permissive RLS
- Data access controlled by admin panel UI authentication
- No customer-facing access to these analytics

---

## 6. BUSINESS VALUE SUMMARY

### Dashboard Benefits
✅ **Real-time Visibility**: Instant view of business health
✅ **Proactive Alerts**: Catch issues before they escalate
✅ **Quick Actions**: One-click navigation to relevant management pages
✅ **Performance Tracking**: Daily comparison to identify trends early

### Analytics Benefits
✅ **Data-Driven Decisions**: Make informed business choices
✅ **Trend Identification**: Spot patterns across 12 months
✅ **Customer Insights**: Understand buying behavior
✅ **Revenue Optimization**: Identify high-performing products/categories
✅ **Inventory Planning**: Prevent stockouts and optimize stock levels
✅ **Merchant Program ROI**: Track subscription revenue and growth

### Competitive Advantages
🚀 **Comprehensive**: 6 analytics areas cover all business aspects
🚀 **Visual**: Charts and graphs for quick comprehension
🚀 **Actionable**: Direct links from alerts to management pages
🚀 **Scalable**: Handles growing data volumes efficiently
🚀 **Integrated**: Unified view across orders, customers, inventory, merchants

---

## 7. FUTURE ENHANCEMENTS (Roadmap)

**Potential Features**:
- [ ] Export to CSV/Excel (in addition to PDF)
- [ ] Scheduled email reports
- [ ] Custom date range selection
- [ ] Forecasting and predictive analytics
- [ ] Comparison to industry benchmarks
- [ ] Real-time dashboard updates (WebSocket)
- [ ] Mobile-responsive charts
- [ ] Drill-down capabilities (click chart to see details)
- [ ] Custom KPI widgets
- [ ] Multi-currency support for international sales

---

## 8. TROUBLESHOOTING

### Dashboard shows zero values
**Cause**: No successful orders in database
**Solution**: Ensure orders have `payment_state = 'SUCCESS'`

### Charts not displaying
**Cause**: Missing data or date format issues
**Solution**: Check browser console for errors, verify data structure

### Slow loading times
**Cause**: Large dataset or slow network
**Solution**:
- Use database indexes on `created_at`, `payment_state`
- Implement pagination for large datasets
- Consider caching frequently accessed data

### Incorrect revenue calculations
**Cause**: Including failed/pending orders
**Solution**: Verify filter: `payment_state = 'SUCCESS' OR 'APPROVED'`

---

## CONCLUSION

The Admin Dashboard & Analytics Module is a comprehensive business intelligence system designed for operational excellence and strategic planning. By providing both real-time operational insights (Dashboard) and deep analytical capabilities (Analytics), it empowers administrators to:

- Monitor daily business performance
- Identify and respond to urgent issues
- Make data-driven strategic decisions
- Optimize inventory and customer relationships
- Track and grow revenue streams

This module is essential for scaling the AutoLab platform efficiently while maintaining high service quality and profitability.
