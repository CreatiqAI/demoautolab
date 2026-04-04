import { Package, PackageCheck, Truck, CircleCheck, XCircle, CreditCard, MapPin } from 'lucide-react';

export const ORDER_STATUSES = {
  PROCESSING: 'PROCESSING',
  PACKING: 'PACKING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  READY_FOR_COLLECTION: 'READY_FOR_COLLECTION',
  COMPLETED: 'COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

export const ACTIVE_STATUSES: OrderStatus[] = ['PROCESSING', 'PACKING', 'OUT_FOR_DELIVERY', 'READY_FOR_COLLECTION'];
export const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'PAYMENT_FAILED', 'CANCELLED'];

export const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: typeof Package;
}> = {
  PROCESSING: {
    label: 'Processing',
    description: 'Payment confirmed, preparing order',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: CreditCard,
  },
  PACKING: {
    label: 'Packing',
    description: 'Items being packed',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    icon: PackageCheck,
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    description: 'On the way to customer',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    icon: Truck,
  },
  READY_FOR_COLLECTION: {
    label: 'Ready for Collection',
    description: 'Ready for pickup at store',
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    icon: MapPin,
  },
  COMPLETED: {
    label: 'Completed',
    description: 'Order delivered',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: CircleCheck,
  },
  PAYMENT_FAILED: {
    label: 'Payment Failed',
    description: 'Payment was unsuccessful',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Order was cancelled',
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    icon: XCircle,
  },
};

export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status as OrderStatus]?.label || status;
}

export function getStatusBadgeClasses(status: string): string {
  const config = STATUS_CONFIG[status as OrderStatus];
  if (!config) return 'bg-gray-50 text-gray-700';
  return `${config.bgColor} ${config.textColor}`;
}
