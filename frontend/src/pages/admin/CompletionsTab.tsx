/**
 * @file        CompletionsTab
 * @description Admin completions list with filters and CSV export
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import * as adminApi from '@/services/adminApi';
import styles from './CompletionsTab.module.css';

export function CompletionsTab() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<adminApi.ICompletionFilters>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [passedFilter, setPassedFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-completions', page, filters],
    queryFn: () => adminApi.listCompletions({ ...filters, page, pageSize: 20 }),
  });

  function applyFilters() {
    setPage(1);
    setFilters({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      passed: passedFilter || undefined,
    });
  }

  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setPassedFilter('');
    setFilters({});
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await adminApi.exportCompletionsCSV(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'completions.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError('CSV export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={styles.container}>
      <h2 className="visually-hidden">Completions</h2>
      {exportError && <Alert variant="error">{exportError}</Alert>}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="completions-from">From</label>
          <input id="completions-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="completions-to">To</label>
          <input id="completions-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="completions-result">Result</label>
          <select id="completions-result" value={passedFilter} onChange={e => setPassedFilter(e.target.value)}>
            <option value="">All</option>
            <option value="true">Passed</option>
            <option value="false">Not Passed</option>
          </select>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={applyFilters}>Filter</Button>
          <Button variant="secondary" onClick={clearFilters}>Clear</Button>
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {isLoading && <Spinner />}
      {error && <Alert variant="error">{error instanceof Error ? error.message : 'Failed to load'}</Alert>}

      {data && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Quiz completions">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Quiz</th>
                  <th scope="col">Score</th>
                  <th scope="col">%</th>
                  <th scope="col">Result</th>
                  <th scope="col">Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(row => (
                  <tr key={row.id}>
                    <td>{row.userName}</td>
                    <td>{row.userEmail}</td>
                    <td>{row.bankTitle}</td>
                    <td>{row.score.toFixed(1)}/{row.maxScore}</td>
                    <td>{Math.round(row.percentage)}%</td>
                    <td>
                      <span className={row.passed ? styles.passed : styles.failed}>
                        {row.passed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td>{row.completedAt ? new Date(row.completedAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No completions found</td></tr>
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
    </div>
  );
}
