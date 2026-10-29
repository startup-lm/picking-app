export type ProcessOrderResponse = {
  client: string;
  order_id: number;
  dispatch_id: number;
  totals: { total_package: number; total_unit: number };
  file_url: string;
};

export type ProcessProductsResponse = {
  processed: number;
  duplicates: number;
  total_rows: number;
};

export type OrderLine = {
  sku: string;
  description: string;
  package_total: number;
  unit_total: number;
  package_scanned: number;
  unit_scanned: number;
};

export type OrderWithLines = {
  id: number;
  client: string;
  created_at: string;
  updated_at: string;
  total_package: number;
  total_unit: number;
  order_status?: 'pending' | 'assembled' | null;
  dispatch_status?: 'pending' | 'delivered' | null;
  lines: OrderLine[];
};

export type DayGroup = {
  day: string; // YYYY-MM-DD
  orders: OrderWithLines[];
};

export type PendingOrder = {
  id: number;
  client: string | null;
  created_at: string; // ISO
};
