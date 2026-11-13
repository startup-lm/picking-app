'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { authFetch, readError } from '@/lib/api/http';
import type { Tables } from '@/types/supabase';

export type Product = Tables<'products'>;

type ProductFormProps = {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess: (product: Product) => void;
};

export default function ProductForm({
  open,
  onClose,
  product,
  onSuccess,
}: ProductFormProps) {
  const isEditing = Boolean(product);

  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [unitBarcode, setUnitBarcode] = useState('');
  const [packageBarcode, setPackageBarcode] = useState('');
  const [unitsPerPackage, setUnitsPerPackage] = useState(1);
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setDescription(product.description || '');
      setUnitBarcode(product.unit_barcode || '');
      setPackageBarcode(product.package_barcode || '');
      setUnitsPerPackage(product.units_per_package || 1);
      setLocation(product.location || '');
      setIsActive(product.is_active ?? true);
    } else {
      setSku('');
      setDescription('');
      setUnitBarcode('');
      setPackageBarcode('');
      setUnitsPerPackage(1);
      setLocation('');
      setIsActive(true);
    }
    setError(null);
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedSku = sku.trim();
    const trimmedDesc = description.trim();
    const trimmedUnitBc = unitBarcode.trim();
    const trimmedPkgBc = packageBarcode.trim();
    const trimmedLoc = location.trim();

    // Client-side validations
    if (!trimmedSku) {
      setError('El SKU es obligatorio');
      return;
    }
    if (!trimmedDesc) {
      setError('La descripción es obligatoria');
      return;
    }
    if (!trimmedUnitBc && !trimmedPkgBc) {
      setError('Debe ingresar al menos un código de barras (unidad o bulto)');
      return;
    }
    if (trimmedUnitBc && trimmedPkgBc && trimmedUnitBc === trimmedPkgBc) {
      setError('El código de unidad y de bulto no pueden ser iguales');
      return;
    }
    if (!Number.isInteger(unitsPerPackage) || unitsPerPackage < 1) {
      setError('Unidades por bulto debe ser un entero mayor o igual a 1');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        sku: trimmedSku,
        description: trimmedDesc,
        unit_barcode: trimmedUnitBc || null,
        package_barcode: trimmedPkgBc || null,
        units_per_package: unitsPerPackage,
        location: trimmedLoc || null,
      };

      if (isEditing) {
        payload.is_active = isActive;
      }

      const url = isEditing ? `/api/products/${product!.id}` : '/api/products';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errMessage = await readError(res);
        setError(errMessage);
        return;
      }

      const data = await res.json();
      onSuccess(data.product);
      onClose();
    } catch {
      setError('Error de conexión al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
      widthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="text-left space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-danger/30 text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              SKU / Código <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="ej. PF-100"
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Ubicación
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej. A-01-2"
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Descripción <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción detallada del producto"
            className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Código de barras unidad
            </label>
            <input
              type="text"
              value={unitBarcode}
              onChange={(e) => setUnitBarcode(e.target.value)}
              placeholder="EAN-13, Code128..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Código de barras bulto
            </label>
            <input
              type="text"
              value={packageBarcode}
              onChange={(e) => setPackageBarcode(e.target.value)}
              placeholder="DUN-14 / ITF-14..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Unidades por bulto <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={unitsPerPackage}
              onChange={(e) => setUnitsPerPackage(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              required
            />
          </div>

          {isEditing && (
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-text">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                />
                <span>Producto activo</span>
              </label>
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end gap-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg transition text-text"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50"
          >
            {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
