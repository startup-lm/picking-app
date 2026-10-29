export type Dispatch = {
  id: number;
  client: string;
  total_package: number;
  total_unit: number;
  status: 'pending' | 'delivered';
  created_at: string;
  updated_at: string;
  order_id?: number;
};

export type Order = {
  id: number;
  client: string;
  total_package: number;
  total_unit: number;
  status: 'pending' | 'assembled';
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: number;
  sku: string;
  description: string;
  package_barcode: number;
  unit_barcode: number;
  created_at: string;
};

export type ProductDispatch = {
  id: number;
  dispatch_id: number;
  product_id: number;
  location: string;
  package_total: number;
  unit_total: number;
  package_scanned: number;
  unit_scanned: number;
  created_at: string;
  updated_at: string;
};

export type ProductOrder = {
  id: number;
  order_id: number;
  product_id: number;
  location: string;
  package_total: number;
  unit_total: number;
  package_scanned: number;
  unit_scanned: number;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: number;
  name: string;
  role: 'operator' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};