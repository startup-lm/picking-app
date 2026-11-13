'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { authFetch, readError } from '@/lib/api/http';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/ui/Modal';
import ProductForm, { Product } from '@/components/products/ProductForm';

export default function ProductosPage() {
  const { show, ToastViewport } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [confirmToggleProduct, setConfirmToggleProduct] = useState<Product | null>(null);
  const [toggling, setToggling] = useState(false);

  // Debounce search input (300 ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchProducts = useCallback(
    async (currentPage: number, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          status,
        });
        if (debouncedSearch) {
          params.set('q', debouncedSearch);
        }

        const res = await authFetch(`/api/products?${params.toString()}`);
        if (!res.ok) {
          const err = await readError(res);
          show({ title: 'Error al cargar productos', description: err, variant: 'error' });
          return;
        }

        const data = await res.json();
        const newProducts: Product[] = data.products || [];

        if (append) {
          setProducts((prev) => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }
        setHasMore(Boolean(data.hasMore));
      } catch {
        show({ title: 'Error de conexión', description: 'No se pudo conectar con el servidor', variant: 'error' });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, debouncedSearch, show]
  );

  // Reset page and reload on status/search change
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchProducts(0, false);
      return;
    }
    setPage(0);
    fetchProducts(0, false);
  }, [fetchProducts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, true);
  };

  const handleCreateNew = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormOpen(true);
  };

  const handleFormSuccess = (saved: Product) => {
    if (editingProduct) {
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      show({ title: 'Producto actualizado con éxito', variant: 'success' });
    } else {
      setProducts((prev) => [saved, ...prev]);
      show({ title: 'Producto creado con éxito', variant: 'success' });
    }
  };

  const handleConfirmToggleActive = async () => {
    if (!confirmToggleProduct) return;
    const newActive = !confirmToggleProduct.is_active;
    setToggling(true);

    try {
      const res = await authFetch(`/api/products/${confirmToggleProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      });

      if (!res.ok) {
        const err = await readError(res);
        show({ title: 'Error al cambiar estado', description: err, variant: 'error' });
        return;
      }

      const data = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === data.product.id ? data.product : p)));

      show({
        title: newActive ? 'Producto activado' : 'Producto desactivado',
        variant: 'success',
      });
      setConfirmToggleProduct(null);
    } catch {
      show({ title: 'Error de conexión', description: 'No se pudo actualizar el estado', variant: 'error' });
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ToastViewport />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Catálogo de Productos</h1>
          <p className="text-sm text-muted">Gestión de artículos, códigos de barras y ubicaciones</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/productos/importar"
            className="px-4 py-2 border border-border bg-card text-text rounded-lg hover:bg-bg transition text-sm font-medium flex items-center gap-2"
          >
            <span>📥</span> Importar
          </Link>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition text-sm font-medium flex items-center gap-2"
          >
            <span>+</span> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por SKU, descripción o código de barras..."
            className="w-full px-4 py-2 pl-9 border border-border rounded-lg bg-bgInput text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <span className="absolute left-3 top-2.5 text-muted text-sm">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-muted hover:text-text text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-bg text-sm">
          <button
            onClick={() => setStatus('active')}
            className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
              status === 'active' ? 'bg-card shadow-sm text-primary font-semibold' : 'text-muted hover:text-text'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setStatus('inactive')}
            className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
              status === 'inactive' ? 'bg-card shadow-sm text-primary font-semibold' : 'text-muted hover:text-text'
            }`}
          >
            Inactivos
          </button>
          <button
            onClick={() => setStatus('all')}
            className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
              status === 'all' ? 'bg-card shadow-sm text-primary font-semibold' : 'text-muted hover:text-text'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-muted uppercase text-xs font-semibold">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4">Cód. Unidad</th>
                <th className="py-3 px-4">Cód. Bulto</th>
                <th className="py-3 px-4 text-center">Unid./Bulto</th>
                <th className="py-3 px-4">Ubicación</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    Cargando productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-bg/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-text">{prod.sku}</td>
                    <td className="py-3 px-4 text-text">{prod.description}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted">{prod.unit_barcode || '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted">{prod.package_barcode || '—'}</td>
                    <td className="py-3 px-4 text-center font-medium text-text">{prod.units_per_package}</td>
                    <td className="py-3 px-4 text-text">{prod.location || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prod.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {prod.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(prod)}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmToggleProduct(prod)}
                        className={`text-xs font-medium hover:underline ${
                          prod.is_active ? 'text-danger' : 'text-emerald-700'
                        }`}
                      >
                        {prod.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="p-4 border-t border-border text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-5 py-2 border border-border rounded-lg text-sm font-medium hover:bg-bg transition disabled:opacity-50"
            >
              {loadingMore ? 'Cargando más...' : 'Cargar más productos'}
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editingProduct}
        onSuccess={handleFormSuccess}
      />

      {/* Confirm Toggle Active Modal */}
      <Modal
        open={Boolean(confirmToggleProduct)}
        onClose={() => setConfirmToggleProduct(null)}
        title={confirmToggleProduct?.is_active ? 'Desactivar producto' : 'Activar producto'}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            ¿Estás seguro de que deseas {confirmToggleProduct?.is_active ? 'desactivar' : 'activar'} el producto{' '}
            <strong className="text-text">{confirmToggleProduct?.sku}</strong> (
            {confirmToggleProduct?.description})?
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmToggleProduct(null)}
              disabled={toggling}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg transition text-text"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmToggleActive}
              disabled={toggling}
              className={`px-4 py-2 rounded-lg text-sm text-white font-medium transition ${
                confirmToggleProduct?.is_active
                  ? 'bg-danger hover:opacity-90'
                  : 'bg-emerald-600 hover:opacity-90'
              }`}
            >
              {toggling
                ? 'Procesando...'
                : confirmToggleProduct?.is_active
                ? 'Sí, desactivar'
                : 'Sí, activar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
