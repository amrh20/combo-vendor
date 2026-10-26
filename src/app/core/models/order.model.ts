export type VendorOrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface VendorOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: VendorOrderStatus;
  total: number;
  itemCount: number;
  items: OrderLineItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListQuery {
  status?: VendorOrderStatus;
  from?: string;
  to?: string;
  limit?: number;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: VendorOrderStatus;
}
