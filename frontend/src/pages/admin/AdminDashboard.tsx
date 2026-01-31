/**
 * @file        AdminDashboard
 * @description Platform statistics overview
 */

import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import * as adminApi from '@/services/adminApi';
import styles from './AdminDashboard.module.css';

export function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  if (isLoading) return <Spinner />;
  if (error || !stats) {
    return <Alert variant="error">{error instanceof Error ? error.message : 'Failed to load statistics'}</Alert>;
  }

  return (
    <div className={styles.dashboard}>
      <h2 className="visually-hidden">Platform Statistics</h2>
      <div className={styles.grid}>
        <StatCard label="Total Users" value={stats.totalUsers} subtitle={`${stats.activeUsers} active`} />
        <StatCard label="Question Banks" value={stats.totalBanks} subtitle={`${stats.activeBanks} active`} />
        <StatCard label="Total Attempts" value={stats.totalAttempts} subtitle={`${stats.completedAttempts} completed`} />
        <StatCard label="Completion Rate" value={`${stats.completionRate}%`} />
        <StatCard label="Average Score" value={`${stats.averageScore}%`} />
        <StatCard label="Pass Rate" value={`${stats.passRate}%`} />
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.cardValue}>{value}</div>
      {subtitle && <div className={styles.cardSubtitle}>{subtitle}</div>}
    </div>
  );
}
