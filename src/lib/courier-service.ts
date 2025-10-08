/**
 * Courier Service Integration
 *
 * This file contains mock implementations of courier service APIs.
 * Replace the mock functions with actual API calls when integrating with real services.
 */

export type CourierProvider = 'JNT' | 'LALAMOVE' | 'OWN_DELIVERY';

export interface CourierService {
  id: CourierProvider;
  name: string;
  description: string;
  logo?: string;
  enabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface ShipmentRequest {
  orderId: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: {
    address: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    notes?: string;
  };
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    weight?: number; // in kg
    value?: number; // in MYR
  }>;
  totalWeight?: number; // in kg
  totalValue?: number; // in MYR
  pickupAddress?: {
    address: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    contactName?: string;
    contactPhone?: string;
  };
  serviceType?: string; // e.g., 'standard', 'express', 'same-day'
}

export interface ShipmentResponse {
  success: boolean;
  trackingNumber?: string;
  shipmentId?: string;
  courierProvider: CourierProvider;
  estimatedDeliveryDate?: string;
  shippingLabel?: string; // URL or base64
  qrCode?: string;
  cost?: number;
  errorMessage?: string;
  errorCode?: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  courierProvider: CourierProvider;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';
  statusDescription: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  currentLocation?: string;
  history: Array<{
    timestamp: string;
    status: string;
    description: string;
    location?: string;
  }>;
  recipient?: {
    name: string;
    signature?: string; // URL to signature image
  };
}

export interface CourierRate {
  courierProvider: CourierProvider;
  serviceType: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  available: boolean;
  errorMessage?: string;
}

// Mock courier service configurations
export const COURIER_SERVICES: CourierService[] = [
  {
    id: 'JNT',
    name: 'J&T Express',
    description: 'Fast and reliable nationwide delivery',
    enabled: true,
    apiEndpoint: 'https://api.jtexpress.my/v1', // Mock endpoint
    apiKey: 'demo_jnt_api_key'
  },
  {
    id: 'LALAMOVE',
    name: 'Lalamove',
    description: 'Same-day delivery service',
    enabled: true,
    apiEndpoint: 'https://api.lalamove.com/v2', // Mock endpoint
    apiKey: 'demo_lalamove_api_key'
  },
  {
    id: 'OWN_DELIVERY',
    name: 'Own Delivery',
    description: 'In-house delivery service',
    enabled: true
  }
];

/**
 * J&T Express API Integration
 * Official API docs: https://www.jtexpress.my/api-docs
 */
export class JNTExpressService {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string, apiEndpoint: string) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Create shipment with J&T Express
   * In production, this would call the actual J&T API
   */
  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    // MOCK IMPLEMENTATION - Replace with actual API call
    console.log('🚚 Creating J&T Express shipment:', request);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful response
    const trackingNumber = `JNT${Date.now()}${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      trackingNumber,
      shipmentId: `SHIP-JNT-${Date.now()}`,
      courierProvider: 'JNT',
      estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      shippingLabel: `/api/mock/labels/jnt/${trackingNumber}`, // Mock label URL
      qrCode: `https://chart.googleapis.com/chart?cht=qr&chl=${trackingNumber}&chs=200x200`,
      cost: 8.50
    };

    /* REAL IMPLEMENTATION EXAMPLE:
    try {
      const response = await fetch(`${this.apiEndpoint}/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'API-KEY': this.apiKey
        },
        body: JSON.stringify({
          sender: request.pickupAddress,
          receiver: {
            name: request.customerName,
            phone: request.customerPhone,
            address: request.deliveryAddress.address,
            city: request.deliveryAddress.city,
            postcode: request.deliveryAddress.postcode,
            state: request.deliveryAddress.state
          },
          parcel: {
            items: request.items,
            weight: request.totalWeight,
            declared_value: request.totalValue
          },
          service_type: request.serviceType || 'standard'
        })
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          trackingNumber: data.tracking_number,
          shipmentId: data.shipment_id,
          courierProvider: 'JNT',
          estimatedDeliveryDate: data.estimated_delivery_date,
          shippingLabel: data.label_url,
          cost: data.shipping_cost
        };
      } else {
        return {
          success: false,
          courierProvider: 'JNT',
          errorMessage: data.message,
          errorCode: data.error_code
        };
      }
    } catch (error: any) {
      return {
        success: false,
        courierProvider: 'JNT',
        errorMessage: error.message,
        errorCode: 'API_ERROR'
      };
    }
    */
  }

  /**
   * Track shipment with J&T Express
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    // MOCK IMPLEMENTATION
    console.log('📍 Tracking J&T shipment:', trackingNumber);

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingNumber,
      courierProvider: 'JNT',
      status: 'in_transit',
      statusDescription: 'Package is on the way to delivery hub',
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      currentLocation: 'Kuala Lumpur Distribution Center',
      history: [
        {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'picked_up',
          description: 'Package picked up from sender',
          location: 'Cheras Warehouse'
        },
        {
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          status: 'in_transit',
          description: 'Package arrived at sorting facility',
          location: 'Kuala Lumpur Distribution Center'
        },
        {
          timestamp: new Date().toISOString(),
          status: 'in_transit',
          description: 'Package is on the way to delivery hub',
          location: 'Kuala Lumpur Distribution Center'
        }
      ]
    };
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(trackingNumber: string): Promise<{ success: boolean; message: string }> {
    // MOCK IMPLEMENTATION
    console.log('❌ Cancelling J&T shipment:', trackingNumber);

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      message: 'Shipment cancelled successfully'
    };
  }
}

/**
 * Lalamove API Integration
 * Official API docs: https://developers.lalamove.com/
 */
export class LalamoveService {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string, apiEndpoint: string) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Create delivery order with Lalamove
   */
  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    // MOCK IMPLEMENTATION
    console.log('🚚 Creating Lalamove delivery:', request);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const trackingNumber = `LLM${Date.now()}${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      trackingNumber,
      shipmentId: `SHIP-LLM-${Date.now()}`,
      courierProvider: 'LALAMOVE',
      estimatedDeliveryDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // Same day - 4 hours
      shippingLabel: `/api/mock/labels/lalamove/${trackingNumber}`,
      qrCode: `https://chart.googleapis.com/chart?cht=qr&chl=${trackingNumber}&chs=200x200`,
      cost: 15.00 // Typically more expensive for same-day
    };

    /* REAL IMPLEMENTATION EXAMPLE:
    try {
      const response = await fetch(`${this.apiEndpoint}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-LLM-Country': 'MY'
        },
        body: JSON.stringify({
          serviceType: 'MOTORCYCLE', // or 'CAR', 'VAN', 'TRUCK'
          stops: [
            {
              location: {
                address: request.pickupAddress?.address,
                coordinates: { lat: '3.1390', lng: '101.6869' } // Would geocode address
              },
              contactName: request.pickupAddress?.contactName,
              contactPhone: request.pickupAddress?.contactPhone
            },
            {
              location: {
                address: request.deliveryAddress.address,
                coordinates: { lat: '3.1390', lng: '101.6869' } // Would geocode address
              },
              contactName: request.customerName,
              contactPhone: request.customerPhone
            }
          ],
          deliveryType: 'NOW', // or 'SCHEDULED'
          item: {
            quantity: request.items.reduce((sum, item) => sum + item.quantity, 0),
            weight: request.totalWeight,
            description: request.items.map(i => i.name).join(', ')
          }
        })
      });

      const data = await response.json();

      if (data.status === 'ASSIGNING_DRIVER' || data.status === 'ACCEPTED') {
        return {
          success: true,
          trackingNumber: data.orderId,
          shipmentId: data.orderId,
          courierProvider: 'LALAMOVE',
          estimatedDeliveryDate: data.estimatedDeliveryTime,
          cost: data.priceBreakdown.total
        };
      } else {
        return {
          success: false,
          courierProvider: 'LALAMOVE',
          errorMessage: data.message
        };
      }
    } catch (error: any) {
      return {
        success: false,
        courierProvider: 'LALAMOVE',
        errorMessage: error.message
      };
    }
    */
  }

  /**
   * Track Lalamove delivery
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    // MOCK IMPLEMENTATION
    console.log('📍 Tracking Lalamove delivery:', trackingNumber);

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingNumber,
      courierProvider: 'LALAMOVE',
      status: 'out_for_delivery',
      statusDescription: 'Driver is on the way to deliver your package',
      estimatedDeliveryDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      currentLocation: 'En route to destination',
      history: [
        {
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'picked_up',
          description: 'Driver picked up the package',
          location: 'Cheras Warehouse'
        },
        {
          timestamp: new Date().toISOString(),
          status: 'out_for_delivery',
          description: 'Driver is on the way to deliver your package',
          location: 'En route'
        }
      ]
    };
  }

  /**
   * Cancel delivery
   */
  async cancelShipment(trackingNumber: string): Promise<{ success: boolean; message: string }> {
    // MOCK IMPLEMENTATION
    console.log('❌ Cancelling Lalamove delivery:', trackingNumber);

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      message: 'Delivery cancelled successfully'
    };
  }

  /**
   * Get quotation for delivery
   */
  async getQuotation(request: ShipmentRequest): Promise<CourierRate> {
    // MOCK IMPLEMENTATION
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      courierProvider: 'LALAMOVE',
      serviceType: 'MOTORCYCLE',
      cost: 15.00,
      currency: 'MYR',
      estimatedDays: 0, // Same day
      available: true
    };
  }
}

/**
 * Courier Service Factory
 * Use this to get the appropriate courier service instance
 */
export function getCourierService(provider: CourierProvider) {
  const config = COURIER_SERVICES.find(s => s.id === provider);

  if (!config) {
    throw new Error(`Courier service ${provider} not found`);
  }

  switch (provider) {
    case 'JNT':
      return new JNTExpressService(config.apiKey || '', config.apiEndpoint || '');
    case 'LALAMOVE':
      return new LalamoveService(config.apiKey || '', config.apiEndpoint || '');
    case 'OWN_DELIVERY':
      return null; // Own delivery doesn't need external API
    default:
      throw new Error(`Unsupported courier service: ${provider}`);
  }
}

/**
 * Get courier rates for comparison
 */
export async function getCourierRates(request: ShipmentRequest): Promise<CourierRate[]> {
  const rates: CourierRate[] = [];

  // Get J&T rate (mock)
  rates.push({
    courierProvider: 'JNT',
    serviceType: 'Standard',
    cost: 8.50,
    currency: 'MYR',
    estimatedDays: 3,
    available: true
  });

  // Get Lalamove rate (mock)
  const lalamove = new LalamoveService('demo_key', 'demo_endpoint');
  const lalamoveRate = await lalamove.getQuotation(request);
  rates.push(lalamoveRate);

  // Own delivery (free or fixed cost)
  rates.push({
    courierProvider: 'OWN_DELIVERY',
    serviceType: 'Standard',
    cost: 5.00,
    currency: 'MYR',
    estimatedDays: 2,
    available: true
  });

  return rates;
}
