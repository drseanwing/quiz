/**
 * @file        QuestionListItem
 * @description Single question item in the question list with actions
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IQuestion } from '@/types';
import { TYPE_LABELS } from '@/lib/constants';
import { Button } from '@/components/common/Button';
import styles from './QuestionListItem.module.css';

const domParser = new DOMParser();

function stripHtml(html: string): string {
  return domParser.parseFromString(html, 'text/html').body.textContent || '';
}

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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const promptPreview = stripHtml(question.prompt).slice(0, 120);

  return (
    <div ref={setNodeRef} style={style} className={styles.item}>
      <div className={styles.dragHandle} aria-label="Drag to reorder" {...attributes} {...listeners}>
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
