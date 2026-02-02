/**
 * @file        DragOrderEditor
 * @description Drag-to-order question editor with sortable items
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/common/Button';
import type { IQuestionOption } from '@/types';
import styles from './QuestionEditor.module.css';

// ─── Sortable Item ──────────────────────────────────────────────────────────

interface SortableEditorItemProps {
  id: string;
  text: string;
  index: number;
  onTextChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function SortableEditorItem({ id, text, index, onTextChange, onRemove, canRemove }: SortableEditorItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.optionRow}>
      <span className={styles.dragHandle} {...attributes} {...listeners}>&#x2630;</span>
      <span className={styles.orderIndex}>{index + 1}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => onTextChange(id, e.target.value)}
        className={styles.optionInput}
      />
      {canRemove && (
        <button
          type="button"
          className={styles.removeOption}
          onClick={() => onRemove(id)}
          aria-label={`Remove item "${text}"`}
        >
          &times;
        </button>
      )}
    </div>
  );
}

// ─── DragOrderEditor ────────────────────────────────────────────────────────

export interface DragOrderEditorProps {
  options: IQuestionOption[];
  correctAnswer: unknown;
  onChange: (options: IQuestionOption[], correctAnswer: unknown) => void;
}

export function DragOrderEditor({ options, correctAnswer, onChange }: DragOrderEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function addItem() {
    const newId = crypto.randomUUID();
    const newOptions = [...options, { id: newId, text: `Item ${options.length + 1}` }];
    const answer = Array.isArray(correctAnswer) ? [...correctAnswer, newId] : newOptions.map(o => o.id);
    onChange(newOptions, answer);
  }

  function removeItem(id: string) {
    if (options.length <= 2) return;
    const filtered = options.filter(o => o.id !== id);
    const answer = Array.isArray(correctAnswer)
      ? (correctAnswer as string[]).filter(a => a !== id)
      : filtered.map(o => o.id);
    onChange(filtered, answer);
  }

  function updateText(id: string, text: string) {
    onChange(
      options.map(o => o.id === id ? { ...o, text } : o),
      correctAnswer
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = options.findIndex(o => o.id === active.id);
    const newIndex = options.findIndex(o => o.id === over.id);
    const reordered = arrayMove(options, oldIndex, newIndex);
    // Correct answer order matches the item display order
    onChange(reordered, reordered.map(o => o.id));
  }

  return (
    <div className={styles.optionEditor}>
      <label className={styles.optionLabel}>
        Items (drag to set correct order)
      </label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {options.map((opt, i) => (
            <SortableEditorItem
              key={opt.id}
              id={opt.id}
              text={opt.text}
              index={i}
              onTextChange={updateText}
              onRemove={removeItem}
              canRemove={options.length > 2}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" size="sm" variant="outline" onClick={addItem}>
        Add Item
      </Button>
    </div>
  );
}
