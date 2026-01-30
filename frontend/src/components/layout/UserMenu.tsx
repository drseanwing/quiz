/**
 * @file        UserMenu component
 * @description Dropdown menu for authenticated user actions
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLElement | null)[]>([]);

  const initials = `${user.firstName.charAt(0)}${user.surname.charAt(0)}`.toUpperCase();

  const focusMenuItem = useCallback((index: number) => {
    menuItemsRef.current[index]?.focus();
  }, []);

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
    if (isOpen) {
      focusMenuItem(0);
    }
  }, [isOpen, focusMenuItem]);

  function handleMenuKeyDown(event: React.KeyboardEvent) {
    const items = menuItemsRef.current.filter(Boolean) as HTMLElement[];
    const currentIndex = items.indexOf(event.target as HTMLElement);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
        break;
      }
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }

  async function handleLogout() {
    setIsOpen(false);
    await logout();
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        ref={triggerRef}
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
        <div className={styles.dropdown} role="menu" onKeyDown={handleMenuKeyDown}>
          <div className={styles.userInfo}>
            <div className={styles.userEmail}>{user.email}</div>
            <div className={styles.userRole}>{user.role}</div>
          </div>

          <Link
            to="/profile"
            className={styles.menuItem}
            role="menuitem"
            tabIndex={-1}
            ref={(el) => { menuItemsRef.current[0] = el; }}
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>

          <div className={styles.divider} />

          <button
            className={`${styles.menuItem} ${styles.logoutItem}`}
            onClick={handleLogout}
            role="menuitem"
            tabIndex={-1}
            ref={(el) => { menuItemsRef.current[1] = el; }}
            type="button"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
