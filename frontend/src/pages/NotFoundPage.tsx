/**
 * @file        NotFoundPage
 * @description 404 page for unmatched routes
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Page Not Found</h1>
        <p className={styles.code} aria-hidden="true">404</p>
        <p className={styles.message}>The page you are looking for does not exist.</p>
        <Link to={user ? "/dashboard" : "/"} className={styles.link}>
          {user ? "Go to Dashboard" : "Go to Home"}
        </Link>
      </div>
    </div>
  );
}
