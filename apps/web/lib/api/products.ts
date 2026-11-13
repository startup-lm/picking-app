import { authFetch, readError } from './http';
import type { ImportProductsResult } from '@/types/rpc';

export async function processProductsCsv(params: { file: File }): Promise<ImportProductsResult> {
  const { file } = params;

  const fd = new FormData();
  fd.append('file', file);

  const res = await authFetch('/api/products/process-csv', {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as ImportProductsResult;
}
