/**
 * @file        TFPlayer component
 * @description True/False question player
 */

import styles from './TFPlayer.module.css';

interface TFPlayerProps {
  answer: { value?: boolean } | null;
  onChange: (value: boolean) => void;
  disabled: boolean;
}

export function TFPlayer({ answer, onChange, disabled }: TFPlayerProps) {
  const selected = answer?.value;

  return (
    <div className={styles.options} role="group" aria-label="Select True or False">
      <button
        type="button"
        className={`${styles.btn} ${selected === true ? styles.selected : ''}`}
        onClick={() => !disabled && onChange(true)}
        disabled={disabled}
        aria-pressed={selected === true}
      >
        True
      </button>
      <button
        type="button"
        className={`${styles.btn} ${selected === false ? styles.selected : ''}`}
        onClick={() => !disabled && onChange(false)}
        disabled={disabled}
        aria-pressed={selected === false}
      >
        False
      </button>
    </div>
  );
}
