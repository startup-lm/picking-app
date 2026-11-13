import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { readSheet, ImportFileError } from '@/lib/import/read';
import { toProductRows } from '@/lib/import/map';
import type { ImportProductsResult } from '@/types/rpc';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get('dry_run') !== '0';

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(400, 'invalid_argument', 'Datos de formulario inválidos');
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return jsonError(400, 'invalid_argument', 'Archivo requerido');
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError(413, 'file_too_large', 'El archivo supera el límite de 5 MB');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  let sheet;
  try {
    sheet = readSheet(buf, file.name);
  } catch (e) {
    if (e instanceof ImportFileError) {
      const status = e.code === 'file_too_large' ? 413 : 400;
      return jsonError(status, e.code, e.message);
    }
    return jsonError(500, 'internal', 'Error al leer el archivo');
  }

  const { rows, ignoredColumns, missing } = toProductRows(sheet);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        code: 'missing_columns',
        message: `Faltan columnas requeridas: ${missing.join(', ')}`,
        missing,
      },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase.rpc('api_import_products', {
    p_rows: rows,
    p_dry_run: dryRun,
  });

  if (error) {
    return rpcErrorResponse(error);
  }

  return NextResponse.json({
    result: data as ImportProductsResult,
    ignoredColumns,
    totalRows: rows.length,
  });
}
