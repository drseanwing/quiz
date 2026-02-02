/**
 * @file        ImageMapEditor
 * @description Image map question editor with clickable region management
 */

import { useRef } from 'react';
import { Button } from '@/components/common/Button';
import { ImageUpload } from '@/components/common/ImageUpload';
import styles from './QuestionEditor.module.css';

export interface ImageRegion {
  id: string;
  type: 'circle' | 'rect';
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ImageMapEditorProps {
  options: Record<string, unknown>;
  correctAnswer: unknown;
  onChange: (options: Record<string, unknown>, correctAnswer: unknown) => void;
}

export function ImageMapEditor({ options, correctAnswer, onChange }: ImageMapEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const imageUrl = (options.image as string) || '';
  const regions = (options.regions as ImageRegion[]) || [];
  const correct = (correctAnswer as { regionId?: string }) || {};

  function setImageUrl(url: string) {
    onChange({ ...options, image: url }, correctAnswer);
  }

  function addRegion(type: 'circle' | 'rect') {
    const id = crypto.randomUUID();
    const newRegion: ImageRegion = type === 'circle'
      ? { id, type: 'circle', cx: 150, cy: 150, r: 50 }
      : { id, type: 'rect', x: 100, y: 100, width: 100, height: 80 };
    const newRegions = [...regions, newRegion];
    onChange({ ...options, regions: newRegions }, correctAnswer);
  }

  function updateRegion(id: string, field: string, value: number) {
    const updated = regions.map(r => r.id === id ? { ...r, [field]: value } : r);
    onChange({ ...options, regions: updated }, correctAnswer);
  }

  function removeRegion(id: string) {
    const filtered = regions.filter(r => r.id !== id);
    onChange(
      { ...options, regions: filtered },
      correct.regionId === id ? {} : correctAnswer
    );
  }

  function selectCorrect(regionId: string) {
    onChange(options, { regionId });
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    // If no regions, create one at click position
    if (regions.length === 0) {
      const id = crypto.randomUUID();
      const newRegion: ImageRegion = { id, type: 'circle', cx: x, cy: y, r: 40 };
      onChange({ ...options, regions: [newRegion] }, { regionId: id });
    }
  }

  return (
    <div className={styles.optionEditor}>
      <ImageUpload
        label="Image"
        value={imageUrl}
        onChange={setImageUrl}
      />

      {imageUrl && (
        <div className={styles.imageMapPreview}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Image map"
            className={styles.imageMapImage}
            onClick={handleImageClick}
          />
          <svg className={styles.imageMapOverlay}>
            {regions.map(r => {
              const isCorrect = correct.regionId === r.id;
              if (r.type === 'circle') {
                return (
                  <circle
                    key={r.id}
                    cx={r.cx}
                    cy={r.cy}
                    r={r.r}
                    fill={isCorrect ? 'rgba(0,180,160,0.3)' : 'rgba(100,100,100,0.2)'}
                    stroke={isCorrect ? 'var(--redi-teal)' : 'var(--redi-medium-gray)'}
                    strokeWidth="2"
                  />
                );
              }
              return (
                <rect
                  key={r.id}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  fill={isCorrect ? 'rgba(0,180,160,0.3)' : 'rgba(100,100,100,0.2)'}
                  stroke={isCorrect ? 'var(--redi-teal)' : 'var(--redi-medium-gray)'}
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <Button type="button" size="sm" variant="outline" onClick={() => addRegion('circle')}>
          Add Circle Region
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addRegion('rect')}>
          Add Rectangle Region
        </Button>
      </div>

      {regions.length > 0 && (
        <>
          <label className={styles.optionLabel}>Regions</label>
          {regions.map((r, i) => (
            <div key={r.id} className={styles.optionRow}>
              <input
                type="radio"
                name="correctRegion"
                checked={correct.regionId === r.id}
                onChange={() => selectCorrect(r.id)}
                className={styles.optionRadio}
                aria-label={`Mark region ${i + 1} as correct`}
              />
              <span className={styles.smallLabel} style={{ minWidth: 80 }}>
                {r.type === 'circle' ? 'Circle' : 'Rect'} #{i + 1}
              </span>
              {r.type === 'circle' ? (
                <>
                  <input type="number" value={r.cx ?? 0} onChange={(e) => updateRegion(r.id, 'cx', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="cx" />
                  <input type="number" value={r.cy ?? 0} onChange={(e) => updateRegion(r.id, 'cy', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="cy" />
                  <input type="number" value={r.r ?? 0} onChange={(e) => updateRegion(r.id, 'r', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="r" />
                </>
              ) : (
                <>
                  <input type="number" value={r.x ?? 0} onChange={(e) => updateRegion(r.id, 'x', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="x" />
                  <input type="number" value={r.y ?? 0} onChange={(e) => updateRegion(r.id, 'y', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="y" />
                  <input type="number" value={r.width ?? 0} onChange={(e) => updateRegion(r.id, 'width', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="w" />
                  <input type="number" value={r.height ?? 0} onChange={(e) => updateRegion(r.id, 'height', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="h" />
                </>
              )}
              <button
                type="button"
                className={styles.removeOption}
                onClick={() => removeRegion(r.id)}
                aria-label={`Remove region ${i + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
