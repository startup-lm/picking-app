'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CustomerItem = {
  id: number;
  name: string;
  code?: string | null;
};

type ProductItem = {
  id: number;
  sku: string;
  description: string;
  location?: string | null;
};

type OrderFormLine = {
  product_id: number;
  sku: string;
  description: string;
  location?: string | null;
  package_total: number;
  unit_total: number;
};

type OrderFormProps = {
  initialOrder?: {
    id: number;
    order_number: string;
    customer_id?: number | null;
    customer?: { id: number; name: string } | null;
    due_date?: string | null;
    priority?: 'normal' | 'urgent';
    notes?: string | null;
    lines: Array<{
      product_id: number;
      location?: string | null;
      package_total: number;
      unit_total: number;
      product?: { id: number; sku: string; description: string; location?: string | null } | null;
    }>;
  };
};

const DETAIL_MESSAGES: Record<string, string> = {
  no_lines: 'Agregá al menos un artículo',
  duplicate_product: 'Artículo repetido',
  invalid_quantity: 'Cantidad inválida',
  inactive_product: 'Hay artículos inactivos',
  missing_customer: 'Falta el cliente',
  order_number_taken: 'Ese número de pedido ya existe',
};

export default function OrderForm({ initialOrder }: OrderFormProps) {
  const router = useRouter();

  // Basic header fields
  const [orderNumber, setOrderNumber] = useState(initialOrder?.order_number ?? '');
  const [dueDate, setDueDate] = useState(initialOrder?.due_date ?? '');
  const [priority, setPriority] = useState<'normal' | 'urgent'>(initialOrder?.priority ?? 'normal');
  const [notes, setNotes] = useState(initialOrder?.notes ?? '');

  // Customer Autocomplete
  const [customerQuery, setCustomerQuery] = useState(
    initialOrder?.customer?.name ?? ''
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    initialOrder?.customer?.id ?? initialOrder?.customer_id ?? null
  );
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerItem[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Lines
  const [lines, setLines] = useState<OrderFormLine[]>(() => {
    if (initialOrder?.lines) {
      return initialOrder.lines.map((l) => ({
        product_id: l.product_id,
        sku: l.product?.sku ?? '',
        description: l.product?.description ?? '',
        location: l.location ?? l.product?.location ?? '',
        package_total: l.package_total ?? 0,
        unit_total: l.unit_total ?? 0,
      }));
    }
    return [];
  });

  // Product Search & Barcode Scan
  const [productQuery, setProductQuery] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<ProductItem[]>([]);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const productInputRef = useRef<HTMLInputElement>(null);

  // Submitting and errors
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounced customer search
  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerSuggestions([]);
      setCustomerDropdownOpen(false);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(customerQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setCustomerSuggestions(json.customers ?? []);
          setCustomerDropdownOpen(true);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [customerQuery]);

  // Debounced product suggestions
  useEffect(() => {
    if (!productQuery.trim()) {
      setProductSuggestions([]);
      setProductDropdownOpen(false);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(productQuery.trim())}&status=active`
        );
        if (res.ok) {
          const json = await res.json();
          setProductSuggestions(json.products ?? []);
          setProductDropdownOpen(true);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [productQuery]);

  const handleSelectCustomer = (cust: CustomerItem) => {
    setSelectedCustomerId(cust.id);
    setCustomerQuery(cust.name);
    setCustomerDropdownOpen(false);
  };

  const handleCustomerChange = (val: string) => {
    setCustomerQuery(val);
    setSelectedCustomerId(null);
  };

  const addOrIncrementProduct = (
    product: { id: number; sku: string; description: string; location?: string | null },
    kind: 'unit' | 'package' | 'sku'
  ) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.product_id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        if (kind === 'package') {
          updated[idx].package_total += 1;
        } else {
          updated[idx].unit_total += 1;
        }
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          sku: product.sku,
          description: product.description,
          location: product.location ?? '',
          package_total: kind === 'package' ? 1 : 0,
          unit_total: kind === 'package' ? 0 : 1,
        },
      ];
    });
    setProductQuery('');
    setProductDropdownOpen(false);
    setScanNotice(null);
    if (productInputRef.current) {
      productInputRef.current.focus();
    }
  };

  const handleProductKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = productQuery.trim();
      if (!code) return;

      try {
        const res = await fetch(`/api/products/lookup?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          addOrIncrementProduct(data.product, data.kind);
        } else {
          setScanNotice(`Código o SKU "${code}" no encontrado o inactivo`);
          if (productInputRef.current) productInputRef.current.focus();
        }
      } catch {
        setScanNotice('Error al buscar código');
      }
    }
  };

  const handleUpdateLineQuantity = (
    index: number,
    field: 'package_total' | 'unit_total',
    val: number
  ) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index][field] = Math.max(0, val);
      return updated;
    });
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (release: boolean) => {
    setErrorMessage(null);

    if (!customerQuery.trim()) {
      setErrorMessage('Falta indicar el cliente');
      return;
    }

    if (lines.length === 0) {
      setErrorMessage('Agregá al menos un artículo');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        release,
        priority,
        due_date: dueDate.trim() || null,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          package_total: l.package_total,
          unit_total: l.unit_total,
        })),
      };

      if (initialOrder?.id) {
        payload.id = initialOrder.id;
      }
      if (orderNumber.trim()) {
        payload.order_number = orderNumber.trim();
      }

      if (selectedCustomerId) {
        payload.customer_id = selectedCustomerId;
      } else {
        payload.customer_name = customerQuery.trim();
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.code === 'invalid_order' && json.detail && DETAIL_MESSAGES[json.detail]) {
          throw new Error(DETAIL_MESSAGES[json.detail]);
        }
        if (json.code === 'order_locked') {
          throw new Error('El pedido ya no se puede editar');
        }
        throw new Error(json.message ?? 'Error al guardar el pedido');
      }

      router.push(`/pedidos/${json.order_id}`);
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Error al procesar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            {initialOrder ? `Editar pedido ${initialOrder.order_number}` : 'Nuevo pedido'}
          </h1>
          <p className="text-sm text-muted">
            {initialOrder
              ? 'Modificá cliente, líneas o cantidades del pedido'
              : 'Cargá los datos del pedido y agregá líneas escaneando o buscando'}
          </p>
        </div>
        <Link
          href={initialOrder ? `/pedidos/${initialOrder.id}` : '/pedidos'}
          className="text-sm text-muted underline hover:text-text"
        >
          Cancelar y volver
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-danger bg-danger/10 p-4 text-sm font-semibold text-danger">
          {errorMessage}
        </div>
      )}

      {/* Cabecera del Pedido */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-text border-b border-border pb-2">
          Datos generales
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Cliente Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-semibold text-muted uppercase mb-1">
              Cliente <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => handleCustomerChange(e.target.value)}
              onFocus={() => {
                if (customerSuggestions.length > 0) setCustomerDropdownOpen(true);
              }}
              placeholder="Buscar cliente existente o ingresar nuevo…"
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
            {customerDropdownOpen && customerSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                {customerSuggestions.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => handleSelectCustomer(cust)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-bg transition text-text flex items-center justify-between"
                  >
                    <span className="font-semibold">{cust.name}</span>
                    {cust.code && <span className="text-xs text-muted">({cust.code})</span>}
                  </button>
                ))}
              </div>
            )}
            {selectedCustomerId && (
              <span className="text-xs text-success font-medium mt-0.5 block">
                ✓ Cliente existente seleccionado
              </span>
            )}
          </div>

          {/* Número de pedido */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1">
              Número de pedido (opcional)
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Automático si se deja vacío"
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          {/* Fecha de entrega */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1">
              Fecha de entrega
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1">
              Prioridad
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          {/* Notas */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted uppercase mb-1">
              Notas / Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales de preparación o despacho…"
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Líneas y Buscador/Lector USB */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-text border-b border-border pb-2">
          Artículos del pedido
        </h2>

        {/* Input Buscador / Lector */}
        <div className="relative">
          <label className="block text-xs font-semibold text-muted uppercase mb-1">
            Buscar o escanear producto (Enter para agregar con lector USB)
          </label>
          <input
            ref={productInputRef}
            type="text"
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setScanNotice(null);
            }}
            onKeyDown={handleProductKeyDown}
            placeholder="Escanear código de barras o escribir SKU/descripción y presionar Enter…"
            className="w-full rounded-lg border-2 border-primary bg-bgInput px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          />

          {scanNotice && (
            <p className="mt-1 text-xs text-danger font-semibold">{scanNotice}</p>
          )}

          {/* Sugerencias dropdown */}
          {productDropdownOpen && productSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {productSuggestions.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => addOrIncrementProduct(prod, 'unit')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-bg transition text-text flex items-center justify-between border-b border-border/50 last:border-b-0"
                >
                  <div>
                    <span className="font-bold text-primary">{prod.sku}</span>
                    <span className="ml-2 text-text">{prod.description}</span>
                  </div>
                  {prod.location && (
                    <span className="text-xs text-muted">Loc: {prod.location}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabla de Líneas */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg text-xs font-semibold text-muted uppercase">
              <tr>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Descripción</th>
                <th className="px-3 py-2.5">Ubicación</th>
                <th className="px-3 py-2.5 w-24 text-center">Bultos</th>
                <th className="px-3 py-2.5 w-24 text-center">Unidades</th>
                <th className="px-3 py-2.5 w-16 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    No hay artículos en el pedido. Buscá o escaneá un producto arriba.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => (
                  <tr key={line.product_id} className="hover:bg-bg/30">
                    <td className="px-3 py-2 font-bold text-primary">{line.sku}</td>
                    <td className="px-3 py-2 text-text">{line.description}</td>
                    <td className="px-3 py-2 text-muted text-xs">{line.location || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={line.package_total}
                        onChange={(e) =>
                          handleUpdateLineQuantity(
                            idx,
                            'package_total',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="w-16 rounded border border-border bg-bgInput px-2 py-1 text-center text-sm text-text outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={line.unit_total}
                        onChange={(e) =>
                          handleUpdateLineQuantity(
                            idx,
                            'unit_total',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="w-16 rounded border border-border bg-bgInput px-2 py-1 text-center text-sm text-text outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-xs text-danger hover:underline font-semibold"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="rounded-lg border border-border bg-card px-6 py-2.5 font-semibold text-text hover:opacity-90 disabled:opacity-60 shadow-sm"
        >
          {submitting ? 'Guardando…' : 'Guardar borrador'}
        </button>

        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="rounded-lg border border-accent bg-accent px-6 py-2.5 font-bold text-text hover:opacity-90 disabled:opacity-60 shadow-sm"
        >
          {submitting ? 'Liberando…' : 'Liberar a depósito'}
        </button>
      </div>
    </div>
  );
}
