/**
 * @file        MCPlayer component
 * @description Multiple choice question player (single and multi select)
 */

import { sanitizeHtml } from '@/utils/sanitize';
import styles from './MCPlayer.module.css';

interface MCPlayerProps {
  options: Array<{ id: string; text: string }>;
  answer: { optionId?: string; optionIds?: string[] } | null;
  onChange: (value: string | string[]) => void;
  multi: boolean;
  disabled: boolean;
}

export function MCPlayer({ options, answer, onChange, multi, disabled }: MCPlayerProps) {
  if (!Array.isArray(options)) return null;

  const selectedIds = multi
    ? new Set(answer?.optionIds || [])
    : new Set(answer?.optionId ? [answer.optionId] : []);

  function handleSingleSelect(optionId: string) {
    if (disabled) return;
    onChange(optionId);
  }

  function handleMultiToggle(optionId: string) {
    if (disabled) return;
    const current = new Set(answer?.optionIds || []);
    if (current.has(optionId)) {
      current.delete(optionId);
    } else {
      current.add(optionId);
    }
    onChange(Array.from(current));
  }

  return (
    <div className={styles.options} role="group" aria-label={multi ? 'Select all that apply' : 'Select one answer'}>
      {multi && <p className={styles.hint}>Select all that apply</p>}
      {options.map((option) => (
        <label
          key={option.id}
          className={`${styles.option} ${selectedIds.has(option.id) ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
        >
          <input
            type={multi ? 'checkbox' : 'radio'}
            name="mc-answer"
            checked={selectedIds.has(option.id)}
            onChange={() => multi ? handleMultiToggle(option.id) : handleSingleSelect(option.id)}
            disabled={disabled}
            className={styles.input}
          />
          <span className={styles.indicator} />
          <span
            className={styles.text}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(option.text) }}
          />
        </label>
      ))}
    </div>
  );
}
