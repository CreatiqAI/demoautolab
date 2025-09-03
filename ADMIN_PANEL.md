# Admin Panel Documentation

## Overview
The admin panel provides a comprehensive interface for managing products, orders, customers, and system settings. It features role-based authentication and a responsive design built with React, TypeScript, and Tailwind CSS.

## Access
The admin panel is accessible at `/admin` and requires authentication with either `admin` or `staff` role.

### Default Access
Users with the following roles can access the admin panel:
- **Admin**: Full access to all features
- **Staff**: Full access to all features (can be customized in future)
- **Customer/Merchant**: No access (redirected with error message)

## Features

### 1. Dashboard (`/admin`)
- **Overview Statistics**: Total revenue, orders, customers, and products
- **Recent Orders**: Latest 5 orders with quick details
- **Real-time Data**: All statistics are fetched from the database in real-time

### 2. Products Management (`/admin/products`)
- **Product CRUD**: Create, read, update, and delete products
- **Search & Filter**: Search by name, SKU, or brand
- **Inventory Management**: Track stock levels and set reorder levels
- **Category Assignment**: Assign products to categories
- **Pricing**: Set both regular and merchant prices
- **Product Details**: Manage SKU, dimensions, weight, brand, model, year range
- **Status Control**: Activate/deactivate products

### 3. Orders Management (`/admin/orders`)
- **Order Overview**: View all orders with customer and status information
- **Order Details**: Complete order information including items, addresses, and totals
- **Status Management**: Update order status (placed, verified, packing, dispatched, etc.)
- **Payment Tracking**: Monitor payment states (unpaid, submitted, approved, rejected)
- **Search & Filter**: Find orders by number, customer name, or status
- **Customer Information**: Access customer details directly from orders

### 4. Customer Management (`/admin/customers`)
- **Customer Profiles**: View and edit customer information
- **Role Management**: Update user roles (customer, merchant, staff, admin)
- **Credit Limits**: Set and manage customer credit limits
- **Contact Verification**: Manage phone verification and WhatsApp opt-in status
- **Address Management**: View customer addresses
- **Order History**: Access complete customer order history
- **Search & Filter**: Find customers by name, phone, or role

### 5. Settings (`/admin/settings`)
- **Category Management**: Create and manage product categories
- **System Information**: View database status and configuration
- **Category Hierarchy**: Support for parent-child category relationships
- **Category Sorting**: Custom sort order for categories

## Technical Implementation

### Database Integration
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Type Safety**: Full TypeScript support with generated types
- **Row Level Security**: Built-in security policies (can be implemented)

### Authentication & Authorization
- **Role-Based Access**: Uses the `user_role` enum from the profiles table
- **Protected Routes**: `ProtectedAdminRoute` component validates user permissions
- **Session Management**: Automatic session handling with redirect on unauthorized access

### UI Components
- **Shadcn/UI**: Modern, accessible UI components
- **Responsive Design**: Mobile-friendly layout with collapsible sidebar
- **Loading States**: Proper loading indicators for async operations
- **Error Handling**: Toast notifications for success/error messages
- **Form Validation**: Client-side validation with proper error states

### Data Management
- **Real-time Updates**: Automatic data refresh after modifications
- **Optimistic Updates**: Immediate UI feedback for better UX
- **Pagination**: Ready for implementation on large datasets
- **Search**: Client-side search with filtering capabilities

## Database Schema Used

The admin panel integrates with the following key tables:
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `profiles` - User accounts (customers, staff, admin)
- `categories` - Product categories
- `addresses` - Customer addresses
- `payment_proofs` - Payment verification documents

## Getting Started

1. **Access the Admin Panel**:
   - Navigate to `http://localhost:8080/admin`
   - Sign in with an admin or staff account

2. **First Steps**:
   - Create product categories in Settings
   - Add products to your catalog
   - Monitor orders as they come in
   - Manage customer accounts as needed

3. **User Management**:
   - Update user roles in the Customers section
   - Set credit limits for wholesale customers
   - Verify customer contact information

## Security Considerations

- Role-based access control prevents unauthorized access
- All database operations use Supabase's built-in security
- User sessions are properly managed and validated
- Sensitive operations require confirmation dialogs

## Future Enhancements

Potential improvements that could be added:
- **Advanced Analytics**: Charts and reports for sales data
- **Bulk Operations**: Bulk product updates, order processing
- **Export Functions**: Export data to CSV/Excel
- **Email Notifications**: Automated email alerts
- **Advanced Search**: Full-text search with filters
- **Audit Logs**: Track admin actions and changes
- **Multi-tenant Support**: Support for multiple stores
- **API Integration**: Connect with external services

## Troubleshooting

### Common Issues
1. **Access Denied**: Ensure your user account has `admin` or `staff` role in the profiles table
2. **Loading Issues**: Check database connection and Supabase configuration
3. **Form Errors**: Verify all required fields are filled correctly
4. **Permission Errors**: Check Supabase RLS policies if enabled

### Support
For technical issues or questions about the admin panel, check:
- Browser console for JavaScript errors
- Network tab for API call failures
- Supabase dashboard for database connectivity