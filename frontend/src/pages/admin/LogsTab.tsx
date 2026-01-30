/**
 * @file        LogsTab
 * @description Admin audit logs viewer with filters
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import { Modal } from '@/components/common/Modal';
import * as adminApi from '@/services/adminApi';
import styles from './LogsTab.module.css';

export function LogsTab() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<adminApi.ILogFilters>({});
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<adminApi.ILogRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-logs', page, filters],
    queryFn: () => adminApi.listLogs({ ...filters, page, pageSize: 25 }),
  });

  function applyFilters() {
    setPage(1);
    setFilters({
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
    });
  }

  function clearFilters() {
    setActionFilter('');
    setEntityFilter('');
    setFilters({});
    setPage(1);
  }

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Action</label>
          <input
            type="text"
            placeholder="e.g. LOGIN_SUCCESS"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Entity Type</label>
          <input
            type="text"
            placeholder="e.g. user"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          />
        </div>
        <div className={styles.filterActions}>
          <Button onClick={applyFilters}>Filter</Button>
          <Button variant="secondary" onClick={clearFilters}>Clear</Button>
        </div>
      </div>

      {isLoading && <Spinner />}
      {error && <Alert variant="error">{error instanceof Error ? error.message : 'Failed to load logs'}</Alert>}

      {data && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th>IP</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(log => (
                  <tr key={log.id}>
                    <td className={styles.time}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td><span className={styles.action}>{log.action}</span></td>
                    <td>{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}</td>
                    <td>{log.userName || '-'}</td>
                    <td className={styles.ip}>{log.ipAddress || '-'}</td>
                    <td>
                      {log.details && (
                        <button className={styles.detailBtn} onClick={() => setSelectedLog(log)}>
                          Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={6} className={styles.empty}>No logs found</td></tr>
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

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Log Details">
        {selectedLog && (
          <div className={styles.logDetail}>
            <dl>
              <dt>Action</dt><dd>{selectedLog.action}</dd>
              <dt>Entity</dt><dd>{selectedLog.entityType} {selectedLog.entityId}</dd>
              <dt>User</dt><dd>{selectedLog.userName || selectedLog.userId || '-'}</dd>
              <dt>IP Address</dt><dd>{selectedLog.ipAddress || '-'}</dd>
              <dt>Time</dt><dd>{new Date(selectedLog.createdAt).toLocaleString()}</dd>
            </dl>
            {selectedLog.details && (
              <pre className={styles.json}>{JSON.stringify(selectedLog.details, null, 2)}</pre>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
