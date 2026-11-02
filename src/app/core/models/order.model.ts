/** Shop's part of an order. `id` is the sub-order id. */
export type SubOrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'AT_HUB'
  | 'VERIFIED'
  | 'HANDED_TO_DRIVER'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

/** Statuses shown on the live kitchen board. */
export const LIVE_ORDER_STATUSES: readonly SubOrderStatus[] = [
  'PENDING',
  'PREPARING',
  'READY_FOR_PICKUP',
];

export interface StoreOrderItemOption {
  variant: string;
  option: string;
  priceDeltaPiastres: number;
}

export interface StoreOrderItem {
  id: string;
  productId: string | null;
  name: string;
  options: StoreOrderItemOption[];
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** Taken out of the order. Not included in the totals. */
  isRemoved: boolean;
}

/**
 * `GET /v1/store/orders`, `GET /v1/store/orders/{id}`, and the reply of accept, reject, and ready.
 * Money is integer piastres.
 */
export interface StoreOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  status: SubOrderStatus;
  placedAt: string;
  statusChangedAt: string;
  /** Deadline while `PENDING`. The part is rejected for the shop after this. */
  respondBy: string | null;
  shopNotes: string | null;
  rejectionReason: string | null;
  items: StoreOrderItem[];
  itemsCount: number;
  subtotal: number;
  discountBp: number;
  discount: number;
  /** What the customer pays for this part. */
  total: number;
  commissionBp: number;
  commission: number;
  /** What Combo owes the shop for this part. */
  payable: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface StoreOrderEvent {
  event: 'order.created' | 'order.updated';
  id: string;
  occurredAt: string;
  data: {
    orderId: string;
    subOrderId: string;
    orderNumber?: string;
    type: string;
    status: SubOrderStatus;
  };
}

export const SUB_ORDER_STATUS_LABELS: Record<SubOrderStatus, string> = {
  PENDING: 'قيد الانتظار',
  PREPARING: 'قيد التحضير',
  READY_FOR_PICKUP: 'جاهز للاستلام',
  PICKED_UP: 'اتسلم للكابتن',
  AT_HUB: 'اتسلم للكابتن',
  VERIFIED: 'اتسلم للكابتن',
  HANDED_TO_DRIVER: 'اتسلم للكابتن',
  DELIVERED: 'مكتمل',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغي',
};
