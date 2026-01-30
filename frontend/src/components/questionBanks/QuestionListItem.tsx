/**
 * @file        QuestionListItem
 * @description Single question item in the question list with actions
 */

import { useState } from 'react';
import type { IQuestion } from '@/types';
import { QuestionType } from '@/types';
import { Button } from '@/components/common/Button';
import styles from './QuestionListItem.module.css';

const TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE_SINGLE]: 'Multiple Choice',
  [QuestionType.MULTIPLE_CHOICE_MULTI]: 'Multiple Select',
  [QuestionType.TRUE_FALSE]: 'True / False',
  [QuestionType.DRAG_ORDER]: 'Drag to Order',
  [QuestionType.IMAGE_MAP]: 'Image Map',
  [QuestionType.SLIDER]: 'Slider',
};

interface QuestionListItemProps {
  question: IQuestion;
  index: number;
  onEdit: (question: IQuestion) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isDuplicating: boolean;
}

export function QuestionListItem({
  question,
  index,
  onEdit,
  onDuplicate,
  onDelete,
  isDuplicating,
}: QuestionListItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  function stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  const promptPreview = stripHtml(question.prompt).slice(0, 120);

  return (
    <div className={styles.item}>
      <div className={styles.dragHandle} aria-label="Drag to reorder">
        <span className={styles.dragIcon}>&#8942;&#8942;</span>
      </div>

      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.number}>Q{index + 1}</span>
          <span className={styles.type}>{TYPE_LABELS[question.type]}</span>
        </div>
        <p className={styles.prompt}>{promptPreview || 'Untitled question'}</p>
      </div>

      <div className={styles.actions}>
        {showConfirm ? (
          <div className={styles.confirmGroup}>
            <span className={styles.confirmText}>Delete?</span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onDelete(question.id);
                setShowConfirm(false);
              }}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfirm(false)}
            >
              No
            </Button>
          </div>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => onEdit(question)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicate(question.id)}
              loading={isDuplicating}
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfirm(true)}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
