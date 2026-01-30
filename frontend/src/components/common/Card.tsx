/**
 * @file        Card component
 * @description Content container with optional accent border
 */

import { type ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}

export function Card({ children, accent = false, className = '' }: CardProps) {
  const classNames = [styles.card, accent ? styles.accent : '', className]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames}>{children}</div>;
}
