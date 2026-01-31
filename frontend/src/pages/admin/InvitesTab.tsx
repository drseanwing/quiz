/**
 * @file        InvitesTab
 * @description Admin invite token management (create + list)
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import * as adminApi from '@/services/adminApi';
import styles from './InvitesTab.module.css';

export function InvitesTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up copy timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-invites', page],
    queryFn: () => adminApi.listInvites(page, 20),
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createInvite,
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      setFormSuccess(`Invite sent to ${invite.email}`);
      setEmail('');
      setFirstName('');
      setSurname('');
      setExpiresInDays('7');
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Failed to create invite');
      setFormSuccess(null);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    createMutation.mutate({
      email,
      firstName: firstName || undefined,
      surname: surname || undefined,
      expiresInDays: parseInt(expiresInDays) || 7,
    });
  }

  function copyToken(token: string, id: string) {
    navigator.clipboard.writeText(token)
      .then(() => {
        setCopiedId(id);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        window.prompt('Copy this token:', token);
      });
  }

  return (
    <div className={styles.container}>
      {/* Create invite form */}
      <div className={styles.formSection}>
        <h3>Create Invitation</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label htmlFor="invite-email">Email *</label>
              <input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="invite-firstName">First Name</label>
              <input id="invite-firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="invite-surname">Surname</label>
              <input id="invite-surname" type="text" value={surname} onChange={e => setSurname(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="invite-expires">Expires (days)</label>
              <input id="invite-expires" type="number" value={expiresInDays} onChange={e => setExpiresInDays(e.target.value)} min="1" max="90" />
            </div>
          </div>
          <div className={styles.formActions}>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
          {formError && <Alert variant="error">{formError}</Alert>}
          {formSuccess && <Alert variant="success">{formSuccess}</Alert>}
        </form>
      </div>

      {/* Token list */}
      <h3>Invite Tokens</h3>
      {isLoading && <Spinner />}
      {error && <Alert variant="error">{error instanceof Error ? error.message : 'Failed to load'}</Alert>}

      {data && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Invite tokens">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Name</th>
                  <th scope="col">Quiz</th>
                  <th scope="col">Token</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">Expires</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(invite => {
                  const expired = new Date(invite.expiresAt) < new Date();
                  const status = invite.usedAt ? 'Used' : expired ? 'Expired' : 'Active';
                  return (
                    <tr key={invite.id}>
                      <td>{invite.email}</td>
                      <td>{[invite.firstName, invite.surname].filter(Boolean).join(' ') || '-'}</td>
                      <td>{invite.bankTitle || '-'}</td>
                      <td>
                        <button
                          className={styles.copyBtn}
                          onClick={() => copyToken(invite.token, invite.id)}
                          title="Copy token"
                          aria-label={`Copy invite token for ${invite.email}`}
                        >
                          {copiedId === invite.id ? 'Copied!' : `${invite.token.slice(0, 12)}...`}
                        </button>
                      </td>
                      <td>
                        <span className={`${styles.status} ${styles[`status${status}`]}`}>
                          {status}
                        </span>
                      </td>
                      <td>{new Date(invite.createdAt).toLocaleDateString()}</td>
                      <td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {data.data.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No invites yet</td></tr>
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
