export type CustomerType = 'retail' | 'company' | 'reseller';
export type ShippingMethod = 'foxpost' | 'gls' | 'mpl' | 'pickup';
export type PaymentMethod = 'kh_card' | 'bank_transfer';

export type CheckoutInput = {
  customerType: CustomerType;
  email: string;
  name: string;
  phone: string;
  companyName?: string;
  taxNumber?: string;
  billingAddress: string;
  shippingAddress: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  parcelPointId?: string;
  note?: string;
};

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_transfer'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded';
