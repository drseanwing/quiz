/**
 * @file        UsersTab
 * @description Admin user management: list, create, edit, deactivate, password reset
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/hooks/useAuth';
import * as adminApi from '@/services/adminApi';
import styles from './UsersTab.module.css';

const ROLES = ['USER', 'EDITOR', 'ADMIN'] as const;

export function UsersTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<adminApi.IUserFilters>({});

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<adminApi.IUserRow | null>(null);
  const [resetPwUser, setResetPwUser] = useState<adminApi.IUserRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, appliedFilters],
    queryFn: () => adminApi.listUsers({ ...appliedFilters, page, pageSize: 20 }),
  });

  function applyFilters() {
    setPage(1);
    setAppliedFilters({
      search: search || undefined,
      role: roleFilter || undefined,
      isActive: activeFilter || undefined,
    });
  }

  function clearFilters() {
    setSearch('');
    setRoleFilter('');
    setActiveFilter('');
    setAppliedFilters({});
    setPage(1);
  }

  function invalidateUsers() {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            className={styles.searchInput}
            aria-label="Search users"
          />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} aria-label="Filter by role">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} aria-label="Filter by status">
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <Button onClick={applyFilters}>Filter</Button>
          <Button variant="secondary" onClick={clearFilters}>Clear</Button>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create User</Button>
      </div>

      {isLoading && <Spinner />}
      {error && <Alert variant="error">{error instanceof Error ? error.message : 'Failed to load users'}</Alert>}

      {data && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Users">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last Login</th>
                  <th scope="col">Created</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(user => (
                  <tr key={user.id}>
                    <td>{user.firstName} {user.surname}</td>
                    <td>{user.email}</td>
                    <td><span className={styles[`role${user.role}`]}>{user.role}</span></td>
                    <td>
                      <span className={user.isActive ? styles.active : styles.inactive}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => setEditUser(user)} aria-label={`Edit ${user.firstName} ${user.surname}`}>Edit</button>
                      <button className={styles.actionBtn} onClick={() => setResetPwUser(user)} aria-label={`Reset password for ${user.firstName} ${user.surname}`}>Reset PW</button>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data.meta.totalPages > 1 && (
            <div className={styles.pagination}>
              <Button variant="secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Prev</Button>
              <span>Page {data.meta.page} of {data.meta.totalPages} ({data.meta.totalCount} users)</span>
              <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>Next</Button>
            </div>
          )}
        </>
      )}

      {createOpen && (
        <CreateUserModal onClose={() => setCreateOpen(false)} onSuccess={invalidateUsers} />
      )}

      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSuccess={invalidateUsers} />
      )}

      {resetPwUser && (
        <ResetPasswordModal user={resetPwUser} onClose={() => setResetPwUser(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create User Modal
// ---------------------------------------------------------------------------

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    surname: '',
    idNumber: '',
    role: 'USER',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.createUser({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      surname: form.surname,
      idNumber: form.idNumber || undefined,
      role: form.role,
    }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      setErrorMsg(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    mutation.mutate();
  }

  return (
    <Modal isOpen onClose={onClose} title="Create User">
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        <div className={styles.formRow}>
          <label>First Name <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></label>
          <label>Surname <input required value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} /></label>
        </div>
        <label>Email <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
        <label>Password <input type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></label>
        <div className={styles.formRow}>
          <label>ID Number <input value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} /></label>
          <label>Role
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.modalActions}>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating...' : 'Create'}</Button>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit User Modal
// ---------------------------------------------------------------------------

function EditUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: adminApi.IUserRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user: currentUser } = useAuth();
  const isSelf = currentUser?.id === user.id;
  const [form, setForm] = useState({
    firstName: user.firstName,
    surname: user.surname,
    idNumber: user.idNumber || '',
    role: user.role as string,
    isActive: user.isActive,
  });
  const [errorMsg, setErrorMsg] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.updateUser(user.id, {
      firstName: form.firstName,
      surname: form.surname,
      idNumber: form.idNumber || null,
      ...(isSelf ? {} : { role: form.role, isActive: form.isActive }),
    }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      setErrorMsg(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    mutation.mutate();
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${user.firstName} ${user.surname}`}>
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        <div className={styles.formRow}>
          <label>First Name <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></label>
          <label>Surname <input required value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} /></label>
        </div>
        <label>Email <input type="email" disabled value={user.email} /></label>
        <div className={styles.formRow}>
          <label>ID Number <input value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} /></label>
          <label>Role
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} disabled={isSelf}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} disabled={isSelf} />
          Active
        </label>
        {isSelf && <p className={styles.modalNote}>You cannot change your own role or active status.</p>}
        <div className={styles.modalActions}>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</Button>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Reset Password Modal
// ---------------------------------------------------------------------------

function ResetPasswordModal({
  user,
  onClose,
}: {
  user: adminApi.IUserRow;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.adminResetPassword(user.id, password),
    onSuccess: () => {
      setSuccessMsg('Password reset successfully');
      setPassword('');
      setConfirm('');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      setErrorMsg(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (password !== confirm) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal isOpen onClose={onClose} title={`Reset Password: ${user.firstName} ${user.surname}`}>
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        {successMsg && <Alert variant="success">{successMsg}</Alert>}
        <p className={styles.modalNote}>Set a new password for <strong>{user.email}</strong></p>
        <label>New Password <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Confirm Password <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <div className={styles.modalActions}>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Resetting...' : 'Reset Password'}</Button>
          <Button variant="secondary" type="button" onClick={onClose}>Close</Button>
        </div>
      </form>
    </Modal>
  );
}
