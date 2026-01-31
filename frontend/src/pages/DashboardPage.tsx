/**
 * @file        DashboardPage
 * @description Main dashboard for authenticated users
 */

import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import * as quizApi from '@/services/quizApi';
import { UserRole, AttemptStatus } from '@/types';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: attempts, isLoading, error } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => quizApi.listMyAttempts(),
  });

  const completedAttempts = attempts?.filter(
    a => a.status === AttemptStatus.COMPLETED || a.status === AttemptStatus.TIMED_OUT
  ) || [];
  const inProgressAttempts = attempts?.filter(a => a.status === AttemptStatus.IN_PROGRESS) || [];
  const passedCount = completedAttempts.filter(a => a.passed).length;

  const isEditorOrAdmin = user?.role === UserRole.EDITOR || user?.role === UserRole.ADMIN;

  if (isLoading) return <div className={styles.page}><Spinner /></div>;

  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>
      <p className={styles.welcome}>Welcome back, {user?.firstName}!</p>

      {error && <Alert type="error">Failed to load your quiz data. Please try again later.</Alert>}

      {/* Stats */}
      <div className={styles.grid}>
        <Card className={styles.statCard}>
          <span className={styles.statValue}>{completedAttempts.length}</span>
          <span className={styles.statLabel}>Quizzes Completed</span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statValue}>{passedCount}</span>
          <span className={styles.statLabel}>Quizzes Passed</span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statValue}>
            {completedAttempts.length > 0
              ? Math.round(completedAttempts.reduce((sum, a) => sum + a.percentage, 0) / completedAttempts.length)
              : 0}%
          </span>
          <span className={styles.statLabel}>Average Score</span>
        </Card>
      </div>

      {/* Quick links */}
      <section className={styles.section}>
        <h2>Quick Links</h2>
        <div className={styles.quickLinks}>
          <Button variant="primary" onClick={() => navigate('/quizzes')}>Browse Quizzes</Button>
          {isEditorOrAdmin && (
            <Button variant="secondary" onClick={() => navigate('/question-banks')}>Manage Question Banks</Button>
          )}
        </div>
      </section>

      {/* In-progress attempts */}
      {inProgressAttempts.length > 0 && (
        <section className={styles.section}>
          <h2>Continue Where You Left Off</h2>
          <div className={styles.attemptsList}>
            {inProgressAttempts.map(attempt => (
              <Link key={attempt.id} to={`/quiz/${attempt.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={styles.attemptRow}>
                  <span className={styles.attemptTitle}>{attempt.bankTitle}</span>
                  <span className={styles.attemptDate}>
                    Started {new Date(attempt.startedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      <section className={styles.section}>
        <h2>Recent Results</h2>
        {completedAttempts.length === 0 ? (
          <p className={styles.emptyState}>No completed quizzes yet. Start a quiz to see your results here.</p>
        ) : (
          <div className={styles.attemptsList}>
            {completedAttempts.slice(0, 5).map(attempt => (
              <Link key={attempt.id} to={`/results/${attempt.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={styles.attemptRow}>
                  <span className={styles.attemptTitle}>{attempt.bankTitle}</span>
                  <span className={`${styles.attemptScore} ${attempt.passed ? styles.passed : styles.failed}`}>
                    {Math.round(attempt.percentage)}% - {attempt.passed ? 'Passed' : 'Not Passed'}
                  </span>
                  <span className={styles.attemptDate}>
                    {new Date(attempt.completedAt || attempt.startedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
