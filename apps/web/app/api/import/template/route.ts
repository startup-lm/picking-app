import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError } from '@/lib/api/responses';
import { buildTemplate } from '@/lib/import/templates';

export async function GET(req: NextRequest): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const format = searchParams.get('format');

  if (
    (kind !== 'products' && kind !== 'orders') ||
    (format !== 'csv' && format !== 'xlsx')
  ) {
    return jsonError(
      400,
      'invalid_argument',
      'Parámetros inválidos. kind debe ser products|orders y format debe ser csv|xlsx'
    );
  }

  const { body, contentType, fileName } = buildTemplate(kind, format);

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': body.length.toString(),
    },
  });
}
