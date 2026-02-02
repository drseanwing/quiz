/**
 * @file        TfEditor
 * @description True/False answer editor
 */

import styles from './QuestionEditor.module.css';

export interface TfEditorProps {
  correctAnswer: unknown;
  onChange: (correctAnswer: unknown) => void;
}

export function TfEditor({ correctAnswer, onChange }: TfEditorProps) {
  return (
    <div className={styles.optionEditor}>
      <label className={styles.optionLabel}>Correct Answer</label>
      <div className={styles.tfGroup}>
        <label className={styles.tfOption}>
          <input
            type="radio"
            name="tfAnswer"
            checked={correctAnswer === 'true'}
            onChange={() => onChange('true')}
          />
          True
        </label>
        <label className={styles.tfOption}>
          <input
            type="radio"
            name="tfAnswer"
            checked={correctAnswer === 'false'}
            onChange={() => onChange('false')}
          />
          False
        </label>
      </div>
    </div>
  );
}
