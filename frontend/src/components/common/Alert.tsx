/**
 * @file        Alert component
 * @description Status alert with semantic variants
 */

import { type ReactNode } from 'react';
import styles from './Alert.module.css';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  variant = 'info',
  children,
  onDismiss,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`${styles.alert} ${styles[variant]} ${className}`}
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
    >
      <div className={styles.content}>{children}</div>
      {onDismiss && (
        <button
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Dismiss alert"
          type="button"
        >
          &times;
        </button>
      )}
    </div>
  );
}
