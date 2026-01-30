/**
 * @file        DragOrderPlayer component
 * @description Drag-to-order question player using @dnd-kit
 */

import { useState, useEffect } from 'react';
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
import styles from './DragOrderPlayer.module.css';

interface DragOrderPlayerProps {
  options: Array<{ id: string; text: string }>;
  answer: { orderedIds?: string[] } | null;
  onChange: (orderedIds: string[]) => void;
  disabled: boolean;
}

interface SortableItemProps {
  id: string;
  text: string;
  index: number;
  disabled: boolean;
}

function SortableItem({ id, text, index, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
      {...attributes}
      {...listeners}
    >
      <span className={styles.index}>{index + 1}</span>
      <span className={styles.grip}>&#x2630;</span>
      <span className={styles.text}>{text}</span>
    </div>
  );
}

export function DragOrderPlayer({ options, answer, onChange, disabled }: DragOrderPlayerProps) {
  const [items, setItems] = useState<Array<{ id: string; text: string }>>([]);

  useEffect(() => {
    if (answer?.orderedIds && answer.orderedIds.length > 0) {
      const map = new Map(options.map(o => [o.id, o]));
      const ordered = answer.orderedIds
        .map(id => map.get(id))
        .filter((o): o is { id: string; text: string } => !!o);
      setItems(ordered);
    } else {
      setItems([...options]);
    }
  }, [options, answer?.orderedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      onChange(reordered.map(i => i.id));
      return reordered;
    });
  }

  return (
    <div className={styles.container}>
      <p className={styles.hint}>Drag items to put them in the correct order</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              text={item.text}
              index={index}
              disabled={disabled}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
