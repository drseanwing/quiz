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
import { Pagination } from '@/components/common/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
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
    queryKey: queryKeys.adminUsers(page, appliedFilters as Record<string, unknown>),
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
    queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
  }

  return (
    <div className={styles.container}>
      <h2 className="visually-hidden">Users</h2>
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

          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
            totalCount={data.meta.totalCount}
            label="Users pagination"
          />
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
    if (!form.firstName.trim()) { setErrorMsg('First name is required'); return; }
    if (!form.surname.trim()) { setErrorMsg('Surname is required'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setErrorMsg('Valid email is required'); return; }
    if (form.password.length < 8) { setErrorMsg('Password must be at least 8 characters'); return; }
    mutation.mutate();
  }

  return (
    <Modal isOpen onClose={onClose} title="Create User">
      <form className={styles.modalForm} onSubmit={handleSubmit} noValidate>
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        <div className={styles.formRow}>
          <label htmlFor="create-firstName">First Name <input id="create-firstName" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></label>
          <label htmlFor="create-surname">Surname <input id="create-surname" required value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} /></label>
        </div>
        <label htmlFor="create-email">Email <input id="create-email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
        <label htmlFor="create-password">Password <input id="create-password" type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></label>
        <div className={styles.formRow}>
          <label htmlFor="create-idNumber">ID Number <input id="create-idNumber" value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} /></label>
          <label htmlFor="create-role">Role
            <select id="create-role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
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
    if (!form.firstName.trim()) { setErrorMsg('First name is required'); return; }
    if (!form.surname.trim()) { setErrorMsg('Surname is required'); return; }
    mutation.mutate();
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${user.firstName} ${user.surname}`}>
      <form className={styles.modalForm} onSubmit={handleSubmit} noValidate>
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        <div className={styles.formRow}>
          <label htmlFor="edit-firstName">First Name <input id="edit-firstName" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></label>
          <label htmlFor="edit-surname">Surname <input id="edit-surname" required value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} /></label>
        </div>
        <label htmlFor="edit-email">Email <input id="edit-email" type="email" disabled value={user.email} /></label>
        <div className={styles.formRow}>
          <label htmlFor="edit-idNumber">ID Number <input id="edit-idNumber" value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} /></label>
          <label htmlFor="edit-role">Role
            <select id="edit-role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} disabled={isSelf}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <label htmlFor="edit-isActive" className={styles.checkboxLabel}>
          <input id="edit-isActive" type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} disabled={isSelf} />
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
      <form className={styles.modalForm} onSubmit={handleSubmit} noValidate>
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        {successMsg && <Alert variant="success">{successMsg}</Alert>}
        <p className={styles.modalNote}>Set a new password for <strong>{user.email}</strong></p>
        <label htmlFor="reset-password">New Password <input id="reset-password" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label htmlFor="reset-confirm">Confirm Password <input id="reset-confirm" type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <div className={styles.modalActions}>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Resetting...' : 'Reset Password'}</Button>
          <Button variant="secondary" type="button" onClick={onClose}>Close</Button>
        </div>
      </form>
    </Modal>
  );
}
