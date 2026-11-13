export type PrintItem = {
  sku: string;
  description: string;
  location?: string | null;
  bultos: number;
  sueltas: number;
};

export type BuildOptions = {
  padRowsTo?: number;
  returnBase64?: boolean;
};

export type PrintOrderHeader = {
  order_number: string;
  customer_name: string;
  total_package: number;
  total_unit: number;
};
