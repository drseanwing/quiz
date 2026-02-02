/**
 * @file        QuestionBanksTab
 * @description Admin question bank management: list all banks, change status, delete
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import { Modal } from '@/components/common/Modal';
import { queryKeys } from '@/lib/queryKeys';
import * as adminApi from '@/services/adminApi';
import styles from './QuestionBanksTab.module.css';

const STATUSES = ['DRAFT', 'OPEN', 'PUBLIC', 'ARCHIVED'] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'statusDraft',
  OPEN: 'statusOpen',
  PUBLIC: 'statusPublic',
  ARCHIVED: 'statusArchived',
};

export function QuestionBanksTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<adminApi.IQuestionBankFilters>({});
  const [deleteTarget, setDeleteTarget] = useState<adminApi.IQuestionBankRow | null>(null);
  const [mutationError, setMutationError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminBanks(page, appliedFilters as Record<string, unknown>),
    queryFn: () => adminApi.listAllBanks({ ...appliedFilters, page, pageSize: 20 }),
  });

  function applyFilters() {
    setPage(1);
    setAppliedFilters({
      search: search || undefined,
      status: statusFilter || undefined,
    });
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setAppliedFilters({});
    setPage(1);
  }

  const statusMutation = useMutation({
    mutationFn: ({ bankId, status }: { bankId: string; status: string }) =>
      adminApi.updateBankStatus(bankId, status),
    onSuccess: () => {
      setMutationError('');
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanks() });
    },
    onError: (err: unknown) => {
      setMutationError(err instanceof Error ? err.message : 'Failed to update status');
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanks() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bankId: string) => adminApi.deleteBank(bankId),
    onSuccess: () => {
      setMutationError('');
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanks() });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      setMutationError(err instanceof Error ? err.message : 'Failed to delete question bank');
    },
  });

  return (
    <div className={styles.container}>
      <h2 className="visually-hidden">Question Banks</h2>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className={styles.searchInput}
          aria-label="Search question banks by title"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={applyFilters}>Filter</Button>
        <Button variant="secondary" onClick={clearFilters}>Clear</Button>
      </div>

      {isLoading && <Spinner />}
      {error && <Alert variant="error">{error instanceof Error ? error.message : 'Failed to load'}</Alert>}
      {mutationError && <Alert variant="error">{mutationError}</Alert>}

      {data && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Question banks">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Status</th>
                  <th scope="col">Questions</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(bank => (
                  <tr key={bank.id}>
                    <td className={styles.titleCell}>
                      <span className={styles.bankTitle}>{bank.title}</span>
                      {bank.description && (
                        <span className={styles.bankDesc}>{bank.description}</span>
                      )}
                    </td>
                    <td>
                      {bank.createdBy.firstName} {bank.createdBy.surname}
                      <span className={styles.ownerEmail}>{bank.createdBy.email}</span>
                    </td>
                    <td>
                      <select
                        value={bank.status}
                        className={`${styles.statusSelect} ${styles[STATUS_COLORS[bank.status] || '']}`}
                        onChange={e => {
                          const newStatus = e.target.value;
                          if (window.confirm(`Change status of "${bank.title}" to ${newStatus}?`)) {
                            statusMutation.mutate({ bankId: bank.id, status: newStatus });
                          } else {
                            e.target.value = bank.status;
                          }
                        }}
                        aria-label={`Status for ${bank.title}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>{bank._count.questions}</td>
                    <td>{bank._count.attempts}</td>
                    <td>{new Date(bank.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDeleteTarget(bank)}
                        aria-label={`Delete ${bank.title}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No question banks found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data.meta.totalPages > 1 && (
            <div className={styles.pagination}>
              <Button variant="secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Prev</Button>
              <span>Page {data.meta.page} of {data.meta.totalPages}</span>
              <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>Next</Button>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
          <div className={styles.confirmContent}>
            <p>Are you sure you want to delete <strong>{deleteTarget.title}</strong>?</p>
            <p className={styles.confirmWarning}>
              This will permanently remove the question bank, all its questions ({deleteTarget._count.questions}),
              and all attempt records ({deleteTarget._count.attempts}). This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
