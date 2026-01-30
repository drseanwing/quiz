/**
 * @file        Layout component
 * @description Page layout wrapper with header, footer, and main content area
 */

import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
