import { ProcessProductsResponse } from '@/types/api';

export async function processProductsCsv(params: { file: File }) {
  const { file } = params;

  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch('/api/products/process-csv', {
    method: 'POST',
    body: fd,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Error procesando CSV');

  return JSON.parse(text) as ProcessProductsResponse;
}
