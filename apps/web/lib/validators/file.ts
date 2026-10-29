// lib/validators/file.ts
export function validateCsvFile(file: File) {
  const okExt = /\.csv$/i.test(file.name);
  const okMime = file.type ? /csv/i.test(file.type) : true; // algunos navegadores no setean el mime
  if (!okExt || !okMime) {
    return { ok: false, message: 'Solo se permiten archivos .csv' };
  }
  return { ok: true as const };
}