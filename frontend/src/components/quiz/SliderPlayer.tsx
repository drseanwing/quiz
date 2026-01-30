/**
 * @file        SliderPlayer component
 * @description Slider question player
 */

import { useState, useEffect } from 'react';
import styles from './SliderPlayer.module.css';

interface SliderPlayerProps {
  options: { min: number; max: number; step: number; unit?: string };
  answer: { value?: number } | null;
  onChange: (value: number) => void;
  disabled: boolean;
}

export function SliderPlayer({ options, answer, onChange, disabled }: SliderPlayerProps) {
  const { min, max, step, unit } = options;
  const [localValue, setLocalValue] = useState(answer?.value ?? (min + max) / 2);

  // Sync local value when answer prop changes (e.g., navigating back to this question)
  useEffect(() => {
    if (answer?.value !== undefined) {
      setLocalValue(answer.value);
    }
  }, [answer?.value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setLocalValue(val);
    onChange(val);
  }

  return (
    <div className={styles.container}>
      <div className={styles.labels}>
        <span>{min}{unit ? ` ${unit}` : ''}</span>
        <span className={styles.currentValue}>
          {localValue}{unit ? ` ${unit}` : ''}
        </span>
        <span>{max}{unit ? ` ${unit}` : ''}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        className={styles.slider}
        aria-label="Slider answer"
      />
    </div>
  );
}
