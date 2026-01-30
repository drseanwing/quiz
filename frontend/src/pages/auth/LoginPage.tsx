/**
 * @file        LoginPage
 * @description User login page
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { GradientBar } from '@/components/common/GradientBar';
import { Spinner } from '@/components/common/Spinner';
import styles from './AuthPage.module.css';

export function LoginPage() {
  const { isAuthenticated, isRestoring } = useAuth();
  const location = useLocation();
  const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const from = rawFrom && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/dashboard';

  if (isRestoring) {
    return (
      <div className={styles.page}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <GradientBar className={styles.gradientBar} />
        <div className={styles.cardBody}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Sign In</h1>
            <p className={styles.brand}>
              <span className={styles.brandAccent}>REdI</span> Quiz Platform
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
