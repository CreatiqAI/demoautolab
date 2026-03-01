import React from 'react';
import { Clock, Package, PackageCheck, Truck, CheckCircle, XCircle, CreditCard, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  status: string;
  label: string;
  description?: string;
  timestamp?: string;
  isComplete: boolean;
  isCurrent: boolean;
}

interface OrderTimelineProps {
  currentStatus: string;
  createdAt: string;
  updatedAt?: string;
  trackingNumber?: string | null;
  courierProvider?: string | null;
  compact?: boolean;
}

// Order status workflow
const STATUS_WORKFLOW = [
  { status: 'PROCESSING', label: 'Order Placed', description: 'Payment confirmed, preparing order', icon: CreditCard },
  { status: 'PACKING', label: 'Packing', description: 'Items being packed', icon: PackageCheck },
  { status: 'READY_FOR_DELIVERY', label: 'Ready', description: 'Ready for pickup/delivery', icon: CheckCircle },
  { status: 'OUT_FOR_DELIVERY', label: 'Shipping', description: 'On the way to you', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', description: 'Order delivered', icon: CheckCircle },
];

// Get status index (-1 for special statuses like CANCELLED)
function getStatusIndex(status: string): number {
  return STATUS_WORKFLOW.findIndex(s => s.status === status);
}

// Check if status is a terminal/special status
function isSpecialStatus(status: string): boolean {
  return ['CANCELLED', 'PAYMENT_FAILED', 'COMPLETED'].includes(status);
}

export default function OrderTimeline({
  currentStatus,
  createdAt,
  updatedAt,
  trackingNumber,
  courierProvider,
  compact = false
}: OrderTimelineProps) {
  const currentIndex = getStatusIndex(currentStatus);
  const isSpecial = isSpecialStatus(currentStatus);

  // Build timeline events
  const events: TimelineEvent[] = STATUS_WORKFLOW.map((step, index) => {
    let isComplete = false;
    let isCurrent = false;

    if (isSpecial) {
      // For special statuses, mark all as incomplete
      isComplete = false;
      isCurrent = false;
    } else if (currentStatus === 'COMPLETED') {
      // COMPLETED means all steps are done
      isComplete = true;
      isCurrent = index === STATUS_WORKFLOW.length - 1;
    } else {
      isComplete = index < currentIndex;
      isCurrent = index === currentIndex;
    }

    return {
      status: step.status,
      label: step.label,
      description: step.description,
      isComplete,
      isCurrent,
      timestamp: isCurrent ? updatedAt : (isComplete ? createdAt : undefined)
    };
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Compact horizontal timeline for mobile/small spaces
  if (compact) {
    return (
      <div className="w-full">
        {/* Special status banner */}
        {isSpecial && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            currentStatus === 'CANCELLED' ? 'bg-red-50 text-red-700' :
            currentStatus === 'PAYMENT_FAILED' ? 'bg-orange-50 text-orange-700' :
            'bg-green-50 text-green-700'
          }`}>
            {currentStatus === 'CANCELLED' || currentStatus === 'PAYMENT_FAILED' ? (
              <XCircle className="h-5 w-5" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            <span className="font-semibold">
              {currentStatus === 'CANCELLED' ? 'Order Cancelled' :
               currentStatus === 'PAYMENT_FAILED' ? 'Payment Failed' :
               'Order Completed'}
            </span>
          </div>
        )}

        {/* Horizontal progress bar */}
        <div className="relative">
          <div className="flex justify-between items-center">
            {events.map((event, index) => {
              const StepIcon = STATUS_WORKFLOW[index].icon;
              return (
                <div
                  key={event.status}
                  className="flex flex-col items-center flex-1"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                      event.isComplete
                        ? 'bg-green-500 text-white'
                        : event.isCurrent
                          ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <span className={`text-[10px] mt-1 text-center ${
                    event.isCurrent ? 'text-blue-600 font-semibold' :
                    event.isComplete ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {event.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: isSpecial ? '0%' : `${(currentIndex / (events.length - 1)) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Current status text */}
        {!isSpecial && events[currentIndex] && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">{events[currentIndex].description}</p>
            {updatedAt && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {formatDate(updatedAt)}
              </p>
            )}
          </div>
        )}

        {/* Tracking info */}
        {trackingNumber && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Tracking Number</p>
            <p className="text-sm font-mono font-bold text-blue-800">{trackingNumber}</p>
            {courierProvider && (
              <p className="text-xs text-blue-600 mt-1">via {courierProvider}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full vertical timeline
  return (
    <div className="w-full">
      {/* Special status banner */}
      {isSpecial && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          currentStatus === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
          currentStatus === 'PAYMENT_FAILED' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {currentStatus === 'CANCELLED' || currentStatus === 'PAYMENT_FAILED' ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          <div>
            <span className="font-semibold block">
              {currentStatus === 'CANCELLED' ? 'Order Cancelled' :
               currentStatus === 'PAYMENT_FAILED' ? 'Payment Failed' :
               'Order Completed'}
            </span>
            {updatedAt && (
              <span className="text-xs opacity-75">{formatDate(updatedAt)}</span>
            )}
          </div>
        </div>
      )}

      {/* Vertical timeline */}
      <div className="relative pl-8">
        {/* Timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

        {events.map((event, index) => {
          const StepIcon = STATUS_WORKFLOW[index].icon;
          const isLast = index === events.length - 1;

          return (
            <div
              key={event.status}
              className={`relative pb-6 ${isLast ? 'pb-0' : ''}`}
            >
              {/* Status dot */}
              <div
                className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center -translate-x-1/2 ${
                  event.isComplete
                    ? 'bg-green-500 text-white'
                    : event.isCurrent
                      ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 text-gray-400'
                }`}
              >
                <StepIcon className="h-3 w-3" />
              </div>

              {/* Content */}
              <div className="ml-4">
                <div className="flex items-center gap-2">
                  <h4 className={`font-semibold ${
                    event.isCurrent ? 'text-blue-600' :
                    event.isComplete ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {event.label}
                  </h4>
                  {event.isCurrent && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      Current
                    </span>
                  )}
                </div>

                <p className={`text-sm ${
                  event.isComplete || event.isCurrent ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {event.description}
                </p>

                {event.timestamp && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(event.timestamp)}
                  </p>
                )}

                {/* Show tracking info at OUT_FOR_DELIVERY step */}
                {event.status === 'OUT_FOR_DELIVERY' && event.isCurrent && trackingNumber && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">Tracking Number</p>
                    <p className="text-sm font-mono font-bold text-blue-800">{trackingNumber}</p>
                    {courierProvider && (
                      <p className="text-xs text-blue-600 mt-0.5">via {courierProvider}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
