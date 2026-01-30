/**
 * @file        ForgotPasswordPage
 * @description Password reset request page
 */

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { GradientBar } from '@/components/common/GradientBar';
import styles from './AuthPage.module.css';

export function ForgotPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <GradientBar className={styles.gradientBar} />
        <div className={styles.cardBody}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Reset Password</h1>
            <p className={styles.brand}>
              <span className={styles.brandAccent}>REdI</span> Quiz Platform
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
