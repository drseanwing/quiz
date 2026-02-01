/**
 * @file        ImageMapPlayer component
 * @description Image map question player (click on image)
 */

import { useRef, useState } from 'react';
import { safeUrl } from '@/utils/sanitize';
import styles from './ImageMapPlayer.module.css';

interface ImageMapPlayerProps {
  options: { image?: string; regions?: unknown[] };
  answer: { x?: number; y?: number } | null;
  onChange: (coords: { x: number; y: number }) => void;
  disabled: boolean;
}

export function ImageMapPlayer({ options, answer, onChange, disabled }: ImageMapPlayerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  function handleClick(e: React.MouseEvent<HTMLImageElement>) {
    if (disabled || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    onChange({ x, y });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const step = e.shiftKey ? 1 : 10;

    // Initialize cursor to center if not set
    if (cursorPos === null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      setCursorPos({ x: Math.round(rect.width / 2), y: Math.round(rect.height / 2) });
      e.preventDefault();
      return;
    }

    if (cursorPos !== null) {
      let newX = cursorPos.x;
      let newY = cursorPos.y;

      switch (e.key) {
        case 'ArrowUp':
          newY = Math.max(0, cursorPos.y - step);
          e.preventDefault();
          break;
        case 'ArrowDown':
          newY = Math.min(rect.height, cursorPos.y + step);
          e.preventDefault();
          break;
        case 'ArrowLeft':
          newX = Math.max(0, cursorPos.x - step);
          e.preventDefault();
          break;
        case 'ArrowRight':
          newX = Math.min(rect.width, cursorPos.x + step);
          e.preventDefault();
          break;
        case 'Enter':
        case ' ':
          onChange({ x: cursorPos.x, y: cursorPos.y });
          e.preventDefault();
          break;
        default:
          return;
      }

      if (newX !== cursorPos.x || newY !== cursorPos.y) {
        setCursorPos({ x: newX, y: newY });
      }
    }
  }

  if (!options.image) {
    return <p className={styles.empty}>No image provided for this question</p>;
  }

  return (
    <div className={styles.container}>
      <p className={styles.hint}>Click on the image or use arrow keys to position and Enter to select</p>
      <div
        className={styles.imageWrapper}
        role="application"
        aria-label="Image map - use arrow keys to position and Enter to select"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <img
          ref={imgRef}
          src={safeUrl(options.image || '')}
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
        {cursorPos !== null && (
          <div
            className={styles.cursor}
            style={{ left: cursorPos.x, top: cursorPos.y }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
