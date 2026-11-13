import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export type Sheet = {
  headers: unknown[];
  rows: unknown[][];
  firstDataRow: number;
};

export class ImportFileError extends Error {
  constructor(
    public code: 'unsupported_format' | 'empty_file' | 'too_many_rows' | 'file_too_large',
    message: string
  ) {
    super(message);
    this.name = 'ImportFileError';
  }
}

function isRowEmpty(r: unknown[]): boolean {
  if (!r || !Array.isArray(r) || r.length === 0) return true;
  return r.every((c) => c === null || c === undefined || String(c).trim() === '');
}

export function readSheet(
  buf: Buffer,
  fileName: string,
  opts?: { maxRows?: number }
): Sheet {
  const maxRows = opts?.maxRows ?? 5000;
  const ext = (fileName.slice(fileName.lastIndexOf('.')).toLowerCase() || '');

  if (ext === '.csv' || ext === '.txt') {
    let text = buf.toString('utf-8');
    if (text.includes('\uFFFD')) {
      text = buf.toString('latin1');
    }
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const lines = text.split(/\r?\n/);
    const firstNonEmptyLine = lines.find((l) => l.trim().length > 0) ?? lines[0] ?? '';
    const commas = (firstNonEmptyLine.match(/,/g) || []).length;
    const semis = (firstNonEmptyLine.match(/;/g) || []).length;
    const tabs = (firstNonEmptyLine.match(/\t/g) || []).length;

    let delimiter = ',';
    if (tabs > commas && tabs > semis) {
      delimiter = '\t';
    } else if (semis > commas && semis >= tabs) {
      delimiter = ';';
    }

    let parsedRecords: Array<{ record: string[]; info: { lines: number } }>;
    try {
      parsedRecords = parse(text, {
        delimiter,
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
        info: true,
      }) as unknown as Array<{ record: string[]; info: { lines: number } }>;
    } catch {
      throw new ImportFileError('empty_file', 'El archivo no contiene filas');
    }

    let headerIndex = -1;
    for (let i = 0; i < parsedRecords.length; i++) {
      if (!isRowEmpty(parsedRecords[i].record)) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new ImportFileError('empty_file', 'El archivo no contiene filas');
    }

    const headers = parsedRecords[headerIndex].record;
    const dataRows: unknown[][] = [];
    let firstDataRow = -1;

    for (let i = headerIndex + 1; i < parsedRecords.length; i++) {
      const rec = parsedRecords[i];
      if (!isRowEmpty(rec.record)) {
        if (firstDataRow === -1) {
          firstDataRow = rec.info.lines;
        }
        const rowArray = [...rec.record];
        Object.defineProperty(rowArray, 'row', {
          value: rec.info.lines,
          writable: true,
          configurable: true,
          enumerable: false,
        });
        dataRows.push(rowArray);
      }
    }

    if (dataRows.length === 0) {
      throw new ImportFileError('empty_file', 'El archivo no contiene filas de datos');
    }

    if (dataRows.length > maxRows) {
      throw new ImportFileError('too_many_rows', `El archivo supera el límite de ${maxRows} filas`);
    }

    return {
      headers,
      rows: dataRows,
      firstDataRow,
    };
  }

  if (ext === '.xlsx' || ext === '.xls') {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    } catch {
      throw new ImportFileError('unsupported_format', 'Formato de archivo no soportado. Usá .csv o .xlsx');
    }

    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      throw new ImportFileError('empty_file', 'El archivo no contiene hojas');
    }

    const ws = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: '',
    }) as unknown[][];

    let headerIndex = -1;
    for (let i = 0; i < rawRows.length; i++) {
      if (!isRowEmpty(rawRows[i])) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new ImportFileError('empty_file', 'El archivo no contiene filas');
    }

    const headers = rawRows[headerIndex];
    const dataRows: unknown[][] = [];
    let firstDataRow = -1;

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!isRowEmpty(r)) {
        const fileRow = i + 1;
        if (firstDataRow === -1) {
          firstDataRow = fileRow;
        }
        const rowArray = [...r];
        Object.defineProperty(rowArray, 'row', {
          value: fileRow,
          writable: true,
          configurable: true,
          enumerable: false,
        });
        dataRows.push(rowArray);
      }
    }

    if (dataRows.length === 0) {
      throw new ImportFileError('empty_file', 'El archivo no contiene filas de datos');
    }

    if (dataRows.length > maxRows) {
      throw new ImportFileError('too_many_rows', `El archivo supera el límite de ${maxRows} filas`);
    }

    return {
      headers,
      rows: dataRows,
      firstDataRow,
    };
  }

  throw new ImportFileError('unsupported_format', 'Formato de archivo no soportado. Usá .csv o .xlsx');
}
