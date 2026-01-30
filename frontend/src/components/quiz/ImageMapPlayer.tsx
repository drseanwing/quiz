/**
 * @file        ImageMapPlayer component
 * @description Image map question player (click on image)
 */

import { useRef } from 'react';
import styles from './ImageMapPlayer.module.css';

interface ImageMapPlayerProps {
  options: { image?: string; regions?: unknown[] };
  answer: { x?: number; y?: number } | null;
  onChange: (coords: { x: number; y: number }) => void;
  disabled: boolean;
}

export function ImageMapPlayer({ options, answer, onChange, disabled }: ImageMapPlayerProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  function handleClick(e: React.MouseEvent<HTMLImageElement>) {
    if (disabled || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    onChange({ x, y });
  }

  if (!options.image) {
    return <p className={styles.empty}>No image provided for this question</p>;
  }

  return (
    <div className={styles.container}>
      <p className={styles.hint}>Click on the image to mark your answer</p>
      <div className={styles.imageWrapper}>
        <img
          ref={imgRef}
          src={options.image}
          alt="Click to answer"
          className={styles.image}
          onClick={handleClick}
        />
        {answer?.x != null && answer?.y != null && (
          <div
            className={styles.marker}
            style={{ left: answer.x, top: answer.y }}
            aria-label={`Selected point at ${answer.x}, ${answer.y}`}
          />
        )}
      </div>
    </div>
  );
}
