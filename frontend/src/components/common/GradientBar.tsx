/**
 * @file        GradientBar component
 * @description REdI brand gradient accent bar
 */

import styles from './GradientBar.module.css';

interface GradientBarProps {
  className?: string;
}

export function GradientBar({ className = '' }: GradientBarProps) {
  return <div className={`${styles.bar} ${className}`} aria-hidden="true" />;
}
