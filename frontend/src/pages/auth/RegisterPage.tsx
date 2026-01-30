/**
 * @file        RegisterPage
 * @description User registration page
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { GradientBar } from '@/components/common/GradientBar';
import { Spinner } from '@/components/common/Spinner';
import styles from './AuthPage.module.css';

export function RegisterPage() {
  const { isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) {
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
      <div className={`${styles.card} ${styles.cardWide}`}>
        <GradientBar className={styles.gradientBar} />
        <div className={styles.cardBody}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.brand}>
              <span className={styles.brandAccent}>REdI</span> Quiz Platform
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
