import { describe, it, expect } from 'vitest';
import {
  normalizeHeader,
  mapHeaders,
  PRODUCT_ALIASES,
  ORDER_ALIASES,
} from '@/lib/import/headers';

describe('normalizeHeader', () => {
  it('normalizes accents, spaces, symbols and case', () => {
    expect(normalizeHeader(' Código  Unidad ')).toBe('codigo_unidad');
    expect(normalizeHeader('Nº Pedido')).toBe('n_pedido');
    expect(normalizeHeader('Unid. x Bulto')).toBe('unid_x_bulto');
    expect(normalizeHeader('  SKU ')).toBe('sku');
  });

  it('handles null, undefined and edge characters', () => {
    expect(normalizeHeader(null)).toBe('');
    expect(normalizeHeader(undefined)).toBe('');
    expect(normalizeHeader('---__abc__---')).toBe('abc');
  });
});

describe('mapHeaders', () => {
  it('maps headers with aliases, ignored column and duplicated column', () => {
    const headers = [
      'Código',
      'Descripción',
      'Articulo', // duplicate of 'sku'
      'Columna Desconocida',
      'Ubicación',
    ];

    const result = mapHeaders(headers, PRODUCT_ALIASES);

    expect(result.index.sku).toBe(0);
    expect(result.index.description).toBe(1);
    expect(result.index.location).toBe(4);
    expect(result.duplicated).toEqual(['sku']);
    expect(result.ignored).toEqual(['Columna Desconocida']);
  });

  it('maps order aliases correctly', () => {
    const headers = ['Nº Pedido', 'Cliente', 'Artículo', 'Cantidad', 'Vendedor'];
    const result = mapHeaders(headers, ORDER_ALIASES);

    expect(result.index.order_number).toBe(0);
    expect(result.index.customer).toBe(1);
    expect(result.index.sku).toBe(2);
    expect(result.index.quantity).toBe(3);
    expect(result.duplicated).toEqual([]);
    expect(result.ignored).toEqual(['Vendedor']);
  });
});
