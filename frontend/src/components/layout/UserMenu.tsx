/**
 * @file        UserMenu component
 * @description Dropdown menu for authenticated user actions
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { IUser } from '@/types';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  user: IUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const initials = `${user.firstName.charAt(0)}${user.surname.charAt(0)}`.toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  async function handleLogout() {
    setIsOpen(false);
    await logout();
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
      >
        <span className={styles.avatar}>{initials}</span>
        <span className={styles.name}>{user.firstName}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.userInfo}>
            <div className={styles.userEmail}>{user.email}</div>
            <div className={styles.userRole}>{user.role}</div>
          </div>

          <Link
            to="/profile"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>

          <div className={styles.divider} />

          <button
            className={`${styles.menuItem} ${styles.logoutItem}`}
            onClick={handleLogout}
            role="menuitem"
            type="button"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
