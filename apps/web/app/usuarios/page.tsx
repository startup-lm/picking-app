'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch, readError } from '@/lib/api/http';
import { useToast } from '@/hooks/useToast';

type UserProfile = {
  id: string;
  name: string;
  email: string | null;
  role: 'admin' | 'operator';
  is_active: boolean;
  created_at: string;
};

export default function UsuariosPage() {
  const { show, ToastViewport } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario invitar
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'operator'>('operator');
  const [inviting, setInviting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/users');
      if (!res.ok) {
        const err = await readError(res);
        show({ title: 'Error al cargar usuarios', description: err, variant: 'error' });
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      show({ title: 'Error de conexión', description: 'No se pudo cargar la lista de usuarios', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'operator') => {
    const oldUser = users.find((u) => u.id === userId);
    if (!oldUser || oldUser.role === newRole) return;
    const oldRole = oldUser.role;

    // Optimistic update
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    try {
      const res = await authFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const err = await readError(res);
        // Revert
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: oldRole } : u)));
        show({ title: 'Error al cambiar rol', description: err, variant: 'error' });
        return;
      }

      show({ title: 'Rol actualizado exitosamente', variant: 'success' });
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: oldRole } : u)));
      show({ title: 'Error de conexión', description: 'No se pudo actualizar el rol', variant: 'error' });
    }
  };

  const handleActiveToggle = async (userId: string, currentActive: boolean) => {
    const newActive = !currentActive;

    // Optimistic update
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: newActive } : u)));

    try {
      const res = await authFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      });

      if (!res.ok) {
        const err = await readError(res);
        // Revert
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: currentActive } : u)));
        show({ title: 'Error al cambiar estado', description: err, variant: 'error' });
        return;
      }

      show({
        title: newActive ? 'Usuario activado' : 'Usuario desactivado',
        variant: 'success',
      });
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: currentActive } : u)));
      show({ title: 'Error de conexión', description: 'No se pudo actualizar el estado', variant: 'error' });
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) {
      show({ title: 'Campos requeridos', description: 'Completá email y nombre', variant: 'error' });
      return;
    }

    setInviting(true);
    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const err = await readError(res);
        show({ title: 'Error al invitar usuario', description: err, variant: 'error' });
        return;
      }

      show({
        title: 'Usuario invitado',
        description: `Se envió una invitación a ${inviteEmail.trim()}`,
        variant: 'success',
      });

      setInviteEmail('');
      setInviteName('');
      setInviteRole('operator');
      await loadUsers();
    } catch {
      show({ title: 'Error de conexión', description: 'No se pudo invitar al usuario', variant: 'error' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ToastViewport />

      <div>
        <h1 className="text-2xl font-bold text-text">Gestión de Usuarios</h1>
        <p className="text-sm text-muted mt-1">
          Administrá el acceso, roles y estados de los usuarios del sistema.
        </p>
      </div>

      {/* Formulario invitar usuario */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text mb-4">Invitar nuevo usuario</h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Nombre</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Nombre y apellido"
              required
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Rol</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'operator')}
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            >
              <option value="operator">Operador (Móvil)</option>
              <option value="admin">Administrador (Web)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={inviting}
              className="w-full rounded-lg border border-border bg-accent px-4 py-2 text-sm font-bold text-text hover:opacity-90 disabled:opacity-60"
            >
              {inviting ? 'Invitando…' : 'Invitar usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de usuarios */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Usuarios registrados</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Cargando usuarios…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No hay usuarios registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg text-xs uppercase text-muted">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3 text-center">Activo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg/50">
                    <td className="px-6 py-4 font-medium text-text">{u.name || 'Sin nombre'}</td>
                    <td className="px-6 py-4 text-muted">{u.email || '—'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as 'admin' | 'operator')}
                        className="rounded-lg border border-border bg-bgInput px-2.5 py-1 text-xs font-semibold text-text outline-none focus:border-primary"
                      >
                        <option value="operator">Operador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.is_active}
                          onChange={() => handleActiveToggle(u.id, u.is_active)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
