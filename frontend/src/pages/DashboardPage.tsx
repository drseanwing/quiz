/**
 * @file        DashboardPage
 * @description Main dashboard for authenticated users
 */

import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/common/Card';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <Card>
        <p>Welcome back, {user?.firstName}!</p>
        <p>Your role: {user?.role}</p>
      </Card>
    </div>
  );
}
