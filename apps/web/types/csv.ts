export type ArmadoItem = {
  sku: string;
  unidades: number;
  bultos: number;
  uniSueltas: number;
  p1?: string; u1?: string; piso1?: string;
  p2?: string; u2?: string; piso2?: string;
  p3?: string; u3?: string; piso3?: string;
};

export type ArmadoParse = {
  client: string;            // ← A1
  items: ArmadoItem[];
  total_package: number;
  total_unit: number;
  duplicates: string[];
  headers_ok: boolean;       // ← true si la fila 2 coincide con los headers esperados
};

export type ProductCsvItem = {
  row: number;
  sku: string;
  description: string;
  packageCode: string;
  unitCode: string;
};

export type ProductCsvParse = {
  items: ProductCsvItem[];
  headers_ok: boolean; // true si la fila 1 coincide con los headers esperados
  duplicates: string[];
  total_rows: number;
};
