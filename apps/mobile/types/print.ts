import { Product } from "./db";

export type PrintItem = {
  product: Product;
  bultos: number;
  sueltas: number;
  location?: string;
};

export type BuildOptions = {
  padRowsTo?: number;
  returnBase64?: boolean;
};