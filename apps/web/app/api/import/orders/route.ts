import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { readSheet, ImportFileError } from '@/lib/import/read';
import { toOrderRows } from '@/lib/import/map';
import type { ImportOrdersResult } from '@/types/rpc';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get('dry_run') !== '0';
  const release = searchParams.get('release') === '1';

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

  const { rows, ignoredColumns, missing } = toOrderRows(sheet);
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

  if (dryRun) {
    const { data, error } = await auth.supabase.rpc('api_import_orders', {
      p_rows: rows,
      p_release: release,
      p_dry_run: true,
      p_import_id: null,
    });

    if (error) {
      return rpcErrorResponse(error);
    }

    return NextResponse.json({
      result: data as ImportOrdersResult,
      ignoredColumns,
      totalRows: rows.length,
      importId: null,
    });
  }

  // dry_run = 0: D-T6-4
  const { data: importRecord, error: insertError } = await auth.supabase
    .from('imports')
    .insert({
      kind: 'orders',
      file_name: file.name,
      summary: {},
    })
    .select('id')
    .single();

  if (insertError || !importRecord) {
    return jsonError(500, 'internal', 'Error al registrar la importación');
  }

  const importId = importRecord.id;
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `orders/${importId}/${sanitizedFileName}`;

  const { error: uploadError } = await auth.supabase.storage
    .from('imports')
    .upload(storagePath, buf, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    await auth.supabase
      .from('imports')
      .update({ summary: { error: 'upload_failed' } })
      .eq('id', importId);

    return jsonError(500, 'upload_failed', 'Error al guardar el archivo de importación');
  }

  await auth.supabase
    .from('imports')
    .update({ file_path: storagePath })
    .eq('id', importId);

  const { data, error } = await auth.supabase.rpc('api_import_orders', {
    p_rows: rows,
    p_release: release,
    p_dry_run: false,
    p_import_id: importId,
  });

  if (error) {
    return rpcErrorResponse(error);
  }

  return NextResponse.json({
    result: data as ImportOrdersResult,
    ignoredColumns,
    totalRows: rows.length,
    importId,
  });
}
