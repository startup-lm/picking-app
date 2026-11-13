import type { OrderStatus, ImportProductsResult, ReportDay } from '@/types/rpc';

export type OrderSummary = {
  id: number;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  customer: string;
};

export type ProcessOrderResponse = {
  order_id: number;
  order_number: string;
  customer: string;
  totals: {
    total_package: number;
    total_unit: number;
  };
};

export type CancelResponse = {
  cancelled_ids: number[];
  errors: {
    id: number;
    code: string;
    message: string;
  }[];
};

export type { ImportProductsResult, ReportDay, OrderStatus };
