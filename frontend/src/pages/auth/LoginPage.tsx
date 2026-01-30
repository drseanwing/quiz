/**
 * @file        LoginPage
 * @description User login page
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { GradientBar } from '@/components/common/GradientBar';
import { Spinner } from '@/components/common/Spinner';
import styles from './AuthPage.module.css';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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
