/**
 * @file        SliderEditor
 * @description Slider question configuration editor
 */

import styles from './QuestionEditor.module.css';

export interface SliderEditorProps {
  options: Record<string, unknown>;
  correctAnswer: unknown;
  onChange: (options: Record<string, unknown>, correctAnswer: unknown) => void;
}

export function SliderEditor({ options, correctAnswer, onChange }: SliderEditorProps) {
  const answer = (correctAnswer as Record<string, number>) || { value: 50, tolerance: 5 };

  return (
    <div className={styles.optionEditor}>
      <label className={styles.optionLabel}>Slider Configuration</label>
      <div className={styles.sliderGrid}>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Min</label>
          <input
            type="number"
            value={Number(options.min ?? 0)}
            onChange={(e) => onChange({ ...options, min: Number(e.target.value) }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Max</label>
          <input
            type="number"
            value={Number(options.max ?? 100)}
            onChange={(e) => onChange({ ...options, max: Number(e.target.value) }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Step</label>
          <input
            type="number"
            value={Number(options.step ?? 1)}
            onChange={(e) => onChange({ ...options, step: Number(e.target.value) }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Unit</label>
          <input
            type="text"
            value={String(options.unit ?? '')}
            onChange={(e) => onChange({ ...options, unit: e.target.value }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
      </div>
      <div className={styles.optionRow} style={{ marginTop: 'var(--space-sm)' }}>
        <input
          type="checkbox"
          id="showTicks"
          checked={Boolean(options.showTicks)}
          onChange={(e) => onChange({ ...options, showTicks: e.target.checked }, correctAnswer)}
          className={styles.optionRadio}
        />
        <label htmlFor="showTicks" className={styles.smallLabel}>Show tick marks on slider</label>
      </div>
      <label className={styles.optionLabel}>Correct Answer</label>
      <div className={styles.sliderGrid}>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Value</label>
          <input
            type="number"
            value={answer.value ?? 50}
            onChange={(e) => onChange(options, { ...answer, value: Number(e.target.value) })}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Tolerance (+/-)</label>
          <input
            type="number"
            value={answer.tolerance ?? 5}
            onChange={(e) => onChange(options, { ...answer, tolerance: Number(e.target.value) })}
            className={styles.optionInput}
          />
        </div>
      </div>
    </div>
  );
}
