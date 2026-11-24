export type PaymentMethod = "mpesa" | "card";

export type CheckoutRequest = {
  bookingId: string;
  paymentId: string;
  bookingReference: string;
  amount: number;
  currency: string;
  phone?: string;
  email?: string;
};

export type CheckoutSession = {
  providerReference: string;
  checkoutUrl?: string;
  instructions?: string;
};

export interface PaymentGatewayAdapter {
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  refund(providerReference: string, amount: number, currency: string): Promise<string>;
}

const adapters: Partial<Record<PaymentMethod, PaymentGatewayAdapter>> = {};

export function registerPaymentGateway(method: PaymentMethod, adapter: PaymentGatewayAdapter) {
  adapters[method] = adapter;
}

export function getPaymentGateway(method: PaymentMethod): PaymentGatewayAdapter {
  const adapter = adapters[method];
  if (!adapter) {
    throw new Error(`${method === "mpesa" ? "M-Pesa" : "Card"} payment gateway is not configured.`);
  }
  return adapter;
}
