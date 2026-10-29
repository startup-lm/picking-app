'use client';

import { OrderLine } from "@/types/api";

export default function OrderLinesTable({ lines }: { lines: OrderLine[] }) {
  if (!lines?.length) return <div className="text-sm text-muted mt-2">Sin líneas.</div>;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="py-2 pr-4">Artículo</th>
            <th className="py-2 pr-4">Descripción</th>
            <th className="py-2 pr-4">Bultos</th>
            <th className="py-2 pr-4">Unidades</th>
            <th className="py-2 pr-4">Bultos escaneados</th>
            <th className="py-2 pr-4">Unidades escaneadas</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((li, idx) => (
            <tr key={li.sku + '-' + idx} className="border-t border-border">
              <td className="py-2 pr-4">{li.sku}</td>
              <td className="py-2 pr-4">{li.description}</td>
              <td className="py-2 pr-4">{li.package_total}</td>
              <td className="py-2 pr-4">{li.unit_total}</td>
              <td className="py-2 pr-4">{li.package_scanned}</td>
              <td className="py-2 pr-4">{li.unit_scanned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
