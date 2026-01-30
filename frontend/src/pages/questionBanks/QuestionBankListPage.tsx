/**
 * @file        QuestionBankListPage
 * @description Page listing all question banks with filtering and creation
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listQuestionBanks } from '@/services/questionBankApi';
import { QuestionBankCard } from '@/components/questionBanks/QuestionBankCard';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import { ImportModal } from '@/components/questionBanks/ImportModal';
import { QuestionBankStatus } from '@/types';
import styles from './QuestionBankListPage.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: QuestionBankStatus.DRAFT, label: 'Draft' },
  { value: QuestionBankStatus.OPEN, label: 'Open' },
  { value: QuestionBankStatus.PUBLIC, label: 'Public' },
  { value: QuestionBankStatus.ARCHIVED, label: 'Archived' },
];

export function QuestionBankListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['questionBanks', { search, status: statusFilter, page }],
    queryFn: () =>
      listQuestionBanks({
        search: search || undefined,
        status: (statusFilter as QuestionBankStatus) || undefined,
        page,
        pageSize: 12,
      }),
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Question Banks</h1>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Link to="/question-banks/new">
            <Button>Create New</Button>
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <Input
          placeholder="Search question banks..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={styles.statusFilter}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <Alert variant="error">
          Failed to load question banks. Please try again.
        </Alert>
      )}

      {data && data.banks.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            {search || statusFilter
              ? 'No question banks match your filters.'
              : 'No question banks yet. Create your first one!'}
          </p>
        </div>
      )}

      {data && data.banks.length > 0 && (
        <>
          <div className={styles.grid}>
            {data.banks.map((bank) => (
              <QuestionBankCard key={bank.id} bank={bank} />
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page} of {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
