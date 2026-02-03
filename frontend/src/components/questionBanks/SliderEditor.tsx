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
  const tickMode = options.tickMode as string || 'auto';
  const customTicks = (options.customTicks as number[]) || [];

  function handleTickModeChange(mode: string) {
    onChange({ ...options, tickMode: mode }, correctAnswer);
  }

  function handleCustomTicksChange(ticks: string) {
    const tickArray = ticks
      .split(',')
      .map(t => Number(t.trim()))
      .filter(n => !isNaN(n));
    onChange({ ...options, customTicks: tickArray }, correctAnswer);
  }

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
      {Boolean(options.showTicks) && (
        <div style={{ marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <label className={styles.smallLabel}>Tick Mark Configuration</label>
          <div style={{ marginBottom: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <input
                type="radio"
                name="tickMode"
                value="auto"
                checked={tickMode === 'auto'}
                onChange={(e) => handleTickModeChange(e.target.value)}
                className={styles.optionRadio}
              />
              <span className={styles.smallLabel}>Automatic (based on step)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <input
                type="radio"
                name="tickMode"
                value="interval"
                checked={tickMode === 'interval'}
                onChange={(e) => handleTickModeChange(e.target.value)}
                className={styles.optionRadio}
              />
              <span className={styles.smallLabel}>Custom interval</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="radio"
                name="tickMode"
                value="custom"
                checked={tickMode === 'custom'}
                onChange={(e) => handleTickModeChange(e.target.value)}
                className={styles.optionRadio}
              />
              <span className={styles.smallLabel}>Custom positions</span>
            </label>
          </div>
          {tickMode === 'interval' && (
            <div className={styles.sliderField}>
              <label className={styles.smallLabel}>Tick Interval</label>
              <input
                type="number"
                value={Number(options.tickInterval ?? 10)}
                onChange={(e) => onChange({ ...options, tickInterval: Number(e.target.value) }, correctAnswer)}
                className={styles.optionInput}
              />
            </div>
          )}
          {tickMode === 'custom' && (
            <div className={styles.sliderField}>
              <label className={styles.smallLabel}>Custom Tick Positions (comma-separated)</label>
              <input
                type="text"
                value={customTicks.join(', ')}
                onChange={(e) => handleCustomTicksChange(e.target.value)}
                className={styles.optionInput}
                placeholder="e.g., 0, 25, 50, 75, 100"
              />
            </div>
          )}
        </div>
      )}
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
