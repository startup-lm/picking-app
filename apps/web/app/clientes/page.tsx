'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch, readError } from '@/lib/api/http';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/ui/Modal';
import type { Tables } from '@/types/supabase';

type Customer = Tables<'customers'>;

export default function ClientesPage() {
  const { show, ToastViewport } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounce search input (300 ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchCustomers = useCallback(
    async (currentPage: number, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
        });
        if (debouncedSearch) {
          params.set('q', debouncedSearch);
        }

        const res = await authFetch(`/api/customers?${params.toString()}`);
        if (!res.ok) {
          const err = await readError(res);
          show({ title: 'Error al cargar clientes', description: err, variant: 'error' });
          return;
        }

        const data = await res.json();
        const newCustomers: Customer[] = data.customers || [];

        if (append) {
          setCustomers((prev) => [...prev, ...newCustomers]);
        } else {
          setCustomers(newCustomers);
        }
        setHasMore(Boolean(data.hasMore));
      } catch {
        show({ title: 'Error de conexión', description: 'No se pudo conectar con el servidor', variant: 'error' });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, show]
  );

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchCustomers(0, false);
      return;
    }
    setPage(0);
    fetchCustomers(0, false);
  }, [fetchCustomers]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCustomers(nextPage, true);
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setName('');
    setCode('');
    setAddress('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name || '');
    setCode(c.code || '');
    setAddress(c.address || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (trimmedName.length > 120) {
      setFormError('El nombre no puede superar los 120 caracteres');
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        name: trimmedName,
        code: trimmedCode || null,
        address: trimmedAddress || null,
      };

      const isEdit = Boolean(editingCustomer);
      const url = isEdit ? `/api/customers/${editingCustomer!.id}` : '/api/customers';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errMessage = await readError(res);
        setFormError(errMessage);
        return;
      }

      const data = await res.json();
      const saved: Customer = data.customer;

      if (isEdit) {
        setCustomers((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
        show({ title: 'Cliente actualizado con éxito', variant: 'success' });
      } else {
        setCustomers((prev) => [saved, ...prev]);
        show({ title: 'Cliente creado con éxito', variant: 'success' });
      }

      setModalOpen(false);
    } catch {
      setFormError('Error de conexión al guardar el cliente');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ToastViewport />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Clientes</h1>
          <p className="text-sm text-muted">Gestión de destinatarios y clientes de pedidos</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span> Nuevo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o código de cliente..."
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
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-muted uppercase text-xs font-semibold">
                <th className="py-3 px-4">Nombre / Razón Social</th>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Dirección</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted">
                    Cargando clientes...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-bg/40 transition">
                    <td className="py-3 px-4 font-medium text-text">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted">{c.code || '—'}</td>
                    <td className="py-3 px-4 text-text">{c.address || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        Editar
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
              {loadingMore ? 'Cargando más...' : 'Cargar más clientes'}
            </button>
          </div>
        )}
      </div>

      {/* Modal Alta / Edición Cliente */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
        widthClass="max-w-md"
      >
        <form onSubmit={handleSubmitForm} className="text-left space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-danger/30 text-danger rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Nombre / Razón Social <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Distribuidora Central"
              maxLength={120}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Código de cliente (opcional)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ej. CLI-001"
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Dirección de entrega (opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ej. Av. San Martín 1234"
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgInput text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={formLoading}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg transition text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50"
            >
              {formLoading ? 'Guardando...' : editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
