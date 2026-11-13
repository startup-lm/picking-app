import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';

export async function GET(req: NextRequest): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || '').trim();

  if (!code) {
    return jsonError(400, 'invalid_argument', 'Código requerido');
  }

  // 1. Try product_barcodes (unit or package)
  const { data: barcodeRow, error: barcodeError } = await auth.supabase
    .from('product_barcodes')
    .select('kind, product_id')
    .eq('code', code)
    .maybeSingle();

  if (barcodeError) {
    return rpcErrorResponse(barcodeError);
  }

  if (barcodeRow) {
    const { data: product, error: productError } = await auth.supabase
      .from('products')
      .select('*')
      .eq('id', barcodeRow.product_id)
      .eq('is_active', true)
      .maybeSingle();

    if (productError) {
      return rpcErrorResponse(productError);
    }

    if (product) {
      return NextResponse.json({ product, kind: barcodeRow.kind });
    }
  }

  // 2. Try products.sku = code (only active)
  const { data: productBySku, error: skuError } = await auth.supabase
    .from('products')
    .select('*')
    .eq('sku', code)
    .eq('is_active', true)
    .maybeSingle();

  if (skuError) {
    return rpcErrorResponse(skuError);
  }

  if (productBySku) {
    return NextResponse.json({ product: productBySku, kind: 'sku' });
  }

  return jsonError(404, 'not_found', 'Producto no encontrado');
}
