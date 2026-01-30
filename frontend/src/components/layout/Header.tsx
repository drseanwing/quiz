/**
 * @file        Header component
 * @description Main application header with navigation and user menu
 */

import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { GradientBar } from '@/components/common/GradientBar';
import { UserMenu } from './UserMenu';
import styles from './Header.module.css';

export function Header() {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className={styles.header}>
      <GradientBar />
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <div>
            <div className={styles.brandName}>
              <span className={styles.brandAccent}>REdI</span> Quiz
            </div>
            <div className={styles.brandSub}>Resuscitation Education Initiative</div>
          </div>
        </Link>

        {isAuthenticated && user && (
          <nav className={styles.nav}>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/quizzes"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Quizzes
            </NavLink>
            {(user.role === UserRole.EDITOR || user.role === UserRole.ADMIN) && (
              <NavLink
                to="/question-banks"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                Question Banks
              </NavLink>
            )}
            {user.role === UserRole.ADMIN && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
        )}

        <div className={styles.actions}>
          {isAuthenticated && user ? (
            <UserMenu user={user} />
          ) : (
            <Link to="/login" className={styles.navLink}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
