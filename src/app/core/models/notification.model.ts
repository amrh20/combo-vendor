export interface VendorNotification {
  id: string;
  orderId?: string;
  orderNumber?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  body: string;
  variant: 'success' | 'info' | 'warning' | 'danger';
  createdAt: number;
}
